from django.contrib.contenttypes.models import ContentType
from apps.workflow.models import WorkflowDefinition, WorkflowState, WorkflowTransition
from apps.approval_center.domain.models import ApprovalRequest


def setup_approval_workflow(tenant_id):
    """
    إعداد وتعريف مسار عمل دورة حياة طلب الاعتماد (Approval Request Workflow) للمستأجر المحدد.
    التفويض لا يُمثَّل كانتقال في مسار العمل لأنه يعيد تكليف المُعتمِد دون تغيير حالة الطلب،
    ويُدار بالكامل عبر ApprovalAssignment/ApprovalDelegation.
    """
    content_type = ContentType.objects.get_for_model(ApprovalRequest)

    workflow, created = WorkflowDefinition.objects.get_or_create(
        code='approval_center_lifecycle',
        tenant_id=tenant_id,
        defaults={
            'name': 'مسار عمل دورة حياة طلب الاعتماد',
            'content_type': content_type,
            'description': 'دورة حياة طلب الاعتماد من التقديم وحتى الاعتماد أو الرفض أو الانتهاء',
            'is_active': True,
        }
    )

    states_data = [
        ('pending', 'قيد الانتظار', True, False),
        ('approved', 'معتمد', False, True),
        ('rejected', 'مرفوض', False, True),
        ('returned', 'مُعاد للمراجعة', False, False),
        ('escalated', 'مُصعَّد', False, False),
        ('cancelled', 'ملغى', False, True),
        ('expired', 'منتهي الصلاحية', False, True),
    ]

    states = {}
    for code, name, is_initial, is_final in states_data:
        state, _ = WorkflowState.objects.get_or_create(
            workflow=workflow,
            code=code,
            tenant_id=tenant_id,
            defaults={'name': name, 'is_initial': is_initial, 'is_final': is_final}
        )
        states[code] = state

    transitions_data = [
        ('pending', 'approved', 'approve', 'approval_center:requests:decide'),
        ('pending', 'rejected', 'reject', 'approval_center:requests:decide'),
        ('pending', 'returned', 'return', 'approval_center:requests:decide'),
        ('returned', 'pending', 'resubmit', 'approval_center:requests:decide'),
        ('pending', 'escalated', 'escalate', 'approval_center:escalations:manage'),
        ('escalated', 'pending', 'deescalate', 'approval_center:escalations:manage'),
        ('escalated', 'approved', 'approve', 'approval_center:requests:decide'),
        ('escalated', 'rejected', 'reject', 'approval_center:requests:decide'),
        ('pending', 'cancelled', 'cancel', 'approval_center:requests:manage'),
        ('pending', 'expired', 'expire', 'approval_center:requests:manage'),
    ]

    for from_code, to_code, action, perm in transitions_data:
        WorkflowTransition.objects.get_or_create(
            workflow=workflow,
            from_state=states[from_code],
            to_state=states[to_code],
            trigger_action=action,
            tenant_id=tenant_id,
            defaults={'permission_required': perm}
        )

    return workflow
