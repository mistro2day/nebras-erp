from django.contrib import admin
from apps.examinations.domain.models import (
    ExamCategory, ExamType, Exam, ExamSession, ExamSchedule, ExamRoom,
    ExamSupervisor, ExamPaper, ExamTemplate, ExamQuestionBank, Question,
    QuestionOption, QuestionDifficulty, QuestionTag, Assessment,
    AssessmentItem, AssessmentWeight, GradingScheme, GradeScale,
    StudentExam, StudentAssessment, StudentMark, MarkEntry, MarkApproval,
    ExamAttendance, ExamIncident, ExamAppeal, ExamResult, Transcript,
    AcademicStanding, ExamStatistics, ExamAudit
)

translations = {
    ExamCategory: ('فئة امتحان', '1. فئات الامتحانات'),
    ExamType: ('نوع امتحان', '2. أنواع الامتحانات والتقييمات'),
    Exam: ('امتحان', '3. الامتحانات المجدولة والمتاحة'),
    ExamSession: ('دورة امتحانات', '4. دورات وجلسات الامتحانات'),
    ExamSchedule: ('جدول امتحان تفصيلي', '5. مواعيد وجداول الامتحانات تفصيلياً'),
    ExamRoom: ('قاعة امتحان', '6. قاعات اللجان والامتحانات'),
    ExamSupervisor: ('مراقب لجنة', '7. مراقبي اللجان الأكاديمية'),
    ExamPaper: ('ورقة امتحان مشفرة', '8. أوراق الامتحانات المشفرة'),
    ExamTemplate: ('قالب ورقة امتحان', '9. قوالب تصميم أوراق الامتحان'),
    ExamQuestionBank: ('بنك أسئلة لمادة', '10. بنوك الأسئلة للمواد الدراسية'),
    Question: ('سؤال أكاديمي', '11. الأسئلة وبنك الأسئلة تفصيلياً'),
    QuestionOption: ('خيار سؤال', '12. خيارات الأسئلة وبدائلها'),
    QuestionDifficulty: ('معامل صعوبة سؤال', '13. تحليل صعوبة وتمييز الأسئلة'),
    QuestionTag: ('وسم تصنيف سؤال', '14. وسوم تصنيف الأسئلة'),
    Assessment: ('تقييم مستمر لمادة', '15. أعمال السنة والتقييم المستمر'),
    AssessmentItem: ('بند تقييم أعمال سنة', '16. بنود وعناصر أعمال السنة'),
    AssessmentWeight: ('أوزان التقييم والمجموع', '17. توزيع أوزان الدرجات'),
    GradingScheme: ('مخطط تقديرات ودرجات', '18. مخططات توزيع التقديرات والـ GPA'),
    GradeScale: ('فئة تقدير', '19. فئات التقديرات (A, B, C, D) تفصيلياً'),
    StudentExam: ('سجل لجنة طالب', '20. توزيع مقاعد وأماكن لجان الطلاب'),
    StudentAssessment: ('سجل أعمال سنة طالب', '21. درجات الطلاب في التقييم المستمر'),
    StudentMark: ('درجة امتحان طالب', '22. كشوف رصد درجات الطلاب بالامتحانات'),
    MarkEntry: ('عملية رصد درجات دفعة', '23. عمليات رصد الدرجات وحفظ المسودات'),
    MarkApproval: ('عملية اعتماد ومراجعة درجات', '24. اعتمادات ومراجعات كشوف الدرجات المرصودة'),
    ExamAttendance: ('حضور غياب لجنة طالب', '25. كشوف حضور وغياب الطلاب باللجان'),
    ExamIncident: ('محضر مخالفة/غش طالب', '26. سجل محاضر المخالفات والغش بالامتحانات'),
    ExamAppeal: ('طلب تظلم وإعادة تصحيح', '27. تظلمات الطلاب وطلبات إعادة التصحيح'),
    ExamResult: ('نتيجة نهائية لمادة وطالب', '28. النتائج النهائية المجمعة للطلاب ومعدلاتها'),
    Transcript: ('كشف درجات رسمي معتمد', '29. كشوف الدرجات الرسمية والـ CGPA للطلاب'),
    AcademicStanding: ('حالة أكاديمية لطالب', '30. الحالات الأكاديمية للطلاب والإنذارات'),
    ExamStatistics: ('إحصائية درجات امتحان', '31. إحصائيات ونسب النجاح للامتحانات'),
    ExamAudit: ('تدقيق تعديل درجة طالب', '32. سجل وتدقيق تعديل درجات الطلاب بالمسار الأمني'),
}

for model, (verbose_name, verbose_name_plural) in translations.items():
    model._meta.verbose_name = verbose_name
    model._meta.verbose_name_plural = verbose_name_plural

admin.site.register(ExamCategory)
admin.site.register(ExamType)
admin.site.register(Exam)
admin.site.register(ExamSession)
admin.site.register(ExamSchedule)
admin.site.register(ExamRoom)
admin.site.register(ExamSupervisor)
admin.site.register(ExamPaper)
admin.site.register(ExamTemplate)
admin.site.register(ExamQuestionBank)
admin.site.register(Question)
admin.site.register(QuestionOption)
admin.site.register(QuestionDifficulty)
admin.site.register(QuestionTag)
admin.site.register(Assessment)
admin.site.register(AssessmentItem)
admin.site.register(AssessmentWeight)
admin.site.register(GradingScheme)
admin.site.register(GradeScale)
admin.site.register(StudentExam)
admin.site.register(StudentAssessment)
admin.site.register(StudentMark)
admin.site.register(MarkEntry)
admin.site.register(MarkApproval)
admin.site.register(ExamAttendance)
admin.site.register(ExamIncident)
admin.site.register(ExamAppeal)
admin.site.register(ExamResult)
admin.site.register(Transcript)
admin.site.register(AcademicStanding)
admin.site.register(ExamStatistics)
admin.site.register(ExamAudit)
