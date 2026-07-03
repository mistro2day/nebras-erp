from celery import shared_task
import logging
import uuid

logger = logging.getLogger('nebras.platform.tasks')

@shared_task(name='apps.platform.tasks.dispatch_event_task')
def dispatch_event_task(event_log_id: str):
    """مهمة Celery لتوزيع الأحداث لامتزامناً"""
    try:
        from apps.platform.application.events import EventBus
        EventBus._dispatch_sync(uuid.UUID(event_log_id))
    except Exception as e:
        logger.error(f"Celery task dispatch_event_task failed for {event_log_id}: {str(e)}")


@shared_task(name='apps.platform.tasks.send_notification_task')
def send_notification_task(notification_id: str):
    """مهمة Celery لإرسال التنبيهات الموحدة"""
    try:
        from apps.platform.application.notifications import NotificationCenter
        NotificationCenter._send_sync(uuid.UUID(notification_id))
    except Exception as e:
        logger.error(f"Celery task send_notification_task failed for {notification_id}: {str(e)}")