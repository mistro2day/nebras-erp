import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.integration.domain.models import ApiClient, ApiKey, Webhook, WebhookSubscription, WebhookDelivery
from apps.portal.domain.models import PortalUser, PortalProfile, ParentProfile

User = get_user_model()

class IntegrationTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tenant_id = uuid.uuid4()
        
        # إنشاء مستخدم وعميل للربط
        self.user = User.objects.create_user(username='integration_user', email='integration@nebras.com', password='password123')
        self.api_client = ApiClient.objects.create(
            name="شريك خارجي 1", client_id="client_id_001", client_secret="secret_abc_123", tenant_id=self.tenant_id
        )
        self.api_key = ApiKey.objects.create(
            client=self.api_client, key_hash="hashed_key_123", prefix="testkey123", name="مفتاح الاختبار", tenant_id=self.tenant_id
        )

        # ملفات تعريف البوابة
        self.portal_parent = PortalUser.objects.create(
            user=self.user, user_type='parent', tenant_id=self.tenant_id
        )
        self.parent_profile = PortalProfile.objects.create(
            portal_user=self.portal_parent, display_name_ar="ولي الأمر أحمد", tenant_id=self.tenant_id
        )
        self.parent_ext = ParentProfile.objects.create(
            portal_profile=self.parent_profile, national_id="1234567890",
            linked_students=[], tenant_id=self.tenant_id
        )

    def test_parent_bff_dashboard_access(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/integration/bff/parent/dashboard/', HTTP_X_TENANT_ID=str(self.tenant_id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('parent_info', response.data)
        self.assertIn('children_summary', response.data)

    def test_client_crud_access(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/integration/clients/', HTTP_X_TENANT_ID=str(self.tenant_id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
