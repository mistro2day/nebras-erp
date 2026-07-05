from apps.command_center.domain.models import CommandCategory, Command


def setup_approval_commands(tenant_id):
    """
    زرع أوامر مركز الموافقات في مركز القيادة المؤسسي الموحد (Enterprise Command Center).
    """
    category, _ = CommandCategory.objects.get_or_create(
        code='APPROVAL_CENTER',
        tenant_id=tenant_id,
        defaults={'name_ar': 'مركز الموافقات', 'name_en': 'Approval Center'}
    )

    commands_data = [
        ('فتح صندوق الوارد', 'Open Inbox', 'navigate', '/approvals/inbox'),
        ('اعتماد عنصر محدد', 'Approve Item', 'action', None),
        ('رفض عنصر محدد', 'Reject Item', 'action', None),
        ('تفويض اعتماد', 'Delegate Approval', 'navigate', '/approvals/delegation'),
        ('بحث في الموافقات', 'Search Approvals', 'search', None),
        ('لوحة معلومات الموافقات', 'Approval Dashboard', 'navigate', '/approvals/dashboard'),
        ('تحليلات الموافقات', 'Approval Analytics', 'navigate', '/approvals/analytics'),
    ]

    created_commands = []
    for title_ar, title_en, action_type, target_route in commands_data:
        command, _ = Command.objects.get_or_create(
            tenant_id=tenant_id, category=category, title_en=title_en,
            defaults={'title_ar': title_ar, 'action_type': action_type, 'target_route': target_route}
        )
        created_commands.append(command)

    return created_commands
