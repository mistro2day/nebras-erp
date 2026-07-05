import uuid
from django.test import TestCase
from django.utils import timezone

from apps.approval_center.domain.models import (
    ApprovalCategory, ApprovalRequest, ApprovalDelegation, ApprovalEscalation,
    SLATracking, ApprovalRule, InboxItem, EnterpriseInbox, ApprovalOutcome, ApprovalReminder,
    ApprovalNotification,
)


class ApprovalCenterModelDefaultsTests(TestCase):
    """اختبارات القيم الافتراضية والحقول المضافة على النماذج التسعة المُنقَّحة."""

    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.category = ApprovalCategory.objects.create(
            tenant_id=self.tenant_id, name_ar='إجازة', name_en='Leave', code='LEAVE'
        )

    def test_approval_request_new_fields_default(self):
        req = ApprovalRequest.objects.create(
            tenant_id=self.tenant_id, category=self.category, requester_id=uuid.uuid4(),
        )
        self.assertEqual(req.title_ar, '')
        self.assertEqual(req.title_en, '')
        self.assertIsNone(req.priority_id)
        self.assertIsNone(req.current_step_id)
        self.assertIsNone(req.workflow_instance_id)

    def test_delegation_scope_fields(self):
        delegation = ApprovalDelegation.objects.create(
            tenant_id=self.tenant_id, user_id=uuid.uuid4(), delegate_to_id=uuid.uuid4(),
            start_date=timezone.now(), end_date=timezone.now(), category=self.category,
        )
        self.assertTrue(delegation.is_active)
        self.assertIsNone(delegation.department_id)

    def test_escalation_defaults(self):
        req = ApprovalRequest.objects.create(
            tenant_id=self.tenant_id, category=self.category, requester_id=uuid.uuid4(),
        )
        escalation = ApprovalEscalation.objects.create(
            tenant_id=self.tenant_id, request=req, original_approver_id=uuid.uuid4(),
            escalated_to_id=uuid.uuid4(),
        )
        self.assertEqual(escalation.escalation_level, 1)
        self.assertFalse(escalation.resolved)

    def test_sla_tracking_defaults(self):
        req = ApprovalRequest.objects.create(
            tenant_id=self.tenant_id, category=self.category, requester_id=uuid.uuid4(),
        )
        tracking = SLATracking.objects.create(
            tenant_id=self.tenant_id, request=req, due_at=timezone.now(),
        )
        self.assertFalse(tracking.is_violated)
        self.assertFalse(tracking.business_hours_only)
        self.assertIsNone(tracking.violated_at)

    def test_rule_id_field(self):
        rule = ApprovalRule.objects.create(
            tenant_id=self.tenant_id, category=self.category, rule_code='r1', expression='',
        )
        self.assertIsNone(rule.rule_id)
        rule.rule_id = uuid.uuid4()
        rule.save()
        rule.refresh_from_db()
        self.assertIsNotNone(rule.rule_id)

    def test_inbox_item_priority_code(self):
        inbox = EnterpriseInbox.objects.create(tenant_id=self.tenant_id, user_id=uuid.uuid4())
        item = InboxItem.objects.create(
            tenant_id=self.tenant_id, inbox=inbox, item_type='approval', item_id=uuid.uuid4(),
            title_ar='x', title_en='x',
        )
        self.assertIsNone(item.priority_code)

    def test_outcome_decided_fields(self):
        req = ApprovalRequest.objects.create(
            tenant_id=self.tenant_id, category=self.category, requester_id=uuid.uuid4(),
        )
        outcome = ApprovalOutcome.objects.create(tenant_id=self.tenant_id, request=req, outcome_code='approved')
        self.assertIsNone(outcome.decided_by)
        self.assertIsNone(outcome.decided_at)

    def test_reminder_sent_fields(self):
        req = ApprovalRequest.objects.create(
            tenant_id=self.tenant_id, category=self.category, requester_id=uuid.uuid4(),
        )
        reminder = ApprovalReminder.objects.create(
            tenant_id=self.tenant_id, request=req, remind_at=timezone.now(), message='x',
        )
        self.assertFalse(reminder.is_sent)
        self.assertIsNone(reminder.sent_at)

    def test_notification_request_link_fields(self):
        notification = ApprovalNotification.objects.create(
            tenant_id=self.tenant_id, user_id=uuid.uuid4(), message='x',
        )
        self.assertIsNone(notification.request_id)
        self.assertIsNone(notification.link)
