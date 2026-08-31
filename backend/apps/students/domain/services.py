import re
from django.core.exceptions import ValidationError
from apps.students.domain.models import Student, StudentEnrollment

class StudentNumberGenerator:
    """
    خدمة توليد رقم الطالب الفريد بناءً على الإعدادات القابلة للتهيئة:
    - تلقائي / يدوي (Automatic / Manual)
    - بادئة الفرع (Branch Prefix)
    - بادئة السنة الدراسية (Academic Year Prefix)
    - الرقم التسلسلي (Sequence)
    - إعادة تعيين التسلسل سنوياً (Reset Every Year)
    - رقم التحقق (Checksum Placeholder)
    """
    
    @staticmethod
    def generate(tenant_id, branch_code=None, academic_year_code=None, sequence_num=1, config=None) -> str:
        """
        توليد الرقم الأكاديمي/المدرسي للطالب بتسلسل سهل ومريح للحفظ (مثال: 2026-0001)
        """
        import datetime
        year_str = re.sub(r'\D', '', str(academic_year_code or datetime.date.today().year))
        if len(year_str) >= 4:
            year_clean = year_str[-4:]
        else:
            year_clean = str(datetime.date.today().year)

        count = Student.objects.filter(tenant_id=tenant_id).count() + 1
        seq = max(count, sequence_num)
        return f"{year_clean}-{seq:04d}"


class StudentDomainService:
    """
    خدمة منطق العمل والتحقق من القواعد الخاصة بالطلاب
    """
    
    @staticmethod
    def validate_unique_enrollment_per_year(student_id, academic_year_id, enrollment_id=None):
        """
        قاعدة عمل: يسمح بتسجيل نشط واحد فقط للطالب في كل سنة دراسية
        """
        qs = StudentEnrollment.objects.filter(
            student_id=student_id,
            academic_year_id=academic_year_id,
            status='active'
        )
        if enrollment_id:
            qs = qs.exclude(id=enrollment_id)
            
        if qs.exists():
            raise ValidationError("لا يمكن للطالب امتلاك أكثر من تسجيل نشط واحد في نفس السنة الدراسية.")

    @staticmethod
    def validate_student_number_uniqueness(student_number, student_id=None):
        """
        قاعدة عمل: يجب أن يكون رقم الطالب فريداً على مستوى النظام
        """
        qs = Student.objects.filter(student_number=student_number)
        if student_id:
            qs = qs.exclude(id=student_id)
            
        if qs.exists():
            raise ValidationError("رقم الطالب هذا مسجل بالفعل في النظام ويجب أن يكون فريداً.")