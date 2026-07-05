from django.core.management.base import BaseCommand, CommandError

from apps.approval_center.infrastructure.workflow_config import setup_approval_workflow
from apps.approval_center.infrastructure.rule_seed import setup_default_approval_rules
from apps.approval_center.infrastructure.command_center_config import setup_approval_commands


class Command(BaseCommand):
    help = "زرع بيانات التأسيس لمركز الموافقات (مسار العمل، قاعدة القواعد التوضيحية، أوامر مركز القيادة) لمستأجر محدد."

    def add_arguments(self, parser):
        parser.add_argument('--tenant-id', required=True, help='معرف المستأجر (UUID) المراد تهيئة مركز الموافقات له')

    def handle(self, *args, **options):
        tenant_id = options['tenant_id']
        try:
            workflow = setup_approval_workflow(tenant_id)
            rule = setup_default_approval_rules(tenant_id)
            commands = setup_approval_commands(tenant_id)
        except Exception as exc:
            raise CommandError(f"فشل تهيئة مركز الموافقات للمستأجر {tenant_id}: {exc}")

        self.stdout.write(self.style.SUCCESS(
            f"تم تهيئة مركز الموافقات للمستأجر {tenant_id}:\n"
            f"  - مسار العمل: {workflow.code}\n"
            f"  - قاعدة القواعد التوضيحية: {rule.code}\n"
            f"  - أوامر مركز القيادة: {len(commands)} أمر"
        ))
