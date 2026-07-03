import re
import logging
from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from django.db.models import Q, Count, F

from apps.communications.domain.models import (
    CommunicationChannel,
    CommunicationProvider,
    CommunicationTemplate,
    CommunicationTemplateVersion,
    CommunicationVariable,
    CommunicationMessage,
    CommunicationRecipient,
    CommunicationAttachment,
    CommunicationQueue,
    CommunicationLog,
    CommunicationPreference,
    CommunicationCampaign,
    CommunicationEvent,
    CommunicationStatistics,
    CommunicationFailure,
    CommunicationRetry,
    Notification,
)

logger = logging.getLogger('nebras.communications')


# ============================================================
# خدمة الاتصالات الرئيسية
# ============================================================
class CommunicationService:
    """
    الخدمة المركزية للإرسال عبر جميع القنوات.
    جميع الموديولات تستدعي هذه الخدمة بدلاً من الإرسال المباشر.
    """

    @classmethod
    def send_message(cls, tenant_id, channel_code, recipients, subject=None, body=None,
                     template_code=None, variables=None, attachments=None,
                     priority='normal', source_module=None, source_event=None,
                     source_reference_id=None, scheduled_at=None, created_by=None):
        """
        إرسال رسالة عبر المنصة المركزية.
        يتم وضع الرسالة في الطابور ومعالجتها بشكل غير متزامن.
        """
        with transaction.atomic():
            # 1. تحديد القناة
            channel = CommunicationChannel.objects.filter(
                tenant_id=tenant_id, code=channel_code, is_active=True
            ).first()
            if not channel:
                raise ValueError(f"القناة '{channel_code}' غير موجودة أو غير مفعلة.")

            # 2. تحديد المزود الافتراضي
            provider = CommunicationProvider.objects.filter(
                tenant_id=tenant_id, channel=channel, is_active=True
            ).order_by('-is_default', 'priority').first()

            # 3. معالجة القالب والمتغيرات
            actual_subject = subject
            actual_body = body
            template = None

            if template_code:
                template = CommunicationTemplate.objects.filter(
                    tenant_id=tenant_id, code=template_code, is_active=True
                ).first()
                if template:
                    actual_subject = actual_subject or template.subject
                    actual_body = actual_body or template.body
                    if variables:
                        actual_subject = cls._render_template(actual_subject, variables)
                        actual_body = cls._render_template(actual_body, variables)

            if not actual_body:
                raise ValueError("يجب توفير محتوى الرسالة أو كود القالب.")

            # 4. إنشاء الرسالة
            message = CommunicationMessage.objects.create(
                tenant_id=tenant_id,
                channel=channel,
                provider=provider,
                template=template,
                subject=actual_subject,
                body=actual_body,
                body_html=actual_body if channel.channel_type == 'email' else None,
                variables_data=variables or {},
                status='queued' if not scheduled_at else 'draft',
                priority=priority,
                source_module=source_module,
                source_event=source_event,
                source_reference_id=source_reference_id,
                scheduled_at=scheduled_at,
                created_by=created_by,
            )

            # 5. إضافة المستلمين
            recipient_objects = []
            for recipient in recipients:
                recipient_objects.append(CommunicationRecipient(
                    tenant_id=tenant_id,
                    message=message,
                    recipient_type=recipient.get('type', 'to'),
                    entity_type=recipient.get('entity_type', 'user'),
                    entity_id=recipient.get('entity_id'),
                    name=recipient.get('name', ''),
                    address=recipient.get('address', ''),
                    created_by=created_by,
                ))
            CommunicationRecipient.objects.bulk_create(recipient_objects)

            # 6. إضافة المرفقات
            if attachments:
                attachment_objects = []
                for attachment in attachments:
                    attachment_objects.append(CommunicationAttachment(
                        tenant_id=tenant_id,
                        message=message,
                        file_name=attachment.get('file_name', ''),
                        file_path=attachment.get('file_path', ''),
                        file_size=attachment.get('file_size', 0),
                        content_type=attachment.get('content_type', 'application/octet-stream'),
                        storage_reference_id=attachment.get('storage_reference_id'),
                        created_by=created_by,
                    ))
                CommunicationAttachment.objects.bulk_create(attachment_objects)

            # 7. إنشاء إدخال في الطابور
            queue_type = 'scheduled' if scheduled_at else ('priority' if priority in ['critical', 'high'] else 'standard')
            CommunicationQueue.objects.create(
                tenant_id=tenant_id,
                message=message,
                queue_type=queue_type,
                status='queued',
                priority=0 if priority == 'critical' else 1 if priority == 'high' else 5 if priority == 'normal' else 10,
                scheduled_at=scheduled_at,
                max_attempts=3,
                created_by=created_by,
            )

            # 8. تسجيل العملية
            CommunicationLog.objects.create(
                tenant_id=tenant_id,
                message=message,
                level='info',
                action='message_queued',
                description=f"تم إنشاء الرسالة ووضعها في الطابور — القناة: {channel.name}، المستلمين: {len(recipients)}",
                created_by=created_by,
            )

            # 9. إطلاق مهمة Celery إذا لم تكن مجدولة
            if not scheduled_at:
                try:
                    from apps.communications.infrastructure.celery_tasks import send_message_task
                    send_message_task.delay(str(message.id))
                except Exception as e:
                    logger.warning(f"فشل إطلاق مهمة Celery للرسالة {message.id}: {e}")

            return message

    @classmethod
    def send_bulk(cls, tenant_id, channel_code, recipients_list, **kwargs):
        """
        إرسال جماعي لنفس الرسالة إلى مستلمين متعددين.
        """
        messages = []
        for recipients in recipients_list:
            msg = cls.send_message(
                tenant_id=tenant_id,
                channel_code=channel_code,
                recipients=[recipients] if isinstance(recipients, dict) else recipients,
                **kwargs
            )
            messages.append(msg)
        return messages

    @classmethod
    def _render_template(cls, template_text, variables):
        """
        استبدال المتغيرات الديناميكية في نص القالب.
        """
        if not template_text or not variables:
            return template_text

        result = template_text
        for key, value in variables.items():
            pattern = '{{' + key + '}}'
            result = result.replace(pattern, str(value) if value is not None else '')
        return result

    @classmethod
    def check_preferences(cls, tenant_id, entity_type, entity_id, channel_type, category=None):
        """
        التحقق من تفضيلات المستخدم قبل الإرسال.
        يعيد True إذا كان المستخدم يسمح بالإرسال عبر هذه القناة.
        """
        pref = CommunicationPreference.objects.filter(
            tenant_id=tenant_id,
            entity_type=entity_type,
            entity_id=entity_id
        ).first()

        if not pref:
            return True  # لا توجد تفضيلات = السماح الافتراضي

        # التحقق من إلغاء الاشتراك الكامل
        if pref.global_opt_out:
            return False

        # التحقق من تفعيل القناة
        channel_map = {
            'email': pref.email_enabled,
            'sms': pref.sms_enabled,
            'whatsapp': pref.whatsapp_enabled,
            'push': pref.push_enabled,
            'in_app': pref.in_app_enabled,
            'browser': pref.browser_enabled,
        }
        if channel_type in channel_map and not channel_map[channel_type]:
            return False

        # التحقق من الفئات المكتومة
        if category and pref.muted_categories and category in pref.muted_categories:
            return False

        # التحقق من ساعات الهدوء
        if pref.quiet_hours_enabled and pref.quiet_hours_start and pref.quiet_hours_end:
            now = timezone.now().time()
            if pref.quiet_hours_start <= now <= pref.quiet_hours_end:
                return False

        return True


