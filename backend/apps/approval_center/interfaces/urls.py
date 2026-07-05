from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.approval_center.interfaces.views import (
    EnterpriseInboxViewSet, InboxItemViewSet, ApprovalRequestViewSet, ApprovalHistoryViewSet,
    ApprovalCategoryViewSet, ApprovalActionViewSet, ApprovalPriorityViewSet, ApprovalGroupViewSet,
    ApprovalQueueViewSet, ApprovalStepViewSet, ApprovalRuleViewSet, ApprovalTemplateViewSet,
    ApprovalConfigurationViewSet, SLAConfigurationViewSet, ApprovalDecisionViewSet,
    ApprovalCommentViewSet, ApprovalAttachmentViewSet, ApprovalAssignmentViewSet, ApprovalOutcomeViewSet,
    ApprovalDelegationViewSet, ApprovalEscalationViewSet, SLATrackingViewSet, ApprovalDeadlineViewSet,
    ApprovalReminderViewSet, ApprovalAuditViewSet, ApprovalNotificationViewSet, ApprovalStatisticsViewSet,
    ApprovalDashboardViewSet,
)

router = DefaultRouter()
# صندوق الوارد ودورة حياة الطلب (المسارات الأصلية — لا يتم تغيير مكانها للحفاظ على التوافق الخلفي)
router.register('inbox', InboxItemViewSet, basename='inbox')
router.register('requests', ApprovalRequestViewSet, basename='request')
router.register('history', ApprovalHistoryViewSet, basename='history')

# التصنيف والتهيئة
router.register('categories', ApprovalCategoryViewSet, basename='category')
router.register('actions', ApprovalActionViewSet, basename='action')
router.register('priorities', ApprovalPriorityViewSet, basename='priority')
router.register('groups', ApprovalGroupViewSet, basename='group')
router.register('queues', ApprovalQueueViewSet, basename='queue')
router.register('steps', ApprovalStepViewSet, basename='step')
router.register('approval-rules', ApprovalRuleViewSet, basename='approval-rule')
router.register('templates', ApprovalTemplateViewSet, basename='template')
router.register('configurations', ApprovalConfigurationViewSet, basename='configuration')
router.register('sla-configurations', SLAConfigurationViewSet, basename='sla-configuration')

# صندوق الوارد الموحد (الحاوية)
router.register('inbox-containers', EnterpriseInboxViewSet, basename='inbox-container')

# دورة حياة الطلب (تفاصيل)
router.register('decisions', ApprovalDecisionViewSet, basename='decision')
router.register('comments', ApprovalCommentViewSet, basename='comment')
router.register('attachments', ApprovalAttachmentViewSet, basename='attachment')
router.register('assignments', ApprovalAssignmentViewSet, basename='assignment')
router.register('outcomes', ApprovalOutcomeViewSet, basename='outcome')

# التفويض والتصعيد
router.register('delegations', ApprovalDelegationViewSet, basename='delegation')
router.register('escalations', ApprovalEscalationViewSet, basename='escalation')

# اتفاقية مستوى الخدمة
router.register('sla-tracking', SLATrackingViewSet, basename='sla-tracking')
router.register('deadlines', ApprovalDeadlineViewSet, basename='deadline')
router.register('reminders', ApprovalReminderViewSet, basename='reminder')

# الإشعارات والتدقيق والتحليلات
router.register('audit', ApprovalAuditViewSet, basename='audit')
router.register('notifications', ApprovalNotificationViewSet, basename='notification')
router.register('statistics', ApprovalStatisticsViewSet, basename='statistics')
router.register('dashboards', ApprovalDashboardViewSet, basename='dashboard')

urlpatterns = [
    path('', include(router.urls)),
]
