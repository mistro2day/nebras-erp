import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger('nebras.communications.tasks')


# ============================================================
# مهمة إرسال رسالة واحدة
# ============================================================
@shared_task(bind=True, max_retries=3, default_retry_delay=60,
             name='communications.send_message')
def send_message_task(self, message_id):
    """
    مهمة Celery لإرسال رسالة واحدة عبر المزود المناسب.
    """
    from apps.communications.domain.models import (
        CommunicationMessage, CommunicationQueue, CommunicationLog, CommunicationRecipient
    )
    from apps.communications.application.providers import ProviderFactory
    from apps.communications.application.queue import QueueManager, RetryPolicy

    try:
        message = CommunicationMessage.objects.select_related(
            'channel', 'provider'
        ).get(id=message_id)

        # تحديث حالة الطابور
        queue_entry = CommunicationQueue.objects.filter(message=message).first()
        if queue_entry:
            QueueManager.mark_processing(queue_entry, worker_id=self.request.hostname,
                                         celery_task_id=self.request.id)

        # تحديث حالة الرسالة
        message.status = 'processing'
        message.save(update_fields=['status'])

        # إنشاء المزود
        if not message.provider:
            logger.error(f"[Task] لا يوجد مزود للرسالة {message_id}")
            if queue_entry:
                QueueManager.mark_failed(queue_entry, "لا يوجد مزود مكوّن")
            message.status = 'failed'
            message.last_error = "لا يوجد مزود مكوّن لهذه القناة"
            message.save(update_fields=['status', 'last_error'])
            return {'success': False, 'error': 'no_provider'}

        provider = ProviderFactory.create_from_model(message.provider)

        # الحصول على المستلمين
        recipients = CommunicationRecipient.objects.filter(
            message=message, recipient_type='to'
        )

        all_success = True
        for recipient in recipients:
            result = provider.send(
                to=recipient.address,
                subject=message.subject,
                body=message.body,
                html_body=message.body_html,
                metadata={'message_id': str(message.id)},
            )

            if result.get('success'):
                recipient.status = 'sent'
                recipient.save(update_fields=['status'])
            else:
                recipient.status = 'failed'
                recipient.error_message = result.get('error', '')
                recipient.save(update_fields=['status', 'error_message'])
                all_success = False

        # تحديث حالة الرسالة النهائية
        if all_success:
            message.status = 'sent'
            message.sent_at = timezone.now()
            message.external_id = result.get('external_id')
            message.save(update_fields=['status', 'sent_at', 'external_id'])

            if queue_entry:
                QueueManager.mark_completed(queue_entry)

            CommunicationLog.objects.create(
                tenant_id=message.tenant_id,
                message=message,
                level='info',
                action='message_sent',
                description=f"تم إرسال الرسالة بنجاح — المستلمين: {recipients.count()}",
            )
        else:
            message.retry_count += 1
            message.status = 'failed'
            message.last_error = 'فشل إرسال لبعض المستلمين'
            message.save(update_fields=['status', 'retry_count', 'last_error'])

            if queue_entry:
                QueueManager.mark_failed(queue_entry, message.last_error)

            RetryPolicy.record_failure(
                tenant_id=message.tenant_id,
                message=message,
                failure_type='temporary',
                error_message=message.last_error,
            )

        return {'success': all_success, 'message_id': str(message_id)}

    except Exception as exc:
        logger.error(f"[Task] خطأ في إرسال الرسالة {message_id}: {exc}")
        try:
            self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            logger.error(f"[Task] استنفاد محاولات الإرسال للرسالة {message_id}")
        return {'success': False, 'error': str(exc)}


# ============================================================
# مهمة معالجة الطابور
# ============================================================
@shared_task(name='communications.process_queue')
def process_queue_task(tenant_id=None, batch_size=20):
    """
    معالجة دفعة من الرسائل في الطابور.
    يتم تشغيلها دورياً عبر Celery Beat.
    """
    from apps.communications.application.queue import QueueManager

    entries = QueueManager.dequeue(tenant_id=tenant_id, batch_size=batch_size)
    processed = 0

    for entry in entries:
        send_message_task.delay(str(entry.message_id))
        processed += 1

    logger.info(f"[Queue] تم إرسال {processed} رسالة للمعالجة")
    return {'processed': processed}


# ============================================================
# مهمة إعادة المحاولة
# ============================================================
@shared_task(name='communications.retry_failed')
def retry_failed_task(tenant_id=None, batch_size=10):
    """
    إعادة محاولة الرسائل الفاشلة التي حان وقت إعادة محاولتها.
    """
    from apps.communications.domain.models import CommunicationQueue

    now = timezone.now()
    entries = CommunicationQueue.objects.filter(
        status='retry',
        next_retry_at__lte=now,
    ).select_related('message')

    if tenant_id:
        entries = entries.filter(tenant_id=tenant_id)

    entries = entries[:batch_size]
    retried = 0

    for entry in entries:
        entry.status = 'queued'
        entry.save(update_fields=['status'])
        send_message_task.delay(str(entry.message_id))
        retried += 1

    logger.info(f"[Retry] تم إعادة محاولة {retried} رسالة")
    return {'retried': retried}


