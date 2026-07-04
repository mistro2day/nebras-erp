from django.contrib import admin
from apps.clinic.domain.models import (
    Clinic, ClinicRoom, MedicalStaff, MedicalProfile, ClinicVisit,
    VisitDiagnosis, Treatment, Medication, MedicationDispense, Prescription,
    Allergy, ChronicCondition, Vaccination, VaccinationSchedule, MedicalScreening,
    VitalSigns, GrowthRecord, HeightWeightRecord, VisionScreening, HearingScreening,
    DentalScreening, EmergencyCase, EmergencyContact, MedicalLeave, MedicalCertificate,
    HealthCampaign, HealthIncident, IsolationCase, ClinicSettings
)

@admin.register(Clinic)
class ClinicAdmin(admin.ModelAdmin):
    list_display = ('code', 'name_ar', 'name_en', 'tenant_id')
    search_fields = ('code', 'name_ar')

@admin.register(MedicalProfile)
class MedicalProfileAdmin(admin.ModelAdmin):
    list_display = ('patient_user_id', 'blood_group', 'tenant_id')
    list_filter = ('blood_group',)
    search_fields = ('patient_user_id',)

@admin.register(ClinicVisit)
class ClinicVisitAdmin(admin.ModelAdmin):
    list_display = ('clinic', 'patient_user_id', 'visit_date', 'visit_type', 'status')
    list_filter = ('status', 'visit_type')
    search_fields = ('patient_user_id',)

@admin.register(MedicationDispense)
class MedicationDispenseAdmin(admin.ModelAdmin):
    list_display = ('visit', 'medication', 'quantity_dispensed', 'dispense_date')
    list_filter = ('dispense_date',)

@admin.register(MedicalLeave)
class MedicalLeaveAdmin(admin.ModelAdmin):
    list_display = ('patient_user_id', 'start_date', 'end_date', 'status')
    list_filter = ('status',)

admin.site.register(ClinicRoom)
admin.site.register(MedicalStaff)
admin.site.register(VisitDiagnosis)
admin.site.register(Treatment)
admin.site.register(Medication)
admin.site.register(Prescription)
admin.site.register(Allergy)
admin.site.register(ChronicCondition)
admin.site.register(Vaccination)
admin.site.register(VaccinationSchedule)
admin.site.register(MedicalScreening)
admin.site.register(VitalSigns)
admin.site.register(GrowthRecord)
admin.site.register(HeightWeightRecord)
admin.site.register(VisionScreening)
admin.site.register(HearingScreening)
admin.site.register(DentalScreening)
admin.site.register(EmergencyCase)
admin.site.register(EmergencyContact)
admin.site.register(MedicalCertificate)
admin.site.register(HealthCampaign)
admin.site.register(HealthIncident)
admin.site.register(IsolationCase)
admin.site.register(ClinicSettings)
