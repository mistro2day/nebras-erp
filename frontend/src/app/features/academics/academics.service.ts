import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../core/services/api-client.service';
import { Observable } from 'rxjs';

export interface AcademicYear {
  id: string;
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  registration_start?: string;
  registration_end?: string;
  status: string;
  current_flag: boolean;
}

export interface Term {
  id: string;
  academic_year: string;
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  order: number;
  status: string;
}

export interface Stage {
  id: string;
  name: string;
  code: string;
  order: number;
  minimum_age: number;
  maximum_age: number;
}

export interface Grade {
  id: string;
  stage: string;
  name: string;
  code: string;
  order: number;
  passing_percentage: number;
  max_capacity: number;
}

export interface Section {
  id: string;
  grade: string;
  name: string;
  code: string;
  capacity: number;
  gender: string;
  academic_shift: string;
  status: boolean;
}

export interface Subject {
  id: string;
  code: string;
  arabic_name: string;
  english_name?: string;
  credit_hours: number;
  weekly_periods: number;
  passing_mark: number;
  maximum_mark: number;
  status: boolean;
}

/**
 * خدمة الشؤون الأكاديمية — CRUD حقيقي على نقاط نهاية academics/*.
 * تُستخدم في الصفحات العاملة (السنوات، الفصول، المراحل، الصفوف، الشعب، المواد).
 */
@Injectable({ providedIn: 'root' })
export class AcademicsService {
  private apiClient = inject(ApiClientService);

  // ---------- السنوات الدراسية ----------
  getAcademicYears(params?: any): Observable<any> { return this.apiClient.get('academics/academic-years/', { page_size: 100, ...(params ?? {}) }); }
  createAcademicYear(body: Partial<AcademicYear>): Observable<any> { return this.apiClient.post('academics/academic-years/', body); }
  updateAcademicYear(id: string, body: Partial<AcademicYear>): Observable<any> { return this.apiClient.patch(`academics/academic-years/${id}/`, body); }
  deleteAcademicYear(id: string): Observable<any> { return this.apiClient.delete(`academics/academic-years/${id}/`); }

  // ---------- الفصول الدراسية ----------
  getTerms(params?: any): Observable<any> { return this.apiClient.get('academics/terms/', { page_size: 100, ...(params ?? {}) }); }
  createTerm(body: Partial<Term>): Observable<any> { return this.apiClient.post('academics/terms/', body); }
  updateTerm(id: string, body: Partial<Term>): Observable<any> { return this.apiClient.patch(`academics/terms/${id}/`, body); }
  deleteTerm(id: string): Observable<any> { return this.apiClient.delete(`academics/terms/${id}/`); }

  // ---------- المراحل التعليمية ----------
  getStages(params?: any): Observable<any> { return this.apiClient.get('academics/stages/', { page_size: 100, ...(params ?? {}) }); }
  createStage(body: Partial<Stage>): Observable<any> { return this.apiClient.post('academics/stages/', body); }
  updateStage(id: string, body: Partial<Stage>): Observable<any> { return this.apiClient.patch(`academics/stages/${id}/`, body); }
  deleteStage(id: string): Observable<any> { return this.apiClient.delete(`academics/stages/${id}/`); }

  // ---------- الصفوف ----------
  getGrades(params?: any): Observable<any> { return this.apiClient.get('academics/grades/', { page_size: 100, ...(params ?? {}) }); }
  createGrade(body: Partial<Grade>): Observable<any> { return this.apiClient.post('academics/grades/', body); }
  updateGrade(id: string, body: Partial<Grade>): Observable<any> { return this.apiClient.patch(`academics/grades/${id}/`, body); }
  deleteGrade(id: string): Observable<any> { return this.apiClient.delete(`academics/grades/${id}/`); }

  // ---------- الشعب ----------
  getSections(params?: any): Observable<any> { return this.apiClient.get('academics/sections/', { page_size: 100, ...(params ?? {}) }); }
  createSection(body: Partial<Section>): Observable<any> { return this.apiClient.post('academics/sections/', body); }
  updateSection(id: string, body: Partial<Section>): Observable<any> { return this.apiClient.patch(`academics/sections/${id}/`, body); }
  deleteSection(id: string): Observable<any> { return this.apiClient.delete(`academics/sections/${id}/`); }

  // ---------- المواد الدراسية ----------
  getSubjects(params?: any): Observable<any> { return this.apiClient.get('academics/subjects/', { page_size: 100, ...(params ?? {}) }); }
  createSubject(body: Partial<Subject>): Observable<any> { return this.apiClient.post('academics/subjects/', body); }
  updateSubject(id: string, body: Partial<Subject>): Observable<any> { return this.apiClient.patch(`academics/subjects/${id}/`, body); }
  deleteSubject(id: string): Observable<any> { return this.apiClient.delete(`academics/subjects/${id}/`); }
  /** إدراج المنهج الافتراضي (المراحل والصفوف والمواد) دفعةً واحدة — idempotent. */
  seedCurriculum(): Observable<any> { return this.apiClient.post('academics/subjects/seed-curriculum/', {}); }

  /** امتحانات مرتبطة بمادة (تُفلتر بالـ subject_id على العميل). */
  getExams(params?: any): Observable<any> { return this.apiClient.get('examinations/exams/', { page_size: 500, ...(params ?? {}) }); }

  // ---------- مؤشرات اللوحة الأكاديمية (مربوطة بالطلاب) ----------
  getDashboardStats(params?: any): Observable<any> { return this.apiClient.get('academics/dashboard-stats/', params); }

  // ---------- توزيع الطلاب على الشعب (يعتمد نقاط نهاية الطلاب) ----------
  /** جلب طلاب صف معيّن مع تسجيلاتهم (enrollments) لتحديد شعبة كل طالب. */
  getStudentsByGrade(gradeId: string): Observable<any> {
    return this.apiClient.get('students/students/', { grade_id: gradeId, page_size: 500 });
  }
  /** جلب الطلاب القابلين للتوزيع (المسجّلون/النشطون) مع تسجيلاتهم لتحديد الصف والشعبة. */
  getStudentsForDistribution(params?: any): Observable<any> {
    return this.apiClient.get('students/students/', { page_size: 100, ...(params ?? {}) });
  }
  /** تسكين/تعيين طالب في شعبة داخل صف وسنة دراسية (يسجّل وضعًا جديدًا). */
  assignStudentSection(studentId: string, body: {
    academic_year_id: string; grade_id: string; section_id: string;
    term_id?: string | null; enrollment_type?: string;
  }): Observable<any> {
    return this.apiClient.post(`students/students/${studentId}/enroll/`, body);
  }
  /** ترقية/تخطّي صف لطالب متميّز. */
  promoteStudent(studentId: string, body: {
    from_grade_id: string; to_grade_id: string; academic_year_id: string;
  }): Observable<any> {
    return this.apiClient.post(`students/students/${studentId}/promote/`, body);
  }
}