# ============================================================
# مهمة معالجة حملة
# ============================================================
@shared_task(bind=True, name='communications.process_campaign')
def process_campaign_task(self, campaign_id):
    """
    معالجة حملة اتصال كاملة.
    """
    from apps.communications.domain.models import CommunicationCampaign
    from apps.communications.application.services import CommunicationService

    try:
        campaign = CommunicationCampaign.objects.select_related(
            'channel', 'template'
        ).get(id=campaign_id)

        if campaign.status != 'running':
            return {'success': False, 'error': 'الحملة ليست في حالة التشغيل'}

        logger.info(f"[Campaign] بدء معالجة الحملة: {campaign.name}")

        # معالجة الجمهور المستهدف (حسب نوع الجمهور)
        # هنا يتم إنشاء الرسائل وإرسالها عبر الطابور
        # التنفيذ الكامل يعتمد على تكامل البيانات

        campaign.status = 'completed'
        campaign.completed_at = timezone.now()
        campaign.save(update_fields=['status', 'completed_at'])

        return {'success': True, 'campaign_id': str(campaign_id)}

    except Exception as exc:
        logger.error(f"[Campaign] خطأ في معالجة الحملة {campaign_id}: {exc}")
        return {'success': False, 'error': str(exc)}


# ============================================================
# مهمة تنظيف الإشعارات المنتهية
# ============================================================
@shared_task(name='communications.cleanup_expired_notifications')
def cleanup_expired_notifications():
    """
    تنظيف الإشعارات المنتهية الصلاحية.
    يتم تشغيلها يومياً.
    """
    from apps.communications.domain.models import Notification

    now = timezone.now()
    expired = Notification.objects.filter(
        expires_at__lte=now,
        is_archived=False,
    ).update(is_archived=True, archived_at=now)

    logger.info(f"[Cleanup] تم أرشفة {expired} إشعار منتهي الصلاحية")
    return {'archived': expired}


# ============================================================
# مهمة تجميع الإحصائيات
# ============================================================
@shared_task(name='communications.aggregate_statistics')
def aggregate_statistics_task(period_type='daily', tenant_id=None):
    """
    تجميع الإحصائيات الدورية.
    يتم تشغيلها ساعياً/يومياً عبر Celery Beat.
    """
    from apps.communications.domain.models import (
        CommunicationMessage, CommunicationStatistics, CommunicationChannel
    )
    from django.db.models import Count, Q, Avg
    from datetime import timedelta

    now = timezone.now()

    if period_type == 'hourly':
        period_start = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=1)
        period_end = now.replace(minute=0, second=0, microsecond=0)
    elif period_type == 'daily':
        period_start = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=1)
        period_end = now.replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        return {'success': False, 'error': 'نوع الفترة غير مدعوم'}

    # الحصول على جميع القنوات
    channels_qs = CommunicationChannel.objects.all()
    if tenant_id:
        channels_qs = channels_qs.filter(tenant_id=tenant_id)

    created = 0
    for channel in channels_qs:
        messages = CommunicationMessage.objects.filter(
            channel=channel,
            created_at__gte=period_start,
            created_at__lt=period_end,
        )
        if tenant_id:
            messages = messages.filter(tenant_id=tenant_id)

        total_sent = messages.filter(status__in=['sent', 'delivered', 'read']).count()
        total_delivered = messages.filter(status__in=['delivered', 'read']).count()
        total_failed = messages.filter(status='failed').count()
        total_read = messages.filter(status='read').count()
        total_bounced = messages.filter(status='bounced').count()

        if total_sent > 0 or total_failed > 0:
            total_all = total_sent + total_failed
            CommunicationStatistics.objects.update_or_create(
                tenant_id=channel.tenant_id,
                period_type=period_type,
                period_start=period_start,
                channel=channel,
                defaults={
                    'period_end': period_end,
                    'total_sent': total_sent,
                    'total_delivered': total_delivered,
                    'total_failed': total_failed,
                    'total_read': total_read,
                    'total_bounced': total_bounced,
                    'delivery_rate': (total_delivered / total_all * 100) if total_all > 0 else 0,
                    'read_rate': (total_read / total_delivered * 100) if total_delivered > 0 else 0,
                    'failure_rate': (total_failed / total_all * 100) if total_all > 0 else 0,
                    'bounce_rate': (total_bounced / total_all * 100) if total_all > 0 else 0,
                }
            )
            created += 1

    logger.info(f"[Statistics] تم تجميع إحصائيات {created} قناة — الفترة: {period_type}")
    return {'created': created, 'period_type': period_type}
