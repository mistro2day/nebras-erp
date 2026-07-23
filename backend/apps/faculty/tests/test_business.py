from django.test import TestCase
from apps.faculty.domain.models import FacultyMember, AcademicQualification
from apps.faculty.application.services import FacultyBusinessRulesService
from apps.employees.domain.models import Employee
import uuid

class FacultyBusinessRulesTest(TestCase):
    """
    اختبارات قواعد وحالات عمل موديول المعلمين (Faculty Business Verification)
    """
    def setUp(self):
        self.tenant_id = uuid.uuid4()
        # البيانات الشخصية مصدرها ملف الموظف بعد توحيد مصدر الحقيقة
        self.employee = Employee.objects.create(
            tenant_id=self.tenant_id,
            employee_number='EMP-999',
            national_id='1112223334',
            full_name_ar='أحمد بن خالد المعلم',
            gender='male',
            nationality='Saudi',
            date_of_birth='1985-01-01',
            department='Mathematics',
            position='Senior Teacher',
        )
        self.member = FacultyMember.objects.create(
            tenant_id=self.tenant_id,
            employee=self.employee,
            teacher_code='TCH-999',
            department='Mathematics',
            current_position='Senior Teacher'
        )

    def test_national_id_uniqueness_validation(self):
        # التحقق من وجود الهوية الوطنية مسبقاً
        is_unique = FacultyBusinessRulesService.validate_national_id_unique('1112223334')
        self.assertFalse(is_unique)

        # التحقق من هوية وطنية غير مستخدمة مسبقاً
        is_unique_new = FacultyBusinessRulesService.validate_national_id_unique('9999999999')
        self.assertTrue(is_unique_new)

    def test_workload_limit_validation(self):
        # التحقق من عدم تخطي الحد الأقصى لساعات العمل الأسبوعية (24 ساعة)
        self.assertTrue(FacultyBusinessRulesService.check_workload_limit(20))
        self.assertFalse(FacultyBusinessRulesService.check_workload_limit(28))