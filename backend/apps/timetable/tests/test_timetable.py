from django.test import TestCase
from apps.faculty.domain.models import FacultyMember
from apps.employees.domain.models import Employee
from apps.timetable.domain.models import AcademicTimetable, ClassPeriod, TimetableEntry, TeachingLoad
from apps.timetable.application.services import TimetableOrchestratorService
from datetime import time, date
import uuid


class AcademicTimetableTests(TestCase):
    """
    اختبارات منطق وأعمال الجدول الدراسي وتوزيع الحصص
    """

    def setUp(self):
        self.tenant_id = uuid.uuid4()
        
        # إنشاء موظف أولاً لربطه بالمعلم
        self.employee = Employee.objects.create(
            tenant_id=self.tenant_id,
            employee_number='EMP-TCH-99',
            national_id='1009988776',
            full_name_ar='محمد المعلم',
            gender='male',
            nationality='Saudi',
            date_of_birth='1985-05-12',
            department='Academic',
            position='Teacher',
            employment_type='Full-time'
        )

        # الدور الأكاديمي فقط — البيانات الشخصية مصدرها Employee أعلاه
        self.teacher = FacultyMember.objects.create(
            tenant_id=self.tenant_id,
            employee=self.employee,
            teacher_code='TCH-CODE-99',
            department='Academic',
            current_position='Teacher',
            status='active'
        )

        # إعداد عبء العمل للمعلم
        self.load = TeachingLoad.objects.create(
            tenant_id=self.tenant_id,
            teacher=self.teacher,
            max_weekly_hours=24,
            max_daily_hours=6,
            assigned_weekly_hours=0
        )

        # إنشاء جدول دراسي
        self.timetable = AcademicTimetable.objects.create(
            tenant_id=self.tenant_id,
            name='جدول المرحلة الثانوية',
            academic_year='2026',
            term='Term 1',
            status='draft'
        )

        # إنشاء حصة دراسية (الحصة الأولى)
        self.period = ClassPeriod.objects.create(
            tenant_id=self.tenant_id,
            period_number=1,
            start_time=time(8, 0),
            end_time=time(8, 45)
        )

        self.subject_id = uuid.uuid4()
        self.room_id = uuid.uuid4()
        self.grade_section_id = uuid.uuid4()

    def test_validate_and_add_entry_success(self):
        """إضافة حصة بنجاح مع عدم وجود تعارض"""
        entry, conflicts = TimetableOrchestratorService.validate_and_add_entry(
            tenant_id=self.tenant_id,
            timetable_id=self.timetable.id,
            day_of_week=0,
            period=self.period,
            teacher=self.teacher,
            subject_id=self.subject_id,
            room_id=self.room_id,
            grade_section_id=self.grade_section_id
        )
        self.assertIsNotNone(entry)
        self.assertEqual(len(conflicts), 0)

    def test_validate_and_add_entry_workload_exceeded(self):
        """منع إضافة الحصة عند تجاوز الحد الأقصى لساعات تدريس المعلم"""
        self.load.assigned_weekly_hours = 24
        self.load.save()

        entry, conflicts = TimetableOrchestratorService.validate_and_add_entry(
            tenant_id=self.tenant_id,
            timetable_id=self.timetable.id,
            day_of_week=0,
            period=self.period,
            teacher=self.teacher,
            subject_id=self.subject_id,
            room_id=self.room_id,
            grade_section_id=self.grade_section_id
        )
        self.assertIsNone(entry)
        self.assertTrue(len(conflicts) > 0)
        self.assertEqual(conflicts[0]['conflict_type'], 'teaching_load_exceeded')
