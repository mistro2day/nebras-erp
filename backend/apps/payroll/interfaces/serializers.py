from rest_framework import serializers
from apps.payroll.domain.models import SalaryStructure, EmployeeLoan, PayrollPeriod, PayrollRun, Payslip

class SalaryStructureSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryStructure
        fields = '__all__'

class EmployeeLoanSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeLoan
        fields = '__all__'

class PayrollPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollPeriod
        fields = '__all__'

class PayrollRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollRun
        fields = '__all__'

class PayslipSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payslip
        fields = '__all__'