from django.contrib import admin
from apps.settings.domain.models import TenantSetting


@admin.register(TenantSetting)
class TenantSettingAdmin(admin.ModelAdmin):
    list_display = ('group', 'key', 'tenant_id')
    list_filter = ('group',)
    search_fields = ('group', 'key')
