from django.db import models
from apps.common.models import CombinedBaseModel

class TenantSetting(CombinedBaseModel):
    """
    إعدادات المدارس والمستأجرين الديناميكية مع فهارس فريدة
    """
    group = models.CharField(max_length=50, db_index=True, verbose_name="المجموعة")
    key = models.CharField(max_length=100, db_index=True, verbose_name="المفتاح")
    value = models.JSONField(verbose_name="القيمة")
    description = models.TextField(blank=True, null=True, verbose_name="الوصف")

    class Meta:
        db_table = 'tenant_settings'
        unique_together = ('tenant_id', 'group', 'key')
        verbose_name = "إعداد مستأجر"
        verbose_name_plural = "إعدادات المستأجرين"
        indexes = [
            models.Index(fields=['tenant_id', 'group', 'key']),
        ]