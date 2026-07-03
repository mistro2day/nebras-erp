from django.db import models
from apps.common.models import CombinedBaseModel
from apps.identity.domain.models import User
import uuid

class TeacherProfile(CombinedBaseModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='teacher_profile')
    specialization = models.CharField(max_length=255, db_index=True)
    qualification = models.CharField(max_length=255)
    experience_years = models.IntegerField(default=0)

    class Meta:
        db_table = 'teacher_profiles'


class TeacherAssignment(CombinedBaseModel):
    teacher = models.ForeignKey(TeacherProfile, on_delete=models.CASCADE, related_name='assignments')
    subject_id = models.UUIDField(db_index=True) # UUID الخاص بالمادة الدراسية
    section_id = models.UUIDField(db_index=True) # UUID الخاص بالشعبة

    class Meta:
        db_table = 'teacher_assignments'