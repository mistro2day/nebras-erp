from django.db import models
from apps.shared.domain.models import CombinedSharedModel
from apps.faculty.domain.models import FacultyMember

# 1. Academic Timetable Main Header
class AcademicTimetable(CombinedSharedModel):
    STATUS_CHOICES = (
        ('draft', 'مسودة'),
        ('review', 'تحت المراجعة'),
        ('approved', 'مقبول ومعتمد'),
        ('published', 'منشور'),
        ('archived', 'مؤرشف'),
    )
    
    name = models.CharField(max_length=255)
    academic_year = models.CharField(max_length=50)
    term = models.CharField(max_length=50)
    
    branch_id = models.UUIDField(null=True, blank=True, db_index=True)
    campus_id = models.UUIDField(null=True, blank=True, db_index=True)
    
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='draft', db_index=True)
    is_active = models.BooleanField(default=True)
    version = models.IntegerField(default=1)

    class Meta:
        db_table = 'nebras_academic_timetables'

    def __str__(self):
        return f"{self.name} ({self.academic_year})"


# 2. Timetable Version
class TimetableVersion(CombinedSharedModel):
    timetable = models.ForeignKey(AcademicTimetable, on_delete=models.CASCADE, related_name='versions')
    version_number = models.IntegerField()
    created_by_user = models.UUIDField(null=True, blank=True)
    change_log = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_timetable_versions'


# 3. Timetable Template
class TimetableTemplate(CombinedSharedModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_timetable_templates'


# 4. Class Period Configuration
class ClassPeriod(CombinedSharedModel):
    period_number = models.IntegerField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_break = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_timetable_class_periods'


# 5. Timetable Entry (The Actual Slot Booking)
class TimetableEntry(CombinedSharedModel):
    timetable = models.ForeignKey(AcademicTimetable, on_delete=models.CASCADE, related_name='entries')
    day_of_week = models.IntegerField(help_text="0=Monday, 6=Sunday")
    period = models.ForeignKey(ClassPeriod, on_delete=models.CASCADE)
    
    # ربط الموارد أكاديمياً
    teacher = models.ForeignKey(FacultyMember, on_delete=models.CASCADE, related_name='timetable_entries')
    subject_id = models.UUIDField(db_index=True, help_text="الربط مع موديول المواد الدراسية")
    room_id = models.UUIDField(db_index=True, help_text="الربط مع القاعات في الماستر داتا")
    
    grade_section_id = models.UUIDField(db_index=True, help_text="الربط مع الفصل/الشعبة الدراسية")

    class Meta:
        db_table = 'nebras_timetable_entries'


# 6. Teaching Load Rule
class TeachingLoad(CombinedSharedModel):
    teacher = models.OneToOneField(FacultyMember, on_delete=models.CASCADE, related_name='teaching_load')
    max_weekly_hours = models.IntegerField(default=24)
    max_daily_hours = models.IntegerField(default=6)
    assigned_weekly_hours = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_timetable_teaching_loads'


# 7. Teaching Assignment
class TeachingAssignment(CombinedSharedModel):
    teacher = models.ForeignKey(FacultyMember, on_delete=models.CASCADE, related_name='timetable_assignments')
    subject_id = models.UUIDField(db_index=True)
    grade_section_id = models.UUIDField(db_index=True)
    weekly_periods = models.IntegerField(default=4)

    class Meta:
        db_table = 'nebras_timetable_teaching_assignments'


# 8. Subject Distribution Plan
class SubjectDistribution(CombinedSharedModel):
    grade_section_id = models.UUIDField(db_index=True)
    subject_id = models.UUIDField(db_index=True)
    total_required_periods = models.IntegerField(default=5)
    distributed_periods = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_timetable_subject_distributions'


# 9. Class Schedule Header
class ClassSchedule(CombinedSharedModel):
    grade_section_id = models.UUIDField(db_index=True)
    timetable = models.ForeignKey(AcademicTimetable, on_delete=models.CASCADE)

    class Meta:
        db_table = 'nebras_timetable_class_schedules'


# 10. Teacher Schedule Mapping
class TeacherSchedule(CombinedSharedModel):
    teacher = models.ForeignKey(FacultyMember, on_delete=models.CASCADE)
    timetable = models.ForeignKey(AcademicTimetable, on_delete=models.CASCADE)

    class Meta:
        db_table = 'nebras_timetable_teacher_schedules'


# 11. Room Schedule Mapping
class RoomSchedule(CombinedSharedModel):
    room_id = models.UUIDField(db_index=True)
    timetable = models.ForeignKey(AcademicTimetable, on_delete=models.CASCADE)

    class Meta:
        db_table = 'nebras_timetable_room_schedules'


# 12. Schedule Approval Log
class ScheduleApproval(CombinedSharedModel):
    timetable = models.ForeignKey(AcademicTimetable, on_delete=models.CASCADE, related_name='approvals')
    approved_by = models.UUIDField(null=True, blank=True)
    comments = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_timetable_approvals'


# 13. Schedule Change History
class ScheduleHistory(CombinedSharedModel):
    timetable = models.ForeignKey(AcademicTimetable, on_delete=models.CASCADE, related_name='history')
    change_description = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'nebras_timetable_history'


# 14. Schedule Publish Log
class SchedulePublish(CombinedSharedModel):
    timetable = models.ForeignKey(AcademicTimetable, on_delete=models.CASCADE, related_name='publications')
    published_by = models.UUIDField(null=True, blank=True)
    published_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'nebras_timetable_publications'


# 15. Schedule Statistics
class ScheduleStatistics(CombinedSharedModel):
    timetable = models.ForeignKey(AcademicTimetable, on_delete=models.CASCADE, related_name='statistics')
    total_lessons = models.IntegerField(default=0)
    conflict_count = models.IntegerField(default=0)
    teacher_utilization_rate = models.FloatField(default=0.0)
    room_utilization_rate = models.FloatField(default=0.0)

    class Meta:
        db_table = 'nebras_timetable_statistics'