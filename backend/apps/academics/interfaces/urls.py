from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.academics.interfaces.views import (
    AcademicYearViewSet, TermViewSet, AcademicCalendarEventViewSet, 
    StageViewSet, GradeViewSet, SectionViewSet, SubjectGroupViewSet, 
    SubjectCategoryViewSet, SubjectViewSet, CurriculumViewSet, CurriculumVersionViewSet
)

router = DefaultRouter()
router.register('academic-years', AcademicYearViewSet, basename='academic-year')
router.register('terms', TermViewSet, basename='term')
router.register('calendar-events', AcademicCalendarEventViewSet, basename='calendar-event')
router.register('stages', StageViewSet, basename='stage')
router.register('grades', GradeViewSet, basename='grade')
router.register('sections', SectionViewSet, basename='section')
router.register('subject-groups', SubjectGroupViewSet, basename='subject-group')
router.register('subject-categories', SubjectCategoryViewSet, basename='subject-category')
router.register('subjects', SubjectViewSet, basename='subject')
router.register('curriculums', CurriculumViewSet, basename='curriculum')
router.register('curriculum-versions', CurriculumVersionViewSet, basename='curriculum-version')

urlpatterns = [
    path('', include(router.urls)),
]