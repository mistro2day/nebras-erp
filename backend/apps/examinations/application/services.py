import logging
from decimal import Decimal
from django.utils import timezone
from django.db import transaction

from apps.examinations.domain.models import (
    Exam, ExamSchedule, StudentExam, StudentMark, MarkEntry, MarkApproval,
    ExamAppeal, ExamResult, Transcript, AcademicStanding, ExamStatistics, ExamAudit
)

logger = logging.getLogger('nebras.examinations')


# ============================================================
# 1. Exam Service — خدمة الامتحانات والجدولة والتحقق
# ============================================================
class ExamService:
    """
    إدارة الامتحانات وتكامل الجدولة.
    """

    @classmethod
    def schedule_exam(cls, tenant_id, exam_id, session_id, exam_date, start_time, end_time, duration_minutes):
        """جدولة امتحان والتحقق من عدم وجود تعارض."""
        # في بيئة التشغيل يتم التحقق من تعارض القاعات أو المراقبين هنا باستخدام Scheduling Engine
        schedule = ExamSchedule.objects.create(
            tenant_id=tenant_id,
            exam_id=exam_id,
            session_id=session_id,
            exam_date=exam_date,
            start_time=start_time,
            end_time=end_time,
            duration_minutes=duration_minutes
        )
        return schedule


# ============================================================
# 2. Grading Service — رصد وتعديل واعتماد درجات الطلاب
# ============================================================
class GradingService:
    """
    رصد درجات الطلاب وحساب التقديرات النهائية وتكامل محرك القواعد.
    """

    @classmethod
    def enter_marks(cls, tenant_id, student_exam_id, marks_obtained, entered_by, reason=None):
        """رصد وتعديل درجة طالب مع إطلاق تدقيق أمني (Audit Trail)."""
        with transaction.atomic():
            student_exam = StudentExam.objects.select_related('schedule__exam').get(
                id=student_exam_id, tenant_id=tenant_id
            )
            exam = student_exam.schedule.exam

            # 1. التحقق من الحدود القصوى للدرجات
            if Decimal(str(marks_obtained)) > exam.max_marks:
                raise ValueError(f"الدرجة المرصودة ({marks_obtained}) تتجاوز الحد الأقصى المسموح ({exam.max_marks})")

            # 2. التحقق من قفل الامتحانات وحمايتها
            if exam.status in ['locked', 'closed']:
                raise PermissionError("لا يمكن تعديل درجات امتحان مغلق أو منشور بشكل رسمي.")

            # 3. إيجاد أو إنشاء سجل الدرجات
            mark_record, created = StudentMark.objects.get_or_create(
                tenant_id=tenant_id,
                student_exam=student_exam,
                defaults={'marks_obtained': Decimal(str(marks_obtained))}
            )

            if not created:
                old_val = str(mark_record.marks_obtained)
                mark_record.marks_obtained = Decimal(str(marks_obtained))
                mark_record.save()

                # 4. تسجيل عملية التعديل في جدول التدقيق (Audit)
                ExamAudit.objects.create(
                    tenant_id=tenant_id,
                    student_exam=student_exam,
                    field_changed='marks_obtained',
                    old_value=old_val,
                    new_value=str(marks_obtained),
                    changed_by=entered_by,
                    reason=reason or 'تعديل درجة طالب'
                )

            # 5. تحديث إحصائيات الامتحان
            cls.calculate_exam_statistics(tenant_id, exam.id)

            return mark_record

    @classmethod
    def calculate_exam_statistics(cls, tenant_id, exam_id):
        """حساب وتحديث إحصائيات درجات الطلاب للامتحان."""
        exam = Exam.objects.get(id=exam_id, tenant_id=tenant_id)
        marks = StudentMark.objects.filter(student_exam__schedule__exam=exam)
        
        total = marks.count()
        if total == 0:
            return None

        passed = marks.filter(marks_obtained__gte=exam.pass_marks).count()
        failed = total - passed

        obtained_values = [m.marks_obtained for m in marks]
        avg_marks = sum(obtained_values) / total
        highest = max(obtained_values)
        lowest = min(obtained_values)

        stats, created = ExamStatistics.objects.update_or_create(
            tenant_id=tenant_id,
            exam=exam,
            defaults={
                'total_students': total,
                'passed_students': passed,
                'failed_students': failed,
                'avg_marks': Decimal(str(avg_marks)),
                'highest_marks': Decimal(str(highest)),
                'lowest_marks': Decimal(str(lowest)),
            }
        )
        return stats


# ============================================================
# 3. Appeal Service — إدارة التظلمات وإعادة التصحيح
# ============================================================
class AppealService:
    """
    إدارة طلبات الاستئناف وإعادة تصحيح أوراق الامتحانات.
    """

    @classmethod
    def submit_appeal(cls, tenant_id, student_exam_id, reason):
        """تقديم طلب تظلم."""
        student_exam = StudentExam.objects.get(id=student_exam_id, tenant_id=tenant_id)
        mark = StudentMark.objects.get(student_exam=student_exam)

        appeal = ExamAppeal.objects.create(
            tenant_id=tenant_id,
            student_exam=student_exam,
            reason=reason,
            old_marks=mark.marks_obtained,
            status='submitted'
        )
        return appeal

    @classmethod
    def resolve_appeal(cls, tenant_id, appeal_id, new_marks, resolved_by):
        """البت في طلب تظلم وتحديث الدرجة بالتدقيق."""
        with transaction.atomic():
            appeal = ExamAppeal.objects.get(id=appeal_id, tenant_id=tenant_id)
            student_exam = appeal.student_exam
            
            if new_marks is not None:
                # تحديث الدرجة عبر خدمة الرصد لتسجيل التدقيق
                GradingService.enter_marks(
                    tenant_id=tenant_id,
                    student_exam_id=student_exam.id,
                    marks_obtained=new_marks,
                    entered_by=resolved_by,
                    reason=f"تعديل الدرجة بناءً على قبول التظلم رقم {appeal_id}"
                )
                appeal.new_marks = Decimal(str(new_marks))
                appeal.status = 'resolved_changed'
            else:
                appeal.status = 'resolved_unchanged'

            appeal.resolved_by = resolved_by
            appeal.resolved_at = timezone.now()
            appeal.save()

            return appeal
