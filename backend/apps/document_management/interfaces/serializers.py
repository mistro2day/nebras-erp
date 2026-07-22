from rest_framework import serializers
from apps.document_management.domain.models import (
    Document, DocumentVersion, DocumentFolder, FolderPermission, DocumentMetadata, DocumentComment
)

class DocumentVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentVersion
        fields = ['id', 'document', 'version_number', 'file_path', 'change_log', 'author_id', 'created_at_time']


class DocumentFolderSerializer(serializers.ModelSerializer):
    count = serializers.SerializerMethodField()

    class Meta:
        model = DocumentFolder
        fields = ['id', 'name', 'parent', 'folder_type', 'department_id', 'created_at', 'count']

    def get_count(self, obj):
        return obj.documents.count()


class DocumentSerializer(serializers.ModelSerializer):
    folder_name = serializers.ReadOnlyField(source='folder.name', default='')
    versions = DocumentVersionSerializer(many=True, read_only=True)
    latest_version_path = serializers.SerializerMethodField()
    file_extension = serializers.SerializerMethodField()
    file_size_formatted = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 'title', 'folder', 'folder_name', 'category', 'doc_type',
            'current_version_number', 'is_locked', 'owner_id', 'file_size_bytes',
            'file_size_formatted', 'created_at', 'versions', 'latest_version_path',
            'file_extension'
        ]

    def get_latest_version_path(self, obj):
        latest = obj.versions.order_by('-created_at_time').first()
        if latest and latest.file_path:
            return f"/media/{latest.file_path}"
        return ""

    def get_file_extension(self, obj):
        latest = obj.versions.order_by('-created_at_time').first()
        if latest and latest.file_path:
            ext = latest.file_path.split('.')[-1].lower()
            if len(ext) <= 5:
                return ext
        return "file"

    def get_file_size_formatted(self, obj):
        bytes_size = obj.file_size_bytes or 0
        if bytes_size < 1024:
            return f"{bytes_size} B"
        elif bytes_size < 1024 * 1024:
            return f"{round(bytes_size / 1024, 1)} KB"
        else:
            return f"{round(bytes_size / (1024 * 1024), 1)} MB"


class DocumentMetadataSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentMetadata
        fields = ['id', 'document', 'meta_key', 'meta_value']


class DocumentCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentComment
        fields = ['id', 'document', 'user_id', 'comment', 'created_at']

