from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.shared.application.numbering import generate_unique_number
from apps.common.responses import StandardResponse

from apps.examinations.domain.models import (
    ExamCategory, ExamType, Exam, ExamSession, ExamSchedule, ExamRoom,
    ExamSupervisor, ExamPaper, ExamTemplate, ExamQuestionBank, Question,
    QuestionOption, QuestionDifficulty, QuestionTag, Assessment,
    AssessmentItem, AssessmentWeight, GradingScheme, GradeScale,
    StudentExam, StudentAssessment, StudentMark, MarkEntry, MarkApproval,
    ExamAttendance, ExamIncident, ExamAppeal, ExamResult, Transcript,
    AcademicStanding, ExamStatistics, ExamAudit
)
from apps.examinations.interfaces.serializers import (
    ExamCategorySerializer, ExamTypeSerializer, ExamSerializer, ExamSessionSerializer,
    ExamScheduleSerializer, ExamRoomSerializer, ExamSupervisorSerializer,
    ExamPaperSerializer, ExamTemplateSerializer, ExamQuestionBankSerializer,
    QuestionSerializer, QuestionOptionSerializer, QuestionDifficultySerializer,
    QuestionTagSerializer, AssessmentSerializer, AssessmentItemSerializer,
    AssessmentWeightSerializer, GradingSchemeSerializer, GradeScaleSerializer,
    StudentExamSerializer, StudentAssessmentSerializer, StudentMarkSerializer,
    MarkEntrySerializer, MarkApprovalSerializer, ExamAttendanceSerializer,
    ExamIncidentSerializer, ExamAppealSerializer, ExamResultSerializer,
    TranscriptSerializer, AcademicStandingSerializer, ExamStatisticsSerializer,
    ExamAuditSerializer, EnterMarkSerializer, ResolveAppealSerializer
)
from apps.examinations.application.services import GradingService, AppealService


class ExamCategoryViewSet(BaseCRUDViewSet):
    model_class = ExamCategory
    serializer_class = ExamCategorySerializer


class ExamTypeViewSet(BaseCRUDViewSet):
    model_class = ExamType
    serializer_class = ExamTypeSerializer


class ExamViewSet(BaseCRUDViewSet):
    model_class = Exam
    serializer_class = ExamSerializer

    def get_create_defaults(self, request):
        """رمز الامتحان يُولَّد في الخادم — يضمن التسلسل وعدم التكرار لكل مستأجر."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        return {
            'code': generate_unique_number(
                Exam, tenant_id,
                f"EX-{timezone.now().year}-", field='code', width=4),
        }


class ExamSessionViewSet(BaseCRUDViewSet):
    model_class = ExamSession
    serializer_class = ExamSessionSerializer


class ExamScheduleViewSet(BaseCRUDViewSet):
    model_class = ExamSchedule
    serializer_class = ExamScheduleSerializer


class ExamRoomViewSet(BaseCRUDViewSet):
    model_class = ExamRoom
    serializer_class = ExamRoomSerializer


class ExamSupervisorViewSet(BaseCRUDViewSet):
    model_class = ExamSupervisor
    serializer_class = ExamSupervisorSerializer


class ExamPaperViewSet(BaseCRUDViewSet):
    model_class = ExamPaper
    serializer_class = ExamPaperSerializer


class ExamTemplateViewSet(BaseCRUDViewSet):
    model_class = ExamTemplate
    serializer_class = ExamTemplateSerializer


class ExamQuestionBankViewSet(BaseCRUDViewSet):
    model_class = ExamQuestionBank
    serializer_class = ExamQuestionBankSerializer


class QuestionViewSet(BaseCRUDViewSet):
    model_class = Question
    serializer_class = QuestionSerializer


class QuestionOptionViewSet(BaseCRUDViewSet):
    model_class = QuestionOption
    serializer_class = QuestionOptionSerializer


class QuestionDifficultyViewSet(BaseCRUDViewSet):
    model_class = QuestionDifficulty
    serializer_class = QuestionDifficultySerializer


class QuestionTagViewSet(BaseCRUDViewSet):
    model_class = QuestionTag
    serializer_class = QuestionTagSerializer


class AssessmentViewSet(BaseCRUDViewSet):
    model_class = Assessment
    serializer_class = AssessmentSerializer


class AssessmentItemViewSet(BaseCRUDViewSet):
    model_class = AssessmentItem
    serializer_class = AssessmentItemSerializer


class AssessmentWeightViewSet(BaseCRUDViewSet):
    model_class = AssessmentWeight
    serializer_class = AssessmentWeightSerializer


class GradingSchemeViewSet(BaseCRUDViewSet):
    model_class = GradingScheme
    serializer_class = GradingSchemeSerializer


class GradeScaleViewSet(BaseCRUDViewSet):
    model_class = GradeScale
    serializer_class = GradeScaleSerializer


class StudentExamViewSet(BaseCRUDViewSet):
    model_class = StudentExam
    serializer_class = StudentExamSerializer

    @action(detail=True, methods=['post'], url_path='enter-mark')
    def enter_mark(self, request, pk=None):
        """رصد أو تعديل درجة الطالب مع التدقيق الأمني."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        serializer = EnterMarkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        mark = GradingService.enter_marks(
            tenant_id=tenant_id,
            student_exam_id=pk,
            marks_obtained=serializer.validated_data['marks_obtained'],
            entered_by=request.user.id if request.user else None,
            reason=request.data.get('reason')
        )
        return StandardResponse(data=StudentMarkSerializer(mark).data, message="تم رصد الدرجة بنجاح.")


