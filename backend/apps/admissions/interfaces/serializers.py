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
    grade_name = serializers.SerializerMethodField()
    academic_year_name = serializers.SerializerMethodField()
    guardian_phone = serializers.SerializerMethodField()
    guardian_name = serializers.SerializerMethodField()

    class Meta:
        model = Applicant
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id', 'application_number']

    def get_grade_name(self, obj):
        if not getattr(obj, 'applying_grade_id', None):
            return None
        from apps.academics.domain.models import Grade
        g = Grade.objects.filter(id=obj.applying_grade_id).first()
        return g.name if g else None

    def get_academic_year_name(self, obj):
        if not getattr(obj, 'academic_year_id', None):
            return None
        from apps.academics.domain.models import AcademicYear
        ay = AcademicYear.objects.filter(id=obj.academic_year_id).first()
        return ay.name if ay else None

    def get_guardian_phone(self, obj):
        g = obj.guardians.first()
        return g.phone if g else None

    def get_guardian_name(self, obj):
        g = obj.guardians.first()
        return g.full_name if g else None


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