# ============================================================
# خدمة القوالب
# ============================================================
class TemplateService:
    """
    إدارة قوالب الرسائل والإصدارات والمتغيرات.
    """

    @classmethod
    def create_version(cls, tenant_id, template_id, body, subject=None,
                       change_log=None, created_by=None):
        """
        إنشاء إصدار جديد من قالب.
        """
        template = CommunicationTemplate.objects.get(
            id=template_id, tenant_id=tenant_id
        )

        # تحديد رقم الإصدار التالي
        last_version = CommunicationTemplateVersion.objects.filter(
            template=template, tenant_id=tenant_id
        ).order_by('-version_number').first()

        next_version = (last_version.version_number + 1) if last_version else 1

        version = CommunicationTemplateVersion.objects.create(
            tenant_id=tenant_id,
            template=template,
            version_number=next_version,
            subject=subject or template.subject,
            body=body,
            content_type=template.content_type,
            status='draft',
            change_log=change_log,
            created_by=created_by,
        )
        return version

    @classmethod
    def publish_version(cls, tenant_id, version_id, published_by=None):
        """
        نشر إصدار وتحديث القالب الرئيسي.
        """
        with transaction.atomic():
            version = CommunicationTemplateVersion.objects.select_for_update().get(
                id=version_id, tenant_id=tenant_id
            )

            # أرشفة الإصدار المنشور الحالي
            CommunicationTemplateVersion.objects.filter(
                template=version.template,
                tenant_id=tenant_id,
                status='published'
            ).update(status='archived')

            # نشر الإصدار الجديد
            version.status = 'published'
            version.published_at = timezone.now()
            version.published_by = published_by
            version.save()

            # تحديث القالب الرئيسي
            template = version.template
            template.subject = version.subject
            template.body = version.body
            template.save()

            return version

    @classmethod
    def rollback_version(cls, tenant_id, template_id, version_number, rolled_back_by=None):
        """
        التراجع إلى إصدار سابق.
        """
        version = CommunicationTemplateVersion.objects.get(
            template_id=template_id,
            tenant_id=tenant_id,
            version_number=version_number
        )
        return cls.publish_version(tenant_id, version.id, published_by=rolled_back_by)

    @classmethod
    def preview_template(cls, tenant_id, template_id, variables=None):
        """
        معاينة قالب مع بيانات تجريبية.
        """
        template = CommunicationTemplate.objects.get(
            id=template_id, tenant_id=tenant_id
        )
        sample_vars = variables or {}
        rendered_subject = CommunicationService._render_template(template.subject, sample_vars)
        rendered_body = CommunicationService._render_template(template.body, sample_vars)

        return {
            'subject': rendered_subject,
            'body': rendered_body,
            'content_type': template.content_type,
            'language': template.language,
        }

    @classmethod
    def extract_variables(cls, template_text):
        """
        استخراج أسماء المتغيرات من نص القالب.
        """
        if not template_text:
            return []
        pattern = r'\{\{(\w+)\}\}'
        return list(set(re.findall(pattern, template_text)))


