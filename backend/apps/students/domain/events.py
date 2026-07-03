import logging
import uuid
from apps.platform.application.events import EventBus

logger = logging.getLogger('nebras.events')

class DomainEvent:
    def __init__(self, name, data):
        self.name = name
        self.data = data

class DomainEventPublisher:
    """
    ناشر أحداث النطاق (Domain Event Publisher) المحدث ليرسل الأحداث عبر EventBus المركزي
    """
    @staticmethod
    def publish(event_name: str, event_data: dict, tenant_id=None, user_id=None):
        logger.info(f"[DOMAIN EVENT] {event_name} redirecting to Central Event Bus: {event_data}")
        # استخراج tenant_id من الحمولة إذا لم يتم تمريره صراحة
        t_id = tenant_id or event_data.get('tenant_id')
        if isinstance(t_id, str):
            t_id = uuid.UUID(t_id)
        
        # نشر الحدث عبر الـ EventBus المركزي
        EventBus.publish(
            event_name=event_name,
            payload=event_data,
            tenant_id=t_id,
            user_id=user_id,
            async_dispatch=False
        )
