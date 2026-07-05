import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status

from apps.approval_center.domain.models import ApprovalCategory
from apps.approval_center.application.services import ApprovalRequestService, ApprovalDelegationService

User = get_user_model()


class CanDecidePermissionTests(TestCase):
    """
    اختبارات صلاحية اتخاذ القرار: يُسمح بها لمن يملك الصلاحية المباشرة، أو المُكلَّف الحالي
    بالطلب، أو من هو مفوَّض حالياً من قبل المُكلَّف — ويُرفض غير ذلك.
    """

    def setUp(self):
        ContentType.objects.clear_cache()
        self.tenant_id = uuid.uuid4()
        self.category = ApprovalCategory.objects.create(
            tenant_id=self.tenant_id, name_ar='إجازة', name_en='Leave', code='LEAVE'
        )
        self.assignee = User.objects.create_user(
            username='apv_assignee', email='apv_assignee@nebras.com', password='password123',
        )
        self.stranger = User.objects.create_user(
            username='apv_stranger', email='apv_stranger@nebras.com', password='password123',
        )
        self.req = ApprovalRequestService.create_request(
            tenant_id=self.tenant_id, category_id=self.category.id, requester_id=uuid.uuid4(),
            assignee_id=self.assignee.id,
        )

    def test_assigned_user_can_decide(self):
        client = APIClient()
        client.force_authenticate(user=self.assignee)
        response = client.post(
            f'/api/v1/approvals/requests/{self.req.id}/decision/',
            {'action': 'approve'}, format='json', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unrelated_user_cannot_decide(self):
        client = APIClient()
        client.force_authenticate(user=self.stranger)
        response = client.post(
            f'/api/v1/approvals/requests/{self.req.id}/decision/',
            {'action': 'approve'}, format='json', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_active_delegate_of_assignee_can_decide(self):
        delegate = User.objects.create_user(
            username='apv_delegate_user', email='apv_delegate_user@nebras.com', password='password123',
        )
        ApprovalDelegationService.create_delegation(
            self.tenant_id, self.assignee.id, delegate.id,
            timezone.now() - timedelta(hours=1), timezone.now() + timedelta(hours=1),
        )
        client = APIClient()
        client.force_authenticate(user=delegate)
        response = client.post(
            f'/api/v1/approvals/requests/{self.req.id}/decision/',
            {'action': 'approve'}, format='json', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthenticated_request_rejected(self):
        client = APIClient()
        response = client.post(
            f'/api/v1/approvals/requests/{self.req.id}/decision/',
            {'action': 'approve'}, format='json', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))
