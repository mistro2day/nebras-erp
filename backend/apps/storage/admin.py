from django.contrib import admin
from apps.storage.domain.models import FileAsset


@admin.register(FileAsset)
class FileAssetAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'category', 'file_size', 'mime_type', 'uploaded_by', 'tenant_id')
    list_filter = ('category', 'mime_type')
    search_fields = ('file_name', 'file_path')
