from rest_framework import serializers
from apps.clinic.domain.models import (
    Clinic, ClinicRoom, MedicalStaff, MedicalProfile, ClinicVisit,
    VisitDiagnosis, Treatment, Medication, MedicationDispense, Prescription,
    Allergy, ChronicCondition, Vaccination, VaccinationSchedule, MedicalScreening,
    VitalSigns, GrowthRecord, HeightWeightRecord, VisionScreening, HearingScreening,
    DentalScreening, EmergencyCase, EmergencyContact, MedicalLeave, MedicalCertificate,
    HealthCampaign, HealthIncident, IsolationCase, MedicalAttachment, ClinicSettings,
    ClinicStatistics, ClinicAudit
)

class BaseClinicSerializer(serializers.ModelSerializer):
    class Meta:
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')

class ClinicSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = Clinic
        fields = '__all__'

class ClinicRoomSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = ClinicRoom
        fields = '__all__'

class MedicalStaffSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = MedicalStaff
        fields = '__all__'

class MedicalProfileSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = MedicalProfile
        fields = '__all__'

class ClinicVisitSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = ClinicVisit
        fields = '__all__'

class VisitDiagnosisSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = VisitDiagnosis
        fields = '__all__'

class TreatmentSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = Treatment
        fields = '__all__'

class MedicationSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = Medication
        fields = '__all__'

class MedicationDispenseSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = MedicationDispense
        fields = '__all__'

class PrescriptionSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = Prescription
        fields = '__all__'

class AllergySerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = Allergy
        fields = '__all__'

class ChronicConditionSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = ChronicCondition
        fields = '__all__'

class VaccinationSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = Vaccination
        fields = '__all__'

class VaccinationScheduleSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = VaccinationSchedule
        fields = '__all__'

class MedicalScreeningSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = MedicalScreening
        fields = '__all__'

class VitalSignsSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = VitalSigns
        fields = '__all__'

class GrowthRecordSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = GrowthRecord
        fields = '__all__'

class HeightWeightRecordSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = HeightWeightRecord
        fields = '__all__'

class VisionScreeningSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = VisionScreening
        fields = '__all__'

class HearingScreeningSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = HearingScreening
        fields = '__all__'

class DentalScreeningSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = DentalScreening
        fields = '__all__'

class EmergencyCaseSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = EmergencyCase
        fields = '__all__'

class EmergencyContactSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = EmergencyContact
        fields = '__all__'

class MedicalLeaveSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = MedicalLeave
        fields = '__all__'

class MedicalCertificateSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = MedicalCertificate
        fields = '__all__'

class HealthCampaignSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = HealthCampaign
        fields = '__all__'

class HealthIncidentSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = HealthIncident
        fields = '__all__'

class IsolationCaseSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = IsolationCase
        fields = '__all__'

class MedicalAttachmentSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = MedicalAttachment
        fields = '__all__'

class ClinicSettingsSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = ClinicSettings
        fields = '__all__'

class ClinicStatisticsSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = ClinicStatistics
        fields = '__all__'

class ClinicAuditSerializer(BaseClinicSerializer):
    class Meta(BaseClinicSerializer.Meta):
        model = ClinicAudit
        fields = '__all__'
