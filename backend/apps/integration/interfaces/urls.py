from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.integration.interfaces.views import (
    ParentBffDashboardView, StudentBffDashboardView, ApiClientViewSet, ApiKeyViewSet,
    WebhookSubscriptionViewSet, WebhookDeliveryViewSet, IntegrationStatisticsViewSet,
    IntegrationLogViewSet
)

router = DefaultRouter()
router.register(r'clients', ApiClientViewSet, basename='integration-clients')
router.register(r'keys', ApiKeyViewSet, basename='integration-keys')
router.register(r'subscriptions', WebhookSubscriptionViewSet, basename='integration-subscriptions')
router.register(r'deliveries', WebhookDeliveryViewSet, basename='integration-deliveries')
router.register(r'statistics', IntegrationStatisticsViewSet, basename='integration-statistics')
router.register(r'logs', IntegrationLogViewSet, basename='integration-logs')

urlpatterns = [
    path('', include(router.urls)),
    path('bff/parent/dashboard/', ParentBffDashboardView.as_view(), name='bff-parent-dashboard'),
    path('bff/student/dashboard/', StudentBffDashboardView.as_view(), name='bff-student-dashboard'),
]
