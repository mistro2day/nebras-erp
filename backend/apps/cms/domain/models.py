from django.db import models
from apps.common.models import CombinedBaseModel
import uuid

class CMSPage(CombinedBaseModel):
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=150, db_index=True)
    content = models.TextField()

    class Meta:
        db_table = 'cms_pages'
        unique_together = ('tenant_id', 'slug')