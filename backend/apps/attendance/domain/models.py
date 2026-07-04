from django.db import models
from django.utils import timezone
from apps.shared.domain.models import CombinedSharedModel
from apps.employees.domain.models import Employee

# 1. Attendance Policy
class AttendancePolicy(CombinedSharedModel):
    name = models.CharField(max_length=100)
    grace_period_minutes = models.IntegerField(default=15)
    half_day_late_minutes = models.IntegerField(default=120)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_attendance_policies'


# 2. Work Shift
class WorkShift(CombinedSharedModel):
    name = models.CharField(max_length=100)
    start_time = models.TimeField()
    end_time = models.TimeField()
    break_start = models.TimeField(null=True, blank=True)
    break_end = models.TimeField(null=True, blank=True)
    is_ramadan_shift = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_attendance_work_shifts'


# 3. Attendance Record
class AttendanceRecord(CombinedSharedModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField()
    check_in = models.TimeField(null=True, blank=True)
    check_out = models.TimeField(null=True, blank=True)
    status = models.CharField(max_length=30, default='absent', db_index=True) # present, absent, late, leave
    late_minutes = models.IntegerField(default=0)
    overtime_minutes = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_attendance_records'
        unique_together = ('employee', 'date')


# 4. Correction Request
class CorrectionRequest(CombinedSharedModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendance_corrections')
    date = models.DateField()
    requested_check_in = models.TimeField(null=True, blank=True)
    requested_check_out = models.TimeField(null=True, blank=True)
    reason = models.TextField()
    status = models.CharField(max_length=30, default='pending') # pending, approved, rejected

    class Meta:
        db_table = 'nebras_attendance_correction_requests'


# 5. Student Daily Attendance
class StudentDailyAttendance(CombinedSharedModel):
    student_id = models.UUIDField(db_index=True)
    date = models.DateField()
    status = models.CharField(max_length=30, default='present', db_index=True) # present, absent, excused_absence
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_attendance_student_daily'
        unique_together = ('student_id', 'date')