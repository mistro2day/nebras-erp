from django.db import models
from apps.shared.domain.models import CombinedSharedModel


# ============================================================
# 1. Exam Category — فئات الامتحانات (تحريري، عملي، إلخ)
# ============================================================
class ExamCategory(CombinedSharedModel):
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50, db_index=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_exam_categories'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.name


# ============================================================
# 2. Exam Type — أنواع الامتحانات (نصفي، نهائي، واجب، مشروع)
# ============================================================
class ExamType(CombinedSharedModel):
    TYPE_CHOICES = (
        ('midterm', 'نصفي'),
        ('final', 'نهائي'),
        ('quiz', 'اختبار قصير'),
        ('assignment', 'واجب منزلي'),
        ('project', 'مشروع'),
        ('presentation', 'عرض تقديم'),
        ('laboratory', 'مختبر وعملي'),
        ('oral', 'شفهي'),
        ('weekly', 'أسبوعي'),
        ('monthly', 'شهري'),
        ('diagnostic', 'تشخيصي'),
        ('placement', 'تحديد مستوى'),
        ('national', 'امتحان وطني'),
        ('custom', 'مخصص'),
    )

    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50, db_index=True)
    type_class = models.CharField(max_length=30, choices=TYPE_CHOICES, default='custom')
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_exam_types'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.name


# ============================================================
# 3. Exam — الامتحانات
# ============================================================
class Exam(CombinedSharedModel):
    STATUS_CHOICES = (
        ('draft', 'مسودة'),
        ('review', 'مراجعة'),
        ('approved', 'معتمد'),
        ('published', 'منشور'),
        ('locked', 'مغلق ومحمي'),
        ('archived', 'مؤرشف'),
        ('appealed', 'قيد الاستئناف'),
        ('closed', 'مغلق نهائياً'),
    )

    category = models.ForeignKey(ExamCategory, on_delete=models.PROTECT, related_name='exams')
    exam_type = models.ForeignKey(ExamType, on_delete=models.PROTECT, related_name='exams')
    
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, db_index=True)
    description = models.TextField(blank=True, null=True)
    
    # تفاصيل أكاديمية
    subject_id = models.UUIDField(db_index=True)
    academic_year = models.CharField(max_length=50, db_index=True)
    term = models.CharField(max_length=50)
    
    # الدرجات والتحكم
    max_marks = models.DecimalField(max_digits=5, decimal_places=2)
    pass_marks = models.DecimalField(max_digits=5, decimal_places=2)
    weight_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=100.0)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', db_index=True)
    
    class Meta:
        db_table = 'nebras_exams'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.name


# ============================================================
# 4. Exam Session — دورات/جلسات الامتحانات
# ============================================================
class ExamSession(CombinedSharedModel):
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50, db_index=True)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_exam_sessions'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.name


# ============================================================
# 5. Exam Schedule — جداول الامتحانات
# ============================================================
class ExamSchedule(CombinedSharedModel):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='schedules')
    session = models.ForeignKey(ExamSession, on_delete=models.PROTECT, related_name='schedules')
    
    exam_date = models.DateField(db_index=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    duration_minutes = models.IntegerField()

    class Meta:
        db_table = 'nebras_exam_schedules'
        ordering = ['exam_date', 'start_time']


# ============================================================
# 6. Exam Room — قاعات الامتحانات
# ============================================================
class ExamRoom(CombinedSharedModel):
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50, db_index=True)
    capacity = models.IntegerField()
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_exam_rooms'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.name


# ============================================================
# 7. Exam Supervisor — مراقبي اللجان
# ============================================================
class ExamSupervisor(CombinedSharedModel):
    schedule = models.ForeignKey(ExamSchedule, on_delete=models.CASCADE, related_name='supervisors')
    employee_id = models.UUIDField(db_index=True, help_text="معرف الموظف/المعلم المراقب")
    room = models.ForeignKey(ExamRoom, on_delete=models.PROTECT, related_name='supervisors')
    role = models.CharField(max_length=100, default='مراقب رئيسي')

    class Meta:
        db_table = 'nebras_exam_supervisors'


