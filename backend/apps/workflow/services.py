from apps.workflow.models import WorkflowInstance, WorkflowTransition, WorkflowState, WorkflowHistory
from django.core.exceptions import ValidationError
from uuid import UUID

class WorkflowEngine:
    """
    محرك مسار العمل العام لمعالجة وتوجيه طلبات الانتقال بين الحالات
    """
    @staticmethod
    def trigger_transition(instance_id: UUID, action: str, user_id: UUID, comments: str = None) -> WorkflowInstance:
        try:
            instance = WorkflowInstance.objects.get(id=instance_id)
        except WorkflowInstance.DoesNotExist:
            raise ValidationError("مثيل مسار العمل غير موجود.")

        # الحصول على الانتقال المسموح
        transition = WorkflowTransition.objects.filter(
            workflow=instance.workflow,
            from_state=instance.current_state,
            trigger_action=action
        ).first()

        if not transition:
            raise ValidationError(f"الإجراء '{action}' غير مسموح به في الحالة الحالية ({instance.current_state.name}).")

        old_state = instance.current_state
        instance.current_state = transition.to_state
        instance.save()

        # تسجيل في التاريخ
        WorkflowHistory.objects.create(
            instance=instance,
            from_state=old_state,
            to_state=transition.to_state,
            action_by=user_id,
            action_taken=action,
            comments=comments,
            tenant_id=instance.tenant_id
        )

        return instance