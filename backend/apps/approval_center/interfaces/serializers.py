from rest_framework import serializers
from apps.approval_center.domain.models import (
    ApprovalCategory, EnterpriseInbox, InboxItem, ApprovalRequest, ApprovalAction,
    ApprovalDecision, ApprovalHistory, ApprovalComment, ApprovalAttachment, ApprovalRule,
    ApprovalStep, ApprovalGroup, ApprovalQueue, ApprovalAssignment, ApprovalEscalation,
    ApprovalDelegation, ApprovalReminder, ApprovalPriority, ApprovalTemplate,
    ApprovalConfiguration, ApprovalAudit, ApprovalNotification, ApprovalStatistics,
    ApprovalDashboard, SLAConfiguration, SLATracking, ApprovalDeadline, ApprovalOutcome
)


# ============================================================
# التصنيف والتهيئة — Taxonomy & Configuration
# ============================================================
class ApprovalCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalCategory
        fields = ['id', 'name_ar', 'name_en', 'code', 'created_at']


class ApprovalActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalAction
        fields = ['id', 'name_ar', 'name_en', 'code', 'created_at']


class ApprovalPrioritySerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalPriority
        fields = ['id', 'name', 'code', 'created_at']


class ApprovalGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalGroup
        fields = ['id', 'name', 'code', 'created_at']


class ApprovalQueueSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalQueue
        fields = ['id', 'name', 'group', 'created_at']


class ApprovalStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalStep
        fields = ['id', 'category', 'step_number', 'name', 'created_at']


class ApprovalRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalRule
        fields = ['id', 'category', 'rule_code', 'expression', 'rule_id', 'created_at']


class ApprovalTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalTemplate
        fields = ['id', 'category', 'template_json', 'created_at']


class ApprovalConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalConfiguration
        fields = ['id', 'key', 'value', 'created_at']


class SLAConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SLAConfiguration
        fields = ['id', 'category', 'limit_hours', 'created_at']


# ============================================================
# صندوق الوارد الموحد — Enterprise Inbox
# ============================================================
class EnterpriseInboxSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnterpriseInbox
        fields = ['id', 'user_id', 'created_at']


class InboxItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InboxItem
        fields = ['id', 'inbox', 'item_type', 'item_id', 'title_ar', 'title_en',
                  'status', 'is_starred', 'priority_code', 'created_at']


# ============================================================
# دورة حياة طلب الاعتماد — Lifecycle
# ============================================================
class ApprovalRequestSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    priority_code = serializers.SerializerMethodField()

    class Meta:
        model = ApprovalRequest
        fields = ['id', 'workflow_instance_id', 'category', 'category_name', 'requester_id',
                  'status', 'payload', 'title_ar', 'title_en', 'priority', 'priority_code',
                  'current_step', 'created_at']

    def get_category_name(self, obj):
        return obj.category.name_ar if obj.category_id else None

    def get_priority_code(self, obj):
        return obj.priority.code if obj.priority_id else None


class ApprovalDecisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalDecision
        fields = ['id', 'request', 'approver_id', 'action', 'decision_date', 'comments']


class ApprovalHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalHistory
        fields = ['id', 'request', 'step_name', 'action_taken', 'user_id', 'timestamp']


class ApprovalCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalComment
        fields = ['id', 'request', 'user_id', 'comment', 'created_at']


class ApprovalAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalAttachment
        fields = ['id', 'request', 'document_id', 'created_at']


class ApprovalAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalAssignment
        fields = ['id', 'request', 'assigned_to', 'assigned_at']


class ApprovalOutcomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalOutcome
        fields = ['id', 'request', 'outcome_code', 'decided_by', 'decided_at']


# ============================================================
# التفويض والتصعيد — Delegation & Escalation
# ============================================================
class ApprovalDelegationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalDelegation
        fields = ['id', 'user_id', 'delegate_to_id', 'start_date', 'end_date', 'is_active',
                  'category', 'department_id', 'reason', 'created_at']


class ApprovalEscalationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalEscalation
        fields = ['id', 'request', 'original_approver_id', 'escalated_to_id', 'escalated_at',
                  'escalation_level', 'reason', 'resolved', 'resolved_at']


# ============================================================
# اتفاقية مستوى الخدمة — SLA
# ============================================================
class SLATrackingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SLATracking
        fields = ['id', 'request', 'due_at', 'is_violated', 'warning_at', 'violated_at',
                  'business_hours_only', 'created_at']


class ApprovalDeadlineSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalDeadline
        fields = ['id', 'request', 'deadline_at']


class ApprovalReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalReminder
        fields = ['id', 'request', 'remind_at', 'message', 'is_sent', 'sent_at']


# ============================================================
# الإشعارات والتدقيق والتحليلات — Notifications, Audit & Analytics
# ============================================================
class ApprovalNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalNotification
        fields = ['id', 'user_id', 'message', 'is_read', 'request', 'link', 'created_at']


class ApprovalAuditSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalAudit
        fields = ['id', 'user_id', 'action', 'details', 'created_at']


class ApprovalStatisticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalStatistics
        fields = ['id', 'total_processed', 'avg_decision_seconds', 'created_at']


class ApprovalDashboardSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalDashboard
        fields = ['id', 'user_id', 'config_json', 'created_at']
