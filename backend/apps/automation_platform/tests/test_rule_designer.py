import uuid
from django.test import TestCase

from apps.automation_platform.domain.models import DecisionTable, DecisionTableRule
from apps.automation_platform.application.services import RuleDesignerService

TENANT = uuid.uuid4()


class RuleDesignerTests(TestCase):
    def _table(self, hit_policy='first'):
        t = DecisionTable.objects.create(
            tenant_id=TENANT, name='خصم رسوم', code='FEE_DISCOUNT', hit_policy=hit_policy,
            inputs=[{'name': 'gpa'}], outputs=[{'name': 'discount'}],
        )
        DecisionTableRule.objects.create(
            tenant_id=TENANT, table=t, row_order=1, priority=10,
            conditions={'gpa': {'op': 'gte', 'value': 90}}, results={'discount': 50},
        )
        DecisionTableRule.objects.create(
            tenant_id=TENANT, table=t, row_order=2, priority=20,
            conditions={'gpa': {'op': 'gte', 'value': 80}}, results={'discount': 25},
        )
        return t

    def test_first_hit_policy(self):
        t = self._table('first')
        result = RuleDesignerService.evaluate_decision_table(t, {'gpa': 95})
        self.assertTrue(result['matched'])
        self.assertEqual(result['results'][0]['discount'], 50)

    def test_no_match(self):
        t = self._table('first')
        result = RuleDesignerService.evaluate_decision_table(t, {'gpa': 50})
        self.assertFalse(result['matched'])

    def test_collect_hit_policy(self):
        t = self._table('collect')
        result = RuleDesignerService.evaluate_decision_table(t, {'gpa': 95})
        self.assertEqual(len(result['results']), 2)

    def test_simulate_persists(self):
        t = self._table()
        sim = RuleDesignerService.simulate('decision_table', t.id, {'gpa': 95})
        self.assertEqual(sim.target_type, 'decision_table')
        self.assertTrue(sim.result['matched'])

    def test_publish_creates_rule(self):
        from apps.rules.domain.models import Rule
        t = self._table()
        result = RuleDesignerService.publish_decision_table(t, user_id=uuid.uuid4())
        self.assertTrue(result['published'])
        t.refresh_from_db()
        self.assertIsNotNone(t.linked_rule_id)
        self.assertTrue(Rule.objects.filter(id=t.linked_rule_id).exists())
