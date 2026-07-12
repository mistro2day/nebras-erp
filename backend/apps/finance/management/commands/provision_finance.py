# -*- coding: utf-8 -*-
"""
أمر إدارة: تهيئة الدليل المحاسبي القياسي للمستأجرين (backfill).

الاستخدام:
    python manage.py provision_finance                # لكل المستأجرين
    python manage.py provision_finance --tenant <id>  # لمستأجر محدد
"""
from django.core.management.base import BaseCommand

from apps.tenants.domain.models import Tenant
from apps.finance.application.provisioning import provision_finance_defaults


class Command(BaseCommand):
    help = "تهيئة شجرة الحسابات القياسية للمدارس والبيانات المرجعية للمستأجرين."

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
            summary = provision_finance_defaults(tenant.id)
            self.stdout.write(self.style.SUCCESS(f"[{tenant.name}] {summary}"))

        self.stdout.write(self.style.SUCCESS("اكتملت تهيئة النظام المالي."))
