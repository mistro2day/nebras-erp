import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.personalization.domain.models import Theme, Workspace

User = get_user_model()

class PersonalizationPlatformTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tenant_id = uuid.uuid4()
        self.user = User.objects.create_user(username='p13n_user', email='p13n@nebras.com', password='password123')

        # إنشاء ثيم تجريبي
        self.theme = Theme.objects.create(
            name="الوضع الداكن المشرق", code="dark-sunset", branding_config={"primary": "#f43f5e"},
            tenant_id=self.tenant_id
        )

        # مساحة عمل تجريبية
        self.workspace = Workspace.objects.create(
            name_ar="مساحة عمل المدير العام", name_en="Principal Workspace", code="principal-ws",
            tenant_id=self.tenant_id
        )

    def test_get_accessibility_profile(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(
            '/api/v1/personalization/accessibility/profile/', HTTP_X_TENANT_ID=str(self.tenant_id)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['font_scale'], 1.0)
        self.assertFalse(response.data['high_contrast'])

    def test_update_accessibility_profile(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            'font_scale': 1.5,
            'high_contrast': True,
            'reduced_motion': False
        }
        response = self.client.post(
            '/api/v1/personalization/accessibility/profile/', payload, format='json', HTTP_X_TENANT_ID=str(self.tenant_id)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['font_scale'], 1.5)
        self.assertTrue(response.data['high_contrast'])
