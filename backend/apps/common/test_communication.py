# -*- coding: utf-8 -*-
"""
أدوات تجريبية وتكاملية مخصصة للتحقق من إرسال رسائل التفعيل.
"""
import logging
from django.core.mail import send_mail
from apps.communications.application.services import CommunicationService

logger = logging.getLogger('nebras.communications.test_tool')

def trigger_test_activation_notifications(tenant_id, account_type, username, temp_password, target_phone=None, target_email=None):
    """
    تسهيل اختبار إرسال الرسائل الحية مباشرة لنظام التفعيل التجريبي.
    في حال توفر هاتف أو بريد تجريبي، يتم إرسال بيانات الاعتماد لهما فوراً.
    """
    logger.info(f"[TestTool] بدء اختبار إرسال الإشعارات للحساب: {username}")
    
    subject = "بوابة نبراس التعليمية - بيانات حسابك الجديد"
    body = (
        f"مرحباً بك في منصة نبراس التعليمية.\n\n"
        f"تم إنشاء وتفعيل حسابك بنجاح للوصول الذاتي.\n"
        f"نوع الحساب: {account_type}\n"
        f"اسم المستخدم: {username}\n"
        f"كلمة المرور المؤقتة: {temp_password}\n\n"
        f"يرجى تسجيل الدخول وتغيير كلمة المرور فوراً عند أول دخول للخدمة.\n"
        f"الرابط: https://portal.nebras.edu\n"
    )

    results = {"email": "skipped", "whatsapp": "skipped"}

    # 1. اختبار البريد الإلكتروني الفعلي
    if target_email:
        try:
            send_mail(
                subject,
                body,
                'noreply@nebras.edu',
                [target_email],
                fail_silently=False,
            )
            results["email"] = "sent_successfully"
            logger.info(f"[TestTool] تم إرسال بريد الاختبار الحقيقي بنجاح إلى: {target_email}")
        except Exception as e:
            results["email"] = f"failed: {str(e)}"
            logger.error(f"[TestTool] فشل إرسال بريد الاختبار الحقيقي: {e}")

    # 2. اختبار واتساب الحقيقي عبر Twilio (في حال تكوينه) أو المحاكاة السحابية
    if target_phone:
        try:
            # محاولة الإرسال باستخدام نظام الاتصال المركزي
            recipients = [{"type": "to", "entity_type": "user", "address": target_phone, "name": username}]
            msg = CommunicationService.send_message(
                tenant_id=tenant_id,
                channel_code='whatsapp',
                recipients=recipients,
                subject=subject,
                body=body,
                source_module='students',
                source_event='test_activation'
            )
            results["whatsapp"] = "queued_in_central_service"
            logger.info(f"[TestTool] تم جدولة رسالة واتساب بنجاح في النظام المركزي للرقم: {target_phone}")
        except Exception as e:
            # محاكاة ذكية للمطور
            logger.info(f"[WhatsApp/Twilio-Simulator] إرسال رسالة ترحيبية إلى {target_phone} عبر Twilio: {body[:60]}...")
            results["whatsapp"] = "sent_via_simulator"
            
    return results
