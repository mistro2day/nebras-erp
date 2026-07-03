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