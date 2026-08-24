from rest_framework import viewsets, permissions
from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.notifications.domain.models import DeviceToken
from apps.notifications.interfaces.serializers import DeviceTokenSerializer

class DeviceTokenViewSet(BaseCRUDViewSet):
    model_class = DeviceToken
    serializer_class = DeviceTokenSerializer
    permission_classes = [] # السماح بالتسجيل المباشر من الجوال
