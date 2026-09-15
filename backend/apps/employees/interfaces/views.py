from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from apps.common.responses import StandardResponse
from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.employees.domain.models import (
    Employee, 
    EmployeeProfile, 
    EmployeeStatusHistory,
    EmployeeAdvance,
    EmployeeDependent
)
from apps.employees.interfaces.serializers import (
    EmployeeSerializer, 
    EmployeeProfileSerializer, 
    EmployeeStatusHistorySerializer,
    EmployeeAdvanceSerializer,
    EmployeeDependentSerializer
)

class EmployeeViewSet(BaseCRUDViewSet):
    model_class = Employee
    serializer_class = EmployeeSerializer
    ordering_fields = '__all__'
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        # التحقق من حدّ الموظفين في خطة اشتراك المستأجر
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        from apps.saas_billing.application.limits import ensure_can_add, PlanLimitExceeded
        from rest_framework.exceptions import ValidationError as DRFValidationError
        try:
            ensure_can_add(tenant_id, 'staff')
        except PlanLimitExceeded as exc:
            raise DRFValidationError({'detail': str(exc)})
        return super().create(request, *args, **kwargs)

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'advances', 'create_advance', 'all_advances', 'download_template', 'validate_import', 'bulk_import', 'purge_mock_data']:
            return []
        return super().get_permissions()

    def _get_request_tenant_id(self, request):
        if hasattr(request, 'tenant') and request.tenant and hasattr(request.tenant, 'id'):
            return request.tenant.id
        if hasattr(request, 'tenant_id') and request.tenant_id:
            return request.tenant_id
        if request.user and getattr(request.user, 'tenant_id', None):
            return request.user.tenant_id
        if request.user and request.user.is_authenticated:
            from apps.identity.domain.rbac import UserRole
            ur = UserRole.objects.filter(user=request.user).first()
            if ur and ur.tenant_id:
                return ur.tenant_id
        from apps.tenants.domain.models import Tenant
        active = list(Tenant.objects.filter(is_active=True)[:2])
        if len(active) == 1:
            return active[0].id
        import uuid
        return uuid.uuid4()

    @action(detail=False, methods=['get'], url_path='download-template')
    def download_template(self, request):
        """تنزيل نموذج إكسل (.xlsx) الرسمي لكشوفات المعلمين والموظفين وعقود 2026م"""
        from django.http import HttpResponse
        from apps.employees.application.bulk_import import EmployeeBulkImportService

        tenant_id = self._get_request_tenant_id(request)
        template_stream = EmployeeBulkImportService.generate_excel_template(tenant_id=tenant_id)

        response = HttpResponse(
            template_stream.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="employee_roster_template_2026.xlsx"'
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return response

    @action(detail=False, methods=['post'], url_path='validate-import')
    def validate_import(self, request):
        """معاينة وفحص ملف كشف الموظفين بالذاكرة واكتشاف خلايا الهيدر والمطابقة والتدقيق"""
        import json
        from apps.employees.application.bulk_import import EmployeeBulkImportService

        file = request.FILES.get('file')
        if not file:
            return StandardResponse(None, message="يجب إرفاق ملف إكسل أو CSV للمعالجة.", status_code=400)

        custom_mapping_raw = request.data.get('header_mapping')
        custom_mapping = None
        if custom_mapping_raw:
            try:
                custom_mapping = json.loads(custom_mapping_raw) if isinstance(custom_mapping_raw, str) else custom_mapping_raw
            except Exception:
                pass

        tenant_id = self._get_request_tenant_id(request)
        preview_report = EmployeeBulkImportService.validate_and_preview(
            file,
            tenant_id=tenant_id,
            custom_mapping=custom_mapping
        )
        return StandardResponse(preview_report, message="تم فحص كشف المعلمين والموظفين بنجاح.")

    @action(detail=False, methods=['post'], url_path='bulk-import')
    def bulk_import(self, request):
        """استيراد جماعي للموظفين وتسكينهم وتوليد عقود 2026م مع خيار تصفير التجريبيين"""
        import json
        from apps.employees.application.bulk_import import EmployeeBulkImportService

        tenant_id = self._get_request_tenant_id(request)
        user_id = request.user.id if request.user else None

        file = request.FILES.get('file')
        confirmed_rows = request.data.get('rows')
        purge_mock = request.data.get('purge_mock_employees') in [True, 'true', '1', 1]

        if file:
            preview = EmployeeBulkImportService.validate_and_preview(file, tenant_id=tenant_id)
            valid_rows = [r['data'] for r in preview['rows'] if r['is_valid']]
            result = EmployeeBulkImportService.execute_bulk_import(
                valid_rows,
                tenant_id=tenant_id,
                purge_mock_employees=purge_mock,
                user_id=user_id
            )
        elif confirmed_rows:
            if isinstance(confirmed_rows, str):
                try:
                    confirmed_rows = json.loads(confirmed_rows)
                except Exception:
                    return StandardResponse(None, message="صيغة بيانات الأسطر غير صالحة.", status_code=400)
            result = EmployeeBulkImportService.execute_bulk_import(
                confirmed_rows,
                tenant_id=tenant_id,
                purge_mock_employees=purge_mock,
                user_id=user_id
            )
        else:
            return StandardResponse(None, message="يجب إرفاق ملف إكسل أو إرسال السجلات المعتمدة للاستيراد.", status_code=400)

        imported_count = result.get('imported_count', 0)
        return StandardResponse(result, message=f"تم استيراد واعتماد {imported_count} موظف ومعلم بنجاح.")

    @action(detail=False, methods=['post'], url_path='purge-mock-data')
    def purge_mock_data(self, request):
        """تصفير وحذف سجلات الموظفين التجريبيين الحاليين للمستأجر والبدء بسجل نظيف"""
        from apps.employees.application.bulk_import import EmployeeBulkImportService

        tenant_id = self._get_request_tenant_id(request)
        result = EmployeeBulkImportService.purge_mock_employees(tenant_id=tenant_id)
        return StandardResponse(result, message=result.get('message', 'تم تصفير الموظفين التجريبيين بنجاح.'))

    @action(detail=True, methods=['post'], url_path='promote')
    def promote(self, request, pk=None):
        instance = self.get_object()
        new_position = request.data.get('new_position')
        instance.position = new_position
        instance.save()
        return StandardResponse(self.get_serializer(instance).data, message="تمت ترقية الموظف بنجاح.")

    @action(detail=True, methods=['post'], url_path='request-advance')
    def request_advance(self, request, pk=None):
        """طلب سلفية مالية للموظف بحسب اللائحة"""
        employee = self.get_object()
        amount = request.data.get('amount')
        reason = request.data.get('reason', '')
        repayment_months = int(request.data.get('repayment_months', 2))
        
        if not amount:
            return StandardResponse(status_code=400, message="يرجى إدخال مبلغ السلفية.")
            
        advance = EmployeeAdvance.objects.create(
            tenant_id=employee.tenant_id,
            employee=employee,
            amount=amount,
            reason=reason,
            repayment_months=repayment_months,
            status='pending'
        )
        return StandardResponse(EmployeeAdvanceSerializer(advance).data, message="تم إرسال طلب السلفية المالية بنجاح وبانتظار اعتماد الإدارة.")

    @action(detail=False, methods=['get'], url_path='all-advances')
    def all_advances(self, request):
        advances = EmployeeAdvance.objects.all().order_by('-request_date')
        return StandardResponse(EmployeeAdvanceSerializer(advances, many=True).data)

    # ==========================================================
    # ربط أبناء الموظفين بالطلاب المسجّلين
    # المطابقة بالرقم الوطني لولي الأمر — تعمل أياً كان الترتيب الزمني.
    # التأكيد بشري دائماً لأن أثر الخطأ مالي (خصم رسوم).
    # ==========================================================

    @action(detail=True, methods=['get'], url_path='link-suggestions')
    def link_suggestions(self, request, pk=None):
        """
        اقتراحات ربط لهذا الموظف: طلاب مسجّلون أولياء أمرهم يحملون رقمه الوطني
        ولم يُربطوا بعد. يُرجع أيضاً التصريحات المعلّقة (بلا طالب).
        """
        from apps.employees.application import dependent_linking as linking

        employee = self.get_object()
        tenant_id = employee.tenant_id
        suggestions = [
            {
                'student_id': str(s['student_id']),
                'student_name': s['student_name'],
                'dependent_id': str(s['dependent'].id) if s['dependent'] else None,
                'declared_name': s['dependent'].full_name if s['dependent'] else None,
            }
            for s in linking.suggest_links_for_employee(tenant_id, employee)
        ]
        pending = [
            {'dependent_id': str(d.id), 'full_name': d.full_name, 'relation_type': d.relation_type}
            for d in employee.dependents.filter(student_id__isnull=True)
        ]
        return StandardResponse(
            {'suggestions': suggestions, 'pending_declarations': pending},
            message="اقتراحات الربط.",
        )

    @action(detail=True, methods=['post'], url_path='confirm-link')
    def confirm_link(self, request, pk=None):
        """
        تأكيد ربط طالب بهذا الموظف.
        البيانات: { student_id, dependent_id? , student_name?, relation_type? }
        dependent_id اختياري: إن وُجد يُستخدم التصريح القائم، وإلا يُنشأ تصريح جديد.
        """
        from apps.employees.application import dependent_linking as linking

        employee = self.get_object()
        student_id = request.data.get('student_id')
        if not student_id:
            return StandardResponse(
                None, message="معرّف الطالب مطلوب.", status=status.HTTP_400_BAD_REQUEST)

        dependent = None
        dep_id = request.data.get('dependent_id')
        if dep_id:
            dependent = employee.dependents.filter(id=dep_id).first()
            if dependent is None:
                return StandardResponse(
                    None, message="التصريح غير موجود لهذا الموظف.",
                    status=status.HTTP_400_BAD_REQUEST)

        dep = linking.confirm_link(
            tenant_id=employee.tenant_id,
            student_id=student_id,
            employee=employee,
            dependent=dependent,
            student_name=request.data.get('student_name', ''),
            relation_type=request.data.get('relation_type', 'child'),
        )
        return StandardResponse(
            EmployeeDependentSerializer(dep).data,
            message="تم ربط الطالب بملف الموظف. سيُطبَّق الخصم على فواتيره القادمة.",
        )

    @action(detail=True, methods=['post'], url_path='unlink-dependent')
    def unlink_dependent(self, request, pk=None):
        """فكّ ربط تصريح عن طالبه مع إبقاء التصريح. البيانات: { dependent_id }"""
        from apps.employees.application import dependent_linking as linking

        employee = self.get_object()
        dependent = employee.dependents.filter(id=request.data.get('dependent_id')).first()
        if dependent is None:
            return StandardResponse(
                None, message="التصريح غير موجود لهذا الموظف.",
                status=status.HTTP_400_BAD_REQUEST)

        linking.unlink(dependent)
        return StandardResponse(
            EmployeeDependentSerializer(dependent).data, message="تم فكّ الربط.")


class EmployeeProfileViewSet(BaseCRUDViewSet):
    model_class = EmployeeProfile
    serializer_class = EmployeeProfileSerializer

class EmployeeStatusHistoryViewSet(BaseCRUDViewSet):
    model_class = EmployeeStatusHistory
    serializer_class = EmployeeStatusHistorySerializer

class EmployeeAdvanceViewSet(BaseCRUDViewSet):
    model_class = EmployeeAdvance
    serializer_class = EmployeeAdvanceSerializer
    permission_classes = []
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        return qs.order_by('-request_date')

class EmployeeDependentViewSet(BaseCRUDViewSet):
    model_class = EmployeeDependent
    serializer_class = EmployeeDependentSerializer