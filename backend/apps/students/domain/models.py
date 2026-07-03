from django.db import models
from apps.common.models import CombinedBaseModel
import uuid

class Student(CombinedBaseModel):
    """
    الكيان الجذري (Aggregate Root) للطالب
    """
    student_number = models.CharField(max_length=100, unique=True, db_index=True)
    status = models.CharField(max_length=50, default='applicant', db_index=True)
    # applicant, accepted, registered, enrolled, active, suspended, transferred, graduated, withdrawn, dismissed, archived, alumni

    class Meta:
        db_table = 'students'

    def __str__(self):
        try:
            return f"{self.profile.arabic_name} ({self.student_number})"
        except AttributeError:
            return f"Student {self.student_number}"


class StudentProfile(CombinedBaseModel):
    """
    الملف الشخصي للطالب
    """
    GENDER_CHOICES = (
        ('male', 'ذكر'),
        ('female', 'أنثى'),
    )
    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name='profile')
    arabic_name = models.CharField(max_length=255)
    english_name = models.CharField(max_length=255, blank=True, null=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    date_of_birth = models.DateField()
    nationality = models.CharField(max_length=100)
    national_id = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    passport = models.CharField(max_length=50, blank=True, null=True)
    religion = models.CharField(max_length=50, blank=True, null=True)
    blood_group = models.CharField(max_length=10, blank=True, null=True)
    photo = models.UUIDField(blank=True, null=True) # file_asset_id
    languages = models.JSONField(default=list, blank=True) # قائمة باللغات التي يتحدثها
    special_needs = models.TextField(blank=True, null=True)
    learning_difficulty = models.TextField(blank=True, null=True)
    talented_program = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'student_profiles'

    def __str__(self):
        return self.arabic_name


class StudentMedicalProfile(CombinedBaseModel):
    """
    الملف الطبي للطالب
    """
    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name='medical_profile')
    allergies = models.JSONField(default=list, blank=True)
    chronic_diseases = models.JSONField(default=list, blank=True)
    medication = models.JSONField(default=list, blank=True)
    doctor = models.CharField(max_length=255, blank=True, null=True)
    medical_notes = models.TextField(blank=True, null=True)
    emergency_medical_contact = models.JSONField(default=dict, blank=True) # {name, phone, relation}
    vaccination_placeholder = models.JSONField(default=list, blank=True) # Placeholder لجدول التطعيمات
    medical_attachments = models.JSONField(default=list, blank=True) # List of UUIDs

    class Meta:
        db_table = 'student_medical_profiles'


class StudentAddress(CombinedBaseModel):
    """
    عناوين الطالب
    """
    ADDRESS_TYPES = (
        ('permanent', 'دائم'),
        ('current', 'حالي'),
        ('mailing', 'بريدي'),
    )
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='addresses')
    address_type = models.CharField(max_length=20, choices=ADDRESS_TYPES)
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    gps_placeholder = models.CharField(max_length=100, blank=True, null=True) # Latitude, Longitude
    map_placeholder = models.TextField(blank=True, null=True) # Embed code or visual placeholder

    class Meta:
        db_table = 'student_addresses'


class StudentEmergencyContact(CombinedBaseModel):
    """
    جهات الاتصال في حالات الطوارئ
    """
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='emergency_contacts')
    name = models.CharField(max_length=255)
    relationship = models.CharField(max_length=100)
    phone = models.CharField(max_length=50)
    email = models.EmailField(blank=True, null=True)
    is_primary = models.BooleanField(default=False)

    class Meta:
        db_table = 'student_emergency_contacts'


class StudentFamilyRelation(CombinedBaseModel):
    """
    علاقات العائلة وأولياء الأمور
    """
    RELATION_TYPES = (
        ('father', 'أب'),
        ('mother', 'أم'),
        ('guardian', 'ولي أمر'),
        ('sponsor', 'كفيل'),
        ('sibling', 'شقيق'),
    )
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='family_relations')
    relationship = models.CharField(max_length=20, choices=RELATION_TYPES)
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50)
    email = models.EmailField(blank=True, null=True)
    occupation = models.CharField(max_length=150, blank=True, null=True)
    employer = models.CharField(max_length=200, blank=True, null=True)
    national_id = models.CharField(max_length=50, blank=True, null=True)
    emergency_contact = models.BooleanField(default=False)
    custody_information_placeholder = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'student_family_relations'


class StudentAttachment(CombinedBaseModel):
    """
    مرفقات ووثائق الطالب
    """
    ATTACHMENT_TYPES = (
        ('birth_certificate', 'شهادة ميلاد'),
        ('passport', 'جواز سفر'),
        ('national_id', 'بطاقة الهوية الوطنية'),
        ('photo', 'صورة شخصية'),
        ('medical_report', 'تقرير طبي'),
        ('academic_certificate', 'شهادة أكاديمية'),
        ('transfer_certificate', 'شهادة انتقال'),
        ('custom', 'مرفق مخصص'),
    )
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attachments')
    attachment_type = models.CharField(max_length=30, choices=ATTACHMENT_TYPES)
    file_asset_id = models.UUIDField()
    file_name = models.CharField(max_length=255)
    version = models.IntegerField(default=1)
    audit_trail = models.JSONField(default=list, blank=True) # سجل العمليات على الملف

    class Meta:
        db_table = 'student_attachments'


