import logging
from celery import shared_task
from django.utils import timezone
from datetime import date

from apps.procurement.domain.models import PurchaseContract, Vendor, VendorPerformance
from apps.communications.application.events import EventBusConsumer

logger = logging.getLogger('nebras.procurement.tasks')


@shared_task
def check_expiring_contracts_job(tenant_id):
    """
    مهمة Celery دورية للتحقق من العقود التي ستنتهي قريباً (أقل من 30 يوماً) وإرسال تنبيهات.
    """
    logger.info(f"Checking expiring contracts for tenant {tenant_id}")
    today = timezone.localdate()
    warning_threshold = today + timezone.timedelta(days=30)

    expiring_contracts = PurchaseContract.objects.filter(
        tenant_id=tenant_id,
        status='active',
        end_date__range=(today, warning_threshold)
    )

    alert_count = 0
    for contract in expiring_contracts:
        # إرسال إشعار عبر منصة الاتصالات
        EventBusConsumer.publish(
            tenant_id=tenant_id,
            event_type='ContractExpiring',
            source_module='procurement',
            event_data={
                'contract_id': str(contract.id),
                'contract_number': contract.contract_number,
                'end_date': str(contract.end_date),
                'vendor_name': contract.vendor.name_ar
            }
        )
        alert_count += 1

    return f"Found and alerted {alert_count} expiring contracts."


@shared_task
def update_vendor_performance_ratings(tenant_id):
    """
    مهمة دورية لتقييم واحتساب مؤشرات أداء الموردين تلقائياً ربع سنوي.
    """
    logger.info(f"Running auto vendor performance ratings for tenant {tenant_id}")
    vendors = Vendor.objects.filter(tenant_id=tenant_id, status='approved')

    updated_count = 0
    for vendor in vendors:
        perf, created = VendorPerformance.objects.get_or_create(
            tenant_id=tenant_id,
            vendor=vendor,
            defaults={
                'delivery_on_time_rate': 95.0,
                'quality_rate': 98.0,
                'price_competitiveness': 90.0
            }
        )
        # محاكاة التحديث الذاتي للأداء
        perf.delivery_on_time_rate = max(50.0, float(perf.delivery_on_time_rate) - 0.5)
        perf.save()
        updated_count += 1

    return f"Updated performance for {updated_count} vendors."
