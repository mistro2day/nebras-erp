from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.tenants.interfaces.views import TenantViewSet

router = DefaultRouter()
router.register('branding', TenantViewSet, basename='tenant-branding')

urlpatterns = [
    path('', include(router.urls)),
]