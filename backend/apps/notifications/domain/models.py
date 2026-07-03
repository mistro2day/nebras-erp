from django.db import models
from apps.common.models import CombinedBaseModel

class NotificationTemplate(CombinedBaseModel):
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=100, db_index=True)
    subject = models.CharField(max_length=255, blank=True, null=True)
    body_template = models.TextField()
    channel = models.CharField(max_length=20, db_index=True)

    class Meta:
        db_table = 'notification_templates'
        unique_together = ('tenant_id', 'code', 'channel')


class NotificationHistory(CombinedBaseModel):
    recipient = models.CharField(max_length=255, db_index=True)
    channel = models.CharField(max_length=20, db_index=True)
    subject = models.CharField(max_length=255, blank=True, null=True)
    body = models.TextField()
    status = models.CharField(max_length=20, default='pending', db_index=True)
    retry_count = models.IntegerField(default=0)
    error_message = models.TextField(blank=True, null=True)
    scheduled_at = models.DateTimeField(null=True, blank=True, db_index=True)
    sent_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        db_table = 'notification_history'
        indexes = [
            models.Index(fields=['tenant_id', 'status', 'scheduled_at']),
        ]