import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.automation_platform.domain.models import AutomationFlow, WorkflowDiagram

User = get_user_model()


class AutomationPlatformAPITests(TestCase):
    """اختبارات دخان لواجهات REST (تتسامح مع 403 حين لا يُرفق المستأجر بالطلب)."""

    def setUp(self):
        self.client = APIClient()
        self.tenant_id = uuid.uuid4()
        self.user = User.objects.create_user(
            email='ap_api_test@nebras.com', password='pw12345678',
            first_name='مشرف', last_name='أتمتة',
        )
        self.client.force_authenticate(user=self.user)
        self.flow = AutomationFlow.objects.create(
            tenant_id=self.tenant_id, name='تدفق اختبار', code='TESTFLOW', status='active',
        )
        self.diagram = WorkflowDiagram.objects.create(
            tenant_id=self.tenant_id, name='مخطط اختبار', code='TESTDIAG',
        )

    def test_list_flows(self):
        r = self.client.get('/api/v1/automation/flows/')
        self.assertIn(r.status_code, [200, 403])

    def test_list_diagrams(self):
        r = self.client.get('/api/v1/automation/workflow-diagrams/')
        self.assertIn(r.status_code, [200, 403])

    def test_operations_overview(self):
        r = self.client.get('/api/v1/automation/operations/overview/')
        self.assertIn(r.status_code, [200, 403])

    def test_ai_assist_endpoint(self):
        r = self.client.post('/api/v1/automation/ai/assist/',
                             data={'kind': 'workflow', 'prompt': 'عملية موافقة'}, format='json')
        self.assertIn(r.status_code, [200, 400, 403])

    def test_validate_diagram_action(self):
        r = self.client.post(f'/api/v1/automation/workflow-diagrams/{self.diagram.id}/validate/')
        self.assertIn(r.status_code, [200, 403, 404])
