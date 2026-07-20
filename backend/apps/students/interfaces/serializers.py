from rest_framework import serializers
from apps.students.domain.models import (
    Student, StudentProfile, StudentMedicalProfile, StudentAddress,
    StudentEmergencyContact, StudentFamilyRelation, StudentAttachment,
    StudentEnrollment, StudentPromotionHistory, StudentStatusHistory,
    StudentNote, StudentTag, StudentIdentifier, StudentCommunicationPreference,
    StudentCustomField, StudentArchive, StudentTransfer, StudentWithdrawal,
    StudentGraduation, StudentAlumni
)

class StudentProfileSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = StudentProfile
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id', 'student']

    def get_photo_url(self, obj):
        if obj.photo:
            from apps.platform.domain.models import AttachmentMetadata
            try:
                meta = AttachmentMetadata.objects.get(file_asset_id=obj.photo)
                request = self.context.get('request')
                url = f"/media/{meta.storage_path}"
                if request:
                    return request.build_absolute_uri(url)
                return url
            except AttachmentMetadata.DoesNotExist:
                return None
        return None


class StudentMedicalProfileSerializer(serializers.ModelSerializer):
    """يعرض الحقائق الطبية من سجلّات العيادة — مرجعها الوحيد.

    شكل المخرجات يبقى كما تتوقّعه شاشات الطالب (allergies / chronic_diseases
    / …) بينما صار مصدرها جداول العيادة، فلا تنكسر الشاشات ولا يتعدّد المصدر.
    أعمدة JSON في هذا النموذج لم تعد تُقرأ.
    """
    allergies = serializers.SerializerMethodField()
    chronic_diseases = serializers.SerializerMethodField()
    medication = serializers.SerializerMethodField()
    medical_notes = serializers.SerializerMethodField()
    blood_group = serializers.SerializerMethodField()
    disabilities = serializers.SerializerMethodField()

    class Meta:
        model = StudentMedicalProfile
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id', 'student']

    def _intake(self, obj):
        from apps.clinic.application.profile_service import read_intake
        cached = getattr(obj, '_clinic_intake', None)
        if cached is None:
            cached = read_intake(obj.tenant_id, 'student', obj.student_id)
            setattr(obj, '_clinic_intake', cached)
        return cached

    def get_allergies(self, obj):
        return self._intake(obj)['allergies']

    def get_chronic_diseases(self, obj):
        return self._intake(obj)['chronic_diseases']

    def get_medication(self, obj):
        return self._intake(obj)['medication']

    def get_medical_notes(self, obj):
        return self._intake(obj)['medical_notes']

    def get_blood_group(self, obj):
        return self._intake(obj)['blood_group']

    def get_disabilities(self, obj):
        return self._intake(obj)['disabilities']


class StudentAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentAddress
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id', 'student']


class StudentEmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentEmergencyContact
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id', 'student']


class StudentFamilyRelationSerializer(serializers.ModelSerializer):
    is_portal_active = serializers.SerializerMethodField()

    class Meta:
        model = StudentFamilyRelation
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id', 'student']

    def get_is_portal_active(self, obj):
        if not obj.email:
            return False
        from apps.portal.domain.models import PortalUser
        return PortalUser.objects.filter(user__email=obj.email, user_type='parent').exists()


class StudentAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentAttachment
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id', 'student']


class StudentEnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentEnrollment
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id', 'student']


class StudentPromotionHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentPromotionHistory
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id', 'student']


class StudentStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentStatusHistory
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id', 'student']


class StudentNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentNote
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id', 'student']


class StudentTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentTag
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id', 'student']


class StudentIdentifierSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentIdentifier
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id', 'student']


class StudentCommunicationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentCommunicationPreference
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id', 'student']


class StudentCustomFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentCustomField
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id', 'student']


class StudentArchiveSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentArchive
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id', 'student']


class StudentTransferSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentTransfer
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id', 'student']


class StudentWithdrawalSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentWithdrawal
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id', 'student']


class StudentGraduationSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentGraduation
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id', 'student']


class StudentAlumniSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentAlumni
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id', 'student']


class StudentSerializer(serializers.ModelSerializer):
    """
    الـ Serializer الرئيسي للطالب مع الحقول المتداخلة
    """
    profile = StudentProfileSerializer(read_only=True)
    medical_profile = StudentMedicalProfileSerializer(read_only=True)
    addresses = StudentAddressSerializer(many=True, read_only=True)
    family_relations = StudentFamilyRelationSerializer(many=True, read_only=True)
    enrollments = StudentEnrollmentSerializer(many=True, read_only=True)
    tags = StudentTagSerializer(many=True, read_only=True)
    identifiers = StudentIdentifierSerializer(many=True, read_only=True)
    
    class Meta:
        model = Student
        fields = [
            'id', 'student_number', 'status', 'created_at', 'updated_at',
            'profile', 'medical_profile', 'addresses', 'family_relations',
            'enrollments', 'tags', 'identifiers'
        ]
        read_only_fields = ['id', 'student_number', 'status']