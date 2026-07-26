# -*- coding: utf-8 -*-
"""
توحيد مفهوم المدرسة عبر فروع حقيقية: إنشاء فرع البنين وفرع البنات
وربط تسجيلات الطلاب بالفرع المناسب حسب الجنس.

هذا الأساس الذي تبنى عليه تقارير الطلاب حسب المدرسة/الفرع، ويُوحّد
مفهوم «بنين/بنات» في النظام بدل الاعتماد على الجنس كبديل.

التشغيل: "C:/Program Files/Python313/python.exe" seed_branches.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection, transaction
from apps.tenants.domain.models import Tenant
from apps.organization.domain.models import Branch

BRANCHES = [
    {"code": "BR-BOYS", "name": "فرع البنين", "name_ar": "فرع البنين", "gender": "boys"},
    {"code": "BR-GIRLS", "name": "فرع البنات", "name_ar": "فرع البنات", "gender": "girls"},
]


@transaction.atomic
def seed(tenant):
    tid = tenant.id
    created = {}
    for b in BRANCHES:
        branch, was_created = Branch.objects.get_or_create(
            tenant_id=tid, code=b["code"],
            defaults={
                "name": b["name"], "name_ar": b["name_ar"],
                "school_gender_type": b["gender"], "is_active": True,
                "country": "السودان",
            },
        )
        created[b["gender"]] = branch
        print(f"  {'✓ أُنشئ' if was_created else '• موجود'}: {b['name']} ({b['gender']})")

    boys_id = str(created["boys"].id)
    girls_id = str(created["girls"].id)

    # ربط تسجيلات الطلاب بالفرع حسب جنس الطالب (backfill)
    with connection.cursor() as c:
        c.execute("""
            UPDATE student_enrollments e
            SET branch_id = %s
            FROM student_profiles p
            WHERE p.student_id = e.student_id
              AND e.tenant_id = %s AND e.deleted_at IS NULL
              AND p.gender = 'male'
        """, [boys_id, str(tid)])
        boys_upd = c.rowcount
        c.execute("""
            UPDATE student_enrollments e
            SET branch_id = %s
            FROM student_profiles p
            WHERE p.student_id = e.student_id
              AND e.tenant_id = %s AND e.deleted_at IS NULL
              AND p.gender = 'female'
        """, [girls_id, str(tid)])
        girls_upd = c.rowcount

    print(f"\nرُبطت التسجيلات بالفروع: بنين={boys_upd} · بنات={girls_upd}")
    print(f"إجمالي الفروع للمستأجر: {Branch.objects.filter(tenant_id=tid).count()}")


if __name__ == "__main__":
    tenant = Tenant.objects.filter(name="Nebras").first() or Tenant.objects.first()
    if not tenant:
        print("لا يوجد مستأجر.")
        sys.exit(1)
    print(f"توحيد الفروع للمستأجر: {tenant.name}")
    seed(tenant)
