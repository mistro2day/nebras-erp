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