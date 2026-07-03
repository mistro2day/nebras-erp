from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.payroll.interfaces.views import (
    SalaryStructureViewSet, EmployeeLoanViewSet, PayrollPeriodViewSet,
    PayrollRunViewSet, PayslipViewSet
)

router = DefaultRouter()
router.register(r'structures', SalaryStructureViewSet, basename='payroll-structure')
router.register(r'loans', EmployeeLoanViewSet, basename='payroll-loan')
router.register(r'periods', PayrollPeriodViewSet, basename='payroll-period')
router.register(r'runs', PayrollRunViewSet, basename='payroll-run')
router.register(r'payslips', PayslipViewSet, basename='payroll-payslip')

urlpatterns = [
    path('', include(router.urls)),
]