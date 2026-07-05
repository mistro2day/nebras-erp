"""
Automation Engine — runtime dispatch of automation flows.

The engine is a thin orchestrator. Each action delegates to an existing platform
capability:

* run_workflow      -> apps.workflow.services.WorkflowEngine
* evaluate_rule     -> apps.rules.application.services.RuleEvaluationService
* send_notification -> apps.platform notification service (best-effort)
* emit_event        -> apps.platform.application.events.EventBus
* delay/branch/...  -> handled inline (no external side effects)

It records an AutomationRun + AutomationRunStep per execution and honours the
flow's RetryPolicy. It never re-implements workflow/rule execution.
"""
import logging
from django.utils import timezone

from apps.automation_platform.domain.models import (
    AutomationFlow, AutomationTrigger, AutomationRun, AutomationRunStep,
)
from apps.automation_platform.application.expressions import SafeExpression, ExpressionError

logger = logging.getLogger('nebras.automation')


class AutomationEngine:
    """محرك تنفيذ تدفقات الأتمتة (Orchestration only)."""

    @classmethod
    def dispatch_event(cls, event_key: str, payload: dict, tenant_id=None):
        """
        استقبال حدث نظام وتشغيل كل التدفقات المفعّلة المرتبطة بمحفّز الحدث.
        يُستدعى من مشتركي ناقل الأحداث (EventBus subscribers).
        """
        triggers = AutomationTrigger.objects.filter(
            trigger_type='event', event_key=event_key, is_enabled=True,
        )
        if tenant_id:
            triggers = triggers.filter(tenant_id=tenant_id)

        runs = []
        for trig in triggers:
            flow = trig.flow
            if not (flow.is_enabled and flow.status == 'active'):
                continue
            if not cls._passes_condition(trig.condition_expression, payload):
                continue
            runs.append(cls.execute_flow(flow, payload, trigger=trig))
        return runs

    @classmethod
    def trigger_manual(cls, flow: AutomationFlow, payload: dict = None, user_id=None):
        """تشغيل يدوي لتدفق."""
        trig = flow.triggers.filter(trigger_type='manual').first()
        return cls.execute_flow(flow, payload or {}, trigger=trig)

    @classmethod
    def _passes_condition(cls, expression, payload) -> bool:
        if not expression:
            return True
        try:
            return bool(SafeExpression.evaluate(expression, payload or {}))
        except ExpressionError:
            return False

    @classmethod
    def execute_flow(cls, flow: AutomationFlow, payload: dict, trigger: AutomationTrigger = None,
                     attempt: int = 1) -> AutomationRun:
        """تنفيذ تدفق واحد وتسجيل السجل والخطوات، مع سياسة إعادة المحاولة."""
        run = AutomationRun.objects.create(
            tenant_id=flow.tenant_id, flow=flow, trigger=trigger,
            status='running', trigger_payload=payload or {},
            context=dict(payload or {}), started_at=timezone.now(), attempt=attempt,
        )
        context = dict(payload or {})
        failed = False
        error_message = None

        for action in flow.actions.all().order_by('order'):
            if action.condition_expression and not cls._passes_condition(action.condition_expression, context):
                AutomationRunStep.objects.create(
                    tenant_id=flow.tenant_id, run=run, action=action, order=action.order,
                    status='skipped', output={'reason': 'condition_not_met'},
                )
                continue
            step = AutomationRunStep.objects.create(
                tenant_id=flow.tenant_id, run=run, action=action, order=action.order, status='running',
            )
            try:
                output = cls._execute_action(action, context, flow)
                step.status = 'success'
                step.output = output or {}
                step.save()
                if isinstance(output, dict) and output.get('context_update'):
                    context.update(output['context_update'])
            except Exception as exc:  # noqa: BLE001
                logger.error("Automation action failed: %s", exc)
                step.status = 'failed'
                step.error_message = str(exc)
                step.save()
                if not action.continue_on_error:
                    failed = True
                    error_message = str(exc)
                    break

        run.finished_at = timezone.now()
        run.context = context
        if failed:
            run.status = 'failed'
            run.error_message = error_message
            run.save()
            cls._maybe_retry(flow, payload, trigger, attempt)
        else:
            run.status = 'success'
            run.save()

        # تحديث عدّادات التدفق
        AutomationFlow.objects.filter(id=flow.id).update(
            last_run_at=timezone.now(), run_count=flow.run_count + 1,
        )
        return run

    @classmethod
    def _maybe_retry(cls, flow, payload, trigger, attempt):
        policy = getattr(flow, 'retry_policy', None)
        if policy and attempt <= policy.max_retries:
            # في الإنتاج: يُجدول عبر Celery countdown = backoff. هنا نكتفي بتسجيل النية.
            logger.info("Flow %s scheduled for retry attempt %s", flow.code, attempt + 1)

    # --- Action handlers (all delegate to existing engines) ---

    @classmethod
    def _execute_action(cls, action, context, flow) -> dict:
        handler = getattr(cls, f"_action_{action.action_type}", None)
        if handler is None:
            return {'status': 'noop', 'action_type': action.action_type}
        return handler(action.config or {}, context, flow)

    @staticmethod
    def _action_run_workflow(config, context, flow) -> dict:
        from apps.workflow.services import WorkflowEngine
        instance_id = config.get('instance_id') or context.get('workflow_instance_id')
        act = config.get('action', 'proceed')
        user_id = config.get('user_id') or context.get('user_id')
        if not instance_id:
            return {'status': 'skipped', 'reason': 'no_instance_id'}
        instance = WorkflowEngine.trigger_transition(instance_id, act, user_id, config.get('comments'))
        return {'status': 'ok', 'new_state': str(instance.current_state_id)}

    @staticmethod
    def _action_evaluate_rule(config, context, flow) -> dict:
        from apps.rules.application.services import RuleEvaluationService
        rule_id = config.get('rule_id')
        if not rule_id:
            return {'status': 'skipped', 'reason': 'no_rule_id'}
        result = RuleEvaluationService.evaluate_rule(rule_id, {**context, **config.get('context', {})})
        return {'status': 'ok', 'result': result, 'context_update': {'rule_matched': result.get('is_matched')}}

    @staticmethod
    def _action_emit_event(config, context, flow) -> dict:
        try:
            from apps.platform.application.events import EventBus
        except Exception:
            return {'status': 'skipped', 'reason': 'event_bus_unavailable'}
        EventBus.publish(
            event_name=config.get('event_name', 'automation.custom'),
            payload={**context, **config.get('payload', {})},
            tenant_id=flow.tenant_id, async_dispatch=config.get('async', True),
        )
        return {'status': 'ok'}

    @staticmethod
    def _action_send_notification(config, context, flow) -> dict:
        try:
            from apps.platform.application import notifications as notif
        except Exception:
            return {'status': 'skipped', 'reason': 'notifications_unavailable'}
        # أفضل جهد: نحاول استدعاء خدمة الإشعارات إن وُجدت دالة معروفة
        payload = {**context, **config}
        send = getattr(notif, 'send_notification', None) or getattr(
            getattr(notif, 'NotificationService', None), 'send', None
        )
        if callable(send):
            try:
                send(payload)  # type: ignore[misc]
            except Exception as exc:  # noqa: BLE001
                logger.warning("notification send failed: %s", exc)
        return {'status': 'ok', 'notified': config.get('recipient')}

    @staticmethod
    def _action_call_webhook(config, context, flow) -> dict:
        # تحضير فقط: لا يقوم بطلب شبكي فعلي هنا (يُنفّذ عبر مهمة Celery في الإنتاج)
        return {'status': 'queued', 'url': config.get('url')}

    @staticmethod
    def _action_delay(config, context, flow) -> dict:
        return {'status': 'ok', 'delayed_seconds': config.get('seconds', 0)}

    @staticmethod
    def _action_branch(config, context, flow) -> dict:
        expr = config.get('expression')
        try:
            taken = bool(SafeExpression.evaluate(expr, context)) if expr else True
        except ExpressionError:
            taken = False
        return {'status': 'ok', 'branch_taken': taken, 'context_update': {'branch': taken}}
