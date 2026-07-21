# -*- coding: utf-8 -*-
"""
بذرة بيانات موديول الامتحانات (Examinations Seed)

تُهيّئ البيانات المرجعية (فئات، أنواع، قاعات، سلّم تقديرات، دورة امتحانية)، ثم
تنشئ امتحانات منشورة مرتبطة بمواد حقيقية، وجداول لجان، وبنك أسئلة، وأعمال سنة،
وتولّد نتائج نهائية بتوزيع جرسي واقعي (لإظهار منحنى توزيع الدرجات في اللوحة)،
مع لجان طلاب ودرجاتهم وبعض التظلمات والمخالفات — كلها idempotent.

التشغيل:  python backend/seed_examinations.py
"""
import os
import sys
import random
import datetime
from decimal import Decimal

sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django  # noqa: E402
django.setup()

from apps.tenants.domain.models import Tenant  # noqa: E402
from apps.academics.domain.models import AcademicYear, Term  # noqa: E402
from apps.academics.domain.subjects import Subject  # noqa: E402
from apps.students.domain.models import Student  # noqa: E402
from apps.examinations.domain.models import (  # noqa: E402
    ExamCategory, ExamType, ExamRoom, GradingScheme, GradeScale, ExamSession,
    Exam, ExamSchedule, ExamQuestionBank, Question, Assessment, AssessmentItem,
    AssessmentWeight, StudentExam, StudentMark, ExamResult, ExamAppeal, ExamIncident,
    ExamStatistics,
)

random.seed(42)


