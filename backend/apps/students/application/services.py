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
from apps.admissions.domain.models import Applicant
from apps.common.exceptions import BusinessException
import uuid

class StudentApplicationService:
    """
    خدمات التطبيق لمعالجة وتنسيق كافة حالات استخدام الطلاب
    """
    
    @classmethod
    @transaction.atomic
    def create_student_from_applicant(cls, applicant_id: uuid.UUID, tenant_id: uuid.UUID, user_id: uuid.UUID, config=None) -> Student:
        """
        إنشاء طالب جديد بناءً على طلب قبول معتمد ومقبول
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
        
        # 5. إنشاء الملف الطبي للطالب
        StudentMedicalProfile.objects.create(
            student=student,
            allergies=[],
            chronic_diseases=[],
            medication=[],
            doctor="",
            medical_notes="",
            emergency_medical_contact={},
            vaccination_placeholder=[],
            medical_attachments=[],
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
                
        # 7. نشر حدث النطاق
        DomainEventPublisher.publish("StudentCreated", {
            "student_id": str(student.id),
            "student_number": student_number,
            "tenant_id": str(tenant_id)
        })
        
        return student

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
            enrollment_date=uuid.uuid4(), # date placeholder
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
        
        # إنشاء التسجيل الجديد
        new_enrollment = StudentEnrollment.objects.create(
            student_id=student_id,
            academic_year_id=academic_year_id,
            grade_id=to_grade_id,
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
        for key, val in medical_data.items():
            if hasattr(med_profile, key):
                setattr(med_profile, key, val)
        med_profile.updated_by = user_id
        med_profile.save()
        
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