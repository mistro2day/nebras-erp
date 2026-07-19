from rest_framework import status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.core.exceptions import ValidationError as DjangoValidationError

from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.maintenance.domain.models import (
    MaintenanceCategory, MaintenancePriority, MaintenanceType, MaintenanceRequest,
    MaintenanceTeam, Technician, WorkOrder, WorkOrderTask, MaintenancePlan,
    PreventiveSchedule, Inspection, InspectionChecklist, InspectionItem,
    MaintenanceAssignment, MaintenanceVisit, MaintenanceVendor, MaintenanceContract,
    MaintenanceCost, LaborCost, MaterialConsumption, DowntimeRecord, FailureReason,
    RootCause, CorrectiveAction, MaintenanceHistory, MaintenanceAttachment,
    MaintenanceAudit, MaintenanceSettings, MaintenanceStatistics
)
from apps.maintenance.interfaces.serializers import (
    MaintenanceCategorySerializer, MaintenancePrioritySerializer, MaintenanceTypeSerializer,
    MaintenanceRequestSerializer, MaintenanceTeamSerializer, TechnicianSerializer,
    WorkOrderSerializer, WorkOrderTaskSerializer, MaintenancePlanSerializer,
    PreventiveScheduleSerializer, InspectionSerializer, InspectionChecklistSerializer,
    InspectionItemSerializer, MaintenanceAssignmentSerializer, MaintenanceVisitSerializer,
    MaintenanceVendorSerializer, MaintenanceContractSerializer, MaintenanceCostSerializer,
    LaborCostSerializer, MaterialConsumptionSerializer, DowntimeRecordSerializer,
    FailureReasonSerializer, RootCauseSerializer, CorrectiveActionSerializer,
    MaintenanceHistorySerializer, MaintenanceAttachmentSerializer, MaintenanceAuditSerializer,
    MaintenanceSettingsSerializer, MaintenanceStatisticsSerializer
)
from apps.maintenance.application.services import (
    WorkOrderService, PreventiveMaintenanceService, MaintenanceCostService
)


class MaintenanceCategoryViewSet(BaseCRUDViewSet):
    model_class = MaintenanceCategory
    serializer_class = MaintenanceCategorySerializer


class MaintenancePriorityViewSet(BaseCRUDViewSet):
    model_class = MaintenancePriority
    serializer_class = MaintenancePrioritySerializer


class MaintenanceTypeViewSet(BaseCRUDViewSet):
    model_class = MaintenanceType
    serializer_class = MaintenanceTypeSerializer


class MaintenanceRequestViewSet(BaseCRUDViewSet):
    model_class = MaintenanceRequest
    serializer_class = MaintenanceRequestSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'request_number']

    @action(detail=False, methods=['get'], url_path='dashboard-stats')
    def get_dashboard_stats(self, request):
        """جلب إحصائيات لوحة تحكم الصيانة الفورية (CMMS)."""
        tenant_id = request.tenant_id
        
        total_requests = MaintenanceRequest.objects.filter(tenant_id=tenant_id).count()
        open_requests = MaintenanceRequest.objects.filter(tenant_id=tenant_id, status='submitted').count()
        active_wo = WorkOrder.objects.filter(tenant_id=tenant_id, status='in_progress').count()
        completed_wo = WorkOrder.objects.filter(tenant_id=tenant_id, status='completed').count()

        stats_record = MaintenanceStatistics.objects.filter(tenant_id=tenant_id).first()
        total_costs = stats_record.total_maintenance_costs if stats_record else 0.0

        stats = {
            'total_requests': total_requests,
            'open_requests': open_requests,
            'active_work_orders': active_wo,
            'completed_work_orders': completed_wo,
            'total_costs': float(total_costs),
            'upcoming_inspections': Inspection.objects.filter(tenant_id=tenant_id, status='pending').count(),
            'preventive_due': PreventiveSchedule.objects.filter(tenant_id=tenant_id, is_active=True, next_due_date__lte=timezone.now().date()).count()
        }
        return Response(stats, status=status.HTTP_200_OK)


class MaintenanceTeamViewSet(BaseCRUDViewSet):
    model_class = MaintenanceTeam
    serializer_class = MaintenanceTeamSerializer


class TechnicianViewSet(BaseCRUDViewSet):
    model_class = Technician
    serializer_class = TechnicianSerializer