# ============================================================
# 8. Exam Paper — أوراق الامتحانات
# ============================================================
class ExamPaper(CombinedSharedModel):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='papers')
    title = models.CharField(max_length=255)
    version = models.IntegerField(default=1)
    content_schema = models.JSONField(default=dict, blank=True, help_text="هيكلية الأسئلة وتوزيع الدرجات")
    file_path = models.CharField(max_length=500, blank=True, null=True, help_text="مسار ملف الورقة المشفر")

    class Meta:
        db_table = 'nebras_exam_papers'


# ============================================================
# 9. Exam Template — قوالب تصميم الامتحانات
# ============================================================
class ExamTemplate(CombinedSharedModel):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, db_index=True)
    layout_config = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_exam_templates'
        unique_together = ('tenant_id', 'code')


# ============================================================
# 10. Exam Question Bank — بنك الأسئلة
# ============================================================
class ExamQuestionBank(CombinedSharedModel):
    name = models.CharField(max_length=255)
    subject_id = models.UUIDField(db_index=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_exam_question_banks'


# ============================================================
# 11. Question — الأسئلة
# ============================================================
class Question(CombinedSharedModel):
    QUESTION_TYPES = (
        ('mcq', 'اختيار من متعدد'),
        ('true_false', 'صح أو خطأ'),
        ('essay', 'مقالي وشرح'),
        ('short_answer', 'إجابة قصيرة'),
        ('matching', 'توصيل ومطابقة'),
        ('fill_blanks', 'إكمال الفراغات'),
        ('calculation', 'مسألة حسابية'),
        ('coding', 'برمجة وكتابة كود'),
    )

    bank = models.ForeignKey(ExamQuestionBank, on_delete=models.CASCADE, related_name='questions')
    question_type = models.CharField(max_length=30, choices=QUESTION_TYPES, default='mcq')
    content = models.TextField(help_text="نص السؤال الكامل")
    
    marks = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)
    difficulty_level = models.CharField(max_length=30, default='medium', choices=(('easy', 'سهل'), ('medium', 'متوسط'), ('hard', 'صعب')))
    bloom_taxonomy = models.CharField(max_length=50, blank=True, null=True, help_text="تصنيف بلوم التعليمي")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_exam_questions'


# ============================================================
# 12. Question Option — خيارات الأسئلة
# ============================================================
class QuestionOption(CombinedSharedModel):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='options')
    option_text = models.TextField()
    is_correct = models.BooleanField(default=False)
    score_weight = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)

    class Meta:
        db_table = 'nebras_exam_question_options'


# ============================================================
# 13. Question Difficulty — تفاصيل الصعوبة والتحليل
# ============================================================
class QuestionDifficulty(CombinedSharedModel):
    question = models.OneToOneField(Question, on_delete=models.CASCADE, related_name='difficulty_analysis')
    discrimination_index = models.FloatField(default=0.0, help_text="معامل التمييز للسؤال")
    difficulty_index = models.FloatField(default=0.0, help_text="معامل الصعوبة الفعلي")

    class Meta:
        db_table = 'nebras_exam_question_difficulty'


# ============================================================
# 14. Question Tag — وسوم وتصنيفات الأسئلة
# ============================================================
class QuestionTag(CombinedSharedModel):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='tags')
    tag_name = models.CharField(max_length=100, db_index=True)

    class Meta:
        db_table = 'nebras_exam_question_tags'


# ============================================================
# 15. Assessment — التقييمات المستمرة
# ============================================================
class Assessment(CombinedSharedModel):
    name = models.CharField(max_length=255)
    subject_id = models.UUIDField(db_index=True)
    academic_year = models.CharField(max_length=50, db_index=True)
    max_marks = models.DecimalField(max_digits=5, decimal_places=2)

    class Meta:
        db_table = 'nebras_assessments'


# ============================================================
# 16. Assessment Item — عناصر التقييم الفردية
# ============================================================
class AssessmentItem(CombinedSharedModel):
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name='items')
    name = models.CharField(max_length=255)
    max_marks = models.DecimalField(max_digits=5, decimal_places=2)
    weight_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=100.0)

    class Meta:
        db_table = 'nebras_assessment_items'


