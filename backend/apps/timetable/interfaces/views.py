from rest_framework import viewsets, status
from rest_framework.decorators import action
from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.common.responses import StandardResponse

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
    ScheduleStatistics
)
from apps.timetable.interfaces.serializers import (
    AcademicTimetableSerializer,
    TimetableVersionSerializer,
    TimetableTemplateSerializer,
    ClassPeriodSerializer,
    TimetableEntrySerializer,
    TeachingLoadSerializer,
    TeachingAssignmentSerializer,
    SubjectDistributionSerializer,
    ClassScheduleSerializer,
    TeacherScheduleSerializer,
    RoomScheduleSerializer,
    ScheduleApprovalSerializer,
    ScheduleHistorySerializer,
    SchedulePublishSerializer,
    ScheduleStatisticsSerializer
)
from apps.timetable.application.services import TimetableOrchestratorService
from apps.faculty.domain.models import FacultyMember


class AcademicTimetableViewSet(BaseCRUDViewSet):
    model_class = AcademicTimetable
    serializer_class = AcademicTimetableSerializer


class TimetableVersionViewSet(BaseCRUDViewSet):
    model_class = TimetableVersion
    serializer_class = TimetableVersionSerializer


class TimetableTemplateViewSet(BaseCRUDViewSet):
    model_class = TimetableTemplate
    serializer_class = TimetableTemplateSerializer


class ClassPeriodViewSet(BaseCRUDViewSet):
    model_class = ClassPeriod
    serializer_class = ClassPeriodSerializer


class TimetableEntryViewSet(BaseCRUDViewSet):
    model_class = TimetableEntry
    serializer_class = TimetableEntrySerializer

    @action(detail=False, methods=['post'], url_path='validate-entry')
    def validate_entry(self, request):
        """فحص والتحقق من الحصة الدراسية وحجزها"""
        day_of_week = request.data.get('day_of_week')
        period_id = request.data.get('period_id')
        teacher_id = request.data.get('teacher_id')
        subject_id = request.data.get('subject_id')
        room_id = request.data.get('room_id')
        grade_section_id = request.data.get('grade_section_id')
        timetable_id = request.data.get('timetable_id')

        try:
            period = ClassPeriod.objects.get(id=period_id)
            teacher = FacultyMember.objects.get(id=teacher_id)
        except (ClassPeriod.DoesNotExist, FacultyMember.DoesNotExist):
            return StandardResponse(
                data=None,
                message="المعلم أو الحصة الدراسية غير متوفرة.",
                status=status.HTTP_400_BAD_REQUEST
            )

        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None

        entry, conflicts = TimetableOrchestratorService.validate_and_add_entry(
            tenant_id=tenant_id,
            timetable_id=timetable_id,
            day_of_week=day_of_week,
            period=period,
            teacher=teacher,
            subject_id=subject_id,
            room_id=room_id,
            grade_section_id=grade_section_id
        )

        if len(conflicts) > 0:
            return StandardResponse(
                data={'conflicts': conflicts, 'success': False},
                message="فشل الحجز لوجود تعارض أو خرق لقواعد العمل."
            )

        return StandardResponse(
            data=TimetableEntrySerializer(entry).data,
            message="تمت إضافة الحصة بنجاح."
        )


class TeachingLoadViewSet(BaseCRUDViewSet):
    model_class = TeachingLoad
    serializer_class = TeachingLoadSerializer


class TeachingAssignmentViewSet(BaseCRUDViewSet):
    model_class = TeachingAssignment
    serializer_class = TeachingAssignmentSerializer


class SubjectDistributionViewSet(BaseCRUDViewSet):
    model_class = SubjectDistribution
    serializer_class = SubjectDistributionSerializer


class ClassScheduleViewSet(BaseCRUDViewSet):
    model_class = ClassSchedule
    serializer_class = ClassScheduleSerializer


class TeacherScheduleViewSet(BaseCRUDViewSet):
    model_class = TeacherSchedule
    serializer_class = TeacherScheduleSerializer


class RoomScheduleViewSet(BaseCRUDViewSet):
    model_class = RoomSchedule
    serializer_class = RoomScheduleSerializer


class ScheduleApprovalViewSet(BaseCRUDViewSet):
    model_class = ScheduleApproval
    serializer_class = ScheduleApprovalSerializer


class ScheduleHistoryViewSet(BaseCRUDViewSet):
    model_class = ScheduleHistory
    serializer_class = ScheduleHistorySerializer


class SchedulePublishViewSet(BaseCRUDViewSet):
    model_class = SchedulePublish
    serializer_class = SchedulePublishSerializer


class ScheduleStatisticsViewSet(BaseCRUDViewSet):
    model_class = ScheduleStatistics
    serializer_class = ScheduleStatisticsSerializer