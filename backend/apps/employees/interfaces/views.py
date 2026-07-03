from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from apps.common.responses import StandardResponse
from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.employees.domain.models import Employee, EmployeeProfile, EmployeeStatusHistory
from apps.employees.interfaces.serializers import EmployeeSerializer, EmployeeProfileSerializer, EmployeeStatusHistorySerializer

class EmployeeViewSet(BaseCRUDViewSet):
    model_class = Employee
    serializer_class = EmployeeSerializer

    @action(detail=True, methods=['post'], url_path='promote')
    def promote(self, request, pk=None):
        instance = self.get_object()
        new_position = request.data.get('new_position')
        instance.position = new_position
        instance.save()
        return StandardResponse(self.get_serializer(instance).data, message="تمت ترقية الموظف بنجاح.")

class EmployeeProfileViewSet(BaseCRUDViewSet):
    model_class = EmployeeProfile
    serializer_class = EmployeeProfileSerializer

class EmployeeStatusHistoryViewSet(BaseCRUDViewSet):
    model_class = EmployeeStatusHistory
    serializer_class = EmployeeStatusHistorySerializer