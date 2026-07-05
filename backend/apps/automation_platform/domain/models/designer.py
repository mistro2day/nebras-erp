"""
Visual Workflow Designer domain models.

These models represent the *authoring / design-time* layer of the Enterprise
Automation Platform. They intentionally sit ON TOP OF the existing Workflow
Engine (``apps.workflow``). Runtime execution is always delegated to
``apps.workflow.services.WorkflowEngine`` — this layer never re-implements
state-machine execution. When a design is published it is compiled into the
existing ``WorkflowDefinition`` / ``WorkflowState`` / ``WorkflowTransition``
records so a single execution engine remains the source of truth.
"""
from django.db import models
from apps.shared.domain.models import CombinedSharedModel


class WorkflowDiagram(CombinedSharedModel):
    """
    مخطط مصمم مسار العمل المرئي (Visual Canvas).
    يمثل طبقة التصميم فوق محرك مسارات العمل الحالي (apps.workflow).
    """
    STATUS_CHOICES = (
        ('draft', 'مسودة'),
        ('published', 'منشور'),
        ('archived', 'مؤرشف'),
    )

    name = models.CharField(max_length=200)
    code = models.CharField(max_length=100, db_index=True)
    description = models.TextField(blank=True, null=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    version = models.IntegerField(default=1)
    is_latest = models.BooleanField(default=True)

    # ربط اختياري بتعريف مسار العمل الفعلي بعد النشر (لا يُكرر التنفيذ)
    workflow_definition_id = models.UUIDField(null=True, blank=True, db_index=True)

    # وصف الكانفس الكامل (nodes/edges/groups/variables) بصيغة JSON
    canvas = models.JSONField(default=dict, blank=True)
    variables = models.JSONField(default=list, blank=True)

    category = models.CharField(max_length=100, blank=True, null=True)
    tags = models.JSONField(default=list, blank=True)

    published_at = models.DateTimeField(null=True, blank=True)
    published_by = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_ap_workflow_diagrams'
        unique_together = ('code', 'version')

    def __str__(self):
        return f"{self.name} (v{self.version})"


class WorkflowNode(CombinedSharedModel):
    """عقدة على الكانفس (بداية/مهمة/شرط/موافقة/مؤقت/حدث/مسار فرعي)."""
    NODE_TYPES = (
        ('start', 'بداية'),
        ('end', 'نهاية'),
        ('task', 'مهمة'),
        ('condition', 'شرط / تفرع'),
        ('approval', 'موافقة'),
        ('timer', 'مؤقت / تأخير'),
        ('event', 'حدث'),
        ('rule', 'قاعدة عمل'),
        ('subflow', 'مسار فرعي'),
        ('script', 'سكربت / تعبير'),
        ('notification', 'إشعار'),
    )
    diagram = models.ForeignKey(WorkflowDiagram, on_delete=models.CASCADE, related_name='nodes')
    node_key = models.CharField(max_length=100)  # مفتاح فريد داخل المخطط
    node_type = models.CharField(max_length=30, choices=NODE_TYPES)
    label = models.CharField(max_length=200)

    position_x = models.FloatField(default=0)
    position_y = models.FloatField(default=0)

    config = models.JSONField(default=dict, blank=True)   # إعدادات خاصة بالعقدة
    group_key = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'nebras_ap_workflow_nodes'
        unique_together = ('diagram', 'node_key')


class WorkflowEdge(CombinedSharedModel):
    """وصلة / انتقال بين عقدتين مع شرط اختياري (Expression)."""
    diagram = models.ForeignKey(WorkflowDiagram, on_delete=models.CASCADE, related_name='edges')
    edge_key = models.CharField(max_length=100)
    source_key = models.CharField(max_length=100)
    target_key = models.CharField(max_length=100)
    label = models.CharField(max_length=200, blank=True, null=True)

    condition_expression = models.TextField(blank=True, null=True)  # تعبير شرطي
    trigger_action = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'nebras_ap_workflow_edges'
        unique_together = ('diagram', 'edge_key')


class WorkflowBlock(CombinedSharedModel):
    """كتلة قابلة لإعادة الاستخدام (Reusable Block) تُدرج داخل عدة مخططات."""
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.TextField(blank=True, null=True)
    definition = models.JSONField(default=dict, blank=True)  # nodes/edges جزئية
    is_shared = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_ap_workflow_blocks'


class WorkflowTemplate(CombinedSharedModel):
    """قالب مسار عمل جاهز يمكن استنساخه لإنشاء مخطط جديد."""
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=100, unique=True, db_index=True)
    category = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    definition = models.JSONField(default=dict, blank=True)
    is_system = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_ap_workflow_templates'


class WorkflowDiagramVersion(CombinedSharedModel):
    """لقطة إصدار كامل من المخطط (Versioning / Draft-Publish history)."""
    diagram = models.ForeignKey(WorkflowDiagram, on_delete=models.CASCADE, related_name='version_snapshots')
    version_number = models.IntegerField()
    snapshot = models.JSONField(default=dict, blank=True)
    change_log = models.TextField(blank=True, null=True)
    created_by_user = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_ap_workflow_diagram_versions'
        unique_together = ('diagram', 'version_number')


class WorkflowSimulation(CombinedSharedModel):
    """نتيجة محاكاة / معاينة تنفيذ مخطط دون التأثير على البيانات الفعلية."""
    diagram = models.ForeignKey(WorkflowDiagram, on_delete=models.CASCADE, related_name='simulations')
    input_context = models.JSONField(default=dict, blank=True)
    execution_trace = models.JSONField(default=list, blank=True)
    is_valid = models.BooleanField(default=True)
    validation_messages = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = 'nebras_ap_workflow_simulations'


class WorkflowValidationIssue(CombinedSharedModel):
    """مشكلة اكتُشفت أثناء التحقق من صحة المخطط (Validation)."""
    SEVERITY = (('error', 'خطأ'), ('warning', 'تحذير'), ('info', 'معلومة'))
    diagram = models.ForeignKey(WorkflowDiagram, on_delete=models.CASCADE, related_name='validation_issues')
    severity = models.CharField(max_length=20, choices=SEVERITY, default='error')
    node_key = models.CharField(max_length=100, blank=True, null=True)
    message = models.TextField()

    class Meta:
        db_table = 'nebras_ap_workflow_validation_issues'
