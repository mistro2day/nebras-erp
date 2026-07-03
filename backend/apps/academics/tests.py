from django.test import TestCase
from django.core.exceptions import ValidationError
from apps.academics.domain.models import AcademicYear, Term, Stage, Grade, Section
from apps.academics.application.services import AcademicValidationService
import uuid
import datetime

class AcademicsDomainTest(TestCase):
    def setUp(self):
        self.tenant_id = uuid.uuid4()
        
        # إنشاء سنة دراسية
        self.academic_year = AcademicYear.objects.create(
            tenant_id=self.tenant_id,
            name='السنة الدراسية 2026',
            code='AY_2026',
            start_date=datetime.date(2026, 1, 1),
            end_date=datetime.date(2026, 12, 31),
            current_flag=True
        )

    def test_only_one_current_academic_year(self):
        """التحقق من أنه لا يمكن تفعيل أكثر من سنة دراسية واحدة لنفس المستأجر"""
        year2 = AcademicYear.objects.create(
            tenant_id=self.tenant_id,
            name='السنة الدراسية 2027',
            code='AY_2027',
            start_date=datetime.date(2027, 1, 1),
            end_date=datetime.date(2027, 12, 31),
            current_flag=True
        )
        
        self.academic_year.refresh_from_db()
        self.assertFalse(self.academic_year.current_flag)
        self.assertTrue(year2.current_flag)

    def test_year_overlap_validation(self):
        """التحقق من تداخل تواريخ السنوات الدراسية"""
        with self.assertRaises(ValidationError):
            AcademicValidationService.validate_year_no_overlap(
                self.tenant_id,
                datetime.date(2026, 6, 1),
                datetime.date(2026, 12, 1)
            )