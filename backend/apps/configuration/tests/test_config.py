import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.configuration.domain.models import FeatureFlag, SystemSetting

User = get_user_model()

class ConfigurationPlatformTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tenant_id = uuid.uuid4()
        self.user = User.objects.create_user(username='cfg_user', email='cfg@nebras.com', password='password123')

        # إنشاء إعداد تجريبي
        self.setting = SystemSetting.objects.create(
            key="academic.max_students_per_class", value="30", tenant_id=self.tenant_id
        )

        # إنشاء ميزة فورية
        self.feature = FeatureFlag.objects.create(
            name="الذكاء الاصطناعي في الفصول", code="ai-classroom", is_enabled=True,
            tenant_id=self.tenant_id
        )

    def test_evaluate_feature_flag(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(
            f'/api/v1/config/features/evaluate/{self.feature.code}/', HTTP_X_TENANT_ID=str(self.tenant_id)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_enabled'])

    def test_update_setting_key(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            'key': 'academic.max_students_per_class',
            'value': '35'
        }
        response = self.client.post(
            '/api/v1/config/settings/update-key/', payload, format='json', HTTP_X_TENANT_ID=str(self.tenant_id)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['value'], '35')
