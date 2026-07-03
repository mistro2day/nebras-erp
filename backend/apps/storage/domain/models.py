from django.db import models
from apps.common.models import CombinedBaseModel

class FileAsset(CombinedBaseModel):
    FILE_CATEGORIES = (
        ('student_file', 'Student File'),
        ('employee_file', 'Employee File'),
        ('invoice', 'Invoice'),
        ('report', 'Report'),
        ('general', 'General Document'),
    )
    uploaded_by = models.UUIDField(null=True, blank=True, db_index=True)
    category = models.CharField(max_length=30, choices=FILE_CATEGORIES, default='general', db_index=True)
    file_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    file_size = models.BigIntegerField()
    mime_type = models.CharField(max_length=100)

    class Meta:
        db_table = 'file_assets'
        indexes = [
            models.Index(fields=['tenant_id', 'category']),
        ]