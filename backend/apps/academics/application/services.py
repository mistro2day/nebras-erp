from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db import models
from apps.academics.domain.models import AcademicYear, Term, Stage, Grade, Section
from uuid import UUID

class AcademicValidationService:
    """
    خدمات الدومين والتحقق للمتطلبات الأكاديمية (Academic Business Rules)
    """
    @staticmethod
    def validate_year_no_overlap(tenant_id: UUID, start_date, end_date, exclude_id: UUID = None) -> None:
        """
        التحقق من عدم تداخل التواريخ للسنوات الدراسية
        """
        qs = AcademicYear.objects.filter(
            tenant_id=tenant_id,
            deleted_at__isnull=True
        ).filter(
            models.Q(start_date__lte=end_date) & models.Q(end_date__gte=start_date)
        )
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
        if qs.exists():
            raise ValidationError("التواريخ المحددة تتداخل مع سنة دراسية أخرى مسجلة.")

    @staticmethod
    def validate_term_no_overlap(academic_year: AcademicYear, start_date, end_date, exclude_id: UUID = None) -> None:
        """
        التحقق من عدم تداخل التواريخ للفصول الدراسية داخل السنة
        """
        qs = Term.objects.filter(
            academic_year=academic_year,
            deleted_at__isnull=True
        ).filter(
            models.Q(start_date__range=(start_date, end_date)) |
            models.Q(end_date__range=(start_date, end_date))
        )
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
        if qs.exists():
            raise ValidationError("تواريخ الفصل الدراسي تتداخل مع فصل دراسي آخر داخل السنة.")
            
    @staticmethod
    def check_student_age_for_stage(stage: Stage, birth_date) -> None:
        """
        التحقق من عمر الطالب ومطابقته لشروط المرحلة التعليمية
        """
        today = timezone.now().date()
        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        if age < stage.minimum_age or age > stage.maximum_age:
            raise ValidationError(f"عمر الطالب ({age}) غير مناسب لهذه المرحلة الدراسية ({stage.minimum_age} - {stage.maximum_age} سنة).")