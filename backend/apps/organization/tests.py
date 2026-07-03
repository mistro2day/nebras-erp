from django.test import TestCase
from django.core.exceptions import ValidationError
from apps.organization.domain.models import Branch, Campus, Building, Floor, Room, Department
from apps.organization.application.services import OrganizationDomainService
import uuid

class OrganizationDomainTest(TestCase):
    def setUp(self):
        self.tenant_id = uuid.uuid4()
        
        # إنشاء هيكلية مبدئية
        self.branch = Branch.objects.create(
            tenant_id=self.tenant_id,
            name='الفرع الرئيسي',
            code='BR_MAIN'
        )
        self.campus = Campus.objects.create(
            tenant_id=self.tenant_id,
            branch=self.branch,
            name='مجمع العمارات',
            code='CAMP_AMARAT'
        )
        self.building = Building.objects.create(
            tenant_id=self.tenant_id,
            campus=self.campus,
            name='المبنى أ',
            code='BLDG_A'
        )
        self.floor = Floor.objects.create(
            tenant_id=self.tenant_id,
            building=self.building,
            name='الطابق الأرضي',
            number=0
        )
        self.room = Room.objects.create(
            tenant_id=self.tenant_id,
            floor=self.floor,
            number='101',
            capacity=25
        )

    def test_room_capacity_validation_success(self):
        """التحقق من نجاح التحقق عندما يكون عدد الطلاب مناسباً للسعة"""
        try:
            OrganizationDomainService.validate_room_capacity(self.room, 20)
        except ValidationError:
            self.fail("لا يجب أن يرمي استثناءً للسعة المقبولة.")

    def test_room_capacity_validation_failure(self):
        """التحقق من فشل التحقق عندما يتجاوز عدد الطلاب السعة الاستيعابية"""
        with self.assertRaises(ValidationError):
            OrganizationDomainService.validate_room_capacity(self.room, 30)

    def test_department_circular_hierarchy(self):
        """التحقق من منع التداخل الدائري في الأقسام"""
        dept1 = Department.objects.create(
            tenant_id=self.tenant_id,
            name='قسم تقنية المعلومات',
            code='DEPT_IT'
        )
        dept2 = Department.objects.create(
            tenant_id=self.tenant_id,
            name='قسم الدعم الفني',
            code='DEPT_SUPPORT',
            parent=dept1
        )
        
        with self.assertRaises(ValidationError):
            # جعل الأب (dept1) فرعياً من الابن (dept2)
            OrganizationDomainService.check_department_hierarchy(dept1, dept2)