from django.db import models
from apps.common.models import CombinedBaseModel
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey

class WorkflowDefinition(CombinedBaseModel):
    """
    تعريف مسار العمل (Workflow) لنوع معين من النماذج
    """
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50, unique=True)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'workflow_definitions'


class WorkflowState(CombinedBaseModel):
    """
    الحالات المختلفة في مسار العمل (مثال: مسودة، تم التقديم، موافق عليه)
    """
    workflow = models.ForeignKey(WorkflowDefinition, on_delete=models.CASCADE, related_name='states')
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50)
    is_initial = models.BooleanField(default=False)
    is_final = models.BooleanField(default=False)

    class Meta:
        db_table = 'workflow_states'
        unique_together = ('workflow', 'code')


class WorkflowTransition(CombinedBaseModel):
    """
    الانتقالات المسموحة بين الحالات
    """
    workflow = models.ForeignKey(WorkflowDefinition, on_delete=models.CASCADE, related_name='transitions')
    from_state = models.ForeignKey(WorkflowState, on_delete=models.CASCADE, related_name='outgoing')
    to_state = models.ForeignKey(WorkflowState, on_delete=models.CASCADE, related_name='incoming')
    trigger_action = models.CharField(max_length=100) # اسم العملية (مثال: approve, reject)
    permission_required = models.CharField(max_length=150, blank=True, null=True)

    class Meta:
        db_table = 'workflow_transitions'


class WorkflowInstance(CombinedBaseModel):
    """
    مثيل مشغل لمسار عمل على سجل محدد في النظام
    """
    workflow = models.ForeignKey(WorkflowDefinition, on_delete=models.CASCADE)
    current_state = models.ForeignKey(WorkflowState, on_delete=models.CASCADE)
    
    # ربط ديناميكي بأي نموذج في النظام (مثل Applicant)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    content_object = GenericForeignKey('content_type', 'object_id')

    class Meta:
        db_table = 'workflow_instances'
        unique_together = ('content_type', 'object_id')


class WorkflowHistory(CombinedBaseModel):
    """
    سجل تتبع الحركات والتغييرات على مسارات العمل
    """
    instance = models.ForeignKey(WorkflowInstance, on_delete=models.CASCADE, related_name='history')
    from_state = models.ForeignKey(WorkflowState, on_delete=models.SET_NULL, null=True, related_name='history_from')
    to_state = models.ForeignKey(WorkflowState, on_delete=models.CASCADE, related_name='history_to')
    action_by = models.UUIDField() # ID المستخدم
    action_taken = models.CharField(max_length=100)
    comments = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'workflow_history'