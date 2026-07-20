from rest_framework import status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.core.exceptions import ValidationError as DjangoValidationError

from apps.common.responses import StandardResponse
from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.clinic.domain.models import (
    Clinic, ClinicRoom, MedicalStaff, MedicalProfile, ClinicVisit,
    VisitDiagnosis, Treatment, Medication, MedicationDispense, Prescription,
    Allergy, ChronicCondition, Vaccination, VaccinationSchedule, MedicalScreening,
    VitalSigns, GrowthRecord, HeightWeightRecord, VisionScreening, HearingScreening,
    DentalScreening, EmergencyCase, EmergencyContact, MedicalLeave, MedicalCertificate,
    HealthCampaign, HealthIncident, IsolationCase, MedicalAttachment, ClinicSettings,
    ClinicStatistics, ClinicAudit
)
from apps.clinic.interfaces.serializers import (
    ClinicSerializer, ClinicRoomSerializer, MedicalStaffSerializer, MedicalProfileSerializer,
    ClinicVisitSerializer, VisitDiagnosisSerializer, TreatmentSerializer, MedicationSerializer,
    MedicationDispenseSerializer, PrescriptionSerializer, AllergySerializer, ChronicConditionSerializer,
    VaccinationSerializer, VaccinationScheduleSerializer, MedicalScreeningSerializer, VitalSignsSerializer,
    GrowthRecordSerializer, HeightWeightRecordSerializer, VisionScreeningSerializer, HearingScreeningSerializer,
    DentalScreeningSerializer, EmergencyCaseSerializer, EmergencyContactSerializer, MedicalLeaveSerializer,
    MedicalCertificateSerializer, HealthCampaignSerializer, HealthIncidentSerializer, IsolationCaseSerializer,
    MedicalAttachmentSerializer, ClinicSettingsSerializer, ClinicStatisticsSerializer, ClinicAuditSerializer
)
from apps.clinic.application.services import ClinicVisitService, MedicationService, MedicalLeaveService


class ClinicViewSet(BaseCRUDViewSet):
    model_class = Clinic
    serializer_class = ClinicSerializer


class ClinicRoomViewSet(BaseCRUDViewSet):
    model_class = ClinicRoom
    serializer_class = ClinicRoomSerializer


class MedicalStaffViewSet(BaseCRUDViewSet):
    model_class = MedicalStaff
    serializer_class = MedicalStaffSerializer


class MedicalProfileViewSet(BaseCRUDViewSet):
    model_class = MedicalProfile
    serializer_class = MedicalProfileSerializer


