from django.db import models
from apps.common.models import CombinedBaseModel
from apps.identity.domain.models import User
import uuid

class Role(CombinedBaseModel):
    """
    نموذج الأدوار المخصصة للمدارس والمستأجرين مع دعم الهيكلية والتوريث
    """
    ROLE_CATEGORIES = (
        ('system', 'نظامي'),
        ('custom', 'مخصص'),
    )
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50)
    category = models.CharField(max_length=20, choices=ROLE_CATEGORIES, default='custom')
    description = models.TextField(blank=True, null=True)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='sub_roles')
    is_system = models.BooleanField(default=False)

    class Meta:
        db_table = 'roles'
        unique_together = ('tenant_id', 'code')
        indexes = [
            models.Index(fields=['tenant_id', 'code']),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Permission(models.Model):
    """
    الصلاحيات التفصيلية للنظام مقسمة حسب الموديول والنوع مع دعم الصلاحيات الدقيقة
    """
    PERMISSION_TYPES = (
        ('api', 'API Access'),
        ('ui', 'UI Component Access'),
        ('field', 'Field Level Access'),
        ('action', 'Business Action'),
    )
    
    ACTIONS = (
        ('create', 'Create'),
        ('read', 'Read'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('approve', 'Approve'),
        ('reject', 'Reject'),
        ('archive', 'Archive'),
        ('restore', 'Restore'),
        ('export', 'Export'),
        ('import', 'Import'),
        ('print', 'Print'),
        ('custom', 'Custom Action'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=100, unique=True, db_index=True)
    type = models.CharField(max_length=20, choices=PERMISSION_TYPES, default='api')
    module = models.CharField(max_length=50, db_index=True)
    resource = models.CharField(max_length=50, db_index=True, null=True, blank=True)
    action = models.CharField(max_length=20, choices=ACTIONS, default='read')
    
    # حقول إضافية لدعم ABAC مستقبلاً وصلاحيات الحقول
    field_permissions = models.JSONField(default=dict, blank=True) # {"field_name": "read/write/none"}
    action_permissions = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'permissions'

    def __str__(self):
        return f"{self.module}:{self.resource}:{self.action} ({self.code})"


class RolePermission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='permissions')
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE, related_name='roles')

    class Meta:
        db_table = 'role_permissions'
        unique_together = ('role', 'permission')


class UserRole(CombinedBaseModel):
    """
    ربط المستخدمين بالأدوار مع دعم الأدوار المؤقتة
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='roles')
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='users')
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True) # لدعم تعيينات الأدوار المؤقتة

    class Meta:
        db_table = 'user_roles'
        unique_together = ('tenant_id', 'user', 'role')