class WorkOrderViewSet(BaseCRUDViewSet):
    model_class = WorkOrder
    serializer_class = WorkOrderSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['wo_number']

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        tenant_id = request.tenant_id
        actual_hours = request.data.get('actual_labor_hours', 0.0)
        summary = request.data.get('summary', 'تمت عملية الصيانة الفنية بنجاح')

        try:
            wo = WorkOrderService.complete_work_order(
                tenant_id=tenant_id,
                work_order_id=pk,
                actual_hours=actual_hours,
                summary=summary,
                user_id=request.user.id if request.user else None
            )
        except DjangoValidationError as exc:
            return Response({'error': '، '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(wo)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='consume-parts')
    def consume_parts(self, request, pk=None):
        tenant_id = request.tenant_id
        warehouse_id = request.data.get('warehouse_id')
        items = request.data.get('items') # [{ 'item_id': UUID, 'qty': 2 }]

        if not warehouse_id or not items:
            return Response({'error': 'warehouse_id and items are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            maint_cost = WorkOrderService.consume_parts_for_work_order(
                tenant_id=tenant_id,
                work_order_id=pk,
                warehouse_id=warehouse_id,
                items=items,
                # حساب مصروف الصيانة ومركز التكلفة يُمرَّران لقيد الاستهلاك المخزني
                expense_account_id=request.data.get('expense_account_id'),
                cost_center_id=request.data.get('cost_center_id'),
                user_id=request.user.id if request.user else None
            )
        except DjangoValidationError as exc:
            return Response({'error': '، '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = MaintenanceCostSerializer(maint_cost)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='post-costs')
    def post_costs(self, request, pk=None):
        tenant_id = request.tenant_id
        maintenance_expense_gl_account_id = request.data.get('maintenance_expense_gl_account_id')
        offset_gl_account_id = request.data.get('offset_gl_account_id')
        cost_center_id = request.data.get('cost_center_id')

        if not maintenance_expense_gl_account_id or not offset_gl_account_id:
            return Response({'error': 'maintenance_expense_gl_account_id and offset_gl_account_id are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            cost_record = MaintenanceCostService.post_maintenance_costs_to_finance(
                tenant_id=tenant_id,
                work_order_id=pk,
                maintenance_expense_gl_account_id=maintenance_expense_gl_account_id,
                offset_gl_account_id=offset_gl_account_id,
                cost_center_id=cost_center_id,
                user_id=request.user.id if request.user else None
            )
        except DjangoValidationError as exc:
            return Response({'error': '، '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
        serializer = MaintenanceCostSerializer(cost_record)
        return Response(serializer.data, status=status.HTTP_200_OK)


class WorkOrderTaskViewSet(BaseCRUDViewSet):
    model_class = WorkOrderTask
    serializer_class = WorkOrderTaskSerializer


class MaintenancePlanViewSet(BaseCRUDViewSet):
    model_class = MaintenancePlan
    serializer_class = MaintenancePlanSerializer


class PreventiveScheduleViewSet(BaseCRUDViewSet):
    model_class = PreventiveSchedule
    serializer_class = PreventiveScheduleSerializer


class InspectionViewSet(BaseCRUDViewSet):
    model_class = Inspection
    serializer_class = InspectionSerializer


class InspectionChecklistViewSet(BaseCRUDViewSet):
    model_class = InspectionChecklist
    serializer_class = InspectionChecklistSerializer


class InspectionItemViewSet(BaseCRUDViewSet):
    model_class = InspectionItem
    serializer_class = InspectionItemSerializer


class MaintenanceAssignmentViewSet(BaseCRUDViewSet):
    model_class = MaintenanceAssignment
    serializer_class = MaintenanceAssignmentSerializer


class MaintenanceVisitViewSet(BaseCRUDViewSet):
    model_class = MaintenanceVisit
    serializer_class = MaintenanceVisitSerializer


class MaintenanceVendorViewSet(BaseCRUDViewSet):
    model_class = MaintenanceVendor
    serializer_class = MaintenanceVendorSerializer


class MaintenanceContractViewSet(BaseCRUDViewSet):
    model_class = MaintenanceContract
    serializer_class = MaintenanceContractSerializer


class MaintenanceCostViewSet(BaseCRUDViewSet):
    model_class = MaintenanceCost
    serializer_class = MaintenanceCostSerializer


class LaborCostViewSet(BaseCRUDViewSet):
    model_class = LaborCost
    serializer_class = LaborCostSerializer


class MaterialConsumptionViewSet(BaseCRUDViewSet):
    model_class = MaterialConsumption
    serializer_class = MaterialConsumptionSerializer


class DowntimeRecordViewSet(BaseCRUDViewSet):
    model_class = DowntimeRecord
    serializer_class = DowntimeRecordSerializer


class FailureReasonViewSet(BaseCRUDViewSet):
    model_class = FailureReason
    serializer_class = FailureReasonSerializer


class RootCauseViewSet(BaseCRUDViewSet):
    model_class = RootCause
    serializer_class = RootCauseSerializer


class CorrectiveActionViewSet(BaseCRUDViewSet):
    model_class = CorrectiveAction
    serializer_class = CorrectiveActionSerializer


class MaintenanceHistoryViewSet(BaseCRUDViewSet):
    model_class = MaintenanceHistory
    serializer_class = MaintenanceHistorySerializer


class MaintenanceAttachmentViewSet(BaseCRUDViewSet):
    model_class = MaintenanceAttachment
    serializer_class = MaintenanceAttachmentSerializer


class MaintenanceAuditViewSet(BaseCRUDViewSet):
    model_class = MaintenanceAudit
    serializer_class = MaintenanceAuditSerializer


class MaintenanceSettingsViewSet(BaseCRUDViewSet):
    model_class = MaintenanceSettings
    serializer_class = MaintenanceSettingsSerializer


class MaintenanceStatisticsViewSet(BaseCRUDViewSet):
    model_class = MaintenanceStatistics
    serializer_class = MaintenanceStatisticsSerializer
