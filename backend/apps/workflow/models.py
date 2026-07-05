from django.db import models
from apps.common.models import CombinedBaseModel
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey

class WorkflowDefinition(CombinedBaseModel):
    """
    تعريف مسار العمل (Workflow) لنوع معين من النماذج
    """
    name = models.CharField(max_length=150, verbose_name="الاسم")
    code = models.CharField(max_length=50, unique=True, verbose_name="الرمز")
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, verbose_name="نوع النموذج المستهدف")
    description = models.TextField(blank=True, null=True, verbose_name="الوصف")
    is_active = models.BooleanField(default=True, verbose_name="مفعّل")

    class Meta:
        db_table = 'workflow_definitions'
        verbose_name = "تعريف مسار عمل"
        verbose_name_plural = "تعريفات مسارات العمل"


class WorkflowState(CombinedBaseModel):
    """
    الحالات المختلفة في مسار العمل (مثال: مسودة، تم التقديم، موافق عليه)
    """
    workflow = models.ForeignKey(WorkflowDefinition, on_delete=models.CASCADE, related_name='states', verbose_name="مسار العمل")
    name = models.CharField(max_length=100, verbose_name="الاسم")
    code = models.CharField(max_length=50, verbose_name="الرمز")
    is_initial = models.BooleanField(default=False, verbose_name="حالة أولية")
    is_final = models.BooleanField(default=False, verbose_name="حالة نهائية")

    class Meta:
        db_table = 'workflow_states'
        unique_together = ('workflow', 'code')
        verbose_name = "حالة مسار عمل"
        verbose_name_plural = "حالات مسارات العمل"


class WorkflowTransition(CombinedBaseModel):
    """
    الانتقالات المسموحة بين الحالات
    """
    workflow = models.ForeignKey(WorkflowDefinition, on_delete=models.CASCADE, related_name='transitions', verbose_name="مسار العمل")
    from_state = models.ForeignKey(WorkflowState, on_delete=models.CASCADE, related_name='outgoing', verbose_name="من حالة")
    to_state = models.ForeignKey(WorkflowState, on_delete=models.CASCADE, related_name='incoming', verbose_name="إلى حالة")
    trigger_action = models.CharField(max_length=100, verbose_name="إجراء التنفيذ") # اسم العملية (مثال: approve, reject)
    permission_required = models.CharField(max_length=150, blank=True, null=True, verbose_name="الصلاحية المطلوبة")

    class Meta:
        db_table = 'workflow_transitions'
        verbose_name = "انتقال مسار عمل"
        verbose_name_plural = "انتقالات مسارات العمل"


class WorkflowInstance(CombinedBaseModel):
    """
    مثيل مشغل لمسار عمل على سجل محدد في النظام
    """
    workflow = models.ForeignKey(WorkflowDefinition, on_delete=models.CASCADE, verbose_name="مسار العمل")
    current_state = models.ForeignKey(WorkflowState, on_delete=models.CASCADE, verbose_name="الحالة الحالية")

    # ربط ديناميكي بأي نموذج في النظام (مثل Applicant)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, verbose_name="نوع النموذج")
    object_id = models.UUIDField(verbose_name="معرف السجل")
    content_object = GenericForeignKey('content_type', 'object_id')

    class Meta:
        db_table = 'workflow_instances'
        unique_together = ('content_type', 'object_id')
        verbose_name = "مثيل مسار عمل"
        verbose_name_plural = "مثيلات مسارات العمل"


class WorkflowHistory(CombinedBaseModel):
    """
    سجل تتبع الحركات والتغييرات على مسارات العمل
    """
    instance = models.ForeignKey(WorkflowInstance, on_delete=models.CASCADE, related_name='history', verbose_name="مثيل مسار العمل")
    from_state = models.ForeignKey(WorkflowState, on_delete=models.SET_NULL, null=True, related_name='history_from', verbose_name="من حالة")
    to_state = models.ForeignKey(WorkflowState, on_delete=models.CASCADE, related_name='history_to', verbose_name="إلى حالة")
    action_by = models.UUIDField(verbose_name="تم بواسطة") # ID المستخدم
    action_taken = models.CharField(max_length=100, verbose_name="الإجراء المتخذ")
    comments = models.TextField(blank=True, null=True, verbose_name="ملاحظات")

    class Meta:
        db_table = 'workflow_history'
        verbose_name = "سجل حركة مسار عمل"
        verbose_name_plural = "سجل حركات مسارات العمل"