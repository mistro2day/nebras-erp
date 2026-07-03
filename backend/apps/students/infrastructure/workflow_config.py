from django.contrib.contenttypes.models import ContentType
from apps.workflow.models import WorkflowDefinition, WorkflowState, WorkflowTransition
from apps.students.domain.models import Student

def setup_student_workflow(tenant_id):
    """
    إعداد وتعريف مسار عمل الطالب (Student Workflow) للمستأجر المحدد
    """
    content_type = ContentType.objects.get_for_model(Student)
    
    # 1. تعريف مسار العمل
    workflow, created = WorkflowDefinition.objects.get_or_create(
        code='student_lifecycle',
        tenant_id=tenant_id,
        defaults={
            'name': 'مسار عمل دورة حياة الطالب',
            'content_type': content_type,
            'description': 'دورة حياة الطالب من التقديم والقبول وحتى التخرج أو الانسحاب',
            'is_active': True
        }
    )
    
    # 2. الحالات المختلفة
    states_data = [
        ('applicant', 'متقدم', True, False),
        ('accepted', 'مقبول', False, False),
        ('registered', 'مسجل', False, False),
        ('enrolled', 'موزع دراسياً', False, False),
        ('active', 'نشط', False, False),
        ('suspended', 'موقوف مؤقتاً', False, False),
        ('transferred', 'منقول', False, True),
        ('graduated', 'متخرج', False, True),
        ('withdrawn', 'منسحب', False, True),
        ('dismissed', 'مفصول', False, True),
        ('archived', 'مؤرشف', False, True),
        ('alumni', 'خريج نشط', False, True),
    ]
    
    states = {}
    for code, name, is_initial, is_final in states_data:
        state, _ = WorkflowState.objects.get_or_create(
            workflow=workflow,
            code=code,
            tenant_id=tenant_id,
            defaults={
                'name': name,
                'is_initial': is_initial,
                'is_final': is_final
            }
        )
        states[code] = state
        
    # 3. الانتقالات المسموحة
    transitions_data = [
        ('applicant', 'accepted', 'approve_admission', 'admissions.approve'),
        ('accepted', 'registered', 'register_student', 'students.create'),
        ('registered', 'enrolled', 'enroll_student', 'students.promote'),
        ('enrolled', 'active', 'activate_student', 'students.update'),
        ('active', 'suspended', 'suspend_student', 'students.update'),
        ('suspended', 'active', 'unsuspend_student', 'students.update'),
        ('active', 'transferred', 'transfer_student', 'students.transfer'),
        ('active', 'graduated', 'graduate_student', 'students.graduate'),
        ('graduated', 'alumni', 'mark_alumni', 'students.graduate'),
        ('active', 'withdrawn', 'withdraw_student', 'students.withdraw'),
        ('active', 'dismissed', 'dismiss_student', 'students.withdraw'),
        ('withdrawn', 'archived', 'archive_student', 'students.archive'),
        ('dismissed', 'archived', 'archive_student', 'students.archive'),
        ('archived', 'active', 'restore_student', 'students.restore'),
    ]
    
    for from_code, to_code, action, perm in transitions_data:
        WorkflowTransition.objects.get_or_create(
            workflow=workflow,
            from_state=states[from_code],
            to_state=states[to_code],
            trigger_action=action,
            tenant_id=tenant_id,
            defaults={
                'permission_required': perm
            }
        )
        
    return workflow