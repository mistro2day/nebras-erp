# -*- coding: utf-8 -*-
"""
تهيئة النظام المالي الافتراضي لكل مستأجر (Finance Provisioning)

يوفّر الدليل المحاسبي القياسي المعروف لأنظمة المدارس والمؤسسات التعليمية،
إضافة إلى البيانات المرجعية (أنواع الحسابات، العملات، طرق الدفع، الضرائب، الإعدادات).

يُستدعى تلقائياً عند إنشاء أي مستأجر جديد (عبر إشارة post_save في apps/finance/signals.py)
كما يُستخدم من أمر الإدارة provision_finance ومن سكربت البذرة seed_finance.py.

كل العمليات idempotent (get_or_create) فلا تُكرّر البيانات عند إعادة التشغيل.
"""
from decimal import Decimal


# ── أنواع الحسابات الخمسة الأساسية ──────────────────────────────
# (code, name_ar, name_en, normal_balance)
STANDARD_ACCOUNT_TYPES = [
    ("asset", "الأصول", "Assets", "debit"),
    ("liability", "الخصوم والالتزامات", "Liabilities", "credit"),
    ("equity", "حقوق الملكية", "Equity", "credit"),
    ("revenue", "الإيرادات", "Revenue", "credit"),
    ("expense", "المصروفات", "Expenses", "debit"),
]

# ── تصنيفات الحسابات ────────────────────────────────────────────
# (code, name_ar, name_en, account_type_code)
STANDARD_CATEGORIES = [
    ("current_assets", "أصول متداولة", "Current Assets", "asset"),
    ("fixed_assets", "أصول ثابتة", "Fixed Assets", "asset"),
    ("current_liabilities", "خصوم متداولة", "Current Liabilities", "liability"),
    ("long_term_liabilities", "خصوم طويلة الأجل", "Long-term Liabilities", "liability"),
    ("capital", "رأس المال والاحتياطيات", "Capital & Reserves", "equity"),
    ("tuition_revenue", "إيرادات الرسوم الدراسية", "Tuition Revenue", "revenue"),
    ("other_revenue", "إيرادات أخرى", "Other Revenue", "revenue"),
    ("payroll_expense", "مصروفات الرواتب", "Payroll Expenses", "expense"),
    ("educational_expense", "مصروفات تعليمية وتشغيلية", "Educational & Operating Expenses", "expense"),
    ("admin_expense", "مصروفات إدارية وعمومية", "Administrative Expenses", "expense"),
]

