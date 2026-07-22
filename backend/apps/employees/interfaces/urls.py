from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.employees.interfaces.views import (
    EmployeeViewSet, 
    EmployeeProfileViewSet, 
    EmployeeStatusHistoryViewSet,
    EmployeeAdvanceViewSet,
    EmployeeDependentViewSet
)

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'advances', EmployeeAdvanceViewSet, basename='employee-advance')
router.register(r'dependents', EmployeeDependentViewSet, basename='employee-dependent')
router.register(r'profiles', EmployeeProfileViewSet, basename='employee-profile')
router.register(r'status-histories', EmployeeStatusHistoryViewSet, basename='employee-status-history')

urlpatterns = [
    path('', include(router.urls)),
]