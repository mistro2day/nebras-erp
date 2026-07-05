"""
Celery tasks for the Automation Platform.

* ``execute_automation_flow`` — runs an AutomationFlow via the existing
  AutomationEngine, with native Celery retry + exponential backoff driven by the
  flow's RetryPolicy.
* ``execute_scheduled_job`` — entry point invoked by Celery Beat for a ScheduledJob.

Execution itself is delegated to ``AutomationEngine`` (no duplication). These tasks
only add the async/retry/scheduling envelope.
"""
import logging
from celery import shared_task

logger = logging.getLogger('nebras.automation.tasks')


@shared_task(bind=True, name='apps.automation_platform.application.tasks.execute_automation_flow',
             max_retries=5, acks_late=True)
def execute_automation_flow(self, flow_id: str, payload: dict | None = None, attempt: int = 1):
    """
    تشغيل تدفق أتمتة لامتزامناً مع إعادة محاولة وتراجع أسّي حسب سياسة التدفق.
    """
    from apps.automation_platform.domain.models import AutomationFlow
    from apps.automation_platform.application.automation_engine import AutomationEngine

    try:
        flow = AutomationFlow.all_objects.get(id=flow_id, deleted_at__isnull=True)
    except AutomationFlow.DoesNotExist:
        logger.warning('execute_automation_flow: flow %s not found', flow_id)
        return {'status': 'not_found', 'flow_id': flow_id}

    run = AutomationEngine.execute_flow(flow, payload or {}, attempt=attempt)

    if run.status == 'failed':
        policy = getattr(flow, 'retry_policy', None)
        if policy and self.request.retries < policy.max_retries:
            countdown = _backoff_seconds(policy, self.request.retries)
            logger.info('Retrying flow %s in %ss (retry %s)', flow.code, countdown, self.request.retries + 1)
            raise self.retry(countdown=countdown, kwargs={
                'flow_id': flow_id, 'payload': payload, 'attempt': attempt + 1,
            })
    return {'status': run.status, 'run_id': str(run.id)}


@shared_task(name='apps.automation_platform.application.tasks.execute_scheduled_job')
def execute_scheduled_job(job_id: str):
    """نقطة دخول Celery Beat لتشغيل مهمة مجدولة."""
    from django.utils import timezone
    from apps.automation_platform.domain.models import ScheduledJob

    try:
        job = ScheduledJob.all_objects.get(id=job_id, deleted_at__isnull=True)
    except ScheduledJob.DoesNotExist:
        return {'status': 'not_found', 'job_id': job_id}

    if not job.is_enabled:
        return {'status': 'disabled', 'job_id': job_id}

    result = {'status': 'no_action'}
    if job.flow_id:
        if _eager():
            execute_automation_flow.apply(args=[str(job.flow_id), {}])
        else:
            execute_automation_flow.delay(str(job.flow_id), {})
        result = {'status': 'dispatched', 'flow_id': str(job.flow_id)}

    ScheduledJob.all_objects.filter(id=job.id).update(last_run_at=timezone.now())
    return result


def _backoff_seconds(policy, retries: int) -> int:
    base = max(1, policy.backoff_seconds)
    strategy = policy.backoff_strategy
    if strategy == 'fixed':
        return base
    if strategy == 'linear':
        return base * (retries + 1)
    # exponential (default)
    return base * (2 ** retries)


def _eager() -> bool:
    from django.conf import settings
    return getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False)
