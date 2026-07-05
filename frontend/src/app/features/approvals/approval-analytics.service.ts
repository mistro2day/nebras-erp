import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface ApprovalDashboardStats {
  pending: number;
  approved: number;
  rejected: number;
  overdue: number;
  avg_decision_seconds: number;
  by_category: { category__code: string; count: number }[];
  by_priority: { priority__code: string; count: number }[];
}

@Injectable({ providedIn: 'root' })
export class ApprovalAnalyticsService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/approvals';

  stats = signal<ApprovalDashboardStats | null>(null);
  loading = signal<boolean>(false);

  getDashboardStats(): Observable<ApprovalDashboardStats> {
    this.loading.set(true);
    return this.http.get<ApprovalDashboardStats>(`${this.apiUrl}/requests/dashboard-stats/`).pipe(
      tap({ next: (data) => this.stats.set(data), finalize: () => this.loading.set(false) })
    );
  }

  recalculateStatistics(): Observable<any> {
    return this.http.post(`${this.apiUrl}/statistics/recalculate/`, {});
  }

  getMyDashboardConfig(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboards/my-dashboard/`);
  }
}
