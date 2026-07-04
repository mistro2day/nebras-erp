from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.configuration.domain.models import SystemSetting, FeatureFlag, ModuleRegistry, License
from apps.configuration.interfaces.serializers import (
    SystemSettingSerializer, FeatureFlagSerializer, ModuleRegistrySerializer, LicenseSerializer
)
from apps.configuration.application.services import FeatureFlagService, SystemConfigurationService


class SystemSettingViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SystemSettingSerializer
    queryset = SystemSetting.objects.all()

    def get_queryset(self):
        tenant_id = self.request.headers.get('X-Tenant-ID')
        qs = super().get_queryset()
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs

    @action(detail=False, methods=['post'], url_path='update-key')
    def update_key(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        key = request.data.get('key')
        value = request.data.get('value')
        user_id = request.user.id

        if not key or value is None:
            return Response({"detail": "الحقول key و value مطلوبة."}, status=status.HTTP_400_BAD_REQUEST)

        setting = SystemConfigurationService.update_setting(tenant_id, key, value, user_id)
        return Response(SystemSettingSerializer(setting).data, status=status.HTTP_200_OK)


class FeatureFlagViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = FeatureFlagSerializer
    queryset = FeatureFlag.objects.all()

    def get_queryset(self):
        tenant_id = self.request.headers.get('X-Tenant-ID')
        qs = super().get_queryset()
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs

    @action(detail=False, methods=['get'], url_path='evaluate/(?P<code>[^/.]+)')
    def evaluate_feature(self, request, code=None):
        tenant_id = request.headers.get('X-Tenant-ID')
        user_id = request.user.id
        # استدعاء أدوار المستخدم
        role_ids = []

        is_enabled = FeatureFlagService.is_feature_enabled(tenant_id, code, user_id, role_ids)
        return Response({"feature": code, "is_enabled": is_enabled}, status=status.HTTP_200_OK)


class ModuleRegistryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ModuleRegistrySerializer
    queryset = ModuleRegistry.objects.all()


class LicenseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = LicenseSerializer
    queryset = License.objects.all()
