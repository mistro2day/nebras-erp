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
    stage_name = serializers.CharField(source='stage.name', read_only=True)

    class Meta:
        model = Grade
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']

    def validate(self, attrs):
        stage = attrs.get('stage') or getattr(self.instance, 'stage', None)
        if stage:
            stage_name = (getattr(stage, 'name', '') or '').lower()
            stage_code = (getattr(stage, 'code', '') or '').lower()
            # فحص ما إذا كانت المرحلة رياض أطفال
            is_kindergarten = any(k in stage_name or k in stage_code for k in ['روض', 'رياض', 'kg', 'kindergarten'])
            if is_kindergarten:
                # الروضة لا توجد بها نسبة نجاح (تقييم وصفي مهاراتي مستمر)
                attrs['passing_percentage'] = None
        return attrs


class SectionSerializer(serializers.ModelSerializer):
    occupied_seats = serializers.IntegerField(read_only=True)
    available_seats = serializers.IntegerField(read_only=True)
    occupancy_percentage = serializers.SerializerMethodField()
    grade_name = serializers.CharField(source='grade.name', read_only=True)

    class Meta:
        model = Section
        fields = '__all__'
        read_only_fields = ['id', 'tenant_id']

    def get_occupancy_percentage(self, obj) -> float:
        cap = getattr(obj, 'capacity', 0) or 0
        if cap <= 0:
            return 0.0
        occupied = getattr(obj, 'occupied_seats', 0) or 0
        return min(100.0, round((occupied / cap) * 100, 1))


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