from django.db import models
from apps.common.models import CombinedBaseModel
from apps.academics.domain.models import Grade
import uuid

class SubjectGroup(CombinedBaseModel):
    """
    مجموعات المواد الدراسية لتجميع الكيانات (علوم، لغات، حاسوب)
    """
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'academic_subject_groups'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.name


class SubjectCategory(CombinedBaseModel):
    """
    فئات المواد (إلزامي، اختياري، رياضي، ديني)
    """
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50)

    class Meta:
        db_table = 'academic_subject_categories'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.name


class Subject(CombinedBaseModel):
    """
    المواد الدراسية التفصيلية
    """
    group = models.ForeignKey(SubjectGroup, on_delete=models.SET_NULL, null=True, blank=True, related_name='subjects')
    category = models.ForeignKey(SubjectCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='subjects')

    # ربط المادة بالصف الدراسي مباشرةً (المرحلة تُشتق من grade.stage)
    grade = models.ForeignKey(Grade, on_delete=models.CASCADE, null=True, blank=True, related_name='subjects')
    # المسار للمرحلة الثانوية: '' (مشترك)، 'scientific' (علمي)، 'literary' (أدبي)
    track = models.CharField(max_length=20, blank=True, default='', db_index=True)

    code = models.CharField(max_length=50, db_index=True)
    arabic_name = models.CharField(max_length=255)
    english_name = models.CharField(max_length=255, blank=True, null=True)
    
    credit_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0.0)
    weekly_periods = models.IntegerField(default=5)
    passing_mark = models.DecimalField(max_digits=5, decimal_places=2, default=50.0)
    maximum_mark = models.DecimalField(max_digits=5, decimal_places=2, default=100.0)
    
    status = models.BooleanField(default=True, db_index=True)

    class Meta:
        db_table = 'academic_subjects'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.arabic_name


class SubjectPrerequisite(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='prerequisites')
    prerequisite = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='prerequisite_for')

    class Meta:
        db_table = 'academic_subject_prerequisites'
        unique_together = ('subject', 'prerequisite')


class Curriculum(CombinedBaseModel):
    """
    المناهج والخطط الدراسية للمستأجر
    """
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'academic_curriculums'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.name


class CurriculumVersion(CombinedBaseModel):
    """
    إصدارات المناهج لضمان التتبع ومواكبة التحديثات السنوية
    """
    curriculum = models.ForeignKey(Curriculum, on_delete=models.CASCADE, related_name='versions')
    version_code = models.CharField(max_length=50)
    effective_start = models.DateField(null=True, blank=True)
    effective_end = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    is_published = models.BooleanField(default=False)

    class Meta:
        db_table = 'academic_curriculum_versions'
        unique_together = ('tenant_id', 'curriculum', 'version_code')

    def __str__(self):
        return f"{self.curriculum.name} ({self.version_code})"


class GradeCurriculum(CombinedBaseModel):
    grade = models.ForeignKey(Grade, on_delete=models.CASCADE, related_name='curriculums')
    curriculum_version = models.ForeignKey(CurriculumVersion, on_delete=models.CASCADE, related_name='grade_allocations')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='grade_curriculums')

    class Meta:
        db_table = 'academic_grade_curriculums'
        unique_together = ('tenant_id', 'grade', 'curriculum_version', 'subject')