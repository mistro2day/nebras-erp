from rest_framework import serializers

class BaseSerializer(serializers.ModelSerializer):
    """الـ Serializer الأساسي المشترك لجميع النماذج"""
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    class Meta:
        abstract = True


class TenantBaseSerializer(BaseSerializer):
    """الـ Serializer الخاص بالمستأجرين لاستبعاد tenant_id من المدخلات تلقائياً"""
    class Meta:
        abstract = True
        exclude = ['tenant_id', 'deleted_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']