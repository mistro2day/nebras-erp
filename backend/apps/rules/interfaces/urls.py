from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.rules.interfaces.views import (
    RuleCategoryViewSet,
    RuleGroupViewSet,
    RuleViewSet,
    RuleVersionViewSet,
    RuleVariableViewSet,
    RuleConditionViewSet,
    RuleActionViewSet,
    RuleParameterViewSet,
    RuleTemplateViewSet,
    RuleScheduleViewSet,
    RuleApprovalViewSet,
    RuleExecutionViewSet,
    RuleExecutionLogViewSet,
    RulePriorityViewSet,
    RuleHistoryViewSet,
    RuleAuditViewSet
)

router = DefaultRouter()
router.register('categories', RuleCategoryViewSet, basename='category')
router.register('groups', RuleGroupViewSet, basename='group')
router.register('rules', RuleViewSet, basename='rule')
router.register('versions', RuleVersionViewSet, basename='version')
router.register('variables', RuleVariableViewSet, basename='variable')
router.register('conditions', RuleConditionViewSet, basename='condition')
router.register('actions', RuleActionViewSet, basename='action')
router.register('parameters', RuleParameterViewSet, basename='parameter')
router.register('templates', RuleTemplateViewSet, basename='template')
router.register('schedules', RuleScheduleViewSet, basename='schedule')
router.register('approvals', RuleApprovalViewSet, basename='approval')
router.register('executions', RuleExecutionViewSet, basename='execution')
router.register('logs', RuleExecutionLogViewSet, basename='log')
router.register('priorities', RulePriorityViewSet, basename='priority')
router.register('histories', RuleHistoryViewSet, basename='history')
router.register('audits', RuleAuditViewSet, basename='audit')

urlpatterns = [
    path('', include(router.urls)),
]