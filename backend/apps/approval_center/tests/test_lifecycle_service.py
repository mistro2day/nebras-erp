import uuid
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.contrib.contenttypes.models import ContentType

from apps.tenants.context import set_current_tenant_id, clear_current_tenant
from apps.approval_center.domain.models import ApprovalCategory, ApprovalRequest, ApprovalOutcome, ApprovalHistory
from apps.approval_center.application.services import ApprovalRequestService, ApprovalDecisionService
from apps.workflow.models import WorkflowInstance


class ApprovalLifecycleServiceTests(TestCase):
    """
    اختبارات دورة حياة طلب الاعتماد وتكامله الحقيقي مع محرك سير العمل المركزي.
    يتم ضبط سياق المستأجر عبر set_current_tenant_id لأن WorkflowInstance يعتمد على
    apps.common.CombinedBaseModel الذي يُفعِّل تصفية المستأجر التلقائية من سياق الخيط.
    """

    def setUp(self):
        # يُعاد ضبط كاش أنواع المحتوى (ContentType) لأن أول استدعاء لـ get_for_model داخل
        # اختبار سابق قد ينشئ الصف ضمن نفس savepoint الخاص بذلك الاختبار؛ عند التراجع عنه
        # (rollback) يبقى الكائن المخزّن مؤقتاً في الذاكرة يشير إلى معرف لم يعد موجوداً فعلياً.
        ContentType.objects.clear_cache()
        self.tenant_id = uuid.uuid4()
        set_current_tenant_id(self.tenant_id)
        self.category = ApprovalCategory.objects.create(
            tenant_id=self.tenant_id, name_ar='إجازة', name_en='Leave', code='LEAVE'
        )
        self.requester_id = uuid.uuid4()
        self.approver_id = uuid.uuid4()

    def tearDown(self):
        clear_current_tenant()

    def test_create_request_builds_real_workflow_instance(self):
        req = ApprovalRequestService.create_request(
            tenant_id=self.tenant_id, category_id=self.category.id, requester_id=self.requester_id,
            title_ar='طلب تجريبي', payload={'amount': 5000},
        )
        self.assertEqual(req.status, 'pending')
        self.assertIsNotNone(req.workflow_instance_id)

        instance = WorkflowInstance.objects.get(id=req.workflow_instance_id)
        self.assertEqual(instance.current_state.code, 'pending')
        self.assertTrue(
            ApprovalHistory.objects.filter(tenant_id=self.tenant_id, request=req, action_taken='submit').exists()
        )

    def test_make_decision_approve_transitions_workflow_and_creates_outcome(self):
        req = ApprovalRequestService.create_request(
            tenant_id=self.tenant_id, category_id=self.category.id, requester_id=self.requester_id,
            title_ar='طلب تجريبي', payload={'amount': 5000},
        )
        ApprovalDecisionService.make_decision(self.tenant_id, req.id, self.approver_id, 'approve', comments='ok')

        req.refresh_from_db()
        self.assertEqual(req.status, 'approved')

        instance = WorkflowInstance.objects.get(id=req.workflow_instance_id)
        self.assertEqual(instance.current_state.code, 'approved')

        outcome = ApprovalOutcome.objects.get(tenant_id=self.tenant_id, request=req)
        self.assertEqual(outcome.outcome_code, 'approved')
        self.assertEqual(outcome.decided_by, self.approver_id)
        self.assertIsNotNone(outcome.decided_at)

    def test_make_decision_reject_transitions_workflow(self):
        req = ApprovalRequestService.create_request(
            tenant_id=self.tenant_id, category_id=self.category.id, requester_id=self.requester_id,
        )
        ApprovalDecisionService.make_decision(self.tenant_id, req.id, self.approver_id, 'reject', comments='no')
        req.refresh_from_db()
        self.assertEqual(req.status, 'rejected')
        outcome = ApprovalOutcome.objects.get(tenant_id=self.tenant_id, request=req)
        self.assertEqual(outcome.outcome_code, 'rejected')

    def test_make_decision_unknown_request_raises(self):
        with self.assertRaises(ValidationError):
            ApprovalDecisionService.make_decision(self.tenant_id, uuid.uuid4(), self.approver_id, 'approve')

    def test_create_request_unknown_category_raises(self):
        with self.assertRaises(ValidationError):
            ApprovalRequestService.create_request(
                tenant_id=self.tenant_id, category_id=uuid.uuid4(), requester_id=self.requester_id,
            )

    def test_cancel_request(self):
        req = ApprovalRequestService.create_request(
            tenant_id=self.tenant_id, category_id=self.category.id, requester_id=self.requester_id,
        )
        cancelled = ApprovalRequestService.cancel_request(self.tenant_id, req.id, self.requester_id, reason='لم تعد ضرورية')
        self.assertEqual(cancelled.status, 'cancelled')
