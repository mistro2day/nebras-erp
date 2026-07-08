from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from django.db import transaction
from apps.admissions.domain.models import (
    Applicant, Guardian, RequiredDocument, Interview, PlacementTest, AdmissionSettings,
)
from apps.admissions.interfaces.serializers import (
    ApplicantSerializer, GuardianSerializer, RequiredDocumentSerializer,
    InterviewSerializer, PlacementTestSerializer, AdmissionSettingsSerializer,
)
from apps.common.responses import StandardResponse, StandardPagination
import random

def _get_admission_settings(tenant_id):
    """يرجع سجل إعدادات القبول للمستأجر (ينشئه معطّلاً إن لم يوجد)."""
    obj = AdmissionSettings.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True).first()
    if obj is None:
        obj = AdmissionSettings.objects.create(tenant_id=tenant_id, is_open=False)
    return obj


class AdmissionsBaseViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]

    def get_queryset(self):
        return self.model_class.objects.filter(deleted_at__isnull=True)

    def perform_create(self, serializer):
        tenant_id = self.request.tenant.id if hasattr(self.request, 'tenant') and self.request.tenant else None
        serializer.save(tenant_id=tenant_id)


class ApplicantViewSet(AdmissionsBaseViewSet):
    model_class = Applicant
    queryset = Applicant.objects.all()
    serializer_class = ApplicantSerializer
    search_fields = ['arabic_full_name', 'english_full_name', 'national_id', 'application_number']

    def perform_create(self, serializer):
        # توليد رقم الطلب تلقائياً
        app_num = f"APP-{random.randint(100000, 999999)}"
        tenant_id = self.request.tenant.id if hasattr(self.request, 'tenant') and self.request.tenant else None
        serializer.save(tenant_id=tenant_id, application_number=app_num)

    # ==========================================================
    # نقاط النهاية العامة (بوابة التسجيل الإلكتروني — بدون مصادقة)
    # المستأجر يُحل عبر النطاق الفرعي أو ترويسة X-Tenant-ID (TenantMiddleware).
    # ==========================================================

    @action(detail=False, methods=['get'], permission_classes=[AllowAny], url_path='public-config')
    def public_config(self, request):
        """
        يزوّد بوابة التسجيل العامة بحالة فتح التسجيل وشروطه والسنوات والصفوف المتاحة.
        السنة والصفوف تُقيَّد بما حدده مدير النظام في إعدادات القبول عند الفتح.
        """
        from apps.academics.domain.models import AcademicYear, Grade
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return Response(
                {'success': False, 'message': 'تعذّر تحديد المدرسة (المستأجر).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        settings_obj = _get_admission_settings(tenant.id)

        years_qs = AcademicYear.objects.filter(
            tenant_id=tenant.id, deleted_at__isnull=True,
        ).exclude(status='archived').order_by('-current_flag', '-start_date')
        # عند تحديد سنة دراسية في الإعدادات نقصر الخيار عليها
        if settings_obj.academic_year_id:
            years_qs = years_qs.filter(id=settings_obj.academic_year_id)

        grades_qs = Grade.objects.filter(tenant_id=tenant.id, deleted_at__isnull=True).order_by('order')
        allowed = [str(g) for g in (settings_obj.allowed_grade_ids or [])]
        if allowed:
            grades_qs = grades_qs.filter(id__in=allowed)

        return Response({
            'success': True,
            'data': {
                'tenant_name': getattr(tenant, 'name', ''),
                'is_open': settings_obj.is_open,
                'terms': settings_obj.terms or '',
                'required_documents': settings_obj.required_documents or [],
                'closed_message': settings_obj.closed_message or '',
                'application_fee': str(settings_obj.application_fee or 0),
                'registration_start': settings_obj.registration_start,
                'registration_end': settings_obj.registration_end,
                'contact_phone': settings_obj.contact_phone or '',
                'contact_email': settings_obj.contact_email or '',
                'academic_years': [
                    {'id': str(y.id), 'name': y.name, 'code': y.code, 'current': y.current_flag}
                    for y in years_qs
                ],
                'grades': [{'id': str(g.id), 'name': g.name, 'code': g.code} for g in grades_qs],
            },
        })

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], url_path='public-apply')
    def public_apply(self, request):
        """
        استقبال طلب التحاق عام: بيانات المتقدم + ولي أمر واحد، في معاملة واحدة.
        يولّد رقم الطلب ويعيد حالة الطلب لتتبّعه لاحقاً.
        """
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return Response(
                {'success': False, 'message': 'تعذّر تحديد المدرسة (المستأجر).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # بوابة القبول: يُرفض التقديم عند إغلاق باب التسجيل من مدير النظام.
        settings_obj = _get_admission_settings(tenant.id)
        if not settings_obj.is_open:
            return Response(
                {'success': False, 'message': settings_obj.closed_message or 'باب التسجيل مغلق حاليًا.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        payload = request.data or {}
        applicant_data = payload.get('applicant', {})
        guardian_data = payload.get('guardian', {})

        required = ['arabic_full_name', 'gender', 'date_of_birth', 'nationality',
                    'national_id', 'academic_year_id', 'applying_grade_id']
        missing = [f for f in required if not applicant_data.get(f)]
        if missing:
            return Response(
                {'success': False, 'message': f"حقول مطلوبة ناقصة: {', '.join(missing)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_applicant = {
            'arabic_full_name', 'english_full_name', 'gender', 'date_of_birth', 'nationality',
            'national_id', 'passport_number', 'religion', 'blood_group', 'special_needs',
            'previous_school', 'previous_grade', 'academic_year_id', 'applying_grade_id',
            'applying_section_id', 'notes',
        }
        clean_applicant = {k: v for k, v in applicant_data.items() if k in allowed_applicant and v not in (None, '')}

        try:
            with transaction.atomic():
                applicant = Applicant.objects.create(
                    tenant_id=tenant.id,
                    application_number=f"APP-{random.randint(100000, 999999)}",
                    status='submitted',
                    **clean_applicant,
                )
                if guardian_data.get('full_name'):
                    allowed_guardian = {
                        'relationship', 'full_name', 'phone', 'email', 'occupation',
                        'employer', 'national_id', 'address',
                    }
                    clean_guardian = {k: v for k, v in guardian_data.items() if k in allowed_guardian and v is not None}
                    clean_guardian.setdefault('relationship', 'guardian')
                    clean_guardian.setdefault('phone', '')
                    clean_guardian.setdefault('email', '')
                    clean_guardian.setdefault('national_id', '')
                    clean_guardian.setdefault('address', '')
                    Guardian.objects.create(
                        tenant_id=tenant.id, applicant=applicant,
                        financial_responsibility=True, legal_guardian=True,
                        **clean_guardian,
                    )
        except Exception as exc:  # pragma: no cover - يُعاد الخطأ للمستخدم
            return Response(
                {'success': False, 'message': f'تعذّر حفظ الطلب: {exc}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({
            'success': True,
            'message': 'تم استلام طلب الالتحاق بنجاح.',
            'data': {
                'id': str(applicant.id),
                'application_number': applicant.application_number,
                'status': applicant.status,
            },
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny], url_path='public-track')
    def public_track(self, request):
        """تتبّع حالة طلب الالتحاق برقم الطلب (بيانات محدودة غير حساسة)."""
        tenant = getattr(request, 'tenant', None)
        app_num = request.query_params.get('application_number', '').strip()
        if not tenant or not app_num:
            return Response(
                {'success': False, 'message': 'رقم الطلب مطلوب.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            applicant = Applicant.objects.get(
                tenant_id=tenant.id, application_number=app_num, deleted_at__isnull=True,
            )
        except Applicant.DoesNotExist:
            return Response(
                {'success': False, 'message': 'لا يوجد طلب بهذا الرقم.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({
            'success': True,
            'data': {
                'application_number': applicant.application_number,
                'arabic_full_name': applicant.arabic_full_name,
                'status': applicant.status,
            },
        })


class GuardianViewSet(AdmissionsBaseViewSet):
    model_class = Guardian
    queryset = Guardian.objects.all()
    serializer_class = GuardianSerializer
    search_fields = ['full_name', 'phone', 'national_id']


class RequiredDocumentViewSet(AdmissionsBaseViewSet):
    model_class = RequiredDocument
    queryset = RequiredDocument.objects.all()
    serializer_class = RequiredDocumentSerializer
    search_fields = ['document_name']


class InterviewViewSet(AdmissionsBaseViewSet):
    model_class = Interview
    queryset = Interview.objects.all()
    serializer_class = InterviewSerializer


class PlacementTestViewSet(AdmissionsBaseViewSet):
    model_class = PlacementTest
    queryset = PlacementTest.objects.all()
    serializer_class = PlacementTestSerializer


class AdmissionSettingsViewSet(viewsets.ViewSet):
    """
    إعدادات فتح/إغلاق باب القبول (سجل مفرد لكل مستأجر) — لمدير النظام فقط.
    GET  admissions/settings/        → يرجع الإعدادات الحالية.
    PUT  admissions/settings/save/   → يحدّث الإعدادات (فتح/إغلاق + الشروط + السنة…).
    """
    permission_classes = [permissions.IsAuthenticated]

    def _tenant_id(self, request):
        return request.tenant.id if getattr(request, 'tenant', None) else None

    def list(self, request):
        tenant_id = self._tenant_id(request)
        if not tenant_id:
            return StandardResponse(data=None, message='تعذّر تحديد المستأجر.', success=False,
                                    status=status.HTTP_400_BAD_REQUEST)
        obj = _get_admission_settings(tenant_id)
        return StandardResponse(data=AdmissionSettingsSerializer(obj).data)

    @action(detail=False, methods=['put', 'patch', 'post'], url_path='save')
    def save_settings(self, request):
        tenant_id = self._tenant_id(request)
        if not tenant_id:
            return StandardResponse(data=None, message='تعذّر تحديد المستأجر.', success=False,
                                    status=status.HTTP_400_BAD_REQUEST)
        obj = _get_admission_settings(tenant_id)
        serializer = AdmissionSettingsSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return StandardResponse(data=serializer.data, message='تم حفظ إعدادات القبول.')