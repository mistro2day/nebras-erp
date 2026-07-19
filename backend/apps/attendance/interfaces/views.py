from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from apps.common.responses import StandardResponse
from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.attendance.domain.models import AttendancePolicy, WorkShift, AttendanceRecord, CorrectionRequest, AttendanceSheet
from apps.attendance.interfaces.serializers import (
    AttendancePolicySerializer, WorkShiftSerializer, AttendanceRecordSerializer,
    CorrectionRequestSerializer, AttendanceSheetSerializer
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
    permission_classes = [] # السماح بالمحاكاة العامة للبصمة الجوالة دون قيود الصلاحيات الصارمة مؤقتاً
    pagination_class = None # تعطيل الترقيم لجلب كافة البصمات دفعة واحدة للتقارير والكشوفات

    def get_queryset(self):
        qs = super().get_queryset().select_related('employee')
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
            
        date = self.request.query_params.get('date')
        if date:
            qs = qs.filter(date=date)
            
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        if year:
            qs = qs.filter(date__year=year)
        if month:
            qs = qs.filter(date__month=month)
            
        return qs

    def get_permissions(self):
        if self.action in ['check_in', 'list', 'create']:
            return []
        return super().get_permissions()

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

class AttendanceSheetViewSet(BaseCRUDViewSet):
    model_class = AttendanceSheet
    serializer_class = AttendanceSheetSerializer
    permission_classes = [] # السماح بالوصول دون قيود الصلاحيات الصارمة مؤقتاً
    pagination_class = None

    def get_queryset(self):
        return super().get_queryset().order_by('-period_code')

    @action(detail=False, methods=['get'], url_path='get-or-create')
    def get_or_create_sheet(self, request):
        period_code = request.query_params.get('period_code')
        if not period_code:
            import datetime
            today = datetime.date.today()
            period_code = today.strftime('%Y-%m') # e.g. '2026-07'

        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        
        sheet, created = AttendanceSheet.objects.get_or_create(
            period_code=period_code,
            tenant_id=tenant_id,
            defaults={'status': 'draft'}
        )
        
        return StandardResponse(AttendanceSheetSerializer(sheet).data)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve_sheet(self, request, pk=None):
        sheet = self.get_object()
        from django.utils import timezone
        sheet.status = 'approved'
        sheet.approved_at = timezone.now()
        sheet.approved_by = request.user.id if request.user and request.user.id else None
        sheet.save()
        return StandardResponse(AttendanceSheetSerializer(sheet).data, message="تم اعتماد كشف الحضور بنجاح وتحويله إلى كشف مغلق.")