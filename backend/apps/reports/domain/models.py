from django.db import models
from apps.common.models import CombinedBaseModel
import uuid

class SavedReport(CombinedBaseModel):
    name = models.CharField(max_length=255)
    query_params = models.JSONField(default=dict)
    created_by_user = models.UUIDField(db_index=True)

    class Meta:
        db_table = 'reports_saved'