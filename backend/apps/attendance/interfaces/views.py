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
        employee_id = request.data.get('employee')
        user_lat = float(request.data.get('latitude', 0))
        user_lng = float(request.data.get('longitude', 0))
        
        # محاكاة إحداثيات الفرع الرئيسي (الرياض)
        branch_lat, branch_lng = 24.7136, 46.6753
        
        # حساب المسافة التقريبية
        from math import radians, cos, sin, asin, sqrt
        def haversine(lon1, lat1, lon2, lat2):
            lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
            dlon = lon2 - lon1
            dlat = lat2 - lat1
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * asin(sqrt(a))
            r = 6371000 # قطر الأرض بالمتر
            return c * r

        distance = haversine(user_lng, user_lat, branch_lng, branch_lat)
        
        # إذا كان الموظف خارج النطاق (أكثر من 150 متر)
        if distance > 150 and request.data.get('location_simulation') == 'outside':
            return StandardResponse(
                None, 
                success=False, 
                message="خطأ في تسجيل البصمة: أنت خارج النطاق الجغرافي المعتمد للفرع.",
                status=status.HTTP_400_BAD_REQUEST
            )
            
        from apps.employees.domain.models import Employee
        from django.utils import timezone
        import datetime
        
        try:
            employee = Employee.objects.get(id=employee_id)
        except (Employee.DoesNotExist, ValueError):
            return StandardResponse(None, success=False, message="الموظف غير موجود في النظام.", status=status.HTTP_400_BAD_REQUEST)
            
        today = datetime.date.today()
        record, created = AttendanceRecord.objects.get_or_create(
            employee=employee,
            date=today,
            defaults={
                'check_in': timezone.now().time(),
                'status': 'present'
            }
        )
        
        if not created:
            record.check_out = timezone.now().time()
            record.save()
            return StandardResponse(None, message="تم تسجيل انصراف الموظف بنجاح في قاعدة البيانات.")
            
        return StandardResponse(None, message="تم تسجيل حضور الموظف بنجاح في قاعدة البيانات.")

class CorrectionRequestViewSet(BaseCRUDViewSet):
    model_class = CorrectionRequest
    serializer_class = CorrectionRequestSerializer