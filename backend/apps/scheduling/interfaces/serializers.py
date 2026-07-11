from rest_framework import serializers
from apps.scheduling.domain.models import (
    Schedule,
    ScheduleResource,
    ScheduleTemplate,
    ScheduleVersion,
    TimeSlot,
    ScheduleRule,
    ScheduleAvailability,
    ScheduleEvent,
    ScheduleException,
    ScheduleHoliday,
    Reservation,
    ReservationApproval,
    ScheduleConflict
)

class ScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Schedule
        fields = '__all__'


class ScheduleResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleResource
        fields = '__all__'


class ScheduleTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleTemplate
        fields = '__all__'


class ScheduleVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleVersion
        fields = '__all__'


class TimeSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeSlot
        fields = '__all__'


class ScheduleRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleRule
        fields = '__all__'


class ScheduleAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleAvailability
        fields = '__all__'


class ScheduleEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleEvent
        fields = '__all__'


class ScheduleExceptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleException
        fields = '__all__'


class ScheduleHolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleHoliday
        fields = '__all__'


class ReservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reservation
        fields = '__all__'
        read_only_fields = ['tenant_id', 'created_by', 'updated_by']


class ReservationApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReservationApproval
        fields = '__all__'


class ScheduleConflictSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleConflict
        fields = '__all__'