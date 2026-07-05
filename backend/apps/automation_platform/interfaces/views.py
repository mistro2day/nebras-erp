"""
REST viewsets for the Enterprise Automation Platform.

All CRUD viewsets extend ``BaseCRUDViewSet`` (tenant isolation + StandardResponse
+ soft delete). Custom actions delegate to the application services / engines and
never re-implement execution.
"""
from rest_framework.decorators import action
from rest_framework import status
from rest_framework.views import APIView

from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.common.responses import StandardResponse

from apps.automation_platform.domain import models as m
from apps.automation_platform.interfaces import serializers as s
from apps.automation_platform.application.services import (
    WorkflowDesignerService, RuleDesignerService,
)
from apps.automation_platform.application.automation_engine import AutomationEngine
from apps.automation_platform.application.operations_service import OperationsService
from apps.automation_platform.application.lowcode_service import LowCodeGeneratorService
from apps.automation_platform.application import ai_integration


def _tenant_id(request):
    return request.tenant.id if hasattr(request, 'tenant') and request.tenant else None


# ----------------------- Workflow Designer -----------------------

class WorkflowDiagramViewSet(BaseCRUDViewSet):
    model_class = m.WorkflowDiagram
    serializer_class = s.WorkflowDiagramSerializer

    @action(detail=True, methods=['post'], url_path='validate')
    def validate_diagram(self, request, pk=None):
        diagram = self.get_object()
        issues = WorkflowDesignerService.validate(diagram)
        return StandardResponse(data={'issues': issues, 'is_valid': not any(i['severity'] == 'error' for i in issues)},
                                message='تم التحقق من صحة المخطط.')

    @action(detail=True, methods=['post'], url_path='simulate')
    def simulate(self, request, pk=None):
        diagram = self.get_object()
        sim = WorkflowDesignerService.simulate(diagram, request.data.get('context', {}))
        return StandardResponse(data=s.WorkflowSimulationSerializer(sim).data, message='تمت المحاكاة بنجاح.')

    @action(detail=True, methods=['post'], url_path='publish')
    def publish(self, request, pk=None):
        diagram = self.get_object()
        result = WorkflowDesignerService.publish(diagram, user_id=getattr(request.user, 'id', None))
        msg = 'تم نشر المخطط وربطه بمحرك مسارات العمل.' if result.get('published') else 'فشل النشر بسبب أخطاء تحقق.'
        return StandardResponse(data=result, message=msg,
                                status=status.HTTP_200_OK if result.get('published') else status.HTTP_400_BAD_REQUEST)


class WorkflowNodeViewSet(BaseCRUDViewSet):
    model_class = m.WorkflowNode
    serializer_class = s.WorkflowNodeSerializer


class WorkflowEdgeViewSet(BaseCRUDViewSet):
    model_class = m.WorkflowEdge
    serializer_class = s.WorkflowEdgeSerializer


class WorkflowBlockViewSet(BaseCRUDViewSet):
    model_class = m.WorkflowBlock
    serializer_class = s.WorkflowBlockSerializer


class WorkflowTemplateViewSet(BaseCRUDViewSet):
    model_class = m.WorkflowTemplate
    serializer_class = s.WorkflowTemplateSerializer


class WorkflowDiagramVersionViewSet(BaseCRUDViewSet):
    model_class = m.WorkflowDiagramVersion
    serializer_class = s.WorkflowDiagramVersionSerializer


class WorkflowSimulationViewSet(BaseCRUDViewSet):
    model_class = m.WorkflowSimulation
    serializer_class = s.WorkflowSimulationSerializer


# ----------------------- Rule Designer -----------------------

class DecisionTableViewSet(BaseCRUDViewSet):
    model_class = m.DecisionTable
    serializer_class = s.DecisionTableSerializer

    @action(detail=True, methods=['post'], url_path='evaluate')
    def evaluate(self, request, pk=None):
        table = self.get_object()
        result = RuleDesignerService.evaluate_decision_table(table, request.data.get('context', {}))
        return StandardResponse(data=result, message='تم تقييم جدول القرار.')

    @action(detail=True, methods=['post'], url_path='simulate')
    def simulate(self, request, pk=None):
        table = self.get_object()
        sim = RuleDesignerService.simulate('decision_table', table.id, request.data.get('context', {}))
        return StandardResponse(data=s.RuleSimulationSerializer(sim).data, message='تمت محاكاة جدول القرار.')

    @action(detail=True, methods=['post'], url_path='publish')
    def publish(self, request, pk=None):
        table = self.get_object()
        result = RuleDesignerService.publish_decision_table(table, user_id=getattr(request.user, 'id', None))
        return StandardResponse(data=result, message='تم نشر جدول القرار في محرك القواعد.')


class DecisionTableRuleViewSet(BaseCRUDViewSet):
    model_class = m.DecisionTableRule
    serializer_class = s.DecisionTableRuleSerializer


class DecisionTreeViewSet(BaseCRUDViewSet):
    model_class = m.DecisionTree
    serializer_class = s.DecisionTreeSerializer


