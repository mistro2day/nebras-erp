# -*- coding: utf-8 -*-
"""
تهيئة قنوات الاتصال الافتراضية وقوالب الرسائل النظامية للمستأجرين.

يضمن وجود قناتَي البريد الإلكتروني والواتساب مع مزوّد محاكاة (Mock) افتراضي،
بالإضافة إلى قوالب الترحيب اللازمة لتفعيل الحسابات (موظف/ولي أمر/طالب).

آمن للاستدعاء المتكرر (idempotent).
"""
from django.db import transaction

from apps.communications.domain.models import (
    CommunicationChannel, CommunicationProvider, CommunicationTemplate,
)

# قوالب الترحيب النظامية: code -> (name, channel_type, subject, body)
WELCOME_TEMPLATES = {
    'account_welcome_employee_email': (
        'ترحيب تفعيل حساب موظف (بريد)', 'email',
        'تفعيل حساب الموظف - منصة نبراس التعليمية',
        'مرحباً {{employee_name}}، تم تفعيل حساب الموظف الخاص بك.\n'
        'بريدك الإلكتروني: {{email}}\nكلمة المرور المؤقتة: {{password}}\n'
        'يمكنك الدخول عبر الرابط: {{portal_url}}',
    ),
    'account_welcome_employee_whatsapp': (
        'ترحيب تفعيل حساب موظف (واتساب)', 'whatsapp',
        None,
        'مرحباً {{employee_name}}، تم تفعيل حسابك بنجاح.\n'
        'اسم المستخدم: {{email}}\nكلمة المرور: {{password}}\nرابط الدخول: {{portal_url}}',
    ),
    'account_welcome_parent_email': (
        'ترحيب تفعيل حساب ولي أمر (بريد)', 'email',
        'تفعيل حساب ولي الأمر - منصة نبراس التعليمية',
        'مرحباً {{parent_name}}، تم تفعيل حساب ولي الأمر الخاص بك.\n'
        'بريدك الإلكتروني: {{email}}\nكلمة المرور المؤقتة: {{password}}\n'
        'يمكنك الدخول عبر الرابط: {{portal_url}}',
    ),
    'account_welcome_parent_whatsapp': (
        'ترحيب تفعيل حساب ولي أمر (واتساب)', 'whatsapp',
        None,
        'مرحباً بك يا {{parent_name}} في منصة نبراس. تم تفعيل حسابك.\n'
        'اسم المستخدم: {{email}}\nكلمة المرور: {{password}}\nرابط المنصة: {{portal_url}}',
    ),
    'account_welcome_student_email': (
        'ترحيب تفعيل حساب طالب (بريد)', 'email',
        'تفعيل حساب الطالب - منصة نبراس التعليمية',
        'مرحباً {{student_name}}، تم تفعيل حساب البوابة الطلابية الخاص بك.\n'
        'بريدك الإلكتروني: {{email}}\nكلمة المرور المؤقتة: {{password}}\n'
        'يمكنك الدخول عبر الرابط: {{portal_url}}',
    ),
    'account_welcome_student_whatsapp': (
        'ترحيب تفعيل حساب طالب (واتساب)', 'whatsapp',
        None,
        'مرحباً {{student_name}}، تم تفعيل حساب البوابة الطلابية الخاص بك.\n'
        'اسم المستخدم: {{email}}\nكلمة المرور: {{password}}\nرابط الدخول: {{portal_url}}',
    ),
}

_CHANNELS = [
    ('email', 'البريد الإلكتروني', 'email', 'البريد الإلكتروني الرسمي'),
    ('whatsapp', 'واتساب', 'whatsapp', 'رسائل واتساب التفاعلية'),
]


def ensure_communication_defaults(tenant_id, created_by=None):
    """يهيّئ القنوات والمزوّد الافتراضي (mock) وقوالب الترحيب للمستأجر."""
    with transaction.atomic():
        channels = {}
        for code, name, ch_type, desc in _CHANNELS:
            channel, _ = CommunicationChannel.objects.get_or_create(
                tenant_id=tenant_id, code=code,
                defaults={
                    'name': name, 'channel_type': ch_type,
                    'description': desc, 'is_active': True,
                    'created_by': created_by,
                },
            )
            channels[ch_type] = channel

            # مزوّد محاكاة افتراضي لكل قناة
            CommunicationProvider.objects.get_or_create(
                tenant_id=tenant_id, channel=channel, code=f'{code}_mock',
                defaults={
                    'name': f'{name} (محاكاة)',
                    'provider_type': 'mock',
                    'is_active': True, 'is_default': True,
                    'created_by': created_by,
                },
            )

        # قوالب الترحيب
        created_templates = 0
        for code, (name, ch_type, subject, body) in WELCOME_TEMPLATES.items():
            _, created = CommunicationTemplate.objects.get_or_create(
                tenant_id=tenant_id, code=code,
                defaults={
                    'name': name,
                    'category': 'system',
                    'channel': channels.get(ch_type),
                    'content_type': 'plain_text',
                    'language': 'ar',
                    'subject': subject,
                    'body': body,
                    'is_active': True, 'is_system': True,
                    'created_by': created_by,
                },
            )
            created_templates += int(created)

        return {
            'channels': list(channels.keys()),
            'templates_created': created_templates,
        }
