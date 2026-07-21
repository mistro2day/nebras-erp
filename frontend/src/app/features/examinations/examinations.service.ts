import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiClientService } from '../../core/services/api-client.service';
import {
  ApiResp, Exam, ExamCategory, ExamType, ExamRoom, ExamSession, ExamSchedule,
  QuestionBank, Question, Assessment, AssessmentItem, AssessmentWeight,
  GradingScheme, GradeScale, StudentExam, ExamAppeal, ExamIncident, ExamResult,
  Transcript, AcademicStanding, Subject, AcademicYear, Term, Grade, Section, Student,
} from './examinations.types';

type Body = Record<string, unknown>;
type Params = Record<string, unknown>;

export interface ExamDashboardData {
  exams: Exam[]; sessions: ExamSession[]; rooms: ExamRoom[];
  appeals: ExamAppeal[]; results: ExamResult[]; incidents: ExamIncident[];
}

/**
 * خدمة الامتحانات والتقييم الأكاديمي — CRUD حقيقي على نقاط نهاية examinations/*
 * مع روابط مباشرة إلى الشؤون الأكاديمية (المواد، السنوات، الفصول، الصفوف، الشعب)
 * وإلى سجل الطلاب، لبناء تجربة مترابطة عبر الموديولات.
 */
@Injectable({ providedIn: 'root' })
export class ExaminationsService {
  private api = inject(ApiClientService);
  private base = 'examinations/';

  // ==================== مرجعيات: الفئات والأنواع والقاعات ====================
  getCategories(p?: Params): Observable<ApiResp<ExamCategory[]>> { return this.api.get(this.base + 'categories/', { page_size: 200, ...(p ?? {}) }); }
  createCategory(b: Body): Observable<ApiResp<ExamCategory>> { return this.api.post(this.base + 'categories/', b); }
  updateCategory(id: string, b: Body): Observable<ApiResp<ExamCategory>> { return this.api.patch(this.base + `categories/${id}/`, b); }
  deleteCategory(id: string): Observable<ApiResp<null>> { return this.api.delete(this.base + `categories/${id}/`); }

  getTypes(p?: Params): Observable<ApiResp<ExamType[]>> { return this.api.get(this.base + 'types/', { page_size: 200, ...(p ?? {}) }); }
  createType(b: Body): Observable<ApiResp<ExamType>> { return this.api.post(this.base + 'types/', b); }
  updateType(id: string, b: Body): Observable<ApiResp<ExamType>> { return this.api.patch(this.base + `types/${id}/`, b); }
  deleteType(id: string): Observable<ApiResp<null>> { return this.api.delete(this.base + `types/${id}/`); }

  getRooms(p?: Params): Observable<ApiResp<ExamRoom[]>> { return this.api.get(this.base + 'rooms/', { page_size: 200, ...(p ?? {}) }); }
  createRoom(b: Body): Observable<ApiResp<ExamRoom>> { return this.api.post(this.base + 'rooms/', b); }
  updateRoom(id: string, b: Body): Observable<ApiResp<ExamRoom>> { return this.api.patch(this.base + `rooms/${id}/`, b); }
  deleteRoom(id: string): Observable<ApiResp<null>> { return this.api.delete(this.base + `rooms/${id}/`); }

  // ==================== الامتحانات ====================
  getExams(p?: Params): Observable<ApiResp<Exam[]>> { return this.api.get(this.base + 'exams/', { page_size: 500, ...(p ?? {}) }); }
  getExam(id: string): Observable<ApiResp<Exam>> { return this.api.get(this.base + `exams/${id}/`); }
  createExam(b: Body): Observable<ApiResp<Exam>> { return this.api.post(this.base + 'exams/', b); }
  updateExam(id: string, b: Body): Observable<ApiResp<Exam>> { return this.api.patch(this.base + `exams/${id}/`, b); }
  deleteExam(id: string): Observable<ApiResp<null>> { return this.api.delete(this.base + `exams/${id}/`); }

  // ==================== الدورات والجداول واللجان ====================
  getSessions(p?: Params): Observable<ApiResp<ExamSession[]>> { return this.api.get(this.base + 'sessions/', { page_size: 200, ...(p ?? {}) }); }
  createSession(b: Body): Observable<ApiResp<ExamSession>> { return this.api.post(this.base + 'sessions/', b); }
  updateSession(id: string, b: Body): Observable<ApiResp<ExamSession>> { return this.api.patch(this.base + `sessions/${id}/`, b); }

