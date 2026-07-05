from django.db import models
import uuid

class AuditLog(models.Model):
    """
    نموذج سجل المراقبة والتدقيق مع فهارس محسنة لقاعدة البيانات
    """
    ACTION_CHOICES = (
        ('create', 'إنشاء'),
        ('update', 'تعديل'),
        ('delete', 'حذف'),
        ('restore', 'استرجاع'),
        ('login', 'تسجيل دخول'),
        ('logout', 'تسجيل خروج'),
        ('permission_change', 'تغيير صلاحيات'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant_id = models.UUIDField(db_index=True, null=True, blank=True, verbose_name="المستأجر")
    user_id = models.UUIDField(db_index=True, null=True, blank=True, verbose_name="المستخدم")
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, db_index=True, verbose_name="الإجراء")
    model_name = models.CharField(max_length=100, blank=True, null=True, db_index=True, verbose_name="اسم النموذج")
    object_id = models.UUIDField(blank=True, null=True, db_index=True, verbose_name="معرف السجل")
    old_values = models.JSONField(default=dict, blank=True, verbose_name="القيم القديمة")
    new_values = models.JSONField(default=dict, blank=True, verbose_name="القيم الجديدة")
    ip_address = models.GenericIPAddressField(blank=True, null=True, db_index=True, verbose_name="عنوان IP")
    user_agent = models.TextField(blank=True, null=True, verbose_name="بيانات المتصفح")
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True, verbose_name="التوقيت")

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        verbose_name = "سجل مراقبة"
        verbose_name_plural = "سجلات المراقبة والتدقيق"
        indexes = [
            models.Index(fields=['tenant_id', 'timestamp']),
            models.Index(fields=['user_id', 'timestamp']),
        ]