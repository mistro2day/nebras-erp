import datetime
from django.utils import timezone
from django.db import transaction
from django.core.exceptions import ValidationError
from django.contrib.contenttypes.models import ContentType
from apps.students.domain.models import (
    Student, StudentProfile, StudentMedicalProfile, StudentEnrollment,
    StudentPromotionHistory, StudentStatusHistory, StudentTransfer,
    StudentWithdrawal, StudentGraduation, StudentAlumni, StudentArchive,
    StudentAttachment
)
from apps.students.domain.services import StudentNumberGenerator, StudentDomainService
from apps.students.domain.events import DomainEventPublisher
from apps.workflow.models import WorkflowDefinition, WorkflowInstance
from apps.workflow.services import WorkflowEngine
from apps.admissions.domain.models import Applicant, Guardian
from apps.students.domain.models import StudentFamilyRelation, StudentEmergencyContact
from apps.common.exceptions import BusinessException
# الحقائق الطبية مرجعها العيادة — لا تُكتب ولا تُقرأ إلا عبرها
from apps.clinic.application import profile_service as clinic_profiles


def resolve_branch_for_gender(tenant_id, gender):
    """
    يُرجع فرع المدرسة المطابق لجنس الطالب (بنين/بنات)، وينشئه إن لم يوجد.
    توحيد مفهوم «المدرسة» عبر فروع حقيقية بدل الاعتماد على الجنس كبديل.
    """
    from apps.organization.domain.models import Branch
    gtype = 'girls' if gender == 'female' else 'boys'
    defaults = {
        'boys': {'code': 'BR-BOYS', 'name': 'فرع البنين', 'name_ar': 'فرع البنين'},
        'girls': {'code': 'BR-GIRLS', 'name': 'فرع البنات', 'name_ar': 'فرع البنات'},
    }[gtype]
    branch = Branch.objects.filter(
        tenant_id=tenant_id, school_gender_type=gtype, deleted_at__isnull=True
    ).first()
    if branch:
        return branch
    branch, _ = Branch.objects.get_or_create(
        tenant_id=tenant_id, code=defaults['code'],
        defaults={
            'name': defaults['name'], 'name_ar': defaults['name_ar'],
            'school_gender_type': gtype, 'is_active': True, 'country': 'السودان',
        },
    )
    return branch
import uuid
import datetime

