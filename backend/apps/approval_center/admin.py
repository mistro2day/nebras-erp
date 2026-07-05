from django.contrib import admin
from apps.approval_center.domain.models import (
    ApprovalCategory,
    EnterpriseInbox,
    InboxItem,
    ApprovalRequest,
    ApprovalAction,
    ApprovalDecision,
    ApprovalHistory,
    ApprovalComment,
    ApprovalAttachment,
    ApprovalRule,
    ApprovalStep,
    ApprovalGroup,
    ApprovalQueue,
    ApprovalAssignment,
    ApprovalEscalation,
    ApprovalDelegation,
    ApprovalReminder,
    ApprovalPriority,
    ApprovalTemplate,
    ApprovalConfiguration,
    ApprovalAudit,
    ApprovalNotification,
    ApprovalStatistics,
    ApprovalDashboard,
    SLAConfiguration,
    SLATracking,
    ApprovalDeadline,
    ApprovalOutcome,
)


class ApprovalDecisionInline(admin.TabularInline):
    model = ApprovalDecision
    extra = 0


class ApprovalHistoryInline(admin.TabularInline):
    model = ApprovalHistory
    extra = 0


@admin.register(ApprovalRequest)
class ApprovalRequestAdmin(admin.ModelAdmin):
    list_display = ('title_ar', 'category', 'requester_id', 'status', 'priority', 'current_step', 'tenant_id')
    list_filter = ('status', 'category', 'priority')
    search_fields = ('title_ar', 'title_en', 'requester_id')
    inlines = [ApprovalDecisionInline, ApprovalHistoryInline]


@admin.register(ApprovalCategory)
class ApprovalCategoryAdmin(admin.ModelAdmin):
    list_display = ('name_ar', 'name_en', 'code', 'tenant_id')
    search_fields = ('name_ar', 'name_en', 'code')


@admin.register(InboxItem)
class InboxItemAdmin(admin.ModelAdmin):
    list_display = ('inbox', 'item_type', 'title_ar', 'status', 'priority_code', 'is_starred')
    list_filter = ('item_type', 'status', 'priority_code')
    search_fields = ('title_ar', 'title_en')


@admin.register(ApprovalEscalation)
class ApprovalEscalationAdmin(admin.ModelAdmin):
    list_display = ('request', 'escalated_to_id', 'escalation_level', 'resolved', 'escalated_at')
    list_filter = ('resolved', 'escalation_level')


@admin.register(ApprovalDelegation)
class ApprovalDelegationAdmin(admin.ModelAdmin):
    list_display = ('user_id', 'delegate_to_id', 'start_date', 'end_date', 'is_active')
    list_filter = ('is_active',)


@admin.register(SLATracking)
class SLATrackingAdmin(admin.ModelAdmin):
    list_display = ('request', 'due_at', 'is_violated', 'warning_at', 'violated_at')
    list_filter = ('is_violated', 'business_hours_only')


@admin.register(ApprovalAudit)
class ApprovalAuditAdmin(admin.ModelAdmin):
    list_display = ('user_id', 'action', 'tenant_id', 'created_at')
    search_fields = ('action',)
    ordering = ('-created_at',)


# تسجيل بقية النماذج بشكل افتراضي لتسهيل الإدارة
admin.site.register(EnterpriseInbox)
admin.site.register(ApprovalAction)
admin.site.register(ApprovalComment)
admin.site.register(ApprovalAttachment)
admin.site.register(ApprovalRule)
admin.site.register(ApprovalStep)
admin.site.register(ApprovalGroup)
admin.site.register(ApprovalQueue)
admin.site.register(ApprovalAssignment)
admin.site.register(ApprovalReminder)
admin.site.register(ApprovalPriority)
admin.site.register(ApprovalTemplate)
admin.site.register(ApprovalConfiguration)
admin.site.register(ApprovalNotification)
admin.site.register(ApprovalStatistics)
admin.site.register(ApprovalDashboard)
admin.site.register(SLAConfiguration)
admin.site.register(ApprovalDeadline)
admin.site.register(ApprovalOutcome)
