from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.integration.domain.models import (
    ApiClient, ApiKey, WebhookSubscription, WebhookDelivery,
    IntegrationStatistics, IntegrationLog, GatewaySettings
)
from apps.integration.interfaces.serializers import (
    ApiClientSerializer, ApiKeySerializer, WebhookSubscriptionSerializer,
    WebhookDeliverySerializer, IntegrationStatisticsSerializer, IntegrationLogSerializer,
    GatewaySettingsSerializer
)
from apps.integration.application.services import BffAggregationService, ApiGatewayService, WebhookService
from apps.portal.domain.models import PortalUser


class ParentBffDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        try:
            portal_user = PortalUser.objects.get(user=request.user)
        except PortalUser.DoesNotExist:
            return Response({"detail": "المستخدم غير مسجل بالمنصة."}, status=status.HTTP_404_NOT_FOUND)

        data = BffAggregationService.get_parent_portal_dashboard(tenant_id, portal_user)
        return Response(data)


class StudentBffDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        try:
            portal_user = PortalUser.objects.get(user=request.user)
        except PortalUser.DoesNotExist:
            return Response({"detail": "المستخدم غير مسجل بالمنصة."}, status=status.HTTP_404_NOT_FOUND)

        data = BffAggregationService.get_student_portal_dashboard(tenant_id, portal_user)
        return Response(data)


class ApiClientViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ApiClientSerializer
    queryset = ApiClient.objects.all()


class ApiKeyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ApiKeySerializer
    queryset = ApiKey.objects.all()


class WebhookSubscriptionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = WebhookSubscriptionSerializer
    queryset = WebhookSubscription.objects.all()


class WebhookDeliveryViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = WebhookDeliverySerializer
    queryset = WebhookDelivery.objects.all()


class IntegrationStatisticsViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = IntegrationStatisticsSerializer
    queryset = IntegrationStatistics.objects.all()


class IntegrationLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = IntegrationLogSerializer
    queryset = IntegrationLog.objects.all()
