from django.db import models
from apps.common.models import CombinedBaseModel

class NotificationTemplate(CombinedBaseModel):
    name = models.CharField(max_length=150, verbose_name="الاسم")
    code = models.CharField(max_length=100, db_index=True, verbose_name="الرمز")
    subject = models.CharField(max_length=255, blank=True, null=True, verbose_name="العنوان")
    body_template = models.TextField(verbose_name="قالب المحتوى")
    channel = models.CharField(max_length=20, db_index=True, verbose_name="القناة")

    class Meta:
        db_table = 'notification_templates'
        unique_together = ('tenant_id', 'code', 'channel')
        verbose_name = "قالب إشعار"
        verbose_name_plural = "قوالب الإشعارات"


class NotificationHistory(CombinedBaseModel):
    recipient = models.CharField(max_length=255, db_index=True, verbose_name="المستلم")
    channel = models.CharField(max_length=20, db_index=True, verbose_name="القناة")
    subject = models.CharField(max_length=255, blank=True, null=True, verbose_name="العنوان")
    body = models.TextField(verbose_name="المحتوى")
    status = models.CharField(max_length=20, default='pending', db_index=True, verbose_name="الحالة")
    retry_count = models.IntegerField(default=0, verbose_name="عدد المحاولات")
    error_message = models.TextField(blank=True, null=True, verbose_name="رسالة الخطأ")
    scheduled_at = models.DateTimeField(null=True, blank=True, db_index=True, verbose_name="موعد الإرسال")
    sent_at = models.DateTimeField(null=True, blank=True, db_index=True, verbose_name="وقت الإرسال")

    class Meta:
        db_table = 'notification_history'
        verbose_name = "سجل إشعار"
        verbose_name_plural = "سجل الإشعارات"
        indexes = [
            models.Index(fields=['tenant_id', 'status', 'scheduled_at']),
        ]