# ============================================================
# 17. Assessment Weight — أوزان التقييمات
# ============================================================
class AssessmentWeight(CombinedSharedModel):
    subject_id = models.UUIDField(db_index=True)
    academic_year = models.CharField(max_length=50)
    
    continuous_assessment_weight = models.DecimalField(max_digits=5, decimal_places=2, default=40.0)
    final_exam_weight = models.DecimalField(max_digits=5, decimal_places=2, default=60.0)

    class Meta:
        db_table = 'nebras_assessment_weights'


# ============================================================
# 18. Grading Scheme — سلم وتوزيع التقديرات
# ============================================================
class GradingScheme(CombinedSharedModel):
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50, db_index=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_grading_schemes'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.name


# ============================================================
# 19. Grade Scale — مستويات الدرجات (A, B, C, D)
# ============================================================
class GradeScale(CombinedSharedModel):
    scheme = models.ForeignKey(GradingScheme, on_delete=models.CASCADE, related_name='scales')
    grade_letter = models.CharField(max_length=10)
    gpa_value = models.DecimalField(max_digits=4, decimal_places=2)
    
    min_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    max_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    color = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        db_table = 'nebras_grade_scales'
        ordering = ['-min_percentage']

    def __str__(self):
        return self.grade_letter


# ============================================================
# 20. Student Exam — امتحانات الطلاب الفردية
# ============================================================
class StudentExam(CombinedSharedModel):
    schedule = models.ForeignKey(ExamSchedule, on_delete=models.PROTECT, related_name='student_exams')
    student_id = models.UUIDField(db_index=True)
    room = models.ForeignKey(ExamRoom, on_delete=models.PROTECT, related_name='student_exams')
    seat_number = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = 'nebras_student_exams'
        unique_together = ('schedule', 'student_id')


# ============================================================
# 21. Student Assessment — تقييمات الطلاب الفردية
# ============================================================
class StudentAssessment(CombinedSharedModel):
    assessment_item = models.ForeignKey(AssessmentItem, on_delete=models.CASCADE, related_name='student_assessments')
    student_id = models.UUIDField(db_index=True)
    marks_obtained = models.DecimalField(max_digits=5, decimal_places=2)

    class Meta:
        db_table = 'nebras_student_assessments'


# ============================================================
# 22. Student Mark — الدرجات المسجلة للطلاب
# ============================================================
class StudentMark(CombinedSharedModel):
    student_exam = models.OneToOneField(StudentExam, on_delete=models.CASCADE, related_name='mark_record')
    marks_obtained = models.DecimalField(max_digits=5, decimal_places=2)
    is_present = models.BooleanField(default=True)
    remarks = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_student_marks'


# ============================================================
# 23. Mark Entry — عمليات رصد الدرجات
# ============================================================
class MarkEntry(CombinedSharedModel):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='mark_entries')
    entered_by = models.UUIDField(db_index=True)
    entered_at = models.DateTimeField(auto_now_add=True)
    is_draft = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_mark_entries'


# ============================================================
# 24. Mark Approval — اعتماد ومراجعة الدرجات
# ============================================================
class MarkApproval(CombinedSharedModel):
    mark_entry = models.OneToOneField(MarkEntry, on_delete=models.CASCADE, related_name='approval')
    approved_by = models.UUIDField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=30, default='pending', choices=(('pending', 'معلق'), ('approved', 'تم الاعتماد'), ('rejected', 'مرفوض')))

    class Meta:
        db_table = 'nebras_mark_approvals'


# ============================================================
# 25. Exam Attendance — كشف الحضور والغياب
# ============================================================
class ExamAttendance(CombinedSharedModel):
    student_exam = models.OneToOneField(StudentExam, on_delete=models.CASCADE, related_name='attendance')
    is_present = models.BooleanField(default=True)
    marked_at = models.DateTimeField(auto_now_add=True)
    marked_by = models.UUIDField()

    class Meta:
        db_table = 'nebras_exam_attendance'


# ============================================================
# 26. Exam Incident — كشف المخالفات ومحاضر الغش
# ============================================================
class ExamIncident(CombinedSharedModel):
    student_exam = models.ForeignKey(StudentExam, on_delete=models.CASCADE, related_name='incidents')
    incident_type = models.CharField(max_length=100, default='غش ومخالفة')
    description = models.TextField()
    reported_by = models.UUIDField()
    reported_at = models.DateTimeField(auto_now_add=True)
    action_taken = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_exam_incidents'


