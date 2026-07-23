from django.db import models
from django.utils import timezone
from apps.shared.domain.models import CombinedSharedModel
import uuid

# ============================================================
# قواعد خصومات اللائحة التنظيمية للمعلمين
# المرجع: docs/modules/teacher-contract-bylaw.md (رابعاً: الأبناء · خامساً: الأقارب)
# ============================================================
# المفتاح = عدد الأبناء الملتحقين · exempt = عدد المُعفَين كلياً · percentage = نسبة خصم الباقين
DEPENDENT_DISCOUNT_RULES = {
    1: {'exempt': 0, 'percentage': 50},
    2: {'exempt': 0, 'percentage': 30},
    3: {'exempt': 0, 'percentage': 25},
    4: {'exempt': 1, 'percentage': 20},
    5: {'exempt': 2, 'percentage': 20},
}
# أي عدد أكبر من هذا يُعامَل بمعاملة الشريحة الأخيرة
MAX_DEPENDENT_TIER = 5
# خامساً: أقارب المعلمين من الدرجة الأولى — رسوم التسجيل + خصم ثابت
RELATIVE_DISCOUNT_PERCENTAGE = 10


# 1. Universal Employee Core Entity (معلمين وموظفين بحسب عقد 2026)
class Employee(CombinedSharedModel):
    employee_number = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    national_id = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    passport = models.CharField(max_length=50, blank=True, null=True)
    
    full_name_ar = models.CharField(max_length=255, verbose_name="الاسم رباعياً بالعربية")
    full_name_en = models.CharField(max_length=255, blank=True, null=True, verbose_name="الاسم بالإنجليزية")
    title_surname = models.CharField(max_length=100, blank=True, null=True, verbose_name="اللقب")
    gender = models.CharField(max_length=10, default='male', verbose_name="الجنس") # male, female
    nationality = models.CharField(max_length=100, default='سوداني', verbose_name="الجنسية")
    religion = models.CharField(max_length=100, blank=True, null=True, default='مسلم', verbose_name="الديانة")
    date_of_birth = models.DateField(null=True, blank=True, verbose_name="تاريخ الميلاد")
    marital_status = models.CharField(max_length=50, blank=True, null=True, verbose_name="الحالة الاجتماعية")
    children_count = models.IntegerField(default=0, verbose_name="عدد الأبناء")
    photo_url = models.CharField(max_length=500, blank=True, null=True, verbose_name="الصورة الشخصية")

    # بيانات السكن التفصيلية
    city = models.CharField(max_length=100, blank=True, null=True, verbose_name="المدينة")
    neighborhood = models.CharField(max_length=100, blank=True, null=True, verbose_name="الحي")
    square_number = models.CharField(max_length=50, blank=True, null=True, verbose_name="رقم المربع")
    house_number = models.CharField(max_length=50, blank=True, null=True, verbose_name="رقم المنزل")
    address = models.TextField(blank=True, null=True, verbose_name="العنوان السكني الشامل")
    gatekeeper_name = models.CharField(max_length=255, blank=True, null=True, verbose_name="اسم البواب")
    prominent_teacher_friend = models.CharField(max_length=255, blank=True, null=True, verbose_name="اسم أقرب معلم بارز")

    # وسائل التواصل والاتصال
    email = models.EmailField(blank=True, null=True, verbose_name="البريد الإلكتروني")
    mobile = models.CharField(max_length=50, blank=True, null=True, verbose_name="رقم الهاتف الرئيسية (1)")
    phone_1 = models.CharField(max_length=50, blank=True, null=True, verbose_name="هاتف 1")
    phone_2 = models.CharField(max_length=50, blank=True, null=True, verbose_name="هاتف 2")
    phone_3 = models.CharField(max_length=50, blank=True, null=True, verbose_name="هاتف 3")
    whatsapp_number = models.CharField(max_length=50, blank=True, null=True, verbose_name="رقم الواتساب الرسمي")
    emergency_phone_other = models.CharField(max_length=50, blank=True, null=True, verbose_name="رقم آخر يمكن الرجوع إليه")
    emergency_kinship = models.CharField(max_length=100, blank=True, null=True, verbose_name="صلة القرابة")

    # بيانات المؤهل الأساسي والتخصص
    university_institute = models.CharField(max_length=255, blank=True, null=True, verbose_name="الجامعة / المعهد")
    faculty = models.CharField(max_length=255, blank=True, null=True, verbose_name="الكلية")
    specialization = models.CharField(max_length=255, blank=True, null=True, verbose_name="التخصص الدقيق")

    # التكليف الأكاديمي والتدريس
    teaching_subject_1 = models.CharField(max_length=150, blank=True, null=True, verbose_name="المادة (1)")
    teaching_subject_2 = models.CharField(max_length=150, blank=True, null=True, verbose_name="المادة (2)")
    teaching_subject_3 = models.CharField(max_length=150, blank=True, null=True, verbose_name="المادة (3)")
    other_tasks_activities = models.TextField(blank=True, null=True, verbose_name="أي مهام أخرى أو أنشطة")
    weekly_lesson_quota = models.IntegerField(default=23, verbose_name="نصاب الحصص الأسبوعي")
    duty_exempt = models.BooleanField(default=True, verbose_name="معفى من النوبتجية (Duty)")

    # الهيكل التنظيمي
    branch_id = models.UUIDField(db_index=True, null=True, blank=True)
    department = models.CharField(max_length=100, default='التعليم والإشراف', verbose_name="القسم الإداري")
    position = models.CharField(max_length=100, default='معلم', verbose_name="المسمى الوظيفي")
    employment_type = models.CharField(max_length=50, default='Full-time', verbose_name="نوع التوظيف")
    joining_date = models.DateField(default=timezone.localdate, verbose_name="تاريخ المباشرة")
    status = models.CharField(max_length=30, default='active', db_index=True, verbose_name="الحالة الوظيفية")

    # الهيكل المالي لعقد معلم 2026م (بالجنية السوداني)
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2, default=200000.00, verbose_name="الراتب الأساسي")
    transport_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=80000.00, verbose_name="بدل ترحيل")
    communication_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=40000.00, verbose_name="بدل اتصال وانترنت")
    representation_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=30000.00, verbose_name="بدل تمثيل")
    deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name="الخصومات")
    net_payable = models.DecimalField(max_digits=12, decimal_places=2, default=350000.00, verbose_name="المستحق صرفه")

    # الالتزامات والاعتمادات الرسمية بالعقد
    agreed_to_bylaws = models.BooleanField(default=True, verbose_name="إقرار والتزام بلائحة العمل العامة")
    contract_start_date = models.DateField(null=True, blank=True, verbose_name="تاريخ بدء العقد")
    contract_end_date = models.DateField(null=True, blank=True, verbose_name="تاريخ نهاية العقد (مثال 31/7/2026)")
    teacher_signature_date = models.DateField(null=True, blank=True, verbose_name="تاريخ توقيع المعلم")
    school_manager_approval = models.BooleanField(default=True, verbose_name="اعتماد مدير المدرسة")
    school_manager_approval_date = models.DateField(null=True, blank=True, verbose_name="تاريخ اعتماد مدير المدرسة")
    admin_manager_approval = models.BooleanField(default=True, verbose_name="اعتماد المدير الإداري")
    admin_manager_approval_date = models.DateField(null=True, blank=True, verbose_name="تاريخ اعتماد المدير الإداري")
    general_manager_approval = models.BooleanField(default=True, verbose_name="اعتماد المدير العام")
    general_manager_approval_date = models.DateField(null=True, blank=True, verbose_name="تاريخ اعتماد المدير العام")

    def save(self, *args, **kwargs):
        if not self.employee_number:
            count = Employee.objects.filter(deleted_at__isnull=True).count() + 1
            self.employee_number = f"EMP-2026-{str(count).zfill(3)}"
        
        # حساب صافي المستحق تلقائياً
        from decimal import Decimal
        basic = Decimal(str(self.basic_salary or 0))
        transport = Decimal(str(self.transport_allowance or 0))
        comm = Decimal(str(self.communication_allowance or 0))
        rep = Decimal(str(self.representation_allowance or 0))
        ded = Decimal(str(self.deductions or 0))
        self.net_payable = (basic + transport + comm + rep) - ded
        super().save(*args, **kwargs)

    def apply_dependent_discounts(self):
        """
        إعادة احتساب خصومات اللائحة يدوياً (**اختياري — لا يُستدعى تلقائياً عند الحفظ**).
        نِسب الخصم المحفوظة هي ما أدخله المستخدم؛ هذه الدالة أداة مساعدة لمن أراد
        إرجاع النسب إلى قيم اللائحة الافتراضية.

        قواعد اللائحة التنظيمية (docs/modules/teacher-contract-bylaw.md):

        رابعاً — الأبناء (خصم متدرّج حسب عدد الأبناء الملتحقين):
            1 → 50%  ·  2 → 30%  ·  3 → 25%
            4 → إعفاء تلميذ واحد + 20% للثلاثة الباقين
            5 → إعفاء تلميذين

        خامساً — أقارب الدرجة الأولى: خصم 10% ثابت.

        يُعاد الحساب كلما أُضيف أو حُذف ملحق. يُرجع ملخّصاً بما طُبِّق.
        """
        children = list(self.dependents.filter(relation_type='child').order_by('created_at'))
        rule = DEPENDENT_DISCOUNT_RULES.get(
            min(len(children), MAX_DEPENDENT_TIER)
        ) if children else None

        if rule:
            exempt_count = rule['exempt']
            for idx, dep in enumerate(children):
                if idx < exempt_count:
                    dep.is_fully_exempt = True
                    dep.discount_percentage = 100
                else:
                    dep.is_fully_exempt = False
                    dep.discount_percentage = rule['percentage']
                dep.save(update_fields=['is_fully_exempt', 'discount_percentage', 'updated_at'])

        # أقارب الدرجة الأولى: نسبة ثابتة
        for rel in self.dependents.filter(relation_type='relative'):
            rel.is_fully_exempt = False
            rel.discount_percentage = RELATIVE_DISCOUNT_PERCENTAGE
            rel.save(update_fields=['is_fully_exempt', 'discount_percentage', 'updated_at'])

        return {
            'children_count': len(children),
            'exempted': rule['exempt'] if rule else 0,
            'percentage': rule['percentage'] if rule else 0,
        }

    class Meta:
        db_table = 'nebras_employees'
        ordering = ['-created_at']
        verbose_name = "موظف / معلم"
        verbose_name_plural = "الموظفون والمعلمون"


