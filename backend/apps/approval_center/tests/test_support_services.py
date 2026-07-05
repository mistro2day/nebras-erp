import uuid
from django.test import TestCase

from apps.approval_center.domain.models import ApprovalAudit, ApprovalTemplate, ApprovalConfiguration
from apps.approval_center.application.services import (
    ApprovalAuditService, ApprovalNotificationService, ApprovalTemplateService,
)


class ApprovalAuditServiceTests(TestCase):
    def test_log_creates_audit_row(self):
        tenant_id = uuid.uuid4()
        ApprovalAuditService.log(tenant_id, uuid.uuid4(), 'request_created', 'تفاصيل')
        self.assertEqual(ApprovalAudit.objects.filter(tenant_id=tenant_id).count(), 1)


class ApprovalNotificationServiceTests(TestCase):
    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.user_id = uuid.uuid4()

    def test_notify_and_unread_count(self):
        ApprovalNotificationService.notify_user(self.tenant_id, self.user_id, 'رسالة تجريبية')
        self.assertEqual(ApprovalNotificationService.unread_count(self.tenant_id, self.user_id), 1)

    def test_mark_read_decrements_unread_count(self):
        notification = ApprovalNotificationService.notify_user(self.tenant_id, self.user_id, 'رسالة')
        ApprovalNotificationService.mark_read(self.tenant_id, notification.id)
        self.assertEqual(ApprovalNotificationService.unread_count(self.tenant_id, self.user_id), 0)


class ApprovalTemplateServiceTests(TestCase):
    def setUp(self):
        self.tenant_id = uuid.uuid4()
        from apps.approval_center.domain.models import ApprovalCategory
        self.category = ApprovalCategory.objects.create(
            tenant_id=self.tenant_id, name_ar='إجازة', name_en='Leave', code='LEAVE'
        )

    def test_apply_template_merges_overrides(self):
        template = ApprovalTemplate.objects.create(
            tenant_id=self.tenant_id, category=self.category, template_json={'amount': 100, 'notes': 'افتراضي'},
        )
        payload = ApprovalTemplateService.apply_template(self.tenant_id, template.id, {'amount': 500})
        self.assertEqual(payload['amount'], 500)
        self.assertEqual(payload['notes'], 'افتراضي')

    def test_get_and_set_config(self):
        ApprovalTemplateService.set_config(self.tenant_id, 'sla.default_hours', 48)
        self.assertEqual(ApprovalTemplateService.get_config(self.tenant_id, 'sla.default_hours'), 48)
        self.assertEqual(ApprovalTemplateService.get_config(self.tenant_id, 'missing.key', default='x'), 'x')
