from rest_framework import serializers
from apps.platform.domain.models import (
    SystemConfiguration, AuditLog, Notification, AttachmentMetadata,
    FeatureFlag, BackgroundJob, EventLog
)

class SystemConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemConfiguration
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']


class AttachmentMetadataSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttachmentMetadata
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']


class FeatureFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeatureFlag
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']


class BackgroundJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = BackgroundJob
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']


class EventLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventLog
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']