# 2. أبناء الموظف/المعلم بالمدرسة (جدول الأبناء بالاستمارة + خصومات الرسوم)
class EmployeeDependent(CombinedSharedModel):
    """
    ملحقو الموظف/المعلم بالمدرسة. تُطبَّق عليهم خصومات اللائحة التنظيمية:
    - الأبناء (رابعاً): خصم متدرّج حسب عدد الأبناء الملتحقين.
    - أقارب الدرجة الأولى (خامساً): رسوم التسجيل + خصم 10% ثابت.
    راجع docs/modules/teacher-contract-bylaw.md
    """
    RELATION_CHOICES = (
        ('child', 'ابن/ابنة'),
        ('relative', 'قريب من الدرجة الأولى'),
    )
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='dependents', verbose_name="الموظف/المعلم")
    full_name = models.CharField(max_length=255, verbose_name="اسم التلميذ")
    relation_type = models.CharField(max_length=20, choices=RELATION_CHOICES, default='child',
                                     db_index=True, verbose_name="صلة القرابة")
    # الربط بالطالب الفعلي — اختياري لأن العقد يُكتب غالباً قبل تسجيل الابن.
    # فارغ = تصريح بانتظار التسجيل · مملوء = مربوط ومؤكَّد ويُطبَّق عليه الخصم.
    student_id = models.UUIDField(null=True, blank=True, db_index=True, verbose_name="الطالب المرتبط")
    linked_at = models.DateTimeField(null=True, blank=True, verbose_name="تاريخ تأكيد الربط")
    academic_stage = models.CharField(max_length=100, default='المرحلة الابتدائية', verbose_name="المرحلة الدراسية")
    grade_level = models.CharField(max_length=100, blank=True, null=True, verbose_name="الصف الدراسي")
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=50.00, verbose_name="نسبة التخفيض %")
    is_fully_exempt = models.BooleanField(default=False, verbose_name="معفى كلياً من الرسوم الدراسية")
    notes = models.TextField(blank=True, null=True, verbose_name="ملاحظات الإعفاء")

    class Meta:
        db_table = 'nebras_employee_dependents'
        verbose_name = "ابن/ابنة الموظف"
        verbose_name_plural = "أبناء الموظفين"


