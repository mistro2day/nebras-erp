from django.core.management.base import BaseCommand
from apps.approval_center.domain.models import ApprovalCategory
from apps.approval_center.infrastructure.category_definitions import APPROVAL_CATEGORIES_CATALOG
from apps.tenants.models import Tenant


class Command(BaseCommand):
    help = "مزامنة وتحديث كافة فئات ومسارات الموافقات الـ 22 عبر النظام لجميع المستأجرين أو لمستأجر محدد"

    def add_arguments(self, parser):
        parser.add_argument('--tenant-id', required=False, help='معرف المستأجر (UUID) أو يتم التحديث لجميع المستأجرين')

    def handle(self, *args, **options):
        tenant_id = options.get('tenant_id')
        if tenant_id:
            tenants = Tenant.objects.filter(id=tenant_id)
        else:
            tenants = Tenant.objects.all()

        if not tenants.exists():
            self.stdout.write(self.style.WARNING("لا يوجد مستأجرين مسجلين في النظام."))
            return

        total_created = 0
        total_updated = 0

        for tenant in tenants:
            t_id = str(tenant.id)
            for item in APPROVAL_CATEGORIES_CATALOG:
                cat, created = ApprovalCategory.objects.get_or_create(
                    tenant_id=t_id,
                    code=item["code"],
                    defaults={
                        "name_ar": item["name_ar"],
                        "name_en": item["name_en"],
                    }
                )
                if created:
                    total_created += 1
                else:
                    if cat.name_ar != item["name_ar"] or cat.name_en != item["name_en"]:
                        cat.name_ar = item["name_ar"]
                        cat.name_en = item["name_en"]
                        cat.save(update_fields=["name_ar", "name_en"])
                        total_updated += 1

        self.stdout.write(self.style.SUCCESS(
            f"تمت مزامنة فئات الموافقات بنجاح: {total_created} جديدة، {total_updated} محدثة لـ {tenants.count()} مستأجر."
        ))
