from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.contenttypes.models import ContentType
from apps.students.domain.models import Student, StudentProfile, StudentEnrollment
from apps.students.domain.services import StudentNumberGenerator, StudentDomainService
from apps.students.application.services import StudentApplicationService
from apps.admissions.domain.models import Applicant
from apps.workflow.models import WorkflowDefinition, WorkflowState, WorkflowInstance, WorkflowTransition
from apps.identity.domain.models import User
from django.core.exceptions import ValidationError
import uuid
import datetime

class StudentLifecycleDomainTest(TestCase):
    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.user_id = uuid.uuid4()
        
    def test_student_number_generator(self):
        """التحقق من صحة توليد رقم الطالب التلقائي مع الأكواد ورقم التحقق"""
        num = StudentNumberGenerator.generate(
            tenant_id=self.tenant_id,
            branch_code="B1",
            academic_year_code="2026",
            sequence_num=5,
            config={'use_branch': True, 'use_year': True, 'padding': 4, 'checksum': True}
        )
        # B1 - 2026 - 0005 - (checksum mod 10)
        self.assertTrue(num.startswith("B1-2026-0005-"))

    def test_duplicate_enrollment_validation(self):
        """التحقق من منع التسجيل المتعدد في نفس العام الدراسي لنفس الطالب"""
        student = Student.objects.create(
            student_number="ST-2026-001",
            status="active",
            tenant_id=self.tenant_id
        )
        academic_year_id = uuid.uuid4()
        grade_id = uuid.uuid4()
        
        # التسجيل الأول
        StudentEnrollment.objects.create(
            student=student,
            academic_year_id=academic_year_id,
            grade_id=grade_id,
            enrollment_date=datetime.date.today(),
            status="active",
            tenant_id=self.tenant_id
        )
        
        # محاولة التسجيل الثاني النشط في نفس السنة الدراسية يجب أن يفشل
        with self.assertRaises(ValidationError):
            StudentDomainService.validate_unique_enrollment_per_year(student.id, academic_year_id)


class StudentLifecycleIntegrationTest(APITestCase):
    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.user_id = uuid.uuid4()
        
        # إنشاء مستأجر
        from apps.tenants.domain.models import Tenant
        self.tenant = Tenant.objects.create(
            id=self.tenant_id,
            name="مدرسة الاختبار",
            subdomain="test-school",
            is_active=True
        )
        
        # إنشاء مستخدم للاختبار
        self.user = User.objects.create_user(
            username="test_user",
            email="test@nebras.com",
            password="testpassword"
        )
        self.client.force_authenticate(user=self.user)
        
        # تهيئة طلب القبول
        self.applicant = Applicant.objects.create(
            tenant_id=self.tenant_id,
            arabic_full_name="أحمد خالد",
            gender="male",
            date_of_birth=datetime.date(2018, 9, 1),
            nationality="سعودي",
            national_id="1111222233",
            academic_year_id=uuid.uuid4(),
            applying_grade_id=uuid.uuid4(),
            application_number="APP-2026-99",
            status="accepted"
        )
        
        # تهيئة مسار عمل الطلاب
        self.content_type = ContentType.objects.get_for_model(Student)
        self.workflow = WorkflowDefinition.objects.create(
            tenant_id=self.tenant_id,
            name="دورة حياة الطالب",
            code="student_lifecycle",
            content_type=self.content_type
        )
        
        self.reg_state = WorkflowState.objects.create(
            workflow=self.workflow, name="مسجل", code="registered", is_initial=True, tenant_id=self.tenant_id
        )
        self.enrolled_state = WorkflowState.objects.create(
            workflow=self.workflow, name="موزع دراسياً", code="enrolled", tenant_id=self.tenant_id
        )
        self.active_state = WorkflowState.objects.create(
            workflow=self.workflow, name="نشط", code="active", tenant_id=self.tenant_id
        )
        
        WorkflowTransition.objects.create(
            workflow=self.workflow, from_state=self.reg_state, to_state=self.enrolled_state,
            trigger_action="enroll_student", tenant_id=self.tenant_id
        )
        
        # إعطاء صلاحيات للمستخدم
        from django.contrib.auth.models import Permission
        view_perm = Permission.objects.get(codename='view_student')
        create_perm = Permission.objects.get(codename='add_student')
        self.user.user_permissions.add(view_perm, create_perm)

    def test_create_student_from_applicant_api(self):
        """التحقق من إنشاء طالب من طلب التقديم عبر الـ API"""
        url = reverse('student-create-from-applicant')
        data = {
            'applicant_id': str(self.applicant.id)
        }
        
        response = self.client.post(url, data, format='json', HTTP_X_TENANT_ID=str(self.tenant_id))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['data']['status'], 'registered')
        
        # التأكد من وجود الطالب في قاعدة البيانات
        student = Student.objects.get(student_number=response.data['data']['student_number'])
        self.assertEqual(student.profile.arabic_name, "أحمد خالد")