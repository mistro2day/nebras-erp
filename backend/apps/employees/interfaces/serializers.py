from rest_framework import serializers
from apps.employees.domain.models import Employee, EmployeeProfile, EmployeeStatusHistory

class EmployeeSerializer(serializers.ModelSerializer):
    salary = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    allowance = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)

    class Meta:
        model = Employee
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id', 'employee_number']

    def create(self, validated_data):
        salary = validated_data.pop('salary', None)
        allowance = validated_data.pop('allowance', None)
        
        employee = super().create(validated_data)
        
        if salary is not None:
            from django.apps import apps
            try:
                SalaryStructure = apps.get_model('payroll', 'SalaryStructure')
                SalaryStructure.objects.create(
                    tenant_id=employee.tenant_id,
                    employee=employee,
                    basic_salary=salary,
                    other_allowances=allowance or 0.00
                )
            except Exception:
                pass
                
        return employee

    def update(self, instance, validated_data):
        salary = validated_data.pop('salary', None)
        allowance = validated_data.pop('allowance', None)
        
        employee = super().update(instance, validated_data)
        
        from django.apps import apps
        try:
            SalaryStructure = apps.get_model('payroll', 'SalaryStructure')
            if salary is not None:
                struct, created = SalaryStructure.objects.get_or_create(
                    tenant_id=employee.tenant_id,
                    employee=employee,
                    defaults={'basic_salary': salary, 'other_allowances': allowance or 0.00}
                )
                if not created:
                    struct.basic_salary = salary
                    if allowance is not None:
                        struct.other_allowances = allowance
                    struct.save()
        except Exception:
            pass
            
        return employee

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        try:
            ret['salary'] = instance.salary_structure.basic_salary
            ret['allowance'] = instance.salary_structure.other_allowances
        except Exception:
            ret['salary'] = None
            ret['allowance'] = None
        return ret

class EmployeeProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeProfile
        fields = '__all__'

class EmployeeStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeStatusHistory
        fields = '__all__'