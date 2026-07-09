from django.db import models
from apps.common.models import CombinedBaseModel
import uuid

class Applicant(CombinedBaseModel):
    """
    بيانات المتقدمين للالتحاق بالمدرسة
    """
    GENDER_CHOICES = (
        ('male', 'ذكر'),
        ('female', 'أنثى'),
    )
    arabic_full_name = models.CharField(max_length=255)
    english_full_name = models.CharField(max_length=255, blank=True, null=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    date_of_birth = models.DateField()
    nationality = models.CharField(max_length=100)
    national_id = models.CharField(max_length=50, db_index=True)
    passport_number = models.CharField(max_length=50, blank=True, null=True)
    religion = models.CharField(max_length=50, blank=True, null=True)
    blood_group = models.CharField(max_length=10, blank=True, null=True)
    special_needs = models.TextField(blank=True, null=True)
    
    previous_school = models.CharField(max_length=255, blank=True, null=True)
    previous_grade = models.CharField(max_length=100, blank=True, null=True)
    
    academic_year_id = models.UUIDField(db_index=True) # UUID من موديول الأكاديميات
    applying_grade_id = models.UUIDField(db_index=True) # UUID من موديول الأكاديميات
    applying_section_id = models.UUIDField(null=True, blank=True) # UUID من موديول الأكاديميات
    
    application_number = models.CharField(max_length=100, unique=True, db_index=True)
    status = models.CharField(max_length=50, default='draft', db_index=True)
    barcode = models.CharField(max_length=150, blank=True, null=True)
    qr_code = models.TextField(blank=True, null=True)
    photo_url = models.URLField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'admission_applicants'

    def __str__(self):
        return self.arabic_full_name


class Guardian(CombinedBaseModel):
    """
    أولياء الأمور والمرافقين للمتقدم
    """
    RELATION_CHOICES = (
        ('father', 'أب'),
        ('mother', 'أم'),
        ('guardian', 'ولي أمر'),
        ('sponsor', 'كفيل'),
    )
    applicant = models.ForeignKey(Applicant, on_delete=models.CASCADE, related_name='guardians')
    relationship = models.CharField(max_length=20, choices=RELATION_CHOICES)
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50)
    email = models.EmailField()
    occupation = models.CharField(max_length=150, blank=True, null=True)
    employer = models.CharField(max_length=200, blank=True, null=True)
    national_id = models.CharField(max_length=50)
    address = models.TextField()
    emergency_contact = models.BooleanField(default=False)
    preferred_contact_method = models.CharField(max_length=20, default='phone')
    financial_responsibility = models.BooleanField(default=False)
    legal_guardian = models.BooleanField(default=True)

    class Meta:
        db_table = 'admission_guardians'

    def __str__(self):
        return f"{self.full_name} ({self.get_relationship_display()})"


class RequiredDocument(CombinedBaseModel):
    """
    المستندات والوثائق المرفوعة مع طلب الالتحاق
    """
    VERIFICATION_CHOICES = (
        ('pending', 'قيد المراجعة'),
        ('verified', 'تم التحقق'),
        ('rejected', 'مرفوض'),
    )
    applicant = models.ForeignKey(Applicant, on_delete=models.CASCADE, related_name='documents')
    document_name = models.CharField(max_length=255)
    file_asset_id = models.UUIDField()
    verification_status = models.CharField(max_length=20, choices=VERIFICATION_CHOICES, default='pending')
    expiration_date = models.DateField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'admission_documents'

    def __str__(self):
        return self.document_name


class Interview(CombinedBaseModel):
    """
    المقابلات الشخصية لتقييم المتقدمين
    """
    applicant = models.ForeignKey(Applicant, on_delete=models.CASCADE, related_name='interviews')
    interviewer_id = models.UUIDField(db_index=True)
    scheduled_at = models.DateTimeField(db_index=True)
    evaluation_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    recommendation = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=30, default='scheduled') # scheduled, completed, cancelled

    class Meta:
        db_table = 'admission_interviews'


class AdmissionSettings(CombinedBaseModel):
    """
    إعدادات فتح/إغلاق باب القبول والتسجيل (سجل واحد لكل مستأجر).
    يتحكم بها مدير النظام: يفتح التسجيل ويحدد السنة الدراسية والشروط والمستندات
    المطلوبة والفترة المتاحة — بما يوافق ممارسات المدارس السودانية.
    """
    is_open = models.BooleanField(default=False, db_index=True)  # هل باب التسجيل مفتوح؟
    academic_year_id = models.UUIDField(null=True, blank=True)   # السنة الدراسية للتسجيل
    registration_start = models.DateField(null=True, blank=True)  # بداية فترة التقديم
    registration_end = models.DateField(null=True, blank=True)    # نهاية فترة التقديم
    allowed_grade_ids = models.JSONField(default=list, blank=True)  # الصفوف المتاحة (فارغ = الكل)
    grade_seats = models.JSONField(default=dict, blank=True)      # مقاعد كل صف {grade_id: seats}؛ 0/غياب = بلا حد
    auto_close_when_full = models.BooleanField(default=True)      # إغلاق قبول الصف تلقائيًا عند اكتمال مقاعده
    terms = models.TextField(blank=True, null=True)              # شروط وأحكام التقديم
    required_documents = models.JSONField(default=list, blank=True)  # المستندات المطلوبة (قائمة نصوص)
    min_age = models.IntegerField(null=True, blank=True)        # الحد الأدنى للعمر (سنوات)
    max_age = models.IntegerField(null=True, blank=True)        # الحد الأقصى للعمر (سنوات)
    application_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)  # رسوم التقديم
    closed_message = models.TextField(blank=True, null=True)     # رسالة تُعرض عند إغلاق التسجيل
    contact_phone = models.CharField(max_length=50, blank=True, null=True)
    contact_email = models.EmailField(blank=True, null=True)

    class Meta:
        db_table = 'admission_settings'

    def __str__(self):
        return f"AdmissionSettings(tenant={self.tenant_id}, open={self.is_open})"


class PlacementTest(CombinedBaseModel):
    """
    امتحانات تحديد المستوى للمتقدمين
    """
    applicant = models.ForeignKey(Applicant, on_delete=models.CASCADE, related_name='placement_tests')
    exam_type = models.CharField(max_length=100)
    marks_obtained = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    passing_marks = models.DecimalField(max_digits=5, decimal_places=2, default=50.0)
    result_status = models.CharField(max_length=20, default='pending') # pending, passed, failed

    class Meta:
        db_table = 'admission_placement_tests'