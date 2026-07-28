"""تطبيق حدود خطة الاشتراك على استخدام المستأجر.

يقرأ خطة الاشتراك الفعّالة للمستأجر ويقارنها بالاستخدام الحالي (الطلاب/الموظفون/
الفروع) والوحدات المتاحة. تُستدعى `ensure_can_add` عند نقاط الإنشاء لمنع تجاوز
الحدّ برسالة عربية واضحة. الحدّ = 0 يعني «بلا حدّ».
"""
from __future__ import annotations

_TERMINAL_STUDENT_STATUSES = ('withdrawn', 'graduated', 'archived', 'alumni', 'transferred')
_ACTIVE_SUB_STATUSES = ('active', 'trial', 'past_due')


class PlanLimitExceeded(Exception):
    """يُرفع عند محاولة تجاوز حدّ الخطة. يحمل رسالة عربية جاهزة للعرض."""
    def __init__(self, resource_ar: str, limit: int, current: int):
        self.resource_ar = resource_ar
        self.limit = limit
        self.current = current
        super().__init__(
            f'بلغت خطة اشتراكك الحدّ الأقصى لـ{resource_ar} ({limit}). '
            f'العدد الحالي {current}. رقِّ الخطة لإضافة المزيد.'
        )


class ModuleNotInPlan(Exception):
    def __init__(self, module_code: str):
        self.module_code = module_code
        super().__init__(f'الوحدة «{module_code}» غير مشمولة في خطة اشتراكك الحالية.')


def get_active_subscription(tenant_id):
    """أحدث اشتراك فعّال للمستأجر (نشط/تجريبي/متأخر السداد)، أو None."""
    from apps.saas_billing.domain.models import TenantSubscription
    return (TenantSubscription.objects.select_related('plan')
            .filter(tenant_id=tenant_id, status__in=_ACTIVE_SUB_STATUSES)
            .order_by('-created_at').first())


def get_plan(tenant_id):
    sub = get_active_subscription(tenant_id)
    return sub.plan if sub else None


# ---- عدّادات الاستخدام ----

def count_students(tenant_id) -> int:
    from apps.students.domain.models import Student
    return Student.objects.filter(tenant_id=tenant_id).exclude(
        status__in=_TERMINAL_STUDENT_STATUSES).count()


def count_staff(tenant_id) -> int:
    from apps.employees.domain.models import Employee
    return Employee.objects.filter(tenant_id=tenant_id).count()


def count_branches(tenant_id) -> int:
    from apps.organization.domain.models import Branch
    return Branch.objects.filter(tenant_id=tenant_id, is_active=True).count()


_RESOURCES = {
    'students': ('الطلاب', 'max_students', count_students),
    'staff': ('الموظفين', 'max_staff', count_staff),
    'branches': ('الفروع', 'max_branches', count_branches),
}


def get_usage(tenant_id) -> dict:
    """يُرجع الحدود مقابل الاستخدام لكل مورد + نسبة الاستهلاك."""
    plan = get_plan(tenant_id)
    out = {'has_plan': plan is not None, 'plan_name': plan.name_ar if plan else None, 'resources': {}}
    for key, (label_ar, limit_attr, counter) in _RESOURCES.items():
        limit = getattr(plan, limit_attr, 0) if plan else 0
        current = counter(tenant_id)
        out['resources'][key] = {
            'label': label_ar,
            'limit': limit,             # 0 = بلا حدّ
            'current': current,
            'unlimited': not limit,
            'pct': round(min(current / limit * 100, 100)) if limit else 0,
            'exceeded': bool(limit) and current > limit,
        }
    out['modules'] = list(plan.modules) if plan else []
    return out


def ensure_can_add(tenant_id, resource: str, adding: int = 1) -> None:
    """يمنع تجاوز حدّ المورد. بلا خطة أو بلا حدّ = مسموح.

    عدم وجود خطة لا يعطّل الإنشاء (لئلا نكسر مستأجراً غير مُفوتَر بعد)؛
    التطبيق يفعّل فقط حين توجد خطة بحدّ صريح.
    """
    plan = get_plan(tenant_id)
    if not plan or resource not in _RESOURCES:
        return
    label_ar, limit_attr, counter = _RESOURCES[resource]
    limit = getattr(plan, limit_attr, 0)
    if not limit:  # 0 = بلا حدّ
        return
    current = counter(tenant_id)
    if current + adding > limit:
        raise PlanLimitExceeded(label_ar, limit, current)


def module_allowed(tenant_id, module_code: str) -> bool:
    """هل الوحدة مشمولة في خطة المستأجر؟ بلا خطة = مسموح (وضع غير مُقيَّد)."""
    plan = get_plan(tenant_id)
    if not plan or not plan.modules:
        return True
    return module_code in plan.modules
