from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.timetable.interfaces.views import (
    AcademicTimetableViewSet,
    TimetableVersionViewSet,
    TimetableTemplateViewSet,
    ClassPeriodViewSet,
    TimetableEntryViewSet,
    TeachingLoadViewSet,
    TeachingAssignmentViewSet,
    SubjectDistributionViewSet,
    ClassScheduleViewSet,
    TeacherScheduleViewSet,
    RoomScheduleViewSet,
    ScheduleApprovalViewSet,
    ScheduleHistoryViewSet,
    SchedulePublishViewSet,
    ScheduleStatisticsViewSet
)

router = DefaultRouter()
router.register('timetables', AcademicTimetableViewSet, basename='timetable')
router.register('versions', TimetableVersionViewSet, basename='version')
router.register('templates', TimetableTemplateViewSet, basename='template')
router.register('periods', ClassPeriodViewSet, basename='period')
router.register('entries', TimetableEntryViewSet, basename='entry')
router.register('loads', TeachingLoadViewSet, basename='load')
router.register('assignments', TeachingAssignmentViewSet, basename='assignment')
router.register('distributions', SubjectDistributionViewSet, basename='distribution')
router.register('class-schedules', ClassScheduleViewSet, basename='class-schedule')
router.register('teacher-schedules', TeacherScheduleViewSet, basename='teacher-schedule')
router.register('room-schedules', RoomScheduleViewSet, basename='room-schedule')
router.register('approvals', ScheduleApprovalViewSet, basename='approval')
router.register('histories', ScheduleHistoryViewSet, basename='history')
router.register('publications', SchedulePublishViewSet, basename='publication')
router.register('statistics', ScheduleStatisticsViewSet, basename='statistic')

urlpatterns = [
    path('', include(router.urls)),
]