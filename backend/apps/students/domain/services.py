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
        توليد الرقم الأكاديمي/المدرسي للطالب بتسلسل فريد ومعزول لكل مستأجر (مثال: ALSA-2026-0001)
        """
        import datetime
        year_str = re.sub(r'\D', '', str(academic_year_code or datetime.date.today().year))
        year_clean = year_str[-4:] if len(year_str) >= 4 else str(datetime.date.today().year)

        # بادئة مخصصة للمدرسة / المستأجر لضمان عزل تام للأرقام
        prefix = 'STD'
        if branch_code and branch_code not in ('BR', 'MAIN'):
            prefix = re.sub(r'[^a-zA-Z0-9]', '', str(branch_code)).upper()[:4]
        elif tenant_id:
            try:
                from apps.tenants.domain.models import Tenant
                t = Tenant.objects.filter(id=tenant_id).only('subdomain').first()
                if t and t.subdomain:
                    clean_sub = re.sub(r'[^a-zA-Z0-9]', '', t.subdomain).upper()
                    if clean_sub:
                        prefix = clean_sub[:4]
            except Exception:
                prefix = 'STD'

        count = Student.objects.filter(tenant_id=tenant_id).count() + 1
        seq = max(count, sequence_num)
        candidate = f"{prefix}-{year_clean}-{seq:04d}"

        # التحقق ضد أي تعارض في قاعدة البيانات
        while Student.objects.filter(student_number=candidate).exists():
            seq += 1
            candidate = f"{prefix}-{year_clean}-{seq:04d}"

        return candidate


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