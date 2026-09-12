"""
تعريفات الفئات الشاملة لموافقات نظام نبراس ERP
تغطي جميع المسارات الـ 22 المنشأة عبر كافة قطاعات النظام
"""

APPROVAL_CATEGORIES_CATALOG = [
    # 1. المالية والمحاسبة (Finance & Accounting)
    {
        "code": "journal_entry",
        "name_ar": "قيود اليومية العامة",
        "name_en": "Journal Entries",
        "module": "finance",
        "module_name_ar": "المالية والمحاسبة",
        "icon": "📑",
    },
    {
        "code": "voucher",
        "name_ar": "السندات المالية (صرف/قبض)",
        "name_en": "Payment & Receipt Vouchers",
        "module": "finance",
        "module_name_ar": "المالية والمحاسبة",
        "icon": "💵",
    },
    {
        "code": "bank_transaction",
        "name_ar": "التحويلات والحركات البنكية",
        "name_en": "Bank Transactions",
        "module": "finance",
        "module_name_ar": "المالية والمحاسبة",
        "icon": "🏦",
    },
    {
        "code": "budget",
        "name_ar": "الموازنات التقديرية",
        "name_en": "Budget Allocations",
        "module": "finance",
        "module_name_ar": "المالية والمحاسبة",
        "icon": "📊",
    },

    # 2. المشتريات والعقود (Procurement)
    {
        "code": "purchase_request",
        "name_ar": "طلبات الشراء والاحتياج",
        "name_en": "Purchase Requests",
        "module": "procurement",
        "module_name_ar": "المشتريات وسلاسل الإمداد",
        "icon": "🛒",
    },
    {
        "code": "purchase_order",
        "name_ar": "أوامر الشراء والتعميد",
        "name_en": "Purchase Orders",
        "module": "procurement",
        "module_name_ar": "المشتريات وسلاسل الإمداد",
        "icon": "📝",
    },

    # 3. الموارد البشرية والرواتب (HR & Payroll)
    {
        "code": "payroll_run",
        "name_ar": "مسيرات الرواتب الشهرية",
        "name_en": "Monthly Payroll Runs",
        "module": "payroll",
        "module_name_ar": "الرواتب والمستحقات",
        "icon": "💰",
    },
    {
        "code": "employee_loan",
        "name_ar": "سلف وقروض الموظفين",
        "name_en": "Employee Loans",
        "module": "hr",
        "module_name_ar": "الموارد البشرية",
        "icon": "🤝",
    },
    {
        "code": "attendance_correction",
        "name_ar": "تصحيح واستدراك البصمة والدوام",
        "name_en": "Attendance Corrections",
        "module": "hr",
        "module_name_ar": "الموارد البشرية",
        "icon": "⏰",
    },
    {
        "code": "attendance_sheet",
        "name_ar": "اعتماد كشوف الحضور والانصراف",
        "name_en": "Attendance Sheets",
        "module": "hr",
        "module_name_ar": "الموارد البشرية",
        "icon": "📅",
    },

    # 4. المستودعات والمخزون (Inventory)
    {
        "code": "inventory_transfer",
        "name_ar": "التحويلات المخزنية بين الفروع",
        "name_en": "Inventory Transfers",
        "module": "inventory",
        "module_name_ar": "المستودعات والمخزون",
        "icon": "🔄",
    },
    {
        "code": "inventory_adjustment",
        "name_ar": "تسويات وفروقات الجرد المخزني",
        "name_en": "Inventory Adjustments",
        "module": "inventory",
        "module_name_ar": "المستودعات والمخزون",
        "icon": "⚖️",
    },

    # 5. الأصول الثابتة (Fixed Assets)
    {
        "code": "asset_transfer",
        "name_ar": "مناقلات ونقل الأصول",
        "name_en": "Asset Transfers",
        "module": "assets",
        "module_name_ar": "الأصول الثابتة",
        "icon": "🚚",
    },
    {
        "code": "asset_disposal",
        "name_ar": "استبعاد وتخريد الأصول",
        "name_en": "Asset Disposals",
        "module": "assets",
        "module_name_ar": "الأصول الثابتة",
        "icon": "🗑️",
    },

    # 6. شؤون الطلاب والتعليم (Students & Academics)
    {
        "code": "applicant",
        "name_ar": "طلبات قبول الطلاب الجدد",
        "name_en": "Student Admissions",
        "module": "students",
        "module_name_ar": "شؤون الطلاب",
        "icon": "🎓",
    },
    {
        "code": "student_withdrawal",
        "name_ar": "طلبات انسحاب وإخلاء طرف طالب",
        "name_en": "Student Withdrawals",
        "module": "students",
        "module_name_ar": "شؤون الطلاب",
        "icon": "🚪",
    },
    {
        "code": "invoice_adjustment",
        "name_ar": "تسويات وتعديلات فواتير الطلاب",
        "name_en": "Student Invoice Adjustments",
        "module": "student_finance",
        "module_name_ar": "مالية الطلاب والرسوم",
        "icon": "🧾",
    },
    {
        "code": "financial_aid",
        "name_ar": "المنح والإعفاءات المالية",
        "name_en": "Financial Aid & Discounts",
        "module": "student_finance",
        "module_name_ar": "مالية الطلاب والرسوم",
        "icon": "🎁",
    },
    {
        "code": "mark_approval",
        "name_ar": "اعتماد ورصد الدرجات والكنترول",
        "name_en": "Exam Marks Approvals",
        "module": "examinations",
        "module_name_ar": "الامتحانات والكنترول",
        "icon": "🎖️",
    },
    {
        "code": "schedule_approval",
        "name_ar": "اعتماد الجداول المدرسية",
        "name_en": "Schedule Approvals",
        "module": "academic",
        "module_name_ar": "الشؤون الأكاديمية",
        "icon": "📆",
    },

    # 7. العمليات والمرافق والصيانة (Operations & Maintenance)
    {
        "code": "reservation_approval",
        "name_ar": "حجوزات القاعات والمرافق",
        "name_en": "Facility Reservations",
        "module": "operations",
        "module_name_ar": "الخدمات والمرافق",
        "icon": "🏛️",
    },
    {
        "code": "maintenance_order",
        "name_ar": "طلبات وأوامر الصيانة والتشغيل",
        "name_en": "Maintenance Work Orders",
        "module": "maintenance",
        "module_name_ar": "الصيانة والتشغيل",
        "icon": "🛠️",
    },
]
