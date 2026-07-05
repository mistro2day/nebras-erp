"""
Celery application for Nebras ERP.

Wires the Celery app to Django settings and autodiscovers ``tasks`` modules
across all installed apps (including the Automation Platform). This was previously
missing: ``@shared_task`` functions existed but had no app to run them. Broker /
backend / beat scheduler come from settings (env-driven).
"""
import os
from celery import Celery
from celery.signals import task_failure

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('nebras')

# كل إعدادات Celery تُقرأ من إعدادات Django ذات البادئة CELERY_
app.config_from_object('django.conf:settings', namespace='CELERY')

# اكتشاف مهام كل التطبيقات تلقائياً (apps.<x>.tasks و apps.<x>.application.tasks)
app.autodiscover_tasks()
app.autodiscover_tasks(related_name='application.tasks')


@app.task(bind=True, name='config.debug_task')
def debug_task(self):  # pragma: no cover - تشخيصي
    return {'request_id': self.request.id, 'status': 'ok'}


@task_failure.connect
def _route_failed_task_to_dlq(sender=None, task_id=None, exception=None, args=None,
                              kwargs=None, traceback=None, einfo=None, **extra):
    """
    عند فشل أي مهمة نهائياً بعد استنفاد إعادة المحاولات، نسجّلها في طابور الرسائل
    الميتة (DLQ placeholder) عبر خدمة التكامل — دون إسقاط أي بيانات.
    """
    try:
        from apps.automation_platform.application.celery_integration import DeadLetterQueue
        DeadLetterQueue.record(
            task_name=getattr(sender, 'name', str(sender)),
            task_id=str(task_id),
            error=str(exception),
            args=args, kwargs=kwargs,
        )
    except Exception:  # noqa: BLE001 - لا نُفشل معالج الفشل نفسه
        pass
