"""DRF serializers for the Enterprise Automation Platform (ModelSerializer, fields='__all__')."""
from rest_framework import serializers
from apps.automation_platform.domain import models as m


def _make(model_cls):
    """مصنع مُسلسِلات موحّد يقلل التكرار مع الحفاظ على النمط القياسي."""
    meta = type('Meta', (), {'model': model_cls, 'fields': '__all__'})
    return type(f'{model_cls.__name__}Serializer', (serializers.ModelSerializer,), {'Meta': meta})


# Designer
WorkflowDiagramSerializer = _make(m.WorkflowDiagram)
WorkflowNodeSerializer = _make(m.WorkflowNode)
WorkflowEdgeSerializer = _make(m.WorkflowEdge)
WorkflowBlockSerializer = _make(m.WorkflowBlock)
WorkflowTemplateSerializer = _make(m.WorkflowTemplate)
WorkflowDiagramVersionSerializer = _make(m.WorkflowDiagramVersion)
WorkflowSimulationSerializer = _make(m.WorkflowSimulation)
WorkflowValidationIssueSerializer = _make(m.WorkflowValidationIssue)

# Rule designer
DecisionTableSerializer = _make(m.DecisionTable)
DecisionTableRuleSerializer = _make(m.DecisionTableRule)
DecisionTreeSerializer = _make(m.DecisionTree)
DecisionTreeNodeSerializer = _make(m.DecisionTreeNode)
RuleSetSerializer = _make(m.RuleSet)
RuleSetMemberSerializer = _make(m.RuleSetMember)
RuleSimulationSerializer = _make(m.RuleSimulation)

# Automation
AutomationFlowSerializer = _make(m.AutomationFlow)
AutomationTriggerSerializer = _make(m.AutomationTrigger)
AutomationActionSerializer = _make(m.AutomationAction)
RetryPolicySerializer = _make(m.RetryPolicy)
ScheduledJobSerializer = _make(m.ScheduledJob)
WebhookEndpointSerializer = _make(m.WebhookEndpoint)
AutomationRunSerializer = _make(m.AutomationRun)
AutomationRunStepSerializer = _make(m.AutomationRunStep)

# Low-code
EntityDefinitionSerializer = _make(m.EntityDefinition)
EntityFieldSerializer = _make(m.EntityField)
RelationshipDefinitionSerializer = _make(m.RelationshipDefinition)
ValidationDefinitionSerializer = _make(m.ValidationDefinition)
CrudDefinitionSerializer = _make(m.CrudDefinition)
FormDefinitionSerializer = _make(m.FormDefinition)
PageDefinitionSerializer = _make(m.PageDefinition)
WidgetDefinitionSerializer = _make(m.WidgetDefinition)
ApiDefinitionSerializer = _make(m.ApiDefinition)
ModuleDefinitionSerializer = _make(m.ModuleDefinition)
MetadataRegistrySerializer = _make(m.MetadataRegistry)
GeneratedArtifactSerializer = _make(m.GeneratedArtifact)

# Plugins
PluginSerializer = _make(m.Plugin)
PluginVersionSerializer = _make(m.PluginVersion)
PluginDependencySerializer = _make(m.PluginDependency)
PluginInstallationSerializer = _make(m.PluginInstallation)

# Operations
SystemHealthSnapshotSerializer = _make(m.SystemHealthSnapshot)
JobMetricSerializer = _make(m.JobMetric)
QueueMetricSerializer = _make(m.QueueMetric)
WorkerMetricSerializer = _make(m.WorkerMetric)
ResourceMetricSerializer = _make(m.ResourceMetric)
TenantUsageMetricSerializer = _make(m.TenantUsageMetric)
OperationsAlertSerializer = _make(m.OperationsAlert)

# DevOps
EnvironmentSerializer = _make(m.Environment)
SecretSerializer = _make(m.Secret)
ConfigItemSerializer = _make(m.ConfigItem)
FeatureFlagSerializer = _make(m.FeatureFlag)
DeploymentSerializer = _make(m.Deployment)
ReleaseVersionSerializer = _make(m.ReleaseVersion)
HealthCheckSerializer = _make(m.HealthCheck)
MaintenanceWindowSerializer = _make(m.MaintenanceWindow)
BackupRecordSerializer = _make(m.BackupRecord)
MigrationRecordSerializer = _make(m.MigrationRecord)
LogEntrySerializer = _make(m.LogEntry)
TraceSpanSerializer = _make(m.TraceSpan)
MetricSampleSerializer = _make(m.MetricSample)
