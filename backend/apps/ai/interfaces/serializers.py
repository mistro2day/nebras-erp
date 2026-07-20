from rest_framework import serializers
from apps.ai.domain.models import AIConversation

class AIConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIConversation
        fields = [
            'id', 'tenant_id', 'user_id', 'prompt',
            'response', 'tokens_used', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tenant_id', 'created_at', 'updated_at']

class AIAskPromptSerializer(serializers.Serializer):
    prompt = serializers.CharField(required=True, allow_blank=False, max_length=1000)