class StudentEnrollment(CombinedBaseModel):
    """
    التسجيلات الأكاديمية للطلاب
    """
    ENROLLMENT_STATUS_CHOICES = (
        ('active', 'نشط'),
        ('suspended', 'موقوف'),
        ('withdrawn', 'منسحب'),
        ('completed', 'مكتمل'),
    )
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='enrollments')
    academic_year_id = models.UUIDField(db_index=True)
    term_id = models.UUIDField(db_index=True, null=True, blank=True)
    grade_id = models.UUIDField(db_index=True)
    section_id = models.UUIDField(db_index=True, null=True, blank=True)
    campus_id = models.UUIDField(db_index=True, null=True, blank=True)
    branch_id = models.UUIDField(db_index=True, null=True, blank=True)
    enrollment_date = models.DateField()
    enrollment_type = models.CharField(max_length=50, default='new') # new, returning, transfer
    status = models.CharField(max_length=20, choices=ENROLLMENT_STATUS_CHOICES, default='active')

    class Meta:
        db_table = 'student_enrollments'


class StudentPromotionHistory(CombinedBaseModel):
    """
    سجل ترفيع وترقية الطلاب
    """
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='promotion_history')
    from_grade_id = models.UUIDField()
    to_grade_id = models.UUIDField()
    academic_year_id = models.UUIDField()
    promoted_at = models.DateTimeField(auto_now_add=True)
    promoted_by = models.UUIDField()

    class Meta:
        db_table = 'student_promotion_history'


class StudentStatusHistory(CombinedBaseModel):
    """
    سجل تتبع التغير في حالة الطالب
    """
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='status_history')
    from_status = models.CharField(max_length=50)
    to_status = models.CharField(max_length=50)
    changed_at = models.DateTimeField(auto_now_add=True)
    changed_by = models.UUIDField()
    comments = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'student_status_history'


class StudentNote(CombinedBaseModel):
    """
    ملاحظات الطلاب
    """
    NOTE_TYPES = (
        ('private', 'خاصة'),
        ('academic', 'أكاديمية'),
        ('behavior', 'سلوكية'),
        ('medical', 'طبية'),
        ('administrative', 'إدارية'),
    )
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='notes')
    note_type = models.CharField(max_length=20, choices=NOTE_TYPES)
    title = models.CharField(max_length=200)
    content = models.TextField() # Rich Text Placeholder
    is_pinned = models.BooleanField(default=False)
    created_by = models.UUIDField()

    class Meta:
        db_table = 'student_notes'


class StudentTag(CombinedBaseModel):
    """
    الوسوم المخصصة للطلاب
    """
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='tags')
    tag_name = models.CharField(max_length=100) # e.g. honor student, scholarship

    class Meta:
        db_table = 'student_tags'
        unique_together = ('student', 'tag_name')


class StudentIdentifier(CombinedBaseModel):
    """
    المعرفات الأخرى للطالب (الهوية، جواز السفر، الباركود، QR)
    """
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='identifiers')
    identifier_type = models.CharField(max_length=50) # national_id, passport, barcode, qr_code
    identifier_value = models.CharField(max_length=255)

    class Meta:
        db_table = 'student_identifiers'
        unique_together = ('student', 'identifier_type')


class StudentCommunicationPreference(CombinedBaseModel):
    """
    تفضيلات التواصل للطلاب وأولياء أمورهم
    """
    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name='communication_preference')
    preferred_channel = models.CharField(max_length=50, default='email') # email, sms, portal
    receive_notifications = models.BooleanField(default=True)

    class Meta:
        db_table = 'student_communication_preferences'


class StudentCustomField(CombinedBaseModel):
    """
    الحقول الديناميكية المخصصة للطالب
    """
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='custom_fields')
    field_key = models.CharField(max_length=100)
    field_value = models.TextField()

    class Meta:
        db_table = 'student_custom_fields'
        unique_together = ('student', 'field_key')


class StudentArchive(CombinedBaseModel):
    """
    سجل أرشفة ملف الطالب
    """
    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name='archive')
    archive_reason = models.TextField()
    archived_at = models.DateTimeField(auto_now_add=True)
    archived_by = models.UUIDField()

    class Meta:
        db_table = 'student_archives'


class StudentTransfer(CombinedBaseModel):
    """
    سجل النقل والتحويل للطلاب
    """
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='transfers')
    transfer_type = models.CharField(max_length=20) # in, out
    school_name = models.CharField(max_length=255)
    transfer_date = models.DateField()
    reason = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'student_transfers'


class StudentWithdrawal(CombinedBaseModel):
    """
    انسحاب الطالب
    """
    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name='withdrawal')
    withdrawal_date = models.DateField()
    reason = models.TextField()
    approved_by = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = 'student_withdrawals'


class StudentGraduation(CombinedBaseModel):
    """
    تخرج الطالب
    """
    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name='graduation')
    graduation_date = models.DateField()
    graduation_class = models.CharField(max_length=100, blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'student_graduations'


class StudentAlumni(CombinedBaseModel):
    """
    بيانات الخريجين
    """
    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name='alumni')
    graduation_year = models.IntegerField()
    current_occupation = models.CharField(max_length=255, blank=True, null=True)
    contact_allowed = models.BooleanField(default=True)

    class Meta:
        db_table = 'student_alumni'