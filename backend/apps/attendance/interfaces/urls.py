from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.attendance.interfaces.views import (
    AttendancePolicyViewSet, WorkShiftViewSet, AttendanceRecordViewSet,
    CorrectionRequestViewSet
)

router = DefaultRouter()
router.register(r'policies', AttendancePolicyViewSet, basename='attendance-policy')
router.register(r'shifts', WorkShiftViewSet, basename='attendance-shift')
router.register(r'records', AttendanceRecordViewSet, basename='attendance-record')
router.register(r'corrections', CorrectionRequestViewSet, basename='attendance-correction')

urlpatterns = [
    path('', include(router.urls)),
]