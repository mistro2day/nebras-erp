from django.db import models
from apps.common.models import CombinedBaseModel
from apps.identity.domain.models import User
import uuid

class UserAssignment(CombinedBaseModel):
    """
    تعيين المستخدمين للهيكل التنظيمي للمؤسسة التعليمية (مدارس، فروع، مجمعات، أقسام)
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assignments')
    
    # مستويات التعيين
    school_id = models.UUIDField(db_index=True, null=True, blank=True)
    branch_id = models.UUIDField(db_index=True, null=True, blank=True)
    campus_id = models.UUIDField(db_index=True, null=True, blank=True)
    
    # الأقسام
    department_id = models.UUIDField(db_index=True, null=True, blank=True)
    academic_department_id = models.UUIDField(db_index=True, null=True, blank=True)
    administrative_department_id = models.UUIDField(db_index=True, null=True, blank=True)

    is_primary = models.BooleanField(default=True) # التعيين الأساسي للموظف/المعلم

    class Meta:
        db_table = 'user_assignments'
        indexes = [
            models.Index(fields=['tenant_id', 'user']),
            models.Index(fields=['tenant_id', 'school_id']),
            models.Index(fields=['tenant_id', 'branch_id']),
        ]

    def __str__(self):
        return f"Assignment for {self.user.email}"