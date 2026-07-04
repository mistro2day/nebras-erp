from django.contrib import admin
from apps.maintenance.domain.models import (
    MaintenanceCategory, MaintenancePriority, MaintenanceType, MaintenanceRequest,
    MaintenanceTeam, Technician, WorkOrder, WorkOrderTask, MaintenancePlan,
    PreventiveSchedule, Inspection, InspectionChecklist, InspectionItem,
    MaintenanceCost, LaborCost, MaterialConsumption, DowntimeRecord, RootCause
)

@admin.register(MaintenanceCategory)
class MaintenanceCategoryAdmin(admin.ModelAdmin):
    list_display = ('code', 'name_ar', 'name_en', 'tenant_id')
    search_fields = ('code', 'name_ar')

@admin.register(MaintenancePriority)
class MaintenancePriorityAdmin(admin.ModelAdmin):
    list_display = ('code', 'name_ar', 'tenant_id')

@admin.register(MaintenanceRequest)
class MaintenanceRequestAdmin(admin.ModelAdmin):
    list_display = ('request_number', 'title', 'asset', 'priority', 'status', 'request_date')
    list_filter = ('status', 'priority')
    search_fields = ('request_number', 'title', 'description')

@admin.register(WorkOrder)
class WorkOrderAdmin(admin.ModelAdmin):
    list_display = ('wo_number', 'asset', 'assigned_team', 'assigned_technician', 'status', 'scheduled_start')
    list_filter = ('status',)
    search_fields = ('wo_number',)

@admin.register(PreventiveSchedule)
class PreventiveScheduleAdmin(admin.ModelAdmin):
    list_display = ('plan', 'asset', 'last_run_date', 'next_due_date', 'is_active')
    list_filter = ('is_active',)

@admin.register(Inspection)
class InspectionAdmin(admin.ModelAdmin):
    list_display = ('inspection_number', 'asset', 'inspection_date', 'inspector_user_id', 'status')
    list_filter = ('status',)

admin.site.register(MaintenanceType)
admin.site.register(MaintenanceTeam)
admin.site.register(Technician)
admin.site.register(WorkOrderTask)
admin.site.register(MaintenancePlan)
admin.site.register(InspectionChecklist)
admin.site.register(InspectionItem)
admin.site.register(MaintenanceCost)
admin.site.register(LaborCost)
admin.site.register(MaterialConsumption)
admin.site.register(DowntimeRecord)
admin.site.register(RootCause)
