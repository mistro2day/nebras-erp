import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.command_center.domain.models import Command, CommandCategory, RecentCommand

User = get_user_model()

class CommandCenterTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tenant_id = uuid.uuid4()
        self.user = User.objects.create_user(username='cmd_user', email='cmd@nebras.com', password='password123')

        # إنشاء تصنيف
        self.category = CommandCategory.objects.create(
            name_ar="الشؤون المالية والأقساط", name_en="Finance Commands", code="finance-cmds", tenant_id=self.tenant_id
        )

        # إنشاء أمر تجريبي
        self.cmd = Command.objects.create(
            title_ar="إنشاء فاتورة جديدة", title_en="Create New Invoice",
            category=self.category, action_type="navigate", target_route="/finance/invoices/new",
            tenant_id=self.tenant_id
        )

    def test_search_commands(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(
            '/api/v1/commands/items/search/?q=invoice', HTTP_X_TENANT_ID=str(self.tenant_id)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title_ar'], "إنشاء فاتورة جديدة")

    def test_execute_command(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            f'/api/v1/commands/items/{self.cmd.id}/execute/', HTTP_X_TENANT_ID=str(self.tenant_id)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertEqual(response.data['target_route'], '/finance/invoices/new')
