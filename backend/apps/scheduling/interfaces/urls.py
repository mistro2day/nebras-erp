from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.scheduling.interfaces.views import (
    ScheduleViewSet,
    ScheduleResourceViewSet,
    ScheduleTemplateViewSet,
    ScheduleVersionViewSet,
    TimeSlotViewSet,
    ScheduleRuleViewSet,
    ScheduleAvailabilityViewSet,
    ScheduleEventViewSet,
    ScheduleExceptionViewSet,
    ScheduleHolidayViewSet,
    ReservationViewSet,
    ReservationApprovalViewSet,
    ScheduleConflictViewSet
)

router = DefaultRouter()
router.register('schedules', ScheduleViewSet, basename='schedule')
router.register('resources', ScheduleResourceViewSet, basename='resource')
router.register('templates', ScheduleTemplateViewSet, basename='template')
router.register('versions', ScheduleVersionViewSet, basename='version')
router.register('time-slots', TimeSlotViewSet, basename='time-slot')
router.register('rules', ScheduleRuleViewSet, basename='rule')
router.register('availabilities', ScheduleAvailabilityViewSet, basename='availability')
router.register('events', ScheduleEventViewSet, basename='event')
router.register('exceptions', ScheduleExceptionViewSet, basename='exception')
router.register('holidays', ScheduleHolidayViewSet, basename='holiday')
router.register('reservations', ReservationViewSet, basename='reservation')
router.register('approvals', ReservationApprovalViewSet, basename='approval')
router.register('conflicts', ScheduleConflictViewSet, basename='conflict')

urlpatterns = [
    path('', include(router.urls)),
]