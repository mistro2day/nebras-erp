from django.db import models
from django.conf import settings
from apps.shared.domain.models import CombinedSharedModel

class ApprovalCategory(CombinedSharedModel):
    name_ar = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'nebras_apv_categories'


class EnterpriseInbox(CombinedSharedModel):
    user_id = models.UUIDField(unique=True, db_index=True)

    class Meta:
        db_table = 'nebras_apv_inboxes'


class InboxItem(CombinedSharedModel):
    inbox = models.ForeignKey(EnterpriseInbox, on_delete=models.CASCADE, related_name='items')
    item_type = models.CharField(max_length=50) # approval, assignment, notification
    item_id = models.UUIDField() # reference to target record
    title_ar = models.CharField(max_length=255)
    title_en = models.CharField(max_length=255)
    status = models.CharField(max_length=50, default='pending') # pending, read, archived
    is_starred = models.BooleanField(default=False)
    priority_code = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        db_table = 'nebras_apv_inbox_items'


class ApprovalRequest(CombinedSharedModel):
    workflow_instance_id = models.UUIDField(db_index=True, null=True, blank=True) # reference to Workflow engine instance
    category = models.ForeignKey(ApprovalCategory, on_delete=models.CASCADE)
    requester_id = models.UUIDField()
    status = models.CharField(max_length=50, default='pending') # pending, approved, rejected, returned
    payload = models.JSONField(default=dict)
    title_ar = models.CharField(max_length=255, blank=True, default='')
    title_en = models.CharField(max_length=255, blank=True, default='')
    priority = models.ForeignKey('ApprovalPriority', on_delete=models.SET_NULL, null=True, blank=True)
    current_step = models.ForeignKey('ApprovalStep', on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = 'nebras_apv_requests'


class ApprovalAction(CombinedSharedModel):
    name_ar = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True) # approve, reject, delegate

    class Meta:
        db_table = 'nebras_apv_actions'


class ApprovalDecision(CombinedSharedModel):
    request = models.ForeignKey(ApprovalRequest, on_delete=models.CASCADE, related_name='decisions')
    approver_id = models.UUIDField()
    action = models.ForeignKey(ApprovalAction, on_delete=models.CASCADE)
    decision_date = models.DateTimeField(auto_now_add=True)
    comments = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_apv_decisions'


class ApprovalHistory(CombinedSharedModel):
    request = models.ForeignKey(ApprovalRequest, on_delete=models.CASCADE)
    step_name = models.CharField(max_length=150)
    action_taken = models.CharField(max_length=100)
    user_id = models.UUIDField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'nebras_apv_history'


class ApprovalComment(CombinedSharedModel):
    request = models.ForeignKey(ApprovalRequest, on_delete=models.CASCADE, related_name='comments')
    user_id = models.UUIDField()
    comment = models.TextField()

    class Meta:
        db_table = 'nebras_apv_comments'


class ApprovalAttachment(CombinedSharedModel):
    request = models.ForeignKey(ApprovalRequest, on_delete=models.CASCADE, related_name='attachments')
    document_id = models.UUIDField() # Reference to Enterprise DMS Document

    class Meta:
        db_table = 'nebras_apv_attachments'


class ApprovalRule(CombinedSharedModel):
    category = models.ForeignKey(ApprovalCategory, on_delete=models.CASCADE)
    rule_code = models.CharField(max_length=100)
    expression = models.TextField()
    rule_id = models.UUIDField(null=True, blank=True) # reference to Rule Engine's Rule.id

    class Meta:
        db_table = 'nebras_apv_rules'


class ApprovalStep(CombinedSharedModel):
    category = models.ForeignKey(ApprovalCategory, on_delete=models.CASCADE)
    step_number = models.IntegerField(default=1)
    name = models.CharField(max_length=100)

    class Meta:
        db_table = 'nebras_apv_steps'


class ApprovalGroup(CombinedSharedModel):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'nebras_apv_groups'


