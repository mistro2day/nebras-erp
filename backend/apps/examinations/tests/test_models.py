from django.test import TestCase
import uuid

from apps.examinations.domain.models import (
    ExamCategory, ExamType, Exam, GradingScheme, GradeScale
)


class ExamCategoryModelTest(TestCase):
    """اختبارات فئات الامتحانات"""

    def setUp(self):
        self.tenant_id = uuid.uuid4()

    def test_create_category(self):
        cat = ExamCategory.objects.create(
            tenant_id=self.tenant_id,
            name='امتحان تحريري',
            code='written',
        )
        self.assertEqual(cat.name, 'امتحان تحريري')


class ExamTypeModelTest(TestCase):
    """اختبارات أنواع الامتحانات"""

    def setUp(self):
        self.tenant_id = uuid.uuid4()

    def test_create_type(self):
        t = ExamType.objects.create(
            tenant_id=self.tenant_id,
            name='امتحان نصفي',
            code='midterm_exam',
            type_class='midterm',
        )
        self.assertEqual(t.type_class, 'midterm')


class ExamModelTest(TestCase):
    """اختبارات الامتحانات والتقييمات"""

    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.cat = ExamCategory.objects.create(
            tenant_id=self.tenant_id, name='تحريري', code='written_test',
        )
        self.exam_type = ExamType.objects.create(
            tenant_id=self.tenant_id, name='نهائي', code='final_test',
        )

    def test_create_exam(self):
        exam = Exam.objects.create(
            tenant_id=self.tenant_id,
            category=self.cat,
            exam_type=self.exam_type,
            name='امتحان الرياضيات النهائي',
            code='math_final',
            subject_id=uuid.uuid4(),
            academic_year='2026/2027',
            term='الفصل الأول',
            max_marks=100.0,
            pass_marks=50.0,
            status='draft',
        )
        self.assertEqual(exam.status, 'draft')
        self.assertEqual(exam.max_marks, 100.0)
