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