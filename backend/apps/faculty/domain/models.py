from django.db import models
from django.utils import timezone
from apps.shared.domain.models import CombinedSharedModel
from apps.employees.domain.models import Employee

# 1. Faculty Member — الدور الأكاديمي للموظف
#
# مصدر الحقيقة للبيانات الشخصية هو `Employee` وحده. كان هذا الكيان يحمل نسخة
# ثانية منها ويدفعها إلى Employee عند الحفظ، فكان التعديل المباشر على Employee
# لا ينعكس هنا وتتباعد النسختان (رقم هاتف قديم، اسمان مختلفان في تقريرين).
#
# الآن: الحقول الشخصية خصائص للقراءة تُفوَّض إلى Employee — نسخة واحدة لا نسختان.
# ويبقى هنا ما يخصّ الدور الأكاديمي وحده (رمز المعلم، القسم، حالة اعتماد الدور).
class FacultyMember(CombinedSharedModel):
    # الرابط بالموظف — إلزامي: لا وجود لعضو هيئة تدريس بلا ملف موظف
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='faculty_roles')

    # خاص بالدور الأكاديمي
    teacher_code = models.CharField(max_length=50, unique=True, db_index=True)
    branch_id = models.UUIDField(db_index=True, null=True, blank=True)
    department = models.CharField(max_length=100)
    current_position = models.CharField(max_length=100)
    joining_date = models.DateField(default=timezone.localdate)
    status = models.CharField(max_length=30, default='draft', db_index=True) # draft, pending_review, approved, active, suspended, resigned

    # ==== البيانات الشخصية: تُقرأ من الموظف (توافقية مع الكود والواجهة القائمة) ====
    @property
    def employee_number(self):
        return self.employee.employee_number if self.employee_id else None

    @property
    def national_id(self):
        return self.employee.national_id if self.employee_id else None

    @property
    def passport(self):
        return self.employee.passport if self.employee_id else None

    @property
    def full_name_ar(self):
        return self.employee.full_name_ar if self.employee_id else ''

    @property
    def full_name_en(self):
        return self.employee.full_name_en if self.employee_id else None

    @property
    def gender(self):
        return self.employee.gender if self.employee_id else None

    @property
    def nationality(self):
        return self.employee.nationality if self.employee_id else None

    @property
    def religion(self):
        return self.employee.religion if self.employee_id else None

    @property
    def date_of_birth(self):
        return self.employee.date_of_birth if self.employee_id else None

    @property
    def marital_status(self):
        return self.employee.marital_status if self.employee_id else None

    @property
    def photo_url(self):
        return self.employee.photo_url if self.employee_id else None

    @property
    def email(self):
        return self.employee.email if self.employee_id else None

    @property
    def mobile(self):
        return self.employee.mobile if self.employee_id else None

    @property
    def address(self):
        return self.employee.address if self.employee_id else None

    def save(self, *args, **kwargs):
        """
        لم تعد هناك مزامنة للبيانات الشخصية — مصدرها Employee وحده.
        يبقى انعكاس واحد مشروع: حالة الدور الأكاديمي تنعكس على الحالة الوظيفية
        (اعتماد المعلم يُفعّل ملفه الوظيفي، واستقالته تُنهيه).
        """
        if self.employee_id:
            emp_status = 'active' if self.status in ('approved', 'active') else 'suspended'
            if self.status == 'resigned':
                emp_status = 'resigned'
            if self.employee.status != emp_status:
                self.employee.status = emp_status
                self.employee.save(update_fields=['status', 'updated_at'])

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name_ar} ({self.teacher_code})"

    class Meta:
        db_table = 'nebras_faculty_members'


# 2. Teacher Profile
class TeacherProfile(CombinedSharedModel):
    faculty_member = models.OneToOneField(FacultyMember, on_delete=models.CASCADE, related_name='profile')
    specialization = models.CharField(max_length=255)
    major = models.CharField(max_length=255)
    minor = models.CharField(max_length=255, blank=True, null=True)
    academic_rank = models.CharField(max_length=100, blank=True, null=True)
    teaching_philosophy = models.TextField(blank=True, null=True)
    office_location = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'nebras_faculty_teacher_profiles'


# 3. Academic Qualification
class AcademicQualification(CombinedSharedModel):
    faculty_member = models.ForeignKey(FacultyMember, on_delete=models.CASCADE, related_name='qualifications')
    degree = models.CharField(max_length=100) # e.g. Bachelor, Master, PhD
    institution = models.CharField(max_length=255)
    country = models.CharField(max_length=100)
    major = models.CharField(max_length=255)
    graduation_date = models.DateField()
    grade = models.CharField(max_length=50, blank=True, null=True)
    is_verified = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_faculty_qualifications'


# 4. Teaching License
class TeachingLicense(CombinedSharedModel):
    faculty_member = models.ForeignKey(FacultyMember, on_delete=models.CASCADE, related_name='licenses')
    license_number = models.CharField(max_length=100)
    authority = models.CharField(max_length=255)
    issue_date = models.DateField()
    expiry_date = models.DateField()
    renewal_status = models.CharField(max_length=50, default='active')

    class Meta:
        db_table = 'nebras_faculty_licenses'


# 5. Teacher Assignment
class TeacherAssignment(CombinedSharedModel):
    faculty_member = models.ForeignKey(FacultyMember, on_delete=models.CASCADE, related_name='assignments')
    academic_year_id = models.UUIDField(db_index=True)
    term_id = models.UUIDField(db_index=True)
    subject_id = models.UUIDField(db_index=True)
    section_id = models.UUIDField(db_index=True)
    weekly_hours = models.IntegerField(default=4)

    class Meta:
        db_table = 'nebras_faculty_assignments'


# 6. Teacher Availability
class TeacherAvailability(CombinedSharedModel):
    faculty_member = models.ForeignKey(FacultyMember, on_delete=models.CASCADE, related_name='availability')
    working_day = models.CharField(max_length=20) # e.g. Sunday, Monday
    max_daily_hours = models.IntegerField(default=8)

    class Meta:
        db_table = 'nebras_faculty_availability'