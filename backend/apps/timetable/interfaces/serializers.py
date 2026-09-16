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
    ScheduleStatistics,
    TimetableSubstitution
)

class BaseTimetableModelSerializer(serializers.ModelSerializer):
    class Meta:
        read_only_fields = ('id', 'tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')


class AcademicTimetableSerializer(BaseTimetableModelSerializer):
    class Meta(BaseTimetableModelSerializer.Meta):
        model = AcademicTimetable
        fields = '__all__'


class TimetableVersionSerializer(BaseTimetableModelSerializer):
    class Meta(BaseTimetableModelSerializer.Meta):
        model = TimetableVersion
        fields = '__all__'


class TimetableTemplateSerializer(BaseTimetableModelSerializer):
    class Meta(BaseTimetableModelSerializer.Meta):
        model = TimetableTemplate
        fields = '__all__'


class ClassPeriodSerializer(BaseTimetableModelSerializer):
    class Meta(BaseTimetableModelSerializer.Meta):
        model = ClassPeriod
        fields = '__all__'


class TimetableEntrySerializer(BaseTimetableModelSerializer):
    class Meta(BaseTimetableModelSerializer.Meta):
        model = TimetableEntry
        fields = '__all__'


class TeachingLoadSerializer(BaseTimetableModelSerializer):
    class Meta(BaseTimetableModelSerializer.Meta):
        model = TeachingLoad
        fields = '__all__'


class TeachingAssignmentSerializer(BaseTimetableModelSerializer):
    class Meta(BaseTimetableModelSerializer.Meta):
        model = TeachingAssignment
        fields = '__all__'


class SubjectDistributionSerializer(BaseTimetableModelSerializer):
    class Meta(BaseTimetableModelSerializer.Meta):
        model = SubjectDistribution
        fields = '__all__'


class ClassScheduleSerializer(BaseTimetableModelSerializer):
    class Meta(BaseTimetableModelSerializer.Meta):
        model = ClassSchedule
        fields = '__all__'


class TeacherScheduleSerializer(BaseTimetableModelSerializer):
    class Meta(BaseTimetableModelSerializer.Meta):
        model = TeacherSchedule
        fields = '__all__'


class RoomScheduleSerializer(BaseTimetableModelSerializer):
    class Meta(BaseTimetableModelSerializer.Meta):
        model = RoomSchedule
        fields = '__all__'


class ScheduleApprovalSerializer(BaseTimetableModelSerializer):
    class Meta(BaseTimetableModelSerializer.Meta):
        model = ScheduleApproval
        fields = '__all__'


class ScheduleHistorySerializer(BaseTimetableModelSerializer):
    class Meta(BaseTimetableModelSerializer.Meta):
        model = ScheduleHistory
        fields = '__all__'


class SchedulePublishSerializer(BaseTimetableModelSerializer):
    class Meta(BaseTimetableModelSerializer.Meta):
        model = SchedulePublish
        fields = '__all__'


class ScheduleStatisticsSerializer(BaseTimetableModelSerializer):
    class Meta(BaseTimetableModelSerializer.Meta):
        model = ScheduleStatistics
        fields = '__all__'


class TimetableSubstitutionSerializer(BaseTimetableModelSerializer):
    original_teacher_name = serializers.ReadOnlyField(source='original_teacher.full_name_ar')
    substitute_teacher_name = serializers.ReadOnlyField(source='substitute_teacher.full_name_ar')

    class Meta(BaseTimetableModelSerializer.Meta):
        model = TimetableSubstitution
        fields = '__all__'
