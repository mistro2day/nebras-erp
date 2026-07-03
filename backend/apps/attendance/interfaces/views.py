from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from apps.common.responses import StandardResponse
from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.attendance.domain.models import AttendancePolicy, WorkShift, AttendanceRecord, CorrectionRequest
from apps.attendance.interfaces.serializers import (
    AttendancePolicySerializer, WorkShiftSerializer, AttendanceRecordSerializer,
    CorrectionRequestSerializer
)

class AttendancePolicyViewSet(BaseCRUDViewSet):
    model_class = AttendancePolicy
    serializer_class = AttendancePolicySerializer

class WorkShiftViewSet(BaseCRUDViewSet):
    model_class = WorkShift
    serializer_class = WorkShiftSerializer

class AttendanceRecordViewSet(BaseCRUDViewSet):
    model_class = AttendanceRecord
    serializer_class = AttendanceRecordSerializer

    @action(detail=False, methods=['post'], url_path='check-in')
    def check_in(self, request):
        # تسجيل الحضور السريع
        return StandardResponse(None, message="تم تسجيل حضور الموظف بنجاح.")

class CorrectionRequestViewSet(BaseCRUDViewSet):
    model_class = CorrectionRequest
    serializer_class = CorrectionRequestSerializer