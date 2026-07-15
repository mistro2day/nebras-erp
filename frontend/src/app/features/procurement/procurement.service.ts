import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface ProcurementStats {
  open_requests: number;
  pending_approvals: number;
  active_rfqs: number;
  active_pos: number;
  active_contracts: number;
  total_spent: number;
  savings: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProcurementService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/procurement';

  // Signals for state management
  stats = signal<ProcurementStats | null>(null);
  loading = signal<boolean>(false);

  getDashboardStats(): Observable<ProcurementStats> {
    this.loading.set(true);
    return this.http.get<ProcurementStats>(`${this.apiUrl}/requests/dashboard-stats/`).pipe(
      tap({
        next: (data) => this.stats.set(data),
        finalize: () => this.loading.set(false)
      })
    );
  }

  getVendors(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/vendors/`, { params: params || {} });
  }

  getPurchaseRequests(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/requests/`, { params: params || {} });
  }

  createPurchaseRequest(payload: { department_id: string; requested_by: string; items: any[]; reason: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/requests/create-request/`, payload);
  }

  approvePurchaseRequest(id: string, payload: { approver_id: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/requests/${id}/approve/`, payload);
  }

  getRFQs(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/rfqs/`, { params: params || {} });
  }

  createRFQ(payload: { purchase_request_id: string; deadline: string; notes?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/rfqs/create-rfq/`, payload);
  }

  compareAndAward(payload: { rfq_id: string; vendor_id: string; quotation_id: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/rfqs/compare-and-award/`, payload);
  }

  getPurchaseOrders(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/orders/`, { params: params || {} });
  }

  issuePurchaseOrder(id: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/orders/${id}/issue/`, {});
  }

  getContracts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/contracts/`);
  }
}
