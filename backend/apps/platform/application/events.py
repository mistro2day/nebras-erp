import logging
import uuid
from typing import Callable, Dict, List
from django.utils import timezone
from apps.platform.domain.models import EventLog

logger = logging.getLogger('nebras.platform.events')

class EventBus:
    """
    ناقل الأحداث المركزي (Central Event Bus) لـ Nebras ERP
    يدعم تسجيل الـ Subscribers، التوزيع المتزامن واللامتزامن، والـ Event Logging.
    """
    _subscribers: Dict[str, List[Callable]] = {}

    @classmethod
    def subscribe(cls, event_name: str, handler: Callable):
        """تسجيل مشترك (Subscriber) لحدث معين"""
        if event_name not in cls._subscribers:
            cls._subscribers[event_name] = []
        if handler not in cls._subscribers[event_name]:
            cls._subscribers[event_name].append(handler)
            logger.info(f"Registered subscriber {handler.__name__} for event '{event_name}'")

    @classmethod
    def publish(cls, event_name: str, payload: dict, tenant_id: uuid.UUID = None,
                user_id: uuid.UUID = None, correlation_id: uuid.UUID = None, async_dispatch: bool = True):
        """
        نشر حدث للنظام
        """
        corr_id = correlation_id or uuid.uuid4()
        
        # 1. تسجيل الحدث في الـ EventLog
        event_log = EventLog.objects.create(
            event_name=event_name,
            payload=payload,
            correlation_id=corr_id,
            tenant_id=tenant_id,
            created_by=user_id,
            status='published'
        )
        
        # 2. توزيع الحدث
        if async_dispatch:
            cls._dispatch_async(event_log.id)
        else:
            cls._dispatch_sync(event_log.id)
            
        return corr_id

    @classmethod
    def _dispatch_sync(cls, event_log_id: uuid.UUID):
        """التوزيع المتزامن للأحداث"""
        try:
            event_log = EventLog.objects.get(id=event_log_id)
            event_name = event_log.event_name
            handlers = cls._subscribers.get(event_name, [])
            
            for handler in handlers:
                try:
                    handler(event_log.payload, event_log.tenant_id)
                except Exception as e:
                    logger.error(f"Error in event handler {handler.__name__} for event '{event_name}': {str(e)}")
                    
            event_log.status = 'processed'
            event_log.save()
        except Exception as e:
            logger.error(f"Failed to dispatch sync event log {event_log_id}: {str(e)}")

    @classmethod
    def _dispatch_async(cls, event_log_id: uuid.UUID):
        """التوزيع لامتزامناً عبر Celery (تأجيل المهمة)"""
        # في بيئة التطوير، يمكننا استدعاء التوزيع المتزامن أو تحويله لمهمة Celery
        # سنقوم بتمريره مباشرة كـ Celery delay إذا كان متوفراً، أو استدعاؤه محلياً كـ fallback
        try:
            from apps.platform.application.tasks import dispatch_event_task
            dispatch_event_task.delay(str(event_log_id))
        except ImportError:
            # Fallback في حال عدم تهيئة Celery
            cls._dispatch_sync(event_log_id)