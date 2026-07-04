from django.db import models
from django.utils import timezone
from apps.shared.domain.models import CombinedSharedModel

# 1. Clinic (المصحات / العيادات)
class Clinic(CombinedSharedModel):
    name_ar = models.CharField(max_length=150, verbose_name="اسم العيادة بالعربي")
    name_en = models.CharField(max_length=150, verbose_name="اسم العيادة بالإنجليزي")
    code = models.CharField(max_length=50, db_index=True, verbose_name="رمز العيادة")

    class Meta:
        db_table = 'nebras_clinic_clinics'
        unique_together = ('tenant_id', 'code')
        verbose_name = "العيادة"
        verbose_name_plural = "العيادات الطبية المدرسية"

    def __str__(self):
        return self.name_ar


# 2. ClinicRoom (غرف العيادة / العزل / الكشف)
class ClinicRoom(CombinedSharedModel):
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name='rooms', verbose_name="العيادة التابع لها")
    room_number = models.CharField(max_length=50, verbose_name="رقم الغرفة")
    purpose = models.CharField(max_length=100, blank=True, null=True, verbose_name="الغرض (مثال: غرفة كشف، غرفة عزل)")

    class Meta:
        db_table = 'nebras_clinic_rooms'
        verbose_name = "غرفة العيادة"
        verbose_name_plural = "غرف العيادات"


# 3. MedicalStaff (الكوادر الطبية / الممرضين / الأطباء)
class MedicalStaff(CombinedSharedModel):
    user_id = models.UUIDField(db_index=True, verbose_name="معرف المستخدم (طبيب/ممرض)")
    license_number = models.CharField(max_length=100, verbose_name="رقم ترخيص الممارسة الطبية")
    specialty = models.CharField(max_length=150, blank=True, null=True, verbose_name="التخصص الطبي")

    class Meta:
        db_table = 'nebras_clinic_staff'
        verbose_name = "كادر طبي"
        verbose_name_plural = "الكوادر الطبية والتمريضية"


# 4. MedicalProfile (الملفات والسجلات الطبية الشخصية)
class MedicalProfile(CombinedSharedModel):
    BLOOD_CHOICES = (
        ('A+', 'A+'), ('A-', 'A-'),
        ('B+', 'B+'), ('B-', 'B-'),
        ('AB+', 'AB+'), ('AB-', 'AB-'),
        ('O+', 'O+'), ('O-', 'O-'),
    )
    patient_user_id = models.UUIDField(unique=True, db_index=True, verbose_name="معرف المريض (طالب/موظف)")
    blood_group = models.CharField(max_length=5, choices=BLOOD_CHOICES, blank=True, null=True, verbose_name="فصيلة الدم")
    medical_alerts = models.TextField(blank=True, null=True, verbose_name="تنبيهات طبية حرجة (مثال: ربو حاد، صرع)")
    disabilities = models.TextField(blank=True, null=True, verbose_name="الإعاقات أو الاحتياجات الخاصة")

    class Meta:
        db_table = 'nebras_clinic_profiles'
        verbose_name = "الملف الطبي"
        verbose_name_plural = "الملفات السجلية الطبية الشخصية"


