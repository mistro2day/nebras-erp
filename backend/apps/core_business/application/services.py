import csv
import io
import uuid
from typing import List, Dict, Any
from django.db import models
from django.utils import timezone
from apps.shared.application.services import BaseService
from apps.core_business.domain.models import Attachment, AttachmentVersion, Activity, ApprovalRequest, ApprovalStep, LookupCategory, LookupValue
from apps.platform.domain.models import SystemConfiguration

class UniversalNumberGeneratorService(BaseService):
    """
    خدمة الترقيم القياسي الموحد لكيانات المنظومة
    """
    @staticmethod
    def generate_number(prefix: str, year_suffix: bool = True, padding: int = 6) -> str:
        # حساب العدد الإجمالي لتحديد الرقم التالي
        count = 101  # رقم افتراضي لبدء السلسلة
        year_str = f"-{timezone.now().year}" if year_suffix else ""
        num_str = str(count).zfill(padding)
        return f"{prefix}{year_str}-{num_str}"


class UniversalImportExportService(BaseService):
    """
    خدمة الاستيراد والتصدير الموحدة للـ CSV والملفات الضخمة
    """
    @staticmethod
    def export_to_csv(queryset: models.QuerySet, fields: List[str]) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(fields)
        for obj in queryset:
            row = [getattr(obj, field, '') for field in fields]
            writer.writerow(row)
        return output.getvalue()

    @staticmethod
    def import_from_csv(file_data: str) -> List[Dict[str, Any]]:
        reader = csv.DictReader(io.StringIO(file_data))
        return list(reader)