import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../../core/services/api-client.service';

/**
 * محرك الجدولة الموحد — كل الطلبات عبر ApiClientService (الرابط الصحيح + المصادقة + المستأجر).
 * مرتبط بموديولات: scheduling (الجداول/الموارد/الأحداث/الحجوزات/التعارضات)،
 * وتغذية من timetable (الحصص) و faculty (المعلمون).
 */
@Injectable({ providedIn: 'root' })
export class SchedulingService {
  private api = inject(ApiClientService);

  getSchedules(params?: any): Observable<any> { return this.api.get('scheduling/schedules/', { page_size: 200, ...(params ?? {}) }); }
  getResources(params?: any): Observable<any> { return this.api.get('scheduling/resources/', { page_size: 500, ...(params ?? {}) }); }
  /** مزامنة الموارد من الموديولات المصدر (المعلمون…) — idempotent. */
  syncResources(): Observable<any> { return this.api.post('scheduling/resources/sync-resources/', {}); }
  getEvents(params?: any): Observable<any> { return this.api.get('scheduling/events/', { page_size: 500, ...(params ?? {}) }); }

  getReservations(params?: any): Observable<any> { return this.api.get('scheduling/reservations/', { page_size: 200, ...(params ?? {}) }); }
  createReservation(body: any): Observable<any> { return this.api.post('scheduling/reservations/', body); }
  /** الحجز الذكي: كشف تعارض المورد قبل التأكيد. */
  checkConflicts(body: { resource_id: string; date: string; start_time: string; end_time: string }): Observable<any> {
    return this.api.post('scheduling/reservations/check-conflicts/', body);
  }

  getConflicts(params?: any): Observable<any> { return this.api.get('scheduling/conflicts/', { page_size: 200, ...(params ?? {}) }); }
  resolveConflict(id: string, resolution_details: string): Observable<any> {
    return this.api.patch(`scheduling/conflicts/${id}/`, { resolved: true, resolution_details });
  }

  getTimeSlots(params?: any): Observable<any> { return this.api.get('scheduling/time-slots/', { page_size: 100, ...(params ?? {}) }); }

  // تغذية أكاديمية
  getTimetableEntries(params?: any): Observable<any> { return this.api.get('timetable/entries/', { page_size: 1000, ...(params ?? {}) }); }
  getFacultyMembers(params?: any): Observable<any> { return this.api.get('faculty/members/', { page_size: 500, ...(params ?? {}) }); }
}
