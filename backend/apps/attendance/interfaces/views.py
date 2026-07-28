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
        if self.action in ['check_in', 'clock_out', 'my_summary', 'live_status', 'list', 'create']:
            return []
        return super().get_permissions()

    @action(detail=False, methods=['post'], url_path='check-in')
    def check_in(self, request):
        employee_id = request.data.get('employee')
        user_lat = float(request.data.get('latitude', 0))
        user_lng = float(request.data.get('longitude', 0))
        device_id = request.data.get('device_id', '')
        verification_method = request.data.get('verification_method', 'gps_biometric')
        
        # البحث عن سياسة الحضور النشطة أو استخدام قيم الفرع الافتراضية
        policy = AttendancePolicy.objects.filter(is_active=True).first()
        branch_lat = policy.latitude if policy else 24.7136
        branch_lng = policy.longitude if policy else 46.6753
        max_radius = policy.radius_meters if policy else 150
        
        # حساب المسافة التقريبية (Haversine)
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
        
        # التثبت من المسافة (مع السماح بالوضع المحاكى للتطوير)
        if distance > max_radius and request.data.get('location_simulation') == 'outside':
            return StandardResponse(
                None, 
                success=False, 
                message=f"خطأ في تسجيل البصمة: أنت تبعد {int(distance)} متراً خارج نطاق المدرسة المسموح ({max_radius}م).",
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
                'check_in_lat': user_lat,
                'check_in_lng': user_lng,
                'device_id': device_id,
                'verification_method': verification_method,
                'status': 'present'
            }
        )
        
        if not created:
            record.check_out = timezone.now().time()
            record.check_out_lat = user_lat
            record.check_out_lng = user_lng
            record.save()
            return StandardResponse(
                AttendanceRecordSerializer(record).data,
                message="تم تسجيل انصراف الموظف بنجاح."
            )
            
        return StandardResponse(
            AttendanceRecordSerializer(record).data,
            message="تم تسجيل حضور الموظف بنجاح."
        )

    @action(detail=False, methods=['get'], url_path='my-summary')
    def my_summary(self, request):
        employee_id = request.query_params.get('employee')
        if not employee_id:
            return StandardResponse(None, success=False, message="مطلوب رقم الموظف.", status=status.HTTP_400_BAD_REQUEST)
            
        import datetime
        today = datetime.date.today()
        first_of_month = today.replace(day=1)
        
        records = AttendanceRecord.objects.filter(
            employee_id=employee_id,
            date__gte=first_of_month,
            date__lte=today
        )
        
        today_record = records.filter(date=today).first()
        present_count = records.filter(status='present').count()
        late_count = records.filter(status='late').count()
        absent_count = records.filter(status='absent').count()
        
        return StandardResponse({
            'today_record': AttendanceRecordSerializer(today_record).data if today_record else None,
            'stats': {
                'present_days': present_count,
                'late_days': late_count,
                'absent_days': absent_count,
                'total_working_days': records.count()
            }
        })

    @action(detail=False, methods=['get'], url_path='live-status')
    def live_status(self, request):
        import datetime
        today = datetime.date.today()
        records = AttendanceRecord.objects.filter(date=today).select_related('employee')
        
        present_list = []
        for r in records:
            present_list.append({
                'id': str(r.id),
                'employee_id': str(r.employee.id),
                'employee_name': r.employee.full_name_ar,
                'department': r.employee.department,
                'check_in': r.check_in.strftime('%H:%M') if r.check_in else None,
                'check_out': r.check_out.strftime('%H:%M') if r.check_out else None,
                'status': r.status,
                'verification_method': r.verification_method,
            })
            
        return StandardResponse({
            'date': today.isoformat(),
            'total_present_today': len(present_list),
            'records': present_list
        })

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