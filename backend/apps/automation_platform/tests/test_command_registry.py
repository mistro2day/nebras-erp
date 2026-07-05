import uuid
from django.test import TestCase
from apps.automation_platform.application.command_registry import (
    register_automation_commands, AUTOMATION_COMMANDS,
)

TENANT = uuid.uuid4()


class CommandRegistryTests(TestCase):
    def test_register_is_idempotent(self):
        from apps.command_center.domain.models import Command
        n1 = register_automation_commands(TENANT)
        n2 = register_automation_commands(TENANT)
        self.assertEqual(n1, len(AUTOMATION_COMMANDS))
        self.assertEqual(n2, len(AUTOMATION_COMMANDS))
        # لا تكرار: نفس العدد بعد التسجيل مرتين
        self.assertEqual(
            Command.all_objects.filter(tenant_id=TENANT).count(), len(AUTOMATION_COMMANDS)
        )
