# -*- coding: utf-8 -*-
"""
بذرة تسكين الطلاب في الصفوف والشعب (Enrollments Seed)

تسدّ الحلقة المقطوعة في السلسلة: الطلاب أُنشئوا (registered) لكن لم يُسكّنوا في
صفوف/شعب، فلا يظهرون في كشوف الدرجات. تُسكّن كل طالب غير مسجَّل في السنة الحالية
داخل صف افتراضي وتوزّعه على شعبه بالتناوب — idempotent (تتخطّى من له تسجيل نشط).

التشغيل:  backend\\venv\\Scripts\\python.exe backend/seed_enrollments.py
"""
import os
import sys
import datetime

sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django  # noqa: E402
django.setup()

from apps.tenants.domain.models import Tenant  # noqa: E402
from apps.academics.domain.models import AcademicYear, Term, Grade, Section  # noqa: E402
from apps.students.domain.models import Student, StudentEnrollment  # noqa: E402


def run():
    tenant = Tenant.objects.filter(name="Nebras").first() or Tenant.objects.first()
    if not tenant:
        print("لا يوجد مستأجر."); return
    t = tenant.id

    year = AcademicYear.objects.filter(tenant_id=t, current_flag=True).first() or AcademicYear.objects.filter(tenant_id=t).first()
    if not year:
        print("لا توجد سنة دراسية — أنشئ سنة أولاً."); return
    term = Term.objects.filter(tenant_id=t, academic_year=year).order_by('order').first()

    # اختيار صف لديه شعب لتسكين الطلاب فيه
    grade = None
    for g in Grade.objects.filter(tenant_id=t):
        if Section.objects.filter(tenant_id=t, grade=g).exists():
            grade = g
            break
    if not grade:
        print("لا يوجد صف لديه شعب — وزّع الشعب أولاً."); return
    sections = list(Section.objects.filter(tenant_id=t, grade=grade))
    print(f"الصف المستهدف: {grade.name} — شعب: {len(sections)}")

    students = list(Student.objects.filter(tenant_id=t))
    enrolled = skipped = 0
    for i, st in enumerate(students):
        # تخطّي من له تسجيل نشط في هذه السنة (قاعدة: تسجيل نشط واحد لكل سنة)
        if StudentEnrollment.objects.filter(tenant_id=t, student=st, academic_year_id=year.id, status='active').exists():
            skipped += 1
            continue
        section = sections[i % len(sections)]
        StudentEnrollment.objects.create(
            tenant_id=t, student=st,
            academic_year_id=year.id, term_id=(term.id if term else None),
            grade_id=grade.id, section_id=section.id,
            enrollment_date=datetime.date.today(), enrollment_type='new', status='active',
            created_by=tenant.id,
        )
        # ترقية حالة الطالب إلى نشط إن كانت أدنى
        if getattr(st, 'status', None) in (None, 'registered', 'draft'):
            st.status = 'active'
            st.save(update_fields=['status'])
        enrolled += 1

    print(f"تم التسكين: {enrolled} — متخطّى (مسجّل مسبقاً): {skipped}")
    print(f"إجمالي التسجيلات الآن: {StudentEnrollment.objects.filter(tenant_id=t).count()}")


if __name__ == "__main__":
    run()
