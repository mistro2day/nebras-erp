import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiClientService } from '../../core/services/api-client.service';
import { environment } from '../../../environments/environment';
import { Observable, tap, map } from 'rxjs';

export interface Student {
  id: string;
  student_number: string;
  status: string;
  created_at: string;
  profile: {
    arabic_name: string;
    english_name?: string;
    gender: string;
    date_of_birth: string;
    nationality: string;
    national_id?: string;
    passport?: string;
    religion?: string;
    blood_group?: string;
    photo?: string;
    languages: string[];
    special_needs?: string;
    learning_difficulty?: string;
    talented_program?: string;
    notes?: string;
  };
  medical_profile: {
    allergies?: string[];
    chronic_diseases?: string[];
    medication?: string[];
    doctor?: string;
    medical_notes?: string;
    emergency_medical_contact?: any;
    vaccination_placeholder?: any[];
    medical_attachments?: string[];
  };
  family_relations: any[];
  enrollments?: any[];
}

const EMPTY_STUDENT: Student = {
  id: '',
  student_number: '',
  status: '',
  created_at: '',
  profile: {
    arabic_name: '',
    english_name: '',
    gender: '',
    date_of_birth: '',
    nationality: '',
    languages: [],
  },
  medical_profile: {
    allergies: [],
    chronic_diseases: [],
    medication: [],
  },
  family_relations: [],
};

function normalizeStudent(student: Partial<Student>): Student {
  return {
    ...EMPTY_STUDENT,
    ...student,
    profile: {
      ...EMPTY_STUDENT.profile,
      ...(student.profile ?? {}),
    },
    medical_profile: {
      ...EMPTY_STUDENT.medical_profile,
      ...(student.medical_profile ?? {}),
    },
    family_relations: student.family_relations ?? [],
  };
}

@Injectable({
  providedIn: 'root'
})
export class StudentsService {
  private apiClient = inject(ApiClientService);
  private http = inject(HttpClient);

  // Angular Signals for State Management
  students = signal<Student[]>([]);
  selectedStudent = signal<Student>(EMPTY_STUDENT);
  dashboardWidgets = signal<any>(null);
  loading = signal<boolean>(false);

  getStudents(params?: any): Observable<any> {
    this.loading.set(true);
    return this.apiClient.get<any>('students/students/', params).pipe(
      tap(res => {
        if (res && res.success) {
          this.students.set(res.data);
        }
        this.loading.set(false);
      })
    );
  }

  getStudentById(id: string): Observable<any> {
    this.loading.set(true);
    return this.apiClient.get<any>(`students/students/${id}/`).pipe(
      tap(res => {
        if (res && res.success) {
          this.selectedStudent.set(normalizeStudent(res.data));
        }
        this.loading.set(false);
      })
    );
  }

  createStudentFromApplicant(applicantId: string): Observable<any> {
    return this.apiClient.post('students/students/create-from-applicant/', { applicant_id: applicantId });
  }

  updateStudent(id: string, data: any): Observable<any> {
    return this.apiClient.put<any>(`students/students/${id}/`, data).pipe(
      tap(res => {
        if (res && res.success) {
          this.selectedStudent.set(normalizeStudent(res.data));
        }
      })
    );
  }

  patchStudent(id: string, data: any): Observable<any> {
    return this.apiClient.patch<any>(`students/students/${id}/`, data).pipe(
      tap(res => {
        if (res && res.success) {
          this.selectedStudent.set(normalizeStudent(res.data));
        }
      })
    );
  }

  enrollStudent(studentId: string, enrollmentData: any): Observable<any> {
    return this.apiClient.post(`students/students/${studentId}/enroll/`, enrollmentData);
  }

  promoteStudent(studentId: string, promotionData: any): Observable<any> {
    return this.apiClient.post(`students/students/${studentId}/promote/`, promotionData);
  }

  transferStudent(studentId: string, transferData: any): Observable<any> {
    return this.apiClient.post(`students/students/${studentId}/transfer/`, transferData);
  }

  withdrawStudent(studentId: string, withdrawalData: any): Observable<any> {
    return this.apiClient.post(`students/students/${studentId}/withdraw/`, withdrawalData);
  }

  graduateStudent(studentId: string, graduationData: any): Observable<any> {
    return this.apiClient.post(`students/students/${studentId}/graduate/`, graduationData);
  }

  archiveStudent(studentId: string, reason: string): Observable<any> {
    return this.apiClient.post(`students/students/${studentId}/archive/`, { reason });
  }

  restoreStudent(studentId: string): Observable<any> {
    return this.apiClient.post(`students/students/${studentId}/restore/`, {});
  }

  getTimeline(studentId: string): Observable<any> {
    return this.apiClient.get(`students/students/${studentId}/timeline/`);
  }

  getDashboardWidgets(): Observable<any> {
    return this.apiClient.get<any>('students/students/dashboard-widgets/').pipe(
      tap(res => {
        if (res && res.success) {
          this.dashboardWidgets.set(res.data);
        }
      })
    );
  }

  bulkImport(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.apiClient.post('students/students/bulk-import/', formData);
  }

  createStudent(studentData: any): Observable<any> {
    return this.apiClient.post('students/students/', studentData);
  }

  uploadPhoto(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'student_photos');
    return this.http.post<any>(`${environment.apiUrl}platform/storage/upload/`, formData);
  }

  saveRelation(studentId: string, relationData: any): Observable<any> {
    return this.apiClient.post(`students/students/${studentId}/save-relation/`, relationData);
  }

  deleteRelation(studentId: string, relationId: string): Observable<any> {
    return this.apiClient.post(`students/students/${studentId}/delete-relation/`, { relation_id: relationId });
  }

  /** تفعيل حساب بوابة ولي الأمر وإرسال بيانات الدخول عبر البريد وواتساب */
  activateGuardianPortal(studentId: string, relationId: string): Observable<any> {
    return this.apiClient.post(`students/students/${studentId}/activate-guardian/`, { relation_id: relationId });
  }

  /** تفعيل حساب بوابة الطالب وإرسال بيانات الدخول عبر البريد وواتساب */
  activateStudentPortal(studentId: string): Observable<any> {
    return this.apiClient.post(`students/students/${studentId}/activate-student/`, {});
  }

  /** إعادة تعيين كلمة مرور ولي الأمر وإرسال بيانات الدخول الجديدة */
  resetGuardianPassword(studentId: string, relationId: string): Observable<any> {
    return this.apiClient.post(`students/students/${studentId}/reset-guardian-password/`, { relation_id: relationId });
  }

  /** جلب بيانات هوية المدرسة (الشعار والاسم) للمستأجر الحالي — تُستخدم في ترويسة ملف الطالب */
  getBranding(): Observable<any> {
    return this.apiClient.get(`tenants/branding/current/`).pipe(
      map((res: any) => res?.data ?? res)
    );
  }
}