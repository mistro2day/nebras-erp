from django.db import models
from apps.common.models import CombinedBaseModel
import uuid

class Book(CombinedBaseModel):
    title = models.CharField(max_length=255)
    isbn = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    author = models.CharField(max_length=255)
    quantity = models.IntegerField(default=1)

    class Meta:
        db_table = 'library_books'
        unique_together = ('tenant_id', 'isbn')