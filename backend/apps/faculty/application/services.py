from apps.shared.application.services import BaseService
from apps.faculty.domain.models import FacultyMember

class FacultyBusinessRulesService(BaseService):
    """
    خدمة قواعد الأعمال والتحقق الذاتي للمعلمين
    """
    @staticmethod
    def validate_national_id_unique(national_id: str, exclude_id=None) -> bool:
        """
        الرقم الوطني مصدره ملف الموظف، فالاستعلام يمرّ عبر العلاقة
        (لم يعد عموداً في FacultyMember بعد توحيد مصدر الحقيقة).
        """
        qs = FacultyMember.objects.filter(
            employee__national_id=national_id, deleted_at__isnull=True
        )
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
        return not qs.exists()

    @staticmethod
    def check_workload_limit(total_hours: int, max_allowed: int = 24) -> bool:
        return total_hours <= max_allowed