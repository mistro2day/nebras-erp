import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * خدمة النظام المالي ودفتر الأستاذ العام (Finance & GL)
 * تغطي كامل نقاط النهاية للـ 29 نموذجاً محاسبياً في الباك اند.
 * مستوحاة من بنية Odoo Accounting و Microsoft Dynamics 365 Finance، بلغة تصميم نبراس.
 */
@Injectable({ providedIn: 'root' })
export class FinanceService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}finance`;

  private qs(params?: Record<string, any>): string {
    if (!params) return '';
    const parts = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
    return parts.length ? `?${parts.join('&')}` : '';
  }

  // 1. لوحة التحكم والإحصائيات
  getDashboardData(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/statistics/dashboard/`);
  }

  // 2. السنوات والفترات المالية
  getFiscalYears(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/fiscal-years/${this.qs(params)}`);
  }
  createFiscalYear(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/fiscal-years/`, data);
  }
  closeFiscalYear(yearId: string, retainedEarningsAccountId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/fiscal-years/${yearId}/close-year/`, {
      retained_earnings_account_id: retainedEarningsAccountId,
    });
  }
  getPeriods(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/periods/${this.qs(params)}`);
  }
  createPeriod(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/periods/`, data);
  }
  closePeriod(periodId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/periods/${periodId}/close-period/`, {});
  }
  getClosings(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/closings/${this.qs(params)}`);
  }

  // 3. شجرة الحسابات (Chart of Accounts)
  getCOA(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/coa/${this.qs(params)}`);
  }
  createAccount(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/coa/`, data);
  }
  updateAccount(id: string, data: any): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/coa/${id}/`, data);
  }
  getAccountTypes(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/account-types/`);
  }
  createAccountType(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/account-types/`, data);
  }
  getAccountCategories(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/categories/${this.qs(params)}`);
  }
  createAccountCategory(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/categories/`, data);
  }
  createPaymentMethod(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/payment-methods/`, data);
  }

  // 4. قيود اليومية (Journal Entries)
  getJournals(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/journals/${this.qs(params)}`);
  }
  getJournalDetails(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/journals/${id}/`);
  }
  createJournal(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/journals/`, data);
  }
  updateJournal(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/journals/${id}/`, data);
  }
  approveJournal(id: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/journals/${id}/approve/`, {});
  }
  postJournal(id: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/journals/${id}/post/`, {});
  }
  reverseJournal(id: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/journals/${id}/reverse/`, {});
  }

  // 5. دفتر الأستاذ (General Ledger)
  getLedgerEntries(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/ledger-entries/${this.qs(params)}`);
  }

  // 6. مراكز التكلفة (Cost Centers)
  getCostCenters(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/cost-centers/${this.qs(params)}`);
  }
  createCostCenter(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/cost-centers/`, data);
  }

  // 7. الموازنات التقديرية (Budgets)
  getBudgets(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/budgets/${this.qs(params)}`);
  }
  getBudgetDetails(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/budgets/${id}/`);
  }
  createBudget(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/budgets/`, data);
  }
  approveBudget(id: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/budgets/${id}/approve/`, {});
  }

  // 8. العملات وأسعار الصرف
  getCurrencies(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/currencies/${this.qs(params)}`);
  }
  createCurrency(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/currencies/`, data);
  }
  getExchangeRates(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/exchange-rates/${this.qs(params)}`);
  }
  createExchangeRate(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/exchange-rates/`, data);
  }

  // 9. البنوك والصناديق (Cash & Bank)
  getBanks(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/banks/`);
  }
  createBank(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/banks/`, data);
  }
  getBankAccounts(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/bank-accounts/${this.qs(params)}`);
  }
  createBankAccount(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/bank-accounts/`, data);
  }
  getCashBoxes(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/cash-boxes/`);
  }
  createCashBox(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/cash-boxes/`, data);
  }
  getPaymentMethods(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/payment-methods/`);
  }

  // 10. الضرائب (Taxes)
  getTaxes(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/taxes/${this.qs(params)}`);
  }
  createTax(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/taxes/`, data);
  }
  getTaxGroups(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/tax-groups/`);
  }

  // 11. السندات المالية (Vouchers)
  getVouchers(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/vouchers/${this.qs(params)}`);
  }
  createVoucher(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/vouchers/`, data);
  }
  postVoucher(id: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/vouchers/${id}/post/`, {});
  }
}
