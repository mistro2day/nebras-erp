from django.db import models
from apps.common.models import CombinedBaseModel
import uuid

class AcademicYear(CombinedBaseModel):
    """
    السنوات الدراسية الفعالة للمؤسسة التعليمية
    """
    STATUS_CHOICES = (
        ('draft', 'مسودة'),
        ('active', 'نشط'),
        ('completed', 'مكتملة'),
        ('archived', 'مؤرشفة'),
    )
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, db_index=True)
    start_date = models.DateField(db_index=True)
    end_date = models.DateField(db_index=True)
    registration_start = models.DateField(null=True, blank=True)
    registration_end = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    current_flag = models.BooleanField(default=False, db_index=True) # سنة دراسية واحدة فقط فعالة لكل مستأجر
    
    # مستويات التنظيم المرتبطة بها
    school_id = models.UUIDField(null=True, blank=True)
    branch_id = models.UUIDField(null=True, blank=True)
    campus_id = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = 'academic_years'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.current_flag:
            # إلغاء تفعيل أي سنة دراسية أخرى لنفس المستأجر عند تعيين هذه كالسنة النشطة
            AcademicYear.objects.filter(tenant_id=self.tenant_id, current_flag=True).update(current_flag=False)
        super().save(*args, **kwargs)


class Term(CombinedBaseModel):
    """
    الفصول الدراسية والأتارام (Semester, Trimester, Quarter, Custom)
    """
    STATUS_CHOICES = (
        ('upcoming', 'قادم'),
        ('active', 'نشط'),
        ('completed', 'مكتمل'),
    )
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='terms')
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50)
    start_date = models.DateField()
    end_date = models.DateField()
    order = models.IntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='upcoming')

    class Meta:
        db_table = 'academic_terms'
        ordering = ['order']
        unique_together = ('tenant_id', 'academic_year', 'code')

    def __str__(self):
        return f"{self.name} - {self.academic_year.name}"


class AcademicCalendarEvent(CombinedBaseModel):
    """
    التقويم الأكاديمي الشامل للمستأجر (إجازات، امتحانات، اجتماعات)
    """
    EVENT_TYPES = (
        ('holiday', 'عطلة رسمية'),
        ('exam', 'امتحان'),
        ('activity', 'نشاط مدرسي'),
        ('meeting', 'اجتماع معلمين'),
        ('registration', 'فترة التسجيل'),
        ('graduation', 'حفل التخرج'),
        ('emergency_closure', 'إغلاق طارئ'),
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    event_type = models.CharField(max_length=30, choices=EVENT_TYPES, default='activity')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    color_code = models.CharField(max_length=10, default='#3b82f6')
    is_recurring = models.BooleanField(default=False)
    recurrence_rule = models.TextField(blank=True, null=True) # rrule string

    class Meta:
        db_table = 'academic_calendar_events'

    def __str__(self):
        return self.title


class Stage(CombinedBaseModel):
    """
    المراحل الدراسية والتعليمية (روضة، ابتدائي، متوسط، ثانوي)
    """
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    order = models.IntegerField(default=1)
    minimum_age = models.IntegerField(default=4)
    maximum_age = models.IntegerField(default=18)

    class Meta:
        db_table = 'academic_stages'
        ordering = ['order']
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.name


class Grade(CombinedBaseModel):
    """
    الصفوف الدراسية داخل المراحل التعليمية
    """
    stage = models.ForeignKey(Stage, on_delete=models.CASCADE, related_name='grades')
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    order = models.IntegerField(default=1)
    passing_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=50.0)
    max_capacity = models.IntegerField(default=100)

    class Meta:
        db_table = 'academic_grades'
        ordering = ['order']
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return f"{self.name} ({self.stage.name})"


class Section(CombinedBaseModel):
    """
    الشعب الدراسية التابعة للصفوف
    """
    GENDER_CHOICES = (
        ('male', 'بنين'),
        ('female', 'بنات'),
        ('mixed', 'مختلط'),
    )
    grade = models.ForeignKey(Grade, on_delete=models.CASCADE, related_name='sections')
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50)
    capacity = models.IntegerField(default=30)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default='mixed')
    class_teacher_id = models.UUIDField(null=True, blank=True) # Placeholder لربط المعلم مستقبلاً
    classroom_id = models.UUIDField(null=True, blank=True) # Placeholder لربط الغرفة مستقبلاً
    status = models.BooleanField(default=True)
    academic_shift = models.CharField(max_length=50, default='Morning Shift')

    class Meta:
        db_table = 'academic_sections'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return f"{self.name} - {self.grade.name}"

    @property
    def occupied_seats(self):
        """عدد المقاعد المشغولة = الطلاب المسكَّنون فعليًا في هذه الشعبة (تسجيل نشط)."""
        from apps.students.domain.models import StudentEnrollment
        return (
            StudentEnrollment.objects
            .filter(section_id=self.id, status='active', deleted_at__isnull=True)
            .values('student_id').distinct().count()
        )

    @property
    def available_seats(self):
        """المقاعد المتاحة = السعة الكلية − المشغولة (لا تقل عن صفر)."""
        return max(0, self.capacity - self.occupied_seats)


class SchoolShift(CombinedBaseModel):
    """
    الفترات الدراسية (الصباحية، المسائية، الرمضانية)
    """
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'academic_shifts'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.name


class TeachingPeriod(CombinedBaseModel):
    """
    الحصص والفترات الصفية
    """
    shift = models.ForeignKey(SchoolShift, on_delete=models.CASCADE, related_name='periods')
    period_number = models.IntegerField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_break = models.BooleanField(default=False)

    class Meta:
        db_table = 'academic_periods'
        ordering = ['period_number']
        unique_together = ('tenant_id', 'shift', 'period_number')

    def __str__(self):
        return f"Period {self.period_number} ({self.shift.name})"