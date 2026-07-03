import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FinanceService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/finance';

  // 1. لوحة التحكم والإحصائيات
  getDashboardData(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/statistics/dashboard/`);
  }

  // 2. السنوات والفترات المالية
  getFiscalYears(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/fiscal-years/`);
  }

  closeFiscalYear(yearId: string, retainedEarningsAccountId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/fiscal-years/${yearId}/close-year/`, {
      retained_earnings_account_id: retainedEarningsAccountId
    });
  }

  getPeriods(fiscalYearId?: string): Observable<any> {
    const url = fiscalYearId ? `${this.baseUrl}/periods/?fiscal_year=${fiscalYearId}` : `${this.baseUrl}/periods/`;
    return this.http.get<any>(url);
  }

  closePeriod(periodId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/periods/${periodId}/close-period/`, {});
  }

  // 3. شجرة الحسابات (Chart of Accounts)
  getCOA(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/coa/`);
  }

  createAccount(accountData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/coa/`, accountData);
  }

  getAccountTypes(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/account-types/`);
  }

  getAccountCategories(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/categories/`);
  }

  // 4. قيود اليومية (Journal Entries)
  getJournals(status?: string): Observable<any> {
    const url = status ? `${this.baseUrl}/journals/?status=${status}` : `${this.baseUrl}/journals/`;
    return this.http.get<any>(url);
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
  getLedgerEntries(accountId?: string, costCenterId?: string): Observable<any> {
    let params = [];
    if (accountId) params.push(`account=${accountId}`);
    if (costCenterId) params.push(`cost_center=${costCenterId}`);
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    return this.http.get<any>(`${this.baseUrl}/ledger-entries/${query}`);
  }

  // 6. مراكز التكلفة (Cost Centers)
  getCostCenters(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/cost-centers/`);
  }

  createCostCenter(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/cost-centers/`, data);
  }

  // 7. الموازنات التقديرية (Budgets)
  getBudgets(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/budgets/`);
  }

  createBudget(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/budgets/`, data);
  }

  approveBudget(id: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/budgets/${id}/approve/`, {});
  }

  // 8. العملات وأسعار الصرف
  getCurrencies(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/currencies/`);
  }

  getExchangeRates(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/exchange-rates/`);
  }

  // 9. البنوك والصناديق والضرائب
  getBanks(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/banks/`);
  }

  getBankAccounts(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/bank-accounts/`);
  }

  getCashBoxes(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/cash-boxes/`);
  }

  getTaxes(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/taxes/`);
  }

  getTaxGroups(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/tax-groups/`);
  }

  // 10. السندات المالية (Vouchers)
  getVouchers(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/vouchers/`);
  }

  createVoucher(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/vouchers/`, data);
  }

  postVoucher(id: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/vouchers/${id}/post/`, {});
  }
}
