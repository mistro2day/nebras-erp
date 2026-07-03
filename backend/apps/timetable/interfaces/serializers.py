from rest_framework import serializers
from apps.timetable.domain.models import (
    AcademicTimetable,
    TimetableVersion,
    TimetableTemplate,
    ClassPeriod,
    TimetableEntry,
    TeachingLoad,
    TeachingAssignment,
    SubjectDistribution,
    ClassSchedule,
    TeacherSchedule,
    RoomSchedule,
    ScheduleApproval,
    ScheduleHistory,
    SchedulePublish,
    ScheduleStatistics
)

class AcademicTimetableSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicTimetable
        fields = '__all__'


class TimetableVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimetableVersion
        fields = '__all__'


class TimetableTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimetableTemplate
        fields = '__all__'


class ClassPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassPeriod
        fields = '__all__'


class TimetableEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = TimetableEntry
        fields = '__all__'


class TeachingLoadSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeachingLoad
        fields = '__all__'


class TeachingAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeachingAssignment
        fields = '__all__'


class SubjectDistributionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubjectDistribution
        fields = '__all__'


class ClassScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassSchedule
        fields = '__all__'


class TeacherScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherSchedule
        fields = '__all__'


class RoomScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomSchedule
        fields = '__all__'


class ScheduleApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleApproval
        fields = '__all__'


class ScheduleHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleHistory
        fields = '__all__'


class SchedulePublishSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchedulePublish
        fields = '__all__'


class ScheduleStatisticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleStatistics
        fields = '__all__'