from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.platform.interfaces.views import (
    SystemConfigurationViewSet, AuditLogViewSet, NotificationViewSet,
    FeatureFlagViewSet, BackgroundJobViewSet, SystemHealthViewSet,
    UnifiedSearchViewSet, FileStorageViewSet
)

from apps.platform.interfaces.dashboard_views import ERPDashboardViewSet

router = DefaultRouter()
router.register(r'configurations', SystemConfigurationViewSet, basename='config')
router.register(r'audit-logs', AuditLogViewSet, basename='audit')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'feature-flags', FeatureFlagViewSet, basename='flag')
router.register(r'background-jobs', BackgroundJobViewSet, basename='job')
router.register(r'health', SystemHealthViewSet, basename='health')
router.register(r'search', UnifiedSearchViewSet, basename='search')
router.register(r'storage', FileStorageViewSet, basename='storage')
router.register(r'erp-dashboard', ERPDashboardViewSet, basename='erp-dashboard')

urlpatterns = [
    path('', include(router.urls)),
]