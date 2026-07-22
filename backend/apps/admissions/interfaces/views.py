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
import uuid
from datetime import date

def _get_admission_settings(tenant_id):
    """يرجع سجل إعدادات القبول للمستأجر (ينشئه معطّلاً إن لم يوجد)."""
    obj = AdmissionSettings.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True).first()
    if obj is None:
        obj = AdmissionSettings.objects.create(tenant_id=tenant_id, is_open=False)
    return obj


# الحالات التي تشغل مقعدًا فعليًا في الصف (تُستثنى المسودة والمرفوض).
_SEAT_TAKING_STATUSES = ('submitted', 'under_review', 'interview_scheduled', 'accepted', 'enrolled')

# مواد امتحان القدرات الافتراضية حين لا يعرّف المستأجر مواده الخاصة.
_DEFAULT_APTITUDE_SUBJECTS = [
    {'name': 'اللغة العربية', 'max': 100, 'pass': 75},
    {'name': 'اللغة الإنجليزية', 'max': 100, 'pass': 75},
    {'name': 'الرياضيات', 'max': 100, 'pass': 75},
    {'name': 'الكيمياء', 'max': 100, 'pass': 75},
]


def _aptitude_subjects(settings_obj):
    """مواد القدرات المُعرّفة للمستأجر، أو الافتراضية إن لم تُعرّف."""
    subjects = list(getattr(settings_obj, 'aptitude_subjects', []) or []) if settings_obj else []
    return subjects if subjects else _DEFAULT_APTITUDE_SUBJECTS


def _grade_taken_count(tenant_id, grade_id, academic_year_id=None):
    """عدد الطلبات التي تشغل مقاعد في صف معيّن (اختياريًا ضمن سنة دراسية)."""
    qs = Applicant.objects.filter(
        tenant_id=tenant_id, deleted_at__isnull=True,
        applying_grade_id=grade_id, status__in=_SEAT_TAKING_STATUSES,
    )
    if academic_year_id:
        qs = qs.filter(academic_year_id=academic_year_id)
    return qs.count()


