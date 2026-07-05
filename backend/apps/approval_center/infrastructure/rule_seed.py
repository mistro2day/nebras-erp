from apps.rules.domain.models import RuleCategory, Rule, RuleVariable, RuleCondition, RuleAction


def setup_default_approval_rules(tenant_id):
    """
    زرع قاعدة توضيحية جاهزة تُظهر تكامل مركز الموافقات مع محرك القواعد المركزي: اعتماد آلي
    للطلبات التي لا يتجاوز مبلغها 1000. غير إلزامية لصحة النظام — التوجيه يتجاهل أي فئة اعتماد
    لا يوجد لديها ApprovalRule.rule_id مرتبط بقاعدة فعلية في محرك القواعد.
    """
    category, _ = RuleCategory.objects.get_or_create(
        code='APPROVAL_CENTER',
        tenant_id=tenant_id,
        defaults={'name': 'قواعد مركز الموافقات', 'description': 'قواعد التوجيه والاعتماد الآلي لطلبات الاعتماد'}
    )

    rule, _ = Rule.objects.get_or_create(
        code='APV_AUTO_APPROVE_LOW_VALUE',
        tenant_id=tenant_id,
        defaults={
            'name': 'اعتماد آلي للطلبات منخفضة القيمة',
            'description': 'اعتماد أي طلب لا يتجاوز مبلغه 1000 تلقائياً دون الحاجة لمراجعة بشرية',
            'category': category,
            'priority': 10,
            'status': 'published',
            'is_enabled': True,
        }
    )

    variable, _ = RuleVariable.objects.get_or_create(
        code='amount',
        tenant_id=tenant_id,
        defaults={'name': 'مبلغ الطلب', 'data_type': 'number'}
    )

    RuleCondition.objects.get_or_create(
        rule=rule,
        variable=variable,
        operator='less_or_equal',
        tenant_id=tenant_id,
        defaults={'value_to_compare': '1000', 'logical_gate': 'AND'}
    )

    RuleAction.objects.get_or_create(
        rule=rule,
        action_type='allow',
        tenant_id=tenant_id,
        defaults={'configuration': {'reason': 'اعتماد آلي تحت السقف المحدد'}}
    )

    return rule
