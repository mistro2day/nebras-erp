from rest_framework import serializers
from apps.admissions.domain.models import Applicant, Guardian, RequiredDocument, Interview, PlacementTest

class RequiredDocumentSerializer(serializers.ModelSerializer):
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
        read_only_fields = ['id', 'tenant_id', 'application_number', 'status']


class InterviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interview
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']


class PlacementTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlacementTest
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']