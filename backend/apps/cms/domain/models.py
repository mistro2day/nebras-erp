from django.db import models
from apps.common.models import CombinedBaseModel
import uuid

class CMSPage(CombinedBaseModel):
    title = models.CharField(max_length=255, verbose_name="العنوان")
    slug = models.SlugField(max_length=150, db_index=True, verbose_name="الرابط المختصر")
    content = models.TextField(verbose_name="المحتوى")

    class Meta:
        db_table = 'cms_pages'
        unique_together = ('tenant_id', 'slug')
        verbose_name = "صفحة محتوى"
        verbose_name_plural = "صفحات المحتوى"