# -*- coding: utf-8 -*-
"""
بذرة بيانات النظام المالي (Finance Seed)

تُهيّئ الدليل المحاسبي القياسي للمدارس والبيانات المرجعية عبر خدمة التهيئة المشتركة
(apps.finance.application.provisioning) — نفس ما يُنشأ تلقائياً لكل مستأجر جديد —
ثم تضيف بيانات تجريبية (بنوك/صناديق، مراكز تكلفة، سنة مالية وفتراتها، موازنة، وقيوداً مرحّلة).

التشغيل:  ./backend/venv/Scripts/python.exe backend/seed_finance.py
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
from apps.finance.domain.models import (
    ChartOfAccount, Currency, CostCenter, Bank, BankAccount, CashBox,
    FiscalYear, AccountingPeriod, Budget, BudgetItem, JournalEntry, JournalEntryLine,
)
from apps.finance.application.provisioning import provision_finance_defaults


def gc(model, tenant_id, defaults=None, **lookup):
    obj, created = model.objects.get_or_create(tenant_id=tenant_id, **lookup, defaults=defaults or {})
    return obj, created


def run():
    tenant = Tenant.objects.filter(name="Nebras").first() or Tenant.objects.first()
    if not tenant:
        print("لا يوجد مستأجر (Tenant) في النظام!")
        return
    t = tenant.id
    print(f"المستأجر: {tenant.name} ({t})")

    # 1) البيانات المرجعية والدليل المحاسبي القياسي (عبر خدمة التهيئة المشتركة)
    summary = provision_finance_defaults(t)
    print(f"التهيئة القياسية: {summary}")

    coa = {a.code: a for a in ChartOfAccount.objects.filter(tenant_id=t)}
    base_cur = Currency.objects.filter(tenant_id=t, is_base=True).first() or Currency.objects.filter(tenant_id=t).first()

    # 2) مراكز التكلفة (تجريبية)
    cc_data = [
        ("CC-100", "الإدارة العامة", "General Administration", "department"),
        ("CC-200", "المرحلة الابتدائية", "Primary Stage", "department"),
        ("CC-300", "المرحلة الثانوية", "Secondary Stage", "department"),
        ("CC-400", "الأنشطة والفعاليات", "Activities", "activity"),
    ]
    for code, ar, en, ty in cc_data:
        gc(CostCenter, t, code=code, defaults={"name_ar": ar, "name_en": en, "type": ty, "budget_allocated": Decimal("500000.00")})
    print(f"مراكز التكلفة: {CostCenter.objects.filter(tenant_id=t).count()}")

    # 3) البنوك والحسابات البنكية والصناديق
    bank, _ = gc(Bank, t, code="BOK", defaults={"name_ar": "بنك الخرطوم", "name_en": "Bank of Khartoum", "swift_code": "BKHRSDKH"})
    gc(BankAccount, t, account_number="0011002233", defaults={"bank": bank, "iban": "SD0100110022330000", "currency": base_cur, "gl_account": coa["1102"]})
    gc(CashBox, t, name_en="Main Cash Box", defaults={"name_ar": "الخزينة الرئيسية", "currency": base_cur, "gl_account": coa["1101"], "custodian_id": tenant.id})
    print(f"البنوك: {Bank.objects.filter(tenant_id=t).count()} — حسابات: {BankAccount.objects.filter(tenant_id=t).count()} — صناديق: {CashBox.objects.filter(tenant_id=t).count()}")

    # 4) السنة المالية والفترات
    fy, _ = gc(FiscalYear, t, name="السنة المالية 2026", defaults={"start_date": datetime.date(2026, 1, 1), "end_date": datetime.date(2026, 12, 31), "status": "open", "is_current": True})
    months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
    for i, mo in enumerate(months, start=1):
        last = 31 if i in (1, 3, 5, 7, 8, 10, 12) else (28 if i == 2 else 30)
        gc(AccountingPeriod, t, fiscal_year=fy, name=f"{mo} 2026",
           defaults={"start_date": datetime.date(2026, i, 1), "end_date": datetime.date(2026, i, last), "status": "open"})
    print(f"السنة المالية: {fy.name} — الفترات: {AccountingPeriod.objects.filter(tenant_id=t, fiscal_year=fy).count()}")

    # 5) موازنة تقديرية تجريبية معتمدة
    admin_cc = CostCenter.objects.filter(tenant_id=t, code="CC-100").first()
    budget, bcreated = gc(Budget, t, fiscal_year=fy, cost_center=admin_cc, defaults={"name": "موازنة التشغيل 2026", "status": "approved"})
    if bcreated:
        BudgetItem.objects.create(tenant_id=t, budget=budget, account=coa["5101"], amount=Decimal("600000"), consumed_amount=Decimal("150000"))
        BudgetItem.objects.create(tenant_id=t, budget=budget, account=coa["5301"], amount=Decimal("200000"), consumed_amount=Decimal("70000"))
    print(f"الموازنة التجريبية: {budget.name}")

    # 6) قيود يومية تجريبية مرحّلة (تولّد حركات دفتر الأستاذ والإحصائيات)
    demo_transactions(t, fy, base_cur, coa)

    print("\nاكتملت بذرة البيانات المالية بنجاح.")


def demo_transactions(t, fy, base_cur, coa):
    from apps.finance.application.services import PostingService

    if JournalEntry.objects.filter(tenant_id=t, source_type='manual').exists():
        print("القيود التجريبية: موجودة مسبقاً — تم التخطي.")
        return

    jan = AccountingPeriod.objects.filter(tenant_id=t, fiscal_year=fy).order_by('start_date').first()
    if not jan:
        print("لا توجد فترة محاسبية — تخطي القيود التجريبية.")
        return

    entries = [
        ("JV-1001", datetime.date(2026, 1, 5), "إيداع رأس المال الافتتاحي", [("1102", 2000000, 0), ("3100", 0, 2000000)]),
        ("JV-1002", datetime.date(2026, 1, 10), "تحصيل رسوم دراسية", [("1102", 850000, 0), ("4100", 0, 850000)]),
        ("JV-1003", datetime.date(2026, 1, 28), "صرف رواتب الهيئة التدريسية", [("5101", 150000, 0), ("1102", 0, 150000)]),
        ("JV-1004", datetime.date(2026, 1, 30), "إيجار المبنى المدرسي", [("5301", 70000, 0), ("1101", 0, 70000)]),
    ]
    posted = 0
    for num, dt, desc, lines in entries:
        je = JournalEntry.objects.create(
            tenant_id=t, entry_number=num, date=dt, accounting_period=jan,
            description=desc, source_type='manual', status='approved',
            currency=base_cur, exchange_rate=Decimal("1"),
        )
        for code, dr, cr in lines:
            JournalEntryLine.objects.create(
                tenant_id=t, journal_entry=je, account=coa[code],
                debit=Decimal(str(dr)), credit=Decimal(str(cr)),
            )
        try:
            PostingService.post_journal_entry(t, je.id, None)
            posted += 1
        except Exception as e:
            print(f"  تعذّر ترحيل {num}: {e}")
    print(f"القيود التجريبية المرحّلة: {posted}")


if __name__ == "__main__":
    run()
