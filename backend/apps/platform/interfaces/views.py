from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from apps.common.responses import StandardResponse, StandardPagination
from apps.platform.domain.models import (
    SystemConfiguration, AuditLog, Notification, FeatureFlag, BackgroundJob
)
from apps.platform.interfaces.serializers import (
    SystemConfigurationSerializer, AuditLogSerializer, NotificationSerializer,
    FeatureFlagSerializer, BackgroundJobSerializer
)
from apps.platform.application.services import (
    ConfigurationService, SystemHealthService, SearchService
)
from apps.platform.application.storage import FileStorageService
from apps.platform.interfaces.permissions import PlatformPermission
import uuid

from apps.shared.interfaces.views import BaseCRUDViewSet

class PlatformBaseViewSet(BaseCRUDViewSet):
    permission_classes = [PlatformPermission]



class SystemConfigurationViewSet(PlatformBaseViewSet):
    model_class = SystemConfiguration
    serializer_class = SystemConfigurationSerializer

    @action(detail=False, methods=['post'], url_path='set-value')
    def set_value(self, request):
        key = request.data.get('key')
        value = request.data.get('value')
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        
        ConfigurationService.set_setting(key, value, tenant_id=tenant_id)
        return StandardResponse(None, message="تم حفظ الإعداد بنجاح.")


class AuditLogViewSet(PlatformBaseViewSet):
    model_class = AuditLog
    serializer_class = AuditLogSerializer
    http_method_names = ['get']


class NotificationViewSet(PlatformBaseViewSet):
    model_class = Notification
    serializer_class = NotificationSerializer
    http_method_names = ['get', 'post']


class FeatureFlagViewSet(PlatformBaseViewSet):
    model_class = FeatureFlag
    serializer_class = FeatureFlagSerializer


class BackgroundJobViewSet(PlatformBaseViewSet):
    model_class = BackgroundJob
    serializer_class = BackgroundJobSerializer
    http_method_names = ['get']


class SystemHealthViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        """فحص حالة وصحة النظام الإجمالية"""
        status_info = SystemHealthService.check_health()
        return StandardResponse(status_info, message="تم جلب تقرير صحة النظام بنجاح.")


class UnifiedSearchViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        query = request.query_params.get('q', '')
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        results = SearchService.search(query, tenant_id=tenant_id)
        return StandardResponse(results, message="تمت عملية البحث المركزي بنجاح.")


class FileStorageViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='upload')
    def upload(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"success": False, "error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)
            
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else uuid.uuid4()
        user_id = request.user.id if request.user else uuid.uuid4()
        
        metadata = FileStorageService.upload_file(
            file_obj=file_obj,
            tenant_id=tenant_id,
            user_id=user_id,
            category=request.data.get('category', 'general')
        )
        
        from apps.platform.interfaces.serializers import AttachmentMetadataSerializer
        serializer = AttachmentMetadataSerializer(metadata)
        return StandardResponse(serializer.data, message="تم رفع وحفظ الملف وحساب الـ Checksum بنجاح.", status=status.HTTP_201_CREATED)