# 5. ClinicVisit (زيارات العيادة)
class ClinicVisit(CombinedSharedModel):
    VISIT_TYPES = (
        ('walk_in', 'حالة طارئة/عابرة'),
        ('scheduled', 'موعد كشف دوري'),
        ('emergency', 'حالة طارئة جداً'),
        ('follow_up', 'متابعة حالة'),
    )
    STATUS_CHOICES = (
        ('checked_in', 'قيد الانتظار'),
        ('diagnosed', 'تم الكشف والتشخيص'),
        ('discharged', 'مغادرة العيادة'),
        ('referred', 'إحالة لمستشفى خارجي'),
    )
    clinic = models.ForeignKey(Clinic, on_delete=models.PROTECT, verbose_name="العيادة")
    patient_user_id = models.UUIDField(db_index=True, verbose_name="معرف المريض")
    visit_date = models.DateField(default=timezone.now, verbose_name="تاريخ الزيارة")
    visit_type = models.CharField(max_length=20, choices=VISIT_TYPES, default='walk_in', verbose_name="نوع الزيارة")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='checked_in', verbose_name="حالة الزيارة")
    check_in_time = models.DateTimeField(default=timezone.now, verbose_name="وقت الدخول للعيادة")
    discharge_time = models.DateTimeField(blank=True, null=True, verbose_name="وقت الخروج من العيادة")
    notes = models.TextField(blank=True, null=True, verbose_name="ملاحظات الزيارة العامة")

    class Meta:
        db_table = 'nebras_clinic_visits'
        verbose_name = "زيارة عيادة"
        verbose_name_plural = "سجلات زيارات العيادة"


# 6. VisitDiagnosis (التشخيصات الطبية للزيارة)
class VisitDiagnosis(CombinedSharedModel):
    visit = models.ForeignKey(ClinicVisit, on_delete=models.CASCADE, related_name='diagnoses', verbose_name="زيارة العيادة")
    diagnosis_code = models.CharField(max_length=100, verbose_name="رمز التشخيص (ICD-10)")
    diagnosis_description = models.TextField(verbose_name="توصيف التشخيص الدقيق")

    class Meta:
        db_table = 'nebras_clinic_visit_diagnoses'
        verbose_name = "تشخيص زيارة"
        verbose_name_plural = "تشخيصات زيارات العيادة"


# 7. Treatment (العلاجات المقدمة والإجراءات الإسعافية)
class Treatment(CombinedSharedModel):
    visit = models.ForeignKey(ClinicVisit, on_delete=models.CASCADE, related_name='treatments', verbose_name="زيارة العيادة")
    treatment_description = models.TextField(verbose_name="توصيف العلاج/الإجراء المقدم")

    class Meta:
        db_table = 'nebras_clinic_treatments'
        verbose_name = "علاج مقدم"
        verbose_name_plural = "العلاجات والإجراءات المقدمة"


# 8. Medication (كتالوج الأدوية المتوفرة)
class Medication(CombinedSharedModel):
    name_ar = models.CharField(max_length=150, verbose_name="اسم الدواء بالعربي")
    name_en = models.CharField(max_length=150, verbose_name="اسم الدواء بالإنجليزي")
    inventory_item_id = models.UUIDField(null=True, blank=True, verbose_name="رابط صنف المخزون (InventoryItem UUID)")

    class Meta:
        db_table = 'nebras_clinic_medications'
        verbose_name = "دواء"
        verbose_name_plural = "دليل الأدوية الطبية"

    def __str__(self):
        return self.name_ar


# 9. MedicationDispense (صرف الأدوية الفعلي للمرضى)
class MedicationDispense(CombinedSharedModel):
    visit = models.ForeignKey(ClinicVisit, on_delete=models.CASCADE, related_name='dispenses', verbose_name="زيارة العيادة")
    medication = models.ForeignKey(Medication, on_delete=models.PROTECT, verbose_name="الدواء المصروف")
    quantity_dispensed = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="الكمية المصروفة")
    dispense_date = models.DateField(default=timezone.now, verbose_name="تاريخ الصرف")

    class Meta:
        db_table = 'nebras_clinic_medication_dispenses'
        verbose_name = "صرف دواء"
        verbose_name_plural = "عمليات صرف الأدوية"


# 10. Prescription (الوصفات الطبية المحفوظة)
class Prescription(CombinedSharedModel):
    visit = models.ForeignKey(ClinicVisit, on_delete=models.CASCADE, related_name='prescriptions', verbose_name="زيارة العيادة")
    instructions = models.TextField(verbose_name="تعليمات الاستخدام والجرعات")

    class Meta:
        db_table = 'nebras_clinic_prescriptions'
        verbose_name = "وصفة طبية"
        verbose_name_plural = "الوصفات الطبية"


