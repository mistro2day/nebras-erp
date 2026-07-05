from django.db import models
from apps.common.models import CombinedBaseModel
import uuid

class SavedReport(CombinedBaseModel):
    name = models.CharField(max_length=255, verbose_name="الاسم")
    query_params = models.JSONField(default=dict, verbose_name="معايير الاستعلام")
    created_by_user = models.UUIDField(db_index=True, verbose_name="أنشئ بواسطة")

    class Meta:
        db_table = 'reports_saved'
        verbose_name = "تقرير محفوظ"
        verbose_name_plural = "التقارير المحفوظة"