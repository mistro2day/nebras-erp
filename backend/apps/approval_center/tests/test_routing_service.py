import uuid
from django.test import TestCase
from django.contrib.contenttypes.models import ContentType

from apps.tenants.context import set_current_tenant_id, clear_current_tenant
from apps.approval_center.domain.models import ApprovalCategory, ApprovalRule
from apps.approval_center.application.services import ApprovalRequestService
from apps.rules.domain.models import RuleCategory, Rule, RuleVariable, RuleCondition, RuleAction


class ApprovalRoutingServiceTests(TestCase):
    """اختبارات التوجيه الآلي لطلبات الاعتماد عبر محرك القواعد المركزي."""

    def setUp(self):
        # انظر التعليق في test_lifecycle_service.py لسبب تصفير كاش ContentType هنا
        ContentType.objects.clear_cache()
        self.tenant_id = uuid.uuid4()
        set_current_tenant_id(self.tenant_id)
        self.category = ApprovalCategory.objects.create(
            tenant_id=self.tenant_id, name_ar='مشتريات', name_en='Purchase', code='PURCHASE'
        )

        rule_category = RuleCategory.objects.create(tenant_id=self.tenant_id, name='اعتماد', code='APV_TEST')
        self.rule = Rule.objects.create(
            tenant_id=self.tenant_id, name='اعتماد آلي', code='APV_TEST_AUTO', category=rule_category,
            priority=1, is_enabled=True,
        )
        variable = RuleVariable.objects.create(tenant_id=self.tenant_id, name='amount', code='amount', data_type='number')
        RuleCondition.objects.create(
            tenant_id=self.tenant_id, rule=self.rule, variable=variable,
            operator='less_or_equal', value_to_compare='1000',
        )
        RuleAction.objects.create(tenant_id=self.tenant_id, rule=self.rule, action_type='allow')

        ApprovalRule.objects.create(
            tenant_id=self.tenant_id, category=self.category, rule_code='auto', expression='',
            rule_id=self.rule.id,
        )

    def tearDown(self):
        clear_current_tenant()

    def test_low_value_request_is_auto_approved(self):
        req = ApprovalRequestService.create_request(
            tenant_id=self.tenant_id, category_id=self.category.id, requester_id=uuid.uuid4(),
            payload={'amount': 500},
        )
        req.refresh_from_db()
        self.assertEqual(req.status, 'approved')

    def test_high_value_request_stays_pending(self):
        req = ApprovalRequestService.create_request(
            tenant_id=self.tenant_id, category_id=self.category.id, requester_id=uuid.uuid4(),
            payload={'amount': 5000},
        )
        req.refresh_from_db()
        self.assertEqual(req.status, 'pending')