# 11. Allergy (حالات الحساسية الموثقة)
class Allergy(CombinedSharedModel):
    profile = models.ForeignKey(MedicalProfile, on_delete=models.CASCADE, related_name='allergies', verbose_name="الملف الطبي")
    allergy_source = models.CharField(max_length=150, verbose_name="مصدر الحساسية (أدوية، طعام، حبوب لقاح)")
    reaction = models.TextField(blank=True, null=True, verbose_name="أعراض التحسس والرد الفعلي")

    class Meta:
        db_table = 'nebras_clinic_allergies'
        verbose_name = "حالة حساسية"
        verbose_name_plural = "سجلات الحساسية الطبية"


# 12. ChronicCondition (الأمراض المزمنة المتابعة)
class ChronicCondition(CombinedSharedModel):
    profile = models.ForeignKey(MedicalProfile, on_delete=models.CASCADE, related_name='chronic_conditions', verbose_name="الملف الطبي")
    condition_name = models.CharField(max_length=200, verbose_name="اسم المرض المزمن (مثال: سكري من النوع الأول)")
    notes = models.TextField(blank=True, null=True, verbose_name="ملاحظات العناية والرعاية اليومية")

    class Meta:
        db_table = 'nebras_clinic_chronic_conditions'
        verbose_name = "مرض مزمن"
        verbose_name_plural = "الأمراض المزمنة المتابعة"


# 13. Vaccination (اللقاحات والتحصينات المستلمة)
class Vaccination(CombinedSharedModel):
    profile = models.ForeignKey(MedicalProfile, on_delete=models.CASCADE, related_name='vaccinations', verbose_name="الملف الطبي")
    vaccine_name = models.CharField(max_length=150, verbose_name="اسم اللقاح/الجرعة")
    date_administered = models.DateField(verbose_name="تاريخ تلقي اللقاح")
    certified_by = models.CharField(max_length=150, blank=True, null=True, verbose_name="الجهة المانحة/الطبيب المعني")

    class Meta:
        db_table = 'nebras_clinic_vaccinations'
        verbose_name = "تحصين/لقاح"
        verbose_name_plural = "سجلات اللقاحات والتحصينات"


# 14. VaccinationSchedule (جدولة اللقاحات الدورية للطلاب)
class VaccinationSchedule(CombinedSharedModel):
    target_age_months = models.IntegerField(verbose_name="السن المستهدف بالشهور لتلقي اللقاح")
    vaccine_name = models.CharField(max_length=150, verbose_name="اسم اللقاح/التحصين المستهدف")

    class Meta:
        db_table = 'nebras_clinic_vaccination_schedules'
        verbose_name = "جدولة لقاح"
        verbose_name_plural = "مخططات وجداول اللقاحات المستهدفة"


# 15. MedicalScreening (الفحوصات الطبية الدورية العامة للطلاب)
class MedicalScreening(CombinedSharedModel):
    patient_user_id = models.UUIDField(db_index=True, verbose_name="المريض")
    screening_date = models.DateField(default=timezone.now, verbose_name="تاريخ الفحص العام")
    general_notes = models.TextField(blank=True, null=True, verbose_name="التقييم العام المكتوب")

    class Meta:
        db_table = 'nebras_clinic_screenings'
        verbose_name = "فحص طبي دوري"
        verbose_name_plural = "الفحوصات الطبية الدورية"


