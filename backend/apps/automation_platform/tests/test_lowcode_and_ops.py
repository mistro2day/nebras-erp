import uuid
from django.test import TestCase

from apps.automation_platform.domain.models import (
    EntityDefinition, EntityField, GeneratedArtifact,
)
from apps.automation_platform.application.lowcode_service import LowCodeGeneratorService
from apps.automation_platform.application.operations_service import OperationsService
from apps.automation_platform.application import ai_integration

TENANT = uuid.uuid4()


class LowCodeGeneratorTests(TestCase):
    def test_generate_entity_produces_ddd_artifacts(self):
        entity = EntityDefinition.objects.create(
            tenant_id=TENANT, name='Club', code='club', module_code='clubs',
        )
        EntityField.objects.create(tenant_id=TENANT, entity=entity, name='title',
                                   field_type='string', required=True, order=1)
        EntityField.objects.create(tenant_id=TENANT, entity=entity, name='capacity',
                                   field_type='integer', order=2)
        artifacts = LowCodeGeneratorService.generate_entity(entity)
        types = {a.artifact_type for a in artifacts}
        self.assertEqual(types, {'model', 'serializer', 'view', 'route'})
        model_art = next(a for a in artifacts if a.artifact_type == 'model')
        # يجب أن يمتد النموذج المولّد من CombinedSharedModel (لا يتخطى DDD)
        self.assertIn('CombinedSharedModel', model_art.content)
        self.assertIn('class Club(CombinedSharedModel):', model_art.content)
        view_art = next(a for a in artifacts if a.artifact_type == 'view')
        self.assertIn('BaseCRUDViewSet', view_art.content)
        entity.refresh_from_db()
        self.assertEqual(entity.status, 'generated')
        self.assertFalse(any(a.is_applied for a in artifacts))  # مراجعة يدوية مطلوبة


class OperationsServiceTests(TestCase):
    def test_collect_health(self):
        results = OperationsService.collect_health(tenant_id=TENANT)
        components = {r['component'] for r in results}
        self.assertTrue({'database', 'cache', 'celery'}.issubset(components))
        db = next(r for r in results if r['component'] == 'database')
        self.assertEqual(db['status'], 'healthy')

    def test_overview(self):
        OperationsService.collect_health(tenant_id=TENANT)
        overview = OperationsService.overview(tenant_id=TENANT)
        self.assertIn('database', overview['components'])


class AIIntegrationTests(TestCase):
    def test_default_provider_generates_workflow(self):
        provider = ai_integration.get_provider()
        wf = provider.generate_workflow('عملية موافقة')
        self.assertIn('nodes', wf)
        self.assertTrue(any(n['node_type'] == 'start' for n in wf['nodes']))

    def test_set_provider_validates_type(self):
        with self.assertRaises(TypeError):
            ai_integration.set_provider(object())
