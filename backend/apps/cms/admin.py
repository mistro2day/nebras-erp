from django.contrib import admin
from apps.cms.domain.models import CMSPage


@admin.register(CMSPage)
class CMSPageAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'tenant_id')
    search_fields = ('title', 'slug')
    prepopulated_fields = {'slug': ('title',)}
