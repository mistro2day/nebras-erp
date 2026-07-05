from django.contrib import admin
from apps.reports.domain.models import SavedReport


@admin.register(SavedReport)
class SavedReportAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_by_user', 'tenant_id')
    search_fields = ('name',)
