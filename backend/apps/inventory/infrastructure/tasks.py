import logging
from celery import shared_task
from django.utils import timezone
from django.db.models import Sum

from apps.inventory.domain.models import ReorderRule, InventoryBalance, InventoryBatch
from apps.communications.application.events import EventBusConsumer

logger = logging.getLogger('nebras.inventory.tasks')


@shared_task
def check_low_stock_rules_job(tenant_id):
    """
    مهمة Celery دورية لفحص مستويات المخزون مقارنة بحدود إعادة الطلب وإصدار التنبيهات.
    """
    logger.info(f"Checking reorder rules for tenant {tenant_id}")
    rules = ReorderRule.objects.filter(tenant_id=tenant_id)
    
    alert_count = 0
    for rule in rules:
        # حساب الكمية الكلية المتوفرة للصنف بالمستودع
        balance_sum = InventoryBalance.objects.filter(
            tenant_id=tenant_id,
            item=rule.item,
            warehouse=rule.warehouse
        ).aggregate(total=Sum('qty_on_hand'))['total'] or 0.0

        if balance_sum <= float(rule.min_stock):
            # إرسال إشعار نفاد أو انخفاض مخزون
            event_type = 'OutOfStock' if balance_sum == 0.0 else 'LowStock'
            EventBusConsumer.publish(
                tenant_id=tenant_id,
                event_type=event_type,
                source_module='inventory',
                event_data={
                    'item_id': str(rule.item.id),
                    'item_sku': rule.item.sku,
                    'item_name': rule.item.name_ar,
                    'warehouse_name': rule.warehouse.name_ar,
                    'qty_on_hand': float(balance_sum),
                    'min_stock': float(rule.min_stock)
                }
            )
            alert_count += 1

    return f"Processed reorder rules. Sent {alert_count} alerts."


@shared_task
def check_expiring_batches_job(tenant_id):
    """
    مهمة دورية للتحقق من التشغيلات التي ستنتهي صلاحيتها خلال 30 يوماً.
    """
    logger.info(f"Checking expiring batches for tenant {tenant_id}")
    today = timezone.localdate()
    warning_threshold = today + timezone.timedelta(days=30)

    expiring_batches = InventoryBatch.objects.filter(
        tenant_id=tenant_id,
        expiry_date__range=(today, warning_threshold)
    )

    alert_count = 0
    for batch in expiring_batches:
        EventBusConsumer.publish(
            tenant_id=tenant_id,
            event_type='ExpiryWarning',
            source_module='inventory',
            event_data={
                'batch_number': batch.batch_number,
                'expiry_date': str(batch.expiry_date)
            }
        )
        alert_count += 1

    return f"Found {alert_count} expiring batches."