class ApprovalQueue(CombinedSharedModel):
    name = models.CharField(max_length=100)
    group = models.ForeignKey(ApprovalGroup, on_delete=models.CASCADE)

    class Meta:
        db_table = 'nebras_apv_queues'


class ApprovalAssignment(CombinedSharedModel):
    request = models.ForeignKey(ApprovalRequest, on_delete=models.CASCADE)
    assigned_to = models.UUIDField()
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'nebras_apv_assignments'


class ApprovalEscalation(CombinedSharedModel):
    request = models.ForeignKey(ApprovalRequest, on_delete=models.CASCADE)
    original_approver_id = models.UUIDField()
    escalated_to_id = models.UUIDField()
    escalated_at = models.DateTimeField(auto_now_add=True)
    escalation_level = models.IntegerField(default=1)
    reason = models.TextField(blank=True, null=True)
    resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_apv_escalations'


class ApprovalDelegation(CombinedSharedModel):
    user_id = models.UUIDField()
    delegate_to_id = models.UUIDField()
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    category = models.ForeignKey(ApprovalCategory, on_delete=models.CASCADE, null=True, blank=True)
    department_id = models.UUIDField(null=True, blank=True)
    reason = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_apv_delegations'


class ApprovalReminder(CombinedSharedModel):
    request = models.ForeignKey(ApprovalRequest, on_delete=models.CASCADE)
    remind_at = models.DateTimeField()
    message = models.TextField()
    is_sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_apv_reminders'


class ApprovalPriority(CombinedSharedModel):
    name = models.CharField(max_length=50) # Low, Medium, High, Urgent
    code = models.CharField(max_length=20, unique=True)

    class Meta:
        db_table = 'nebras_apv_priorities'


class ApprovalTemplate(CombinedSharedModel):
    category = models.ForeignKey(ApprovalCategory, on_delete=models.CASCADE)
    template_json = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_apv_templates'


class ApprovalConfiguration(CombinedSharedModel):
    key = models.CharField(max_length=100, unique=True)
    value = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_apv_config'


class ApprovalAudit(CombinedSharedModel):
    user_id = models.UUIDField(null=True, blank=True)
    action = models.CharField(max_length=150)
    details = models.TextField()

    class Meta:
        db_table = 'nebras_apv_audit'


class ApprovalNotification(CombinedSharedModel):
    user_id = models.UUIDField()
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    request = models.ForeignKey(ApprovalRequest, on_delete=models.CASCADE, null=True, blank=True)
    link = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = 'nebras_apv_notifications'


class ApprovalStatistics(CombinedSharedModel):
    total_processed = models.BigIntegerField(default=0)
    avg_decision_seconds = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_apv_statistics'


class ApprovalDashboard(CombinedSharedModel):
    user_id = models.UUIDField()
    config_json = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_apv_dashboards'


class SLAConfiguration(CombinedSharedModel):
    category = models.ForeignKey(ApprovalCategory, on_delete=models.CASCADE)
    limit_hours = models.IntegerField(default=24)

    class Meta:
        db_table = 'nebras_apv_sla_config'


class SLATracking(CombinedSharedModel):
    request = models.ForeignKey(ApprovalRequest, on_delete=models.CASCADE)
    due_at = models.DateTimeField()
    is_violated = models.BooleanField(default=False)
    warning_at = models.DateTimeField(null=True, blank=True)
    violated_at = models.DateTimeField(null=True, blank=True)
    business_hours_only = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_apv_sla_tracking'


class ApprovalDeadline(CombinedSharedModel):
    request = models.ForeignKey(ApprovalRequest, on_delete=models.CASCADE)
    deadline_at = models.DateTimeField()

    class Meta:
        db_table = 'nebras_apv_deadlines'


class ApprovalOutcome(CombinedSharedModel):
    request = models.OneToOneField(ApprovalRequest, on_delete=models.CASCADE)
    outcome_code = models.CharField(max_length=50) # approved, rejected
    decided_by = models.UUIDField(null=True, blank=True)
    decided_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_apv_outcomes'
