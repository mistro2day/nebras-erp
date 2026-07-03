from django.core.exceptions import ValidationError
from apps.organization.domain.models import Branch, Campus, Building, Room, Department
from uuid import UUID

class OrganizationDomainService:
    """
    خدمات الدومين اللامركزية للتحقق من سلامة البنية وقواعد الأعمال الخاصة بالمنظمة
    """
    @staticmethod
    def validate_room_capacity(room: Room, students_count: int) -> None:
        if students_count > room.capacity:
            raise ValidationError(f"سعة الغرفة ({room.capacity}) غير كافية لعدد الطلاب المحدد ({students_count}).")

    @staticmethod
    def check_department_hierarchy(department: Department, parent: Department) -> None:
        # منع الحلقات الدائرية في شجرة الأقسام
        current = parent
        while current:
            if current.id == department.id:
                raise ValidationError("لا يمكن للأب أن يكون قسماً فرعياً لنفس الكيان.")
            current = current.parent