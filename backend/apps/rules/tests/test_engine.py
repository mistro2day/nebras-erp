from django.test import TestCase
from apps.rules.domain.models import Rule, RuleCategory, RuleGroup, RuleVariable, RuleCondition, RuleAction
from apps.rules.application.services import RuleEvaluationService, RuleSandboxService
import uuid


class RuleEngineEvaluationTests(TestCase):
    """
    اختبارات محرك القواعد الموحد وتقييم الشروط (Rule Engine Expression Tests)
    """

    def setUp(self):
        self.tenant_id = uuid.uuid4()
        
        # إنشاء التصنيف
        self.category = RuleCategory.objects.create(
            tenant_id=self.tenant_id,
            name='القبول والتسجيل',
            code='ADMISSIONS'
        )
        
        # إنشاء المجموعة
        self.group = RuleGroup.objects.create(
            tenant_id=self.tenant_id,
            name='قواعد فرز الطلاب',
            code='STUDENT_FILTER',
            category=self.category
        )
        
        # إنشاء قاعدة
        self.rule = Rule.objects.create(
            tenant_id=self.tenant_id,
            name='شرط القبول - معدل الثانوية',
            code='RULE_ADMIT_GPA',
            category=self.category,
            group=self.group,
            priority=1,
            is_enabled=True
        )

        # إنشاء متغير القاعدة
        self.variable = RuleVariable.objects.create(
            tenant_id=self.tenant_id,
            name='معدل الطالب',
            code='student_gpa',
            data_type='number'
        )

        # ربط الشرط بالقاعدة (معدل الطالب >= 85)
        self.condition = RuleCondition.objects.create(
            tenant_id=self.tenant_id,
            rule=self.rule,
            variable=self.variable,
            operator='greater_or_equal',
            value_to_compare='85',
            logical_gate='AND'
        )

        # ربط الفعل بالقاعدة (السماح بالقبول)
        self.action = RuleAction.objects.create(
            tenant_id=self.tenant_id,
            rule=self.rule,
            action_type='allow',
            configuration={'message': 'تم قبول الطالب بناءً على المعدل المرتفع.'}
        )

    def test_evaluate_rule_matched(self):
        """تقييم قاعدة متطابقة الشروط"""
        context = {'student_gpa': 92.5}
        result = RuleEvaluationService.evaluate_rule(rule_id=self.rule.id, context_data=context)
        self.assertTrue(result['is_matched'])
        self.assertEqual(len(result['actions']), 1)
        self.assertEqual(result['actions'][0]['action_type'], 'allow')

    def test_evaluate_rule_not_matched(self):
        """تقييم قاعدة غير متطابقة الشروط"""
        context = {'student_gpa': 75.0}
        result = RuleEvaluationService.evaluate_rule(rule_id=self.rule.id, context_data=context)
        self.assertFalse(result['is_matched'])
        self.assertEqual(len(result['actions']), 0)

    def test_simulate_rule_sandbox(self):
        """محاكاة القاعدة مع تتبع الخطوات بدون تعديل البيانات"""
        mock_data = {'student_gpa': 90.0}
        result = RuleSandboxService.simulate_rule(rule_id=self.rule.id, mock_variables=mock_data)
        self.assertTrue(result['simulation_success'])
        self.assertTrue(result['is_matched'])
        self.assertEqual(len(result['execution_trace']), 1)
        self.assertEqual(result['execution_trace'][0]['result'], True)