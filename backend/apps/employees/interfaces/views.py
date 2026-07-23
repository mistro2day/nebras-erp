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

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'advances', 'create_advance', 'all_advances']:
            return []
        return super().get_permissions()

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
        
        if not amount:
            return StandardResponse(status_code=400, message="يرجى إدخال مبلغ السلفية.")
            
        advance = EmployeeAdvance.objects.create(
            tenant_id=employee.tenant_id,
            employee=employee,
            amount=amount,
            reason=reason
        )
        return StandardResponse(EmployeeAdvanceSerializer(advance).data, message="تم تقييم واعتماد طلب السلفية المالية بنجاح.")

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

class EmployeeDependentViewSet(BaseCRUDViewSet):
    model_class = EmployeeDependent
    serializer_class = EmployeeDependentSerializer