# -*- coding: utf-8 -*-
"""أمر إدارة: تهيئة كتالوج الرسوم وإعدادات فوترة الطلاب للمستأجرين."""
from django.core.management.base import BaseCommand

from apps.tenants.domain.models import Tenant
from apps.student_finance.application.provisioning import provision_student_finance_defaults


class Command(BaseCommand):
    help = "تهيئة كتالوج الرسوم القياسي وإعدادات فوترة الطلاب للمستأجرين."

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
            summary = provision_student_finance_defaults(tenant.id)
            self.stdout.write(self.style.SUCCESS(f"[{tenant.name}] {summary}"))
        self.stdout.write(self.style.SUCCESS("اكتملت تهيئة فوترة الطلاب."))
