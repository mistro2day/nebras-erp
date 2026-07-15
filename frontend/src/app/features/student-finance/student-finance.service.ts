import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiClientService } from '../../core/services/api-client.service';

export interface DashboardStats {
  outstanding_receivables: number;
  today_collections: number;
  monthly_collections: number;
  active_holds: number;
  pending_refunds: number;
  due_installments: number;
}

/** استجابة القوائم الموحّدة من الخادم (StandardPagination) */
export interface PagedResponse<T> {
  success: boolean;
  metadata: {
    count: number;
    next: string | null;
    previous: string | null;
    current_page: number;
    total_pages: number;
  };
  data: T[];
}

/** معاملات القوائم الخادمية (page / page_size / search / ordering) */
export type ListParams = Record<string, string | number | undefined>;

@Injectable({
  providedIn: 'root'
})
export class StudentFinanceService {
  private http = inject(HttpClient);
  /** عميل الـ API الموحّد (يمرّ عبر معترض المصادقة والمستأجر — نفس نمط وحدة الطلاب) */
  private api = inject(ApiClientService);
  private apiUrl = '/api/v1/student-finance';

  // ---- قوائم تشغيلية مُرقّمة خادميًا (تُستخدم في الصفحات العاملة) ----
  listBillingAccounts(params?: ListParams): Observable<PagedResponse<any>> {
    return this.api.get<PagedResponse<any>>('student-finance/billing-accounts/', params);
  }

  listInvoices(params?: ListParams): Observable<PagedResponse<any>> {
    return this.api.get<PagedResponse<any>>('student-finance/invoices/', params);
  }

  listReceipts(params?: ListParams): Observable<PagedResponse<any>> {
    return this.api.get<PagedResponse<any>>('student-finance/receipts/', params);
  }

  listReceivables(params?: ListParams): Observable<PagedResponse<any>> {
    return this.api.get<PagedResponse<any>>('student-finance/receivables/', params);
  }

  // ---- طلبات السداد الأونلاين (مراجعة المحاسب) ----
  listOnlinePayments(params?: ListParams): Observable<PagedResponse<any>> {
    return this.api.get<PagedResponse<any>>('student-finance/online-payments/', params);
  }

  onlinePaymentsPendingCount(): Observable<any> {
    return this.api.get<any>('student-finance/online-payments/pending-count/');
  }

  approveOnlinePayment(id: string): Observable<any> {
    return this.api.post<any>(`student-finance/online-payments/${id}/approve/`, {});
  }

  rejectOnlinePayment(id: string, reason: string): Observable<any> {
    return this.api.post<any>(`student-finance/online-payments/${id}/reject/`, { reason });
  }

  listScholarships(params?: ListParams): Observable<PagedResponse<any>> {
    return this.api.get<PagedResponse<any>>('student-finance/scholarships/', params);
  }

  // ---- دورة الفوترة: طالب ← حساب ← فاتورة ← سند قبض ----
  /** فتح حساب فوترة لطالب (student_id + رقم حساب فريد). */
  createBillingAccount(body: { student_id: string; account_number: string; opening_balance?: number }): Observable<any> {
    return this.api.post('student-finance/billing-accounts/', body);
  }

  /** هياكل الرسوم المتاحة (لتوليد الفواتير). */
  listFeeStructures(params?: ListParams): Observable<PagedResponse<any>> {
    return this.api.get<PagedResponse<any>>('student-finance/fee-structures/', { page_size: 100, ...(params ?? {}) });
  }

  /** طرق الدفع من وحدة المالية العامة. */
  listPaymentMethods(): Observable<PagedResponse<any>> {
    return this.api.get<PagedResponse<any>>('finance/payment-methods/', { page_size: 100 });
  }

  /** توليد فاتورة لحساب طالب من هياكل رسوم (خدمة الفوترة الخلفية). */
  generateStudentInvoice(body: { billing_account_id: string; fee_structure_ids: string[]; due_date: string }): Observable<any> {
    return this.api.post('student-finance/invoices/generate-invoice/', body);
  }

  /** استلام دفعة وتوليد سند قبض (يُخصَّص على المستحقات تلقائيًا). */
  receiveStudentPayment(body: { billing_account_id: string; amount: number; payment_method_id: string; bank_account_id?: string; cash_box_id?: string }): Observable<any> {
    return this.api.post('student-finance/receipts/receive-payment/', body);
  }

  // ---- الربط بالمالية والطلاب: مراجع ومصادر (360° لحساب الطالب) ----
  /** الإعدادات المالية للطلاب (ربط حساب المدينين والإيرادات بشجرة المالية). */
  getSettings(): Observable<PagedResponse<any>> {
    return this.api.get<PagedResponse<any>>('student-finance/settings/');
  }
  listCashBoxes(): Observable<PagedResponse<any>> {
    return this.api.get<PagedResponse<any>>('finance/cash-boxes/', { page_size: 100 });
  }
  listBankAccounts(): Observable<PagedResponse<any>> {
    return this.api.get<PagedResponse<any>>('finance/bank-accounts/', { page_size: 100 });
  }

  /** القوائم الفرعية لحساب طالب محدّد. */
  invoicesForAccount(accountId: string): Observable<PagedResponse<any>> {
    return this.api.get<PagedResponse<any>>('student-finance/invoices/', { student_billing_account: accountId, page_size: 100, ordering: '-issue_date' });
  }
  receiptsForAccount(accountId: string): Observable<PagedResponse<any>> {
    return this.api.get<PagedResponse<any>>('student-finance/receipts/', { student_billing_account: accountId, page_size: 100 });
  }
  receivablesForAccount(accountId: string): Observable<PagedResponse<any>> {
    return this.api.get<PagedResponse<any>>('student-finance/receivables/', { student_billing_account: accountId, page_size: 100 });
  }
  scholarshipsForAccount(accountId: string): Observable<PagedResponse<any>> {
    return this.api.get<PagedResponse<any>>('student-finance/scholarships/', { student_billing_account: accountId, page_size: 100 });
  }
  holdsForAccount(accountId: string): Observable<PagedResponse<any>> {
    return this.api.get<PagedResponse<any>>('student-finance/financial-holds/', { student_billing_account: accountId, page_size: 100 });
  }

  /** عمليات على حساب طالب. */
  applyScholarshipApi(body: { billing_account_id: string; name: string; type: string; amount_percentage?: number; fixed_amount?: number; start_date: string; end_date?: string }): Observable<any> {
    return this.api.post('student-finance/scholarships/apply-scholarship/', body);
  }
  applyHoldApi(body: { billing_account_id: string; hold_type: string; reason: string }): Observable<any> {
    return this.api.post('student-finance/financial-holds/apply-hold/', body);
  }
  releaseHold(holdId: string): Observable<any> {
    return this.api.post(`student-finance/financial-holds/${holdId}/release/`, {});
  }

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
