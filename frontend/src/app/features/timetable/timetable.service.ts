import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../../core/services/api-client.service';

/**
 * خدمة إدارة الجدول الأكاديمي والجدولة الذكية.
 * تمرّ كل الطلبات عبر ApiClientService لضمان الرابط الصحيح للخادم وحقن المصادقة والمستأجر.
 * مرتبطة بموديولات: timetable (الجداول/الحصص/العبء)، faculty (المعلمون)، academics (المواد/الشعب).
 */
@Injectable({ providedIn: 'root' })
export class TimetableService {
  private api = inject(ApiClientService);

  // ---- الجداول الأكاديمية ----
  getTimetables(params?: any): Observable<any> { return this.api.get('timetable/timetables/', { page_size: 200, ...(params ?? {}) }); }
  createTimetable(body: any): Observable<any> { return this.api.post('timetable/timetables/', body); }
  updateTimetable(id: string, body: any): Observable<any> { return this.api.patch(`timetable/timetables/${id}/`, body); }

  // ---- الحصص (خانات الجدول) ----
  getEntries(params?: any): Observable<any> { return this.api.get('timetable/entries/', { page_size: 1000, ...(params ?? {}) }); }
  deleteEntry(id: string): Observable<any> { return this.api.delete(`timetable/entries/${id}/`); }

  /** الجدولة الذكية: التحقق من التعارضات والعبء التدريسي ثم الحجز. */
  validateEntry(body: {
    timetable_id: string; day_of_week: number; period_id: string;
    teacher_id: string; subject_id: string; room_id: string; grade_section_id: string;
  }): Observable<any> {
    return this.api.post('timetable/entries/validate-entry/', body);
  }

  // ---- الحصص الزمنية (فترات اليوم) ----
  getPeriods(params?: any): Observable<any> { return this.api.get('timetable/periods/', { page_size: 100, ...(params ?? {}) }); }
  createPeriod(body: any): Observable<any> { return this.api.post('timetable/periods/', body); }

  // ---- العبء التدريسي وتوزيع الحصص للمعلمين ----
  getLoads(params?: any): Observable<any> { return this.api.get('timetable/loads/', { page_size: 500, ...(params ?? {}) }); }
  getAssignments(params?: any): Observable<any> { return this.api.get('timetable/assignments/', { page_size: 500, ...(params ?? {}) }); }

  // ---- خطة توزيع المواد على الشعب ----
  getDistributions(params?: any): Observable<any> { return this.api.get('timetable/distributions/', { page_size: 500, ...(params ?? {}) }); }

  // ---- إحصائيات الجدول ----
  getStatistics(params?: any): Observable<any> { return this.api.get('timetable/statistics/', { page_size: 100, ...(params ?? {}) }); }

  // ---- موارد مرتبطة (معلمون، مواد، شعب) ----
  getFacultyMembers(params?: any): Observable<any> { return this.api.get('faculty/members/', { page_size: 500, ...(params ?? {}) }); }
  getSubjects(params?: any): Observable<any> { return this.api.get('academics/subjects/', { page_size: 200, ...(params ?? {}) }); }
  getSections(params?: any): Observable<any> { return this.api.get('academics/sections/', { page_size: 200, ...(params ?? {}) }); }
}
