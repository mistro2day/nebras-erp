from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.automation_platform.interfaces import views as v

router = DefaultRouter()

# Workflow Designer
router.register('workflow-diagrams', v.WorkflowDiagramViewSet, basename='ap-diagram')
router.register('workflow-nodes', v.WorkflowNodeViewSet, basename='ap-node')
router.register('workflow-edges', v.WorkflowEdgeViewSet, basename='ap-edge')
router.register('workflow-blocks', v.WorkflowBlockViewSet, basename='ap-block')
router.register('workflow-templates', v.WorkflowTemplateViewSet, basename='ap-wf-template')
router.register('workflow-versions', v.WorkflowDiagramVersionViewSet, basename='ap-wf-version')
router.register('workflow-simulations', v.WorkflowSimulationViewSet, basename='ap-wf-sim')

# Rule Designer
router.register('decision-tables', v.DecisionTableViewSet, basename='ap-dt')
router.register('decision-table-rules', v.DecisionTableRuleViewSet, basename='ap-dt-rule')
router.register('decision-trees', v.DecisionTreeViewSet, basename='ap-tree')
router.register('decision-tree-nodes', v.DecisionTreeNodeViewSet, basename='ap-tree-node')
router.register('rule-sets', v.RuleSetViewSet, basename='ap-ruleset')
router.register('rule-set-members', v.RuleSetMemberViewSet, basename='ap-ruleset-member')

# Automation
router.register('flows', v.AutomationFlowViewSet, basename='ap-flow')
router.register('triggers', v.AutomationTriggerViewSet, basename='ap-trigger')
router.register('actions', v.AutomationActionViewSet, basename='ap-action')
router.register('scheduled-jobs', v.ScheduledJobViewSet, basename='ap-job')
router.register('webhooks', v.WebhookEndpointViewSet, basename='ap-webhook')
router.register('runs', v.AutomationRunViewSet, basename='ap-run')

# Low-Code
router.register('entities', v.EntityDefinitionViewSet, basename='ap-entity')
router.register('entity-fields', v.EntityFieldViewSet, basename='ap-entity-field')
router.register('relationships', v.RelationshipDefinitionViewSet, basename='ap-rel')
router.register('validations', v.ValidationDefinitionViewSet, basename='ap-validation')
router.register('crud-definitions', v.CrudDefinitionViewSet, basename='ap-crud')
router.register('form-definitions', v.FormDefinitionViewSet, basename='ap-form')
router.register('page-definitions', v.PageDefinitionViewSet, basename='ap-page')
router.register('widget-definitions', v.WidgetDefinitionViewSet, basename='ap-widget')
router.register('api-definitions', v.ApiDefinitionViewSet, basename='ap-api')
router.register('module-definitions', v.ModuleDefinitionViewSet, basename='ap-module')
router.register('metadata', v.MetadataRegistryViewSet, basename='ap-metadata')
router.register('generated-artifacts', v.GeneratedArtifactViewSet, basename='ap-artifact')

# Plugins
router.register('plugins', v.PluginViewSet, basename='ap-plugin')
router.register('plugin-versions', v.PluginVersionViewSet, basename='ap-plugin-version')
router.register('plugin-installations', v.PluginInstallationViewSet, basename='ap-plugin-install')

# Operations
router.register('operations-alerts', v.OperationsAlertViewSet, basename='ap-op-alert')
router.register('health-snapshots', v.SystemHealthSnapshotViewSet, basename='ap-health')

# DevOps
router.register('environments', v.EnvironmentViewSet, basename='ap-env')
router.register('secrets', v.SecretViewSet, basename='ap-secret')
router.register('config-items', v.ConfigItemViewSet, basename='ap-config')
router.register('feature-flags', v.FeatureFlagViewSet, basename='ap-flag')
router.register('deployments', v.DeploymentViewSet, basename='ap-deploy')
router.register('releases', v.ReleaseVersionViewSet, basename='ap-release')
router.register('health-checks', v.HealthCheckViewSet, basename='ap-healthcheck')
router.register('maintenance-windows', v.MaintenanceWindowViewSet, basename='ap-maintenance')
router.register('backups', v.BackupRecordViewSet, basename='ap-backup')
router.register('logs', v.LogEntryViewSet, basename='ap-log')

urlpatterns = [
    path('operations/overview/', v.OperationsOverviewView.as_view(), name='ap-operations-overview'),
    path('ai/assist/', v.AIAssistView.as_view(), name='ap-ai-assist'),
    path('', include(router.urls)),
]
