import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../core/services/api-client.service';
import { Observable } from 'rxjs';

export interface Applicant {
  id: string;
  arabic_full_name: string;
  english_full_name?: string;
  gender: string;
  date_of_birth: string;
  birth_place?: string;
  nationality: string;
  national_id: string;
  passport_number?: string;
  religion?: string;
  blood_group?: string;
  special_needs?: string;
  previous_school?: string;
  previous_grade?: string;
  previous_grade_score?: string;
  application_number: string;
  status: string;
  notes?: string;

  // السنة والصف المتقدم له
  academic_year_id?: string;
  applying_grade_id?: string;

  // المدرسة والفرع المستهدف (بنين / بنات)
  branch_id?: string;
  target_school_type?: string;

  // الأشقاء بالمدرسة
  has_siblings?: boolean;
  siblings_section?: string;
  siblings_count?: number;
  siblings_details?: string;
  sibling_student_ids?: string[];

  // البيانات الصحية والاجتماعية والبيئة
  has_health_issues?: boolean;
  health_issues_details?: string;
  has_social_issues?: boolean;
  social_issues_details?: string;
  resides_with?: string;
  transport_mode?: string;
  study_dependence?: string;

  // اللوائح والتعهدات
  agreed_to_admin_rules?: boolean;
  agreed_to_academic_rules?: boolean;
  agreed_to_org_rules?: boolean;
  agreed_to_mobile_policy?: boolean;
}

export interface Guardian {
  id: string;
  applicant: string;
  relationship: string;
  full_name: string;
  phone: string;
  phone2?: string;
  whatsapp_phone?: string;
  email: string;
  occupation?: string;
  national_id?: string;
  address?: string;
  building_number?: string;
  work_address?: string;

  // هاتف الأم والبديل للطوارئ
  mother_phone?: string;
  mother_proxy_name?: string;
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  emergency_contact_phone?: string;
  emergency_contact_address?: string;
}

export interface RequiredDocument {
  id: string;
  applicant: string;
  document_name: string;
  verification_status: string;
  expiration_date?: string;
  rejection_reason?: string;
}

export interface Interview {
  id: string;
  applicant: string;
  interviewer_id: string;
  scheduled_at: string;
  evaluation_score?: number;
  recommendation?: string;
  status: string;
}

export interface PlacementTest {
  id: string;
  applicant: string;
  exam_type: string;
  marks_obtained?: number;
  passing_marks?: number;
  result_status: string;
}

/**
 * خدمة القبول والتسجيل — تستدعي نقاط النهاية الحقيقية فقط:
 *   admissions/applicants|guardians|documents|interviews|placement-tests
 * لا يوجد اختراع لواجهات جديدة.
 */
@Injectable({
  providedIn: 'root'
})
export class AdmissionsService {
  private apiClient = inject(ApiClientService);

  // ---- البوابة العامة (تسجيل إلكتروني بدون مصادقة) ----
  /** إعدادات البوابة العامة: السنوات الدراسية والصفوف المتاحة للمستأجر. */
  getPublicConfig(): Observable<any> {
    return this.apiClient.get<any>('admissions/applicants/public-config/');
  }

  /** إرسال طلب التحاق عام (بيانات المتقدم + ولي أمر). */
  submitPublicApplication(body: { applicant: Record<string, any>; guardian?: Record<string, any> }): Observable<any> {
    return this.apiClient.post('admissions/applicants/public-apply/', body);
  }

  /** تتبّع حالة طلب برقمه. */
  trackApplication(applicationNumber: string): Observable<any> {
    return this.apiClient.get<any>('admissions/applicants/public-track/', { application_number: applicationNumber });
  }

  // ---- إجراءات المراجعة (Review Actions) ----
  /** الخادم يعرّف set-status كـ PATCH — استخدام POST يعيد 405. */
  setApplicantStatus(id: string, status: string): Observable<any> {
    return this.apiClient.patch(`admissions/applicants/${id}/set-status/`, { status });
  }