  getSchedules(p?: Params): Observable<ApiResp<ExamSchedule[]>> { return this.api.get(this.base + 'schedules/', { page_size: 500, ...(p ?? {}) }); }
  createSchedule(b: Body): Observable<ApiResp<ExamSchedule>> { return this.api.post(this.base + 'schedules/', b); }
  updateSchedule(id: string, b: Body): Observable<ApiResp<ExamSchedule>> { return this.api.patch(this.base + `schedules/${id}/`, b); }
  deleteSchedule(id: string): Observable<ApiResp<null>> { return this.api.delete(this.base + `schedules/${id}/`); }

  getSupervisors(p?: Params): Observable<ApiResp<unknown[]>> { return this.api.get(this.base + 'supervisors/', { page_size: 500, ...(p ?? {}) }); }
  createSupervisor(b: Body): Observable<ApiResp<unknown>> { return this.api.post(this.base + 'supervisors/', b); }

  // ==================== بنك الأسئلة ====================
  getQuestionBanks(p?: Params): Observable<ApiResp<QuestionBank[]>> { return this.api.get(this.base + 'question-banks/', { page_size: 200, ...(p ?? {}) }); }
  createQuestionBank(b: Body): Observable<ApiResp<QuestionBank>> { return this.api.post(this.base + 'question-banks/', b); }
  getQuestions(p?: Params): Observable<ApiResp<Question[]>> { return this.api.get(this.base + 'questions/', { page_size: 500, ...(p ?? {}) }); }
  createQuestion(b: Body): Observable<ApiResp<Question>> { return this.api.post(this.base + 'questions/', b); }
  updateQuestion(id: string, b: Body): Observable<ApiResp<Question>> { return this.api.patch(this.base + `questions/${id}/`, b); }
  deleteQuestion(id: string): Observable<ApiResp<null>> { return this.api.delete(this.base + `questions/${id}/`); }
  getQuestionOptions(p?: Params): Observable<ApiResp<unknown[]>> { return this.api.get(this.base + 'question-options/', { page_size: 500, ...(p ?? {}) }); }
  createQuestionOption(b: Body): Observable<ApiResp<unknown>> { return this.api.post(this.base + 'question-options/', b); }

  // ==================== أعمال السنة والتقييم المستمر ====================
  getAssessments(p?: Params): Observable<ApiResp<Assessment[]>> { return this.api.get(this.base + 'assessments/', { page_size: 300, ...(p ?? {}) }); }
  createAssessment(b: Body): Observable<ApiResp<Assessment>> { return this.api.post(this.base + 'assessments/', b); }
  getAssessmentItems(p?: Params): Observable<ApiResp<AssessmentItem[]>> { return this.api.get(this.base + 'assessment-items/', { page_size: 500, ...(p ?? {}) }); }
  createAssessmentItem(b: Body): Observable<ApiResp<AssessmentItem>> { return this.api.post(this.base + 'assessment-items/', b); }
  getAssessmentWeights(p?: Params): Observable<ApiResp<AssessmentWeight[]>> { return this.api.get(this.base + 'assessment-weights/', { page_size: 300, ...(p ?? {}) }); }
  createAssessmentWeight(b: Body): Observable<ApiResp<AssessmentWeight>> { return this.api.post(this.base + 'assessment-weights/', b); }
  updateAssessmentWeight(id: string, b: Body): Observable<ApiResp<AssessmentWeight>> { return this.api.patch(this.base + `assessment-weights/${id}/`, b); }

  // ==================== سلالم التقديرات ====================
  getGradingSchemes(p?: Params): Observable<ApiResp<GradingScheme[]>> { return this.api.get(this.base + 'grading-schemes/', { page_size: 200, ...(p ?? {}) }); }
  createGradingScheme(b: Body): Observable<ApiResp<GradingScheme>> { return this.api.post(this.base + 'grading-schemes/', b); }
  getGradeScales(p?: Params): Observable<ApiResp<GradeScale[]>> { return this.api.get(this.base + 'grade-scales/', { page_size: 300, ...(p ?? {}) }); }
  createGradeScale(b: Body): Observable<ApiResp<GradeScale>> { return this.api.post(this.base + 'grade-scales/', b); }
  deleteGradeScale(id: string): Observable<ApiResp<null>> { return this.api.delete(this.base + `grade-scales/${id}/`); }

  // ==================== لجان الطلاب ورصد الدرجات ====================
  getStudentExams(p?: Params): Observable<ApiResp<StudentExam[]>> { return this.api.get(this.base + 'student-exams/', { page_size: 500, ...(p ?? {}) }); }
  createStudentExam(b: Body): Observable<ApiResp<StudentExam>> { return this.api.post(this.base + 'student-exams/', b); }
  enterMark(studentExamId: string, marksObtained: number, reason?: string): Observable<ApiResp<unknown>> {
    return this.api.post(this.base + `student-exams/${studentExamId}/enter-mark/`, { marks_obtained: marksObtained, reason });
  }
  getStudentMarks(p?: Params): Observable<ApiResp<unknown[]>> { return this.api.get(this.base + 'student-marks/', { page_size: 500, ...(p ?? {}) }); }

