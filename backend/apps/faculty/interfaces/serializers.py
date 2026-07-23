from rest_framework import serializers
from apps.faculty.domain.models import FacultyMember, TeacherProfile, AcademicQualification, TeachingLicense, TeacherAssignment, TeacherAvailability

class FacultyMemberSerializer(serializers.ModelSerializer):
    """
    البيانات الشخصية تُقرأ من `Employee` (المصدر الوحيد) وتُصدَّر هنا للتوافق
    مع الواجهة والكود القائم. تعديلها يتم من موديول الموظفين لا من هنا.
    """
    employee_number = serializers.ReadOnlyField()
    national_id = serializers.ReadOnlyField()
    passport = serializers.ReadOnlyField()
    full_name_ar = serializers.ReadOnlyField()
    full_name_en = serializers.ReadOnlyField()
    gender = serializers.ReadOnlyField()
    nationality = serializers.ReadOnlyField()
    religion = serializers.ReadOnlyField()
    date_of_birth = serializers.ReadOnlyField()
    marital_status = serializers.ReadOnlyField()
    photo_url = serializers.ReadOnlyField()
    email = serializers.ReadOnlyField()
    mobile = serializers.ReadOnlyField()
    address = serializers.ReadOnlyField()

    class Meta:
        model = FacultyMember
        fields = '__all__'

class TeacherProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherProfile
        fields = '__all__'

class AcademicQualificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicQualification
        fields = '__all__'

class TeachingLicenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeachingLicense
        fields = '__all__'

class TeacherAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherAssignment
        fields = '__all__'

class TeacherAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherAvailability
        fields = '__all__'