from rest_framework import serializers
from apps.notifications.domain.models import DeviceToken

class DeviceTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceToken
        fields = ['id', 'user_id', 'token', 'platform', 'device_name', 'is_active', 'created_at']
