import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface ClinicStats {
  today_visits: number;
  emergency_cases: number;
  active_isolations: number;
  pending_leaves: number;
}

@Injectable({
  providedIn: 'root'
})
export class ClinicService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/clinic';

  stats = signal<ClinicStats | null>(null);
  loading = signal<boolean>(false);

  getDashboardStats(): Observable<ClinicStats> {
    this.loading.set(true);
    return this.http.get<ClinicStats>(`${this.apiUrl}/visits/dashboard-stats/`).pipe(
      tap({
        next: (data) => this.stats.set(data),
        finalize: () => this.loading.set(false)
      })
    );
  }

  getVisits(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/visits/`);
  }

  recordVisit(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/visits/`, payload);
  }

  dispenseMedication(visitId: string, payload: { medication_id: string; quantity: number; warehouse_id?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/visits/${visitId}/dispense/`, payload);
  }

  approveMedicalLeave(leaveId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/leaves/${leaveId}/approve/`, {});
  }

  getLeaves(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/leaves/`);
  }

  getMedications(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/medications/`);
  }
}
