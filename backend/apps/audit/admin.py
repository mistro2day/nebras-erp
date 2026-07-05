from django.contrib import admin
from apps.audit.domain.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('action', 'model_name', 'object_id', 'user_id', 'tenant_id', 'timestamp')
    list_filter = ('action', 'model_name')
    search_fields = ('model_name', 'user_id', 'object_id')
    ordering = ('-timestamp',)
