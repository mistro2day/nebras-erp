from django.db import models
from apps.common.models import CombinedBaseModel

class FileAsset(CombinedBaseModel):
    FILE_CATEGORIES = (
        ('student_file', 'ملف طالب'),
        ('employee_file', 'ملف موظف'),
        ('invoice', 'فاتورة'),
        ('report', 'تقرير'),
        ('general', 'مستند عام'),
    )
    uploaded_by = models.UUIDField(null=True, blank=True, db_index=True, verbose_name="تم الرفع بواسطة")
    category = models.CharField(max_length=30, choices=FILE_CATEGORIES, default='general', db_index=True, verbose_name="التصنيف")
    file_name = models.CharField(max_length=255, verbose_name="اسم الملف")
    file_path = models.CharField(max_length=500, verbose_name="مسار الملف")
    file_size = models.BigIntegerField(verbose_name="حجم الملف")
    mime_type = models.CharField(max_length=100, verbose_name="نوع الملف")

    class Meta:
        db_table = 'file_assets'
        verbose_name = "ملف مخزّن"
        verbose_name_plural = "إدارة الملفات والتخزين"
        indexes = [
            models.Index(fields=['tenant_id', 'category']),
        ]