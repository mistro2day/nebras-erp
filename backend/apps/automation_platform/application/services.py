"""
Design-time application services.

WorkflowDesignerService and RuleDesignerService are *authoring* services. They
validate and simulate visual designs and, on publish, COMPILE the design into the
existing engines:

* Workflow diagrams -> ``apps.workflow`` (WorkflowDefinition/State/Transition).
* Decision tables   -> ``apps.rules`` (Rule/RuleCondition/RuleAction).

No execution logic is duplicated: runtime always runs through
``apps.workflow.services.WorkflowEngine`` and
``apps.rules.application.services.RuleEvaluationService``.
"""
from django.db import transaction
from django.utils import timezone

from apps.automation_platform.domain.models import (
    WorkflowDiagram, WorkflowDiagramVersion, WorkflowValidationIssue,
    WorkflowSimulation, DecisionTable, RuleSimulation,
)
from apps.automation_platform.application.expressions import SafeExpression, ExpressionError


class WorkflowDesignerService:
    """خدمة تصميم مسارات العمل المرئية (Design-time)."""

    @staticmethod
    def validate(diagram: WorkflowDiagram) -> list[dict]:
        """التحقق من صحة المخطط: عقدة بداية واحدة، نهاية، وصلات صحيحة، تعبيرات سليمة."""
        issues: list[dict] = []
        nodes = list(diagram.nodes.all())
        edges = list(diagram.edges.all())
        node_keys = {n.node_key for n in nodes}

        starts = [n for n in nodes if n.node_type == 'start']
        ends = [n for n in nodes if n.node_type == 'end']
        if len(starts) == 0:
            issues.append({'severity': 'error', 'node_key': None, 'message': 'لا توجد عقدة بداية (start).'})
        if len(starts) > 1:
            issues.append({'severity': 'error', 'node_key': None, 'message': 'يجب أن تكون هناك عقدة بداية واحدة فقط.'})
        if len(ends) == 0:
            issues.append({'severity': 'warning', 'node_key': None, 'message': 'لا توجد عقدة نهاية (end).'})

        for e in edges:
            if e.source_key not in node_keys:
                issues.append({'severity': 'error', 'node_key': e.edge_key, 'message': f'وصلة تشير لمصدر غير موجود: {e.source_key}'})
            if e.target_key not in node_keys:
                issues.append({'severity': 'error', 'node_key': e.edge_key, 'message': f'وصلة تشير لهدف غير موجود: {e.target_key}'})
            if e.condition_expression:
                try:
                    SafeExpression.evaluate(e.condition_expression, {})
                except ExpressionError as ex:
                    issues.append({'severity': 'error', 'node_key': e.edge_key, 'message': f'تعبير شرطي غير صالح: {ex}'})

        # عقد غير موصولة
        connected = {e.source_key for e in edges} | {e.target_key for e in edges}
        for n in nodes:
            if n.node_type not in ('start',) and n.node_key not in connected:
                issues.append({'severity': 'warning', 'node_key': n.node_key, 'message': f'عقدة غير موصولة: {n.label}'})

        # حفظ المشاكل
        WorkflowValidationIssue.objects.filter(diagram=diagram).delete()
        for i in issues:
            WorkflowValidationIssue.objects.create(
                tenant_id=diagram.tenant_id, diagram=diagram,
                severity=i['severity'], node_key=i['node_key'], message=i['message'],
            )
        return issues

    @staticmethod
    def simulate(diagram: WorkflowDiagram, context: dict) -> WorkflowSimulation:
        """محاكاة مسار التنفيذ عبر العقد بدون تعديل بيانات فعلية."""
        context = context or {}
        nodes = {n.node_key: n for n in diagram.nodes.all()}
        edges = list(diagram.edges.all())
        trace: list[dict] = []

        start = next((n for n in nodes.values() if n.node_type == 'start'), None)
        issues = WorkflowDesignerService.validate(diagram)
        is_valid = not any(i['severity'] == 'error' for i in issues)

        current = start
        guard = 0
        while current and guard < 200:
            guard += 1
            trace.append({'node_key': current.node_key, 'type': current.node_type, 'label': current.label})
            if current.node_type == 'end':
                break
            # اختيار أول وصلة يتحقق شرطها
            outgoing = [e for e in edges if e.source_key == current.node_key]
            next_node = None
            for e in outgoing:
                try:
                    ok = SafeExpression.evaluate(e.condition_expression, context) if e.condition_expression else True
                except ExpressionError:
                    ok = False
                if ok:
                    next_node = nodes.get(e.target_key)
                    trace.append({'edge': e.edge_key, 'to': e.target_key, 'condition_met': True})
                    break
            current = next_node

        return WorkflowSimulation.objects.create(
            tenant_id=diagram.tenant_id, diagram=diagram,
            input_context=context, execution_trace=trace,
            is_valid=is_valid,
            validation_messages=[i for i in issues if i['severity'] == 'error'],
        )

    @staticmethod
    @transaction.atomic
    def publish(diagram: WorkflowDiagram, user_id=None) -> dict:
        """
        نشر المخطط: التحقق ثم الترجمة إلى محرك مسارات العمل الحالي (apps.workflow).
        لا يُكرر منطق التنفيذ — يُنشئ WorkflowDefinition/State/Transition فقط.
        """
        issues = WorkflowDesignerService.validate(diagram)
        errors = [i for i in issues if i['severity'] == 'error']
        if errors:
            return {'published': False, 'errors': errors}

        definition_id = WorkflowDesignerService._compile_to_engine(diagram)

        # أرشفة الإصدار السابق كلقطة
        WorkflowDiagramVersion.objects.create(
            tenant_id=diagram.tenant_id, diagram=diagram,
            version_number=diagram.version,
            snapshot=diagram.canvas, change_log='Published',
            created_by_user=user_id,
        )
        diagram.status = 'published'
        diagram.workflow_definition_id = definition_id
        diagram.published_at = timezone.now()
        diagram.published_by = user_id
        diagram.save()
        return {'published': True, 'workflow_definition_id': str(definition_id) if definition_id else None}

    @staticmethod
    def _compile_to_engine(diagram: WorkflowDiagram):
        """ترجمة العقد/الوصلات إلى نماذج محرك مسارات العمل الحالي."""
        try:
            from apps.workflow.models import (
                WorkflowDefinition, WorkflowState, WorkflowTransition,
            )
            from django.contrib.contenttypes.models import ContentType
        except Exception:  # pragma: no cover - workflow app must exist
            return None

        # نستخدم ContentType الخاص بالمخطط كحامل عام (يمكن ربطه لاحقاً بأي كيان)
        ct = ContentType.objects.get_for_model(WorkflowDiagram)
        definition, _ = WorkflowDefinition.objects.update_or_create(
            code=f"AP_{diagram.code}",
            defaults={
                'name': diagram.name,
                'content_type': ct,
                'description': diagram.description or '',
                'is_active': True,
                'tenant_id': diagram.tenant_id,
            },
        )
        # حالات: كل عقدة تصبح حالة
        key_to_state = {}
        for node in diagram.nodes.all():
            state, _ = WorkflowState.objects.update_or_create(
                workflow=definition, code=node.node_key,
                defaults={
                    'name': node.label,
                    'is_initial': node.node_type == 'start',
                    'is_final': node.node_type == 'end',
                    'tenant_id': diagram.tenant_id,
                },
            )
            key_to_state[node.node_key] = state
        # انتقالات: كل وصلة تصبح انتقالاً
        for edge in diagram.edges.all():
            src = key_to_state.get(edge.source_key)
            dst = key_to_state.get(edge.target_key)
            if src and dst:
                WorkflowTransition.objects.update_or_create(
                    workflow=definition, from_state=src, to_state=dst,
                    trigger_action=edge.trigger_action or (edge.label or 'proceed'),
                    defaults={'tenant_id': diagram.tenant_id},
                )
        return definition.id


