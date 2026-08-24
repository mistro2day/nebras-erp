from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.notifications.interfaces.views import DeviceTokenViewSet

router = DefaultRouter()
router.register('device-tokens', DeviceTokenViewSet, basename='device-token')

urlpatterns = [
    path('', include(router.urls)),
]
