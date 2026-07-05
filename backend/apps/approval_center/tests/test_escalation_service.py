import uuid
from django.test import TestCase
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from datetime import timedelta

from apps.tenants.context import set_current_tenant_id, clear_current_tenant
from apps.approval_center.domain.models import ApprovalCategory, SLATracking, ApprovalEscalation
from apps.approval_center.application.services import ApprovalRequestService, ApprovalEscalationService


class ApprovalEscalationServiceTests(TestCase):
    def setUp(self):
        ContentType.objects.clear_cache()
        self.tenant_id = uuid.uuid4()
        set_current_tenant_id(self.tenant_id)
        self.category = ApprovalCategory.objects.create(
            tenant_id=self.tenant_id, name_ar='إجازة', name_en='Leave', code='LEAVE'
        )
        self.req = ApprovalRequestService.create_request(
            tenant_id=self.tenant_id, category_id=self.category.id, requester_id=uuid.uuid4(),
        )

    def tearDown(self):
        clear_current_tenant()

    def test_escalate_request_increments_level(self):
        first = ApprovalEscalationService.escalate_request(
            self.tenant_id, self.req.id, uuid.uuid4(), uuid.uuid4(), reason='لا استجابة',
        )
        self.assertEqual(first.escalation_level, 1)

        first.resolved = True
        first.save(update_fields=['resolved'])

        second = ApprovalEscalationService.escalate_request(
            self.tenant_id, self.req.id, uuid.uuid4(), uuid.uuid4(), reason='لا استجابة مجدداً',
        )
        self.assertEqual(second.escalation_level, 2)

    def test_resolve_escalation(self):
        escalation = ApprovalEscalationService.escalate_request(
            self.tenant_id, self.req.id, uuid.uuid4(), uuid.uuid4(),
        )
        resolved = ApprovalEscalationService.resolve_escalation(self.tenant_id, escalation.id, uuid.uuid4())
        self.assertTrue(resolved.resolved)
        self.assertIsNotNone(resolved.resolved_at)

    def test_auto_escalate_overdue_creates_escalation(self):
        SLATracking.objects.create(
            tenant_id=self.tenant_id, request=self.req, due_at=timezone.now() - timedelta(hours=2),
            is_violated=True, violated_at=timezone.now(),
        )
        count = ApprovalEscalationService.auto_escalate_overdue(self.tenant_id)
        self.assertEqual(count, 1)
        self.assertTrue(ApprovalEscalation.objects.filter(tenant_id=self.tenant_id, request=self.req).exists())

    def test_auto_escalate_overdue_skips_already_escalated(self):
        SLATracking.objects.create(
            tenant_id=self.tenant_id, request=self.req, due_at=timezone.now() - timedelta(hours=2),
            is_violated=True, violated_at=timezone.now(),
        )
        ApprovalEscalationService.auto_escalate_overdue(self.tenant_id)
        second_pass_count = ApprovalEscalationService.auto_escalate_overdue(self.tenant_id)
        self.assertEqual(second_pass_count, 0)