def gc(model, tenant_id, defaults=None, **lookup):
    obj, _ = model.objects.get_or_create(tenant_id=tenant_id, **lookup, defaults=defaults or {})
    return obj


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def run():
    tenant = Tenant.objects.filter(name="Nebras").first() or Tenant.objects.first()
    if not tenant:
        print("لا يوجد مستأجر (Tenant) في النظام!")
        return
    t = tenant.id
    print(f"المستأجر: {tenant.name} ({t})")

    # 1) المرجعيات
    cat_written = gc(ExamCategory, t, code="WRITTEN", defaults={"name": "تحريري"})
    gc(ExamCategory, t, code="PRACTICAL", defaults={"name": "عملي"})
    gc(ExamCategory, t, code="ORAL", defaults={"name": "شفهي"})
    type_final = gc(ExamType, t, code="FINAL", defaults={"name": "الامتحان النهائي", "type_class": "final"})
    gc(ExamType, t, code="MID", defaults={"name": "الامتحان النصفي", "type_class": "midterm"})
    gc(ExamType, t, code="QUIZ", defaults={"name": "اختبار قصير", "type_class": "quiz"})

    rooms = [
        gc(ExamRoom, t, code="H-A", defaults={"name": "قاعة A", "capacity": 40}),
        gc(ExamRoom, t, code="H-B", defaults={"name": "قاعة B", "capacity": 35}),
        gc(ExamRoom, t, code="H-C", defaults={"name": "قاعة C", "capacity": 30}),
    ]
    print(f"المرجعيات: فئات={ExamCategory.objects.filter(tenant_id=t).count()} "
          f"أنواع={ExamType.objects.filter(tenant_id=t).count()} قاعات={ExamRoom.objects.filter(tenant_id=t).count()}")

    # 2) سلّم تقديرات + فئاته
    scheme = gc(GradingScheme, t, code="STD", defaults={"name": "السلّم القياسي", "is_active": True})
    scales = [
        ("A+", 4.00, 95, 100, "#16a34a"), ("A", 4.00, 90, 94, "#22c55e"),
        ("B", 3.00, 80, 89, "#3b82f6"), ("C", 2.00, 70, 79, "#eab308"),
        ("D", 1.00, 60, 69, "#f97316"), ("F", 0.00, 0, 59, "#ef4444"),
    ]
    for letter, gpa, lo, hi, color in scales:
        gc(GradeScale, t, scheme=scheme, grade_letter=letter,
           defaults={"gpa_value": Decimal(str(gpa)), "min_percentage": Decimal(str(lo)),
                     "max_percentage": Decimal(str(hi)), "color": color})
    print(f"سلّم التقديرات: {GradeScale.objects.filter(tenant_id=t, scheme=scheme).count()} فئات")

    # 3) دورة امتحانية نشطة
    year = AcademicYear.objects.filter(tenant_id=t, current_flag=True).first() or AcademicYear.objects.filter(tenant_id=t).first()
    term = None
    if year:
        term = Term.objects.filter(tenant_id=t, academic_year=year).order_by('order').first()
    year_code = (year.code if year else "2026")
    term_code = (term.code if term else "T1")

    session = gc(ExamSession, t, code="S-FINAL-1", defaults={
        "name": f"دورة نهاية الفصل {term_code} - {year_code}",
        "start_date": datetime.date(2026, 5, 20), "end_date": datetime.date(2026, 6, 5), "is_active": True})

    # 4) المواد الحقيقية (أو مواد افتراضية إن لم توجد)
    subjects = list(Subject.objects.filter(tenant_id=t)[:4])
    if not subjects:
        print("تنبيه: لا توجد مواد في الأكاديميات — شغّل seed المنهج أولًا لربط أفضل. سأتخطى الامتحانات المرتبطة بالمواد.")
    students = list(Student.objects.filter(tenant_id=t)[:45])
    print(f"مواد للربط: {len(subjects)} — طلاب للربط: {len(students)}")

    # 5) لكل مادة: امتحان منشور + جدول + بنك أسئلة + أعمال سنة + أوزان + نتائج بتوزيع جرسي
    def bell(mean=70, sd=13):
        return clamp(round(random.gauss(mean, sd), 1), 12, 100)

    total_results = 0
    for idx, subj in enumerate(subjects):
        code = f"EX-{subj.code}-{term_code}"
        exam = gc(Exam, t, code=code, defaults={
            "category": cat_written, "exam_type": type_final,
            "name": f"امتحان {subj.arabic_name} النهائي", "subject_id": subj.id,
            "academic_year": year_code, "term": term_code,
            "max_marks": Decimal("100.00"), "pass_marks": Decimal("50.00"),
            "weight_percentage": Decimal("60.00"), "status": "published"})

        sched = gc(ExamSchedule, t, exam=exam, session=session, exam_date=datetime.date(2026, 5, 22 + idx),
                   defaults={"start_time": datetime.time(9, 0), "end_time": datetime.time(11, 0), "duration_minutes": 120})

        bank = gc(ExamQuestionBank, t, name=f"بنك أسئلة {subj.arabic_name}", subject_id=subj.id)
        for qi, (qt, txt, mk, df) in enumerate([
            ("mcq", "اختر الإجابة الصحيحة من الخيارات التالية.", 2, "easy"),
            ("true_false", "ضع علامة صح أو خطأ أمام العبارة.", 1, "easy"),
            ("essay", "اشرح المفهوم الأساسي بالتفصيل مع الأمثلة.", 6, "hard"),
            ("short_answer", "أجب بإيجاز عن السؤال التالي.", 3, "medium"),
        ]):
            gc(Question, t, bank=bank, content=f"[{subj.arabic_name}] {txt}",
               defaults={"question_type": qt, "marks": Decimal(str(mk)), "difficulty_level": df, "is_active": True})

        assess = gc(Assessment, t, name=f"أعمال سنة {subj.arabic_name}", subject_id=subj.id,
                    defaults={"academic_year": year_code, "max_marks": Decimal("40.00")})
        for it_name, mk, wt in [("اختبارات قصيرة", 15, 40), ("واجبات", 10, 25), ("مشروع", 15, 35)]:
            gc(AssessmentItem, t, assessment=assess, name=it_name,
               defaults={"max_marks": Decimal(str(mk)), "weight_percentage": Decimal(str(wt))})
        gc(AssessmentWeight, t, subject_id=subj.id, academic_year=year_code, defaults={
            "continuous_assessment_weight": Decimal("40.00"), "final_exam_weight": Decimal("60.00")})

        # لجان الطلاب + الدرجات + النتائج النهائية (توزيع جرسي)
        for si, st in enumerate(students):
            room = rooms[si % len(rooms)]
            se = gc(StudentExam, t, schedule=sched, student_id=st.id,
                    defaults={"room": room, "seat_number": str(si + 1)})
            # درجة الامتحان النهائي (من 60) والأعمال (من 40)
            exam_pct = bell(68, 14)
            exam_marks = round(exam_pct * 0.60, 1)
            assess_marks = round(clamp(bell(75, 12), 20, 100) * 0.40, 1)
            gc(StudentMark, t, student_exam=se, defaults={
                "marks_obtained": Decimal(str(exam_marks)), "is_present": True})
            total = round(exam_marks + assess_marks, 1)
            letter = next((l for (l, _g, lo, hi, _c) in scales if lo <= total <= hi), "F")
            gpa = next((g for (l, g, lo, hi, _c) in scales if lo <= total <= hi), 0.0)
            ExamResult.objects.update_or_create(
                tenant_id=t, student_id=st.id, subject_id=subj.id, academic_year=year_code, term=term_code,
                defaults={"exam_marks": Decimal(str(exam_marks)), "assessment_marks": Decimal(str(assess_marks)),
                          "total_marks": Decimal(str(total)), "grade_letter": letter,
                          "gpa_value": Decimal(str(gpa)), "is_passed": total >= 50})
            total_results += 1

        # إحصائية الامتحان
        results = ExamResult.objects.filter(tenant_id=t, subject_id=subj.id, academic_year=year_code, term=term_code)
        if results:
            marks = [float(r.total_marks) for r in results]
            passed = sum(1 for r in results if r.is_passed)
            ExamStatistics.objects.update_or_create(tenant_id=t, exam=exam, defaults={
                "total_students": len(marks), "passed_students": passed, "failed_students": len(marks) - passed,
                "avg_marks": Decimal(str(round(sum(marks) / len(marks), 2))),
                "highest_marks": Decimal(str(max(marks))), "lowest_marks": Decimal(str(min(marks)))})

    print(f"الامتحانات: {Exam.objects.filter(tenant_id=t).count()} — النتائج المولّدة: {total_results}")

    # 6) بعض التظلمات والمخالفات (على أول امتحان إن وُجد)
    first_se = StudentExam.objects.filter(tenant_id=t).first()
    if first_se:
        gc(ExamAppeal, t, student_exam=first_se, reason="طلب إعادة تصحيح السؤال المقالي.",
           defaults={"status": "submitted", "old_marks": Decimal("48.0")})
        gc(ExamIncident, t, student_exam=first_se, description="محاولة استخدام قصاصة أثناء اللجنة.",
           defaults={"incident_type": "غش ومخالفة", "reported_by": tenant.id, "action_taken": "إنذار كتابي"})

    print("اكتملت تهيئة بيانات الامتحانات بنجاح ✅")


if __name__ == "__main__":
    run()
