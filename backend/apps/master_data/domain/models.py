from django.db import models
from django.utils import timezone
from apps.shared.domain.models import CombinedSharedModel

class MasterCategory(CombinedSharedModel):
    code = models.CharField(max_length=100, db_index=True)  # e.g., 'academic_stages', 'job_titles'
    name_ar = models.CharField(max_length=150)
    name_en = models.CharField(max_length=150)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_master_categories'
        unique_together = ('tenant_id', 'code')


class MasterItem(CombinedSharedModel):
    category = models.ForeignKey(MasterCategory, on_delete=models.CASCADE, related_name='items')
    code = models.CharField(max_length=100, db_index=True)  # e.g., 'primary_stage', 'developer'
    value_ar = models.CharField(max_length=255)
    value_en = models.CharField(max_length=255)
    sort_order = models.IntegerField(default=0)
    color = models.CharField(max_length=7, default='#6366f1')
    icon = models.CharField(max_length=50, blank=True, null=True)
    is_active = models.BooleanField(default=True, db_index=True)
    effective_date = models.DateTimeField(default=timezone.now, db_index=True)
    expiry_date = models.DateTimeField(null=True, blank=True, db_index=True)
    
    # Hierarchy
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children')

    class Meta:
        db_table = 'nebras_master_items'
        unique_together = ('tenant_id', 'category', 'code')
        indexes = [
            models.Index(fields=['tenant_id', 'is_active', 'effective_date', 'expiry_date']),
        ]


class MasterTranslation(CombinedSharedModel):
    item = models.ForeignKey(MasterItem, on_delete=models.CASCADE, related_name='translations')
    language_code = models.CharField(max_length=10, db_index=True)  # e.g., 'ar', 'en', 'fr'
    translated_value = models.CharField(max_length=255)

    class Meta:
        db_table = 'nebras_master_translations'
        unique_together = ('tenant_id', 'item', 'language_code')