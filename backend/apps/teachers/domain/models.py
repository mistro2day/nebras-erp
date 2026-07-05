from django.db import models
from apps.common.models import CombinedBaseModel
from apps.identity.domain.models import User
import uuid

class TeacherProfile(CombinedBaseModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='teacher_profile', verbose_name="المستخدم")
    specialization = models.CharField(max_length=255, db_index=True, verbose_name="التخصص")
    qualification = models.CharField(max_length=255, verbose_name="المؤهل العلمي")
    experience_years = models.IntegerField(default=0, verbose_name="سنوات الخبرة")

    class Meta:
        db_table = 'teacher_profiles'
        verbose_name = "ملف معلم"
        verbose_name_plural = "ملفات المعلمين"


class TeacherAssignment(CombinedBaseModel):
    teacher = models.ForeignKey(TeacherProfile, on_delete=models.CASCADE, related_name='assignments', verbose_name="المعلم")
    subject_id = models.UUIDField(db_index=True, verbose_name="المادة الدراسية") # UUID الخاص بالمادة الدراسية
    section_id = models.UUIDField(db_index=True, verbose_name="الشعبة") # UUID الخاص بالشعبة

    class Meta:
        db_table = 'teacher_assignments'
        verbose_name = "تكليف تدريسي"
        verbose_name_plural = "التكليفات التدريسية"