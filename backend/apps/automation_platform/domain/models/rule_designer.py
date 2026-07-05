"""
Visual Rule Designer domain models.

Authoring layer for decision tables / decision trees / rule sets. Evaluation is
delegated to the existing Rule Engine (``apps.rules.application.services``).
A published decision table/tree compiles into ``apps.rules`` Rule records; this
layer never re-implements condition evaluation.
"""
from django.db import models
from apps.shared.domain.models import CombinedSharedModel


class DecisionTable(CombinedSharedModel):
    """جدول قرار مرئي (Decision Table) — inputs → outputs."""
    HIT_POLICY = (
        ('first', 'أول تطابق'),
        ('unique', 'تطابق فريد'),
        ('collect', 'تجميع الكل'),
        ('priority', 'حسب الأولوية'),
    )
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.TextField(blank=True, null=True)
    hit_policy = models.CharField(max_length=20, choices=HIT_POLICY, default='first')

    inputs = models.JSONField(default=list, blank=True)   # [{name, expression, type}]
    outputs = models.JSONField(default=list, blank=True)  # [{name, type}]

    status = models.CharField(max_length=20, default='draft')
    version = models.IntegerField(default=1)
    # ربط بالقاعدة المُترجمة في محرك القواعد بعد النشر
    linked_rule_id = models.UUIDField(null=True, blank=True, db_index=True)

    class Meta:
        db_table = 'nebras_ap_decision_tables'


class DecisionTableRule(CombinedSharedModel):
    """صف / قاعدة داخل جدول القرار."""
    table = models.ForeignKey(DecisionTable, on_delete=models.CASCADE, related_name='rows')
    row_order = models.IntegerField(default=0)
    conditions = models.JSONField(default=dict, blank=True)  # {input_name: {op, value}}
    results = models.JSONField(default=dict, blank=True)     # {output_name: value}
    priority = models.IntegerField(default=100)

    class Meta:
        db_table = 'nebras_ap_decision_table_rules'
        ordering = ['row_order']


class DecisionTree(CombinedSharedModel):
    """شجرة قرار مرئية (Decision Tree)."""
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.TextField(blank=True, null=True)
    root_node_key = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, default='draft')
    version = models.IntegerField(default=1)

    class Meta:
        db_table = 'nebras_ap_decision_trees'


class DecisionTreeNode(CombinedSharedModel):
    """عقدة في شجرة القرار (شرط أو نتيجة نهائية)."""
    NODE_KIND = (('condition', 'شرط'), ('leaf', 'نتيجة'))
    tree = models.ForeignKey(DecisionTree, on_delete=models.CASCADE, related_name='nodes')
    node_key = models.CharField(max_length=100)
    parent_key = models.CharField(max_length=100, blank=True, null=True)
    kind = models.CharField(max_length=20, choices=NODE_KIND, default='condition')
    expression = models.TextField(blank=True, null=True)  # شرط التفرع
    branch_value = models.CharField(max_length=200, blank=True, null=True)  # قيمة الفرع من الأب
    result = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'nebras_ap_decision_tree_nodes'
        unique_together = ('tree', 'node_key')


class RuleSet(CombinedSharedModel):
    """مجموعة قواعد مُدارة معاً (Rule Set) — تربط قواعد محرك القواعد."""
    DOMAIN_CHOICES = (
        ('general', 'عام'),
        ('academic', 'أكاديمي'),
        ('finance', 'مالي'),
        ('hr', 'موارد بشرية'),
        ('approval', 'موافقات'),
        ('validation', 'تحقق'),
    )
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=100, unique=True, db_index=True)
    domain = models.CharField(max_length=30, choices=DOMAIN_CHOICES, default='general')
    description = models.TextField(blank=True, null=True)
    execution_order = models.CharField(max_length=20, default='priority')  # priority|sequence
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_ap_rule_sets'


class RuleSetMember(CombinedSharedModel):
    """عضوية قاعدة (من محرك القواعد) داخل مجموعة القواعد."""
    rule_set = models.ForeignKey(RuleSet, on_delete=models.CASCADE, related_name='members')
    rule_id = models.UUIDField(db_index=True)  # مرجع إلى apps.rules.Rule
    order = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_ap_rule_set_members'
        ordering = ['order']


class RuleSimulation(CombinedSharedModel):
    """سجل محاكاة/اختبار مجموعة قرار أو جدول قرار."""
    target_type = models.CharField(max_length=30)  # decision_table|decision_tree|rule_set
    target_id = models.UUIDField(db_index=True)
    input_context = models.JSONField(default=dict, blank=True)
    result = models.JSONField(default=dict, blank=True)
    trace = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = 'nebras_ap_rule_simulations'
