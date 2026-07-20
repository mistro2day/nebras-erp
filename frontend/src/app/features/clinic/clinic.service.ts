import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ClinicStats {
  today_visits: number;
  emergency_cases: number;
  active_isolations: number;
  pending_leaves: number;
}

@Injectable({ providedIn: 'root' })
export class ClinicService {
  private http = inject(HttpClient);
  /** رابط مطلق مثل بقية الخدمات العاملة — المسار النسبي يذهب لخادم Angular ويردّ بـ index.html. */
  private apiUrl = `${environment.apiUrl}clinic`;

  stats = signal<ClinicStats | null>(null);
  loading = signal<boolean>(false);

  getDashboardStats(): Observable<ClinicStats> {
    this.loading.set(true);
    return this.http.get<ClinicStats>(`${this.apiUrl}/visits/dashboard-stats/`).pipe(
      tap({ next: (d) => this.stats.set(d), finalize: () => this.loading.set(false) }),
    );
  }

  /** الطلاب والموظفون بأسمائهم — يحلّ معرّفات المرضى. */
  getPeople(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/visits/people/`);
  }

  // ---- الزيارات ----
  getVisits(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/visits/`, { params: params || { page_size: 300 } });
  }
  createVisit(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/visits/`, payload);
  }
  updateVisit(id: string, payload: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/visits/${id}/`, payload);
  }
  getVitals(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/vitals/`, { params: params || { page_size: 300 } });
  }
  createVitals(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/vitals/`, payload);
  }

  // ---- الأدوية والصرف ----
  getMedications(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/medications/`, { params: params || { page_size: 200 } });
  }
  getDispenses(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dispenses/`, { params: params || { page_size: 300 } });
  }
  /** صرف الدواء يخصم من مستودع العيادة فعلياً عبر موديول المخزون. */
  dispenseMedication(visitId: string, payload: {
    medication_id: string; quantity: number; warehouse_id?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/visits/${visitId}/dispense/`, payload);
  }

  // ---- الإجازات المرضية ----
  getLeaves(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/leaves/`, { params: params || { page_size: 300 } });
  }
  createLeave(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/leaves/`, payload);
  }
  /** الاعتماد يُبرّر غياب المريض تلقائياً في موديول الحضور. */
  approveLeave(leaveId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/leaves/${leaveId}/approve/`, {});
  }

  // ---- الملفات الطبية والمرجعيات ----
  getProfiles(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/profiles/`, { params: params || { page_size: 300 } });
  }
  createProfile(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/profiles/`, payload);
  }
  getClinics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/clinics/`, { params: { page_size: 50 } as any });
  }
  getRooms(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/rooms/`, { params: { page_size: 100 } as any });
  }
  getAllergies(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/allergies/`, { params: { page_size: 300 } as any });
  }
  getChronicConditions(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/chronic-conditions/`, { params: { page_size: 300 } as any });
  }
}
