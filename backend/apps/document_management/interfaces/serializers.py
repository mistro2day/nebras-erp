from rest_framework import serializers
from apps.document_management.domain.models import (
    Document, DocumentVersion, DocumentFolder, FolderPermission, DocumentMetadata, DocumentComment
)

class DocumentFolderSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentFolder
        fields = ['id', 'name', 'parent', 'folder_type', 'department_id', 'created_at']


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['id', 'title', 'folder', 'category', 'doc_type', 'current_version_number', 'is_locked', 'owner_id', 'file_size_bytes', 'created_at']


class DocumentVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentVersion
        fields = ['id', 'document', 'version_number', 'file_path', 'change_log', 'author_id', 'created_at_time']


class DocumentMetadataSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentMetadata
        fields = ['id', 'document', 'meta_key', 'meta_value']


class DocumentCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentComment
        fields = ['id', 'document', 'user_id', 'comment', 'created_at']
