import uuid
from django.test import TestCase
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from datetime import timedelta

from apps.tenants.context import set_current_tenant_id, clear_current_tenant
from apps.approval_center.domain.models import ApprovalCategory, SLATracking, ApprovalReminder
from apps.approval_center.application.services import ApprovalRequestService, SLATrackingService


class SLATrackingServiceTests(TestCase):
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

    def test_compute_due_at_flat(self):
        started = timezone.now()
        due = SLATrackingService.compute_due_at(started, 24, business_hours_only=False)
        self.assertEqual(due, started + timedelta(hours=24))

    def test_compute_due_at_business_hours_stays_within_window(self):
        started = timezone.now().replace(hour=16, minute=0, second=0, microsecond=0)
        while started.weekday() >= 5:
            started += timedelta(days=1)
        due = SLATrackingService.compute_due_at(started, 4, business_hours_only=True)
        self.assertGreaterEqual(due.hour, 9)
        self.assertLessEqual(due.hour, 17)
        self.assertLess(due.weekday(), 5)

    def test_start_tracking_creates_row_with_warning_before_due(self):
        tracking = SLATrackingService.start_tracking(self.tenant_id, self.req, 24)
        self.assertLess(tracking.warning_at, tracking.due_at)
        self.assertFalse(tracking.is_violated)

    def test_check_overdue_flags_violation(self):
        SLATracking.objects.create(
            tenant_id=self.tenant_id, request=self.req, due_at=timezone.now() - timedelta(hours=1),
        )
        count = SLATrackingService.check_overdue(self.tenant_id)
        self.assertEqual(count, 1)
        tracking = SLATracking.objects.get(tenant_id=self.tenant_id, request=self.req)
        self.assertTrue(tracking.is_violated)
        self.assertIsNotNone(tracking.violated_at)

    def test_check_warnings_creates_reminder(self):
        now = timezone.now()
        SLATracking.objects.create(
            tenant_id=self.tenant_id, request=self.req, due_at=now + timedelta(hours=1),
            warning_at=now - timedelta(minutes=5),
        )
        created = SLATrackingService.check_warnings(self.tenant_id)
        self.assertEqual(created, 1)
        self.assertTrue(ApprovalReminder.objects.filter(tenant_id=self.tenant_id, request=self.req).exists())
