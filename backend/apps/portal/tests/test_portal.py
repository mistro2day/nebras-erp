import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.portal.domain.models import PortalUser, PortalProfile, ParentProfile, StudentProfile, ApplicantProfile

User = get_user_model()

class PortalTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tenant_id = uuid.uuid4()
        
        # إنشاء مستخدمين للتجربة
        self.parent_user = User.objects.create_user(username='parent_user', email='parent@nebras.com', password='password123')
        self.student_user = User.objects.create_user(username='student_user', email='student@nebras.com', password='password123')
        self.applicant_user = User.objects.create_user(username='applicant_user', email='applicant@nebras.com', password='password123')

        # ملفات تعريف البوابات
        self.portal_parent = PortalUser.objects.create(
            user=self.parent_user, user_type='parent', tenant_id=self.tenant_id
        )
        self.portal_student = PortalUser.objects.create(
            user=self.student_user, user_type='student', tenant_id=self.tenant_id
        )
        self.portal_applicant = PortalUser.objects.create(
            user=self.applicant_user, user_type='applicant', tenant_id=self.tenant_id
        )

        # الملفات الشخصية
        self.parent_profile = PortalProfile.objects.create(
            portal_user=self.portal_parent, display_name_ar="ولي الأمر أحمد", tenant_id=self.tenant_id
        )
        self.student_profile = PortalProfile.objects.create(
            portal_user=self.portal_student, display_name_ar="الطالب خالد", tenant_id=self.tenant_id
        )
        self.applicant_profile = PortalProfile.objects.create(
            portal_user=self.portal_applicant, display_name_ar="المتقدم سعيد", tenant_id=self.tenant_id
        )

        self.student_id = uuid.uuid4()
        self.parent_ext = ParentProfile.objects.create(
            portal_profile=self.parent_profile, national_id="1234567890",
            linked_students=[str(self.student_id)], tenant_id=self.tenant_id
        )
        self.student_ext = StudentProfile.objects.create(
            portal_profile=self.student_profile, student_id=self.student_id,
            student_number="STD-001", academic_year="2026", grade_level="Grade 10", tenant_id=self.tenant_id
        )
        self.applicant_ext = ApplicantProfile.objects.create(
            portal_profile=self.applicant_profile, application_id=uuid.uuid4(),
            admission_status="under_review", tenant_id=self.tenant_id
        )

    def test_parent_dashboard_access(self):
        self.client.force_authenticate(user=self.parent_user)
        response = self.client.get('/api/v1/portal/parent/dashboard/', HTTP_X_TENANT_ID=str(self.tenant_id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('students', response.data)
        self.assertIn('financial_summary', response.data)

    def test_student_dashboard_access(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/v1/portal/student/dashboard/', HTTP_X_TENANT_ID=str(self.tenant_id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('today_classes', response.data)
        self.assertIn('transport_info', response.data)

    def test_applicant_dashboard_access(self):
        self.client.force_authenticate(user=self.applicant_user)
        response = self.client.get('/api/v1/portal/applicant/dashboard/', HTTP_X_TENANT_ID=str(self.tenant_id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('admission_timeline', response.data)
        self.assertIn('required_documents', response.data)
