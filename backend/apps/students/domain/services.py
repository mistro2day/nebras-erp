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
        توليد الرقم الجامعي/المدرسي للطالب
        :param tenant_id: معرف المستأجر
        :param branch_code: رمز الفرع (مثال: 'B1')
        :param academic_year_code: رمز السنة (مثال: '2026')
        :param sequence_num: الرقم التسلسلي الحالي
        :param config: إعدادات مخصصة (ديكت)
        """
        if config is None:
            # إعدادات افتراضية مرنة
            config = {
                'use_branch': True,
                'use_year': True,
                'padding': 4,
                'checksum': True,
            }

        parts = []
        
        # 1. بادئة الفرع
        if config.get('use_branch') and branch_code:
            parts.append(str(branch_code).upper())
            
        # 2. بادئة السنة الدراسية
        if config.get('use_year') and academic_year_code:
            # تنظيف الكود ليكون رقمياً فقط إذا لزم الأمر
            year_clean = re.sub(r'\D', '', str(academic_year_code))
            parts.append(year_clean[-4:]) # آخر 4 أرقام
            
        # 3. الرقم التسلسلي مع حشو
        padding = config.get('padding', 4)
        seq_str = str(sequence_num).zfill(padding)
        parts.append(seq_str)
        
        base_number = "-".join(parts)
        
        # 4. رقم التحقق (Checksum Placeholder)
        if config.get('checksum'):
            # خوارزمية مبسطة لحساب رقم التحقق Mod 10 كرمزplaceholder
            digits = [int(char) for char in re.sub(r'\D', '', base_number)]
            checksum_val = sum(digits) % 10
            base_number = f"{base_number}-{checksum_val}"
            
        return base_number


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