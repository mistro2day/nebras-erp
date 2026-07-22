from rest_framework import serializers
from apps.communications.domain.models import (
    CommunicationChannel,
    CommunicationProvider,
    CommunicationTemplate,
    CommunicationTemplateVersion,
    CommunicationVariable,
    CommunicationMessage,
    CommunicationRecipient,
    CommunicationAttachment,
    CommunicationQueue,
    CommunicationLog,
    CommunicationPreference,
    CommunicationCampaign,
    CommunicationEvent,
    CommunicationWebhook,
    CommunicationStatistics,
    CommunicationFailure,
    CommunicationRetry,
    Notification,
)


class CommunicationChannelSerializer(serializers.ModelSerializer):
    providers_count = serializers.SerializerMethodField()

    class Meta:
        model = CommunicationChannel
        fields = '__all__'

    def get_providers_count(self, obj):
        return obj.providers.filter(is_active=True, deleted_at__isnull=True).count()


class CommunicationProviderSerializer(serializers.ModelSerializer):
    channel_name = serializers.CharField(source='channel.name', read_only=True)

    class Meta:
        model = CommunicationProvider
        fields = '__all__'
        extra_kwargs = {
            'credentials': {'write_only': True},  # إخفاء بيانات الاعتماد في القراءة
        }


class CommunicationVariableSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunicationVariable
        fields = '__all__'


class CommunicationTemplateVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunicationTemplateVersion
        fields = '__all__'


class CommunicationTemplateSerializer(serializers.ModelSerializer):
    versions_count = serializers.SerializerMethodField()
    current_version = serializers.SerializerMethodField()
    extracted_variables = serializers.SerializerMethodField()

    class Meta:
        model = CommunicationTemplate
        fields = '__all__'
        # المستأجر يُحقن من الخادم في create()/perform_create — لا يُطلب من العميل.
        read_only_fields = ['id', 'tenant_id', 'created_by', 'created_at', 'updated_at', 'deleted_at']

    def get_versions_count(self, obj):
        return obj.versions.count()

    def get_current_version(self, obj):
        published = obj.versions.filter(status='published').first()
        if published:
            return CommunicationTemplateVersionSerializer(published).data
        return None

    def get_extracted_variables(self, obj):
        from apps.communications.application.services import TemplateService
        return TemplateService.extract_variables(obj.body)


class CommunicationRecipientSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunicationRecipient
        fields = '__all__'


class CommunicationAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunicationAttachment
        fields = '__all__'


class CommunicationMessageSerializer(serializers.ModelSerializer):
    channel_name = serializers.CharField(source='channel.name', read_only=True)
    channel_type = serializers.CharField(source='channel.channel_type', read_only=True)
    provider_name = serializers.CharField(source='provider.name', read_only=True, default=None)
    template_name = serializers.CharField(source='template.name', read_only=True, default=None)
    recipients = CommunicationRecipientSerializer(many=True, read_only=True)
    attachments = CommunicationAttachmentSerializer(many=True, read_only=True)
    recipients_count = serializers.SerializerMethodField()

    class Meta:
        model = CommunicationMessage
        fields = '__all__'

    def get_recipients_count(self, obj):
        return obj.recipients.count()


class CommunicationQueueSerializer(serializers.ModelSerializer):
    message_subject = serializers.CharField(source='message.subject', read_only=True, default='')
    message_status = serializers.CharField(source='message.status', read_only=True)
    channel_type = serializers.CharField(source='message.channel.channel_type', read_only=True, default='')

    class Meta:
        model = CommunicationQueue
        fields = '__all__'


class CommunicationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunicationLog
        fields = '__all__'


class CommunicationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunicationPreference
        fields = '__all__'


class CommunicationCampaignSerializer(serializers.ModelSerializer):
    channel_name = serializers.CharField(source='channel.name', read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True, default=None)
    delivery_rate = serializers.SerializerMethodField()

    class Meta:
        model = CommunicationCampaign
        fields = '__all__'

    def get_delivery_rate(self, obj):
        if obj.total_messages > 0:
            return round(obj.delivered_count / obj.total_messages * 100, 1)
        return 0


class CommunicationEventSerializer(serializers.ModelSerializer):
    channel_name = serializers.CharField(source='channel.name', read_only=True, default=None)
    template_name = serializers.CharField(source='template.name', read_only=True, default=None)

    class Meta:
        model = CommunicationEvent
        fields = '__all__'


class CommunicationWebhookSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunicationWebhook
        fields = '__all__'
        extra_kwargs = {
            'secret_key': {'write_only': True},
        }


class CommunicationStatisticsSerializer(serializers.ModelSerializer):
    channel_name = serializers.CharField(source='channel.name', read_only=True, default=None)

    class Meta:
        model = CommunicationStatistics
        fields = '__all__'


class CommunicationFailureSerializer(serializers.ModelSerializer):
    message_subject = serializers.CharField(source='message.subject', read_only=True, default='')

    class Meta:
        model = CommunicationFailure
        fields = '__all__'


class CommunicationRetrySerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunicationRetry
        fields = '__all__'


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'


# ============================================================
# Serializers مخصصة للعمليات
# ============================================================
class BulkSendSerializer(serializers.Serializer):
    """Serializer للإرسال الجماعي."""
    channel_code = serializers.CharField(max_length=50)
    template_code = serializers.CharField(max_length=100, required=False)
    subject = serializers.CharField(max_length=500, required=False)
    body = serializers.CharField(required=False)
    variables = serializers.DictField(required=False, default=dict)
    priority = serializers.ChoiceField(
        choices=['critical', 'high', 'normal', 'low'], default='normal'
    )
    recipients = serializers.ListField(
        child=serializers.DictField(), min_length=1
    )
    scheduled_at = serializers.DateTimeField(required=False, allow_null=True)
    source_module = serializers.CharField(max_length=50, required=False)
    source_event = serializers.CharField(max_length=100, required=False)


class TemplatePreviewSerializer(serializers.Serializer):
    """Serializer لمعاينة القوالب."""
    variables = serializers.DictField(required=False, default=dict)


class MessageResendSerializer(serializers.Serializer):
    """Serializer لإعادة إرسال رسالة."""
    reason = serializers.CharField(max_length=500, required=False)


class NotificationMarkReadSerializer(serializers.Serializer):
    """Serializer لتحديد الإشعارات كمقروءة."""
    notification_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False
    )
    category = serializers.CharField(max_length=30, required=False)
    mark_all = serializers.BooleanField(default=False)
