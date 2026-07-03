from apps.rules.domain.models import Rule, RuleCondition, RuleAction, RuleExecution, RuleExecutionLog

class RuleEvaluationService:
    """
    محرك تقييم القواعد وديناميكية الأعمال الموحد (Expression & Decision Engine)
    """

    @classmethod
    def evaluate_rule(cls, rule_id, context_data: dict):
        """
        تقييم قاعدة معينة بناءً على المعطيات المدخلة (Context Variables).
        """
        try:
            rule = Rule.objects.get(id=rule_id, is_enabled=True, deleted_at__isnull=True)
        except Rule.DoesNotExist:
            return {'status': 'error', 'message': 'القاعدة غير موجودة أو معطلة.'}

        conditions = rule.conditions.all()
        is_matched = True

        # معالجة الشروط
        for cond in conditions:
            var_code = cond.variable.code
            var_val = context_data.get(var_code)
            compare_val = cond.value_to_compare

            # تقييم الشرط
            cond_match = cls.compare_values(var_val, cond.operator, compare_val)
            
            # بوابات الربط المنطقي
            if cond.logical_gate == 'AND':
                is_matched = is_matched and cond_match
            elif cond.logical_gate == 'OR':
                is_matched = is_matched or cond_match

        # تتبع وتسجيل التنفيذ
        execution = RuleExecution.objects.create(
            tenant_id=rule.tenant_id,
            rule=rule,
            success=True,
            result_data={'is_matched': is_matched, 'context': context_data}
        )

        # في حال تحقق الشروط نقوم بإجراء الأفعال
        actions_taken = []
        if is_matched:
            for act in rule.actions.all():
                actions_taken.append({
                    'action_type': act.action_type,
                    'config': act.configuration
                })
                RuleExecutionLog.objects.create(
                    tenant_id=rule.tenant_id,
                    execution=execution,
                    log_level='info',
                    message=f"تم تنفيذ الإجراء: {act.get_action_type_display()}"
                )

        return {
            'rule_code': rule.code,
            'is_matched': is_matched,
            'actions': actions_taken
        }

    @classmethod
    def compare_values(cls, actual, operator, expected):
        if actual is None:
            return False

        # تحويل الأنواع الرقمية تلقائياً إن أمكن
        try:
            actual_num = float(actual)
            expected_num = float(expected)
            return cls._compare_numeric(actual_num, operator, expected_num)
        except ValueError:
            pass

        # مقارنة النصوص
        actual_str = str(actual).strip()
        expected_str = str(expected).strip()

        if operator == 'equals':
            return actual_str == expected_str
        elif operator == 'not_equals':
            return actual_str != expected_str
        elif operator == 'contains':
            return expected_str in actual_str
        return False

    @classmethod
    def _compare_numeric(cls, actual, operator, expected):
        if operator == 'equals':
            return actual == expected
        elif operator == 'not_equals':
            return actual != expected
        elif operator == 'greater_than':
            return actual > expected
        elif operator == 'less_than':
            return actual < expected
        elif operator == 'greater_or_equal':
            return actual >= expected
        elif operator == 'less_or_equal':
            return actual <= expected
        return False


class RuleSandboxService:
    """
    بيئة اختبار ومحاكاة القواعد (Simulation SandBox)
    """

    @classmethod
    def simulate_rule(cls, rule_id, mock_variables: dict):
        """
        محاكاة تقييم قاعدة معينة دون تعديل البيانات الفعلية (فقط إرجاع Trace خطوات التنفيذ).
        """
        try:
            rule = Rule.objects.get(id=rule_id, deleted_at__isnull=True)
        except Rule.DoesNotExist:
            return {'error': 'قاعدة البيانات غير متوفرة.'}

        trace = []
        conditions = rule.conditions.all()
        is_matched = True

        for cond in conditions:
            var_code = cond.variable.code
            actual_val = mock_variables.get(var_code)
            compare_val = cond.value_to_compare

            match = RuleEvaluationService.compare_values(actual_val, cond.operator, compare_val)
            trace.append({
                'variable': var_code,
                'actual_value': actual_val,
                'operator': cond.operator,
                'expected_value': compare_val,
                'result': match
            })
            is_matched = is_matched and match

        return {
            'rule_code': rule.code,
            'simulation_success': True,
            'is_matched': is_matched,
            'execution_trace': trace
        }