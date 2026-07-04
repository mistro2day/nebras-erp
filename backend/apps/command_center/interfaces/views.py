from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.command_center.domain.models import Command, CommandCategory, RecentCommand, FavoriteCommand
from apps.command_center.interfaces.serializers import (
    CommandSerializer, CommandCategorySerializer, RecentCommandSerializer, FavoriteCommandSerializer
)
from apps.command_center.application.services import CommandExecutionService


class CommandCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CommandCategorySerializer
    queryset = CommandCategory.objects.all()

    def get_queryset(self):
        tenant_id = self.request.headers.get('X-Tenant-ID')
        qs = super().get_queryset()
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs


class CommandViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CommandSerializer
    queryset = Command.objects.all()

    def get_queryset(self):
        tenant_id = self.request.headers.get('X-Tenant-ID')
        qs = super().get_queryset()
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs

    @action(detail=False, methods=['get'], url_path='search')
    def search_commands(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        query_str = request.query_params.get('q', '')
        user_id = request.user.id
        
        # جلب أدوار المستخدم (افتراضياً قائمة فارغة في الاختبار)
        user_role_ids = []

        results = CommandExecutionService.search_commands(tenant_id, query_str, user_id, user_role_ids)
        return Response(results, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='execute')
    def execute(self, request, pk=None):
        tenant_id = request.headers.get('X-Tenant-ID')
        user_id = request.user.id

        try:
            result = CommandExecutionService.execute_command(tenant_id, pk, user_id)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