class ClinicVisitViewSet(BaseCRUDViewSet):
    model_class = ClinicVisit
    serializer_class = ClinicVisitSerializer

    @action(detail=False, methods=['get'], url_path='people')
    def people(self, request):
        """الطلاب والموظفون في قائمة واحدة — من يُستقبل في العيادة.

        تُجمع هنا لتفادي اعتماد شاشة العيادة على صلاحيات موديولَي الطلاب
        وشؤون الموظفين، ولتُعرض الأسماء بدل المعرّفات الخام.
        """
        from apps.shared.application.people import list_people
        return StandardResponse(
            list_people(request.tenant_id),
            message="الطلاب والموظفون المتاحون للعيادة.",
        )

    @action(detail=False, methods=['get'], url_path='dashboard-stats')
    def get_dashboard_stats(self, request):
        """جلب إحصائيات لوحة تحكم العيادة الطبية المدرسية."""
        tenant_id = request.tenant_id
        
        today = timezone.now().date()
        today_visits = ClinicVisit.objects.filter(tenant_id=tenant_id, visit_date=today).count()
        emergency_cases = EmergencyCase.objects.filter(tenant_id=tenant_id, incident_time__date=today).count()
        active_isolations = IsolationCase.objects.filter(tenant_id=tenant_id, end_date__isnull=True).count()
        pending_leaves = MedicalLeave.objects.filter(tenant_id=tenant_id, status='submitted').count()

        stats = {
            'today_visits': today_visits,
            'emergency_cases': emergency_cases,
            'active_isolations': active_isolations,
            'pending_leaves': pending_leaves
        }
        return Response(stats, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='dispense')
    def dispense_medication(self, request, pk=None):
        tenant_id = request.tenant_id
        medication_id = request.data.get('medication_id')
        quantity = request.data.get('quantity', 1.00)
        warehouse_id = request.data.get('warehouse_id')

        if not medication_id:
            return Response({'error': 'medication_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        dispense = MedicationService.dispense_medication(
            tenant_id=tenant_id,
            visit_id=pk,
            medication_id=medication_id,
            quantity=quantity,
            warehouse_id=warehouse_id,
            user_id=request.user.id if request.user else None
        )
        serializer = MedicationDispenseSerializer(dispense)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class VisitDiagnosisViewSet(BaseCRUDViewSet):
    model_class = VisitDiagnosis
    serializer_class = VisitDiagnosisSerializer


class TreatmentViewSet(BaseCRUDViewSet):
    model_class = Treatment
    serializer_class = TreatmentSerializer


class MedicationViewSet(BaseCRUDViewSet):
    model_class = Medication
    serializer_class = MedicationSerializer


class MedicationDispenseViewSet(BaseCRUDViewSet):
    model_class = MedicationDispense
    serializer_class = MedicationDispenseSerializer


class PrescriptionViewSet(BaseCRUDViewSet):
    model_class = Prescription
    serializer_class = PrescriptionSerializer


class AllergyViewSet(BaseCRUDViewSet):
    model_class = Allergy
    serializer_class = AllergySerializer


class ChronicConditionViewSet(BaseCRUDViewSet):
    model_class = ChronicCondition
    serializer_class = ChronicConditionSerializer


class VaccinationViewSet(BaseCRUDViewSet):
    model_class = Vaccination
    serializer_class = VaccinationSerializer


class VaccinationScheduleViewSet(BaseCRUDViewSet):
    model_class = VaccinationSchedule
    serializer_class = VaccinationScheduleSerializer


class MedicalScreeningViewSet(BaseCRUDViewSet):
    model_class = MedicalScreening
    serializer_class = MedicalScreeningSerializer


class VitalSignsViewSet(BaseCRUDViewSet):
    model_class = VitalSigns
    serializer_class = VitalSignsSerializer


class GrowthRecordViewSet(BaseCRUDViewSet):
    model_class = GrowthRecord
    serializer_class = GrowthRecordSerializer


class HeightWeightRecordViewSet(BaseCRUDViewSet):
    model_class = HeightWeightRecord
    serializer_class = HeightWeightRecordSerializer


class VisionScreeningViewSet(BaseCRUDViewSet):
    model_class = VisionScreening
    serializer_class = VisionScreeningSerializer


class HearingScreeningViewSet(BaseCRUDViewSet):
    model_class = HearingScreening
    serializer_class = HearingScreeningSerializer


class DentalScreeningViewSet(BaseCRUDViewSet):
    model_class = DentalScreening
    serializer_class = DentalScreeningSerializer


class EmergencyCaseViewSet(BaseCRUDViewSet):
    model_class = EmergencyCase
    serializer_class = EmergencyCaseSerializer


class EmergencyContactViewSet(BaseCRUDViewSet):
    model_class = EmergencyContact
    serializer_class = EmergencyContactSerializer


class MedicalLeaveViewSet(BaseCRUDViewSet):
    model_class = MedicalLeave
    serializer_class = MedicalLeaveSerializer

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        tenant_id = request.tenant_id
        leave = MedicalLeaveService.approve_medical_leave(
            tenant_id=tenant_id,
            leave_id=pk,
            user_id=request.user.id if request.user else None
        )
        serializer = self.get_serializer(leave)
        return Response(serializer.data, status=status.HTTP_200_OK)


class MedicalCertificateViewSet(BaseCRUDViewSet):
    model_class = MedicalCertificate
    serializer_class = MedicalCertificateSerializer


class HealthCampaignViewSet(BaseCRUDViewSet):
    model_class = HealthCampaign
    serializer_class = HealthCampaignSerializer


class HealthIncidentViewSet(BaseCRUDViewSet):
    model_class = HealthIncident
    serializer_class = HealthIncidentSerializer


class IsolationCaseViewSet(BaseCRUDViewSet):
    model_class = IsolationCase
    serializer_class = IsolationCaseSerializer


class MedicalAttachmentViewSet(BaseCRUDViewSet):
    model_class = MedicalAttachment
    serializer_class = MedicalAttachmentSerializer


class ClinicSettingsViewSet(BaseCRUDViewSet):
    model_class = ClinicSettings
    serializer_class = ClinicSettingsSerializer


class ClinicStatisticsViewSet(BaseCRUDViewSet):
    model_class = ClinicStatistics
    serializer_class = ClinicStatisticsSerializer


class ClinicAuditViewSet(BaseCRUDViewSet):
    model_class = ClinicAudit
    serializer_class = ClinicAuditSerializer
