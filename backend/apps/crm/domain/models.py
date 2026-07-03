from django.db import models
from apps.common.models import CombinedBaseModel
import uuid

class Lead(CombinedBaseModel):
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField(db_index=True)
    phone_number = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=50, default='new', db_index=True) # new, contacted, interested, closed

    class Meta:
        db_table = 'crm_leads'