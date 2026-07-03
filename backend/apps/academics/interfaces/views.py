from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
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