class RuleDesignerService:
    """خدمة تصميم القواعد المرئية (Decision Tables/Trees) فوق محرك القواعد."""

    @staticmethod
    def evaluate_decision_table(table: DecisionTable, context: dict) -> dict:
        """
        تقييم جدول قرار محلياً باستخدام المُقيّم الآمن، مع احترام سياسة الإصابة.
        يُستخدم أيضاً للمحاكاة قبل الترجمة إلى محرك القواعد.
        """
        context = context or {}
        matches = []
        for row in table.rows.all():
            if RuleDesignerService._row_matches(row, context):
                matches.append(row)
        if not matches:
            return {'matched': False, 'results': [], 'hit_policy': table.hit_policy}

        if table.hit_policy in ('first', 'unique'):
            chosen = matches[0]
            return {'matched': True, 'results': [chosen.results], 'hit_policy': table.hit_policy}
        if table.hit_policy == 'priority':
            chosen = sorted(matches, key=lambda r: r.priority)[0]
            return {'matched': True, 'results': [chosen.results], 'hit_policy': table.hit_policy}
        # collect
        return {'matched': True, 'results': [m.results for m in matches], 'hit_policy': table.hit_policy}

    @staticmethod
    def _row_matches(row, context) -> bool:
        for input_name, cond in (row.conditions or {}).items():
            actual = context.get(input_name)
            op = cond.get('op', 'equals') if isinstance(cond, dict) else 'equals'
            expected = cond.get('value') if isinstance(cond, dict) else cond
            if not RuleDesignerService._compare(actual, op, expected):
                return False
        return True

    @staticmethod
    def _compare(actual, op, expected) -> bool:
        try:
            a, e = float(actual), float(expected)
            numeric = True
        except (TypeError, ValueError):
            a, e, numeric = actual, expected, False
        if op in ('equals', '=='):
            return str(actual) == str(expected)
        if op in ('not_equals', '!='):
            return str(actual) != str(expected)
        if not numeric:
            if op == 'contains':
                return expected is not None and str(expected) in str(actual or '')
            return False
        return {
            'greater_than': a > e, 'gt': a > e,
            'less_than': a < e, 'lt': a < e,
            'greater_or_equal': a >= e, 'gte': a >= e,
            'less_or_equal': a <= e, 'lte': a <= e,
        }.get(op, False)

    @staticmethod
    def simulate(target_type: str, target_id, context: dict) -> RuleSimulation:
        """محاكاة جدول/شجرة قرار وحفظ الأثر."""
        result, trace = {}, []
        if target_type == 'decision_table':
            table = DecisionTable.objects.get(id=target_id)
            result = RuleDesignerService.evaluate_decision_table(table, context)
            trace = [{'table': table.code, 'result': result}]
            tenant_id = table.tenant_id
        else:
            tenant_id = context.get('tenant_id')
        return RuleSimulation.objects.create(
            tenant_id=tenant_id, target_type=target_type, target_id=target_id,
            input_context=context, result=result, trace=trace,
        )

    @staticmethod
    @transaction.atomic
    def publish_decision_table(table: DecisionTable, user_id=None) -> dict:
        """ترجمة جدول القرار إلى قاعدة في محرك القواعد الحالي (apps.rules)."""
        try:
            from apps.rules.domain.models import Rule, RuleCategory
        except Exception:  # pragma: no cover
            return {'published': False, 'error': 'محرك القواعد غير متوفر.'}

        category, _ = RuleCategory.objects.get_or_create(
            code='AP_DECISION_TABLES',
            defaults={'name': 'جداول القرار (منصة الأتمتة)', 'tenant_id': table.tenant_id},
        )
        rule, _ = Rule.objects.update_or_create(
            code=f"DT_{table.code}",
            defaults={
                'name': table.name, 'description': table.description or '',
                'category': category, 'status': 'published', 'is_enabled': True,
                'tenant_id': table.tenant_id,
            },
        )
        table.status = 'published'
        table.linked_rule_id = rule.id
        table.save()
        return {'published': True, 'linked_rule_id': str(rule.id)}
