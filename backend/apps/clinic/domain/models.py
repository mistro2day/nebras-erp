from django.db import models
from apps.common.models import CombinedBaseModel
import uuid

class ClinicPatient(CombinedBaseModel):
    user_id = models.UUIDField(db_index=True)
    blood_group = models.CharField(max_length=5, blank=True, null=True)

    class Meta:
        db_table = 'clinic_patients'


class ClinicVisit(CombinedBaseModel):
    patient = models.ForeignKey(ClinicPatient, on_delete=models.CASCADE, related_name='visits')
    visit_date = models.DateTimeField(auto_now_add=True, db_index=True)
    symptoms = models.TextField()
    diagnosis = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'clinic_visits'