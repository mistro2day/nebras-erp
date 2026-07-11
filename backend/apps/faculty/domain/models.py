from django.db import models
from django.utils import timezone
from apps.shared.domain.models import CombinedSharedModel
from apps.employees.domain.models import Employee

# 1. Faculty Member Core Entity - Refactored to link to Employee for backwards-compatibility
class FacultyMember(CombinedSharedModel):
    # Link to Employee Core
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='faculty_roles', null=True, blank=True)
    
    # Backwards-compatibility fields (mirrors/delegates or kept for existing code integrity)
    employee_number = models.CharField(max_length=50, unique=True, db_index=True)
    teacher_code = models.CharField(max_length=50, unique=True, db_index=True)
    national_id = models.CharField(max_length=50, unique=True, db_index=True)
    passport = models.CharField(max_length=50, blank=True, null=True)
    
    full_name_ar = models.CharField(max_length=255)
    full_name_en = models.CharField(max_length=255, blank=True, null=True)
    gender = models.CharField(max_length=10) # male, female
    nationality = models.CharField(max_length=100)
    religion = models.CharField(max_length=100, blank=True, null=True)
    date_of_birth = models.DateField()
    marital_status = models.CharField(max_length=50, blank=True, null=True)
    photo_url = models.CharField(max_length=500, blank=True, null=True)

    email = models.EmailField()
    mobile = models.CharField(max_length=50)
    address = models.TextField(blank=True, null=True)
    
    branch_id = models.UUIDField(db_index=True, null=True, blank=True)
    department = models.CharField(max_length=100)
    current_position = models.CharField(max_length=100)
    joining_date = models.DateField(default=timezone.now)
    status = models.CharField(max_length=30, default='draft', db_index=True) # draft, pending_review, approved, active, suspended, resigned

    def save(self, *args, **kwargs):
        from apps.employees.domain.models import Employee
        
        # تحضير حالة الموظف بناءً على حالة المعلم
        emp_status = 'active' if self.status in ['approved', 'active'] else 'suspended'
        if self.status == 'resigned':
            emp_status = 'resigned'
            
        if not self.employee:
            # البحث عن موظف بنفس الهوية الوطنية أو الرقم الوظيفي لتجنب التكرار
            employee = Employee.objects.filter(
                tenant_id=self.tenant_id,
                national_id=self.national_id,
                deleted_at__isnull=True
            ).first()
            if not employee:
                employee = Employee.objects.filter(
                    tenant_id=self.tenant_id,
                    employee_number=self.employee_number,
                    deleted_at__isnull=True
                ).first()
                
            if not employee:
                # إنشاء موظف جديد
                employee = Employee.objects.create(
                    tenant_id=self.tenant_id,
                    employee_number=self.employee_number,
                    national_id=self.national_id,
                    passport=self.passport,
                    full_name_ar=self.full_name_ar,
                    full_name_en=self.full_name_en,
                    gender=self.gender,
                    nationality=self.nationality,
                    religion=self.religion,
                    date_of_birth=self.date_of_birth,
                    marital_status=self.marital_status,
                    photo_url=self.photo_url,
                    email=self.email,
                    mobile=self.mobile,
                    address=self.address,
                    branch_id=self.branch_id,
                    department=self.department,
                    position=self.current_position,
                    employment_type='Full-time',
                    joining_date=self.joining_date,
                    status=emp_status
                )
            self.employee = employee
        else:
            # مزامنة البيانات الشخصية والوظيفية إذا كان الرابط موجوداً بالفعل
            emp = self.employee
            emp.employee_number = self.employee_number
            emp.national_id = self.national_id
            emp.passport = self.passport
            emp.full_name_ar = self.full_name_ar
            emp.full_name_en = self.full_name_en
            emp.gender = self.gender
            emp.nationality = self.nationality
            emp.religion = self.religion
            emp.date_of_birth = self.date_of_birth
            emp.marital_status = self.marital_status
            emp.photo_url = self.photo_url
            emp.email = self.email
            emp.mobile = self.mobile
            emp.address = self.address
            emp.branch_id = self.branch_id
            emp.department = self.department
            emp.position = self.current_position
            emp.status = emp_status
            emp.save()
            
        super().save(*args, **kwargs)

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