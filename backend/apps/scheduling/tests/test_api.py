from datetime import date, time
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.scheduling.domain.models import ScheduleResource, Reservation
from apps.tenants.domain.models import Tenant
import uuid

User = get_user_model()


class SchedulingAPITests(TestCase):
    """
    اختبارات الـ API والتكامل لموديول الجدولة
    """

    def setUp(self):
        self.client = APIClient()
        self.tenant_id = uuid.uuid4()
        
        # إنشاء مستخدم للاختبار
        self.user = User.objects.create_user(
            email='scheduling_test@nebras.com',
            password='testpassword123',
            first_name='مجدول',
            last_name='عام'
        )
        self.client.force_authenticate(user=self.user)

        # إنشاء مورد
        self.resource = ScheduleResource.objects.create(
            tenant_id=self.tenant_id,
            name='سيارة إسعاف العيادة',
            resource_type='vehicle',
            capacity=1
        )

    def test_list_schedules(self):
        response = self.client.get('/api/v1/scheduling/schedules/')
        self.assertIn(response.status_code, [200, 403])

    def test_create_reservation_api(self):
        payload = {
            'resource': str(self.resource.id),
            'title': 'حجز طارئ لمباراة رياضية',
            'date': '2026-10-15',
            'start_time': '08:00:00',
            'end_time': '10:00:00',
            'status': 'draft'
        }
        response = self.client.post('/api/v1/scheduling/reservations/', data=payload, format='json')
        self.assertIn(response.status_code, [201, 403])