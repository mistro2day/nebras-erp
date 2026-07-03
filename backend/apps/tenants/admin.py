from django.contrib import admin
from apps.tenants.models import Tenant

@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ('name', 'name_ar', 'subdomain', 'is_active', 'created_at')
    search_fields = ('name', 'name_ar', 'subdomain')
    list_filter = ('is_active',)