def _grade_seat_info(settings_obj, tenant_id, grade_id, academic_year_id=None):
    """معلومات مقاعد صف: السعة، المشغول، المتبقّي، والاكتمال."""
    seats = int((settings_obj.grade_seats or {}).get(str(grade_id), 0) or 0)
    taken = _grade_taken_count(tenant_id, grade_id, academic_year_id)
    remaining = max(0, seats - taken) if seats > 0 else None
    is_full = bool(settings_obj.auto_close_when_full and seats > 0 and taken >= seats)
    return {'seats': seats, 'taken': taken, 'remaining': remaining, 'is_full': is_full}


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

    def get_queryset(self):
        qs = super().get_queryset()
        # فلترة حسب الحالة: ?status=accepted أو قائمة مفصولة بفواصل ?status=accepted,enrolled
        status_param = self.request.query_params.get('status')
        if status_param:
            statuses = [s.strip() for s in status_param.split(',') if s.strip()]
            if statuses:
                qs = qs.filter(status__in=statuses)
        return qs

    def perform_create(self, serializer):
        # توليد رقم الطلب تلقائياً
        app_num = f"APP-{random.randint(100000, 999999)}"
        tenant_id = self.request.tenant.id if hasattr(self.request, 'tenant') and self.request.tenant else None
        serializer.save(tenant_id=tenant_id, application_number=app_num)

    @action(detail=True, methods=['patch'], url_path='set-status')
    def set_status(self, request, pk=None):
        """
        PATCH applicants/:id/set-status/ { status, reason? }
        يغيّر حالة الطالب مع تسجيل اختياري للسبب.
        """
        applicant = self.get_object()
        new_status = request.data.get('status')
        if not new_status:
            return Response({'success': False, 'message': 'الحالة مطلوبة.'},
                            status=status.HTTP_400_BAD_REQUEST)

        allowed = {'under_review', 'interview_scheduled', 'qualified_exam', 'exam_scored',
                   'accepted', 'rejected', 'waitlist', 'enrolled'}
        if new_status not in allowed:
            return Response({'success': False, 'message': f'الحالة "{new_status}" غير مسموحة.'},
                            status=status.HTTP_400_BAD_REQUEST)

        applicant.status = new_status
        applicant.save(update_fields=['status', 'updated_at'])
        return StandardResponse(data=ApplicantSerializer(applicant).data,
                                message='تم تحديث حالة الطلب.')

    @action(detail=True, methods=['post'], url_path='schedule-interview')
    def schedule_interview(self, request, pk=None):
        """
        POST applicants/:id/schedule-interview/
        ينشئ سجل مقابلة ويغيّر حالة الطالب إلى مقابلة مجدولة.
        البيانات: scheduled_at, evaluation_score (اختياري), recommendation
        interviewer_id يُملأ تلقائياً بالمستخدم الحالي إن لم يُرسل.
        """
        applicant = self.get_object()
        interviewer_id = request.data.get('interviewer_id')
        scheduled_at = request.data.get('scheduled_at')
        evaluation_score = request.data.get('evaluation_score')
        recommendation = request.data.get('recommendation', '')

        if not scheduled_at:
            return Response({'success': False, 'message': 'تاريخ المقابلة مطلوب.'},
                            status=status.HTTP_400_BAD_REQUEST)

        if not interviewer_id:
            interviewer_id = getattr(getattr(request, 'user', None), 'id', None)
        if not interviewer_id:
            return Response({'success': False, 'message': 'تعذّر تحديد المُقابل (المستخدم الحالي).'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            uuid.UUID(str(interviewer_id))
        except ValueError:
            return Response({'success': False, 'message': 'معرّف المُقابل غير صالح.'},
                            status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            Interview.objects.create(
                tenant_id=applicant.tenant_id,
                applicant=applicant,
                interviewer_id=interviewer_id,
                scheduled_at=scheduled_at,
                evaluation_score=evaluation_score,
                recommendation=recommendation,
                status='scheduled',
            )
            applicant.status = 'interview_scheduled'
            applicant.save(update_fields=['status', 'updated_at'])

        return StandardResponse(data=ApplicantSerializer(applicant).data,
                                message='تم جدولة المقابلة بنجاح.')

    @action(detail=True, methods=['post'], url_path='accept')
    def accept_applicant(self, request, pk=None):
        """قبول الطالب."""
        applicant = self.get_object()
        applicant.status = 'accepted'
        applicant.save(update_fields=['status', 'updated_at'])
        return StandardResponse(data=ApplicantSerializer(applicant).data,
                                message='تم قبول الطالب.')

    @action(detail=True, methods=['post'], url_path='reject')
    def reject_applicant(self, request, pk=None):
        """رفض الطالب."""
        applicant = self.get_object()
        applicant.status = 'rejected'
        applicant.save(update_fields=['status', 'updated_at'])
        return StandardResponse(data=ApplicantSerializer(applicant).data,
                                message='تم رفض الطالب.')

    @action(detail=True, methods=['post'], url_path='set-under-review')
    def set_under_review(self, request, pk=None):
        """إعادة الطلب إلى قيد المراجعة."""
        applicant = self.get_object()
        applicant.status = 'under_review'
        applicant.save(update_fields=['status', 'updated_at'])
        return StandardResponse(data=ApplicantSerializer(applicant).data,
                                message='تم إعادة الطلب إلى قيد المراجعة.')

    @action(detail=True, methods=['post'], url_path='set-waitlist')
    def set_waitlist(self, request, pk=None):
        """نقل الطالب إلى قائمة الانتظار."""
        applicant = self.get_object()
        applicant.status = 'waitlist'
        applicant.save(update_fields=['status', 'updated_at'])
        return StandardResponse(data=ApplicantSerializer(applicant).data,
                                message='تم نقل الطالب إلى قائمة الانتظار.')

    @action(detail=True, methods=['post'], url_path='qualify-exam')
    def qualify_exam(self, request, pk=None):
        """
        «قبول الطلب» في التدفّق الجديد: تأهيل المتقدم لدخول امتحان القدرات.
        ينشئ صفوف PlacementTest فارغة لكل مادة قدرات مُعرّفة في الإعدادات (إن لم توجد).
        """
        applicant = self.get_object()
        settings_obj = _get_admission_settings(applicant.tenant_id)
        subjects = _aptitude_subjects(settings_obj)

        with transaction.atomic():
            existing = set(
                PlacementTest.objects.filter(applicant=applicant)
                .values_list('exam_type', flat=True)
            )
            for subj in subjects:
                name = (subj or {}).get('name')
                if not name or name in existing:
                    continue
                PlacementTest.objects.create(
                    tenant_id=applicant.tenant_id,
                    applicant=applicant,
                    exam_type=name,
                    passing_marks=(subj or {}).get('pass', 50),
                    max_marks=(subj or {}).get('max', 100),
                    result_status='pending',
                )
            applicant.status = 'qualified_exam'
            applicant.save(update_fields=['status', 'updated_at'])

        return StandardResponse(data=ApplicantSerializer(applicant).data,
                                message='تم قبول الطلب — المتقدم مؤهّل لامتحان القدرات.')

    @action(detail=True, methods=['post'], url_path='record-aptitude')
    def record_aptitude(self, request, pk=None):
        """
        رصد درجات امتحان القدرات.
        البيانات: { scores: [{ subject, marks }] }
        يحدّث/ينشئ PlacementTest لكل مادة، ويحسب نجاح كل مادة مقابل عتبتها،
        ثم ينقل الحالة إلى exam_scored.
        """
        applicant = self.get_object()
        scores = request.data.get('scores') or []
        if not isinstance(scores, list) or not scores:
            return Response({'success': False, 'message': 'قائمة الدرجات مطلوبة.'},
                            status=status.HTTP_400_BAD_REQUEST)

        settings_obj = _get_admission_settings(applicant.tenant_id)
        subj_cfg = {(s or {}).get('name'): s for s in _aptitude_subjects(settings_obj)}

        with transaction.atomic():
            for row in scores:
                subject = (row or {}).get('subject')
                marks = (row or {}).get('marks')
                if not subject or marks is None:
                    continue
                cfg = subj_cfg.get(subject, {})
                pass_mark = cfg.get('pass', 50)
                max_mark = cfg.get('max', 100)
                pt, _ = PlacementTest.objects.get_or_create(
                    applicant=applicant, exam_type=subject,
                    defaults={'tenant_id': applicant.tenant_id},
                )
                pt.marks_obtained = marks
                pt.passing_marks = pass_mark
                pt.max_marks = max_mark
                pt.result_status = 'passed' if float(marks) >= float(pass_mark) else 'failed'
                pt.save()
            applicant.status = 'exam_scored'
            applicant.save(update_fields=['status', 'updated_at'])

        return StandardResponse(data=ApplicantSerializer(applicant).data,
                                message='تم رصد درجات القدرات.')

    @action(detail=True, methods=['get'], url_path='aptitude-evaluation')
    def aptitude_evaluation(self, request, pk=None):
        """
        يُرجع تقييم القبول المحسوب من الدرجات المرصودة والعتبات:
        نجاح/رسوب كل مادة، المجموع، وهل يستوفي شرط القبول النهائي.
        قرار مقترح للإدارة (لا يغيّر الحالة).
        """
        applicant = self.get_object()
        settings_obj = _get_admission_settings(applicant.tenant_id)
        total_pass = getattr(settings_obj, 'aptitude_total_pass', None) if settings_obj else None
        tests = PlacementTest.objects.filter(applicant=applicant)

        subjects, total, all_passed, any_scored = [], 0.0, True, False
        for t in tests:
            marks = float(t.marks_obtained) if t.marks_obtained is not None else None
            if marks is not None:
                any_scored = True
                total += marks
            passed = t.result_status == 'passed'
            if not passed:
                all_passed = False
            subjects.append({
                'subject': t.exam_type, 'marks': marks,
                'pass_mark': float(t.passing_marks), 'max_mark': float(t.max_marks),
                'result': t.result_status,
            })

        meets_total = (total_pass is None) or (total >= float(total_pass))
        recommend = 'accepted' if (any_scored and all_passed and meets_total) else 'rejected'
        return StandardResponse(data={
            'subjects': subjects, 'total': total,
            'total_pass': float(total_pass) if total_pass is not None else None,
            'all_subjects_passed': all_passed, 'meets_total': meets_total,
            'recommended_decision': recommend if any_scored else None,
        }, message='تقييم القبول.')

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
            return Response({
                'success': True,
                'data': {
                    'tenant_name': '',
                    'is_open': False,
                    'terms': '',
                    'required_documents': [],
                    'closed_message': '',
                    'application_fee': '0',
                    'registration_start': None,
                    'registration_end': None,
                    'contact_phone': '',
                    'contact_email': '',
                    'academic_years': [],
                    'grades': [],
                },
            })

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
                # الرسوم الدراسية المعروضة في الاستمارة (قابلة للتحكم من الإعدادات)
                'registration_fee': str(settings_obj.registration_fee or 0),
                'annual_tuition': str(settings_obj.annual_tuition or 0),
                'fee_currency': settings_obj.fee_currency or 'جنيه',
                'fee_installments': settings_obj.fee_installments or [],
                'fee_notes': settings_obj.fee_notes or [],
                'registration_start': settings_obj.registration_start,
                'registration_end': settings_obj.registration_end,
                'contact_phone': settings_obj.contact_phone or '',
                'contact_email': settings_obj.contact_email or '',
                'academic_years': [
                    {'id': str(y.id), 'name': y.name, 'code': y.code, 'current': y.current_flag}
                    for y in years_qs
                ],
                'auto_close_when_full': settings_obj.auto_close_when_full,
                'grades': [
                    {
                        'id': str(g.id), 'name': g.name, 'code': g.code,
                        **_grade_seat_info(settings_obj, tenant.id, g.id, settings_obj.academic_year_id),
                    }
                    for g in grades_qs
                ],
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

        # التحقّق من توفّر مقعد في الصف المطلوب (الإغلاق التلقائي عند الاكتمال).
        seat_info = _grade_seat_info(
            settings_obj, tenant.id,
            applicant_data.get('applying_grade_id'),
            applicant_data.get('academic_year_id'),
        )
        if seat_info['is_full']:
            return Response(
                {'success': False, 'message': 'اكتمل العدد المتاح للصف المطلوب. يمكنك اختيار صف آخر أو التقديم لاحقًا.'},
                status=status.HTTP_403_FORBIDDEN,
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
                        'relationship', 'full_name', 'phone', 'phone2', 'whatsapp_phone',
                        'email', 'occupation', 'employer', 'national_id', 'address',
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