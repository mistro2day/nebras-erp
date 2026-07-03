from rest_framework import serializers
from apps.employees.domain.models import Employee, EmployeeProfile, EmployeeStatusHistory

class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = '__all__'

class EmployeeProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeProfile
        fields = '__all__'

class EmployeeStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeStatusHistory
        fields = '__all__'