  /** تحويل المتقدم المقبول إلى طالب مُسجّل (وحدة الطلاب). */
  enrollApplicantAsStudent(applicantId: string): Observable<any> {
    return this.apiClient.post('students/students/create-from-applicant/', { applicant_id: applicantId });
  }

  scheduleInterview(id: string, body: { scheduled_at: string; evaluation_score?: number; recommendation?: string }): Observable<any> {
    return this.apiClient.post(`admissions/applicants/${id}/schedule-interview/`, body);
  }

  acceptApplicant(id: string): Observable<any> {
    return this.apiClient.post(`admissions/applicants/${id}/accept/`, {});
  }

  rejectApplicant(id: string): Observable<any> {
    return this.apiClient.post(`admissions/applicants/${id}/reject/`, {});
  }

  setUnderReview(id: string): Observable<any> {
    return this.apiClient.post(`admissions/applicants/${id}/set-under-review/`, {});
  }

  setWaitlist(id: string): Observable<any> {
    return this.apiClient.post(`admissions/applicants/${id}/set-waitlist/`, {});
  }

  // ---- إعدادات القبول (فتح/إغلاق باب التسجيل — لمدير النظام) ----
  getAdmissionSettings(): Observable<any> {
    return this.apiClient.get<any>('admissions/settings/');
  }

  saveAdmissionSettings(body: Record<string, any>): Observable<any> {
    return this.apiClient.put('admissions/settings/save/', body);
  }

  // ---- المتقدمون ----
  getApplicants(params?: Record<string, any>): Observable<any> {
    return this.apiClient.get<any>('admissions/applicants/', params);
  }

  getApplicant(id: string): Observable<any> {
    return this.apiClient.get<any>(`admissions/applicants/${id}/`);
  }

  createApplicant(applicant: Partial<Applicant>): Observable<any> {
    return this.apiClient.post('admissions/applicants/', applicant);
  }

  updateApplicant(id: string, patch: Partial<Applicant>): Observable<any> {
    return this.apiClient.patch(`admissions/applicants/${id}/`, patch);
  }

  // ---- بيانات أكاديمية للنماذج (ربط وحدة القبول بالشؤون الأكاديمية) ----
  getAcademicYears(): Observable<any> {
    return this.apiClient.get<any>('academics/academic-years/', { page_size: 100 });
  }

  getGrades(): Observable<any> {
    return this.apiClient.get<any>('academics/grades/', { page_size: 100 });
  }

  getSections(gradeId?: string): Observable<any> {
    return this.apiClient.get<any>('academics/sections/', { page_size: 100, ...(gradeId ? { grade: gradeId } : {}) });
  }

  // ---- أولياء الأمور ----
  getGuardians(): Observable<any> {
    return this.apiClient.get<any>('admissions/guardians/');
  }

  createGuardian(body: Record<string, any>): Observable<any> {
    return this.apiClient.post('admissions/guardians/', body);
  }

  updateGuardian(id: string, body: Record<string, any>): Observable<any> {
    return this.apiClient.patch(`admissions/guardians/${id}/`, body);
  }

  // ---- المستندات ----
  getDocuments(): Observable<any> {
    return this.apiClient.get<any>('admissions/documents/');
  }

  updateDocument(id: string, patch: Partial<RequiredDocument>): Observable<any> {
    return this.apiClient.patch(`admissions/documents/${id}/`, patch);
  }

  // ---- المقابلات ----
  getInterviews(): Observable<any> {
    return this.apiClient.get<any>('admissions/interviews/');
  }

  createInterview(body: Partial<Interview>): Observable<any> {
    return this.apiClient.post('admissions/interviews/', body);
  }

  updateInterview(id: string, patch: Partial<Interview>): Observable<any> {
    return this.apiClient.patch(`admissions/interviews/${id}/`, patch);
  }

  // ---- اختبارات تحديد المستوى ----
  getPlacementTests(): Observable<any> {
    return this.apiClient.get<any>('admissions/placement-tests/');
  }
}