  // ==================== الحضور والمخالفات والتظلمات ====================
  getAttendance(p?: Params): Observable<ApiResp<unknown[]>> { return this.api.get(this.base + 'attendance/', { page_size: 500, ...(p ?? {}) }); }
  markAttendance(b: Body): Observable<ApiResp<unknown>> { return this.api.post(this.base + 'attendance/', b); }
  getIncidents(p?: Params): Observable<ApiResp<ExamIncident[]>> { return this.api.get(this.base + 'incidents/', { page_size: 300, ...(p ?? {}) }); }
  createIncident(b: Body): Observable<ApiResp<ExamIncident>> { return this.api.post(this.base + 'incidents/', b); }
  getAppeals(p?: Params): Observable<ApiResp<ExamAppeal[]>> { return this.api.get(this.base + 'appeals/', { page_size: 300, ...(p ?? {}) }); }
  createAppeal(b: Body): Observable<ApiResp<ExamAppeal>> { return this.api.post(this.base + 'appeals/', b); }
  resolveAppeal(appealId: string, newMarks: number | null): Observable<ApiResp<ExamAppeal>> {
    return this.api.post(this.base + `appeals/${appealId}/resolve/`, { new_marks: newMarks });
  }

  // ==================== النتائج والكشوف والحالة الأكاديمية ====================
  getResults(p?: Params): Observable<ApiResp<ExamResult[]>> { return this.api.get(this.base + 'results/', { page_size: 500, ...(p ?? {}) }); }
  createResult(b: Body): Observable<ApiResp<ExamResult>> { return this.api.post(this.base + 'results/', b); }
  getTranscripts(p?: Params): Observable<ApiResp<Transcript[]>> { return this.api.get(this.base + 'transcripts/', { page_size: 300, ...(p ?? {}) }); }
  createTranscript(b: Body): Observable<ApiResp<Transcript>> { return this.api.post(this.base + 'transcripts/', b); }
  getStandings(p?: Params): Observable<ApiResp<AcademicStanding[]>> { return this.api.get(this.base + 'academic-standings/', { page_size: 300, ...(p ?? {}) }); }
  getStatistics(p?: Params): Observable<ApiResp<unknown[]>> { return this.api.get(this.base + 'statistics/', { page_size: 300, ...(p ?? {}) }); }
  getAudits(p?: Params): Observable<ApiResp<unknown[]>> { return this.api.get(this.base + 'audits/', { page_size: 200, ...(p ?? {}) }); }

  // ==================== روابط الموديولات الأخرى (الأكاديميات والطلاب) ====================
  getSubjects(p?: Params): Observable<ApiResp<Subject[]>> { return this.api.get('academics/subjects/', { page_size: 300, ...(p ?? {}) }); }
  getAcademicYears(p?: Params): Observable<ApiResp<AcademicYear[]>> { return this.api.get('academics/academic-years/', { page_size: 100, ...(p ?? {}) }); }
  getTerms(p?: Params): Observable<ApiResp<Term[]>> { return this.api.get('academics/terms/', { page_size: 100, ...(p ?? {}) }); }
  getGrades(p?: Params): Observable<ApiResp<Grade[]>> { return this.api.get('academics/grades/', { page_size: 200, ...(p ?? {}) }); }
  getSections(p?: Params): Observable<ApiResp<Section[]>> { return this.api.get('academics/sections/', { page_size: 300, ...(p ?? {}) }); }
  getStudents(p?: Params): Observable<ApiResp<Student[]>> { return this.api.get('students/students/', { page_size: 500, ...(p ?? {}) }); }
  getStudentsByGrade(gradeId: string): Observable<ApiResp<Student[]>> { return this.api.get('students/students/', { grade_id: gradeId, page_size: 500 }); }

  /** مؤشرات مساحة عمل الامتحانات — تجميع من عدة نقاط في نداء واحد. */
  getDashboardData(): Observable<ExamDashboardData> {
    return forkJoin({
      exams: this.getExams(),
      sessions: this.getSessions(),
      rooms: this.getRooms(),
      appeals: this.getAppeals(),
      results: this.getResults(),
      incidents: this.getIncidents(),
    }).pipe(
      map((r): ExamDashboardData => ({
        exams: r.exams?.data ?? [],
        sessions: r.sessions?.data ?? [],
        rooms: r.rooms?.data ?? [],
        appeals: r.appeals?.data ?? [],
        results: r.results?.data ?? [],
        incidents: r.incidents?.data ?? [],
      })),
    );
  }
}
