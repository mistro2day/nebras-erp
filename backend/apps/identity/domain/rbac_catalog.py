"""
كتالوج الصلاحيات والأدوار النظامية لمنصة Nebras ERP.

يوفّر هذا الملف مصدراً واحداً للحقيقة (Single Source of Truth) لتعريف:
  - كتالوج الصلاحيات الدقيقة لكل موديول (Permission Catalog).
  - خريطة الأدوار النظامية الافتراضية وصلاحياتها (System Roles Map).

يُستهلك من قِبل `apps.identity.domain.rbac.ensure_system_roles` لتهيئة
الأدوار والصلاحيات تلقائياً لكل مستأجر بشكل idempotent.

ملاحظة: هذه نسخة "مبسّطة" قابلة للتوسعة — نبدأ بمجموعة أساسية من الصلاحيات
ثم نوسّعها لاحقاً لتغطية كل الموديولات بتفصيل CRUD كامل.
"""

# ------------------------------------------------------------------
# كتالوج الصلاحيات: (code, name, module, resource, action)
# code فريد عالمياً (Permission.code unique=True).
# ------------------------------------------------------------------
PERMISSION_CATALOG = [
    # --- الطلاب ---
    ("students:read", "عرض الطلاب", "students", "student", "read"),
    ("students:create", "إضافة طالب", "students", "student", "create"),
    ("students:update", "تعديل طالب", "students", "student", "update"),
    ("students:delete", "حذف طالب", "students", "student", "delete"),

    # --- الأكاديميات والحضور والدرجات (اختصاص المعلم) ---
    ("attendance:read", "عرض الحضور", "attendance", "attendance", "read"),
    ("attendance:update", "رصد الحضور", "attendance", "attendance", "update"),
    ("grades:read", "عرض الدرجات", "examinations", "grade", "read"),
    ("grades:update", "رصد الدرجات", "examinations", "grade", "update"),
    ("timetable:read", "عرض الجدول الدراسي", "timetable", "timetable", "read"),

    # --- الموظفون والموارد البشرية ---
    ("employees:read", "عرض الموظفين", "employees", "employee", "read"),
    ("employees:create", "إضافة موظف", "employees", "employee", "create"),
    ("employees:update", "تعديل موظف", "employees", "employee", "update"),
    ("employees:activate", "تفعيل حساب موظف", "employees", "employee", "custom"),

    # --- الرواتب والمالية ---
    ("payroll:read", "عرض الرواتب", "payroll", "payroll", "read"),
    ("payroll:approve", "اعتماد المسيّرات", "payroll", "payroll", "approve"),
    ("finance:read", "عرض المالية", "finance", "finance", "read"),
    ("finance:update", "إدارة المالية", "finance", "finance", "update"),

    # --- الإعدادات والصلاحيات ---
    ("settings:read", "عرض الإعدادات", "settings", "settings", "read"),
    ("settings:update", "إدارة الإعدادات", "settings", "settings", "update"),
    ("roles:manage", "إدارة الأدوار والصلاحيات", "identity", "role", "custom"),

    # --- صلاحيات البوابة (أولياء الأمور / الطلاب) ---
    ("portal:parent", "بوابة ولي الأمر", "portal", "portal", "read"),
    ("portal:student", "بوابة الطالب", "portal", "portal", "read"),
]

# قائمة بجميع أكواد الصلاحيات (تُستخدم للدور الإداري = كل شيء)
ALL_PERMISSION_CODES = [p[0] for p in PERMISSION_CATALOG]

# ------------------------------------------------------------------
# خريطة الأدوار النظامية: code -> {name, permissions}
# "*" تعني كل الصلاحيات.
# ------------------------------------------------------------------
SYSTEM_ROLES = {
    "administrator": {
        "name": "إداري النظام",
        "permissions": ["*"],
    },
    "teacher": {
        "name": "معلم",
        "permissions": [
            "students:read",
            "attendance:read", "attendance:update",
            "grades:read", "grades:update",
            "timetable:read",
        ],
    },
    "parent": {
        "name": "ولي أمر",
        "permissions": ["portal:parent"],
    },
    "student": {
        "name": "طالب",
        "permissions": ["portal:student"],
    },
}


def resolve_role_permissions(role_code: str):
    """يعيد قائمة أكواد الصلاحيات الفعلية لدور نظامي، مع توسيع '*'."""
    role = SYSTEM_ROLES.get(role_code)
    if not role:
        return []
    perms = role["permissions"]
    if "*" in perms:
        return list(ALL_PERMISSION_CODES)
    return list(perms)
