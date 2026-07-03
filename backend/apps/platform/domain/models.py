from django.db import models
from apps.common.models import CombinedBaseModel
import uuid

class SystemConfiguration(CombinedBaseModel):
    """
    نماذج الإعدادات والتهيئة العامة للمنصة وللمستأجرين
    """
    config_key = models.CharField(max_length=255, unique=True, db_index=True)
    config_value = models.JSONField(default=dict)
    config_type = models.CharField(max_length=50, default='global') # global, tenant, module
    module_name = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'platform_system_configurations'


class AuditLog(CombinedBaseModel):
    """
    سجل تتبع العمليات وتدقيق النظام بالكامل (Audit Logs)
    """
    SEVERITY_CHOICES = (
        ('info', 'معلومة'),
        ('warning', 'تحذير'),
        ('critical', 'حرج'),
    )
    user_id = models.UUIDField(null=True, blank=True, db_index=True)
    action = models.CharField(max_length=255)
    entity_name = models.CharField(max_length=255, db_index=True)
    entity_id = models.UUIDField(null=True, blank=True, db_index=True)
    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    browser = models.CharField(max_length=255, null=True, blank=True)
    device = models.CharField(max_length=255, null=True, blank=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='info')

    class Meta:
        db_table = 'platform_audit_logs'


class Notification(CombinedBaseModel):
    """
    مركز التنبيهات الموحد وقنوات الإرسال المتعددة
    """
    CHANNEL_CHOICES = (
        ('email', 'البريد الإلكتروني'),
        ('whatsapp', 'واتساب'),
        ('push', 'تنبيه فوري'),
        ('in_app', 'داخل التطبيق'),
        ('sms', 'رسالة نصية قصيرة'),
    )
    STATUS_CHOICES = (
        ('pending', 'قيد الانتظار'),
        ('sent', 'تم الإرسال'),
        ('failed', 'فشل الإرسال'),
        ('read', 'تمت القراءة'),
    )
    recipient_id = models.UUIDField(db_index=True)
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES)
    title = models.CharField(max_length=255)
    body = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=20, default='medium') # low, medium, high
    scheduled_at = models.DateTimeField(null=True, blank=True)
    retry_count = models.IntegerField(default=0)
    error_message = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'platform_notifications'


class AttachmentMetadata(CombinedBaseModel):
    """
    البيانات الوصفية للملفات المرفوعة وخدمات التخزين
    """
    file_asset_id = models.UUIDField(unique=True, db_index=True)
    file_name = models.CharField(max_length=255)
    file_size = models.BigIntegerField()
    mime_type = models.CharField(max_length=100)
    storage_provider = models.CharField(max_length=50, default='local') # local, s3, minio
    storage_path = models.TextField()
    checksum = models.CharField(max_length=64)
    file_category = models.CharField(max_length=100, default='general')

    class Meta:
        db_table = 'platform_attachments_metadata'


class FeatureFlag(CombinedBaseModel):
    """
    نظام Feature Flags للتحكم بالميزات
    """
    flag_name = models.CharField(max_length=150, unique=True, db_index=True)
    is_enabled = models.BooleanField(default=False)
    rollout_percentage = models.IntegerField(default=100)
    target_users = models.JSONField(default=list, blank=True) # قائمة بـ IDs المستخدمين المستهدفين

    class Meta:
        db_table = 'platform_feature_flags'


class BackgroundJob(CombinedBaseModel):
    """
    سجل وجدولة المهام والوظائف الخلفية للـ Celery
    """
    STATUS_CHOICES = (
        ('pending', 'قيد الانتظار'),
        ('running', 'قيد التشغيل'),
        ('completed', 'مكتمل'),
        ('failed', 'فشل'),
    )
    job_id = models.CharField(max_length=255, unique=True)
    job_name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=20, default='medium')
    payload = models.JSONField(default=dict)
    result = models.JSONField(null=True, blank=True)
    error = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'platform_background_jobs'


class EventLog(CombinedBaseModel):
    """
    سجل تتبع ومراقبة أحداث النظام وناقل الأحداث المركزي
    """
    event_id = models.UUIDField(default=uuid.uuid4, editable=False)
    event_name = models.CharField(max_length=255, db_index=True)
    payload = models.JSONField()
    correlation_id = models.UUIDField(db_index=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    status = models.CharField(max_length=30, default='published') # published, processed, failed
    error = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'platform_event_logs'