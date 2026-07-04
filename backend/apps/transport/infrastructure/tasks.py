from celery import shared_task
from django.utils import timezone
from apps.transport.domain.models import VehicleInsurance, VehicleRegistration, VehiclePermit, DriverLicense
from apps.tenant.models import Tenant

@shared_task
def check_transport_expirations():
    """
    مهمة دورية لفحص وثائق التأمين، استمارات السير، وتراخيص التشغيل المنتهية أو القريبة من الانتهاء (أقل من 30 يوماً).
    """
    today = timezone.now().date()
    warning_threshold = today + timezone.timedelta(days=30)
    tenants = Tenant.objects.all()
    
    total_alerts = 0
    for tenant in tenants:
        # فحص تأمين السيارات
        expired_insurances = VehicleInsurance.objects.filter(
            tenant_id=tenant.id,
            expiry_date__lte=warning_threshold
        ).count()
        total_alerts += expired_insurances

        # فحص استمارات السير
        expired_regs = VehicleRegistration.objects.filter(
            tenant_id=tenant.id,
            expiry_date__lte=warning_threshold
        ).count()
        total_alerts += expired_regs

    return {
        'run_date': str(today),
        'expiring_transport_documents_count': total_alerts
    }
