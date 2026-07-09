from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from django.db.models import Count
from apps.academics.domain.models import (
    AcademicYear, Term, AcademicCalendarEvent, Stage, Grade, Section, SchoolShift, TeachingPeriod
)
from apps.academics.domain.subjects import (
    SubjectGroup, SubjectCategory, Subject, SubjectPrerequisite, Curriculum, CurriculumVersion, GradeCurriculum
)
from apps.academics.interfaces.serializers import (
    AcademicYearSerializer, TermSerializer, AcademicCalendarEventSerializer, 
    StageSerializer, GradeSerializer, SectionSerializer, SubjectGroupSerializer, 
    SubjectCategorySerializer, SubjectSerializer, CurriculumSerializer, CurriculumVersionSerializer
)
from apps.academics.application.services import AcademicValidationService
from apps.common.responses import StandardResponse, StandardPagination

class AcademicsBaseViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]

    def get_queryset(self):
        return self.model_class.objects.filter(deleted_at__isnull=True)

    def perform_create(self, serializer):
        tenant_id = self.request.tenant.id if hasattr(self.request, 'tenant') and self.request.tenant else None
        serializer.save(tenant_id=tenant_id)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return StandardResponse(None, message="تم الحذف لطيفاً بنجاح.")

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        instance = self.model_class.all_objects.get(pk=pk)
        instance.restore()
        return StandardResponse(None, message="تم استرجاع العنصر الأكاديمي بنجاح.")


class AcademicYearViewSet(AcademicsBaseViewSet):
    model_class = AcademicYear
    serializer_class = AcademicYearSerializer
    search_fields = ['name', 'code']

    def perform_create(self, serializer):
        tenant_id = self.request.tenant.id if hasattr(self.request, 'tenant') and self.request.tenant else None
        AcademicValidationService.validate_year_no_overlap(
            tenant_id,
            self.request.data.get('start_date'),
            self.request.data.get('end_date')
        )
        super().perform_create(serializer)


class TermViewSet(AcademicsBaseViewSet):
    model_class = Term
    serializer_class = TermSerializer
    search_fields = ['name', 'code']


class AcademicCalendarEventViewSet(AcademicsBaseViewSet):
    model_class = AcademicCalendarEvent
    serializer_class = AcademicCalendarEventSerializer
    search_fields = ['title', 'description']


class StageViewSet(AcademicsBaseViewSet):
    model_class = Stage
    serializer_class = StageSerializer
    search_fields = ['name', 'code']


class GradeViewSet(AcademicsBaseViewSet):
    model_class = Grade
    serializer_class = GradeSerializer
    search_fields = ['name', 'code']


class SectionViewSet(AcademicsBaseViewSet):
    model_class = Section
    serializer_class = SectionSerializer
    search_fields = ['name', 'code']


class SubjectGroupViewSet(AcademicsBaseViewSet):
    model_class = SubjectGroup
    serializer_class = SubjectGroupSerializer
    search_fields = ['name', 'code']


class SubjectCategoryViewSet(AcademicsBaseViewSet):
    model_class = SubjectCategory
    serializer_class = SubjectCategorySerializer
    search_fields = ['name', 'code']


class SubjectViewSet(AcademicsBaseViewSet):
    model_class = Subject
    serializer_class = SubjectSerializer
    search_fields = ['arabic_name', 'english_name', 'code']


class CurriculumViewSet(AcademicsBaseViewSet):
    model_class = Curriculum
    serializer_class = CurriculumSerializer
    search_fields = ['name', 'code']


class CurriculumVersionViewSet(AcademicsBaseViewSet):
    model_class = CurriculumVersion
    serializer_class = CurriculumVersionSerializer
    search_fields = ['version_code']


class AcademicDashboardStatsView(APIView):
    """
    مؤشرات اللوحة الأكاديمية المجمّعة مع ربطها بالطلاب:
    إجمالي الطلاب المسكَّنين، توزيعهم على الصفوف والمراحل، وإشغال مقاعد الشعب.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.students.domain.models import StudentEnrollment

        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None

        def scope(qs):
            return qs.filter(tenant_id=tenant_id) if tenant_id else qs

        # السنة الدراسية المستهدفة (النشطة افتراضيًا، أو عبر معامل)
        year_id = request.query_params.get('academic_year_id')
        if not year_id:
            cur = scope(AcademicYear.objects.filter(deleted_at__isnull=True, current_flag=True)).first()
            year_id = str(cur.id) if cur else None

        enrollments = StudentEnrollment.objects.filter(status='active', deleted_at__isnull=True)
        if tenant_id:
            enrollments = enrollments.filter(tenant_id=tenant_id)
        if year_id:
            enrollments = enrollments.filter(academic_year_id=year_id)

        # توزيع الطلاب على الصفوف والشعب (طلاب مميّزون لتجنّب التكرار)
        per_grade = {
            str(r['grade_id']): r['c']
            for r in enrollments.values('grade_id').annotate(c=Count('student_id', distinct=True))
            if r['grade_id']
        }
        per_section = {
            str(r['section_id']): r['c']
            for r in enrollments.values('section_id').annotate(c=Count('student_id', distinct=True))
            if r['section_id']
        }
        total_students = enrollments.values('student_id').distinct().count()
        assigned_students = sum(per_section.values())

        # إشغال المقاعد على مستوى الشعب
        sections = scope(Section.objects.filter(deleted_at__isnull=True))
        total_capacity = 0
        sections_payload = []
        for sec in sections:
            occ = per_section.get(str(sec.id), 0)
            total_capacity += sec.capacity or 0
            sections_payload.append({
                'section_id': str(sec.id),
                'grade_id': str(sec.grade_id),
                'name': sec.name,
                'gender': sec.gender,
                'capacity': sec.capacity,
                'occupied': occ,
                'available': max(0, (sec.capacity or 0) - occ),
            })

        # توزيع الطلاب على المراحل (تجميع صفوف كل مرحلة)
        grades = scope(Grade.objects.filter(deleted_at__isnull=True))
        per_stage = {}
        for g in grades:
            per_stage[str(g.stage_id)] = per_stage.get(str(g.stage_id), 0) + per_grade.get(str(g.id), 0)

        occupied_total = assigned_students
        occupancy_rate = round((occupied_total / total_capacity) * 100, 1) if total_capacity else 0

        data = {
            'academic_year_id': year_id,
            'students': {
                'total': total_students,
                'assigned': assigned_students,
                'unassigned': max(0, total_students - assigned_students),
            },
            'seats': {
                'capacity': total_capacity,
                'occupied': occupied_total,
                'available': max(0, total_capacity - occupied_total),
                'occupancy_rate': occupancy_rate,
            },
            'per_grade': per_grade,
            'per_stage': per_stage,
            'sections': sections_payload,
        }
        return StandardResponse(data, message="تم جلب مؤشرات اللوحة الأكاديمية بنجاح.")