from django.contrib import admin
from apps.workflow.models import (
    WorkflowDefinition,
    WorkflowState,
    WorkflowTransition,
    WorkflowInstance,
    WorkflowHistory,
)


class WorkflowStateInline(admin.TabularInline):
    model = WorkflowState
    extra = 1


class WorkflowTransitionInline(admin.TabularInline):
    model = WorkflowTransition
    fk_name = 'workflow'
    extra = 1


@admin.register(WorkflowDefinition)
class WorkflowDefinitionAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'content_type', 'is_active', 'tenant_id')
    list_filter = ('is_active', 'content_type')
    search_fields = ('name', 'code')
    inlines = [WorkflowStateInline, WorkflowTransitionInline]


@admin.register(WorkflowInstance)
class WorkflowInstanceAdmin(admin.ModelAdmin):
    list_display = ('workflow', 'current_state', 'content_type', 'object_id', 'tenant_id')
    list_filter = ('workflow', 'current_state')
    search_fields = ('object_id',)


@admin.register(WorkflowHistory)
class WorkflowHistoryAdmin(admin.ModelAdmin):
    list_display = ('instance', 'from_state', 'to_state', 'action_taken', 'action_by')
    list_filter = ('action_taken',)
    ordering = ('-created_at',)


admin.site.register(WorkflowState)
admin.site.register(WorkflowTransition)