# 16. VitalSigns (المؤشرات الحيوية المقاسة)
class VitalSigns(CombinedSharedModel):
    visit = models.ForeignKey(ClinicVisit, on_delete=models.CASCADE, related_name='vital_signs', verbose_name="زيارة العيادة")
    temperature = models.DecimalField(max_digits=4, decimal_places=1, verbose_name="درجة الحرارة (C)")
    blood_pressure_sys = models.IntegerField(blank=True, null=True, verbose_name="ضغط الدم الانقباضي")
    blood_pressure_dia = models.IntegerField(blank=True, null=True, verbose_name="ضغط الدم الانبساطي")
    pulse_rate = models.IntegerField(blank=True, null=True, verbose_name="نبضات القلب (ن/د)")
    oxygen_saturation = models.IntegerField(blank=True, null=True, verbose_name="تشبع الأكسجين (%)")

    class Meta:
        db_table = 'nebras_clinic_vitals'
        verbose_name = "مؤشرات حيوية"
        verbose_name_plural = "المؤشرات الحيوية المقاسة"


# 17. GrowthRecord (سجلات مراقبة النمو ومؤشر كتلة الجسم)
class GrowthRecord(CombinedSharedModel):
    patient_user_id = models.UUIDField(db_index=True, verbose_name="الطالب")
    check_date = models.DateField(default=timezone.now, verbose_name="تاريخ الفحص")
    bmi = models.DecimalField(max_digits=5, decimal_places=2, verbose_name="مؤشر كتلة الجسم (BMI)")

    class Meta:
        db_table = 'nebras_clinic_growth'
        verbose_name = "مراقبة نمو"
        verbose_name_plural = "سجلات مراقبة نمو الطلاب"


# 18. HeightWeightRecord (القياسات الفزيائية للطول والوزن)
class HeightWeightRecord(CombinedSharedModel):
    patient_user_id = models.UUIDField(db_index=True, verbose_name="الطالب")
    record_date = models.DateField(default=timezone.now, verbose_name="تاريخ القياس")
    height_cm = models.DecimalField(max_digits=5, decimal_places=2, verbose_name="الطول (سم)")
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, verbose_name="الوزن (كجم)")

    class Meta:
        db_table = 'nebras_clinic_height_weights'
        verbose_name = "قياس طول ووزن"
        verbose_name_plural = "قياسات الأطوال والأوزان"


# 19. VisionScreening (فحوصات وسلامة النظر)
class VisionScreening(CombinedSharedModel):
    screening = models.ForeignKey(MedicalScreening, on_delete=models.CASCADE, related_name='vision_screenings', verbose_name="الفحص الطبي")
    left_eye_vision = models.CharField(max_length=20, verbose_name="حدة نظر العين اليسرى")
    right_eye_vision = models.CharField(max_length=20, verbose_name="حدة نظر العين اليمنى")

    class Meta:
        db_table = 'nebras_clinic_vision_screenings'
        verbose_name = "فحص نظر"
        verbose_name_plural = "فحوصات النظر وسلامة الإبصار"


# 20. HearingScreening (فحوصات سلامة السمع)
class HearingScreening(CombinedSharedModel):
    screening = models.ForeignKey(MedicalScreening, on_delete=models.CASCADE, related_name='hearing_screenings', verbose_name="الفحص الطبي")
    hearing_test_result = models.CharField(max_length=50, verbose_name="نتيجة اختبار السمع (طبيعي / بحاجة لمتابعة)")

    class Meta:
        db_table = 'nebras_clinic_hearing_screenings'
        verbose_name = "فحص سمع"
        verbose_name_plural = "فحوصات السمع والقدرة السمعية"


# 21. DentalScreening (فحوصات صحة الأسنان)
class DentalScreening(CombinedSharedModel):
    screening = models.ForeignKey(MedicalScreening, on_delete=models.CASCADE, related_name='dental_screenings', verbose_name="الفحص الطبي")
    dental_notes = models.TextField(verbose_name="ملاحظات صحة الفم والأسنان")

    class Meta:
        db_table = 'nebras_clinic_dental_screenings'
        verbose_name = "فحص أسنان"
        verbose_name_plural = "فحوصات وصحة الأسنان والفم"


