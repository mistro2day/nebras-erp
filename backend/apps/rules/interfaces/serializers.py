from rest_framework import serializers
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

class RuleCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = RuleCategory
        fields = '__all__'


class RuleGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = RuleGroup
        fields = '__all__'


class RuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rule
        fields = '__all__'


class RuleVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RuleVersion
        fields = '__all__'


class RuleVariableSerializer(serializers.ModelSerializer):
    class Meta:
        model = RuleVariable
        fields = '__all__'


class RuleConditionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RuleCondition
        fields = '__all__'


class RuleActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RuleAction
        fields = '__all__'


class RuleParameterSerializer(serializers.ModelSerializer):
    class Meta:
        model = RuleParameter
        fields = '__all__'


class RuleTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RuleTemplate
        fields = '__all__'


class RuleScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = RuleSchedule
        fields = '__all__'


class RuleApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = RuleApproval
        fields = '__all__'


class RuleExecutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RuleExecution
        fields = '__all__'


class RuleExecutionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = RuleExecutionLog
        fields = '__all__'


class RulePrioritySerializer(serializers.ModelSerializer):
    class Meta:
        model = RulePriority
        fields = '__all__'


class RuleHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = RuleHistory
        fields = '__all__'


class RuleAuditSerializer(serializers.ModelSerializer):
    class Meta:
        model = RuleAudit
        fields = '__all__'