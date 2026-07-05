import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from rest_framework.test import APIClient
from rest_framework import status

from apps.approval_center.domain.models import ApprovalCategory
from apps.approval_center.application.services import ApprovalRequestService

User = get_user_model()


class InboxAPITests(TestCase):
    def setUp(self):
        ContentType.objects.clear_cache()
        self.client = APIClient()
        self.tenant_id = uuid.uuid4()
        self.user = User.objects.create_superuser(
            username='apv_inbox_admin', email='apv_inbox_admin@nebras.com', password='password123',
        )
        self.client.force_authenticate(user=self.user)
        self.category = ApprovalCategory.objects.create(
            tenant_id=self.tenant_id, name_ar='إجازة', name_en='Leave', code='LEAVE'
        )
        self.req = ApprovalRequestService.create_request(
            tenant_id=self.tenant_id, category_id=self.category.id, requester_id=self.user.id,
            assignee_id=self.user.id,
        )

    def test_my_items_returns_assigned_request(self):
        response = self.client.get(
            '/api/v1/approvals/inbox/my-items/', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['item_id'], self.req.id)

    def test_toggle_star_and_archive(self):
        items_resp = self.client.get('/api/v1/approvals/inbox/my-items/', HTTP_X_TENANT_ID=str(self.tenant_id))
        item_id = items_resp.data[0]['id']

        star_resp = self.client.post(
            f'/api/v1/approvals/inbox/{item_id}/toggle-star/', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        self.assertEqual(star_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(star_resp.data['is_starred'])

        archive_resp = self.client.post(
            f'/api/v1/approvals/inbox/{item_id}/archive/', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        self.assertEqual(archive_resp.status_code, status.HTTP_200_OK)

        items_after = self.client.get('/api/v1/approvals/inbox/my-items/', HTTP_X_TENANT_ID=str(self.tenant_id))
        self.assertEqual(len(items_after.data), 0)
