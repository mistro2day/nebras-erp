from rest_framework import serializers
from apps.employees.domain.models import (
    Employee, 
    EmployeeProfile, 
    EmployeeStatusHistory,
    EmployeeDependent,
    EmployeeReference,
    EmployeePriorExperience,
    EmployeeAdvance
)

class EmployeeDependentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeDependent
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']

class EmployeeReferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeReference
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']

class EmployeePriorExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeePriorExperience
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']

class EmployeeAdvanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name_ar', read_only=True)
    class Meta:
        model = EmployeeAdvance
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']

class EmployeeSerializer(serializers.ModelSerializer):
    dependents = EmployeeDependentSerializer(many=True, required=False)
    references = EmployeeReferenceSerializer(many=True, required=False)
    prior_experiences = EmployeePriorExperienceSerializer(many=True, required=False)
    advances = EmployeeAdvanceSerializer(many=True, required=False, read_only=True)

    class Meta:
        model = Employee
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id', 'employee_number']

    def create(self, validated_data):
        dependents_data = validated_data.pop('dependents', [])
        references_data = validated_data.pop('references', [])
        prior_experiences_data = validated_data.pop('prior_experiences', [])

        employee = super().create(validated_data)

        # حفظ أبناء المعلم بالمدرسة
        for dep in dependents_data:
            EmployeeDependent.objects.create(tenant_id=employee.tenant_id, employee=employee, **dep)

        # حفظ المراجع
        for ref in references_data:
            EmployeeReference.objects.create(tenant_id=employee.tenant_id, employee=employee, **ref)

        # حفظ الخبرات السابقة
        for exp in prior_experiences_data:
            EmployeePriorExperience.objects.create(tenant_id=employee.tenant_id, employee=employee, **exp)

        return employee

    def update(self, instance, validated_data):
        dependents_data = validated_data.pop('dependents', None)
        references_data = validated_data.pop('references', None)
        prior_experiences_data = validated_data.pop('prior_experiences', None)

        employee = super().update(instance, validated_data)

        if dependents_data is not None:
            instance.dependents.all().delete()
            for dep in dependents_data:
                EmployeeDependent.objects.create(tenant_id=employee.tenant_id, employee=employee, **dep)

        if references_data is not None:
            instance.references.all().delete()
            for ref in references_data:
                EmployeeReference.objects.create(tenant_id=employee.tenant_id, employee=employee, **ref)

        if prior_experiences_data is not None:
            instance.prior_experiences.all().delete()
            for exp in prior_experiences_data:
                EmployeePriorExperience.objects.create(tenant_id=employee.tenant_id, employee=employee, **exp)

        return employee

class EmployeeProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeProfile
        fields = '__all__'

class EmployeeStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeStatusHistory
        fields = '__all__'