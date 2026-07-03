from rest_framework import viewsets, status
from rest_framework.response import Response
from apps.common.responses import StandardResponse, StandardPagination
from apps.shared.interfaces.permissions import TenantPermission
import uuid

class BaseCRUDViewSet(viewsets.ModelViewSet):
    """
    الـ ViewSet الأساسي للـ CRUD
    يدعم عزل المستأجرين تلقائياً، والترقيم القياسي، والاستجابة الموحدة.
    """
    permission_classes = [TenantPermission]
    pagination_class = StandardPagination

    def get_queryset(self):
        # تصفية السجلات بحسب المستأجر الحالي
        tenant_id = self.request.tenant.id if hasattr(self.request, 'tenant') and self.request.tenant else None
        qs = self.model_class.objects.filter(deleted_at__isnull=True)
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs

    def create(self, request, *args, **kwargs):
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # حفظ الكيان مع ربط المستأجر الحالي
        instance = serializer.save(tenant_id=tenant_id, created_by=request.user.id if request.user else None)
        return StandardResponse(
            data=self.get_serializer(instance).data,
            message="تم الحفظ بنجاح.",
            status=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        instance = serializer.save(updated_by=request.user.id if request.user else None)
        return StandardResponse(
            data=self.get_serializer(instance).data,
            message="تم التعديل بنجاح."
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # تفعيل الحذف اللطيف (Soft Delete)
        instance.delete()
        return StandardResponse(
            data=None,
            message="تم الحذف بنجاح.",
            status=status.HTTP_200_OK
        )