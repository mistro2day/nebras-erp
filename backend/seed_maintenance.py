"""بذر مرجعيات الصيانة وبلاغ نموذجي.

يُشغَّل بأمان أكثر من مرة (idempotent).
    python seed_maintenance.py
"""
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django  # noqa: E402

django.setup()

from django.contrib.auth import get_user_model  # noqa: E402

from apps.tenants.domain.models import Tenant  # noqa: E402
from apps.employees.domain.models import Employee  # noqa: E402
from apps.maintenance.domain.models import (  # noqa: E402
    MaintenanceCategory, MaintenancePriority, MaintenanceType,
    MaintenanceTeam, Technician,
)


def seed(tenant_id, user_id):
    cats = [
        ('ELEC', 'كهرباء وإنارة', 'Electrical'),
        ('HVAC', 'تكييف وتبريد', 'HVAC'),
        ('PLUMB', 'سباكة وصرف', 'Plumbing'),
        ('IT', 'أجهزة وشبكات', 'IT & Networks'),
        ('CIVIL', 'أعمال مدنية ودهانات', 'Civil Works'),
        ('FURN', 'أثاث وتجهيزات', 'Furniture'),
    ]
    for code, ar, en in cats:
        MaintenanceCategory.objects.get_or_create(
            tenant_id=tenant_id, code=code, defaults={'name_ar': ar, 'name_en': en})

    priorities = [
        ('EMERGENCY', 'طارئ — يوقف الدراسة', 'Emergency'),
        ('HIGH', 'عالٍ', 'High'),
        ('NORMAL', 'عادي', 'Normal'),
        ('LOW', 'منخفض', 'Low'),
    ]
    for code, ar, en in priorities:
        MaintenancePriority.objects.get_or_create(
            tenant_id=tenant_id, code=code, defaults={'name_ar': ar, 'name_en': en})

    types_ = [
        ('CORRECTIVE', 'صيانة إصلاحية', 'Corrective'),
        ('PREVENTIVE', 'صيانة وقائية', 'Preventive'),
        ('EMERGENCY', 'صيانة طارئة', 'Emergency'),
    ]
    for code, ar, en in types_:
        MaintenanceType.objects.get_or_create(
            tenant_id=tenant_id, code=code, defaults={'name_ar': ar, 'name_en': en})

    # الفرق: قائد الفريق موظف حقيقي إن وُجد
    emps = list(Employee.objects.filter(tenant_id=tenant_id)[:4])
    leader = emps[0].id if emps else user_id
    teams = [
        ('فريق الكهرباء والتكييف', 'Electrical & HVAC Team'),
        ('فريق الصيانة العامة', 'General Maintenance Team'),
        ('فريق تقنية المعلومات', 'IT Support Team'),
    ]
    made_teams = []
    for ar, en in teams:
        team, _ = MaintenanceTeam.objects.get_or_create(
            tenant_id=tenant_id, name_ar=ar,
            defaults={'name_en': en, 'leader_user_id': leader})
        made_teams.append(team)

    # الفنيون: مرتبطون بموظفين حقيقيين ما أمكن
    specialties = ['كهرباء وتمديدات', 'تبريد وتكييف', 'شبكات وأجهزة', 'سباكة']
    for i, spec in enumerate(specialties):
        uid = emps[i].id if i < len(emps) else user_id
        Technician.objects.get_or_create(
            tenant_id=tenant_id, user_id=uid,
            defaults={'team': made_teams[i % len(made_teams)], 'specialty': spec, 'is_active': True})

    print(f'  تصنيفات: {MaintenanceCategory.objects.filter(tenant_id=tenant_id).count()}'
          f' | أولويات: {MaintenancePriority.objects.filter(tenant_id=tenant_id).count()}'
          f' | أنواع: {MaintenanceType.objects.filter(tenant_id=tenant_id).count()}'
          f' | فرق: {MaintenanceTeam.objects.filter(tenant_id=tenant_id).count()}'
          f' | فنيون: {Technician.objects.filter(tenant_id=tenant_id).count()}')


if __name__ == '__main__':
    U = get_user_model()
    admin = U.objects.filter(is_superuser=True).first()
    for t in Tenant.objects.all():
        print(f'المستأجر: {getattr(t, "name", t.id)}')
        seed(t.id, admin.id if admin else None)
    print('تم البذر.')
