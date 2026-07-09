from rest_framework import serializers
from apps.admissions.domain.models import (
    Applicant, Guardian, RequiredDocument, Interview, PlacementTest, AdmissionSettings,
)


class AdmissionSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdmissionSettings
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id', 'created_at', 'updated_at', 'deleted_at']

class RequiredDocumentSerializer(serializers.ModelSerializer):
    applicant_name = serializers.ReadOnlyField(source='applicant.arabic_full_name')
    application_number = serializers.ReadOnlyField(source='applicant.application_number')

    class Meta:
        model = RequiredDocument
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']


class GuardianSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guardian
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']


class ApplicantSerializer(serializers.ModelSerializer):
    guardians = GuardianSerializer(many=True, read_only=True)
    documents = RequiredDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Applicant
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id', 'application_number']


class InterviewSerializer(serializers.ModelSerializer):
    interviewer_name = serializers.SerializerMethodField()

    class Meta:
        model = Interview
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']

    def get_interviewer_name(self, obj):
        try:
            from apps.identity.domain.models import User
            user = User.objects.filter(id=obj.interviewer_id).first()
            return user.get_full_name() if user else None
        except Exception:
            return None


class PlacementTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlacementTest
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']