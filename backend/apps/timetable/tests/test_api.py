from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.timetable.domain.models import AcademicTimetable
import uuid

User = get_user_model()


class TimetableAPITests(TestCase):
    """
    اختبارات واجهات REST API للجدول الأكاديمي
    """

    def setUp(self):
        self.client = APIClient()
        self.tenant_id = uuid.uuid4()
        
        self.user = User.objects.create_user(
            email='timetable_api_test@nebras.com',
            password='testpassword123',
            first_name='مجدول',
            last_name='أكاديمي'
        )
        self.client.force_authenticate(user=self.user)

        self.timetable = AcademicTimetable.objects.create(
            tenant_id=self.tenant_id,
            name='جدول تجريبي',
            academic_year='2026',
            term='T1'
        )

    def test_list_timetables(self):
        response = self.client.get('/api/v1/timetable/timetables/')
        self.assertIn(response.status_code, [200, 403])