# ============================================================
# خدمة مركز الإشعارات
# ============================================================
class NotificationCenterService:
    """
    إدارة الإشعارات الداخلية للتطبيق.
    """

    @classmethod
    def create_notification(cls, tenant_id, user_id, title, body,
                            category='general', priority='normal',
                            icon=None, action_url=None, action_label=None,
                            actions=None, group_key=None, source_module=None,
                            source_event=None, source_reference_id=None,
                            expires_at=None, message_id=None, created_by=None):
        """
        إنشاء إشعار داخل التطبيق.
        """
        notification = Notification.objects.create(
            tenant_id=tenant_id,
            user_id=user_id,
            title=title,
            body=body,
            category=category,
            priority=priority,
            icon=icon,
            action_url=action_url,
            action_label=action_label,
            actions=actions or [],
            group_key=group_key,
            source_module=source_module,
            source_event=source_event,
            source_reference_id=source_reference_id,
            expires_at=expires_at,
            message_id=message_id,
            created_by=created_by,
        )
        return notification

    @classmethod
    def mark_as_read(cls, tenant_id, notification_id, user_id):
        """تحديد إشعار كمقروء."""
        Notification.objects.filter(
            id=notification_id, tenant_id=tenant_id, user_id=user_id
        ).update(is_read=True, read_at=timezone.now())

    @classmethod
    def mark_all_as_read(cls, tenant_id, user_id, category=None):
        """تحديد جميع الإشعارات كمقروءة."""
        qs = Notification.objects.filter(
            tenant_id=tenant_id, user_id=user_id, is_read=False
        )
        if category:
            qs = qs.filter(category=category)
        qs.update(is_read=True, read_at=timezone.now())

    @classmethod
    def archive_notification(cls, tenant_id, notification_id, user_id):
        """أرشفة إشعار."""
        Notification.objects.filter(
            id=notification_id, tenant_id=tenant_id, user_id=user_id
        ).update(is_archived=True, archived_at=timezone.now())

    @classmethod
    def dismiss_notification(cls, tenant_id, notification_id, user_id):
        """رفض إشعار."""
        Notification.objects.filter(
            id=notification_id, tenant_id=tenant_id, user_id=user_id
        ).update(is_dismissed=True)

    @classmethod
    def pin_notification(cls, tenant_id, notification_id, user_id, pin=True):
        """تثبيت/إلغاء تثبيت إشعار."""
        Notification.objects.filter(
            id=notification_id, tenant_id=tenant_id, user_id=user_id
        ).update(is_pinned=pin)

    @classmethod
    def get_unread_count(cls, tenant_id, user_id):
        """الحصول على عدد الإشعارات غير المقروءة."""
        return Notification.objects.filter(
            tenant_id=tenant_id, user_id=user_id,
            is_read=False, is_archived=False, is_dismissed=False
        ).count()

    @classmethod
    def get_notifications(cls, tenant_id, user_id, is_read=None, category=None,
                          is_archived=False, limit=50):
        """الحصول على قائمة الإشعارات."""
        qs = Notification.objects.filter(
            tenant_id=tenant_id, user_id=user_id,
            is_archived=is_archived, is_dismissed=False
        )
        if is_read is not None:
            qs = qs.filter(is_read=is_read)
        if category:
            qs = qs.filter(category=category)

        # استبعاد المنتهية الصلاحية
        qs = qs.filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        )
        return qs[:limit]


