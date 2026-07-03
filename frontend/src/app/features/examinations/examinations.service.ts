import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ExaminationsService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/examinations';

  // 1. فئات وأنواع الامتحانات
  getCategories(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/categories/`);
  }

  getTypes(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/types/`);
  }

  // 2. الامتحانات (Exams)
  getExams(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/exams/`);
  }

  // 3. جداول وجلسات الامتحانات (Schedules & Sessions)
  getSchedules(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/schedules/`);
  }

  getSessions(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/sessions/`);
  }

  // 4. قاعات الامتحانات واللجان
  getRooms(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/rooms/`);
  }

  // 5. درجات الطلاب ورصدها (Student Exams & Marks)
  getStudentExams(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/student-exams/`);
  }

  enterStudentMark(studentExamId: string, marksObtained: number, reason?: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/student-exams/${studentExamId}/enter-mark/`, {
      marks_obtained: marksObtained,
      reason
    });
  }

  // 6. التظلمات والاستئناف (Appeals)
  getAppeals(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/appeals/`);
  }

  resolveAppeal(appealId: string, newMarks: number | null): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/appeals/${appealId}/resolve/`, {
      new_marks: newMarks
    });
  }

  // 7. النتائج الإحصائية
  getExamStatistics(examId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/statistics/?exam=${examId}`);
  }
}
