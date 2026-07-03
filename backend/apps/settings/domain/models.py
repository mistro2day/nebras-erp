from django.db import models
from apps.common.models import CombinedBaseModel

class TenantSetting(CombinedBaseModel):
    """
    إعدادات المدارس والمستأجرين الديناميكية مع فهارس فريدة
    """
    group = models.CharField(max_length=50, db_index=True)
    key = models.CharField(max_length=100, db_index=True)
    value = models.JSONField()
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'tenant_settings'
        unique_together = ('tenant_id', 'group', 'key')
        indexes = [
            models.Index(fields=['tenant_id', 'group', 'key']),
        ]