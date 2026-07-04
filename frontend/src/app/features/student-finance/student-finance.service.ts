import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface DashboardStats {
  outstanding_receivables: number;
  today_collections: number;
  monthly_collections: number;
  active_holds: number;
  pending_refunds: number;
  due_installments: number;
}

@Injectable({
  providedIn: 'root'
})
export class StudentFinanceService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/student-finance';

  // Signals for state management
  stats = signal<DashboardStats | null>(null);
  loading = signal<boolean>(false);

  getDashboardStats(): Observable<DashboardStats> {
    this.loading.set(true);
    return this.http.get<DashboardStats>(`${this.apiUrl}/billing-accounts/dashboard-stats/`).pipe(
      tap({
        next: (data) => this.stats.set(data),
        finalize: () => this.loading.set(false)
      })
    );
  }

  getBillingAccounts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/billing-accounts/`);
  }

  getInvoices(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/invoices/`);
  }

  generateInvoice(payload: { billing_account_id: string; fee_structure_ids: string[]; due_date: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/invoices/generate-invoice/`, payload);
  }

  receivePayment(payload: { billing_account_id: string; amount: number; payment_method_id: string; cash_box_id?: string; bank_account_id?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/receipts/receive-payment/`, payload);
  }

  getScholarships(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/scholarships/`);
  }

  applyScholarship(payload: { billing_account_id: string; name: string; type: string; amount_percentage?: number; fixed_amount?: number; start_date: string; end_date?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/scholarships/apply-scholarship/`, payload);
  }

  getFinancialHolds(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/financial-holds/`);
  }

  applyHold(payload: { billing_account_id: string; hold_type: string; reason: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/financial-holds/apply-hold/`, payload);
  }
}
