import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../core/services/api-client.service';
import { Observable } from 'rxjs';

export interface Applicant {
  id: string;
  arabic_full_name: string;
  english_full_name?: string;
  gender: string;
  date_of_birth: string;
  nationality: string;
  national_id: string;
  passport_number?: string;
  religion?: string;
  blood_group?: string;
  special_needs?: string;
  previous_school?: string;
  previous_grade?: string;
  application_number: string;
  status: string;
  notes?: string;
}

export interface Guardian {
  id: string;
  applicant: string;
  relationship: string;
  full_name: string;
  phone: string;
  email: string;
  occupation?: string;
  national_id?: string;
  address?: string;
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
