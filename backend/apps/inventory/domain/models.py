from django.db import models
from apps.common.models import CombinedBaseModel
import uuid

class Warehouse(CombinedBaseModel):
    name = models.CharField(max_length=255)
    location = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'inventory_warehouses'


class Product(CombinedBaseModel):
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, unique=True, db_index=True)
    barcode = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = 'inventory_products'
        unique_together = ('tenant_id', 'sku')