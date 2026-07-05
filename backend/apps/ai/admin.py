from django.contrib import admin
from apps.ai.domain.models import AIConversation


@admin.register(AIConversation)
class AIConversationAdmin(admin.ModelAdmin):
    list_display = ('user_id', 'tokens_used', 'tenant_id', 'created_at')
    search_fields = ('user_id',)
    ordering = ('-created_at',)
