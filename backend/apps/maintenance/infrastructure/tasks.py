from celery import shared_task
from django.utils import timezone
from apps.maintenance.domain.models import PreventiveSchedule, MaintenanceStatistics
from apps.maintenance.application.services import PreventiveMaintenanceService
from apps.tenant.models import Tenant  # استيراد المستأجرين

@shared_task
def generate_scheduled_work_orders():
    """
    مهمة دورية لتوليد أوامر العمل الوقائية تلقائياً لجميع المستأجرين.
    """
    today = timezone.now().date()
    tenants = Tenant.objects.all()
    
    total_generated = 0
    for tenant in tenants:
        generated = PreventiveMaintenanceService.generate_preventive_work_orders(
            tenant_id=tenant.id,
            run_date=today
        )
        total_generated += len(generated)
        
    return {
        'run_date': str(today),
        'generated_work_orders_count': total_generated
    }
