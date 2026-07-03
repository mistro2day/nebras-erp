from rest_framework import viewsets, status
from rest_framework.decorators import action
from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.common.responses import StandardResponse

from apps.rules.domain.models import (
    RuleCategory,
    RuleGroup,
    Rule,
    RuleVersion,
    RuleVariable,
    RuleCondition,
    RuleAction,
    RuleParameter,
    RuleTemplate,
    RuleSchedule,
    RuleApproval,
    RuleExecution,
    RuleExecutionLog,
    RulePriority,
    RuleHistory,
    RuleAudit
)
from apps.rules.interfaces.serializers import (
    RuleCategorySerializer,
    RuleGroupSerializer,
    RuleSerializer,
    RuleVersionSerializer,
    RuleVariableSerializer,
    RuleConditionSerializer,
    RuleActionSerializer,
    RuleParameterSerializer,
    RuleTemplateSerializer,
    RuleScheduleSerializer,
    RuleApprovalSerializer,
    RuleExecutionSerializer,
    RuleExecutionLogSerializer,
    RulePrioritySerializer,
    RuleHistorySerializer,
    RuleAuditSerializer
)
from apps.rules.application.services import RuleEvaluationService, RuleSandboxService


class RuleCategoryViewSet(BaseCRUDViewSet):
    model_class = RuleCategory
    serializer_class = RuleCategorySerializer


class RuleGroupViewSet(BaseCRUDViewSet):
    model_class = RuleGroup
    serializer_class = RuleGroupSerializer


class RuleViewSet(BaseCRUDViewSet):
    model_class = Rule
    serializer_class = RuleSerializer

    @action(detail=True, methods=['post'], url_path='evaluate')
    def evaluate(self, request, pk=None):
        """تقييم القاعدة مع معطيات فعلية"""
        context_data = request.data.get('context', {})
        result = RuleEvaluationService.evaluate_rule(rule_id=pk, context_data=context_data)
        return StandardResponse(data=result, message="تم تقييم شروط القاعدة بنجاح.")

    @action(detail=True, methods=['post'], url_path='simulate')
    def simulate(self, request, pk=None):
        """محاكاة القاعدة في البيئة المعزولة"""
        mock_variables = request.data.get('variables', {})
        result = RuleSandboxService.simulate_rule(rule_id=pk, mock_variables=mock_variables)
        return StandardResponse(data=result, message="تمت محاكاة القاعدة وتتبع خطوات التنفيذ بنجاح.")


class RuleVersionViewSet(BaseCRUDViewSet):
    model_class = RuleVersion
    serializer_class = RuleVersionSerializer


class RuleVariableViewSet(BaseCRUDViewSet):
    model_class = RuleVariable
    serializer_class = RuleVariableSerializer


class RuleConditionViewSet(BaseCRUDViewSet):
    model_class = RuleCondition
    serializer_class = RuleConditionSerializer


class RuleActionViewSet(BaseCRUDViewSet):
    model_class = RuleAction
    serializer_class = RuleActionSerializer


class RuleParameterViewSet(BaseCRUDViewSet):
    model_class = RuleParameter
    serializer_class = RuleParameterSerializer


class RuleTemplateViewSet(BaseCRUDViewSet):
    model_class = RuleTemplate
    serializer_class = RuleTemplateSerializer


class RuleScheduleViewSet(BaseCRUDViewSet):
    model_class = RuleSchedule
    serializer_class = RuleScheduleSerializer


class RuleApprovalViewSet(BaseCRUDViewSet):
    model_class = RuleApproval
    serializer_class = RuleApprovalSerializer


class RuleExecutionViewSet(BaseCRUDViewSet):
    model_class = RuleExecution
    serializer_class = RuleExecutionSerializer


class RuleExecutionLogViewSet(BaseCRUDViewSet):
    model_class = RuleExecutionLog
    serializer_class = RuleExecutionLogSerializer


class RulePriorityViewSet(BaseCRUDViewSet):
    model_class = RulePriority
    serializer_class = RulePrioritySerializer


class RuleHistoryViewSet(BaseCRUDViewSet):
    model_class = RuleHistory
    serializer_class = RuleHistorySerializer


class RuleAuditViewSet(BaseCRUDViewSet):
    model_class = RuleAudit
    serializer_class = RuleAuditSerializer