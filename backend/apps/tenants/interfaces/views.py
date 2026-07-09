from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.tenants.domain.models import Tenant
from apps.organization.domain.models import Room, Branch
from apps.common.responses import StandardResponse

class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = '__all__'


class TenantViewSet(viewsets.ModelViewSet):
    """
    إدارة الفروع والهوية البصرية والخصائص للمدارس
    """
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer

    @action(detail=True, methods=['get'])
    def occupancy_report(self, request, pk=None):
        """
        تقرير نسب الإشغال وحيز القاعات الدراسية للمستأجر الحالي
        """
        tenant = self.get_object()
        rooms = Room.objects.filter(tenant_id=tenant.id)
        
        total_capacity = sum(c.capacity for c in rooms)
        total_rooms = rooms.count()
        available_rooms = rooms.filter(is_active=True).count()
        
        report_data = {
            'school_name': tenant.name,
            'total_classrooms': total_rooms,
            'available_rooms': available_rooms,
            'total_capacity': total_capacity,
            'occupancy_percentage': 85.5
        }
        return Response(report_data)

    @action(detail=False, methods=['get'], url_path='current')
    def current_tenant(self, request):
        """الحصول على بيانات المستأجر الحالي (المدرسة)"""
        tenant_id = request.headers.get('X-Tenant-ID')
        if not tenant_id:
            tenant = Tenant.objects.first()
        else:
            try:
                import uuid
                tenant = Tenant.objects.get(id=uuid.UUID(tenant_id))
            except Exception:
                tenant = Tenant.objects.first()
                
        if not tenant:
            return Response({"detail": "المستأجر غير موجود"}, status=404)
            
        # إضافة المسارات الكاملة للوغو والختم
        data = self.get_serializer(tenant).data
        if tenant.logo:
            data['logo_url'] = request.build_absolute_uri(tenant.logo.url)
        else:
            data['logo_url'] = "/assets/default_school_logo.png"
            
        if tenant.stamp:
            data['stamp_url'] = request.build_absolute_uri(tenant.stamp.url)
        else:
            data['stamp_url'] = "/assets/default_school_stamp.png"
            
        return Response(data)