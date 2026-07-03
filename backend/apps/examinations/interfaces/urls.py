from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.examinations.interfaces.views import (
    ExamCategoryViewSet, ExamTypeViewSet, ExamViewSet, ExamSessionViewSet,
    ExamScheduleViewSet, ExamRoomViewSet, ExamSupervisorViewSet, ExamPaperViewSet,
    ExamTemplateViewSet, ExamQuestionBankViewSet, QuestionViewSet, QuestionOptionViewSet,
    QuestionDifficultyViewSet, QuestionTagViewSet, AssessmentViewSet, AssessmentItemViewSet,
    AssessmentWeightViewSet, GradingSchemeViewSet, GradeScaleViewSet, StudentExamViewSet,
    StudentAssessmentViewSet, StudentMarkViewSet, MarkEntryViewSet, MarkApprovalViewSet,
    ExamAttendanceViewSet, ExamIncidentViewSet, ExamAppealViewSet, ExamResultViewSet,
    TranscriptViewSet, AcademicStandingViewSet, ExamStatisticsViewSet, ExamAuditViewSet
)

router = DefaultRouter()
router.register('categories', ExamCategoryViewSet, basename='category')
router.register('types', ExamTypeViewSet, basename='type')
router.register('exams', ExamViewSet, basename='exam')
router.register('sessions', ExamSessionViewSet, basename='session')
router.register('schedules', ExamScheduleViewSet, basename='schedule')
router.register('rooms', ExamRoomViewSet, basename='room')
router.register('supervisors', ExamSupervisorViewSet, basename='supervisor')
router.register('papers', ExamPaperViewSet, basename='paper')
router.register('templates', ExamTemplateViewSet, basename='template')
router.register('question-banks', ExamQuestionBankViewSet, basename='question-bank')
router.register('questions', QuestionViewSet, basename='question')
router.register('question-options', QuestionOptionViewSet, basename='question-option')
router.register('question-difficulties', QuestionDifficultyViewSet, basename='question-difficulty')
router.register('question-tags', QuestionTagViewSet, basename='question-tag')
router.register('assessments', AssessmentViewSet, basename='assessment')
router.register('assessment-items', AssessmentItemViewSet, basename='assessment-item')
router.register('assessment-weights', AssessmentWeightViewSet, basename='assessment-weight')
router.register('grading-schemes', GradingSchemeViewSet, basename='grading-scheme')
router.register('grade-scales', GradeScaleViewSet, basename='grade-scale')
router.register('student-exams', StudentExamViewSet, basename='student-exam')
router.register('student-assessments', StudentAssessmentViewSet, basename='student-assessment')
router.register('student-marks', StudentMarkViewSet, basename='student-mark')
router.register('mark-entries', MarkEntryViewSet, basename='mark-entry')
router.register('mark-approvals', MarkApprovalViewSet, basename='mark-approval')
router.register('attendance', ExamAttendanceViewSet, basename='attendance')
router.register('incidents', ExamIncidentViewSet, basename='incident')
router.register('appeals', ExamAppealViewSet, basename='appeal')
router.register('results', ExamResultViewSet, basename='result')
router.register('transcripts', TranscriptViewSet, basename='transcript')
router.register('academic-standings', AcademicStandingViewSet, basename='academic-standing')
router.register('statistics', ExamStatisticsViewSet, basename='statistics')
router.register('audits', ExamAuditViewSet, basename='audit')

urlpatterns = [
    path('', include(router.urls)),
]
