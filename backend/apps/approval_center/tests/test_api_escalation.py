import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from rest_framework.test import APIClient
from rest_framework import status

from apps.approval_center.domain.models import ApprovalCategory
from apps.approval_center.application.services import ApprovalRequestService

User = get_user_model()


class EscalationAPITests(TestCase):
    def setUp(self):
        ContentType.objects.clear_cache()
        self.client = APIClient()
        self.tenant_id = uuid.uuid4()
        self.admin = User.objects.create_superuser(
            username='apv_escalation_admin', email='apv_escalation_admin@nebras.com', password='password123',
        )
        self.client.force_authenticate(user=self.admin)
        self.category = ApprovalCategory.objects.create(
            tenant_id=self.tenant_id, name_ar='مشتريات', name_en='Purchase', code='PURCHASE'
        )
        self.req = ApprovalRequestService.create_request(
            tenant_id=self.tenant_id, category_id=self.category.id, requester_id=uuid.uuid4(),
        )

    def test_create_and_resolve_escalation(self):
        create_resp = self.client.post(
            '/api/v1/approvals/escalations/',
            {'request': str(self.req.id), 'escalated_to_id': str(uuid.uuid4()), 'reason': 'لا استجابة'},
            format='json', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        escalation_id = create_resp.data['id']

        active_resp = self.client.get(
            '/api/v1/approvals/escalations/active/', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        self.assertEqual(len(active_resp.data), 1)

        resolve_resp = self.client.post(
            f'/api/v1/approvals/escalations/{escalation_id}/resolve/', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        self.assertEqual(resolve_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resolve_resp.data['resolved'])

        active_after = self.client.get(
            '/api/v1/approvals/escalations/active/', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        self.assertEqual(len(active_after.data), 0)

    def test_non_privileged_user_cannot_create_escalation(self):
        regular_user = User.objects.create_user(
            username='apv_regular', email='apv_regular@nebras.com', password='password123',
        )
        client = APIClient()
        client.force_authenticate(user=regular_user)
        response = client.post(
            '/api/v1/approvals/escalations/',
            {'request': str(self.req.id), 'escalated_to_id': str(uuid.uuid4())},
            format='json', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
