# -*- coding: utf-8 -*-
"""
أمر إدارة: تهيئة كتالوج الصلاحيات والأدوار النظامية للمستأجرين.

الاستخدام:
    python manage.py seed_rbac                # لكل المستأجرين
    python manage.py seed_rbac --tenant <id>  # لمستأجر محدد
"""
from django.core.management.base import BaseCommand

from apps.tenants.domain.models import Tenant
from apps.identity.domain.rbac import ensure_system_roles


class Command(BaseCommand):
    help = "تهيئة كتالوج الصلاحيات والأدوار النظامية (administrator/teacher/parent/student) للمستأجرين."

    def add_arguments(self, parser):
        parser.add_argument("--tenant", type=str, default=None, help="معرّف مستأجر محدد (UUID).")

    def handle(self, *args, **options):
        qs = Tenant.objects.all()
        if options["tenant"]:
            qs = qs.filter(id=options["tenant"])

        if not qs.exists():
            self.stdout.write(self.style.WARNING("لا يوجد مستأجرون مطابقون."))
            return

        for tenant in qs:
            roles = ensure_system_roles(tenant.id)
            self.stdout.write(self.style.SUCCESS(
                f"[{tenant.name}] تم تهيئة الأدوار: {', '.join(roles.keys())}"
            ))

        self.stdout.write(self.style.SUCCESS("اكتملت تهيئة الصلاحيات والأدوار النظامية."))
