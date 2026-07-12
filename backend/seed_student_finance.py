# -*- coding: utf-8 -*-
"""
بذرة بيانات فوترة الطلاب (Student Finance Seed) — بيانات فعلية لطلاب فعليين.

تُهيّئ كتالوج الرسوم والإعدادات (عبر خدمة التهيئة المشتركة)، ثم لطلاب حقيقيين
من وحدة الطلاب: تفتح حساب فوترة، تُصدر فاتورة (تُرحّل قيد استحقاق في المالية)،
وتُحصّل دفعة جزئية (تولّد سند قبض في المالية) — أي أنها تختبر التكامل الكامل
عبر نفس طبقة الخدمات التي تستدعيها الواجهة.

التشغيل: ./backend/venv/Scripts/python.exe backend/seed_student_finance.py
"""
import os
import sys
import django
import datetime
from decimal import Decimal

sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.tenants.domain.models import Tenant
from apps.students.domain.models import Student
from apps.student_finance.domain.models import StudentBillingAccount, FeeStructure
from apps.student_finance.application.provisioning import provision_student_finance_defaults
from apps.student_finance.application.services import BillingService, PaymentService, ScholarshipService
from apps.finance.domain.models import PaymentMethod, CashBox


def run():
    tenant = Tenant.objects.filter(name="Nebras").first() or Tenant.objects.first()
    if not tenant:
        print("لا يوجد مستأجر!")
        return
    t = tenant.id
    print(f"المستأجر: {tenant.name} ({t})")

    summary = provision_student_finance_defaults(t)
    print(f"تهيئة كتالوج الرسوم والإعدادات: {summary}")

    structures = list(FeeStructure.objects.filter(tenant_id=t, academic_year="2026", is_active=True))
    if not structures:
        print("لا توجد هياكل رسوم — تأكد من تهيئة المالية أولاً.")
        return
    # مجموعة رسوم الفاتورة: الدراسية + التسجيل + النقل
    core_codes = {"tuition_annual", "registration", "transport"}
    invoice_structs = [s for s in structures if s.fee_type.code in core_codes] or structures[:3]

    pm = PaymentMethod.objects.filter(tenant_id=t, code="cash").first() or PaymentMethod.objects.filter(tenant_id=t).first()
    cash_box = CashBox.objects.filter(tenant_id=t).first()
    if not pm or not cash_box:
        print("طريقة الدفع أو الصندوق غير متوفرين — شغّل seed_finance أولاً.")
        return

    students = list(Student.objects.filter(tenant_id=t, deleted_at__isnull=True)[:8])
    if not students:
        print("لا يوجد طلاب فعليون في النظام.")
        return
    print(f"عدد الطلاب المستهدفين: {len(students)}")

    existing = StudentBillingAccount.objects.filter(tenant_id=t).count()
    created_accounts = invoiced = collected = scholarships = 0

    for idx, st in enumerate(students, start=1):
        acc = StudentBillingAccount.objects.filter(tenant_id=t, student_id=st.id).first()
        if not acc:
            acc = StudentBillingAccount.objects.create(
                tenant_id=t, student_id=st.id,
                account_number=f"SF-2026-{str(existing + created_accounts + 1).zfill(4)}",
            )
            created_accounts += 1

        # منحة لبعض الطلاب (كل ثالث طالب منحة تفوق 25%)
        if idx % 3 == 0:
            try:
                ScholarshipService.apply_scholarship(
                    tenant_id=t, billing_account_id=acc.id, name="منحة تفوق أكاديمي",
                    scholarship_type="merit", amount_percentage=25, fixed_amount=0,
                    start_date=datetime.date(2026, 1, 1), end_date=None, user_id=None,
                )
                scholarships += 1
            except Exception as e:
                print(f"  منحة {st.student_number}: {e}")

        # إصدار فاتورة (يُرحّل قيد استحقاق في المالية)
        if not acc.invoices.exists():
            try:
                inv = BillingService.generate_student_invoice(
                    tenant_id=t, billing_account_id=acc.id, fee_structures=invoice_structs,
                    due_date=datetime.date(2026, 3, 1), user_id=None,
                )
                invoiced += 1
                # تحصيل دفعة جزئية (60%) للطلاب الزوجيين — يولّد سند قبض في المالية
                if idx % 2 == 0:
                    PaymentService.receive_payment(
                        tenant_id=t, billing_account_id=acc.id,
                        amount=float(inv.total_amount) * 0.6, payment_method_id=pm.id,
                        cash_box_id=cash_box.id, bank_account_id=None, user_id=None,
                    )
                    collected += 1
            except Exception as e:
                print(f"  فاتورة {st.student_number}: {e}")

    print(f"حسابات مفتوحة: {created_accounts} | فواتير: {invoiced} | تحصيلات: {collected} | منح: {scholarships}")
    print("اكتملت بذرة فوترة الطلاب بنجاح.")


if __name__ == "__main__":
    run()