class StudentApplicationService:
    """
    خدمات التطبيق لمعالجة وتنسيق كافة حالات استخدام الطلاب
    """

    @staticmethod
    def _enforce_student_limit(tenant_id):
        """يمنع تجاوز حدّ الطلاب في خطة اشتراك المستأجر (يترجم الخطأ لاستثناء الأعمال)."""
        from apps.saas_billing.application.limits import ensure_can_add, PlanLimitExceeded
        try:
            ensure_can_add(tenant_id, 'students')
        except PlanLimitExceeded as exc:
            raise BusinessException(str(exc), code="plan_limit_exceeded")

    @classmethod
    @transaction.atomic
    def create_student_from_applicant(cls, applicant_id: uuid.UUID, tenant_id: uuid.UUID, user_id: uuid.UUID, config=None, financial_config: dict = None) -> Student:
        """
        إنشاء طالب جديد بناءً على طلب قبول معتمد ومقبول مع معالجة اختيارات الرسوم والأقساط والسداد الفوري
        """
        # 1. جلب المتقدم والتحقق من حالته
        try:
            applicant = Applicant.objects.get(id=applicant_id, tenant_id=tenant_id)
        except Applicant.DoesNotExist:
            raise BusinessException("طلب التقديم غير موجود.", code="applicant_not_found")
            
        if applicant.status != 'accepted':
            raise BusinessException("لا يمكن تسجيل طالب إلا إذا كان طلب التقديم 'مقبول'.", code="invalid_applicant_status")
            
        # التحقق من عدم تسجيل الطالب مسبقاً
        if Student.objects.filter(student_number=applicant.application_number).exists():
            raise BusinessException("هذا الطالب مسجل بالفعل في النظام.", code="student_already_registered")

        # التحقق من حدّ الطلاب في خطة اشتراك المستأجر
        cls._enforce_student_limit(tenant_id)

        # 2. توليد رقم الطالب الفريد
        student_number = StudentNumberGenerator.generate(
            tenant_id=tenant_id,
            branch_code="BR",
            academic_year_code="2026",
            sequence_num=Student.objects.filter(tenant_id=tenant_id).count() + 1,
            config=config
        )
        
        # 3. إنشاء كيان الطالب
        student = Student.objects.create(
            student_number=student_number,
            status='registered',
            tenant_id=tenant_id,
            created_by=user_id
        )
        
        # 4. إنشاء الملف الشخصي للطالب
        StudentProfile.objects.create(
            student=student,
            arabic_name=applicant.arabic_full_name,
            english_name=applicant.english_full_name,
            gender=applicant.gender,
            date_of_birth=applicant.date_of_birth,
            nationality=applicant.nationality,
            national_id=applicant.national_id,
            passport=applicant.passport_number,
            religion=applicant.religion,
            blood_group=applicant.blood_group,
            photo=None,
            languages=[],
            special_needs=applicant.special_needs,
            tenant_id=tenant_id,
            created_by=user_id
        )
        
        # 4b. نقل أولياء الأمور وجهات الطوارئ من طلب القبول إلى ملف الطالب
        for g in Guardian.objects.filter(applicant=applicant):
            StudentFamilyRelation.objects.create(
                student=student,
                relationship=g.relationship or 'guardian',
                full_name=g.full_name,
                phone=g.phone,
                email=g.email or None,
                occupation=g.occupation,
                employer=getattr(g, 'employer', None),
                national_id=g.national_id,
                emergency_contact=getattr(g, 'emergency_contact', False),
                tenant_id=tenant_id,
                created_by=user_id,
            )
            if getattr(g, 'emergency_contact_name', None):
                StudentEmergencyContact.objects.create(
                    student=student,
                    name=g.emergency_contact_name,
                    relationship=getattr(g, 'emergency_contact_relation', '') or '—',
                    phone=getattr(g, 'emergency_contact_phone', '') or '',
                    is_primary=False,
                    tenant_id=tenant_id,
                    created_by=user_id,
                )

        # 5. إنشاء الملف الطبي للطالب
        StudentMedicalProfile.objects.create(
            student=student,
            tenant_id=tenant_id,
            created_by=user_id
        )
        
        # 6. ربط وإطلاق مسار العمل
        workflow_def = WorkflowDefinition.objects.filter(code='student_lifecycle', tenant_id=tenant_id).first()
        if workflow_def:
            states = workflow_def.states.all()
            registered_state = states.filter(code='registered').first()
            if registered_state:
                WorkflowInstance.objects.create(
                    workflow=workflow_def,
                    current_state=registered_state,
                    content_type=ContentType.objects.get_for_model(Student),
                    object_id=student.id,
                    tenant_id=tenant_id,
                    created_by=user_id
                )
                
        # 6b. إنشاء التسجيل الدراسي وتعيين الفصل / الشعبة
        if applicant.academic_year_id and applicant.applying_grade_id:
            branch = resolve_branch_for_gender(tenant_id, applicant.gender)
            chosen_section_id = (financial_config.get('section_id') if financial_config else None) or applicant.applying_section_id
            if chosen_section_id:
                try:
                    chosen_section_id = uuid.UUID(str(chosen_section_id))
                except (ValueError, TypeError):
                    chosen_section_id = None

            StudentEnrollment.objects.create(
                tenant_id=tenant_id,
                student=student,
                academic_year_id=applicant.academic_year_id,
                grade_id=applicant.applying_grade_id,
                section_id=chosen_section_id,
                branch_id=branch.id,
                enrollment_date=datetime.date.today(),
                enrollment_type='new',
                status='active',
                created_by=user_id,
            )

        # 7. تحديث حالة طلب التقديم إلى "مُسجّل"
        applicant.status = 'enrolled'
        applicant.save(update_fields=['status', 'updated_at'])

        # 8. معالجة الإعدادات المالية والأقساط والإيصالات (إن وُجدت)
        if financial_config:
            cls.process_student_registration_finance(
                tenant_id=tenant_id,
                student_id=student.id,
                grade_id=applicant.applying_grade_id,
                academic_year_id=applicant.academic_year_id,
                financial_config=financial_config,
                user_id=user_id
            )

        # 9. نشر حدث النطاق
        DomainEventPublisher.publish("StudentCreated", {
            "student_id": str(student.id),
            "student_number": student_number,
            "tenant_id": str(tenant_id)
        })
        
        return student

    @classmethod
    @transaction.atomic
    def create_student_manually(cls, profile_data: dict, tenant_id: uuid.UUID, user_id: uuid.UUID, config=None, academic_data: dict = None, financial_config: dict = None) -> Student:
        """
        إنشاء طالب يدوياً بالكامل مع تفاصيله الشخصية والطبية والأكاديمية والمالية
        """
        cls._enforce_student_limit(tenant_id)

        # 1. توليد رقم الطالب الأكاديمي
        student_number = StudentNumberGenerator.generate(
            tenant_id=tenant_id,
            branch_code="BR",
            academic_year_code="2026",
            sequence_num=Student.objects.filter(tenant_id=tenant_id).count() + 1,
            config=config
        )
        
        # 2. إنشاء الكيان الرئيسي للطالب
        student = Student.objects.create(
            student_number=student_number,
            status='active',
            tenant_id=tenant_id,
            created_by=user_id
        )
        
        # 3. إنشاء البروفايل الشخصي
        dob = profile_data.get('date_of_birth') or '2010-01-01'
        
        StudentProfile.objects.create(
            student=student,
            arabic_name=profile_data.get('arabic_name', 'طالب جديد'),
            english_name=profile_data.get('english_name', ''),
            gender=profile_data.get('gender', 'male'),
            date_of_birth=dob,
            nationality=profile_data.get('nationality', 'سوداني'),
            national_id=profile_data.get('national_id', ''),
            passport=profile_data.get('passport', ''),
            religion=profile_data.get('religion', ''),
            blood_group=profile_data.get('blood_group', ''),
            photo=None,
            languages=profile_data.get('languages', []),
            special_needs=profile_data.get('special_needs', ''),
            learning_difficulty=profile_data.get('learning_difficulty', ''),
            talented_program=profile_data.get('talented_program', ''),
            notes=profile_data.get('notes', ''),
            tenant_id=tenant_id,
            created_by=user_id
        )
        
        # 4. إنشاء الملف الطبي
        StudentMedicalProfile.objects.create(
            student=student, tenant_id=tenant_id, created_by=user_id,
        )
        clinic_profiles.write_intake(
            tenant_id=tenant_id,
            person_type='student',
            person_id=student.id,
            data={
                'allergies': profile_data.get('allergies', []),
                'chronic_diseases': profile_data.get('chronic_diseases', []),
                'medical_notes': profile_data.get('medical_notes', ''),
                'blood_group': profile_data.get('blood_group'),
            },
            user_id=user_id,
        )

        # 4b. تسكين الطالب دراسياً إن توفرت البيانات الأكاديمية
        if academic_data and academic_data.get('grade_id') and academic_data.get('academic_year_id'):
            branch = resolve_branch_for_gender(tenant_id, profile_data.get('gender', 'male'))
            StudentEnrollment.objects.create(
                tenant_id=tenant_id,
                student=student,
                academic_year_id=uuid.UUID(str(academic_data['academic_year_id'])),
                grade_id=uuid.UUID(str(academic_data['grade_id'])),
                section_id=uuid.UUID(str(academic_data['section_id'])) if academic_data.get('section_id') else None,
                branch_id=branch.id,
                enrollment_date=datetime.date.today(),
                enrollment_type='new',
                status='active',
                created_by=user_id,
            )
        
        # 5. معالجة الإعدادات المالية والأقساط والإيصالات (إن وُجدت)
        if financial_config:
            grade_id = academic_data.get('grade_id') if academic_data else None
            academic_year_id = academic_data.get('academic_year_id') if academic_data else None
            cls.process_student_registration_finance(
                tenant_id=tenant_id,
                student_id=student.id,
                grade_id=uuid.UUID(str(grade_id)) if grade_id else None,
                academic_year_id=uuid.UUID(str(academic_year_id)) if academic_year_id else None,
                financial_config=financial_config,
                user_id=user_id
            )

        # 6. نشر حدث النطاق
        DomainEventPublisher.publish("StudentCreated", {
            "student_id": str(student.id),
            "student_number": student_number,
            "tenant_id": str(tenant_id)
        })
        
        return student

    @classmethod
    @transaction.atomic
    def process_student_registration_finance(cls, tenant_id: uuid.UUID, student_id: uuid.UUID,
                                              grade_id: uuid.UUID = None, academic_year_id: uuid.UUID = None,
                                              financial_config: dict = None, user_id: uuid.UUID = None):
        """
        معالجة البيانات المالية للطالب عند التسجيل أو التعديل (فاتورة مخصصة، خطة أقساط، وسداد فوري)
        """
        if not financial_config:
            return None

        from apps.student_finance.domain.models import (
            StudentBillingAccount, StudentInvoice, InvoiceItem, InvoiceDiscount,
            InstallmentPlan, Installment, FeeType, FeeCategory, StudentReceivable
        )
        from apps.student_finance.application.services import PaymentService
        from decimal import Decimal

        student_obj = Student.objects.filter(id=student_id).first()
        std_num = student_obj.student_number if student_obj else f"{timezone.now().year}-{StudentBillingAccount.objects.filter(tenant_id=tenant_id).count() + 1:04d}"
        acc_number = f"ACC-{std_num}"

        account, _ = StudentBillingAccount.objects.get_or_create(
            tenant_id=tenant_id,
            student_id=student_id,
            defaults={'account_number': acc_number}
        )

        reg_fee = Decimal(str(financial_config.get('registration_fee', 0) or 0))
        tuition_fee = Decimal(str(financial_config.get('tuition_fee', 0) or 0))
        discount_amt = Decimal(str(financial_config.get('discount_amount', 0) or 0))
        discount_reason = financial_config.get('discount_reason', 'خصم مالي مخصص')
        custom_items = financial_config.get('custom_fee_items', []) or []

        # البحث عن فاتورة قائمة أو إحلال فاتورة مسودة
        invoice = StudentInvoice.objects.filter(tenant_id=tenant_id, student_billing_account=account).first()
        if invoice and invoice.status == 'draft':
            invoice.items.all().delete()
            invoice.discounts.all().delete()
        elif not invoice:
            inv_seq = StudentInvoice.objects.filter(tenant_id=tenant_id).count() + 1
            inv_num = f"INV-{timezone.now().year}-{inv_seq:04d}"
            invoice = StudentInvoice.objects.create(
                tenant_id=tenant_id,
                student_billing_account=account,
                invoice_number=inv_num,
                issue_date=datetime.date.today(),
                due_date=datetime.date.today() + datetime.timedelta(days=30),
                status='posted',
                total_amount=Decimal('0.0'),
                paid_amount=Decimal('0.0'),
                outstanding_amount=Decimal('0.0')
            )

        total_amount = reg_fee + tuition_fee
        for c_item in custom_items:
            total_amount += Decimal(str(c_item.get('amount', 0) or 0))

        final_total = max(Decimal('0.0'), total_amount - discount_amt)
        invoice.total_amount = final_total
        invoice.outstanding_amount = max(Decimal('0.0'), final_total - invoice.paid_amount)
        invoice.save()

        # إضافة البنود
        if reg_fee > 0:
            reg_type = FeeType.objects.filter(tenant_id=tenant_id, code='registration').first()
            if not reg_type:
                cat, _ = FeeCategory.objects.get_or_create(tenant_id=tenant_id, code='registration', defaults={'name_ar': 'رسوم التسجيل', 'name_en': 'Registration'})
                reg_type = FeeType.objects.create(tenant_id=tenant_id, fee_category=cat, code='registration', name_ar='رسوم التسجيل والقبول', name_en='Registration & Admission')
            InvoiceItem.objects.create(tenant_id=tenant_id, invoice=invoice, fee_type=reg_type, amount=reg_fee, description='رسوم التسجيل والقبول المعدلة')

        if tuition_fee > 0:
            tuition_type = FeeType.objects.filter(tenant_id=tenant_id, code='tuition_annual').first()
            if not tuition_type:
                cat, _ = FeeCategory.objects.get_or_create(tenant_id=tenant_id, code='tuition', defaults={'name_ar': 'الرسوم الدراسية', 'name_en': 'Tuition'})
                tuition_type = FeeType.objects.create(tenant_id=tenant_id, fee_category=cat, code='tuition_annual', name_ar='الرسوم الدراسية السنوية', name_en='Annual Tuition')
            InvoiceItem.objects.create(tenant_id=tenant_id, invoice=invoice, fee_type=tuition_type, amount=tuition_fee, description='الرسوم الدراسية السنوية المعدلة')

        for c_item in custom_items:
            c_name = c_item.get('name', 'رسوم مخصصة')
            c_amt = Decimal(str(c_item.get('amount', 0) or 0))
            if c_amt > 0:
                generic_type = FeeType.objects.filter(tenant_id=tenant_id, code='activities').first()
                if not generic_type:
                    cat, _ = FeeCategory.objects.get_or_create(tenant_id=tenant_id, code='activities', defaults={'name_ar': 'أنشطة ورسوم أخرى', 'name_en': 'Activities'})
                    generic_type = FeeType.objects.create(tenant_id=tenant_id, fee_category=cat, code='activities', name_ar='رسوم أخرى', name_en='Other Fees')
                InvoiceItem.objects.create(tenant_id=tenant_id, invoice=invoice, fee_type=generic_type, amount=c_amt, description=c_name)

        if discount_amt > 0:
            InvoiceDiscount.objects.create(
                tenant_id=tenant_id,
                invoice=invoice,
                discount_type='fixed',
                amount=discount_amt,
                discount_reason=discount_reason
            )

        # تحديث المستحقات
        rec, _ = StudentReceivable.objects.get_or_create(
            tenant_id=tenant_id,
            student_billing_account=account,
            invoice=invoice,
            defaults={
                'amount': final_total,
                'paid_amount': Decimal('0.0'),
                'outstanding_amount': final_total,
                'status': 'outstanding'
            }
        )
        rec.amount = final_total
        rec.outstanding_amount = max(Decimal('0.0'), final_total - rec.paid_amount)
        rec.save()

        account.outstanding_balance = rec.outstanding_amount
        account.current_balance = final_total
        account.save(update_fields=['outstanding_balance', 'current_balance'])

        # 2. إنشاء الأقساط المجدولة
        inst_plan_data = financial_config.get('installment_plan') or {}
        installments_list = inst_plan_data.get('installments') or []

        if installments_list:
            default_plan, _ = InstallmentPlan.objects.get_or_create(
                tenant_id=tenant_id,
                name="خطة أقساط مخصصة للطالب",
                defaults={'number_of_installments': len(installments_list), 'is_active': True}
            )
            Installment.objects.filter(tenant_id=tenant_id, invoice=invoice, status='pending').delete()
            for idx, inst in enumerate(installments_list, start=1):
                i_amt = Decimal(str(inst.get('amount', 0) or 0))
                i_date_str = inst.get('due_date') or str(datetime.date.today() + datetime.timedelta(days=30 * idx))
                if isinstance(i_date_str, str):
                    try:
                        i_date = datetime.date.fromisoformat(i_date_str)
                    except ValueError:
                        i_date = datetime.date.today() + datetime.timedelta(days=30 * idx)
                else:
                    i_date = i_date_str

                if i_amt > 0:
                    Installment.objects.create(
                        tenant_id=tenant_id,
                        student_billing_account=account,
                        invoice=invoice,
                        installment_plan=default_plan,
                        due_date=i_date,
                        amount=i_amt,
                        paid_amount=Decimal('0.0'),
                        status='pending'
                    )

        # 3. إصدار إيصال السداد الفوري (إن وُجد)
        receipt_data = None
        init_pay = financial_config.get('initial_payment') or {}
        if init_pay.get('is_paid') and Decimal(str(init_pay.get('amount', 0) or 0)) > 0:
            pay_amt = Decimal(str(init_pay.get('amount', 0)))
            pay_method_id = init_pay.get('payment_method_id')
            cash_box_id = init_pay.get('cash_box_id')
            bank_account_id = init_pay.get('bank_account_id')

            if pay_method_id:
                try:
                    receipt = PaymentService.receive_payment(
                        tenant_id=tenant_id,
                        billing_account_id=account.id,
                        amount=pay_amt,
                        payment_method_id=uuid.UUID(str(pay_method_id)),
                        bank_account_id=uuid.UUID(str(bank_account_id)) if bank_account_id else None,
                        cash_box_id=uuid.UUID(str(cash_box_id)) if cash_box_id else None,
                        user_id=user_id
                    )
                    receipt_data = {
                        'id': str(receipt.id),
                        'receipt_number': receipt.receipt_number,
                        'amount': float(receipt.amount),
                        'status': receipt.status
                    }
                except Exception as exc:
                    import logging
                    logging.getLogger('nebras.students').warning("تعذّر إصدار إيصال السداد الفوري للطالب %s: %s", student_id, exc)

        return {
            'invoice_id': str(invoice.id),
            'invoice_number': invoice.invoice_number,
            'total_amount': float(final_total),
            'receipt': receipt_data
        }

    @classmethod
    @transaction.atomic
    def delete_student(cls, student_id: uuid.UUID, tenant_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """
        حذف الطالب آمنياً بنمط Soft Delete
        """
        student = Student.objects.filter(id=student_id, tenant_id=tenant_id, deleted_at__isnull=True).first()
        if not student:
            raise BusinessException("الطالب غير موجود أو تم حذفه مسبقاً.", code="student_not_found")
        
        now = datetime.datetime.now(datetime.timezone.utc)
        student.deleted_at = now
        student.save(update_fields=['deleted_at'])

        if hasattr(student, 'profile') and student.profile:
            student.profile.deleted_at = now
            student.profile.save(update_fields=['deleted_at'])

        DomainEventPublisher.publish("StudentDeleted", {
            "student_id": str(student.id),
            "tenant_id": str(tenant_id)
        })
        return True

    @classmethod
    @transaction.atomic
    def enroll_student(cls, student_id: uuid.UUID, academic_year_id: uuid.UUID, grade_id: uuid.UUID,
                       tenant_id: uuid.UUID, user_id: uuid.UUID, term_id: uuid.UUID = None,
                       section_id: uuid.UUID = None, branch_id: uuid.UUID = None,
                       campus_id: uuid.UUID = None, enrollment_type: str = 'new') -> StudentEnrollment:
        """
        تسجيل الطالب أكاديمياً في سنة دراسية ومرحلة/صف محدد
        """
        # التحقق من الطالب
        try:
            student = Student.objects.get(id=student_id, tenant_id=tenant_id)
        except Student.DoesNotExist:
            raise BusinessException("الطالب غير موجود.", code="student_not_found")
            
        # التحقق من قاعدة تفرد التسجيل النشط في نفس السنة الدراسية
        StudentDomainService.validate_unique_enrollment_per_year(student_id, academic_year_id)
        
        # إنشاء التسجيل
        enrollment = StudentEnrollment.objects.create(
            student=student,
            academic_year_id=academic_year_id,
            term_id=term_id,
            grade_id=grade_id,
            section_id=section_id,
            branch_id=branch_id,
            campus_id=campus_id,
            enrollment_date=datetime.date.today(),
            enrollment_type=enrollment_type,
            status='active',
            tenant_id=tenant_id,
            created_by=user_id
        )
        
        # تحديث حالة الطالب إلى enrolled أو active عن طريق مسار العمل
        cls.change_status(student_id, 'enroll_student', "تم التسجيل الأكاديمي وتوزيع الصف", user_id, tenant_id)
        
        # نشر حدث النطاق
        DomainEventPublisher.publish("StudentEnrolled", {
            "student_id": str(student.id),
            "enrollment_id": str(enrollment.id),
            "academic_year_id": str(academic_year_id),
            "grade_id": str(grade_id),
            "tenant_id": str(tenant_id)
        })
        
        return enrollment

    @classmethod
    @transaction.atomic
    def promote_student(cls, student_id: uuid.UUID, from_grade_id: uuid.UUID, to_grade_id: uuid.UUID,
                        academic_year_id: uuid.UUID, tenant_id: uuid.UUID, user_id: uuid.UUID) -> StudentPromotionHistory:
        """
        ترقية/ترفيع الطالب إلى صف دراسي جديد
        """
        # التحقق من الطالب والتسجيل النشط
        enrollment = StudentEnrollment.objects.filter(student_id=student_id, grade_id=from_grade_id, status='active', tenant_id=tenant_id).first()
        if not enrollment:
            raise BusinessException("لم يتم العثور على تسجيل نشط للطالب في الصف الحالي.", code="enrollment_not_found")
            
        # إكمال التسجيل الحالي
        enrollment.status = 'completed'
        enrollment.save()
        
        # البحث عن القسم الجديد المقابل بنفس الاسم في الصف الجديد
        new_section_id = None
        if enrollment.section_id:
            try:
                old_section = enrollment.section
                from apps.academics.domain.models import Section
                matching_section = Section.objects.filter(
                    grade_id=to_grade_id,
                    name=old_section.name,
                    tenant_id=tenant_id,
                    deleted_at__isnull=True
                ).first()
                if matching_section:
                    new_section_id = matching_section.id
            except Exception:
                pass

        # إنشاء التسجيل الجديد
        new_enrollment = StudentEnrollment.objects.create(
            student_id=student_id,
            academic_year_id=academic_year_id,
            grade_id=to_grade_id,
            section_id=new_section_id,
            enrollment_date=enrollment.enrollment_date,
            enrollment_type='returning',
            status='active',
            tenant_id=tenant_id,
            created_by=user_id
        )
        
        # تسجيل عملية الترقية في التاريخ
        promotion = StudentPromotionHistory.objects.create(
            student_id=student_id,
            from_grade_id=from_grade_id,
            to_grade_id=to_grade_id,
            academic_year_id=academic_year_id,
            promoted_by=user_id,
            tenant_id=tenant_id,
            created_by=user_id
        )
        
        # نشر حدث النطاق
        DomainEventPublisher.publish("StudentPromoted", {
            "student_id": str(student_id),
            "from_grade_id": str(from_grade_id),
            "to_grade_id": str(to_grade_id),
            "tenant_id": str(tenant_id)
        })
        
        return promotion

    @classmethod
    @transaction.atomic
    def transfer_student(cls, student_id: uuid.UUID, transfer_type: str, school_name: str,
                         transfer_date: str, reason: str, tenant_id: uuid.UUID, user_id: uuid.UUID) -> StudentTransfer:
        """
        تسجيل طلب انتقال الطالب
        """
        transfer = StudentTransfer.objects.create(
            student_id=student_id,
            transfer_type=transfer_type,
            school_name=school_name,
            transfer_date=transfer_date,
            reason=reason,
            tenant_id=tenant_id,
            created_by=user_id
        )
        
        # تغيير حالة الطالب إلى transferred عبر محرك مسارات العمل
        cls.change_status(student_id, 'transfer_student', f"انتقال الطالب إلى {school_name}", user_id, tenant_id)
        
        # نشر حدث النطاق
        DomainEventPublisher.publish("StudentTransferred", {
            "student_id": str(student_id),
            "transfer_type": transfer_type,
            "school_name": school_name,
            "tenant_id": str(tenant_id)
        })
        
        return transfer

    @classmethod
    @transaction.atomic
    def withdraw_student(cls, student_id: uuid.UUID, withdrawal_date: str, reason: str,
                         tenant_id: uuid.UUID, user_id: uuid.UUID) -> StudentWithdrawal:
        """
        انسحاب الطالب من المدرسة
        """
        withdrawal = StudentWithdrawal.objects.create(
            student_id=student_id,
            withdrawal_date=withdrawal_date,
            reason=reason,
            approved_by=user_id,
            tenant_id=tenant_id,
            created_by=user_id
        )
        
        # تغيير حالة الطالب إلى withdrawn عبر مسار العمل
        cls.change_status(student_id, 'withdraw_student', f"انسحاب الطالب بسبب: {reason}", user_id, tenant_id)
        
        # نشر حدث النطاق
        DomainEventPublisher.publish("StudentWithdrawn", {
            "student_id": str(student_id),
            "withdrawal_date": str(withdrawal_date),
            "tenant_id": str(tenant_id)
        })
        
        return withdrawal

    @classmethod
    @transaction.atomic
    def graduate_student(cls, student_id: uuid.UUID, graduation_date: str, graduation_class: str,
                         remarks: str, tenant_id: uuid.UUID, user_id: uuid.UUID) -> StudentGraduation:
        """
        تخريج الطالب من المدرسة
        """
        graduation = StudentGraduation.objects.create(
            student_id=student_id,
            graduation_date=graduation_date,
            graduation_class=graduation_class,
            remarks=remarks,
            tenant_id=tenant_id,
            created_by=user_id
        )
        
        # إنشاء سجل الخريجين
        StudentAlumni.objects.create(
            student_id=student_id,
            graduation_year=int(graduation_date.split('-')[0]) if '-' in str(graduation_date) else 2026,
            current_occupation="Alumni",
            contact_allowed=True,
            tenant_id=tenant_id,
            created_by=user_id
        )
        
        # تغيير حالة الطالب إلى graduated عبر مسار العمل
        cls.change_status(student_id, 'graduate_student', "تخرج الطالب بنجاح", user_id, tenant_id)
        
        # نشر حدث النطاق
        DomainEventPublisher.publish("StudentGraduated", {
            "student_id": str(student_id),
            "graduation_date": str(graduation_date),
            "tenant_id": str(tenant_id)
        })
        
        return graduation

    @classmethod
    @transaction.atomic
    def archive_student(cls, student_id: uuid.UUID, archive_reason: str, tenant_id: uuid.UUID, user_id: uuid.UUID) -> StudentArchive:
        """
        أرشفة وحذف الطالب لطيفاً (Soft Delete)
        """
        student = Student.objects.get(id=student_id, tenant_id=tenant_id)
        
        archive = StudentArchive.objects.create(
            student=student,
            archive_reason=archive_reason,
            archived_by=user_id,
            tenant_id=tenant_id,
            created_by=user_id
        )
        
        # تغيير الحالة إلى archived
        cls.change_status(student_id, 'archive_student', f"أرشفة بسبب: {archive_reason}", user_id, tenant_id)
        
        # الحذف اللطيف لكيان الطالب الأساسي
        student.delete()
        
        # نشر حدث النطاق
        DomainEventPublisher.publish("StudentArchived", {
            "student_id": str(student_id),
            "archive_reason": archive_reason,
            "tenant_id": str(tenant_id)
        })
        
        return archive

    @classmethod
    @transaction.atomic
    def restore_student(cls, student_id: uuid.UUID, tenant_id: uuid.UUID, user_id: uuid.UUID) -> Student:
        """
        استعادة طالب مؤرشف محذوف لطيفاً
        """
        student = Student.all_objects.get(id=student_id, tenant_id=tenant_id)
        student.restore()
        
        # إزالة سجل الأرشفة
        StudentArchive.objects.filter(student=student).delete()
        
        # تغيير الحالة إلى active عبر مسار العمل
        cls.change_status(student_id, 'restore_student', "استعادة ملف الطالب مؤرشف", user_id, tenant_id)
        
        # نشر حدث النطاق
        DomainEventPublisher.publish("StudentRestored", {
            "student_id": str(student_id),
            "tenant_id": str(tenant_id)
        })
        
        return student

    @classmethod
    @transaction.atomic
    def update_medical_profile(cls, student_id: uuid.UUID, medical_data: dict, tenant_id: uuid.UUID, user_id: uuid.UUID) -> StudentMedicalProfile:
        """
        تحديث الملف الطبي للطالب
        """
        med_profile = StudentMedicalProfile.objects.get(student_id=student_id, tenant_id=tenant_id)

        # الحقائق الطبية تُكتب في العيادة وحدها — مصدر واحد يراه الوليّ والممرضة.
        clinic_profiles.write_intake(
            tenant_id=tenant_id,
            person_type='student',
            person_id=student_id,
            data=medical_data,
            user_id=user_id,
        )

        med_profile.updated_by = user_id
        med_profile.save(update_fields=['updated_by', 'updated_at'])
        
        # نشر حدث النطاق
        DomainEventPublisher.publish("StudentMedicalUpdated", {
            "student_id": str(student_id),
            "tenant_id": str(tenant_id)
        })
        
        return med_profile

    @classmethod
    @transaction.atomic
    def upload_attachment(cls, student_id: uuid.UUID, attachment_type: str, file_asset_id: uuid.UUID,
                          file_name: str, tenant_id: uuid.UUID, user_id: uuid.UUID) -> StudentAttachment:
        """
        رفع وثيقة جديدة للطالب وتوثيقها
        """
        attachment = StudentAttachment.objects.create(
            student_id=student_id,
            attachment_type=attachment_type,
            file_asset_id=file_asset_id,
            file_name=file_name,
            version=1,
            audit_trail=[{"action": "uploaded", "user": str(user_id)}],
            tenant_id=tenant_id,
            created_by=user_id
        )
        
        # نشر حدث النطاق
        DomainEventPublisher.publish("StudentAttachmentUploaded", {
            "student_id": str(student_id),
            "attachment_id": str(attachment.id),
            "file_asset_id": str(file_asset_id),
            "tenant_id": str(tenant_id)
        })
        
        return attachment

    @classmethod
    @transaction.atomic
    def change_status(cls, student_id: uuid.UUID, action: str, comments: str, user_id: uuid.UUID, tenant_id: uuid.UUID) -> Student:
        """
        تغيير حالة الطالب وتحديث مسار العمل الخاص به
        """
        student = Student.objects.get(id=student_id, tenant_id=tenant_id)
        content_type = ContentType.objects.get_for_model(Student)
        
        instance = WorkflowInstance.objects.filter(content_type=content_type, object_id=student.id).first()
        if not instance:
            # إذا لم يوجد مثيل لمسار العمل، نقوم بإنشائه فوراً
            workflow_def = WorkflowDefinition.objects.filter(code='student_lifecycle', tenant_id=tenant_id).first()
            if not workflow_def:
                # إذا لم يوجد مسار عمل مهيأ، قم بتهيئة واحد للمستأجر
                from apps.students.infrastructure.workflow_config import setup_student_workflow
                workflow_def = setup_student_workflow(tenant_id)
                
            states = workflow_def.states.all()
            initial_state = states.filter(code=student.status).first() or states.filter(is_initial=True).first()
            instance = WorkflowInstance.objects.create(
                workflow=workflow_def,
                current_state=initial_state,
                content_type=content_type,
                object_id=student.id,
                tenant_id=tenant_id,
                created_by=user_id
            )
            
        old_status = student.status
        updated_instance = WorkflowEngine.trigger_transition(
            instance_id=instance.id,
            action=action,
            user_id=user_id,
            comments=comments
        )
        
        student.status = updated_instance.current_state.code
        student.save()
        
        # تسجيل في تاريخ التغييرات
        StudentStatusHistory.objects.create(
            student=student,
            from_status=old_status,
            to_status=student.status,
            changed_by=user_id,
            comments=comments,
            tenant_id=tenant_id,
            created_by=user_id
        )
        
        # نشر حدث النطاق
        DomainEventPublisher.publish("StudentStatusChanged", {
            "student_id": str(student.id),
            "from_status": old_status,
            "to_status": student.status,
            "tenant_id": str(tenant_id)
        })
        
        return student