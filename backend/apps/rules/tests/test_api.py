from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.rules.domain.models import Rule, RuleCategory
import uuid

User = get_user_model()


class RuleEngineAPITests(TestCase):
    """
    اختبارات واجهات REST API لمحرك القواعد
    """

    def setUp(self):
        self.client = APIClient()
        self.tenant_id = uuid.uuid4()
        
        # إنشاء مستخدم
        self.user = User.objects.create_user(
            email='rules_api_test@nebras.com',
            password='testpassword123',
            first_name='مدير',
            last_name='قواعد'
        )
        self.client.force_authenticate(user=self.user)

        # إنشاء تصنيف وقاعدة
        self.category = RuleCategory.objects.create(
            tenant_id=self.tenant_id,
            name='المالية والرواتب',
            code='FINANCE_PAYROLL'
        )
        self.rule = Rule.objects.create(
            tenant_id=self.tenant_id,
            name='قاعدة خصم التأخير',
            code='RULE_LATE_DEDUCTION',
            category=self.category
        )

    def test_list_rules(self):
        response = self.client.get('/api/v1/rules/rules/')
        self.assertIn(response.status_code, [200, 403])

    def test_simulate_rule_endpoint(self):
        payload = {
            'variables': {
                'late_minutes': 45
            }
        }
        response = self.client.post(
            f'/api/v1/rules/rules/{self.rule.id}/simulate/',
            data=payload,
            format='json'
        )
        self.assertIn(response.status_code, [200, 403])