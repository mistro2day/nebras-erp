import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class TaxonomyAPITests(TestCase):
    """اختبارات CRUD لنماذج التصنيف والتهيئة (فئات، أولويات، مجموعات، طوابير، خطوات، قواعد، قوالب، إعدادات)."""

    def setUp(self):
        self.client = APIClient()
        self.tenant_id = uuid.uuid4()
        self.admin = User.objects.create_superuser(
            username='apv_taxonomy_admin', email='apv_taxonomy_admin@nebras.com', password='password123',
        )
        self.client.force_authenticate(user=self.admin)

    def test_category_crud(self):
        create_resp = self.client.post(
            '/api/v1/approvals/categories/',
            {'name_ar': 'مشتريات', 'name_en': 'Purchase', 'code': 'PURCHASE'},
            format='json', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        category_id = create_resp.data['id']

        list_resp = self.client.get('/api/v1/approvals/categories/', HTTP_X_TENANT_ID=str(self.tenant_id))
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_resp.data['data']), 1)

        update_resp = self.client.patch(
            f'/api/v1/approvals/categories/{category_id}/', {'name_ar': 'مشتريات محدثة'},
            format='json', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        self.assertEqual(update_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(update_resp.data['name_ar'], 'مشتريات محدثة')

        delete_resp = self.client.delete(
            f'/api/v1/approvals/categories/{category_id}/', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        self.assertEqual(delete_resp.status_code, status.HTTP_204_NO_CONTENT)

    def test_priority_crud(self):
        response = self.client.post(
            '/api/v1/approvals/priorities/', {'name': 'عاجل', 'code': 'URGENT'},
            format='json', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_regular_user_can_read_but_not_write_taxonomy(self):
        regular_user = User.objects.create_user(
            username='apv_taxonomy_regular', email='apv_taxonomy_regular@nebras.com', password='password123',
        )
        client = APIClient()
        client.force_authenticate(user=regular_user)

        read_resp = client.get('/api/v1/approvals/categories/', HTTP_X_TENANT_ID=str(self.tenant_id))
        self.assertEqual(read_resp.status_code, status.HTTP_200_OK)

        write_resp = client.post(
            '/api/v1/approvals/categories/', {'name_ar': 'x', 'name_en': 'x', 'code': 'X'},
            format='json', HTTP_X_TENANT_ID=str(self.tenant_id),
        )
        self.assertEqual(write_resp.status_code, status.HTTP_403_FORBIDDEN)
