import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ChildSummary {
  student_id: string;
  student_number: string;
  status: string;
  name: string;
  gender: string;
  grade_level: string | null;
  outstanding_balance: number;
  billing_account_id: string | null;
}

export interface ChildDetail {
  student_id: string;
  student_number: string;
  status: string;
  profile: Record<string, any>;
  grade_level: string | null;
  finance: {
    billing_account_id: string | null;
    account_number: string | null;
    outstanding_balance: number;
    credit_balance: number;
    invoices: any[];
    receipts: any[];
    online_payments: any[];
  };
  family_relations: any[];
}

/**
 * خدمة بيانات بوابة ولي الأمر — أبناؤه، تفاصيلهم، وطلبات السداد.
 */
@Injectable({ providedIn: 'root' })
export class ParentService {
  private http = inject(HttpClient);
  private base = environment.apiUrl || '/api/v1/';

  readonly children = signal<ChildSummary[]>([]);
  readonly loadingChildren = signal(false);

  loadChildren(): Observable<{ children: ChildSummary[]; count: number }> {
    this.loadingChildren.set(true);
    return this.http.get<{ children: ChildSummary[]; count: number }>(
      `${this.base}portal/parent/children/`
    ).pipe(tap({
      next: (res) => { this.children.set(res.children || []); this.loadingChildren.set(false); },
      error: () => this.loadingChildren.set(false),
    }));
  }

  getChild(studentId: string): Observable<ChildDetail> {
    return this.http.get<ChildDetail>(`${this.base}portal/parent/children/${studentId}/`);
  }

  /** طلبات السداد الأونلاين الخاصة بولي الأمر. */
  listMyPayments(): Observable<any> {
    return this.http.get<any>(`${this.base}student-finance/online-payments/`, { params: { mine: 'true' } });
  }

  /** تقديم طلب سداد عبر تحويل بنكي مع إرفاق الإيصال. */
  submitPayment(form: FormData): Observable<any> {
    return this.http.post<any>(`${this.base}student-finance/online-payments/`, form);
  }

  /** إعلانات المدرسة الموجّهة لأولياء الأمور. */
  listAnnouncements(): Observable<any> {
    return this.http.get<any>(`${this.base}portal/announcements/`);
  }

  /** إرسال رسالة إلى الإدارة أو معلّم. */
  contact(payload: { audience: string; subject: string; body: string }): Observable<any> {
    return this.http.post<any>(`${this.base}portal/parent/contact/`, payload);
  }
}