class StudentAssessmentViewSet(BaseCRUDViewSet):
    model_class = StudentAssessment
    serializer_class = StudentAssessmentSerializer


class StudentMarkViewSet(BaseCRUDViewSet):
    model_class = StudentMark
    serializer_class = StudentMarkSerializer


class MarkEntryViewSet(BaseCRUDViewSet):
    model_class = MarkEntry
    serializer_class = MarkEntrySerializer


class MarkApprovalViewSet(BaseCRUDViewSet):
    model_class = MarkApproval
    serializer_class = MarkApprovalSerializer


class ExamAttendanceViewSet(BaseCRUDViewSet):
    model_class = ExamAttendance
    serializer_class = ExamAttendanceSerializer


class ExamIncidentViewSet(BaseCRUDViewSet):
    model_class = ExamIncident
    serializer_class = ExamIncidentSerializer


class ExamAppealViewSet(BaseCRUDViewSet):
    model_class = ExamAppeal
    serializer_class = ExamAppealSerializer

    @action(detail=True, methods=['post'], url_path='resolve')
    def resolve_appeal(self, request, pk=None):
        """البت في طلب التظلم والطعن."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        serializer = ResolveAppealSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        appeal = AppealService.resolve_appeal(
            tenant_id=tenant_id,
            appeal_id=pk,
            new_marks=serializer.validated_data.get('new_marks'),
            resolved_by=request.user.id if request.user else None
        )
        return StandardResponse(data=ExamAppealSerializer(appeal).data, message="تم البت في طلب التظلم بنجاح.")


class ExamResultViewSet(BaseCRUDViewSet):
    model_class = ExamResult
    serializer_class = ExamResultSerializer

    def get_queryset(self):
        """يدعم ترشيح نتائج طالب/مادة/سنة عبر باراميترات الاستعلام (لصفحة الطالب)."""
        qs = super().get_queryset()
        params = self.request.query_params
        for key in ('student_id', 'subject_id', 'academic_year', 'term'):
            value = params.get(key)
            if value:
                qs = qs.filter(**{key: value})
        return qs.order_by('subject_id', 'term')


class TranscriptViewSet(BaseCRUDViewSet):
    model_class = Transcript
    serializer_class = TranscriptSerializer


class AcademicStandingViewSet(BaseCRUDViewSet):
    model_class = AcademicStanding
    serializer_class = AcademicStandingSerializer


class ExamStatisticsViewSet(BaseCRUDViewSet):
    model_class = ExamStatistics
    serializer_class = ExamStatisticsSerializer


class ExamAuditViewSet(BaseCRUDViewSet):
    model_class = ExamAudit
    serializer_class = ExamAuditSerializer
