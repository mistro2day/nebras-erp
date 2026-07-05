import uuid
from django.test import TestCase

from apps.automation_platform.domain.models import (
    WorkflowDiagram, WorkflowNode, WorkflowEdge,
)
from apps.automation_platform.application.services import WorkflowDesignerService

TENANT = uuid.uuid4()


class WorkflowDesignerTests(TestCase):
    def _diagram(self):
        d = WorkflowDiagram.objects.create(tenant_id=TENANT, name='قبول طالب', code='ADM')
        for key, ntype, label in [('start', 'start', 'بداية'),
                                   ('review', 'approval', 'مراجعة'),
                                   ('end', 'end', 'نهاية')]:
            WorkflowNode.objects.create(tenant_id=TENANT, diagram=d, node_key=key,
                                        node_type=ntype, label=label)
        WorkflowEdge.objects.create(tenant_id=TENANT, diagram=d, edge_key='e1',
                                    source_key='start', target_key='review', trigger_action='submit')
        WorkflowEdge.objects.create(tenant_id=TENANT, diagram=d, edge_key='e2',
                                    source_key='review', target_key='end', trigger_action='approve')
        return d

    def test_validate_valid_diagram(self):
        d = self._diagram()
        issues = WorkflowDesignerService.validate(d)
        self.assertFalse([i for i in issues if i['severity'] == 'error'])

    def test_validate_detects_missing_start(self):
        d = WorkflowDiagram.objects.create(tenant_id=TENANT, name='x', code='X')
        WorkflowNode.objects.create(tenant_id=TENANT, diagram=d, node_key='end',
                                    node_type='end', label='نهاية')
        issues = WorkflowDesignerService.validate(d)
        self.assertTrue(any('بداية' in i['message'] for i in issues))

    def test_validate_detects_dangling_edge(self):
        d = self._diagram()
        WorkflowEdge.objects.create(tenant_id=TENANT, diagram=d, edge_key='bad',
                                    source_key='start', target_key='ghost')
        issues = WorkflowDesignerService.validate(d)
        self.assertTrue(any('ghost' in i['message'] for i in issues))

    def test_simulate_traces_path(self):
        d = self._diagram()
        sim = WorkflowDesignerService.simulate(d, {})
        node_keys = [t.get('node_key') for t in sim.execution_trace if 'node_key' in t]
        self.assertEqual(node_keys[0], 'start')
        self.assertIn('end', node_keys)
        self.assertTrue(sim.is_valid)

    def test_publish_compiles_to_workflow_engine(self):
        from apps.workflow.models import WorkflowDefinition, WorkflowState, WorkflowTransition
        d = self._diagram()
        result = WorkflowDesignerService.publish(d, user_id=uuid.uuid4())
        self.assertTrue(result['published'])
        d.refresh_from_db()
        self.assertEqual(d.status, 'published')
        self.assertIsNotNone(d.workflow_definition_id)
        # لم يُكرَّر التنفيذ: نُنشئ نماذج محرك مسارات العمل الحالي
        definition = WorkflowDefinition.objects.get(id=d.workflow_definition_id)
        self.assertEqual(WorkflowState.objects.filter(workflow=definition).count(), 3)
        self.assertEqual(WorkflowTransition.objects.filter(workflow=definition).count(), 2)

    def test_publish_blocks_invalid(self):
        d = WorkflowDiagram.objects.create(tenant_id=TENANT, name='bad', code='BAD')
        WorkflowNode.objects.create(tenant_id=TENANT, diagram=d, node_key='end',
                                    node_type='end', label='نهاية')
        result = WorkflowDesignerService.publish(d)
        self.assertFalse(result['published'])
        self.assertTrue(result['errors'])
