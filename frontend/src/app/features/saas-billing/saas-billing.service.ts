import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SubscriptionPlan {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string;
  description?: string;
  billing_cycle: 'monthly' | 'quarterly' | 'annual';
  billing_cycle_display?: string;
  price: number;
  currency: string;
  max_students: number;
  max_staff: number;
  max_branches: number;
  modules: string[];
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
  active_subscriptions?: number;
}

export interface TenantSubscription {
  id: string;
  tenant: string;
  tenant_name?: string;
  plan: string;
  plan_name?: string;
  plan_price?: number;
  plan_currency?: string;
  status: string;
  status_display?: string;
  started_at: string;
  current_period_start?: string;
  current_period_end?: string;
  trial_ends_at?: string;
  cancel_at_period_end: boolean;
}

export interface Invoice {
  id: string;
  tenant: string;
  tenant_name?: string;
  number: string;
  status: string;
  status_display?: string;
  issue_date: string;
  due_date?: string;
  currency: string;
  subtotal: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  line_items?: any[];
  payments?: any[];
}

export interface BillingMetrics {
  active_subscriptions: number;
  trial_subscriptions: number;
  mrr: number;
  outstanding: number;
  collected_this_year: number;
  overdue_invoices: number;
}

@Injectable({ providedIn: 'root' })
export class SaasBillingService {
  private http = inject(HttpClient);
  private base = '/api/v1/saas-billing';

  getMetrics(): Observable<any> { return this.http.get(`${this.base}/dashboard/`); }
  runCycle(): Observable<any> { return this.http.post(`${this.base}/dashboard/run_cycle/`, {}); }
  getUsage(tenantId?: string): Observable<any> {
    const q = tenantId ? `?tenant_id=${tenantId}` : '';
    return this.http.get(`${this.base}/dashboard/usage/${q}`);
  }

  getPlans(): Observable<any> { return this.http.get(`${this.base}/plans/?page_size=100`); }
  createPlan(body: Partial<SubscriptionPlan>): Observable<any> { return this.http.post(`${this.base}/plans/`, body); }
  updatePlan(id: string, body: Partial<SubscriptionPlan>): Observable<any> { return this.http.patch(`${this.base}/plans/${id}/`, body); }
  deletePlan(id: string): Observable<any> { return this.http.delete(`${this.base}/plans/${id}/`); }

  getSubscriptions(params = ''): Observable<any> { return this.http.get(`${this.base}/subscriptions/?page_size=100${params}`); }
  provision(body: { tenant_id: string; plan_id: string; trial_days?: number }): Observable<any> {
    return this.http.post(`${this.base}/subscriptions/provision/`, body);
  }
  generateInvoice(subId: string): Observable<any> { return this.http.post(`${this.base}/subscriptions/${subId}/generate_invoice/`, {}); }
  cancelSubscription(subId: string, atPeriodEnd = true): Observable<any> {
    return this.http.post(`${this.base}/subscriptions/${subId}/cancel/`, { at_period_end: atPeriodEnd });
  }

  getInvoices(params = ''): Observable<any> { return this.http.get(`${this.base}/invoices/?page_size=100${params}`); }
  recordPayment(invoiceId: string, body: { amount: number; method: string; reference?: string }): Observable<any> {
    return this.http.post(`${this.base}/invoices/${invoiceId}/record_payment/`, body);
  }
}