# 22. EmergencyCase (إدارة الحالات الإسعافية والطارئة بالعيادة)
class EmergencyCase(CombinedSharedModel):
    patient_user_id = models.UUIDField(db_index=True, verbose_name="المريض")
    incident_time = models.DateTimeField(default=timezone.now, verbose_name="وقت حدوث الطارئ")
    action_taken = models.TextField(verbose_name="الإجراء الإسعافي الفوري المتخذ")
    is_hospital_referred = models.BooleanField(default=False, verbose_name="تم نقله للمستشفى")

    class Meta:
        db_table = 'nebras_clinic_emergencies'
        verbose_name = "حالة طارئة وإسعافية"
        verbose_name_plural = "الحالات الإسعافية الطارئة"


# 23. EmergencyContact (جهات الاتصال بالطوارئ الشخصية)
class EmergencyContact(CombinedSharedModel):
    profile = models.ForeignKey(MedicalProfile, on_delete=models.CASCADE, related_name='contacts', verbose_name="الملف الطبي")
    contact_name = models.CharField(max_length=150, verbose_name="اسم جهة الاتصال")
    relationship = models.CharField(max_length=100, verbose_name="صلة القرابة (أب، أم، كفيل)")
    phone_number = models.CharField(max_length=50, verbose_name="رقم الهاتف")

    class Meta:
        db_table = 'nebras_clinic_emergency_contacts'
        verbose_name = "جهة اتصال للطوارئ"
        verbose_name_plural = "جهات الاتصال الطارئة للمرضى"


# 24. MedicalLeave (الإجازات الطبية المعتمدة للطلاب/الموظفين)
class MedicalLeave(CombinedSharedModel):
    STATUS_CHOICES = (
        ('draft', 'مسودة بانتظار إثبات الشهادة'),
        ('submitted', 'مرفوعة وبانتظار الاعتماد'),
        ('approved', 'معتمدة ومبررة للغياب'),
        ('rejected', 'مرفوضة وغير مقبولة'),
    )
    patient_user_id = models.UUIDField(db_index=True, verbose_name="المريض الممنوح للإجازة")
    start_date = models.DateField(verbose_name="تاريخ بدء الإجازة المرضية")
    end_date = models.DateField(verbose_name="تاريخ انتهاء الإجازة المرضية")
    reason = models.TextField(verbose_name="السبب الطبي والتشخيص المعني")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name="حالة طلب الإجازة")

    class Meta:
        db_table = 'nebras_clinic_medical_leaves'
        verbose_name = "إجازة طبية مرضية"
        verbose_name_plural = "الإجازات والتقارير الطبية المعتمدة"


# 25. MedicalCertificate (الشهادات والتقارير الطبية المرفقة)
class MedicalCertificate(CombinedSharedModel):
    medical_leave = models.ForeignKey(MedicalLeave, on_delete=models.CASCADE, related_name='certificates', verbose_name="الإجازة المرضية")
    certificate_number = models.CharField(max_length=100, verbose_name="رقم الشهادة/التقرير الطبي")
    issuing_authority = models.CharField(max_length=200, verbose_name="الجهة الطبية المانحة للتقرير (مستشفى/مستوصف)")

    class Meta:
        db_table = 'nebras_clinic_certificates'
        verbose_name = "تقرير طبي"
        verbose_name_plural = "الشهادات والتقارير الطبية الملحقة"


# 26. HealthCampaign (الحملات الصحية التوعوية بالمؤسسة)
class HealthCampaign(CombinedSharedModel):
    title = models.CharField(max_length=200, verbose_name="عنوان الحملة الصحية التوعوية")
    start_date = models.DateField(verbose_name="تاريخ بدء الحملة")
    end_date = models.DateField(verbose_name="تاريخ انتهاء الحملة")
    description = models.TextField(blank=True, null=True, verbose_name="تفاصيل وأهداف الحملة")

    class Meta:
        db_table = 'nebras_clinic_campaigns'
        verbose_name = "حملة صحية وتوعوية"
        verbose_name_plural = "حملات التوعية الصحية"


