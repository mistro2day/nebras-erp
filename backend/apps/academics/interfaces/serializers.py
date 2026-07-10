from rest_framework import serializers
from apps.academics.domain.models import (
    AcademicYear, Term, AcademicCalendarEvent, Stage, Grade, Section, SchoolShift, TeachingPeriod
)
from apps.academics.domain.subjects import (
    SubjectGroup, SubjectCategory, Subject, SubjectPrerequisite, Curriculum, CurriculumVersion, GradeCurriculum
)

class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']


class TermSerializer(serializers.ModelSerializer):
    class Meta:
        model = Term
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']


class AcademicCalendarEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicCalendarEvent
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']


class StageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stage
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']


class GradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Grade
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']


class SectionSerializer(serializers.ModelSerializer):
    occupied_seats = serializers.IntegerField(read_only=True)
    available_seats = serializers.IntegerField(read_only=True)

    class Meta:
        model = Section
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']


class SubjectGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubjectGroup
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']


class SubjectCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SubjectCategory
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']


class SubjectSerializer(serializers.ModelSerializer):
    grade_name = serializers.CharField(source='grade.name', read_only=True)
    stage_id = serializers.UUIDField(source='grade.stage_id', read_only=True)
    stage_name = serializers.CharField(source='grade.stage.name', read_only=True)
    stage_order = serializers.IntegerField(source='grade.stage.order', read_only=True)
    grade_order = serializers.IntegerField(source='grade.order', read_only=True)

    class Meta:
        model = Subject
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']


class CurriculumSerializer(serializers.ModelSerializer):
    class Meta:
        model = Curriculum
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']


class CurriculumVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CurriculumVersion
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']