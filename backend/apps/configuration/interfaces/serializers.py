from rest_framework import serializers
from apps.configuration.domain.models import (
    SystemSetting, FeatureFlag, ModuleRegistry, License
)

class SystemSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = ['id', 'key', 'value', 'category', 'is_encrypted']


class FeatureFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeatureFlag
        fields = ['id', 'name', 'code', 'is_enabled', 'group', 'scheduled_activation', 'scheduled_deactivation']


class ModuleRegistrySerializer(serializers.ModelSerializer):
    class Meta:
        model = ModuleRegistry
        fields = ['id', 'name', 'code', 'is_installed', 'health_status']


class LicenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = License
        fields = ['id', 'edition', 'license_key', 'expires_at', 'max_seats']
