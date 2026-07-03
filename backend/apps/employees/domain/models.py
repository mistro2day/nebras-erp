from django.db import models
from django.utils import timezone
from apps.shared.domain.models import CombinedSharedModel

# 1. Universal Employee Core Entity
class Employee(CombinedSharedModel):
    employee_number = models.CharField(max_length=50, unique=True, db_index=True)
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
    position = models.CharField(max_length=100)
    employment_type = models.CharField(max_length=50) # e.g. Full-time, Part-time
    joining_date = models.DateField(default=timezone.now)
    status = models.CharField(max_length=30, default='active', db_index=True) # active, suspended, resigned, terminated

    class Meta:
        db_table = 'nebras_employees'


# 2. Employee Profile
class EmployeeProfile(CombinedSharedModel):
    employee = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name='profile')
    biography = models.TextField(blank=True, null=True)
    blood_group = models.CharField(max_length=5, blank=True, null=True)
    languages = models.JSONField(default=list, blank=True)
    skills = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = 'nebras_employee_profiles'


# 3. Employment History (Transfer, Promotion, Status Change)
class EmployeeStatusHistory(CombinedSharedModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='status_history')
    old_status = models.CharField(max_length=30)
    new_status = models.CharField(max_length=30)
    change_reason = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_employee_status_history'