# ============================================================
# خدمة الحملات
# ============================================================
class CampaignService:
    """
    إدارة حملات الاتصال الجماعية.
    """

    @classmethod
    def launch_campaign(cls, tenant_id, campaign_id, launched_by=None):
        """
        إطلاق حملة اتصال.
        """
        campaign = CommunicationCampaign.objects.get(
            id=campaign_id, tenant_id=tenant_id
        )

        if campaign.status not in ('approved', 'scheduled'):
            raise ValueError(f"لا يمكن إطلاق حملة بحالة '{campaign.get_status_display()}'.")

        campaign.status = 'running'
        campaign.started_at = timezone.now()
        campaign.save()

        # إطلاق مهمة Celery لمعالجة الحملة
        try:
            from apps.communications.infrastructure.celery_tasks import process_campaign_task
            process_campaign_task.delay(str(campaign.id))
        except Exception as e:
            logger.warning(f"فشل إطلاق مهمة الحملة {campaign.id}: {e}")

        return campaign

    @classmethod
    def pause_campaign(cls, tenant_id, campaign_id):
        """إيقاف حملة مؤقتاً."""
        CommunicationCampaign.objects.filter(
            id=campaign_id, tenant_id=tenant_id, status='running'
        ).update(status='paused')

    @classmethod
    def get_campaign_statistics(cls, tenant_id, campaign_id):
        """الحصول على إحصائيات الحملة."""
        campaign = CommunicationCampaign.objects.get(
            id=campaign_id, tenant_id=tenant_id
        )
        return {
            'total_messages': campaign.total_messages,
            'sent_count': campaign.sent_count,
            'delivered_count': campaign.delivered_count,
            'failed_count': campaign.failed_count,
            'read_count': campaign.read_count,
            'delivery_rate': (campaign.delivered_count / campaign.total_messages * 100) if campaign.total_messages > 0 else 0,
            'read_rate': (campaign.read_count / campaign.delivered_count * 100) if campaign.delivered_count > 0 else 0,
        }


