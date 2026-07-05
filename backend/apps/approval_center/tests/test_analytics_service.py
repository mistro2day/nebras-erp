import uuid
from django.test import TestCase
from django.contrib.contenttypes.models import ContentType

from apps.tenants.context import set_current_tenant_id, clear_current_tenant
from apps.approval_center.domain.models import ApprovalCategory, ApprovalStatistics
from apps.approval_center.application.services import ApprovalRequestService, ApprovalDecisionService, ApprovalAnalyticsService


class ApprovalAnalyticsServiceTests(TestCase):
    def setUp(self):
        ContentType.objects.clear_cache()
        self.tenant_id = uuid.uuid4()
        set_current_tenant_id(self.tenant_id)
        self.category = ApprovalCategory.objects.create(
            tenant_id=self.tenant_id, name_ar='إجازة', name_en='Leave', code='LEAVE'
        )

    def tearDown(self):
        clear_current_tenant()

    def test_dashboard_stats_reflects_decisions(self):
        pending_req = ApprovalRequestService.create_request(
            tenant_id=self.tenant_id, category_id=self.category.id, requester_id=uuid.uuid4(),
        )
        approved_req = ApprovalRequestService.create_request(
            tenant_id=self.tenant_id, category_id=self.category.id, requester_id=uuid.uuid4(),
        )
        ApprovalDecisionService.make_decision(self.tenant_id, approved_req.id, uuid.uuid4(), 'approve')

        stats = ApprovalAnalyticsService.get_dashboard_stats(self.tenant_id)
        self.assertEqual(stats['pending'], 1)
        self.assertEqual(stats['approved'], 1)
        self.assertEqual(stats['rejected'], 0)
        self.assertEqual(len(stats['by_category']), 1)

    def test_recalculate_statistics_persists_totals(self):
        req = ApprovalRequestService.create_request(
            tenant_id=self.tenant_id, category_id=self.category.id, requester_id=uuid.uuid4(),
        )
        ApprovalDecisionService.make_decision(self.tenant_id, req.id, uuid.uuid4(), 'approve')

        stats = ApprovalAnalyticsService.recalculate_statistics(self.tenant_id)
        self.assertEqual(stats.total_processed, 1)
        self.assertTrue(ApprovalStatistics.objects.filter(tenant_id=self.tenant_id).exists())

    def test_user_dashboard_config_roundtrip(self):
        user_id = uuid.uuid4()
        ApprovalAnalyticsService.save_user_dashboard_config(self.tenant_id, user_id, {'widgets': ['pending']})
        dashboard = ApprovalAnalyticsService.get_user_dashboard_config(self.tenant_id, user_id)
        self.assertEqual(dashboard.config_json, {'widgets': ['pending']})
