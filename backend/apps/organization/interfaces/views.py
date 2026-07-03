from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Sum

from apps.organization.domain.models import (
    Branch, Campus, Building, Floor, Room, Department, 
    OrganizationDocument, TenantBranding, OrganizationContact
)
from apps.organization.interfaces.serializers import (
    BranchSerializer, CampusSerializer, BuildingSerializer, FloorSerializer, 
    RoomSerializer, DepartmentSerializer, OrganizationDocumentSerializer, 
    TenantBrandingSerializer, OrganizationContactSerializer
)
from apps.common.responses import StandardResponse, StandardPagination

class OrganizationBaseViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]

    def get_queryset(self):
        # تصفية الكائنات المحذوفة لطيفاً بشكل تلقائي وعزل المستأجرين يتم برمجياً بواسطة CombinedBaseModel والـ Manager
        return self.model_class.objects.filter(deleted_at__isnull=True)

    def perform_create(self, serializer):
        tenant_id = self.request.tenant.id if hasattr(self.request, 'tenant') and self.request.tenant else None
        serializer.save(tenant_id=tenant_id)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete() # استدعاء الحذف اللطيف soft_delete المضمن
        return StandardResponse(None, message="تم الحذف لطيفاً بنجاح.")

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        instance = self.model_class.all_objects.get(pk=pk)
        instance.restore()
        return StandardResponse(None, message="تم استرجاع العنصر بنجاح.")


class BranchViewSet(OrganizationBaseViewSet):
    model_class = Branch
    serializer_class = BranchSerializer
    search_fields = ['name', 'name_ar', 'code', 'city']


class CampusViewSet(OrganizationBaseViewSet):
    model_class = Campus
    serializer_class = CampusSerializer
    search_fields = ['name', 'name_ar', 'code']


class BuildingViewSet(OrganizationBaseViewSet):
    model_class = Building
    serializer_class = BuildingSerializer
    search_fields = ['name', 'name_ar', 'code']


class FloorViewSet(OrganizationBaseViewSet):
    model_class = Floor
    serializer_class = FloorSerializer


class RoomViewSet(OrganizationBaseViewSet):
    model_class = Room
    serializer_class = RoomSerializer
    search_fields = ['number', 'name']


class DepartmentViewSet(OrganizationBaseViewSet):
    model_class = Department
    serializer_class = DepartmentSerializer
    search_fields = ['name', 'code']


class OrganizationDocumentViewSet(OrganizationBaseViewSet):
    model_class = OrganizationDocument
    serializer_class = OrganizationDocumentSerializer
    search_fields = ['name']


class TenantBrandingViewSet(OrganizationBaseViewSet):
    model_class = TenantBranding
    serializer_class = TenantBrandingSerializer


class OrganizationContactViewSet(OrganizationBaseViewSet):
    model_class = OrganizationContact
    serializer_class = OrganizationContactSerializer