from django.test import TestCase
from apps.employees.domain.models import Employee, EmployeeProfile
from apps.faculty.domain.models import FacultyMember
import uuid

class EmployeeRefactoringTest(TestCase):
    """
    اختبارات إعادة الهيكلة والتكامل مع الموظفين والمعلمين (Employee Refactoring Tests)
    """
    def setUp(self):
        self.tenant_id = uuid.uuid4()
        
        # 1. إنشاء موظف أساسي
        self.employee = Employee.objects.create(
            tenant_id=self.tenant_id,
            employee_number='EMP-2026-001',
            national_id='2223334445',
            full_name_ar='خالد بن محمد الإداري',
            gender='male',
            nationality='Saudi',
            date_of_birth='1990-01-01',
            department='HR',
            position='HR Officer',
            employment_type='Full-time'
        )

        # 2. إنشاء معلم يربط بالموظف
        self.faculty_member = FacultyMember.objects.create(
            tenant_id=self.tenant_id,
            employee=self.employee,
            employee_number='EMP-2026-002',
            teacher_code='TCH-002',
            national_id='3334445556',
            full_name_ar='محمد بن علي المعلم',
            gender='male',
            nationality='Saudi',
            date_of_birth='1988-01-01',
            department='Mathematics',
            current_position='Senior Teacher'
        )

    def test_employee_creation_and_fields(self):
        self.assertEqual(self.employee.employee_number, 'EMP-2026-001')
        self.assertEqual(self.employee.position, 'HR Officer')

    def test_faculty_member_integration(self):
        # التحقق من أن الكيان يربط بنجاح بالموظف
        self.assertEqual(self.faculty_member.employee, self.employee)
        self.assertEqual(self.faculty_member.teacher_code, 'TCH-002')