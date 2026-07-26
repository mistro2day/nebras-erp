# -*- coding: utf-8 -*-
"""
بذر تقارير حقيقية تعمل على بيانات المنصة الفعلية (لا بيانات وهمية).

كل تقرير = مصدر بيانات (DataSource بنوع db_view يحمل الاستعلام)
           + مجموعة بيانات (ReportDataset) + تقرير (Report).
الاستعلامات كلها للقراءة فقط ومعزولة بالمستأجر عبر %(tenant_id)s،
فيشغّلها ReportEngineService._fetch_data بأمان.

التشغيل: "C:/Program Files/Python313/python.exe" seed_reporting.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.tenants.domain.models import Tenant
from apps.reporting.domain.models import (
    ReportCategory, DataSource, ReportDataset, Report,
)

# قائمة التقارير: (فئة, كود, اسم, وصف, نوع الفئة, أيقونة, استعلام)
REPORTS = [
    {
        "cat_code": "rep_faculty", "cat_name": "تقارير هيئة التدريس", "cat_type": "faculty", "icon": "👥",
        "code": "faculty_by_department",
        "name": "الكادر الأكاديمي حسب القسم",
        "desc": "عدد أعضاء هيئة التدريس ومتوسط الراتب الأساسي لكل قسم أكاديمي.",
        "sql": """
            SELECT f.department AS "القسم",
                   COUNT(*) AS "عدد المعلمين",
                   ROUND(AVG(e.basic_salary), 0) AS "متوسط الراتب الأساسي"
            FROM nebras_faculty_members f
            JOIN nebras_employees e ON e.id = f.employee_id
            WHERE f.tenant_id = %(tenant_id)s AND f.deleted_at IS NULL
            GROUP BY f.department
            ORDER BY COUNT(*) DESC
        """,
    },
    {
        "cat_code": "rep_faculty", "cat_name": "تقارير هيئة التدريس", "cat_type": "faculty", "icon": "👥",
        "code": "teacher_workload",
        "name": "نصاب المعلمين والتكليفات التدريسية",
        "desc": "عدد التكليفات وإجمالي الحصص الأسبوعية لكل معلم مقابل نصابه.",
        "sql": """
            SELECT emp.full_name_ar AS "المعلم",
                   COUNT(a.id) AS "عدد التكليفات",
                   COALESCE(SUM(a.weekly_hours), 0) AS "الحصص الأسبوعية",
                   emp.weekly_lesson_quota AS "النصاب"
            FROM nebras_faculty_members f
            JOIN nebras_employees emp ON emp.id = f.employee_id
            LEFT JOIN nebras_faculty_assignments a
                   ON a.faculty_member_id = f.id AND a.deleted_at IS NULL
            WHERE f.tenant_id = %(tenant_id)s AND f.deleted_at IS NULL
            GROUP BY emp.full_name_ar, emp.weekly_lesson_quota
            ORDER BY COALESCE(SUM(a.weekly_hours), 0) DESC
        """,
    },
    {
        "cat_code": "rep_admission", "cat_name": "تقارير القبول", "cat_type": "admission", "icon": "📋",
        "code": "applicants_by_status",
        "name": "المتقدمون حسب حالة الطلب",
        "desc": "توزيع طلبات الالتحاق على مراحل القبول (مُقدّم، مقبول، مُسجّل...).",
        "sql": """
            SELECT status AS "الحالة", COUNT(*) AS "عدد المتقدمين"
            FROM admission_applicants
            WHERE tenant_id = %(tenant_id)s AND deleted_at IS NULL
            GROUP BY status
            ORDER BY COUNT(*) DESC
        """,
    },
    {
        "cat_code": "rep_academic", "cat_name": "تقارير أكاديمية", "cat_type": "academic", "icon": "📚",
        "code": "subjects_per_grade",
        "name": "توزيع المواد الدراسية حسب الصف",
        "desc": "عدد المواد المعرّفة لكل صف دراسي في الخطة الأكاديمية.",
        "sql": """
            SELECT g.name AS "الصف", COUNT(sub.id) AS "عدد المواد"
            FROM academic_subjects sub
            JOIN academic_grades g ON g.id = sub.grade_id
            WHERE sub.tenant_id = %(tenant_id)s AND sub.deleted_at IS NULL
            GROUP BY g.name, g."order"
            ORDER BY g."order"
        """,
    },

    # ==================== تقارير الامتحانات والدرجات ====================
    # ملاحظة: الاستعلامات تشمل كل أنواع الاختبارات مع عمود «نوع الاختبار»
    # (شهري/نصفي/نهائي/قصير)، فتظهر الشهرية فور إدخالها والبيانات الحالية الآن.
    {
        "cat_code": "rep_exams", "cat_name": "تقارير الامتحانات والدرجات", "cat_type": "exam", "icon": "📝",
        "code": "exam_marks_sheet",
        "name": "كشف درجات الاختبارات",
        "desc": "درجات الطلاب في الاختبارات (شهرية/نصفية/نهائية) لكل مادة مع بيان النجاح والرسوب.",
        "sql": """
            SELECT p.arabic_name AS "الطالب",
                   sub.arabic_name AS "المادة",
                   e.name AS "الاختبار",
                   CASE et.type_class
                        WHEN 'monthly' THEN 'شهري' WHEN 'weekly' THEN 'أسبوعي'
                        WHEN 'midterm' THEN 'نصفي' WHEN 'final' THEN 'نهائي'
                        WHEN 'quiz' THEN 'قصير' ELSE et.name END AS "نوع الاختبار",
                   e.term AS "الفصل",
                   m.marks_obtained AS "الدرجة",
                   e.max_marks AS "العظمى",
                   CASE WHEN m.is_present = false THEN 'غائب'
                        WHEN m.marks_obtained >= e.pass_marks THEN 'ناجح'
                        ELSE 'راسب' END AS "النتيجة"
            FROM nebras_student_marks m
            JOIN nebras_student_exams se ON se.id = m.student_exam_id
            JOIN nebras_exam_schedules sch ON sch.id = se.schedule_id
            JOIN nebras_exams e ON e.id = sch.exam_id
            JOIN nebras_exam_types et ON et.id = e.exam_type_id
            LEFT JOIN student_profiles p ON p.student_id = se.student_id
            LEFT JOIN academic_subjects sub ON sub.id = e.subject_id
            WHERE m.tenant_id = %(tenant_id)s AND m.deleted_at IS NULL
            ORDER BY p.arabic_name, sub.arabic_name
        """,
    },
    {
        "cat_code": "rep_exams", "cat_name": "تقارير الامتحانات والدرجات", "cat_type": "exam", "icon": "📝",
        "code": "subject_pass_rate",
        "name": "معدل النجاح ومتوسط الدرجات حسب المادة",
        "desc": "متوسط الدرجات ونسبة النجاح لكل مادة عبر كل الاختبارات.",
        "sql": """
            SELECT sub.arabic_name AS "المادة",
                   COUNT(*) AS "عدد الطلاب",
                   ROUND(AVG(m.marks_obtained), 1) AS "متوسط الدرجة",
                   SUM(CASE WHEN m.is_present AND m.marks_obtained >= e.pass_marks THEN 1 ELSE 0 END) AS "الناجحون",
                   ROUND(100.0 * SUM(CASE WHEN m.is_present AND m.marks_obtained >= e.pass_marks THEN 1 ELSE 0 END)
                         / NULLIF(COUNT(*), 0), 1) AS "نسبة النجاح"
            FROM nebras_student_marks m
            JOIN nebras_student_exams se ON se.id = m.student_exam_id
            JOIN nebras_exam_schedules sch ON sch.id = se.schedule_id
            JOIN nebras_exams e ON e.id = sch.exam_id
            LEFT JOIN academic_subjects sub ON sub.id = e.subject_id
            WHERE m.tenant_id = %(tenant_id)s AND m.deleted_at IS NULL
            GROUP BY sub.arabic_name
            ORDER BY "نسبة النجاح" DESC
        """,
    },
    {
        "cat_code": "rep_exams", "cat_name": "تقارير الامتحانات والدرجات", "cat_type": "exam", "icon": "📝",
        "code": "failing_students",
        "name": "الطلاب المتعثّرون (رسوب في الاختبارات)",
        "desc": "الطلاب الراسبون في اختبار واحد أو أكثر — لمتابعة الدعم الأكاديمي.",
        "sql": """
            SELECT p.arabic_name AS "الطالب",
                   sub.arabic_name AS "المادة",
                   e.name AS "الاختبار",
                   m.marks_obtained AS "الدرجة",
                   e.pass_marks AS "درجة النجاح"
            FROM nebras_student_marks m
            JOIN nebras_student_exams se ON se.id = m.student_exam_id
            JOIN nebras_exam_schedules sch ON sch.id = se.schedule_id
            JOIN nebras_exams e ON e.id = sch.exam_id
            LEFT JOIN student_profiles p ON p.student_id = se.student_id
            LEFT JOIN academic_subjects sub ON sub.id = e.subject_id
            WHERE m.tenant_id = %(tenant_id)s AND m.deleted_at IS NULL
              AND m.is_present = true AND m.marks_obtained < e.pass_marks
            ORDER BY m.marks_obtained ASC
        """,
    },
    {
        "cat_code": "rep_exams", "cat_name": "تقارير الامتحانات والدرجات", "cat_type": "exam", "icon": "📝",
        "code": "student_results_summary",
        "name": "النتائج النهائية للطلاب وتقديراتهم",
        "desc": "مجموع الدرجات وحرف التقدير وحالة النجاح لكل طالب حسب المادة والفصل.",
        "sql": """
            SELECT p.arabic_name AS "الطالب",
                   sub.arabic_name AS "المادة",
                   r.term AS "الفصل",
                   r.total_marks AS "المجموع",
                   r.grade_letter AS "التقدير",
                   CASE WHEN r.is_passed THEN 'ناجح' ELSE 'راسب' END AS "الحالة"
            FROM nebras_exam_results r
            LEFT JOIN student_profiles p ON p.student_id = r.student_id
            LEFT JOIN academic_subjects sub ON sub.id = r.subject_id
            WHERE r.tenant_id = %(tenant_id)s AND r.deleted_at IS NULL
            ORDER BY p.arabic_name, sub.arabic_name
        """,
    },
]


def seed(tenant):
    tid = tenant.id
    created_cats, created_reports = 0, 0
    cat_cache = {}

    for r in REPORTS:
        # 1) الفئة
        cat = cat_cache.get(r["cat_code"])
        if not cat:
            cat, c = ReportCategory.objects.get_or_create(
                code=r["cat_code"],
                defaults={
                    "tenant_id": tid, "name": r["cat_name"],
                    "category_type": r["cat_type"], "icon": r["icon"],
                },
            )
            cat_cache[r["cat_code"]] = cat
            created_cats += int(c)

        # 2) مصدر البيانات (يحمل الاستعلام)
        ds, _ = DataSource.objects.get_or_create(
            tenant_id=tid, code=f"src_{r['code']}",
            defaults={
                "name": f"مصدر: {r['name']}",
                "source_type": "db_view",
                "query_template": r["sql"].strip(),
                "is_active": True,
            },
        )
        # حدّث الاستعلام دائماً (ليعكس أي تعديل في هذا الملف)
        if ds.query_template != r["sql"].strip():
            ds.query_template = r["sql"].strip()
            ds.save(update_fields=["query_template"])

        # 3) مجموعة البيانات
        dataset, _ = ReportDataset.objects.get_or_create(
            tenant_id=tid, code=f"ds_{r['code']}",
            defaults={"data_source": ds, "name": r["name"]},
        )

        # 4) التقرير
        report, c = Report.objects.get_or_create(
            tenant_id=tid, code=r["code"],
            defaults={
                "category": cat, "dataset": dataset,
                "name": r["name"], "description": r["desc"],
                "status": "published", "is_system": True,
            },
        )
        created_reports += int(c)
        print(f"  {'✓ أُنشئ' if c else '• موجود'}: {r['name']}")

    print(f"\nالفئات المُنشأة: {created_cats} · التقارير المُنشأة: {created_reports}")
    print(f"إجمالي التقارير للمستأجر: {Report.objects.filter(tenant_id=tid).count()}")


if __name__ == "__main__":
    tenant = Tenant.objects.filter(name="Nebras").first() or Tenant.objects.first()
    if not tenant:
        print("لا يوجد مستأجر.")
        sys.exit(1)
    print(f"بذر تقارير المستأجر: {tenant.name}")
    seed(tenant)
