from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.clinic.interfaces.views import (
    ClinicViewSet, ClinicRoomViewSet, MedicalStaffViewSet, MedicalProfileViewSet,
    ClinicVisitViewSet, VisitDiagnosisViewSet, TreatmentViewSet, MedicationViewSet,
    MedicationDispenseViewSet, PrescriptionViewSet, AllergyViewSet, ChronicConditionViewSet,
    VaccinationViewSet, VaccinationScheduleViewSet, MedicalScreeningViewSet, VitalSignsViewSet,
    GrowthRecordViewSet, HeightWeightRecordViewSet, VisionScreeningViewSet, HearingScreeningViewSet,
    DentalScreeningViewSet, EmergencyCaseViewSet, EmergencyContactViewSet, MedicalLeaveViewSet,
    MedicalCertificateViewSet, HealthCampaignViewSet, HealthIncidentViewSet, IsolationCaseViewSet,
    MedicalAttachmentViewSet, ClinicSettingsViewSet, ClinicStatisticsViewSet, ClinicAuditViewSet
)

router = DefaultRouter()
router.register('clinics', ClinicViewSet, basename='clinic')
router.register('rooms', ClinicRoomViewSet, basename='room')
router.register('staff', MedicalStaffViewSet, basename='staff')
router.register('profiles', MedicalProfileViewSet, basename='profile')
router.register('visits', ClinicVisitViewSet, basename='visit')
router.register('diagnoses', VisitDiagnosisViewSet, basename='diagnosis')
router.register('treatments', TreatmentViewSet, basename='treatment')
router.register('medications', MedicationViewSet, basename='medication')
router.register('dispenses', MedicationDispenseViewSet, basename='dispense')
router.register('prescriptions', PrescriptionViewSet, basename='prescription')
router.register('allergies', AllergyViewSet, basename='allergy')
router.register('chronic-conditions', ChronicConditionViewSet, basename='chronic-condition')
router.register('vaccinations', VaccinationViewSet, basename='vaccination')
router.register('vaccination-schedules', VaccinationScheduleViewSet, basename='vaccination-schedule')
router.register('screenings', MedicalScreeningViewSet, basename='screening')
router.register('vitals', VitalSignsViewSet, basename='vital')
router.register('growth-records', GrowthRecordViewSet, basename='growth-record')
router.register('height-weight-records', HeightWeightRecordViewSet, basename='height-weight-record')
router.register('vision-screenings', VisionScreeningViewSet, basename='vision-screening')
router.register('hearing-screenings', HearingScreeningViewSet, basename='hearing-screening')
router.register('dental-screenings', DentalScreeningViewSet, basename='dental-screening')
router.register('emergencies', EmergencyCaseViewSet, basename='emergency')
router.register('emergency-contacts', EmergencyContactViewSet, basename='emergency-contact')
router.register('leaves', MedicalLeaveViewSet, basename='leave')
router.register('certificates', MedicalCertificateViewSet, basename='certificate')
router.register('campaigns', HealthCampaignViewSet, basename='campaign')
router.register('incidents', HealthIncidentViewSet, basename='incident')
router.register('isolations', IsolationCaseViewSet, basename='isolation')
router.register('attachments', MedicalAttachmentViewSet, basename='attachment')
router.register('settings', ClinicSettingsViewSet, basename='settings')
router.register('statistics', ClinicStatisticsViewSet, basename='statistics')
router.register('audits', ClinicAuditViewSet, basename='audit')

urlpatterns = [
    path('', include(router.urls)),
]
