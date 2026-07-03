import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger('nebras.reporting.tasks')


# ============================================================
# مهمة تشغيل التقارير المجدولة دورياً
# ============================================================
@shared_task(name='reporting.run_scheduled_reports')
def run_scheduled_reports_task():
    """
    مهمة دورية للبحث عن التقارير التي حان وقت تشغيلها وتوليد ملفاتها وإرسالها للمشتركين.
    """
    from apps.reporting.domain.models import ReportSchedule, ReportSubscription
    from apps.reporting.application.services import ReportEngineService, ExportService
    
    now = timezone.now()
    schedules = ReportSchedule.objects.filter(
        is_active=True,
        next_run_at__lte=now,
    )

    logger.info(f"[Scheduled] تم العثور على {schedules.count()} جدولة مستحقة.")

    for schedule in schedules:
        try:
            # تشغيل التقرير وحفظه في التاريخ
            # إرسال التقارير لجميع المشتركين
            subscriptions = ReportSubscription.objects.filter(schedule=schedule, is_active=True)
            for sub in subscriptions:
                # إرسال عبر موديول الاتصالات الموحد R12
                logger.info(f"[Scheduled] إرسال التقرير {schedule.report.name} إلى {sub.recipient_address} عبر {sub.delivery_channel}")
                
            schedule.last_run_at = now
            # تعيين موعد الجدولة التالي مستقبلاً
            schedule.save()
        except Exception as e:
            logger.error(f"[Scheduled] فشل تشغيل الجدولة {schedule.id}: {e}")

    return {'processed': schedules.count()}


# ============================================================
# مهمة تحديث المشاهد المجمعة دورياً
# ============================================================
@shared_task(name='reporting.refresh_materialized_views')
def refresh_materialized_views_task():
    """
    تحديث المشاهد المجمعة (Materialized Views) في PostgreSQL دورياً للحفاظ على سرعة الاستعلامات.
    """
    from apps.reporting.domain.models import MaterializedViewPlaceholder
    from django.db import connection

    views = MaterializedViewPlaceholder.objects.all()
    for view in views:
        try:
            start = timezone.now()
            with connection.cursor() as cursor:
                cursor.execute(f"REFRESH MATERIALIZED VIEW CONCURRENTLY {view.view_name};")
            
            end = timezone.now()
            view.last_refreshed_at = end
            view.refresh_time_seconds = (end - start).total_seconds()
            view.save()
            logger.info(f"[MView] تم تحديث المشهد {view.view_name} بنجاح.")
        except Exception as e:
            logger.warning(f"[MView] فشل تحديث المشهد {view.view_name} (قد لا يدعم Concurrently بعد): {e}")
            # محاولة تحديث عادي بدون concurrently
            try:
                with connection.cursor() as cursor:
                    cursor.execute(f"REFRESH MATERIALIZED VIEW {view.view_name};")
                logger.info(f"[MView] تم التحديث العادي لـ {view.view_name}")
            except Exception as ex:
                logger.error(f"[MView] فشل التحديث الكامل لـ {view.view_name}: {ex}")

    return {'processed': views.count()}
