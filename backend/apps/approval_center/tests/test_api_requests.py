import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from rest_framework.test import APIClient
from rest_framework import status

from apps.approval_center.domain.models import ApprovalCategory, ApprovalRequest

User = get_user_model()


class ApprovalRequestAPITests(TestCase):
    """اختبارات API لدورة حياة طلب الاعتماد عبر /api/v1/approvals/requests/."""

    def setUp(self):
        ContentType.objects.clear_cache()
        self.client = APIClient()
        self.tenant_id = uuid.uuid4()
        self.user = User.objects.create_superuser(
            username='apv_req_admin', email='apv_req_admin@nebras.com', password='password123',
        )
        self.client.force_authenticate(user=self.user)
        self.category = ApprovalCategory.objects.create(
            tenant_id=self.tenant_id, name_ar='إجازة', name_en='Leave', code='LEAVE'
        )

    def test_create_request_via_api(self):
        response = self.client.post(
            '/api/v1/approvals/requests/',
            {'category': str(self.category.id), 'title_ar': 'طلب إجازة', 'payload': {'amount': 200}},
            format='json', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'pending')
        self.assertIsNotNone(response.data['workflow_instance_id'])

    def test_create_request_without_tenant_header_rejected(self):
        response = self.client.post(
            '/api/v1/approvals/requests/',
            {'category': str(self.category.id), 'title_ar': 'طلب إجازة'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_decision_endpoint_approves_request(self):
        create_resp = self.client.post(
            '/api/v1/approvals/requests/',
            {'category': str(self.category.id), 'title_ar': 'طلب إجازة'},
            format='json', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        request_id = create_resp.data['id']

        decision_resp = self.client.post(
            f'/api/v1/approvals/requests/{request_id}/decision/',
            {'action': 'approve', 'comments': 'موافق'},
            format='json', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        self.assertEqual(decision_resp.status_code, status.HTTP_200_OK)

        req = ApprovalRequest.objects.get(id=request_id)
        self.assertEqual(req.status, 'approved')

    def test_dashboard_stats_endpoint(self):
        response = self.client.get(
            '/api/v1/approvals/requests/dashboard-stats/', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('pending', response.data)

    def test_bulk_approve_endpoint(self):
        ids = []
        for _ in range(2):
            resp = self.client.post(
                '/api/v1/approvals/requests/',
                {'category': str(self.category.id), 'title_ar': 'طلب'},
                format='json', HTTP_X_TENANT_ID=str(self.tenant_id),
            )
            ids.append(resp.data['id'])

        response = self.client.post(
            '/api/v1/approvals/requests/bulk-approve/',
            {'request_ids': ids}, format='json', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(all(r['success'] for r in response.data['results']))
