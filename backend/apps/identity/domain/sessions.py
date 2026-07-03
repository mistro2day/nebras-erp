from django.db import models
from apps.identity.domain.models import User

class UserSession(models.Model):
    """
    تعقب الجلسات النشطة والأجهزة المسجلة للمستخدمين، وتفاصيل المتصفح ونظام التشغيل
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    tenant_id = models.UUIDField(db_index=True, null=True, blank=True)
    device_id = models.CharField(max_length=255)
    device_name = models.CharField(max_length=255, blank=True, null=True)
    
    # تفاصيل تقنية
    browser = models.CharField(max_length=100, blank=True, null=True)
    operating_system = models.CharField(max_length=100, blank=True, null=True)
    ip_address = models.GenericIPAddressField(db_index=True)
    user_agent = models.TextField()
    location = models.CharField(max_length=255, default='Unknown Location', blank=True, null=True) # Placeholder
    
    is_active = models.BooleanField(default=True, db_index=True)
    last_activity = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_sessions'
        ordering = ['-last_activity']