# ── دليل الحسابات القياسي للمدارس (Standard School Chart of Accounts) ──
# (code, name_ar, name_en, type_code, category_code|None, parent_code|None, is_control)
STANDARD_COA = [
    # ═══ 1000 الأصول ═══
    ("1000", "الأصول", "Assets", "asset", None, None, True),
    ("1100", "الأصول المتداولة", "Current Assets", "asset", "current_assets", "1000", True),
    ("1101", "الصندوق النقدي", "Cash on Hand", "asset", "current_assets", "1100", False),
    ("1102", "النقد لدى البنوك", "Cash at Bank", "asset", "current_assets", "1100", False),
    ("1103", "ذمم الطلاب المدينة (رسوم مستحقة)", "Students / Tuition Receivable", "asset", "current_assets", "1100", False),
    ("1104", "أرصدة مدينة أخرى", "Other Receivables", "asset", "current_assets", "1100", False),
    ("1105", "السلف والعُهد", "Advances & Custody", "asset", "current_assets", "1100", False),
    ("1106", "المخزون (لوازم وكتب مدرسية)", "Inventory (Supplies & Books)", "asset", "current_assets", "1100", False),
    ("1107", "مصروفات مدفوعة مقدماً", "Prepaid Expenses", "asset", "current_assets", "1100", False),
    ("1200", "الأصول الثابتة", "Fixed Assets", "asset", "fixed_assets", "1000", True),
    ("1201", "الأراضي", "Land", "asset", "fixed_assets", "1200", False),
    ("1202", "المباني والإنشاءات", "Buildings", "asset", "fixed_assets", "1200", False),
    ("1203", "الأثاث والتجهيزات المدرسية", "Furniture & Fixtures", "asset", "fixed_assets", "1200", False),
    ("1204", "أجهزة الحاسب والتقنية", "Computers & IT Equipment", "asset", "fixed_assets", "1200", False),
    ("1205", "وسائل النقل والحافلات المدرسية", "Vehicles & School Buses", "asset", "fixed_assets", "1200", False),
    ("1206", "المعامل والمختبرات", "Labs & Equipment", "asset", "fixed_assets", "1200", False),
    ("1207", "مجمّع إهلاك الأصول الثابتة", "Accumulated Depreciation", "asset", "fixed_assets", "1200", False),

    # ═══ 2000 الخصوم والالتزامات ═══
    ("2000", "الخصوم والالتزامات", "Liabilities", "liability", None, None, True),
    ("2100", "الخصوم المتداولة", "Current Liabilities", "liability", "current_liabilities", "2000", True),
    ("2101", "ذمم الموردين الدائنة", "Accounts Payable", "liability", "current_liabilities", "2100", False),
    ("2102", "رواتب مستحقة الدفع", "Salaries Payable", "liability", "current_liabilities", "2100", False),
    ("2103", "ضريبة القيمة المضافة المستحقة", "VAT Payable", "liability", "current_liabilities", "2100", False),
    ("2104", "استقطاعات وتأمينات الموظفين", "Employee Deductions & Insurance", "liability", "current_liabilities", "2100", False),
    ("2105", "رسوم دراسية مقبوضة مقدماً", "Unearned / Deferred Tuition", "liability", "current_liabilities", "2100", False),
    ("2106", "أمانات وتأمينات مستردة", "Refundable Deposits", "liability", "current_liabilities", "2100", False),
    ("2107", "مصروفات مستحقة", "Accrued Expenses", "liability", "current_liabilities", "2100", False),
    ("2200", "الخصوم طويلة الأجل", "Long-term Liabilities", "liability", "long_term_liabilities", "2000", True),
    ("2201", "قروض طويلة الأجل", "Long-term Loans", "liability", "long_term_liabilities", "2200", False),

    # ═══ 3000 حقوق الملكية ═══
    ("3000", "حقوق الملكية", "Equity", "equity", None, None, True),
    ("3100", "رأس المال", "Capital", "equity", "capital", "3000", False),
    ("3200", "الأرباح المحتجزة / الفائض المرحّل", "Retained Earnings / Accumulated Surplus", "equity", "capital", "3000", False),
    ("3300", "صافي فائض (عجز) العام الحالي", "Current Year Surplus / Deficit", "equity", "capital", "3000", False),

    # ═══ 4000 الإيرادات ═══
    ("4000", "الإيرادات", "Revenue", "revenue", None, None, True),
    ("4100", "إيرادات الرسوم الدراسية", "Tuition Fees Revenue", "revenue", "tuition_revenue", "4000", True),
    ("4101", "رسوم التسجيل والقبول", "Registration & Admission Fees", "revenue", "tuition_revenue", "4100", False),
    ("4102", "رسوم النقل المدرسي", "Transportation Fees", "revenue", "tuition_revenue", "4100", False),
    ("4103", "رسوم الأنشطة والرحلات", "Activities & Trips Fees", "revenue", "tuition_revenue", "4100", False),
    ("4104", "رسوم الزي والكتب", "Uniform & Books Revenue", "revenue", "tuition_revenue", "4100", False),
    ("4105", "رسوم المقصف والإعاشة", "Cafeteria & Meals Revenue", "revenue", "tuition_revenue", "4100", False),
    ("4106", "رسوم الدروس التقوية", "Extra Classes Fees", "revenue", "tuition_revenue", "4100", False),
    ("4200", "إيرادات أخرى", "Other Income", "revenue", "other_revenue", "4000", True),
    ("4201", "التبرعات والمنح", "Donations & Grants", "revenue", "other_revenue", "4200", False),
    ("4202", "إيرادات استثمارية", "Investment Income", "revenue", "other_revenue", "4200", False),

    # ═══ 5000 المصروفات ═══
    ("5000", "المصروفات", "Expenses", "expense", None, None, True),
    ("5100", "مصروفات الرواتب والأجور", "Payroll Expenses", "expense", "payroll_expense", "5000", True),
    ("5101", "رواتب الهيئة التدريسية", "Teaching Staff Salaries", "expense", "payroll_expense", "5100", False),
    ("5102", "رواتب الإداريين والعاملين", "Administrative Staff Salaries", "expense", "payroll_expense", "5100", False),
    ("5103", "مكافآت وحوافز", "Bonuses & Incentives", "expense", "payroll_expense", "5100", False),
    ("5104", "التأمينات الاجتماعية", "Social Insurance", "expense", "payroll_expense", "5100", False),
    ("5200", "المصروفات التعليمية والتشغيلية", "Educational & Operating Expenses", "expense", "educational_expense", "5000", True),
    ("5201", "مستلزمات تعليمية وقرطاسية", "Educational Supplies & Stationery", "expense", "educational_expense", "5200", False),
    ("5202", "الكتب والمناهج", "Books & Curriculum", "expense", "educational_expense", "5200", False),
    ("5203", "مصاريف المختبرات والأنشطة", "Labs & Activities Expenses", "expense", "educational_expense", "5200", False),
    ("5204", "مصاريف النقل المدرسي", "Transportation Expenses", "expense", "educational_expense", "5200", False),
    ("5205", "مصاريف المقصف والإعاشة", "Cafeteria Expenses", "expense", "educational_expense", "5200", False),
    ("5300", "المصروفات الإدارية والعمومية", "Administrative Expenses", "expense", "admin_expense", "5000", True),
    ("5301", "الإيجارات", "Rent", "expense", "admin_expense", "5300", False),
    ("5302", "الكهرباء والمياه والاتصالات", "Utilities", "expense", "admin_expense", "5300", False),
    ("5303", "الصيانة والإصلاحات", "Maintenance & Repairs", "expense", "admin_expense", "5300", False),
    ("5304", "التسويق والدعاية", "Marketing & Advertising", "expense", "admin_expense", "5300", False),
    ("5305", "المصاريف البنكية", "Bank Charges", "expense", "admin_expense", "5300", False),
    ("5306", "إهلاك الأصول الثابتة", "Depreciation Expense", "expense", "admin_expense", "5300", False),
    ("5307", "مصاريف النظافة والأمن", "Cleaning & Security", "expense", "admin_expense", "5300", False),
]

