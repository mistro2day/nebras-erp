from rest_framework import serializers
from apps.examinations.domain.models import (
    ExamCategory, ExamType, Exam, ExamSession, ExamSchedule, ExamRoom,
    ExamSupervisor, ExamPaper, ExamTemplate, ExamQuestionBank, Question,
    QuestionOption, QuestionDifficulty, QuestionTag, Assessment,
    AssessmentItem, AssessmentWeight, GradingScheme, GradeScale,
    StudentExam, StudentAssessment, StudentMark, MarkEntry, MarkApproval,
    ExamAttendance, ExamIncident, ExamAppeal, ExamResult, Transcript,
    AcademicStanding, ExamStatistics, ExamAudit
)


class ServerFieldsReadOnlyMixin:
    """يجعل الحقول التي يولّدها/يحقنها الخادم للقراءة فقط.

    نماذج الامتحانات تستخدم `fields='__all__'`، ما يجعل `tenant_id` (وطوابع
    التدقيق) حقولاً مطلوبة في التحقق بينما تُحقن فعلياً وقت الحفظ في
    `BaseCRUDViewSet.create`. بدون هذا المِكسِن يفشل أي إنشاء عبر الـ API
    برسالة «هذا الحقل مطلوب» على `tenant_id`.
    """
    SERVER_FIELDS = (
        'id', 'tenant_id', 'created_at', 'updated_at',
        'created_by', 'updated_by', 'deleted_at',
    )

    def get_fields(self):
        fields = super().get_fields()
        for name in self.SERVER_FIELDS:
            if name in fields:
                fields[name].read_only = True
        return fields


class ExamCategorySerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = ExamCategory
        fields = '__all__'


class ExamTypeSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = ExamType
        fields = '__all__'


class ExamSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = Exam
        fields = '__all__'
        # رمز الامتحان يُولَّد تلقائياً في الخادم عند الإنشاء (لا يُدخله العميل).
        read_only_fields = ('code',)


class ExamSessionSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = ExamSession
        fields = '__all__'


class ExamScheduleSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = ExamSchedule
        fields = '__all__'


class ExamRoomSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = ExamRoom
        fields = '__all__'


class ExamSupervisorSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = ExamSupervisor
        fields = '__all__'


class ExamPaperSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = ExamPaper
        fields = '__all__'


class ExamTemplateSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = ExamTemplate
        fields = '__all__'


class ExamQuestionBankSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = ExamQuestionBank
        fields = '__all__'


class QuestionSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = '__all__'


class QuestionOptionSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = '__all__'


class QuestionDifficultySerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = QuestionDifficulty
        fields = '__all__'


class QuestionTagSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = QuestionTag
        fields = '__all__'


class AssessmentSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = Assessment
        fields = '__all__'


class AssessmentItemSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = AssessmentItem
        fields = '__all__'


class AssessmentWeightSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = AssessmentWeight
        fields = '__all__'


class GradingSchemeSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = GradingScheme
        fields = '__all__'


class GradeScaleSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = GradeScale
        fields = '__all__'


class StudentExamSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = StudentExam
        fields = '__all__'


class StudentAssessmentSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = StudentAssessment
        fields = '__all__'


class StudentMarkSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = StudentMark
        fields = '__all__'


class MarkEntrySerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = MarkEntry
        fields = '__all__'


class MarkApprovalSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = MarkApproval
        fields = '__all__'


class ExamAttendanceSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = ExamAttendance
        fields = '__all__'


class ExamIncidentSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = ExamIncident
        fields = '__all__'


class ExamAppealSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = ExamAppeal
        fields = '__all__'


class ExamResultSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = ExamResult
        fields = '__all__'


class TranscriptSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = Transcript
        fields = '__all__'


class AcademicStandingSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = AcademicStanding
        fields = '__all__'


class ExamStatisticsSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = ExamStatistics
        fields = '__all__'


class ExamAuditSerializer(ServerFieldsReadOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = ExamAudit
        fields = '__all__'


# ============================================================
# معاملات الإدخال والاعتماد والطعن
# ============================================================
class EnterMarkSerializer(serializers.Serializer):
    marks_obtained = serializers.DecimalField(max_digits=5, decimal_places=2)


class ResolveAppealSerializer(serializers.Serializer):
    new_marks = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
