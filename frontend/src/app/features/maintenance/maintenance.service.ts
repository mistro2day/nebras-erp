import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface MaintenanceStats {
  total_requests: number;
  open_requests: number;
  active_work_orders: number;
  completed_work_orders: number;
  total_costs: number;
  upcoming_inspections: number;
  preventive_due: number;
}

@Injectable({
  providedIn: 'root'
})
export class MaintenanceService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/maintenance';

  stats = signal<MaintenanceStats | null>(null);
  loading = signal<boolean>(false);

  getDashboardStats(): Observable<MaintenanceStats> {
    this.loading.set(true);
    return this.http.get<MaintenanceStats>(`${this.apiUrl}/requests/dashboard-stats/`).pipe(
      tap({
        next: (data) => this.stats.set(data),
        finalize: () => this.loading.set(false)
      })
    );
  }

  getRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/requests/`);
  }

  getWorkOrders(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/work-orders/`);
  }

  completeWorkOrder(id: string, payload: { actual_labor_hours: number; summary: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/work-orders/${id}/complete/`, payload);
  }

  consumeParts(id: string, payload: { warehouse_id: string; items: any[] }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/work-orders/${id}/consume-parts/`, payload);
  }

  postCosts(id: string, payload: { maintenance_expense_gl_account_id: string; offset_gl_account_id: string; cost_center_id?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/work-orders/${id}/post-costs/`, payload);
  }
}
