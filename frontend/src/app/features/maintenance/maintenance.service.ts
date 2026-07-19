import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface MaintenanceStats {
  total_requests: number;
  open_requests: number;
  active_work_orders: number;
  completed_work_orders: number;
  total_costs: number;
  upcoming_inspections: number;
  preventive_due: number;
}

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  private http = inject(HttpClient);
  /** رابط مطلق مثل بقية الخدمات العاملة — المسار النسبي يذهب لخادم Angular ويردّ بـ index.html. */
  private apiUrl = `${environment.apiUrl}maintenance`;

  stats = signal<MaintenanceStats | null>(null);
  loading = signal<boolean>(false);

  getDashboardStats(): Observable<MaintenanceStats> {
    this.loading.set(true);
    return this.http.get<MaintenanceStats>(`${this.apiUrl}/requests/dashboard-stats/`).pipe(
      tap({ next: (data) => this.stats.set(data), finalize: () => this.loading.set(false) }),
    );
  }

  // ---- المرجعيات ----
  getCategories(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/categories/`, { params: { page_size: 100 } as any });
  }
  getPriorities(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/priorities/`, { params: { page_size: 100 } as any });
  }
  getTypes(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/types/`, { params: { page_size: 100 } as any });
  }
  getTeams(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/teams/`, { params: { page_size: 100 } as any });
  }
  getTechnicians(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/technicians/`, { params: { page_size: 100 } as any });
  }

  // ---- البلاغات ----
  getRequests(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/requests/`, { params: params || { page_size: 200 } });
  }
  createRequest(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/requests/`, payload);
  }
  updateRequest(id: string, payload: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/requests/${id}/`, payload);
  }

  // ---- أوامر العمل ----
  getWorkOrders(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/work-orders/`, { params: params || { page_size: 200 } });
  }
  getWorkOrder(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/work-orders/${id}/`);
  }
  createWorkOrder(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/work-orders/`, payload);
  }

  completeWorkOrder(id: string, payload: { actual_labor_hours: number; summary: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/work-orders/${id}/complete/`, payload);
  }

  /** صرف قطع الغيار — يستدعي صرف المخزون فعلياً ويخصم الرصيد. */
  consumeParts(id: string, payload: {
    warehouse_id: string; items: any[]; expense_account_id?: string; cost_center_id?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/work-orders/${id}/consume-parts/`, payload);
  }

  /** ترحيل تكلفة الصيانة للمالية — تصل كقيد مسودة يعتمده المحاسب. */
  postCosts(id: string, payload: {
    maintenance_expense_gl_account_id: string; offset_gl_account_id: string; cost_center_id?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/work-orders/${id}/post-costs/`, payload);
  }

  getCosts(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/costs/`, { params: params || { page_size: 200 } });
  }
  getConsumptions(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/material-consumptions/`, { params: { page_size: 300 } as any });
  }
}
