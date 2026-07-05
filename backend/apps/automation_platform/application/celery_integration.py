"""
Celery Beat integration + task observability for the Automation Platform.

* ``CeleryBeatSyncService`` — syncs ``ScheduledJob`` rows into ``django_celery_beat``
  PeriodicTask/CrontabSchedule when that package is available (Django-version
  dependent). Degrades gracefully to a no-op with a clear status otherwise.
* ``DeadLetterQueue`` — placeholder DLQ: records terminally-failed tasks into the
  existing ``LogEntry`` DevOps model (reuse, no new table).
* ``TaskHealthService`` — task monitoring / health / history built on the existing
  ``AutomationRun`` records (no new persistence).
"""
import logging
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger('nebras.automation.celery')


class CeleryBeatSyncService:
    """مزامنة المهام المجدولة مع Celery Beat (اختياري حسب توفر django_celery_beat)."""

    @staticmethod
    def is_available() -> bool:
        return getattr(settings, 'DJANGO_CELERY_BEAT_AVAILABLE', False)

    @classmethod
    def sync_job(cls, job) -> dict:
        """
        إنشاء/تحديث PeriodicTask لوظيفة مجدولة. آمن التكرار.
        يُعيد وصفاً بالنتيجة حتى في حال عدم توفر الجدول الديناميكي.
        """
        if not cls.is_available():
            return {'synced': False, 'reason': 'django_celery_beat_unavailable',
                    'cron': job.cron_expression}
        try:
            from django_celery_beat.models import PeriodicTask, CrontabSchedule
        except Exception as exc:  # noqa: BLE001
            return {'synced': False, 'reason': f'import_error: {exc}'}

        minute, hour, dom, month, dow = cls._parse_cron(job.cron_expression)
        schedule, _ = CrontabSchedule.objects.get_or_create(
            minute=minute, hour=hour, day_of_month=dom, month_of_year=month, day_of_week=dow,
        )
        task, _ = PeriodicTask.objects.update_or_create(
            name=f'ap-scheduled-{job.id}',
            defaults={
                'crontab': schedule,
                'task': 'apps.automation_platform.application.tasks.execute_scheduled_job',
                'args': f'["{job.id}"]',
                'enabled': job.is_enabled,
            },
        )
        return {'synced': True, 'periodic_task_id': task.id}

    @classmethod
    def remove_job(cls, job) -> dict:
        if not cls.is_available():
            return {'removed': False, 'reason': 'unavailable'}
        try:
            from django_celery_beat.models import PeriodicTask
            PeriodicTask.objects.filter(name=f'ap-scheduled-{job.id}').delete()
            return {'removed': True}
        except Exception as exc:  # noqa: BLE001
            return {'removed': False, 'reason': str(exc)}

    @staticmethod
    def _parse_cron(expr: str):
        parts = (expr or '* * * * *').split()
        while len(parts) < 5:
            parts.append('*')
        return parts[0], parts[1], parts[2], parts[3], parts[4]


class DeadLetterQueue:
    """طابور الرسائل الميتة (placeholder) — يسجّل المهام الفاشلة نهائياً دون فقدانها."""

    @staticmethod
    def record(task_name: str, task_id: str, error: str, args=None, kwargs=None,
               tenant_id=None) -> None:
        try:
            from apps.automation_platform.domain.models import LogEntry
            LogEntry.objects.create(
                tenant_id=tenant_id, source='celery.dlq', level='error',
                message=f'DLQ: {task_name} failed: {error}',
                context={'task_id': task_id, 'args': args, 'kwargs': kwargs},
                trace_id=task_id,
            )
        except Exception as exc:  # noqa: BLE001
            logger.error('Failed to record DLQ entry: %s', exc)

    @staticmethod
    def list_recent(limit: int = 50):
        from apps.automation_platform.domain.models import LogEntry
        return LogEntry.objects.filter(source='celery.dlq').order_by('-created_at')[:limit]


class TaskHealthService:
    """مراقبة وصحة المهام اعتماداً على سجلات التشغيل الحالية (AutomationRun)."""

    @classmethod
    def summary(cls, tenant_id=None) -> dict:
        from apps.automation_platform.domain.models import AutomationRun
        qs = AutomationRun.objects.all()
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        total = qs.count()
        by_status = {}
        for status_val in ('pending', 'running', 'success', 'failed', 'retrying', 'cancelled'):
            by_status[status_val] = qs.filter(status=status_val).count()
        success = by_status['success']
        failed = by_status['failed']
        completed = success + failed
        health = 'healthy'
        if completed and (failed / completed) > 0.5:
            health = 'degraded'
        if by_status['running'] and not completed:
            health = 'unknown'
        return {
            'total_runs': total,
            'by_status': by_status,
            'success_rate': round((success / completed) * 100, 2) if completed else None,
            'health': health,
            'beat_scheduler_available': CeleryBeatSyncService.is_available(),
            'dead_letter_count': _safe_dlq_count(),
            'generated_at': timezone.now(),
        }

    @classmethod
    def history(cls, tenant_id=None, limit: int = 50):
        from apps.automation_platform.domain.models import AutomationRun
        qs = AutomationRun.objects.all()
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs.order_by('-created_at')[:limit]


def _safe_dlq_count() -> int:
    try:
        from apps.automation_platform.domain.models import LogEntry
        return LogEntry.objects.filter(source='celery.dlq').count()
    except Exception:  # noqa: BLE001
        return 0
