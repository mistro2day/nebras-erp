from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from apps.common.responses import StandardResponse
from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.employees.domain.models import Employee, EmployeeProfile, EmployeeStatusHistory
from apps.employees.interfaces.serializers import EmployeeSerializer, EmployeeProfileSerializer, EmployeeStatusHistorySerializer

class EmployeeViewSet(BaseCRUDViewSet):
    model_class = Employee
    serializer_class = EmployeeSerializer

    def get_permissions(self):
        if self.action in ['list']:
            return []
        return super().get_permissions()

    @action(detail=True, methods=['post'], url_path='promote')
    def promote(self, request, pk=None):
        instance = self.get_object()
        new_position = request.data.get('new_position')
        instance.position = new_position
        instance.save()
        return StandardResponse(self.get_serializer(instance).data, message="تمت ترقية الموظف بنجاح.")

    @action(detail=True, methods=['post'], url_path='activate-account')
    def activate_user_account(self, request, pk=None):
        """تفعيل حساب الموظف: دخول النظام + بوابة خدمة ذاتية + إرسال بيانات الدخول."""
        employee = self.get_object()
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else employee.tenant_id
        user_id = request.user.id if request.user else None

        from apps.employees.application.services import activate_staff_account
        try:
            result = activate_staff_account(employee, tenant_id, actor_id=user_id)
        except ValueError as e:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(str(e))

        return StandardResponse(
            result,
            message="تم تفعيل حساب الموظف (دخول النظام + بوابة الخدمة الذاتية) وإرسال تفاصيل الدخول بنجاح.",
        )

class EmployeeProfileViewSet(BaseCRUDViewSet):
    model_class = EmployeeProfile
    serializer_class = EmployeeProfileSerializer

class EmployeeStatusHistoryViewSet(BaseCRUDViewSet):
    model_class = EmployeeStatusHistory
    serializer_class = EmployeeStatusHistorySerializer