from django.db import models
from apps.shared.domain.models import CombinedSharedModel

# 1. Schedule Model
class Schedule(CombinedSharedModel):
    SCHEDULE_TYPES = (
        ('academic', 'أكاديمي'),
        ('teacher', 'معلم'),
        ('exam', 'اختبارات'),
        ('room', 'قاعات ورش'),
        ('vehicle', 'حافلات ونقل'),
        ('meeting', 'اجتماعات'),
        ('clinic', 'عيادة ومستوصف'),
        ('maintenance', 'صيانة ومرافق'),
        ('event', 'فعاليات وأنشطة'),
        ('custom', 'مخصص'),
    )
    
    STATUS_CHOICES = (
        ('draft', 'مسودة'),
        ('published', 'منشور'),
        ('archived', 'مؤرشف'),
    )

    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.TextField(blank=True, null=True)
    schedule_type = models.CharField(max_length=50, choices=SCHEDULE_TYPES, default='academic', db_index=True)
    
    owner_id = models.UUIDField(null=True, blank=True, db_index=True)
    branch_id = models.UUIDField(null=True, blank=True, db_index=True)
    campus_id = models.UUIDField(null=True, blank=True, db_index=True)
    academic_year = models.CharField(max_length=50, blank=True, null=True)
    term = models.CharField(max_length=50, blank=True, null=True)
    
    timezone = models.CharField(max_length=100, default='Africa/Khartoum')
    version = models.IntegerField(default=1)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='draft')
    is_published = models.BooleanField(default=False)
    
    effective_date = models.DateField(null=True, blank=True)
    expiration_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_schedules'

    def __str__(self):
        return f"{self.name} ({self.code})"


# 2. Generic Schedule Resource
class ScheduleResource(CombinedSharedModel):
    RESOURCE_TYPES = (
        ('teacher', 'معلم'),
        ('employee', 'موظف/إداري'),
        ('room', 'قاعة دراسية'),
        ('laboratory', 'مختبر/معمل'),
        ('bus', 'حافلة نقل'),
        ('hall', 'مسرح/صالة'),
        ('projector', 'جهاز عرض'),
        ('clinic_room', 'غرفة عيادة'),
        ('other', 'آخر'),
    )
    
    name = models.CharField(max_length=255)
    resource_type = models.CharField(max_length=50, choices=RESOURCE_TYPES, db_index=True)
    reference_id = models.UUIDField(null=True, blank=True, db_index=True, help_text="الربط مع الموديول الأصلي (الموظف، القاعة، الحافلة)")
    capacity = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_schedule_resources'

    def __str__(self):
        return f"{self.name} ({self.get_resource_type_display()})"


# 3. Schedule Template
class ScheduleTemplate(CombinedSharedModel):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_schedule_templates'


# 4. Schedule Version
class ScheduleVersion(CombinedSharedModel):
    schedule = models.ForeignKey(Schedule, on_delete=models.CASCADE, related_name='versions')
    version_number = models.IntegerField()
    change_log = models.TextField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_by_user = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_schedule_versions'
        unique_together = ('schedule', 'version_number')


# 5. Working Hours & Time Slot Configurations
class TimeSlot(CombinedSharedModel):
    name = models.CharField(max_length=100)
    start_time = models.TimeField()
    end_time = models.TimeField()
    duration_minutes = models.IntegerField(default=45)
    is_break = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_schedule_time_slots'


# 6. Schedule Rules
class ScheduleRule(CombinedSharedModel):
    RULE_TYPES = (
        ('max_daily_hours', 'الحد الأقصى للساعات اليومية'),
        ('max_weekly_hours', 'الحد الأقصى للساعات الأسبوعية'),
        ('min_break', 'الحد الأدنى للاستراحة بين الفترات'),
        ('required_break', 'فترة استراحة إلزامية'),
        ('working_days', 'أيام العمل النشطة'),
        ('resource_capacity', 'سعة الموارد الاستيعابية'),
        ('custom', 'مخصص'),
    )
    name = models.CharField(max_length=255)
    rule_type = models.CharField(max_length=50, choices=RULE_TYPES, db_index=True)
    rule_value = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_schedule_rules'


# 7. Resource Availability
class ScheduleAvailability(CombinedSharedModel):
    resource = models.ForeignKey(ScheduleResource, on_delete=models.CASCADE, related_name='availabilities')
    day_of_week = models.IntegerField(help_text="0=Monday, 6=Sunday")
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_schedule_availabilities'


# 8. Schedule Event
class ScheduleEvent(CombinedSharedModel):
    schedule = models.ForeignKey(Schedule, on_delete=models.CASCADE, related_name='events')
    title = models.CharField(max_length=255)
    start_date = models.DateField()
    end_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    
    resource = models.ForeignKey(ScheduleResource, on_delete=models.SET_NULL, null=True, blank=True, related_name='events')
    recurrence_rule = models.CharField(max_length=255, blank=True, null=True, help_text="e.g. WEEKLY;BYDAY=MO,WE")

    class Meta:
        db_table = 'nebras_schedule_events'


# 9. Schedule Exception
class ScheduleException(CombinedSharedModel):
    event = models.ForeignKey(ScheduleEvent, on_delete=models.CASCADE, related_name='exceptions')
    exception_date = models.DateField()
    is_cancelled = models.BooleanField(default=False)
    reason = models.TextField(blank=True, null=True)
    
    rescheduled_start_time = models.TimeField(null=True, blank=True)
    rescheduled_end_time = models.TimeField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_schedule_exceptions'


# 10. School Holidays
class ScheduleHoliday(CombinedSharedModel):
    name = models.CharField(max_length=255)
    start_date = models.DateField()
    end_date = models.DateField()
    is_recurring_yearly = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_schedule_holidays'


# 11. Reservation Model
class Reservation(CombinedSharedModel):
    STATUS_CHOICES = (
        ('draft', 'مسودة'),
        ('reserved', 'محجوز'),
        ('approved', 'مقبول ومؤكد'),
        ('rejected', 'مرفوض'),
        ('cancelled', 'ملغي'),
        ('completed', 'مكتمل'),
        ('expired', 'منتهي الصلاحية'),
    )
    
    resource = models.ForeignKey(ScheduleResource, on_delete=models.CASCADE, related_name='reservations')
    title = models.CharField(max_length=255)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    
    reserved_by = models.UUIDField(null=True, blank=True, db_index=True)
    purpose = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='draft', db_index=True)

    class Meta:
        db_table = 'nebras_schedule_reservations'


# 12. Reservation Approval
class ReservationApproval(CombinedSharedModel):
    reservation = models.OneToOneField(Reservation, on_delete=models.CASCADE, related_name='approval')
    approved_by = models.UUIDField(null=True, blank=True)
    approval_date = models.DateTimeField(auto_now_add=True)
    comments = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_schedule_reservation_approvals'


# 13. Conflict History Log
class ScheduleConflict(CombinedSharedModel):
    severity = models.CharField(max_length=30, default='high') # high, medium, low
    conflict_type = models.CharField(max_length=100) # e.g. resource_double_booking, capacity_exceeded
    description = models.TextField()
    detected_at = models.DateTimeField(auto_now_add=True)
    
    resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_details = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_schedule_conflicts'