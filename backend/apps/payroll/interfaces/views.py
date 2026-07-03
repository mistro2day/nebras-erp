from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from apps.common.responses import StandardResponse
from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.payroll.domain.models import SalaryStructure, EmployeeLoan, PayrollPeriod, PayrollRun, Payslip
from apps.payroll.interfaces.serializers import (
    SalaryStructureSerializer, EmployeeLoanSerializer, PayrollPeriodSerializer,
    PayrollRunSerializer, PayslipSerializer
)

class SalaryStructureViewSet(BaseCRUDViewSet):
    model_class = SalaryStructure
    serializer_class = SalaryStructureSerializer

class EmployeeLoanViewSet(BaseCRUDViewSet):
    model_class = EmployeeLoan
    serializer_class = EmployeeLoanSerializer

class PayrollPeriodViewSet(BaseCRUDViewSet):
    model_class = PayrollPeriod
    serializer_class = PayrollPeriodSerializer

class PayrollRunViewSet(BaseCRUDViewSet):
    model_class = PayrollRun
    serializer_class = PayrollRunSerializer

    @action(detail=True, methods=['post'], url_path='process')
    def process_payroll(self, request, pk=None):
        instance = self.get_object()
        instance.status = 'approved'
        instance.save()
        return StandardResponse(self.get_serializer(instance).data, message="تمت معالجة مسير الرواتب واعتماده بنجاح.")

class PayslipViewSet(BaseCRUDViewSet):
    model_class = Payslip
    serializer_class = PayslipSerializer