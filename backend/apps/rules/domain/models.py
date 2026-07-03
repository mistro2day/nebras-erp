from django.db import models
from apps.shared.domain.models import CombinedSharedModel

# 1. Rule Category
class RuleCategory(CombinedSharedModel):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_rule_categories'


# 2. Rule Group
class RuleGroup(CombinedSharedModel):
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    category = models.ForeignKey(RuleCategory, on_delete=models.CASCADE, related_name='groups')

    class Meta:
        db_table = 'nebras_rule_groups'


# 3. Rule Core Model
class Rule(CombinedSharedModel):
    STATUS_CHOICES = (
        ('draft', 'مسودة'),
        ('published', 'منشور ومفعل'),
        ('archived', 'مؤرشف'),
    )
    
    APPROVAL_CHOICES = (
        ('pending', 'معلق الموافقة'),
        ('approved', 'مقبول'),
        ('rejected', 'مرفوض'),
    )

    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.TextField(blank=True, null=True)
    category = models.ForeignKey(RuleCategory, on_delete=models.CASCADE, related_name='rules')
    group = models.ForeignKey(RuleGroup, on_delete=models.SET_NULL, null=True, blank=True, related_name='rules')
    
    priority = models.IntegerField(default=100)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='draft')
    is_enabled = models.BooleanField(default=True)
    
    effective_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    
    branch_scope = models.UUIDField(null=True, blank=True)
    campus_scope = models.UUIDField(null=True, blank=True)
    
    version = models.IntegerField(default=1)
    approval_status = models.CharField(max_length=30, choices=APPROVAL_CHOICES, default='approved')

    class Meta:
        db_table = 'nebras_rules'

    def __str__(self):
        return f"{self.name} ({self.code})"


# 4. Rule Version
class RuleVersion(CombinedSharedModel):
    rule = models.ForeignKey(Rule, on_delete=models.CASCADE, related_name='versions')
    version_number = models.IntegerField()
    change_log = models.TextField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'nebras_rule_versions'


# 5. Rule Variable
class RuleVariable(CombinedSharedModel):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=100, unique=True, db_index=True)
    data_type = models.CharField(max_length=50, default='string') # string, number, boolean, date
    source_model = models.CharField(max_length=150, blank=True, null=True)

    class Meta:
        db_table = 'nebras_rule_variables'


# 6. Rule Condition
class RuleCondition(CombinedSharedModel):
    OPERATOR_CHOICES = (
        ('equals', 'يساوي =='),
        ('not_equals', 'لا يساوي !='),
        ('greater_than', 'أكبر من >'),
        ('less_than', 'أصغر من <'),
        ('greater_or_equal', 'أكبر أو يساوي >='),
        ('less_or_equal', 'أصغر أو يساوي <='),
        ('between', 'بين X و Y'),
        ('contains', 'يحتوي على'),
    )

    rule = models.ForeignKey(Rule, on_delete=models.CASCADE, related_name='conditions')
    variable = models.ForeignKey(RuleVariable, on_delete=models.CASCADE, related_name='conditions')
    operator = models.CharField(max_length=50, choices=OPERATOR_CHOICES)
    value_to_compare = models.CharField(max_length=255)
    
    logical_gate = models.CharField(max_length=10, default='AND') # AND, OR

    class Meta:
        db_table = 'nebras_rule_conditions'


# 7. Rule Action
class RuleAction(CombinedSharedModel):
    ACTION_TYPES = (
        ('allow', 'السماح بالعملية'),
        ('deny', 'رفض وحجب العملية'),
        ('calculate', 'احتساب معادلة'),
        ('notify', 'إرسال إشعار وتنبيه'),
    )
    rule = models.ForeignKey(Rule, on_delete=models.CASCADE, related_name='actions')
    action_type = models.CharField(max_length=50, choices=ACTION_TYPES)
    configuration = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'nebras_rule_actions'


# 8. Rule Parameter
class RuleParameter(CombinedSharedModel):
    rule = models.ForeignKey(Rule, on_delete=models.CASCADE, related_name='parameters')
    name = models.CharField(max_length=100)
    param_type = models.CharField(max_length=50) # string, int, decimal

    class Meta:
        db_table = 'nebras_rule_parameters'


# 9. Rule Template
class RuleTemplate(CombinedSharedModel):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_rule_templates'


# 10. Rule Schedule
class RuleSchedule(CombinedSharedModel):
    rule = models.ForeignKey(Rule, on_delete=models.CASCADE, related_name='schedules')
    cron_expression = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_rule_schedules'


# 11. Rule Approval
class RuleApproval(CombinedSharedModel):
    rule = models.ForeignKey(Rule, on_delete=models.CASCADE, related_name='approvals')
    approved_by = models.UUIDField(null=True, blank=True)
    status = models.CharField(max_length=30, default='pending')

    class Meta:
        db_table = 'nebras_rule_approvals'


# 12. Rule Execution (Main Log)
class RuleExecution(CombinedSharedModel):
    rule = models.ForeignKey(Rule, on_delete=models.CASCADE, related_name='executions')
    executed_at = models.DateTimeField(auto_now_add=True)
    success = models.BooleanField(default=True)
    result_data = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'nebras_rule_executions'


# 13. Rule Execution Log Detail
class RuleExecutionLog(CombinedSharedModel):
    execution = models.ForeignKey(RuleExecution, on_delete=models.CASCADE, related_name='logs')
    log_level = models.CharField(max_length=30, default='info')
    message = models.TextField()

    class Meta:
        db_table = 'nebras_rule_execution_logs'


# 14. Rule Priority Definition
class RulePriority(CombinedSharedModel):
    rule = models.OneToOneField(Rule, on_delete=models.CASCADE, related_name='priority_config')
    priority_level = models.IntegerField(default=1)

    class Meta:
        db_table = 'nebras_rule_priorities'


# 15. Rule Change History
class RuleHistory(CombinedSharedModel):
    rule = models.ForeignKey(Rule, on_delete=models.CASCADE, related_name='history')
    modified_by = models.UUIDField(null=True, blank=True)
    change_summary = models.TextField()

    class Meta:
        db_table = 'nebras_rule_history'


# 16. Rule Audit Log
class RuleAudit(CombinedSharedModel):
    rule_code = models.CharField(max_length=100)
    action_taken = models.CharField(max_length=100) # create, update, execute
    user_id = models.UUIDField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'nebras_rule_audits'