# ============================================================
# خدمة التفضيلات
# ============================================================
class PreferenceService:
    """
    إدارة تفضيلات المستخدمين للاتصالات.
    """

    @classmethod
    def get_or_create_preference(cls, tenant_id, entity_type, entity_id, user_id=None):
        """الحصول على تفضيلات المستخدم أو إنشاء تفضيلات افتراضية."""
        pref, created = CommunicationPreference.objects.get_or_create(
            tenant_id=tenant_id,
            entity_type=entity_type,
            entity_id=entity_id,
            defaults={
                'user_id': user_id,
                'preferred_language': 'ar',
            }
        )
        return pref

    @classmethod
    def update_preference(cls, tenant_id, entity_type, entity_id, **kwargs):
        """تحديث تفضيلات المستخدم."""
        pref = cls.get_or_create_preference(tenant_id, entity_type, entity_id)
        for key, value in kwargs.items():
            if hasattr(pref, key):
                setattr(pref, key, value)
        pref.save()
        return pref

    @classmethod
    def register_device_token(cls, tenant_id, entity_type, entity_id, token):
        """تسجيل رمز جهاز للإشعارات الفورية."""
        pref = cls.get_or_create_preference(tenant_id, entity_type, entity_id)
        tokens = pref.device_tokens or []
        if token not in tokens:
            tokens.append(token)
            pref.device_tokens = tokens
            pref.save()
        return pref

    @classmethod
    def remove_device_token(cls, tenant_id, entity_type, entity_id, token):
        """إزالة رمز جهاز."""
        pref = cls.get_or_create_preference(tenant_id, entity_type, entity_id)
        tokens = pref.device_tokens or []
        if token in tokens:
            tokens.remove(token)
            pref.device_tokens = tokens
            pref.save()
        return pref


# ============================================================
# خدمة الإحصائيات
# ============================================================
class StatisticsService:
    """
    تجميع وحساب الإحصائيات.
    """

    @classmethod
    def get_dashboard_summary(cls, tenant_id):
        """ملخص لوحة التحكم."""
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        messages = CommunicationMessage.objects.filter(tenant_id=tenant_id)
        today_messages = messages.filter(created_at__gte=today_start)

        queue = CommunicationQueue.objects.filter(tenant_id=tenant_id)

        return {
            'total_messages': messages.count(),
            'today_messages': today_messages.count(),
            'sent_today': today_messages.filter(status='sent').count(),
            'delivered_today': today_messages.filter(status='delivered').count(),
            'failed_today': today_messages.filter(status='failed').count(),
            'queued': queue.filter(status='queued').count(),
            'processing': queue.filter(status='processing').count(),
            'dead_letter': queue.filter(status='dead_letter').count(),
            'retry_pending': queue.filter(status='retry').count(),
            'channel_stats': cls._get_channel_stats(tenant_id, today_start),
        }

    @classmethod
    def _get_channel_stats(cls, tenant_id, since):
        """إحصائيات حسب القناة."""
        return list(
            CommunicationMessage.objects.filter(
                tenant_id=tenant_id, created_at__gte=since
            ).values(
                'channel__channel_type', 'channel__name'
            ).annotate(
                total=Count('id'),
                sent=Count('id', filter=Q(status='sent')),
                delivered=Count('id', filter=Q(status='delivered')),
                failed=Count('id', filter=Q(status='failed')),
            ).order_by('-total')
        )
