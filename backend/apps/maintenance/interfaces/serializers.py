from rest_framework import serializers
from apps.maintenance.domain.models import (
    MaintenanceCategory, MaintenancePriority, MaintenanceType, MaintenanceRequest,
    MaintenanceTeam, Technician, WorkOrder, WorkOrderTask, MaintenancePlan,
    PreventiveSchedule, Inspection, InspectionChecklist, InspectionItem,
    MaintenanceAssignment, MaintenanceVisit, MaintenanceVendor, MaintenanceContract,
    MaintenanceCost, LaborCost, MaterialConsumption, DowntimeRecord, FailureReason,
    RootCause, CorrectiveAction, MaintenanceHistory, MaintenanceAttachment,
    MaintenanceAudit, MaintenanceSettings, MaintenanceStatistics
)

class BaseMaintSerializer(serializers.ModelSerializer):
    class Meta:
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')

class MaintenanceCategorySerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = MaintenanceCategory
        fields = '__all__'

class MaintenancePrioritySerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = MaintenancePriority
        fields = '__all__'

class MaintenanceTypeSerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = MaintenanceType
        fields = '__all__'

class MaintenanceRequestSerializer(BaseMaintSerializer):
    # الرقم يُولَّد في الخادم — لا يُطلب من المستخدم ولا يُقبل منه
    request_number = serializers.CharField(read_only=True)

    class Meta(BaseMaintSerializer.Meta):
        model = MaintenanceRequest
        fields = '__all__'

class MaintenanceTeamSerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = MaintenanceTeam
        fields = '__all__'

class TechnicianSerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = Technician
        fields = '__all__'

class WorkOrderSerializer(BaseMaintSerializer):
    # الرقم يُولَّد في الخادم — لا يُطلب من المستخدم ولا يُقبل منه
    wo_number = serializers.CharField(read_only=True)

    class Meta(BaseMaintSerializer.Meta):
        model = WorkOrder
        fields = '__all__'

class WorkOrderTaskSerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = WorkOrderTask
        fields = '__all__'

class MaintenancePlanSerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = MaintenancePlan
        fields = '__all__'

class PreventiveScheduleSerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = PreventiveSchedule
        fields = '__all__'

class InspectionSerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = Inspection
        fields = '__all__'

class InspectionChecklistSerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = InspectionChecklist
        fields = '__all__'

class InspectionItemSerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = InspectionItem
        fields = '__all__'

class MaintenanceAssignmentSerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = MaintenanceAssignment
        fields = '__all__'

class MaintenanceVisitSerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = MaintenanceVisit
        fields = '__all__'

class MaintenanceVendorSerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = MaintenanceVendor
        fields = '__all__'

class MaintenanceContractSerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = MaintenanceContract
        fields = '__all__'

class MaintenanceCostSerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = MaintenanceCost
        fields = '__all__'

class LaborCostSerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = LaborCost
        fields = '__all__'

class MaterialConsumptionSerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = MaterialConsumption
        fields = '__all__'

class DowntimeRecordSerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = DowntimeRecord
        fields = '__all__'

class FailureReasonSerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = FailureReason
        fields = '__all__'

class RootCauseSerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = RootCause
        fields = '__all__'

class CorrectiveActionSerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = CorrectiveAction
        fields = '__all__'

class MaintenanceHistorySerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = MaintenanceHistory
        fields = '__all__'

class MaintenanceAttachmentSerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = MaintenanceAttachment
        fields = '__all__'

class MaintenanceAuditSerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = MaintenanceAudit
        fields = '__all__'

class MaintenanceSettingsSerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = MaintenanceSettings
        fields = '__all__'

class MaintenanceStatisticsSerializer(BaseMaintSerializer):
    class Meta(BaseMaintSerializer.Meta):
        model = MaintenanceStatistics
        fields = '__all__'
