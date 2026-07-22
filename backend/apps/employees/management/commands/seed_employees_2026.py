import datetime
import uuid
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.employees.domain.models import (
    Employee, 
    EmployeeDependent, 
    EmployeeReference, 
    EmployeePriorExperience, 
    EmployeeAdvance
)
from apps.tenants.domain.models import Tenant

class Command(BaseCommand):
    help = "زراعة وتغذية قاعدة البيانات ببيانات الموظفين والمعلمين الحقيقية وفق عقد معلم 2026 واللائحة التنظيمية"

    def handle(self, *args, **options):
        tenant = Tenant.objects.first()
        tenant_id = tenant.id if tenant else uuid.uuid4()

        self.stdout.write(self.style.SUCCESS("بدء زراعة بيانات المعلمين والموظفين لعقد 2026..."))

        # المعلم 1: الأستاذ عثمان أحمد العوض (معلم لغة عربية متميز)
        emp1, created1 = Employee.objects.get_or_create(
            national_id="1029384756",
            defaults={
                'tenant_id': tenant_id,
                'full_name_ar': "عثمان أحمد العوض حسن",
                'full_name_en': "Osman Ahmed Elawad",
                'title_surname': "العوض",
                'gender': "male",
                'nationality': "سوداني",
                'religion': "مسلم",
                'date_of_birth': datetime.date(1985, 4, 12),
                'marital_status': "married",
                'children_count': 3,
                'city': "أم درمان",
                'neighborhood': "حي الروضة",
                'square_number': "المربع 4",
                'house_number': "منزل 12",
                'address': "أم درمان - حي الروضة - مربع 4 - منزل 12",
                'prominent_teacher_friend': "أ. عبد الباقي مصطفى",
                'email': "osman.elawad@nebras.edu.sd",
                'mobile': "0912345678",
                'phone_1': "0912345678",
                'phone_2': "0123456789",
                'phone_3': "0999887766",
                'whatsapp_number': "0912345678",
                'emergency_phone_other': "0922334455",
                'emergency_kinship': "شقيق الموظف",
                'university_institute': "جامعة الخرطوم",
                'faculty': "كلية الآداب",
                'specialization': "اللغة العربية وآدابها",
                'teaching_subject_1': "اللغة العربية",
                'teaching_subject_2': "التربية الإسلامية",
                'teaching_subject_3': "البلاغة والنقد",
                'other_tasks_activities': "مشرف طابور صباحي ورئيس شعبة اللغة العربية",
                'weekly_lesson_quota': 23,
                'duty_exempt': True,
                'department': "التعليم والإشراف",
                'position': "معلم لغة عربية خبير",
                'employment_type': "Full-time",
                'joining_date': datetime.date(2021, 9, 1),
                'status': "active",
                'basic_salary': 200000.00,
                'transport_allowance': 80000.00,
                'communication_allowance': 40000.00,
                'representation_allowance': 30000.00,
                'deductions': 0.00,
                'net_payable': 350000.00,
                'agreed_to_bylaws': True,
                'contract_start_date': datetime.date(2026, 1, 1),
                'contract_end_date': datetime.date(2026, 7, 31),
                'teacher_signature_date': datetime.date(2026, 1, 2),
                'school_manager_approval': True,
                'admin_manager_approval': True,
                'general_manager_approval': True,
            }
        )

        if emp1:
            EmployeeDependent.objects.get_or_create(
                employee=emp1, full_name="محمد عثمان أحمد العوض",
                defaults={'tenant_id': emp1.tenant_id, 'academic_stage': "المرحلة المتوسطة", 'grade_level': "الصف الثاني", 'discount_percentage': 50.00, 'notes': "ابن الموظف (خصم 50%)"}
            )
            EmployeeDependent.objects.get_or_create(
                employee=emp1, full_name="فاطمة عثمان أحمد العوض",
                defaults={'tenant_id': emp1.tenant_id, 'academic_stage': "المرحلة الابتدائية", 'grade_level': "الصف الرابع", 'discount_percentage': 30.00, 'notes': "الابنة الثانية (خصم 30%)"}
            )
            EmployeeReference.objects.get_or_create(employee=emp1, ref_name="أ. ياسر عبد الكريم", defaults={'tenant_id': emp1.tenant_id, 'ref_phone': "0911223344"})
            EmployeeReference.objects.get_or_create(employee=emp1, ref_name="أ. خالد علي حسن", defaults={'tenant_id': emp1.tenant_id, 'ref_phone': "0955667788"})
            EmployeePriorExperience.objects.get_or_create(employee=emp1, school_name="مدارس القبس الأهلية", defaults={'tenant_id': emp1.tenant_id, 'time_period': "2018 - 2021"})
            EmployeeAdvance.objects.get_or_create(
                employee=emp1, amount=150000.00,
                defaults={
                    'tenant_id': emp1.tenant_id,
                    'reason': "سلفية طارئة لأغراض أسرية",
                    'status': "approved",
                    'repayment_months': 2,
                    'paid_amount': 75000.00,
                    'school_manager_approved': True,
                    'finance_approved': True,
                    'general_manager_approved': True,
                }
            )

        # المعلمة 2: أ. مريم إبراهيم علي (معلمة علوم ورياضيات)
        emp2, created2 = Employee.objects.get_or_create(
            national_id="9876543210",
            defaults={
                'tenant_id': tenant_id,
                'full_name_ar': "مريم إبراهيم علي التوم",
                'full_name_en': "Maryam Ibrahim Ali",
                'title_surname': "التوم",
                'gender': "female",
                'nationality': "سودانية",
                'religion': "مسلمة",
                'date_of_birth': datetime.date(1990, 8, 25),
                'marital_status': "married",
                'children_count': 2,
                'city': "الخرطوم",
                'neighborhood': "حي الرياض",
                'square_number': "المرفع 9",
                'house_number': "منزل 45",
                'address': "الخرطوم - الرياض - مربع 9 - شارع الجزار",
                'prominent_teacher_friend': "أ. سارة عبد الله",
                'email': "maryam.ibrahim@nebras.edu.sd",
                'mobile': "0987654321",
                'phone_1': "0987654321",
                'phone_2': "0123987654",
                'whatsapp_number': "0987654321",
                'emergency_phone_other': "0944556677",
                'emergency_kinship': "زوج المعلمة",
                'university_institute': "جامعة السودان للعلوم والتكنولوجيا",
                'faculty': "كلية العلوم",
                'specialization': "الفيزياء والرياضيات",
                'teaching_subject_1': "الرياضيات",
                'teaching_subject_2': "العلوم العامة",
                'teaching_subject_3': "الفيزياء",
                'other_tasks_activities': "مقررة النادي العلمي والابتكار",
                'weekly_lesson_quota': 23,
                'duty_exempt': True,
                'department': "التعليم والإشراف",
                'position': "معلمة رياضيات وعلوم",
                'employment_type': "Full-time",
                'joining_date': datetime.date(2022, 10, 15),
                'status': "active",
                'basic_salary': 220000.00,
                'transport_allowance': 80000.00,
                'communication_allowance': 40000.00,
                'representation_allowance': 30000.00,
                'deductions': 0.00,
                'net_payable': 370000.00,
                'agreed_to_bylaws': True,
                'contract_start_date': datetime.date(2026, 1, 1),
                'contract_end_date': datetime.date(2026, 7, 31),
                'teacher_signature_date': datetime.date(2026, 1, 3),
                'school_manager_approval': True,
                'admin_manager_approval': True,
                'general_manager_approval': True,
            }
        )

        if emp2:
            EmployeeDependent.objects.get_or_create(
                employee=emp2, full_name="أحمد خالد عبد الرحيم",
                defaults={'tenant_id': emp2.tenant_id, 'academic_stage': "المرحلة الابتدائية", 'grade_level': "الصف الثاني", 'discount_percentage': 50.00, 'notes': "ابن المعلمة"}
            )
            EmployeeReference.objects.get_or_create(employee=emp2, ref_name="أ. هدى عبد الرحمن", defaults={'tenant_id': emp2.tenant_id, 'ref_phone': "0933445566"})
            EmployeePriorExperience.objects.get_or_create(employee=emp2, school_name="مدارس المناهل الخاصة", defaults={'tenant_id': emp2.tenant_id, 'time_period': "2020 - 2022"})

        self.stdout.write(self.style.SUCCESS("تمت زراعة وتحديث بيانات الموظفين والمعلمين الحقيقية بنجاح!"))
