from rest_framework import viewsets, status
from rest_framework.decorators import action
from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.common.responses import StandardResponse
from datetime import datetime

from apps.scheduling.domain.models import (
    Schedule,
    ScheduleResource,
    ScheduleTemplate,
    ScheduleVersion,
    TimeSlot,
    ScheduleRule,
    ScheduleAvailability,
    ScheduleEvent,
    ScheduleException,
    ScheduleHoliday,
    Reservation,
    ReservationApproval,
    ScheduleConflict
)
from apps.scheduling.interfaces.serializers import (
    ScheduleSerializer,
    ScheduleResourceSerializer,
    ScheduleTemplateSerializer,
    ScheduleVersionSerializer,
    TimeSlotSerializer,
    ScheduleRuleSerializer,
    ScheduleAvailabilitySerializer,
    ScheduleEventSerializer,
    ScheduleExceptionSerializer,
    ScheduleHolidaySerializer,
    ReservationSerializer,
    ReservationApprovalSerializer,
    ScheduleConflictSerializer
)
from apps.scheduling.application.services import ConflictDetectionService, ReservationService


class ScheduleViewSet(BaseCRUDViewSet):
    model_class = Schedule
    serializer_class = ScheduleSerializer


class ScheduleResourceViewSet(BaseCRUDViewSet):
    model_class = ScheduleResource
    serializer_class = ScheduleResourceSerializer


class ScheduleTemplateViewSet(BaseCRUDViewSet):
    model_class = ScheduleTemplate
    serializer_class = ScheduleTemplateSerializer


class ScheduleVersionViewSet(BaseCRUDViewSet):
    model_class = ScheduleVersion
    serializer_class = ScheduleVersionSerializer


class TimeSlotViewSet(BaseCRUDViewSet):
    model_class = TimeSlot
    serializer_class = TimeSlotSerializer


class ScheduleRuleViewSet(BaseCRUDViewSet):
    model_class = ScheduleRule
    serializer_class = ScheduleRuleSerializer


class ScheduleAvailabilityViewSet(BaseCRUDViewSet):
    model_class = ScheduleAvailability
    serializer_class = ScheduleAvailabilitySerializer


class ScheduleEventViewSet(BaseCRUDViewSet):
    model_class = ScheduleEvent
    serializer_class = ScheduleEventSerializer


class ScheduleExceptionViewSet(BaseCRUDViewSet):
    model_class = ScheduleException
    serializer_class = ScheduleExceptionSerializer


class ScheduleHolidayViewSet(BaseCRUDViewSet):
    model_class = ScheduleHoliday
    serializer_class = ScheduleHolidaySerializer


class ReservationViewSet(BaseCRUDViewSet):
    model_class = Reservation
    serializer_class = ReservationSerializer

    @action(detail=False, methods=['post'], url_path='check-conflicts')
    def check_conflicts(self, request):
        resource_id = request.data.get('resource_id')
        date_str = request.data.get('date')
        start_str = request.data.get('start_time')
        end_str = request.data.get('end_time')

        if not all([resource_id, date_str, start_str, end_str]):
            return StandardResponse(
                data=None,
                message="يرجى تزويد كافة المعطيات المطلوبة (resource_id, date, start_time, end_time).",
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            date_val = datetime.strptime(date_str, "%Y-%m-%d").date()
            start_time = datetime.strptime(start_str, "%H:%M:%S").time()
            end_time = datetime.strptime(end_str, "%H:%M:%S").time()
        except ValueError:
            return StandardResponse(
                data=None,
                message="صيغة الوقت أو التاريخ غير صالحة. يرجى استخدام YYYY-MM-DD و HH:MM:SS",
                status=status.HTTP_400_BAD_REQUEST
            )

        conflicts = ConflictDetectionService.detect_conflicts_for_resource(
            resource_id=resource_id,
            date_val=date_val,
            start_time=start_time,
            end_time=end_time
        )

        return StandardResponse(
            data={'conflicts': conflicts, 'has_conflicts': len(conflicts) > 0},
            message="تم فحص التعارضات بنجاح."
        )


class ReservationApprovalViewSet(BaseCRUDViewSet):
    model_class = ReservationApproval
    serializer_class = ReservationApprovalSerializer


class ScheduleConflictViewSet(BaseCRUDViewSet):
    model_class = ScheduleConflict
    serializer_class = ScheduleConflictSerializer