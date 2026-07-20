# -*- coding: utf-8 -*-
import os
import sys
import django
import datetime
import uuid

sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.tenants.domain.models import Tenant
from apps.crm.domain.models import (
    LeadSource, LeadStatus, Lead, Prospect, Contact, Case, Survey
)
from apps.communications.domain.models import (
    CommunicationChannel, CommunicationProvider, CommunicationTemplate, CommunicationLog
)
from apps.portal.domain.models import (
    PortalAnnouncement, PortalAudit
)

def seed():
    print("بدء تأسيس وتفريغ بيانات قاعدة البيانات لـ (CRM، الاتصالات، البوابات) - تخصيص السودان...")
    
    tenant = Tenant.objects.first()
    if not tenant:
        print("خطأ: لا يوجد أي Tenant في قاعدة البيانات.")
        return
    
    t_id = tenant.id
    print(f"المستأجر الحالي: {tenant.name} ({t_id})")

    # ============================================================
    # 1. CRM - العملاء، القضايا، والاستطلاعات
    # ============================================================
    s_fb, _ = LeadSource.objects.get_or_create(
        tenant_id=t_id,
        code='FACEBOOK_KRT',
        defaults={'name_ar': 'إعلان فيسبوك - الخرطوم', 'name_en': 'Facebook Khartoum Ads'}
    )
    s_fair, _ = LeadSource.objects.get_or_create(
        tenant_id=t_id,
        code='EXPO_OMD',
        defaults={'name_ar': 'معرض القبول - أم درمان', 'name_en': 'Omdurman Admission Expo'}
    )
    s_web, _ = LeadSource.objects.get_or_create(
        tenant_id=t_id,
        code='WEBSITE',
        defaults={'name_ar': 'الموقع الإلكتروني', 'name_en': 'Website'}
    )

    st_new, _ = LeadStatus.objects.get_or_create(
        tenant_id=t_id,
        code='NEW',
        defaults={'name_ar': 'جديد', 'name_en': 'New'}
    )
    st_contacted, _ = LeadStatus.objects.get_or_create(
        tenant_id=t_id,
        code='CONTACTED',
        defaults={'name_ar': 'قيد التواصل', 'name_en': 'Contacted'}
    )

    # Leads
    lead1, _ = Lead.objects.get_or_create(
        tenant_id=t_id,
        phone='0912345678',
        defaults={
            'first_name': 'عثمان',
            'last_name': 'إبراهيم الكباشي',
            'email': 'osman.kabbashi@example.sd',
            'source': s_fb,
            'status': st_new,
            'interest_level': 'high',
            'notes': 'مهتم بتسجيل طفلين في المرحلة الابتدائية بفرع الخرطوم',
        }
    )

    lead2, _ = Lead.objects.get_or_create(
        tenant_id=t_id,
        phone='0923456789',
        defaults={
            'first_name': 'أميرة',
            'last_name': 'سر الختم',
            'email': 'amira.sir@example.sd',
            'source': s_fair,
            'status': st_contacted,
            'interest_level': 'medium',
            'notes': 'استفسرت عن خيارات السداد عبر تطبيق بنكك والخصومات الأخوية',
        }
    )

    lead3, _ = Lead.objects.get_or_create(
        tenant_id=t_id,
        phone='0123456789',
        defaults={
            'first_name': 'مصطفى',
            'last_name': 'عبدالفتاح',
            'email': 'mustafa.fateh@example.sd',
            'source': s_web,
            'status': st_new,
            'interest_level': 'high',
            'notes': 'يرغب بتحديد موعد مقابلة لابنته في المرحلة الثانوية بفرع بحري',
        }
    )

    # Prospects
    Prospect.objects.get_or_create(
        tenant_id=t_id,
        phone='0911223344',
        defaults={
            'lead': lead1,
            'first_name': 'الفاتح',
            'last_name': 'التوم',
            'email': 'alfatih@example.sd',
            'interest_level': 'high',
            'stage': 'interview'
        }
    )

    # Contacts & Cases
    contact1, _ = Contact.objects.get_or_create(
        tenant_id=t_id,
        phone='0915566778',
        defaults={
            'first_name': 'الطيب',
            'last_name': 'البشير',
            'email': 'eltayeb@example.sd'
        }
    )

    Case.objects.get_or_create(
        tenant_id=t_id,
        contact=contact1,
        subject='تأخر حافلة خط أم درمان - المهندسين',
        defaults={
            'description': 'الحافلة رقم 08 تتأخر 25 دقيقة صباحاً عند نقطة تقاطع المهندسين مما يسبب تأخر الطلاب.',
            'status': 'in_progress',
            'priority': 'high'
        }
    )

    contact2, _ = Contact.objects.get_or_create(
        tenant_id=t_id,
        phone='0924455667',
        defaults={
            'first_name': 'زحل',
            'last_name': 'عوض الكباشي',
            'email': 'zuhal@example.sd'
        }
    )

    Case.objects.get_or_create(
        tenant_id=t_id,
        contact=contact2,
        subject='طلب ربط السداد الفوري عبر تطبيق بنكك (Bankak)',
        defaults={
            'description': 'اقتراح بتحديث تطبيق ولي الأمر لتسهيل إرسال إشعارات التحويل المباشر عبر بنكك وفوري.',
            'status': 'open',
            'priority': 'medium'
        }
    )

    # Surveys
    Survey.objects.get_or_create(
        tenant_id=t_id,
        title='استطلاع رضا أولياء الأمور عن الخدمات التعليمية بمدارس نبراس السودان',
        defaults={
            'survey_type': 'parent_satisfaction',
            'is_active': True
        }
    )

    print(" تم إنشاء بيانات CRM (Leads, Prospects, Cases, Surveys) بنجاح.")

    # ============================================================
    # 2. Communications - القنوات، المزودين، والقوالب
    # ============================================================
    c_email, _ = CommunicationChannel.objects.get_or_create(
        tenant_id=t_id,
        code='email',
        defaults={
            'name': 'البريد الإلكتروني',
            'channel_type': 'email',
            'icon': 'email',
            'priority': 1,
            'is_active': True
        }
    )

    c_wa, _ = CommunicationChannel.objects.get_or_create(
        tenant_id=t_id,
        code='whatsapp',
        defaults={
            'name': 'واتساب الأعمال',
            'channel_type': 'whatsapp',
            'icon': 'chat',
            'priority': 2,
            'is_active': True
        }
    )

    c_sms, _ = CommunicationChannel.objects.get_or_create(
        tenant_id=t_id,
        code='sms',
        defaults={
            'name': 'الرسائل النصية SMS',
            'channel_type': 'sms',
            'icon': 'sms',
            'priority': 3,
            'is_active': True
        }
    )

    # Providers
    CommunicationProvider.objects.get_or_create(
        tenant_id=t_id,
        code='SMTP_KRT',
        defaults={
            'channel': c_email,
            'name': 'خادم SMTP المؤسسي - الخرطوم',
            'provider_type': 'smtp',
            'is_active': True,
            'is_default': True,
            'daily_quota': 50000
        }
    )

    CommunicationProvider.objects.get_or_create(
        tenant_id=t_id,
        code='ZAIN_SUDANI_SMS',
        defaults={
            'channel': c_sms,
            'name': 'Zain & Sudani SMS Gateway',
            'provider_type': 'custom',
            'is_active': True,
            'is_default': True,
            'daily_quota': 30000
        }
    )

    # Templates
    CommunicationTemplate.objects.get_or_create(
        tenant_id=t_id,
        code='INVOICE_ISSUED',
        defaults={
            'channel': c_email,
            'name': 'إشعار صدور الفاتورة المدرسية',
            'category': 'finance',
            'language': 'ar',
            'subject': 'فاتورة دراسية جديدة - مدارس نبراس السودان',
            'body': 'عزيزي ولي الأمر {{guardian_name}}، تم إصدار الفاتورة الدراسية رقم {{invoice_number}} بمبلغ {{amount}} ج.س للطالب {{student_name}}.',
            'is_active': True
        }
    )

    CommunicationTemplate.objects.get_or_create(
        tenant_id=t_id,
        code='STUDENT_ABSENT_ALERT',
        defaults={
            'channel': c_sms,
            'name': 'تنبيه غياب الطالب الفوري',
            'category': 'attendance',
            'language': 'ar',
            'subject': 'تنبيه غياب الطالب عن الطابور والحصة الأولى',
            'body': 'نحيطكم علماً بغياب ابنكم/ابنتكم {{student_name}} عن حصة اليوم {{date}}. نرجو التواصل مع مكتب شؤون الطلاب.',
            'is_active': True
        }
    )

    print(" تم إنشاء بيانات الاتصالات (Channels, Providers, Templates) بنجاح.")

    # ============================================================
    # 3. Portal - الإعلانات والجلسات
    # ============================================================
    PortalAnnouncement.objects.get_or_create(
        tenant_id=t_id,
        title='بدء التسجيل لخدمة النقل المدرسي بفرع أم درمان والخرطوم',
        defaults={
            'content': 'نرجو من السادة أولياء الأمور حجز مقاعد أبنائهم قبل انتهاء الموعد المضي المحدد عبر تطبيق بنكك وفوري.',
            'target_audience': 'parents',
            'is_published': True
        }
    )

    PortalAnnouncement.objects.get_or_create(
        tenant_id=t_id,
        title='جدول امتحانات الفصل الدراسي الثاني الموحد',
        defaults={
            'content': 'تم نشر جدول الامتحانات النهائية بمركز التحميل ببوابة الطالب وولي الأمر.',
            'target_audience': 'all',
            'is_published': True
        }
    )

    print(" تم إنشاء بيانات البوابات (Portal Announcements) بنجاح.")
    print("=== اكتمل تأسيس وتغذية قاعدة البيانات بنجاح 100% ===")

if __name__ == '__main__':
    seed()