class DecisionTreeNodeViewSet(BaseCRUDViewSet):
    model_class = m.DecisionTreeNode
    serializer_class = s.DecisionTreeNodeSerializer


class RuleSetViewSet(BaseCRUDViewSet):
    model_class = m.RuleSet
    serializer_class = s.RuleSetSerializer


class RuleSetMemberViewSet(BaseCRUDViewSet):
    model_class = m.RuleSetMember
    serializer_class = s.RuleSetMemberSerializer


# ----------------------- Automation Engine -----------------------

class AutomationFlowViewSet(BaseCRUDViewSet):
    model_class = m.AutomationFlow
    serializer_class = s.AutomationFlowSerializer

    @action(detail=True, methods=['post'], url_path='run')
    def run(self, request, pk=None):
        flow = self.get_object()
        run = AutomationEngine.trigger_manual(flow, request.data.get('payload', {}),
                                              user_id=getattr(request.user, 'id', None))
        return StandardResponse(data=s.AutomationRunSerializer(run).data, message='تم تشغيل التدفق.')

    @action(detail=True, methods=['post'], url_path='toggle')
    def toggle(self, request, pk=None):
        flow = self.get_object()
        flow.status = 'active' if flow.status != 'active' else 'paused'
        flow.save(update_fields=['status'])
        return StandardResponse(data={'status': flow.status}, message='تم تحديث حالة التدفق.')


class AutomationTriggerViewSet(BaseCRUDViewSet):
    model_class = m.AutomationTrigger
    serializer_class = s.AutomationTriggerSerializer


class AutomationActionViewSet(BaseCRUDViewSet):
    model_class = m.AutomationAction
    serializer_class = s.AutomationActionSerializer


class ScheduledJobViewSet(BaseCRUDViewSet):
    model_class = m.ScheduledJob
    serializer_class = s.ScheduledJobSerializer


class WebhookEndpointViewSet(BaseCRUDViewSet):
    model_class = m.WebhookEndpoint
    serializer_class = s.WebhookEndpointSerializer


class AutomationRunViewSet(BaseCRUDViewSet):
    model_class = m.AutomationRun
    serializer_class = s.AutomationRunSerializer


# ----------------------- Low-Code -----------------------

class EntityDefinitionViewSet(BaseCRUDViewSet):
    model_class = m.EntityDefinition
    serializer_class = s.EntityDefinitionSerializer

    @action(detail=True, methods=['post'], url_path='generate')
    def generate(self, request, pk=None):
        entity = self.get_object()
        artifacts = LowCodeGeneratorService.generate_entity(entity)
        return StandardResponse(
            data=s.GeneratedArtifactSerializer(artifacts, many=True).data,
            message='تم توليد الأثر المتوافق مع بنية DDD (بانتظار المراجعة والتطبيق).',
        )


class EntityFieldViewSet(BaseCRUDViewSet):
    model_class = m.EntityField
    serializer_class = s.EntityFieldSerializer


class RelationshipDefinitionViewSet(BaseCRUDViewSet):
    model_class = m.RelationshipDefinition
    serializer_class = s.RelationshipDefinitionSerializer


class ValidationDefinitionViewSet(BaseCRUDViewSet):
    model_class = m.ValidationDefinition
    serializer_class = s.ValidationDefinitionSerializer


class CrudDefinitionViewSet(BaseCRUDViewSet):
    model_class = m.CrudDefinition
    serializer_class = s.CrudDefinitionSerializer


class FormDefinitionViewSet(BaseCRUDViewSet):
    model_class = m.FormDefinition
    serializer_class = s.FormDefinitionSerializer


class PageDefinitionViewSet(BaseCRUDViewSet):
    model_class = m.PageDefinition
    serializer_class = s.PageDefinitionSerializer


class WidgetDefinitionViewSet(BaseCRUDViewSet):
    model_class = m.WidgetDefinition
    serializer_class = s.WidgetDefinitionSerializer


class ApiDefinitionViewSet(BaseCRUDViewSet):
    model_class = m.ApiDefinition
    serializer_class = s.ApiDefinitionSerializer


class ModuleDefinitionViewSet(BaseCRUDViewSet):
    model_class = m.ModuleDefinition
    serializer_class = s.ModuleDefinitionSerializer


class MetadataRegistryViewSet(BaseCRUDViewSet):
    model_class = m.MetadataRegistry
    serializer_class = s.MetadataRegistrySerializer


class GeneratedArtifactViewSet(BaseCRUDViewSet):
    model_class = m.GeneratedArtifact
    serializer_class = s.GeneratedArtifactSerializer


# ----------------------- Plugins -----------------------

class PluginViewSet(BaseCRUDViewSet):
    model_class = m.Plugin
    serializer_class = s.PluginSerializer


class PluginVersionViewSet(BaseCRUDViewSet):
    model_class = m.PluginVersion
    serializer_class = s.PluginVersionSerializer

    @action(detail=True, methods=['post'], url_path='security-scan')
    def security_scan(self, request, pk=None):
        version = self.get_object()
        # فحص أمني مبسّط: يتطلب manifest يحدد الأذونات المطلوبة
        manifest = version.manifest or {}
        passed = bool(manifest.get('permissions') is not None)
        version.security_status = 'passed' if passed else 'failed'
        version.save(update_fields=['security_status'])
        return StandardResponse(data={'security_status': version.security_status},
                                message='تم إجراء الفحص الأمني.')


