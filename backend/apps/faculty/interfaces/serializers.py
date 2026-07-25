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

    # بيانات مالية حقيقية من ملف الموظف (تُغني الواجهة عن أي بيانات وهمية)
    basic_salary = serializers.SerializerMethodField()
    total_allowances = serializers.SerializerMethodField()
    net_payable = serializers.SerializerMethodField()
    employment_type = serializers.SerializerMethodField()
    weekly_lesson_quota = serializers.SerializerMethodField()

    class Meta:
        model = FacultyMember
        fields = '__all__'

    def _emp(self, obj):
        return obj.employee if obj.employee_id else None

    def get_basic_salary(self, obj):
        emp = self._emp(obj)
        return float(emp.basic_salary) if emp and emp.basic_salary is not None else 0

    def get_total_allowances(self, obj):
        emp = self._emp(obj)
        if not emp:
            return 0
        return float((emp.transport_allowance or 0) + (emp.communication_allowance or 0)
                     + (emp.representation_allowance or 0))

    def get_net_payable(self, obj):
        emp = self._emp(obj)
        return float(emp.net_payable) if emp and emp.net_payable is not None else 0

    def get_employment_type(self, obj):
        emp = self._emp(obj)
        return getattr(emp, 'employment_type', None) if emp else None

    def get_weekly_lesson_quota(self, obj):
        emp = self._emp(obj)
        return getattr(emp, 'weekly_lesson_quota', None) if emp else None

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