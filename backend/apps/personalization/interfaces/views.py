from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.personalization.domain.models import AccessibilityProfile, UserPreference, Theme, Workspace
from apps.personalization.interfaces.serializers import (
    AccessibilityProfileSerializer, UserPreferenceSerializer, ThemeSerializer, WorkspaceSerializer
)
from apps.personalization.application.services import AccessibilityService, PreferenceService


class WorkspaceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = WorkspaceSerializer
    queryset = Workspace.objects.all()

    def get_queryset(self):
        tenant_id = self.request.headers.get('X-Tenant-ID')
        qs = super().get_queryset()
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs


class ThemeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ThemeSerializer
    queryset = Theme.objects.all()


class AccessibilityProfileViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = AccessibilityProfileSerializer
    queryset = AccessibilityProfile.objects.all()

    def get_queryset(self):
        tenant_id = self.request.headers.get('X-Tenant-ID')
        qs = super().get_queryset()
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs

    @action(detail=False, methods=['get', 'post'], url_path='profile')
    def manage_profile(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        user_id = request.user.id

        if request.method == 'POST':
            font_scale = float(request.data.get('font_scale', 1.0))
            high_contrast = str(request.data.get('high_contrast', 'false')).lower() == 'true'
            reduced_motion = str(request.data.get('reduced_motion', 'false')).lower() == 'true'

            profile = AccessibilityService.update_accessibility_profile(
                tenant_id, user_id, font_scale, high_contrast, reduced_motion
            )
        else:
            profile = AccessibilityService.get_accessibility_profile(tenant_id, user_id)

        return Response(AccessibilityProfileSerializer(profile).data, status=status.HTTP_200_OK)


class PreferenceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = UserPreferenceSerializer
    queryset = UserPreference.objects.all()

    def get_queryset(self):
        tenant_id = self.request.headers.get('X-Tenant-ID')
        qs = super().get_queryset()
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs

    @action(detail=False, methods=['get'], url_path='user')
    def get_preferences(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        user_id = request.user.id

        prefs = PreferenceService.get_user_preferences(tenant_id, user_id)
        return Response(prefs, status=status.HTTP_200_OK)