# 27. HealthIncident (سجل الحوادث والإصابات الميدانية الموثقة)
class HealthIncident(CombinedSharedModel):
    patient_user_id = models.UUIDField(db_index=True, verbose_name="المصاب")
    incident_time = models.DateTimeField(default=timezone.now, verbose_name="تاريخ ووقت الحادث")
    incident_description = models.TextField(verbose_name="توصيف الحادث الفعلي والإصابات الناتجة")

    class Meta:
        db_table = 'nebras_clinic_incidents'
        verbose_name = "حادث وإصابة ميدانية"
        verbose_name_plural = "سجلات الحوادث والإصابات الميدانية"


# 28. IsolationCase (حالات العزل الصحي للأمراض المعدية)
class IsolationCase(CombinedSharedModel):
    patient_user_id = models.UUIDField(db_index=True, verbose_name="المعزول صحياً")
    start_date = models.DateField(default=timezone.now, verbose_name="تاريخ الدخول في العزل")
    end_date = models.DateField(blank=True, null=True, verbose_name="تاريخ فك العزل/الشفاء")
    reason = models.CharField(max_length=200, verbose_name="المرض المعدي المشخص (كورونا، جدري، إلخ)")

    class Meta:
        db_table = 'nebras_clinic_isolations'
        verbose_name = "حالة عزل صحي"
        verbose_name_plural = "حالات العزل الصحي والوقائي"


# 29. MedicalAttachment (المرفقات الطبية والتحاليل والأشعة)
class MedicalAttachment(CombinedSharedModel):
    profile = models.ForeignKey(MedicalProfile, on_delete=models.CASCADE, related_name='attachments', verbose_name="الملف الطبي")
    file_path = models.CharField(max_length=255, verbose_name="مسار الملف المرفق")

    class Meta:
        db_table = 'nebras_clinic_attachments'
        verbose_name = "مرفق ملف طبي"
        verbose_name_plural = "مرفقات الملفات الطبية والسجلات"


# 30. ClinicSettings (إعدادات وسياسات العيادة الصحية)
class ClinicSettings(CombinedSharedModel):
    emergency_contact_required = models.BooleanField(default=True, verbose_name="إلزامية تسجيل جهة اتصال طارئة")
    notify_parents_on_visit = models.BooleanField(default=True, verbose_name="إرسال إشعار تلقائي لأولياء الأمور عند الزيارة")

    class Meta:
        db_table = 'nebras_clinic_settings'
        verbose_name = "إعدادات العيادة"
        verbose_name_plural = "إعدادات وسياسات العيادة الطبية"


# 31. ClinicStatistics (إحصائيات العيادة الدورية)
class ClinicStatistics(CombinedSharedModel):
    as_of_date = models.DateField(db_index=True)
    today_visits_count = models.IntegerField(default=0, verbose_name="عدد زيارات اليوم")
    emergency_cases_count = models.IntegerField(default=0, verbose_name="إجمالي الحالات الإسعافية")

    class Meta:
        db_table = 'nebras_clinic_statistics'
        verbose_name = "إحصائية عيادة"
        verbose_name_plural = "إحصائيات العيادة الدورية العامة"


# 32. ClinicAudit (سجل التدقيق لعمليات الملفات الطبية الحساسة)
class ClinicAudit(CombinedSharedModel):
    action_type = models.CharField(max_length=100, verbose_name="نوع العملية المنفذة")
    performed_by = models.UUIDField(null=True, blank=True, verbose_name="المستخدم القائم بالعملية")
    performed_at = models.DateTimeField(default=timezone.now)
    details = models.JSONField(default=dict, verbose_name="تفاصيل وحسابات العملية")

    class Meta:
        db_table = 'nebras_clinic_audits'
        verbose_name = "سجل تدقيق عيادة"
        verbose_name_plural = "سجلات تدقيق العيادة الحساسة"