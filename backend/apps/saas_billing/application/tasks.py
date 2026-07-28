"""مهام Celery لفوترة المنصّة: دورة الفوترة اليومية التلقائية."""
from celery import shared_task
import logging

logger = logging.getLogger('nebras.saas_billing.tasks')


@shared_task(name='apps.saas_billing.tasks.run_billing_cycle', bind=True, max_retries=2)
def run_billing_cycle_task(self):
    """تُشغّل يومياً عبر Celery beat: تعليم المتأخرات، تجديد الاشتراكات المستحقة،
    توليد فواتير التجديد، وتصعيد حالة الاشتراكات المتعثّرة."""
    try:
        from apps.saas_billing.application.services import run_billing_cycle
        summary = run_billing_cycle()
        logger.info('دورة فوترة المنصّة: %s', summary)
        return summary
    except Exception as exc:  # noqa: BLE001
        logger.error('فشل تشغيل دورة الفوترة: %s', exc)
        raise self.retry(exc=exc, countdown=300)
