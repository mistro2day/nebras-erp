from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.configuration.interfaces.views import (
    SystemSettingViewSet, FeatureFlagViewSet, ModuleRegistryViewSet, LicenseViewSet
)

router = DefaultRouter()
router.register(r'settings', SystemSettingViewSet, basename='cfg-settings')
router.register(r'features', FeatureFlagViewSet, basename='cfg-features')
router.register(r'modules', ModuleRegistryViewSet, basename='cfg-modules')
router.register(r'licenses', LicenseViewSet, basename='cfg-licenses')

urlpatterns = [
    path('', include(router.urls)),
]
