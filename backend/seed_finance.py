# -*- coding: utf-8 -*-
"""
بذرة بيانات النظام المالي (Finance Seed)
تُنشئ البيانات المرجعية والتجريبية: أنواع الحسابات، التصنيفات، العملات، طرق الدفع،
شجرة حسابات واقعية، مراكز التكلفة، الضرائب، البنوك والصناديق، السنة المالية وفتراتها.
التشغيل:  python seed_finance.py
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
    AccountType, AccountCategory, Currency, PaymentMethod, ChartOfAccount,
    CostCenter, Tax, Bank, BankAccount, CashBox, FiscalYear, AccountingPeriod,
    FinanceSettings, Budget, BudgetItem, JournalEntry, JournalEntryLine,
)


def gc(model, tenant_id, defaults=None, **lookup):
    """get_or_create مع عزل المستأجر."""
    obj, created = model.objects.get_or_create(tenant_id=tenant_id, **lookup, defaults=defaults or {})
    return obj, created


def run():
    tenant = Tenant.objects.filter(name="Nebras").first() or Tenant.objects.first()
    if not tenant:
        print("لا يوجد مستأجر (Tenant) في النظام!")
        return
    t = tenant.id
    print(f"المستأجر: {tenant.name} ({t})")

    # 1) أنواع الحسابات
    types_data = [
        ("asset", "الأصول", "Assets", "debit"),
        ("liability", "الخصوم والالتزامات", "Liabilities", "credit"),
        ("equity", "حقوق الملكية", "Equity", "credit"),
        ("revenue", "الإيرادات", "Revenue", "credit"),
        ("expense", "المصروفات", "Expenses", "debit"),
    ]
    types = {}
    for code, ar, en, bal in types_data:
        obj, _ = gc(AccountType, t, code=code, defaults={"name_ar": ar, "name_en": en, "normal_balance": bal})
        types[code] = obj
    print(f"أنواع الحسابات: {len(types)}")

    # 2) تصنيفات الحسابات
    cats_data = [
        ("current_assets", "أصول متداولة", "Current Assets", "asset"),
        ("fixed_assets", "أصول ثابتة", "Fixed Assets", "asset"),
        ("current_liabilities", "خصوم متداولة", "Current Liabilities", "liability"),
        ("capital", "رأس المال", "Capital", "equity"),
        ("operating_revenue", "إيرادات تشغيلية", "Operating Revenue", "revenue"),
        ("operating_expense", "مصروفات تشغيلية", "Operating Expense", "expense"),
    ]
    cats = {}
    for code, ar, en, tcode in cats_data:
        obj, _ = gc(AccountCategory, t, code=code, defaults={"name_ar": ar, "name_en": en, "account_type": types[tcode]})
        cats[code] = obj
    print(f"التصنيفات: {len(cats)}")

    # 3) العملات
    cur_data = [
        ("SDG", "جنيه سوداني", "Sudanese Pound", "ج.س", True),
        ("USD", "دولار أمريكي", "US Dollar", "$", False),
        ("SAR", "ريال سعودي", "Saudi Riyal", "ر.س", False),
    ]
    base_cur = None
    for code, ar, en, sym, is_base in cur_data:
        obj, _ = gc(Currency, t, code=code, defaults={"name_ar": ar, "name_en": en, "symbol": sym, "is_base": is_base})
        if is_base:
            base_cur = obj
    print(f"العملات: {Currency.objects.filter(tenant_id=t).count()} — الأساسية: {base_cur.code}")

    # 4) طرق الدفع
    pm_data = [
        ("cash", "نقداً", "Cash"),
        ("bank_transfer", "تحويل بنكي", "Bank Transfer"),
        ("cheque", "شيك", "Cheque"),
        ("card", "بطاقة مصرفية", "Card"),
    ]
    for code, ar, en in pm_data:
        gc(PaymentMethod, t, code=code, defaults={"name_ar": ar, "name_en": en})
    print(f"طرق الدفع: {PaymentMethod.objects.filter(tenant_id=t).count()}")

    # 5) شجرة الحسابات (رئيسية ثم فرعية)
    coa = {}

    def acc(code, ar, en, tcode, catcode=None, parent=None, control=False):
        obj, _ = gc(
            ChartOfAccount, t, code=code,
            defaults={
                "name_ar": ar, "name_en": en, "account_type": types[tcode],
                "account_category": cats.get(catcode) if catcode else None,
                "parent": coa.get(parent) if parent else None,
                "normal_balance": types[tcode].normal_balance,
                "is_control_account": control,
                "is_sub_account": parent is not None,
            },
        )
        coa[code] = obj
        return obj

    # رئيسية
    acc("1000", "الأصول", "Assets", "asset", control=True)
    acc("1100", "الأصول المتداولة", "Current Assets", "asset", "current_assets", "1000", True)
    acc("1101", "الصندوق النقدي", "Cash on Hand", "asset", "current_assets", "1100")
    acc("1102", "البنك", "Bank", "asset", "current_assets", "1100")
    acc("1103", "المدينون (ذمم مدينة)", "Accounts Receivable", "asset", "current_assets", "1100")
    acc("1200", "الأصول الثابتة", "Fixed Assets", "asset", "fixed_assets", "1000", True)
    acc("1201", "الأثاث والتجهيزات", "Furniture & Equipment", "asset", "fixed_assets", "1200")

    acc("2000", "الخصوم والالتزامات", "Liabilities", "liability", control=True)
    acc("2100", "الدائنون (ذمم دائنة)", "Accounts Payable", "liability", "current_liabilities", "2000")
    acc("2200", "ضريبة القيمة المضافة المستحقة", "VAT Payable", "liability", "current_liabilities", "2000")

    acc("3000", "حقوق الملكية", "Equity", "equity", control=True)
    acc("3100", "رأس المال", "Capital", "equity", "capital", "3000")
    acc("3200", "الأرباح المحتجزة", "Retained Earnings", "equity", "capital", "3000")

    acc("4000", "الإيرادات", "Revenue", "revenue", control=True)
    acc("4100", "إيرادات الرسوم الدراسية", "Tuition Revenue", "revenue", "operating_revenue", "4000")
    acc("4200", "إيرادات أخرى", "Other Revenue", "revenue", "operating_revenue", "4000")

    acc("5000", "المصروفات", "Expenses", "expense", control=True)
    acc("5100", "الرواتب والأجور", "Salaries & Wages", "expense", "operating_expense", "5000")
    acc("5200", "مصاريف إدارية وعمومية", "Administrative Expenses", "expense", "operating_expense", "5000")
    acc("5300", "مصاريف صيانة وخدمات", "Maintenance & Utilities", "expense", "operating_expense", "5000")
    print(f"شجرة الحسابات: {ChartOfAccount.objects.filter(tenant_id=t).count()} حساب")

    # 6) مراكز التكلفة
    cc_data = [
        ("CC-100", "الإدارة العامة", "General Administration", "department"),
        ("CC-200", "المرحلة الابتدائية", "Primary Stage", "department"),
        ("CC-300", "المرحلة الثانوية", "Secondary Stage", "department"),
        ("CC-400", "الأنشطة والفعاليات", "Activities", "activity"),
    ]
    for code, ar, en, ty in cc_data:
        gc(CostCenter, t, code=code, defaults={"name_ar": ar, "name_en": en, "type": ty, "budget_allocated": Decimal("500000.00")})
    print(f"مراكز التكلفة: {CostCenter.objects.filter(tenant_id=t).count()}")

    # 7) الضرائب
    gc(Tax, t, code="VAT15", defaults={"name_ar": "ضريبة القيمة المضافة", "name_en": "VAT", "rate_percentage": Decimal("15.00"), "type": "vat", "gl_account": coa["2200"]})
    gc(Tax, t, code="WHT5", defaults={"name_ar": "ضريبة الاستقطاع", "name_en": "Withholding Tax", "rate_percentage": Decimal("5.00"), "type": "withholding", "gl_account": coa["2200"]})
    print(f"الضرائب: {Tax.objects.filter(tenant_id=t).count()}")

    # 8) البنوك والحسابات البنكية والصناديق
    bank, _ = gc(Bank, t, code="BOK", defaults={"name_ar": "بنك الخرطوم", "name_en": "Bank of Khartoum", "swift_code": "BKHRSDKH"})
    gc(BankAccount, t, account_number="0011002233", defaults={"bank": bank, "iban": "SD0100110022330000", "currency": base_cur, "gl_account": coa["1102"]})
    gc(CashBox, t, name_en="Main Cash Box", defaults={"name_ar": "الخزينة الرئيسية", "currency": base_cur, "gl_account": coa["1101"], "custodian_id": tenant.id})
    print(f"البنوك: {Bank.objects.filter(tenant_id=t).count()} — حسابات: {BankAccount.objects.filter(tenant_id=t).count()} — صناديق: {CashBox.objects.filter(tenant_id=t).count()}")

    # 9) السنة المالية والفترات
    year_name = "السنة المالية 2026"
    fy, _ = gc(FiscalYear, t, name=year_name, defaults={"start_date": datetime.date(2026, 1, 1), "end_date": datetime.date(2026, 12, 31), "status": "open", "is_current": True})
    months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
    for i, mo in enumerate(months, start=1):
        last = 31 if i in (1, 3, 5, 7, 8, 10, 12) else (28 if i == 2 else 30)
        gc(AccountingPeriod, t, fiscal_year=fy, name=f"{mo} 2026",
           defaults={"start_date": datetime.date(2026, i, 1), "end_date": datetime.date(2026, i, last), "status": "open"})
    print(f"السنة المالية: {fy.name} — الفترات: {AccountingPeriod.objects.filter(tenant_id=t, fiscal_year=fy).count()}")

    # 10) الإعدادات المالية
    gc(FinanceSettings, t, defaults={"base_currency": base_cur, "default_retained_earnings_account": coa["3200"]}, base_currency=base_cur)
    print("الإعدادات المالية: تم")

    # 11) موازنة تقديرية تجريبية معتمدة
    admin_cc = CostCenter.objects.filter(tenant_id=t, code="CC-100").first()
    budget, bcreated = gc(Budget, t, fiscal_year=fy, cost_center=admin_cc, defaults={"name": "موازنة التشغيل 2026", "status": "approved"})
    if bcreated:
        BudgetItem.objects.create(tenant_id=t, budget=budget, account=coa["5100"], amount=Decimal("600000"), consumed_amount=Decimal("150000"))
        BudgetItem.objects.create(tenant_id=t, budget=budget, account=coa["5200"], amount=Decimal("200000"), consumed_amount=Decimal("70000"))
    print(f"الموازنة التجريبية: {budget.name}")

    # 12) قيود يومية تجريبية مرحّلة (تولّد حركات دفتر الأستاذ والإحصائيات)
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
        ("JV-1003", datetime.date(2026, 1, 28), "صرف رواتب شهر يناير", [("5100", 150000, 0), ("1102", 0, 150000)]),
        ("JV-1004", datetime.date(2026, 1, 30), "مصاريف إدارية وخدمات", [("5200", 70000, 0), ("1101", 0, 70000)]),
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
