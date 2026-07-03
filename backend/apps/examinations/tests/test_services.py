from django.test import TestCase
import uuid
from decimal import Decimal

from apps.examinations.domain.models import (
    ExamCategory, ExamType, Exam, ExamSession, ExamSchedule, ExamRoom, StudentExam, StudentMark
)
from apps.examinations.application.services import GradingService, AppealService


class GradingServiceTest(TestCase):
    """اختبارات خدمة رصد درجات الطلاب وحساب الإحصائيات الأكاديمية"""

    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.cat = ExamCategory.objects.create(
            tenant_id=self.tenant_id, name='تحريري', code='written_test',
        )
        self.exam_type = ExamType.objects.create(
            tenant_id=self.tenant_id, name='نهائي', code='final_test',
        )
        self.exam = Exam.objects.create(
            tenant_id=self.tenant_id,
            category=self.cat,
            exam_type=self.exam_type,
            name='الرياضيات',
            code='math',
            subject_id=uuid.uuid4(),
            academic_year='2026',
            term='1',
            max_marks=100.0,
            pass_marks=50.0,
        )
        self.session = ExamSession.objects.create(
            tenant_id=self.tenant_id, name='دورة 2026', code='s2026',
            start_date='2026-01-01', end_date='2026-06-30',
        )
        self.schedule = ExamSchedule.objects.create(
            tenant_id=self.tenant_id, exam=self.exam, session=self.session,
            exam_date='2026-05-15', start_time='09:00:00', end_time='12:00:00',
            duration_minutes=180,
        )
        self.room = ExamRoom.objects.create(
            tenant_id=self.tenant_id, name='قاعة 1', code='room1', capacity=30,
        )
        self.student_exam = StudentExam.objects.create(
            tenant_id=self.tenant_id, schedule=self.schedule,
            student_id=uuid.uuid4(), room=self.room, seat_number='A-12',
        )

    def test_enter_marks_success(self):
        mark = GradingService.enter_marks(
            tenant_id=self.tenant_id,
            student_exam_id=self.student_exam.id,
            marks_obtained=75.5,
            entered_by=uuid.uuid4(),
        )
        self.assertEqual(mark.marks_obtained, Decimal('75.5'))

    def test_enter_marks_exceeds_max(self):
        with self.assertRaises(ValueError):
            GradingService.enter_marks(
                tenant_id=self.tenant_id,
                student_exam_id=self.student_exam.id,
                marks_obtained=110.0,
                entered_by=uuid.uuid4(),
            )

    def test_calculate_exam_statistics(self):
        GradingService.enter_marks(
            tenant_id=self.tenant_id,
            student_exam_id=self.student_exam.id,
            marks_obtained=80.0,
            entered_by=uuid.uuid4(),
        )
        stats = GradingService.calculate_exam_statistics(self.tenant_id, self.exam.id)
        self.assertEqual(stats.total_students, 1)
        self.assertEqual(stats.passed_students, 1)
        self.assertEqual(stats.avg_marks, Decimal('80.0'))
        self.assertEqual(stats.highest_marks, Decimal('80.0'))
        self.assertEqual(stats.lowest_marks, Decimal('80.0'))
