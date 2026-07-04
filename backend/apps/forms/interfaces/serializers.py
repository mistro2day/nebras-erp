from rest_framework import serializers
from apps.forms.domain.models import (
    FormDefinition, FormVersion, FormCategory, FormSubmission, FormResponse
)

class FormCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FormCategory
        fields = ['id', 'name_ar', 'name_en', 'code', 'created_at']


class FormDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormDefinition
        fields = ['id', 'title_ar', 'title_en', 'category', 'code', 'is_active', 'current_version_number', 'created_at']


class FormVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormVersion
        fields = ['id', 'form_definition', 'version_number', 'schema_json', 'change_log']


class FormSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormSubmission
        fields = ['id', 'form_version', 'submitted_by', 'submitted_at', 'ip_address', 'status']


class FormResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormResponse
        fields = ['id', 'submission', 'field_name', 'value']
