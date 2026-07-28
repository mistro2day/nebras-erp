from rest_framework import serializers
from apps.attendance.domain.models import AttendancePolicy, WorkShift, AttendanceRecord, CorrectionRequest, AttendanceSheet

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
            'date', 'check_in', 'check_out', 'check_in_lat', 'check_in_lng',
            'check_out_lat', 'check_out_lng', 'device_id', 'verification_method',
            'status', 'late_minutes', 'overtime_minutes', 'notes'
        ]

class CorrectionRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = CorrectionRequest
        fields = '__all__'

class AttendanceSheetSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceSheet
        fields = '__all__'