"""
Command Center integration.

Registers Automation Platform commands into the existing Command Center
(``apps.command_center``). Commands are tenant-scoped (CombinedSharedModel), so
registration is per-tenant and idempotent — call ``register_automation_commands``
during tenant provisioning or from an admin action. This never duplicates the
Command Center; it only inserts Command rows via its models.
"""
import logging

logger = logging.getLogger('nebras.automation.commands')

# (code, title_ar, title_en, action_type, target_route)
AUTOMATION_COMMANDS = [
    ('AP_STUDIO', 'استوديو الأتمتة', 'Automation Studio', 'navigate', '/automation/studio'),
    ('AP_WF_DESIGNER', 'مصمم مسارات العمل', 'Workflow Designer', 'navigate', '/automation/workflow-designer'),
    ('AP_RULE_DESIGNER', 'مصمم القواعد', 'Rule Designer', 'navigate', '/automation/rule-designer'),
    ('AP_FLOWS', 'تدفقات الأتمتة', 'Automation Flows', 'navigate', '/automation/automation'),
    ('AP_LOWCODE', 'الاستوديو منخفض الشيفرة', 'Low-Code Studio', 'navigate', '/automation/lowcode'),
    ('AP_OPERATIONS', 'مركز العمليات', 'Operations Center', 'navigate', '/automation/operations'),
    ('AP_DEVOPS', 'مركز DevOps', 'DevOps Center', 'navigate', '/automation/devops'),
    ('AP_PLUGINS', 'مدير الإضافات', 'Plugin Manager', 'navigate', '/automation/plugins'),
]

CATEGORY = ('AP_AUTOMATION', 'منصة الأتمتة', 'Automation Platform')


def register_automation_commands(tenant_id) -> int:
    """
    إنشاء/تحديث أوامر منصة الأتمتة في مركز القيادة لمستأجر محدد. عملية آمنة التكرار.
    تُعيد عدد الأوامر المُسجّلة.
    """
    try:
        from apps.command_center.domain.models import Command, CommandCategory
    except Exception:  # pragma: no cover - command center must exist
        logger.warning('Command Center not available; skipping command registration.')
        return 0

    cat_code, cat_ar, cat_en = CATEGORY
    category, _ = CommandCategory.all_objects.get_or_create(
        code=cat_code,
        defaults={'name_ar': cat_ar, 'name_en': cat_en, 'tenant_id': tenant_id},
    )

    count = 0
    for _code, ar, en, action_type, route in AUTOMATION_COMMANDS:
        # نموذج Command لا يملك حقل code؛ نعتمد (tenant_id, title_en) كمفتاح طبيعي
        Command.all_objects.update_or_create(
            title_en=en, tenant_id=tenant_id,
            defaults={
                'title_ar': ar, 'category': category,
                'action_type': action_type, 'target_route': route, 'is_active': True,
            },
        )
        count += 1
    logger.info('Registered %s automation commands for tenant %s', count, tenant_id)
    return count
