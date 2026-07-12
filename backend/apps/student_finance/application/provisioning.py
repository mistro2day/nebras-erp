# -*- coding: utf-8 -*-
"""
تهيئة نظام فوترة الطلاب الافتراضي لكل مستأجر (Student Finance Provisioning)

يوفّر كتالوج الرسوم القياسي للمدارس (فئات، أنواع، هياكل) والإعدادات المالية
التي تربط فوترة الطلاب بشجرة حسابات المالية (حساب المدينين وحساب الإيرادات).

يُستدعى تلقائياً عند إنشاء أي مستأجر جديد (إشارة post_save في signals.py)،
ومن أمر الإدارة provision_student_finance، ومن سكربت البذرة.

يعتمد على تهيئة المالية (finance) لكونها تُنشئ شجرة الحسابات أولاً. idempotent.
"""
from decimal import Decimal


# ── فئات وأنواع الرسوم المدرسية القياسية ─────────────────────────
# category_code -> (name_ar, name_en, [ (type_code, type_ar, type_en, default_amount) ])
STANDARD_FEES = {
    "tuition": ("الرسوم الدراسية", "Tuition", [
        ("tuition_annual", "الرسوم الدراسية السنوية", "Annual Tuition", 1200000),
    ]),
    "registration": ("رسوم التسجيل", "Registration", [
        ("registration", "رسوم التسجيل والقبول", "Registration & Admission", 150000),
    ]),
    "transport": ("رسوم النقل", "Transport", [
        ("transport", "رسوم النقل المدرسي", "School Transport", 300000),
    ]),
    "activities": ("رسوم الأنشطة", "Activities", [
        ("activities", "رسوم الأنشطة والرحلات", "Activities & Trips", 80000),
    ]),
    "exam": ("رسوم الامتحانات", "Examinations", [
        ("exam", "رسوم الامتحانات", "Exam Fees", 50000),
    ]),
    "uniform_books": ("الزي والكتب", "Uniform & Books", [
        ("books", "الكتب والمقررات", "Books & Curriculum", 120000),
        ("uniform", "الزي المدرسي", "School Uniform", 90000),
    ]),
}

# هياكل الرسوم التي تُنشأ للعام الدراسي الافتراضي
DEFAULT_ACADEMIC_YEAR = "2026"
DEFAULT_STRUCTURE_TYPES = ["tuition_annual", "registration", "transport", "activities", "exam", "books", "uniform"]

# أكواد حسابات المالية المرتبطة
RECEIVABLES_COA_CODE = "1103"  # ذمم الطلاب المدينة
REVENUE_COA_CODE = "4100"      # إيرادات الرسوم الدراسية


def provision_student_finance_defaults(tenant_id):
    """
    يهيّئ كتالوج الرسوم والإعدادات المالية لفوترة الطلاب لمستأجر معيّن. idempotent.
    يُرجع ملخّصاً بالعناصر المُنشأة.
    """
    from apps.student_finance.domain.models import (
        FeeCategory, FeeType, FeeStructure, StudentFinanceSettings,
    )
    from apps.finance.domain.models import ChartOfAccount

    summary = {"categories": 0, "types": 0, "structures": 0, "settings": 0}

    types_by_code = {}
    for cat_code, (cat_ar, cat_en, types) in STANDARD_FEES.items():
        cat, created = FeeCategory.objects.get_or_create(
            tenant_id=tenant_id, code=cat_code,
            defaults={"name_ar": cat_ar, "name_en": cat_en},
        )
        summary["categories"] += int(created)
        for t_code, t_ar, t_en, amount in types:
            ft, created = FeeType.objects.get_or_create(
                tenant_id=tenant_id, code=t_code,
                defaults={"fee_category": cat, "name_ar": t_ar, "name_en": t_en, "default_amount": Decimal(str(amount))},
            )
            types_by_code[t_code] = ft
            summary["types"] += int(created)

    # هياكل الرسوم للعام الدراسي الافتراضي (عامة لكل الصفوف)
    for t_code in DEFAULT_STRUCTURE_TYPES:
        ft = types_by_code.get(t_code)
        if not ft:
            continue
        _, created = FeeStructure.objects.get_or_create(
            tenant_id=tenant_id, academic_year=DEFAULT_ACADEMIC_YEAR, fee_type=ft,
            grade_id=None, program_id=None,
            defaults={"name": f"{ft.name_ar} — {DEFAULT_ACADEMIC_YEAR}", "amount": ft.default_amount, "is_active": True},
        )
        summary["structures"] += int(created)

    # الإعدادات المالية: ربط حساب المدينين وحساب الإيرادات من شجرة حسابات المالية
    if not StudentFinanceSettings.objects.filter(tenant_id=tenant_id).exists():
        recv = ChartOfAccount.objects.filter(tenant_id=tenant_id, code=RECEIVABLES_COA_CODE).first()
        rev = ChartOfAccount.objects.filter(tenant_id=tenant_id, code=REVENUE_COA_CODE).first()
        if recv and rev:
            StudentFinanceSettings.objects.create(
                tenant_id=tenant_id,
                receivables_gl_account_id=recv.id,
                revenue_gl_account_id=rev.id,
                auto_apply_late_fees=False,
                max_credit_limit=Decimal("1000"),
            )
            summary["settings"] = 1

    return summary
