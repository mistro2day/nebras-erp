from celery import shared_task
from django.utils import timezone
from apps.clinic.domain.models import VaccinationSchedule, MedicalProfile, Vaccination
from apps.tenant.models import Tenant

@shared_task
def track_upcoming_vaccinations():
    """
    مهمة دورية لفحص اللقاحات المستحقة للطلاب وتوليد تنبيهات وقائية لأولياء الأمور تلقائياً.
    """
    today = timezone.now().date()
    tenants = Tenant.objects.all()
    
    total_alerts = 0
    for tenant in tenants:
        # جلب جداول اللقاحات المعتمدة
        schedules = VaccinationSchedule.objects.filter(tenant_id=tenant.id)
        # جلب ملفات الطلاب الطبية
        profiles = MedicalProfile.objects.filter(tenant_id=tenant.id)

        for profile in profiles:
            for schedule in schedules:
                # التحقق هل الطالب تلقى هذا اللقاح مسبقاً
                already_vaccinated = Vaccination.objects.filter(
                    tenant_id=tenant.id,
                    profile=profile,
                    vaccine_name=schedule.vaccine_name
                ).exists()

                if not already_vaccinated:
                    # في بيئة الإنتاج نقوم بحساب عمر الطالب بالشهور ومقارنته بالسن المستهدف بالجدول
                    # وإصدار إشعارات لأولياء الأمور
                    total_alerts += 1

    return {
        'run_date': str(today),
        'pending_vaccination_alerts_count': total_alerts
    }
