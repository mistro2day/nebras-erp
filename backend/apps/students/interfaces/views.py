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

        # توليد فاتورة رسوم التسجيل تلقائياً (best-effort — لا يُفشل التسجيل عند نقص الإعداد المالي)
        fee_notice = None
        try:
            from apps.student_finance.application.services import BillingService
            from apps.admissions.domain.models import Applicant as _Applicant
            _app = _Applicant.objects.filter(id=uuid.UUID(applicant_id), tenant_id=tenant_id).first()
            invoice = BillingService.bill_new_student_registration(
                tenant_id=tenant_id,
                student_id=student.id,
                grade_id=getattr(_app, 'applying_grade_id', None) if _app else None,
                user_id=user_id,
            )
            if invoice is not None:
                fee_notice = f"تم توليد فاتورة رسوم التسجيل رقم {invoice.invoice_number} بمبلغ {invoice.total_amount}."
        except Exception as exc:  # نقص إعداد مالي أو غيره — يُسجّل ولا يُفشل التسجيل
            import logging
            logging.getLogger('nebras.students').warning(
                "تعذّر توليد فاتورة رسوم التسجيل للطالب %s: %s", student.id, exc)
            fee_notice = "تم التسجيل، لكن تعذّر توليد فاتورة الرسوم تلقائياً — راجع إعدادات المالية."

        serializer = StudentSerializer(student)
        message = "تم تسجيل الطالب بنجاح وتوليد الرقم المدرسي."
        if fee_notice:
            message += " " + fee_notice
        return StandardResponse(serializer.data, message=message, status=status.HTTP_201_CREATED)

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
        """لوحة التحكم ومؤشرات الأداء للطلاب — بيانات شاملة لدورة حياة الطالب."""
        from django.db.models import Count
        from django.utils import timezone

        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None

        students = Student.objects.filter(deleted_at__isnull=True)
        if tenant_id:
            students = students.filter(tenant_id=tenant_id)

        total_students = students.count()

        # توزيع دقيق حسب الحالة (دورة حياة الطالب كاملة)
        status_rows = students.values('status').annotate(n=Count('id'))
        status_breakdown = {row['status']: row['n'] for row in status_rows}

        def sc(*keys):
            return sum(status_breakdown.get(k, 0) for k in keys)

        active_students = sc('active')
        suspended_students = sc('suspended')
        withdrawn_students = sc('withdrawn', 'dismissed')
        graduated_students = sc('graduated', 'alumni')
        transferred_students = sc('transferred')
        archived_students = sc('archived')
        new_students = sc('applicant', 'accepted', 'registered', 'enrolled')

        male_count = students.filter(profile__gender='male').count()
        female_count = students.filter(profile__gender='female').count()

        # الجدد هذا الشهر
        now = timezone.now()
        new_this_month = students.filter(
            created_at__year=now.year, created_at__month=now.month
        ).count()

        # أعلى الجنسيات
        nat_rows = (
            students.values('profile__nationality')
            .annotate(n=Count('id'))
            .order_by('-n')[:5]
        )
        nationalities = [
            {'name': r['profile__nationality'] or 'غير محدد', 'count': r['n']}
            for r in nat_rows
        ]

        # التسجيلات الأكاديمية
        enrollments = StudentEnrollment.objects.filter(deleted_at__isnull=True)
        if tenant_id:
            enrollments = enrollments.filter(tenant_id=tenant_id)
        total_enrollments = enrollments.count()
        active_enrollments = enrollments.filter(status='active').count()

        # أحدث الطلاب المسجّلين
        recent_qs = students.select_related('profile').order_by('-created_at')[:6]
        recent_students = [
            {
                'id': str(s.id),
                'student_number': s.student_number,
                'name': getattr(getattr(s, 'profile', None), 'arabic_name', '') or '—',
                'gender': getattr(getattr(s, 'profile', None), 'gender', '') or '',
                'status': s.status,
                'created_at': s.created_at,
            }
            for s in recent_qs
        ]

        widgets = {
            'totalStudents': total_students,
            'activeStudents': active_students,
            'suspendedStudents': suspended_students,
            'withdrawnStudents': withdrawn_students,
            'graduatedStudents': graduated_students,
            'transferredStudents': transferred_students,
            'archivedStudents': archived_students,
            'newStudents': new_students,
            'newThisMonth': new_this_month,
            'statusBreakdown': status_breakdown,
            'genderDistribution': {
                'male': male_count,
                'female': female_count,
            },
            'nationalities': nationalities,
            'enrollments': {
                'total': total_enrollments,
                'active': active_enrollments,
            },
            'recentStudents': recent_students,
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
        
        from apps.common.security import generate_temp_password
        temp_password = generate_temp_password()
        if created:
            user.set_password(temp_password)
            user.save()

        # ربط دور ولي الأمر النظامي (صلاحيات البوابة)
        from apps.identity.domain.rbac import UserRole, ensure_system_roles
        from apps.identity.application.services import PermissionCacheService
        roles = ensure_system_roles(tenant_id, created_by=user_id)
        UserRole.objects.get_or_create(tenant_id=tenant_id, user=user, role=roles['parent'])
        PermissionCacheService.clear_user_permissions_cache(user.id, tenant_id)

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
                
        # 5. إرسال بيانات الدخول — فقط عند إنشاء حساب جديد (كلمة مرور صالحة).
        #    إذا كان الحساب موجوداً مسبقاً لا نرسل كلمة مرور وهمية.
        if created:
            from apps.communications.application.services import CommunicationService
            from apps.communications.application.provisioning import ensure_communication_defaults
            ensure_communication_defaults(tenant_id, created_by=user_id)

            variables = {
                'parent_name': relation.full_name,
                'email': user.email,
                'password': temp_password,
                'portal_url': 'https://portal.nebras.edu/login'
            }

            # إرسال البريد الإلكتروني
            try:
                CommunicationService.send_message(
                    tenant_id=tenant_id,
                    channel_code='email',
                    recipients=[{
                        'type': 'to',
                        'entity_type': 'user',
                        'entity_id': user.id,
                        'name': relation.full_name,
                        'address': user.email
                    }],
                    subject="تفعيل حساب ولي الأمر - منصة نبراس التعليمية",
                    body="مرحباً {{parent_name}}، تم تفعيل حساب ولي الأمر الخاص بك. بريدك الإلكتروني: {{email}} وكلمة المرور المؤقتة: {{password}}. يمكنك الدخول عبر الرابط: {{portal_url}}",
                    variables=variables,
                    priority='high',
                    source_module='students',
                    source_event='guardian_activated'
                )
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"فشل إرسال بريد تفعيل حساب ولي الأمر: {e}")

            # إرسال رسالة واتساب إذا توفر رقم الهاتف
            if relation.phone:
                try:
                    CommunicationService.send_message(
                        tenant_id=tenant_id,
                        channel_code='whatsapp',
                        recipients=[{
                            'type': 'to',
                            'entity_type': 'user',
                            'entity_id': user.id,
                            'name': relation.full_name,
                            'address': relation.phone
                        }],
                        body="مرحباً بك يا {{parent_name}} في منصة نبراس. تم تفعيل حسابك. اسم المستخدم: {{email}} وكلمة المرور: {{password}}. رابط المنصة: {{portal_url}}",
                        variables=variables,
                        priority='high',
                        source_module='students',
                        source_event='guardian_activated'
                    )
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"فشل إرسال واتساب تفعيل حساب ولي الأمر: {e}")

        message = (
            "تم تفعيل حساب ولي الأمر بنجاح وإرسال بيانات الدخول عبر البريد الإلكتروني وواتساب."
            if created else
            "هذا الحساب مفعّل مسبقاً لولي الأمر، وتم ربطه بالطالب. لم تُرسَل بيانات دخول جديدة."
        )
        return StandardResponse({
            'user_id': str(user.id),
            'email': user.email,
            'created': created,
            'already_active': not created,
            'portal_user_id': str(portal_user.id)
        }, message=message)

    @action(detail=True, methods=['post'], url_path='reset-guardian-password')
    def reset_guardian_password(self, request, pk=None):
        """إعادة تعيين كلمة مرور حساب ولي الأمر وإرسال بيانات الدخول الجديدة.

        تُستخدم لإعادة إرسال بيانات الدخول من قبل الإدارة (كلمة مرور جديدة، إذ
        لا يمكن استرجاع الكلمة الحالية المشفّرة). يشترط وجود حساب مفعّل مسبقاً.
        """
        student = self.get_object()
        relation_id = request.data.get('relation_id')
        if not relation_id:
            raise ValidationError("يجب توفير معرف ولي الأمر relation_id.")

        try:
            relation = student.family_relations.get(id=relation_id)
        except StudentFamilyRelation.DoesNotExist:
            raise ValidationError("ولي الأمر غير مرتبط بهذا الطالب.")
        if not relation.email:
            raise ValidationError("لا يوجد بريد إلكتروني لولي الأمر.")

        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.filter(email=relation.email).first()
        if not user:
            raise ValidationError("لا يوجد حساب مفعّل لولي الأمر. يرجى تفعيل الحساب أولاً.")

        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else student.tenant_id
        user_id = request.user.id if request.user else None

        from apps.common.security import generate_temp_password
        temp_password = generate_temp_password()
        user.set_password(temp_password)
        user.save(update_fields=['password'])

        from apps.communications.application.services import CommunicationService
        from apps.communications.application.provisioning import ensure_communication_defaults
        ensure_communication_defaults(tenant_id, created_by=user_id)

        variables = {
            'parent_name': relation.full_name,
            'email': user.email,
            'password': temp_password,
            'portal_url': 'https://portal.nebras.edu/login'
        }
        try:
            CommunicationService.send_message(
                tenant_id=tenant_id, channel_code='email',
                recipients=[{'type': 'to', 'entity_type': 'user', 'entity_id': user.id,
                             'name': relation.full_name, 'address': user.email}],
                subject="بيانات الدخول الجديدة - منصة نبراس التعليمية",
                body="مرحباً {{parent_name}}، تم إعادة تعيين كلمة مرور حسابك. بريدك الإلكتروني: {{email}} وكلمة المرور الجديدة: {{password}}. يمكنك الدخول عبر الرابط: {{portal_url}}",
                variables=variables, priority='high',
                source_module='students', source_event='guardian_password_reset',
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"فشل إرسال بريد إعادة تعيين كلمة مرور ولي الأمر: {e}")

        if relation.phone:
            try:
                CommunicationService.send_message(
                    tenant_id=tenant_id, channel_code='whatsapp',
                    recipients=[{'type': 'to', 'entity_type': 'user', 'entity_id': user.id,
                                 'name': relation.full_name, 'address': relation.phone}],
                    body="مرحباً {{parent_name}}، تم إعادة تعيين كلمة مرور حسابك في منصة نبراس. اسم المستخدم: {{email}} وكلمة المرور الجديدة: {{password}}. رابط المنصة: {{portal_url}}",
                    variables=variables, priority='high',
                    source_module='students', source_event='guardian_password_reset',
                )
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"فشل إرسال واتساب إعادة تعيين كلمة مرور ولي الأمر: {e}")

        return StandardResponse({
            'user_id': str(user.id),
            'email': user.email,
        }, message="تم إعادة تعيين كلمة المرور وإرسال بيانات الدخول الجديدة عبر البريد وواتساب.")

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

    @action(detail=True, methods=['post'], url_path='activate-student')
    def activate_student(self, request, pk=None):
        """تفعيل حساب بوابة الطالب وإرسال بيانات الدخول"""
        student = self.get_object()
        profile = getattr(student, 'profile', None)
        if not profile:
            raise ValidationError("لا يمكن تفعيل حساب لطالب ليس لديه ملف شخصي.")

        # استخراج البريد الإلكتروني الافتراضي للطالب (أو لولي أمره إذا لم يتوفر لديه بريد)
        email = f"std_{student.student_number.lower().replace('-', '_')}@nebras.edu"
        phone = None
        
        # البحث عن هاتف أو بريد في جهات الاتصال أو ولي الأمر
        for rel in student.family_relations.all():
            if rel.relationship == 'father' or rel.relationship == 'guardian':
                if rel.email:
                    email = rel.email
                if rel.phone:
                    phone = rel.phone
                break

        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else student.tenant_id
        user_id = request.user.id if request.user else None
        
        # 1. البحث عن مستخدم الطالب أو إنشاؤه
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': f"std_{student.student_number.lower().replace('-', '_')}",
                'first_name': profile.arabic_name.split(' ')[0],
                'last_name': profile.arabic_name.split(' ')[-1] if ' ' in profile.arabic_name else 'طالب',
                'phone': phone or '',
                'national_id': profile.national_id or '',
                'status': 'active',
                'is_active': True,
            }
        )
        
        from apps.common.security import generate_temp_password
        temp_password = generate_temp_password()
        if created:
            user.set_password(temp_password)
            user.save()

        # ربط دور الطالب النظامي (صلاحيات البوابة)
        from apps.identity.domain.rbac import UserRole, ensure_system_roles
        from apps.identity.application.services import PermissionCacheService
        roles = ensure_system_roles(tenant_id, created_by=user_id)
        UserRole.objects.get_or_create(tenant_id=tenant_id, user=user, role=roles['student'])
        PermissionCacheService.clear_user_permissions_cache(user.id, tenant_id)

        # 2. إنشاء PortalUser
        from apps.portal.domain.models import PortalUser, PortalProfile, StudentProfile as PortalStudentProfile
        
        portal_user, pu_created = PortalUser.objects.get_or_create(
            user=user,
            defaults={
                'user_type': 'student',
                'tenant_id': tenant_id,
                'created_by': user_id
            }
        )
        
        # 3. إنشاء أو تحديث PortalProfile
        portal_profile, pp_created = PortalProfile.objects.get_or_create(
            portal_user=portal_user,
            defaults={
                'display_name_ar': profile.arabic_name,
                'phone_number': phone or '',
                'email': email,
                'tenant_id': tenant_id,
                'created_by': user_id
            }
        )
        
        # 4. إنشاء أو تحديث StudentProfile بالبوابة
        enrollment = student.enrollments.filter(status='active').first()
        grade_level = 'الصف العاشر'
        if enrollment and hasattr(enrollment, 'grade') and enrollment.grade:
            grade_level = enrollment.grade.name
            
        student_profile, pr_created = PortalStudentProfile.objects.get_or_create(
            portal_profile=portal_profile,
            defaults={
                'student_id': student.id,
                'student_number': student.student_number,
                'academic_year': '2026',
                'grade_level': grade_level,
                'tenant_id': tenant_id,
                'created_by': user_id
            }
        )

        # 5. إرسال بيانات الدخول — فقط عند إنشاء حساب جديد (كلمة مرور صالحة).
        if created:
            from apps.communications.application.services import CommunicationService
            from apps.communications.application.provisioning import ensure_communication_defaults
            ensure_communication_defaults(tenant_id, created_by=user_id)

            variables = {
                'student_name': profile.arabic_name,
                'email': user.email,
                'password': temp_password,
                'portal_url': 'https://portal.nebras.edu/login'
            }

            try:
                CommunicationService.send_message(
                    tenant_id=tenant_id,
                    channel_code='email',
                    recipients=[{
                        'type': 'to',
                        'entity_type': 'user',
                        'entity_id': user.id,
                        'name': profile.arabic_name,
                        'address': user.email
                    }],
                    subject="تفعيل حساب الطالب - منصة نبراس التعليمية",
                    body="مرحباً {{student_name}}، تم تفعيل حساب البوابة الطلابية الخاص بك. بريدك الإلكتروني: {{email}} وكلمة المرور المؤقتة: {{password}}. يمكنك الدخول عبر الرابط: {{portal_url}}",
                    variables=variables,
                    priority='high',
                    source_module='students',
                    source_event='student_activated'
                )
            except Exception:
                pass

            if phone:
                try:
                    CommunicationService.send_message(
                        tenant_id=tenant_id,
                        channel_code='whatsapp',
                        recipients=[{
                            'type': 'to',
                            'entity_type': 'user',
                            'entity_id': user.id,
                            'name': profile.arabic_name,
                            'address': phone
                        }],
                        body="مرحباً بك يا {{student_name}} في منصة نبراس. تم تفعيل حساب الطالب الخاص بك. اسم المستخدم: {{email}} وكلمة المرور: {{password}}. رابط المنصة: {{portal_url}}",
                        variables=variables,
                        priority='high',
                        source_module='students',
                        source_event='student_activated'
                    )
                except Exception:
                    pass

        message = (
            "تم تفعيل حساب الطالب بنجاح وإرسال تفاصيل الدخول عبر البريد الإلكتروني وواتساب."
            if created else
            "هذا الطالب لديه حساب بوابة مفعّل مسبقاً. لم تُرسَل بيانات دخول جديدة."
        )
        return StandardResponse({
            'user_id': str(user.id),
            'email': user.email,
            'created': created,
            'already_active': not created,
            'portal_user_id': str(portal_user.id)
        }, message=message)

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