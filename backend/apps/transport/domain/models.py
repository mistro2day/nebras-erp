from django.db import models
from apps.common.models import CombinedBaseModel
import uuid

class Vehicle(CombinedBaseModel):
    plate_number = models.CharField(max_length=50)
    model = models.CharField(max_length=100)
    capacity = models.IntegerField()

    class Meta:
        db_table = 'transport_vehicles'
        unique_together = ('tenant_id', 'plate_number')


class Route(CombinedBaseModel):
    name = models.CharField(max_length=255)
    start_point = models.CharField(max_length=255)
    end_point = models.CharField(max_length=255)

    class Meta:
        db_table = 'transport_routes'