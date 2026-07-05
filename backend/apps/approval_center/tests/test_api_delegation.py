import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class DelegationAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tenant_id = uuid.uuid4()
        self.user = User.objects.create_user(
            username='apv_delegator', email='apv_delegator@nebras.com', password='password123',
        )
        self.client.force_authenticate(user=self.user)
        self.delegate_id = uuid.uuid4()

    def test_create_delegation_via_api(self):
        response = self.client.post(
            '/api/v1/approvals/delegations/',
            {
                'delegate_to_id': str(self.delegate_id),
                'start_date': timezone.now().isoformat(),
                'end_date': (timezone.now() + timedelta(days=5)).isoformat(),
                'reason': 'إجازة سنوية',
            },
            format='json', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user_id'], str(self.user.id))

    def test_my_delegations_lists_own_delegation(self):
        self.client.post(
            '/api/v1/approvals/delegations/',
            {
                'delegate_to_id': str(self.delegate_id),
                'start_date': timezone.now().isoformat(),
                'end_date': (timezone.now() + timedelta(days=5)).isoformat(),
            },
            format='json', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        response = self.client.get(
            '/api/v1/approvals/delegations/my-delegations/', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_deactivate_own_delegation(self):
        create_resp = self.client.post(
            '/api/v1/approvals/delegations/',
            {
                'delegate_to_id': str(self.delegate_id),
                'start_date': timezone.now().isoformat(),
                'end_date': (timezone.now() + timedelta(days=5)).isoformat(),
            },
            format='json', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        delegation_id = create_resp.data['id']
        response = self.client.post(
            f'/api/v1/approvals/delegations/{delegation_id}/deactivate/', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_active'])
