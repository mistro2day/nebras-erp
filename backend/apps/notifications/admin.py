from django.contrib import admin
from apps.notifications.domain.models import NotificationTemplate, NotificationHistory


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'channel', 'tenant_id')
    list_filter = ('channel',)
    search_fields = ('name', 'code')


@admin.register(NotificationHistory)
class NotificationHistoryAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'channel', 'status', 'scheduled_at', 'sent_at')
    list_filter = ('channel', 'status')
    search_fields = ('recipient', 'subject')
    ordering = ('-scheduled_at',)
