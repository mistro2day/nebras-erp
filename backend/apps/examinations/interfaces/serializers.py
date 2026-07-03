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


class ExamCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamCategory
        fields = '__all__'


class ExamTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamType
        fields = '__all__'


class ExamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exam
        fields = '__all__'


class ExamSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamSession
        fields = '__all__'


class ExamScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamSchedule
        fields = '__all__'


class ExamRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamRoom
        fields = '__all__'


class ExamSupervisorSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamSupervisor
        fields = '__all__'


class ExamPaperSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamPaper
        fields = '__all__'


class ExamTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamTemplate
        fields = '__all__'


class ExamQuestionBankSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamQuestionBank
        fields = '__all__'


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = '__all__'


class QuestionOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = '__all__'


class QuestionDifficultySerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionDifficulty
        fields = '__all__'


class QuestionTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionTag
        fields = '__all__'


class AssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assessment
        fields = '__all__'


class AssessmentItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentItem
        fields = '__all__'


class AssessmentWeightSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentWeight
        fields = '__all__'


class GradingSchemeSerializer(serializers.ModelSerializer):
    class Meta:
        model = GradingScheme
        fields = '__all__'


class GradeScaleSerializer(serializers.ModelSerializer):
    class Meta:
        model = GradeScale
        fields = '__all__'


class StudentExamSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentExam
        fields = '__all__'


class StudentAssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentAssessment
        fields = '__all__'


class StudentMarkSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentMark
        fields = '__all__'


class MarkEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = MarkEntry
        fields = '__all__'


class MarkApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarkApproval
        fields = '__all__'


class ExamAttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamAttendance
        fields = '__all__'


class ExamIncidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamIncident
        fields = '__all__'


class ExamAppealSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamAppeal
        fields = '__all__'


class ExamResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamResult
        fields = '__all__'


class TranscriptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transcript
        fields = '__all__'


class AcademicStandingSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicStanding
        fields = '__all__'


class ExamStatisticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamStatistics
        fields = '__all__'


class ExamAuditSerializer(serializers.ModelSerializer):
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
