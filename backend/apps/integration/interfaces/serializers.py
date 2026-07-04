from rest_framework import serializers
from apps.integration.domain.models import (
    ApiClient, ApiKey, WebhookSubscription, WebhookDelivery,
    IntegrationStatistics, IntegrationLog, GatewaySettings
)

class ApiClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApiClient
        fields = ['id', 'name', 'client_id', 'is_active', 'created_at']


class ApiKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = ApiKey
        fields = ['id', 'client', 'name', 'prefix', 'is_active', 'expires_at', 'created_at']


class WebhookSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookSubscription
        fields = ['id', 'client', 'webhook', 'target_url', 'secret_token', 'is_active']


class WebhookDeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookDelivery
        fields = ['id', 'subscription', 'payload', 'response_code', 'is_delivered', 'attempt_number', 'delivered_at']


class IntegrationStatisticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntegrationStatistics
        fields = ['id', 'endpoint_path', 'total_calls', 'error_calls', 'avg_latency_ms']


class IntegrationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntegrationLog
        fields = ['id', 'client', 'path', 'method', 'status_code', 'latency_ms', 'correlation_id', 'created_at']


class GatewaySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GatewaySettings
        fields = ['id', 'maintenance_mode', 'allowed_ips', 'blocked_ips']