# 3. المعرفون والمراجع من معلمي المنظومة
class EmployeeReference(CombinedSharedModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='references', verbose_name="الموظف")
    ref_name = models.CharField(max_length=255, verbose_name="اسم المعلم المرجع")
    ref_phone = models.CharField(max_length=50, blank=True, null=True, verbose_name="رقم الهاتف")

    class Meta:
        db_table = 'nebras_employee_references'


# 4. الخبرات التعليمية والمدرسية السابقة
class EmployeePriorExperience(CombinedSharedModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='prior_experiences', verbose_name="الموظف")
    school_name = models.CharField(max_length=255, verbose_name="اسم المدرسة/المؤسسة")
    # الاستمارة تفصل الخبرات حسب البلد (السودان / القاهرة)
    country = models.CharField(max_length=100, default='السودان', db_index=True, verbose_name="البلد")
    time_period = models.CharField(max_length=100, blank=True, null=True, verbose_name="الفترة الزمنية والتاريخ")

    class Meta:
        db_table = 'nebras_employee_prior_experiences'


# 5. طلبات السلفيات المالية للأبناء والظروف الطارئة
class EmployeeAdvance(CombinedSharedModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='advances', verbose_name="الموظف")
    amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="مبلغ السلفية")
    request_date = models.DateField(default=timezone.localdate, verbose_name="تاريخ الطلب")
    reason = models.TextField(blank=True, null=True, verbose_name="السبب والغرض")
    repayment_months = models.IntegerField(default=2, verbose_name="عدد أشهُر الخصم")
    status = models.CharField(max_length=30, default='approved', verbose_name="حالة الاعتماد")

    class Meta:
        db_table = 'nebras_employee_advances'


class EmployeeProfile(CombinedSharedModel):
    employee = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_employee_profiles'

class EmployeeStatusHistory(CombinedSharedModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='status_history')
    old_status = models.CharField(max_length=50, blank=True, null=True)
    new_status = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = 'nebras_employee_status_history'