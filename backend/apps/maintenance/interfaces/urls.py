from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.maintenance.interfaces.views import (
    MaintenanceCategoryViewSet, MaintenancePriorityViewSet, MaintenanceTypeViewSet,
    MaintenanceRequestViewSet, MaintenanceTeamViewSet, TechnicianViewSet,
    WorkOrderViewSet, WorkOrderTaskViewSet, MaintenancePlanViewSet,
    PreventiveScheduleViewSet, InspectionViewSet, InspectionChecklistViewSet,
    InspectionItemViewSet, MaintenanceAssignmentViewSet, MaintenanceVisitViewSet,
    MaintenanceVendorViewSet, MaintenanceContractViewSet, MaintenanceCostViewSet,
    LaborCostViewSet, MaterialConsumptionViewSet, DowntimeRecordViewSet,
    FailureReasonViewSet, RootCauseViewSet, CorrectiveActionViewSet,
    MaintenanceHistoryViewSet, MaintenanceAttachmentViewSet, MaintenanceAuditViewSet,
    MaintenanceSettingsViewSet, MaintenanceStatisticsViewSet
)

router = DefaultRouter()
router.register('categories', MaintenanceCategoryViewSet, basename='category')
router.register('priorities', MaintenancePriorityViewSet, basename='priority')
router.register('types', MaintenanceTypeViewSet, basename='type')
router.register('requests', MaintenanceRequestViewSet, basename='request')
router.register('teams', MaintenanceTeamViewSet, basename='team')
router.register('technicians', TechnicianViewSet, basename='technician')
router.register('work-orders', WorkOrderViewSet, basename='work-order')
router.register('tasks', WorkOrderTaskViewSet, basename='task')
router.register('plans', MaintenancePlanViewSet, basename='plan')
router.register('prev-schedules', PreventiveScheduleViewSet, basename='prev-schedule')
router.register('inspections', InspectionViewSet, basename='inspection')
router.register('checklists', InspectionChecklistViewSet, basename='checklist')
router.register('inspection-items', InspectionItemViewSet, basename='inspection-item')
router.register('assignments', MaintenanceAssignmentViewSet, basename='assignment')
router.register('visits', MaintenanceVisitViewSet, basename='visit')
router.register('vendors', MaintenanceVendorViewSet, basename='vendor')
router.register('contracts', MaintenanceContractViewSet, basename='contract')
router.register('costs', MaintenanceCostViewSet, basename='cost')
router.register('labor-costs', LaborCostViewSet, basename='labor-cost')
router.register('material-consumptions', MaterialConsumptionViewSet, basename='material-consumption')
router.register('downtimes', DowntimeRecordViewSet, basename='downtime')
router.register('failure-reasons', FailureReasonViewSet, basename='failure-reason')
router.register('root-causes', RootCauseViewSet, basename='root-cause')
router.register('corrective-actions', CorrectiveActionViewSet, basename='corrective-action')
router.register('history', MaintenanceHistoryViewSet, basename='history')
router.register('attachments', MaintenanceAttachmentViewSet, basename='attachment')
router.register('audits', MaintenanceAuditViewSet, basename='audit')
router.register('settings', MaintenanceSettingsViewSet, basename='settings')
router.register('statistics', MaintenanceStatisticsViewSet, basename='statistics')

urlpatterns = [
    path('', include(router.urls)),
]
