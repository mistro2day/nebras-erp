from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django.core.exceptions import ValidationError
from django.db.models import Q
from apps.common.responses import StandardResponse, StandardPagination
from apps.common.exceptions import BusinessException
from apps.students.domain.models import (
    Student, StudentProfile, StudentMedicalProfile, StudentAddress,
    StudentFamilyRelation, StudentAttachment, StudentEnrollment,
    StudentPromotionHistory, StudentNote, StudentTag, StudentTransfer
)
from apps.students.interfaces.serializers import (
    StudentSerializer, StudentProfileSerializer, StudentMedicalProfileSerializer,
    StudentAddressSerializer, StudentFamilyRelationSerializer,
    StudentAttachmentSerializer, StudentEnrollmentSerializer,
    StudentPromotionHistorySerializer, StudentNoteSerializer,
    StudentTagSerializer, StudentTransferSerializer
)
from apps.students.application.services import StudentApplicationService
from apps.students.interfaces.permissions import StudentPermission
import uuid
import csv
import io

class StudentViewSet(viewsets.ModelViewSet):
    """
    مجموعة الواجهات (ViewSet) الرئيسية لإدارة الطلاب
    """
    permission_classes = [StudentPermission]
    pagination_class = StandardPagination
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'student_number']

    def get_queryset(self):
        tenant_id = self.request.tenant.id if hasattr(self.request, 'tenant') and self.request.tenant else None
        qs = Student.objects.filter(deleted_at__isnull=True)
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
            
        # البحث المتقدم والفلترة
        search_query = self.request.query_params.get('search', None)
        if search_query:
            qs = qs.filter(
                Q(student_number__icontains=search_query) |
                Q(profile__arabic_name__icontains=search_query) |
                Q(profile__english_name__icontains=search_query) |
                Q(profile__national_id__icontains=search_query) |
                Q(family_relations__full_name__icontains=search_query) |
                Q(family_relations__phone__icontains=search_query)
            ).distinct()
            
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            qs = qs.filter(status=status_filter)
            
        grade_filter = self.request.query_params.get('grade_id', None)
        if grade_filter:
            qs = qs.filter(enrollments__grade_id=grade_filter, enrollments__status='active')
            
        branch_filter = self.request.query_params.get('branch_id', None)
        if branch_filter:
            qs = qs.filter(enrollments__branch_id=branch_filter, enrollments__status='active')
            
        return qs

    def get_serializer_class(self):
        return StudentSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return StandardResponse(serializer.data, message="تم جلب بيانات الطالب بنجاح.")

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # 1. تحديث البروفايل الشخصي
        profile_data = request.data.get('profile', {})
        if profile_data and hasattr(instance, 'profile'):
            profile_serializer = StudentProfileSerializer(instance.profile, data=profile_data, partial=partial)
            profile_serializer.is_valid(raise_exception=True)
            profile_serializer.save()
            
        # 2. تحديث الملف الطبي
        medical_data = request.data.get('medical_profile', {})
        if medical_data and hasattr(instance, 'medical_profile'):
            medical_serializer = StudentMedicalProfileSerializer(instance.medical_profile, data=medical_data, partial=partial)
            medical_serializer.is_valid(raise_exception=True)
            medical_serializer.save()

        # 3. تحديث حالة الطالب مباشرة (للمستخدم الخارق)
        status_val = request.data.get('status')
        if status_val:
            instance.status = status_val
            instance.save(update_fields=['status'])
            
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return StandardResponse(serializer.data, message="تم تحديث بيانات الطالب بنجاح.")

    def create(self, request, *args, **kwargs):
        """إنشاء ملف طالب يدوياً بالكامل"""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else uuid.uuid4()
        user_id = request.user.id if request.user else uuid.uuid4()
        
        # استخراج البيانات المتداخلة
        profile_data = request.data.get('profile', {})
        medical_data = request.data.get('medical_profile', {})
        
        # دمج البيانات
        full_data = {**profile_data, **medical_data}
        
        student = StudentApplicationService.create_student_manually(
            profile_data=full_data,
            tenant_id=tenant_id,
            user_id=user_id
        )
        
        serializer = self.get_serializer(student)
        return StandardResponse(serializer.data, message="تم تسجيل ملف الطالب يدوياً وتوليد الرقم الأكاديمي بنجاح.", status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='create-from-applicant')
    def create_from_applicant(self, request):
        """إنشاء طالب من طلب تقديم مقبول"""
        applicant_id = request.data.get('applicant_id')
        if not applicant_id:
            raise ValidationError("يجب توفير applicant_id.")
            
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else uuid.uuid4()
        user_id = request.user.id if request.user else uuid.uuid4()
        
        student = StudentApplicationService.create_student_from_applicant(
            applicant_id=uuid.UUID(applicant_id),
            tenant_id=tenant_id,
            user_id=user_id
        )
        
        serializer = StudentSerializer(student)
        return StandardResponse(serializer.data, message="تم تسجيل الطالب بنجاح وتوليد الرقم المدرسي.", status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='enroll')
    def enroll(self, request, pk=None):
        """تسجيل الطالب في مرحلة تعليمية/صف جديد"""
        student = self.get_object()
        academic_year_id = request.data.get('academic_year_id')
        grade_id = request.data.get('grade_id')
        
        if not academic_year_id or not grade_id:
            raise ValidationError("يجب توفير academic_year_id و grade_id.")
            
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else uuid.uuid4()
        user_id = request.user.id if request.user else uuid.uuid4()
        
        enrollment = StudentApplicationService.enroll_student(
            student_id=student.id,
            academic_year_id=uuid.UUID(academic_year_id),
            grade_id=uuid.UUID(grade_id),
            tenant_id=tenant_id,
            user_id=user_id,
            term_id=request.data.get('term_id'),
            section_id=request.data.get('section_id'),
            branch_id=request.data.get('branch_id'),
            campus_id=request.data.get('campus_id'),
            enrollment_type=request.data.get('enrollment_type', 'new')
        )
        
        serializer = StudentEnrollmentSerializer(enrollment)
        return StandardResponse(serializer.data, message="تم تسجيل وتسكين الطالب دراسياً بنجاح.")

    @action(detail=True, methods=['post'], url_path='promote')
    def promote(self, request, pk=None):
        """ترفيع وترقية الطالب لصف جديد"""
        student = self.get_object()
        from_grade_id = request.data.get('from_grade_id')
        to_grade_id = request.data.get('to_grade_id')
        academic_year_id = request.data.get('academic_year_id')
        
        if not from_grade_id or not to_grade_id or not academic_year_id:
            raise ValidationError("الحقول من، إلى، والسنة الدراسية مطلوبة.")
            
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else uuid.uuid4()
        user_id = request.user.id if request.user else uuid.uuid4()
        
        promotion = StudentApplicationService.promote_student(
            student_id=student.id,
            from_grade_id=uuid.UUID(from_grade_id),
            to_grade_id=uuid.UUID(to_grade_id),
            academic_year_id=uuid.UUID(academic_year_id),
            tenant_id=tenant_id,
            user_id=user_id
        )
        
        serializer = StudentPromotionHistorySerializer(promotion)
        return StandardResponse(serializer.data, message="تم ترفيع الطالب بنجاح.")

    @action(detail=True, methods=['post'], url_path='transfer')
    def transfer(self, request, pk=None):
        """طلب نقل أو تحويل طالب"""
        student = self.get_object()
        transfer_type = request.data.get('transfer_type') # in / out
        school_name = request.data.get('school_name')
        transfer_date = request.data.get('transfer_date')
        reason = request.data.get('reason', '')
        
        if not transfer_type or not school_name or not transfer_date:
            raise ValidationError("بيانات النقل غير مكتملة.")
            
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else uuid.uuid4()
        user_id = request.user.id if request.user else uuid.uuid4()
        
        transfer = StudentApplicationService.transfer_student(
            student_id=student.id,
            transfer_type=transfer_type,
            school_name=school_name,
            transfer_date=transfer_date,
            reason=reason,
            tenant_id=tenant_id,
            user_id=user_id
        )
        
        serializer = StudentTransferSerializer(transfer)
        return StandardResponse(serializer.data, message="تم تسجيل طلب نقل الطالب بنجاح.")

    @action(detail=True, methods=['post'], url_path='withdraw')
    def withdraw(self, request, pk=None):
        """انسحاب طالب"""
        student = self.get_object()
        withdrawal_date = request.data.get('withdrawal_date')
        reason = request.data.get('reason')
        
        if not withdrawal_date or not reason:
            raise ValidationError("تاريخ الانسحاب والسبب مطلوبان.")
            
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else uuid.uuid4()
        user_id = request.user.id if request.user else uuid.uuid4()
        
        withdrawal = StudentApplicationService.withdraw_student(
            student_id=student.id,
            withdrawal_date=withdrawal_date,
            reason=reason,
            tenant_id=tenant_id,
            user_id=user_id
        )
        
        return StandardResponse(None, message="تم تسجيل انسحاب الطالب وتحديث الحالة.")

    @action(detail=True, methods=['post'], url_path='graduate')
    def graduate(self, request, pk=None):
        """تخريج طالب"""
        student = self.get_object()
        graduation_date = request.data.get('graduation_date')
        graduation_class = request.data.get('graduation_class', '')
        remarks = request.data.get('remarks', '')
        
        if not graduation_date:
            raise ValidationError("تاريخ التخرج مطلوب.")
            
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else uuid.uuid4()
        user_id = request.user.id if request.user else uuid.uuid4()
        
        graduation = StudentApplicationService.graduate_student(
            student_id=student.id,
            graduation_date=graduation_date,
            graduation_class=graduation_class,
            remarks=remarks,
            tenant_id=tenant_id,
            user_id=user_id
        )
        
        return StandardResponse(None, message="تم تخريج الطالب بنجاح ونقله لسجل الخريجين.")

    @action(detail=True, methods=['post'], url_path='archive')
    def archive(self, request, pk=None):
        """أرشفة ملف طالب"""
        student = self.get_object()
        reason = request.data.get('reason')
        if not reason:
            raise ValidationError("سبب الأرشفة مطلوب.")
            
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else uuid.uuid4()
        user_id = request.user.id if request.user else uuid.uuid4()
        
        StudentApplicationService.archive_student(student.id, reason, tenant_id, user_id)
        return StandardResponse(None, message="تم أرشفة الطالب وحذف الملف لطيفاً.")

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        """استعادة طالب مؤرشف"""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else uuid.uuid4()
        user_id = request.user.id if request.user else uuid.uuid4()
        
        student = StudentApplicationService.restore_student(pk, tenant_id, user_id)
        serializer = StudentSerializer(student)
        return StandardResponse(serializer.data, message="تم استعادة ملف الطالب بنجاح.")

    @action(detail=True, methods=['get'], url_path='timeline')
    def timeline(self, request, pk=None):
        """عرض الخط الزمني للأنشطة والعمليات على الطالب"""
        student = self.get_object()
        
        # جمع التاريخ والعمليات وعرضها كخط زمني مرتب تنازلياً
        timeline_events = []
        
        # 1. تاريخ الحالات
        for sh in student.status_history.all().order_by('-changed_at'):
            timeline_events.append({
                'type': 'status_change',
                'title': f"تغيير الحالة إلى {sh.to_status}",
                'date': sh.changed_at,
                'user': str(sh.changed_by),
                'comments': sh.comments
            })
            
        # 2. تاريخ الترفيع
        for ph in student.promotion_history.all().order_by('-promoted_at'):
            timeline_events.append({
                'type': 'promotion',
                'title': "ترفيع أكاديمي",
                'date': ph.promoted_at,
                'user': str(ph.promoted_by),
                'comments': f"من صف {ph.from_grade_id} إلى {ph.to_grade_id}"
            })
            
        # 3. المرفقات
        for att in student.attachments.all().order_by('-created_at'):
            timeline_events.append({
                'type': 'document_upload',
                'title': f"رفع وثيقة: {att.get_attachment_type_display()}",
                'date': att.created_at,
                'user': str(att.created_by),
                'comments': att.file_name
            })
            
        # ترتيب الأحداث تنازلياً
        timeline_events.sort(key=lambda x: x['date'], reverse=True)
        return StandardResponse(timeline_events, message="تم جلب الخط الزمني للطالب بنجاح.")

    @action(detail=False, methods=['get'], url_path='dashboard-widgets')
    def dashboard_widgets(self, request):
        """لوحة التحكم ومؤشرات الأداء للطلاب"""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        
        students = Student.objects.filter(deleted_at__isnull=True)
        if tenant_id:
            students = students.filter(tenant_id=tenant_id)
            
        total_students = students.count()
        active_students = students.filter(status='active').count()
        suspended_students = students.filter(status='suspended').count()
        withdrawn_students = students.filter(status='withdrawn').count()
        graduated_students = students.filter(status='graduated').count()
        
        male_count = students.filter(profile__gender='male').count()
        female_count = students.filter(profile__gender='female').count()
        
        widgets = {
            'totalStudents': total_students,
            'activeStudents': active_students,
            'suspendedStudents': suspended_students,
            'withdrawnStudents': withdrawn_students,
            'graduatedStudents': graduated_students,
            'genderDistribution': {
                'male': male_count,
                'female': female_count
            }
        }
        return StandardResponse(widgets, message="تم جلب مؤشرات لوحة التحكم بنجاح.")

    @action(detail=False, methods=['post'], url_path='bulk-import')
    def bulk_import(self, request):
        """استيراد جماعي للطلاب من ملف CSV"""
        file = request.FILES.get('file')
        if not file:
            raise ValidationError("يجب إرفاق ملف CSV للاستيراد.")
            
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else uuid.uuid4()
        user_id = request.user.id if request.user else uuid.uuid4()
        
        csv_file = io.TextIOWrapper(file.file, encoding='utf-8')
        reader = csv.DictReader(csv_file)
        
        created_count = 0
        errors = []
        
        for idx, row in enumerate(reader):
            try:
                # محاكاة الاستيراد البسيط
                arabic_name = row.get('arabic_name')
                gender = row.get('gender', 'male')
                date_of_birth = row.get('date_of_birth', '2015-01-01')
                nationality = row.get('nationality', 'سعودي')
                
                # توليد رقم طالب
                student_number = StudentNumberGenerator.generate(
                    tenant_id=tenant_id,
                    branch_code="BR",
                    academic_year_code="2026",
                    sequence_num=Student.objects.filter(tenant_id=tenant_id).count() + 1
                )
                
                student = Student.objects.create(
                    student_number=student_number,
                    status='registered',
                    tenant_id=tenant_id,
                    created_by=user_id
                )
                
                StudentProfile.objects.create(
                    student=student,
                    arabic_name=arabic_name,
                    gender=gender,
                    date_of_birth=date_of_birth,
                    nationality=nationality,
                    tenant_id=tenant_id,
                    created_by=user_id
                )
                
                created_count += 1
            except Exception as e:
                errors.append(f"السطر {idx + 2}: {str(e)}")
                
        return StandardResponse({
            'imported': created_count,
            'errors': errors
        }, message=f"تم استيراد {created_count} طالب بنجاح.")

    @action(detail=False, methods=['get'], url_path='bulk-export')
    def bulk_export(self, request):
        """تصدير جماعي لقائمة الطلاب بتنسيق CSV"""
        qs = self.get_queryset()
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['الرقم الأكاديمي', 'الاسم العربي', 'الجنس', 'الجنسية', 'الحالة'])
        
        for student in qs:
            profile = getattr(student, 'profile', None)
            writer.writerow([
                student.student_number,
                profile.arabic_name if profile else '',
                profile.get_gender_display() if profile else '',
                profile.nationality if profile else '',
                student.status
            ])
            
        response = Response(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="students_export.csv"'
        return response

    @action(detail=True, methods=['post'], url_path='activate-guardian')
    def activate_guardian(self, request, pk=None):
        """تفعيل حساب ولي أمر الطالب"""
        student = self.get_object()
        relation_id = request.data.get('relation_id')
        if not relation_id:
            raise ValidationError("يجب توفير معرف ولي الأمر relation_id.")
            
        try:
            relation = student.family_relations.get(id=relation_id)
        except StudentFamilyRelation.DoesNotExist:
            raise ValidationError("ولي الأمر غير مرتبط بهذا الطالب.")
            
        if not relation.email:
            raise ValidationError("يجب توفير البريد الإلكتروني لولي الأمر لتفعيل حسابه.")

        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else student.tenant_id
        user_id = request.user.id if request.user else None
        
        # 1. البحث عن المستخدم أو إنشاؤه
        user, created = User.objects.get_or_create(
            email=relation.email,
            defaults={
                'username': relation.email.split('@')[0] + '_' + str(uuid.uuid4())[:4],
                'first_name': relation.full_name,
                'last_name': 'ولي أمر',
                'phone': relation.phone,
                'national_id': relation.national_id,
                'status': 'active',
                'is_active': True,
            }
        )
        
        if created:
            user.set_password('Parent@123456')
            user.save()
            
        # 2. إنشاء PortalUser
        from apps.portal.domain.models import PortalUser, PortalProfile, ParentProfile
        
        portal_user, pu_created = PortalUser.objects.get_or_create(
            user=user,
            defaults={
                'user_type': 'parent',
                'tenant_id': tenant_id,
                'created_by': user_id
            }
        )
        
        # 3. إنشاء أو تحديث PortalProfile
        portal_profile, pp_created = PortalProfile.objects.get_or_create(
            portal_user=portal_user,
            defaults={
                'display_name_ar': relation.full_name,
                'phone_number': relation.phone,
                'email': relation.email,
                'tenant_id': tenant_id,
                'created_by': user_id
            }
        )
        
        # 4. إنشاء أو تحديث ParentProfile
        parent_profile, pr_created = ParentProfile.objects.get_or_create(
            portal_profile=portal_profile,
            defaults={
                'national_id': relation.national_id or '',
                'occupation': relation.occupation or '',
                'employer': relation.employer or '',
                'linked_students': [str(student.id)],
                'tenant_id': tenant_id,
                'created_by': user_id
            }
        )
        
        if not pr_created:
            students_list = parent_profile.linked_students or []
            if str(student.id) not in [str(sid) for sid in students_list]:
                students_list.append(str(student.id))
                parent_profile.linked_students = students_list
                parent_profile.save(update_fields=['linked_students'])
                
        # 5. إرسال بريد إلكتروني تفاعلي تلقائي
        # في بيئة التطوير نقوم بكتابته في السجلات أو محاكاته بنجاح
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"تم إرسال بريد إلكتروني لتفعيل حساب ولي الأمر: {user.email}. كلمة المرور: Parent@123456")
                
        return StandardResponse({
            'user_id': str(user.id),
            'email': user.email,
            'created': created,
            'portal_user_id': str(portal_user.id)
        }, message="تم تفعيل حساب ولي الأمر بنجاح. كلمة المرور الافتراضية: Parent@123456")

    @action(detail=True, methods=['post'], url_path='save-relation')
    def save_relation(self, request, pk=None):
        """إضافة أو تحديث علاقة عائلية (ولي أمر) للطالب"""
        student = self.get_object()
        relation_id = request.data.get('id')
        
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else student.tenant_id
        user_id = request.user.id if request.user else None
        
        data = {
            'relationship': request.data.get('relationship'),
            'full_name': request.data.get('full_name'),
            'phone': request.data.get('phone'),
            'email': request.data.get('email'),
            'occupation': request.data.get('occupation', ''),
            'employer': request.data.get('employer', ''),
            'national_id': request.data.get('national_id', ''),
            'emergency_contact': request.data.get('emergency_contact', False),
        }
        
        if relation_id:
            try:
                relation = student.family_relations.get(id=relation_id)
                for attr, val in data.items():
                    setattr(relation, attr, val)
                relation.save()
            except StudentFamilyRelation.DoesNotExist:
                raise ValidationError("سجل ولي الأمر غير موجود.")
        else:
            relation = StudentFamilyRelation.objects.create(
                student=student,
                tenant_id=tenant_id,
                created_by=user_id,
                **data
            )
            
        serializer = StudentFamilyRelationSerializer(relation)
        return StandardResponse(serializer.data, message="تم حفظ بيانات ولي الأمر بنجاح.")

    @action(detail=True, methods=['post'], url_path='delete-relation')
    def delete_relation(self, request, pk=None):
        """حذف علاقة عائلية لولي الأمر"""
        student = self.get_object()
        relation_id = request.data.get('relation_id')
        if not relation_id:
            raise ValidationError("يجب توفير relation_id.")
            
        try:
            relation = student.family_relations.get(id=relation_id)
            relation.delete()
            return StandardResponse(None, message="تم حذف ولي الأمر بنجاح.")
        except StudentFamilyRelation.DoesNotExist:
            raise ValidationError("السجل غير موجود أو غير مرتبط بهذا الطالب.")