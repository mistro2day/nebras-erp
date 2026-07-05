"""Aggregated domain models for the Enterprise Automation Platform."""
from apps.automation_platform.domain.models.designer import (
    WorkflowDiagram, WorkflowNode, WorkflowEdge, WorkflowBlock, WorkflowTemplate,
    WorkflowDiagramVersion, WorkflowSimulation, WorkflowValidationIssue,
)
from apps.automation_platform.domain.models.rule_designer import (
    DecisionTable, DecisionTableRule, DecisionTree, DecisionTreeNode,
    RuleSet, RuleSetMember, RuleSimulation,
)
from apps.automation_platform.domain.models.automation import (
    AutomationFlow, AutomationTrigger, AutomationAction, RetryPolicy,
    ScheduledJob, WebhookEndpoint, AutomationRun, AutomationRunStep,
)
from apps.automation_platform.domain.models.lowcode import (
    EntityDefinition, EntityField, RelationshipDefinition, ValidationDefinition,
    CrudDefinition, FormDefinition, PageDefinition, WidgetDefinition,
    ApiDefinition, ModuleDefinition, MetadataRegistry, GeneratedArtifact,
)
from apps.automation_platform.domain.models.plugins import (
    Plugin, PluginVersion, PluginDependency, PluginInstallation,
)
from apps.automation_platform.domain.models.operations import (
    SystemHealthSnapshot, JobMetric, QueueMetric, WorkerMetric,
    ResourceMetric, TenantUsageMetric, OperationsAlert,
)
from apps.automation_platform.domain.models.devops import (
    Environment, Secret, ConfigItem, FeatureFlag, Deployment, ReleaseVersion,
    HealthCheck, MaintenanceWindow, BackupRecord, MigrationRecord,
    LogEntry, TraceSpan, MetricSample,
)

__all__ = [
    'WorkflowDiagram', 'WorkflowNode', 'WorkflowEdge', 'WorkflowBlock', 'WorkflowTemplate',
    'WorkflowDiagramVersion', 'WorkflowSimulation', 'WorkflowValidationIssue',
    'DecisionTable', 'DecisionTableRule', 'DecisionTree', 'DecisionTreeNode',
    'RuleSet', 'RuleSetMember', 'RuleSimulation',
    'AutomationFlow', 'AutomationTrigger', 'AutomationAction', 'RetryPolicy',
    'ScheduledJob', 'WebhookEndpoint', 'AutomationRun', 'AutomationRunStep',
    'EntityDefinition', 'EntityField', 'RelationshipDefinition', 'ValidationDefinition',
    'CrudDefinition', 'FormDefinition', 'PageDefinition', 'WidgetDefinition',
    'ApiDefinition', 'ModuleDefinition', 'MetadataRegistry', 'GeneratedArtifact',
    'Plugin', 'PluginVersion', 'PluginDependency', 'PluginInstallation',
    'SystemHealthSnapshot', 'JobMetric', 'QueueMetric', 'WorkerMetric',
    'ResourceMetric', 'TenantUsageMetric', 'OperationsAlert',
    'Environment', 'Secret', 'ConfigItem', 'FeatureFlag', 'Deployment', 'ReleaseVersion',
    'HealthCheck', 'MaintenanceWindow', 'BackupRecord', 'MigrationRecord',
    'LogEntry', 'TraceSpan', 'MetricSample',
]