class PluginInstallationViewSet(BaseCRUDViewSet):
    model_class = m.PluginInstallation
    serializer_class = s.PluginInstallationSerializer

    @action(detail=True, methods=['post'], url_path='enable')
    def enable(self, request, pk=None):
        install = self.get_object()
        if install.version.security_status != 'passed':
            return StandardResponse(data=None, message='لا يمكن التفعيل: الإصدار لم يجتز الفحص الأمني.',
                                    success=False, status=status.HTTP_400_BAD_REQUEST)
        install.state = 'enabled'
        install.save(update_fields=['state'])
        return StandardResponse(data={'state': install.state}, message='تم تفعيل الإضافة.')


# ----------------------- Operations -----------------------

class OperationsAlertViewSet(BaseCRUDViewSet):
    model_class = m.OperationsAlert
    serializer_class = s.OperationsAlertSerializer


class SystemHealthSnapshotViewSet(BaseCRUDViewSet):
    model_class = m.SystemHealthSnapshot
    serializer_class = s.SystemHealthSnapshotSerializer


class OperationsOverviewView(APIView):
    """ملخص لوحة العمليات: أحدث حالة لكل مكوّن + التنبيهات المفتوحة."""

    def get(self, request):
        data = OperationsService.overview(tenant_id=_tenant_id(request))
        return StandardResponse(data=data, message='ملخص حالة النظام.')

    def post(self, request):
        results = OperationsService.collect_health(tenant_id=_tenant_id(request))
        return StandardResponse(data=results, message='تم جمع لقطات صحة النظام.')


# ----------------------- DevOps -----------------------

class EnvironmentViewSet(BaseCRUDViewSet):
    model_class = m.Environment
    serializer_class = s.EnvironmentSerializer


class SecretViewSet(BaseCRUDViewSet):
    model_class = m.Secret
    serializer_class = s.SecretSerializer


class ConfigItemViewSet(BaseCRUDViewSet):
    model_class = m.ConfigItem
    serializer_class = s.ConfigItemSerializer


class FeatureFlagViewSet(BaseCRUDViewSet):
    model_class = m.FeatureFlag
    serializer_class = s.FeatureFlagSerializer

    @action(detail=True, methods=['post'], url_path='toggle')
    def toggle(self, request, pk=None):
        flag = self.get_object()
        flag.is_enabled = not flag.is_enabled
        flag.save(update_fields=['is_enabled'])
        return StandardResponse(data={'is_enabled': flag.is_enabled}, message='تم تبديل راية الميزة.')


class DeploymentViewSet(BaseCRUDViewSet):
    model_class = m.Deployment
    serializer_class = s.DeploymentSerializer

    @action(detail=True, methods=['post'], url_path='rollback')
    def rollback(self, request, pk=None):
        deployment = self.get_object()
        deployment.status = 'rolled_back'
        deployment.save(update_fields=['status'])
        return StandardResponse(data={'status': deployment.status},
                                message='تم تسجيل التراجع (Rollback) — لا يُنفَّذ نشر سحابي فعلي.')


class ReleaseVersionViewSet(BaseCRUDViewSet):
    model_class = m.ReleaseVersion
    serializer_class = s.ReleaseVersionSerializer


class HealthCheckViewSet(BaseCRUDViewSet):
    model_class = m.HealthCheck
    serializer_class = s.HealthCheckSerializer


class MaintenanceWindowViewSet(BaseCRUDViewSet):
    model_class = m.MaintenanceWindow
    serializer_class = s.MaintenanceWindowSerializer


class BackupRecordViewSet(BaseCRUDViewSet):
    model_class = m.BackupRecord
    serializer_class = s.BackupRecordSerializer


class LogEntryViewSet(BaseCRUDViewSet):
    model_class = m.LogEntry
    serializer_class = s.LogEntrySerializer


# ----------------------- AI Assist -----------------------

class AIAssistView(APIView):
    """
    استهلاك منصة الذكاء الاصطناعي لتوليد المخططات/القواعد/النماذج.
    لا يوجد نموذج مضمّن — يُستخدم مزوّد قابل للاستبدال (AIAssistProvider).
    """

    def post(self, request):
        kind = request.data.get('kind')  # workflow|rules|form|automations
        prompt = request.data.get('prompt', '')
        context = request.data.get('context', {})
        provider = ai_integration.get_provider()
        mapping = {
            'workflow': provider.generate_workflow,
            'rules': provider.suggest_rules,
            'form': provider.generate_form,
            'automations': provider.suggest_automations,
        }
        fn = mapping.get(kind)
        if fn is None:
            return StandardResponse(data=None, message='نوع التوليد غير مدعوم.', success=False,
                                    status=status.HTTP_400_BAD_REQUEST)
        return StandardResponse(data=fn(prompt, context), message='تم توليد الاقتراح عبر منصة الذكاء الاصطناعي.')
