from rest_framework import serializers
from apps.attendance.domain.models import AttendancePolicy, WorkShift, AttendanceRecord, CorrectionRequest

class AttendancePolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendancePolicy
        fields = '__all__'

class WorkShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkShift
        fields = '__all__'

class AttendanceRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.full_name_ar')
    department = serializers.ReadOnlyField(source='employee.department')
    position = serializers.ReadOnlyField(source='employee.position')

    class Meta:
        model = AttendanceRecord
        fields = [
            'id', 'employee', 'employee_name', 'department', 'position',
            'date', 'check_in', 'check_out', 'status', 'late_minutes', 'overtime_minutes'
        ]

class CorrectionRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = CorrectionRequest
        fields = '__all__'