# ============================================================
# 27. Exam Appeal — طلبات إعادة التصحيح والاستئناف
# ============================================================
class ExamAppeal(CombinedSharedModel):
    STATUS_CHOICES = (
        ('submitted', 'مقدم بانتظار المراجعة'),
        ('under_review', 'قيد المراجعة وإعادة التصحيح'),
        ('resolved_changed', 'تم البت وتغيير الدرجة'),
        ('resolved_unchanged', 'تم البت بدون تغيير'),
        ('rejected', 'مرفوض'),
    )

    student_exam = models.ForeignKey(StudentExam, on_delete=models.CASCADE, related_name='appeals')
    reason = models.TextField(help_text="سبب تقديم طلب التظلم")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='submitted', db_index=True)
    
    old_marks = models.DecimalField(max_digits=5, decimal_places=2)
    new_marks = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    resolved_by = models.UUIDField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_exam_appeals'


# ============================================================
# 28. Exam Result — النتائج النهائية للطلاب
# ============================================================
class ExamResult(CombinedSharedModel):
    student_id = models.UUIDField(db_index=True)
    subject_id = models.UUIDField(db_index=True)
    academic_year = models.CharField(max_length=50, db_index=True)
    term = models.CharField(max_length=50)
    
    exam_marks = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    assessment_marks = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    total_marks = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    
    grade_letter = models.CharField(max_length=10, blank=True, null=True)
    gpa_value = models.DecimalField(max_digits=4, decimal_places=2, default=0.0)
    is_passed = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_exam_results'
        unique_together = ('student_id', 'subject_id', 'academic_year', 'term')


# ============================================================
# 29. Transcript — كشوف الدرجات الرسمية
# ============================================================
class Transcript(CombinedSharedModel):
    student_id = models.UUIDField(db_index=True)
    academic_year = models.CharField(max_length=50, db_index=True)
    
    cgpa = models.DecimalField(max_digits=4, decimal_places=2, default=0.0)
    total_credits = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    is_locked = models.BooleanField(default=False)
    issued_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'nebras_transcripts'
        unique_together = ('student_id', 'academic_year')


# ============================================================
# 30. Academic Standing — الحالة الأكاديمية (إنذار، تميز)
# ============================================================
class AcademicStanding(CombinedSharedModel):
    STANDING_CHOICES = (
        ('good', 'مستمر وحالة جيدة'),
        ('distinction', 'تميز أكاديمي ولوحة شرف'),
        ('warning', 'إنذار أكاديمي أول'),
        ('probation', 'تحت المراقبة والمتابعة'),
        ('suspended', 'موقوف أكاديمياً'),
    )

    student_id = models.UUIDField(db_index=True)
    academic_year = models.CharField(max_length=50, db_index=True)
    term = models.CharField(max_length=50)
    standing = models.CharField(max_length=30, choices=STANDING_CHOICES, default='good')
    remarks = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_academic_standings'


# ============================================================
# 31. Exam Statistics — إحصائيات الامتحانات
# ============================================================
class ExamStatistics(CombinedSharedModel):
    exam = models.OneToOneField(Exam, on_delete=models.CASCADE, related_name='statistics')
    total_students = models.IntegerField(default=0)
    passed_students = models.IntegerField(default=0)
    failed_students = models.IntegerField(default=0)
    
    avg_marks = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    highest_marks = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    lowest_marks = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)

    class Meta:
        db_table = 'nebras_exam_statistics'


# ============================================================
# 32. Exam Audit — سجل وتدقيق تعديل درجات الطلاب
# ============================================================
class ExamAudit(CombinedSharedModel):
    student_exam = models.ForeignKey(StudentExam, on_delete=models.CASCADE, related_name='audits')
    field_changed = models.CharField(max_length=100, default='marks_obtained')
    
    old_value = models.CharField(max_length=255)
    new_value = models.CharField(max_length=255)
    
    changed_by = models.UUIDField()
    changed_at = models.DateTimeField(auto_now_add=True)
    reason = models.TextField(help_text="سبب تعديل الدرجة")

    class Meta:
        db_table = 'nebras_exam_audits'
        ordering = ['-changed_at']