# ── العملات المعتمدة ────────────────────────────────────────────
# (code, name_ar, name_en, symbol, is_base)
STANDARD_CURRENCIES = [
    ("SDG", "جنيه سوداني", "Sudanese Pound", "ج.س", True),
    ("USD", "دولار أمريكي", "US Dollar", "$", False),
    ("SAR", "ريال سعودي", "Saudi Riyal", "ر.س", False),
]

# ── طرق الدفع ───────────────────────────────────────────────────
STANDARD_PAYMENT_METHODS = [
    ("cash", "نقداً", "Cash"),
    ("bank_transfer", "تحويل بنكي", "Bank Transfer"),
    ("cheque", "شيك", "Cheque"),
    ("card", "بطاقة مصرفية", "Card"),
    ("online", "دفع إلكتروني", "Online Payment"),
]

# ── الضرائب ─────────────────────────────────────────────────────
# (code, name_ar, name_en, rate, type, gl_account_code)
STANDARD_TAXES = [
    ("VAT15", "ضريبة القيمة المضافة", "VAT", Decimal("15.00"), "vat", "2103"),
    ("WHT5", "ضريبة الاستقطاع", "Withholding Tax", Decimal("5.00"), "withholding", "2103"),
]


def provision_finance_defaults(tenant_id):
    """
    تُهيّئ الدليل المحاسبي والبيانات المرجعية القياسية لمستأجر معيّن.
    آمنة لإعادة التشغيل (idempotent). تُرجع ملخّصاً بعدد العناصر المُنشأة.
    """
    from apps.finance.domain.models import (
        AccountType, AccountCategory, ChartOfAccount, Currency, PaymentMethod,
        Tax, FinanceSettings,
    )

    summary = {"types": 0, "categories": 0, "accounts": 0, "currencies": 0, "payment_methods": 0, "taxes": 0}

    # 1) أنواع الحسابات
    types = {}
    for code, ar, en, bal in STANDARD_ACCOUNT_TYPES:
        obj, created = AccountType.objects.get_or_create(
            tenant_id=tenant_id, code=code,
            defaults={"name_ar": ar, "name_en": en, "normal_balance": bal},
        )
        types[code] = obj
        summary["types"] += int(created)

    # 2) التصنيفات
    cats = {}
    for code, ar, en, tcode in STANDARD_CATEGORIES:
        obj, created = AccountCategory.objects.get_or_create(
            tenant_id=tenant_id, code=code,
            defaults={"name_ar": ar, "name_en": en, "account_type": types[tcode]},
        )
        cats[code] = obj
        summary["categories"] += int(created)

    # 3) شجرة الحسابات (مرتّبة بحيث يسبق الأب أبناءه)
    coa = {}
    for code, ar, en, tcode, catcode, parent, control in STANDARD_COA:
        obj, created = ChartOfAccount.objects.get_or_create(
            tenant_id=tenant_id, code=code,
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
        summary["accounts"] += int(created)

    # 4) العملات
    base_cur = None
    for code, ar, en, sym, is_base in STANDARD_CURRENCIES:
        obj, created = Currency.objects.get_or_create(
            tenant_id=tenant_id, code=code,
            defaults={"name_ar": ar, "name_en": en, "symbol": sym, "is_base": is_base},
        )
        summary["currencies"] += int(created)
        if obj.is_base:
            base_cur = obj
    if base_cur is None:
        base_cur = Currency.objects.filter(tenant_id=tenant_id).first()

    # 5) طرق الدفع
    for code, ar, en in STANDARD_PAYMENT_METHODS:
        _, created = PaymentMethod.objects.get_or_create(
            tenant_id=tenant_id, code=code, defaults={"name_ar": ar, "name_en": en},
        )
        summary["payment_methods"] += int(created)

    # 6) الضرائب
    for code, ar, en, rate, ttype, gl_code in STANDARD_TAXES:
        _, created = Tax.objects.get_or_create(
            tenant_id=tenant_id, code=code,
            defaults={"name_ar": ar, "name_en": en, "rate_percentage": rate, "type": ttype, "gl_account": coa[gl_code]},
        )
        summary["taxes"] += int(created)

    # 7) الإعدادات المالية الافتراضية
    if base_cur:
        FinanceSettings.objects.get_or_create(
            tenant_id=tenant_id, base_currency=base_cur,
            defaults={"default_retained_earnings_account": coa.get("3200")},
        )

    return summary
