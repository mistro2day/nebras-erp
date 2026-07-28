# -*- coding: utf-8 -*-
"""بذر فوترة المنصّة: خطط اشتراك واقعية + اشتراك للمستأجرين الحاليين + فواتير.

التشغيل:
    exec(open(r'seed_saas_billing.py', encoding='utf-8').read())
أو:
    "C:\\Program Files\\Python313\\python.exe" manage.py shell -c "exec(open(r'seed_saas_billing.py', encoding='utf-8').read())"
"""
from decimal import Decimal
import django, os
try:
    django.setup()
except Exception:
    pass

from apps.tenants.domain.models import Tenant
from apps.saas_billing.domain.models import (
    SubscriptionPlan, TenantSubscription, InvoiceStatus, SubscriptionStatus,
)
from apps.saas_billing.application import services

ALL_MODULES = [
    'students', 'admissions', 'academics', 'examinations', 'attendance',
    'student_finance', 'finance', 'hr', 'payroll', 'communications',
    'reporting', 'library', 'clinic', 'transport', 'procurement',
]

PLANS = [
    dict(code='starter', name_ar='الباقة الأساسية', name_en='Starter',
         description='لمدرسة واحدة صغيرة حتى 300 طالب — الوحدات الجوهرية.',
         billing_cycle='annual', price=Decimal('1200000'), currency='SDG',
         max_students=300, max_staff=40, max_branches=1, sort_order=1,
         modules=['students', 'admissions', 'academics', 'attendance', 'student_finance', 'communications']),
    dict(code='growth', name_ar='باقة النمو', name_en='Growth',
         description='لمدرسة متوسطة حتى 800 طالب وفرعين — تشمل الامتحانات والمالية والتقارير.',
         billing_cycle='annual', price=Decimal('2400000'), currency='SDG',
         max_students=800, max_staff=120, max_branches=2, sort_order=2,
         modules=ALL_MODULES[:12]),
    dict(code='enterprise', name_ar='باقة المؤسسات', name_en='Enterprise',
         description='لمجموعة مدارس متعددة الفروع بلا حدود استخدام — كل الوحدات والدعم المتقدّم.',
         billing_cycle='annual', price=Decimal('4800000'), currency='SDG',
         max_students=0, max_staff=0, max_branches=0, sort_order=3,
         modules=ALL_MODULES),
]


def run():
    # 1) الخطط
    plan_by_code = {}
    for p in PLANS:
        obj, created = SubscriptionPlan.objects.update_or_create(
            code=p['code'], defaults=p)
        plan_by_code[p['code']] = obj
        print(('+ أُنشئت' if created else '~ حُدّثت'), 'خطة:', obj.name_ar)

    # 2) اشتراك لكل مستأجر نشط ليس له اشتراك بعد (النمو افتراضياً)
    default_plan = plan_by_code['growth']
    for tenant in Tenant.objects.filter(is_active=True):
        if TenantSubscription.objects.filter(tenant_id=tenant.id).exists():
            print('… للمستأجر اشتراك بالفعل:', tenant.name)
            continue
        sub = services.create_subscription(tenant_id=tenant.id, plan=default_plan, trial_days=0)
        sub.status = SubscriptionStatus.ACTIVE
        sub.save(update_fields=['status'])
        print('+ اشتراك:', tenant.name, '→', default_plan.name_ar)

        # 3) فاتورة للدورة الحالية
        inv = services.generate_invoice_for_subscription(sub)
        print('  + فاتورة:', inv.number, '=', inv.total, inv.currency, f'({inv.status})')

    print('\nتم البذر. الخطط:', SubscriptionPlan.objects.count(),
          '| الاشتراكات:', TenantSubscription.objects.count(),
          '| الفواتير:', __import__('apps.saas_billing.domain.models', fromlist=['Invoice']).Invoice.objects.count())


run()
