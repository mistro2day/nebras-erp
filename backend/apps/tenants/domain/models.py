from django.db import models
import uuid

class Tenant(models.Model):
    """
    نموذج المستأجر الرئيسي باستخدام مفتاح أساسي UUID
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    name_ar = models.CharField(max_length=255, blank=True, null=True)
    name_en = models.CharField(max_length=255, blank=True, null=True)
    subdomain = models.CharField(max_length=100, unique=True, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Branding & Settings
    logo = models.ImageField(upload_to='tenants/logos/', null=True, blank=True)
    icon = models.ImageField(upload_to='tenants/icons/', null=True, blank=True)
    stamp = models.ImageField(upload_to='tenants/stamps/', null=True, blank=True)
    primary_color = models.CharField(max_length=7, default='#1e3a8a')
    secondary_color = models.CharField(max_length=7, default='#10b981')
    font_family = models.CharField(max_length=100, default='Inter')
    features = models.JSONField(default=dict, blank=True)

    # Contact & Details
    email = models.EmailField(blank=True, null=True)
    phone_number = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    class Meta:
        db_table = 'tenants'

    def __str__(self):
        return self.name