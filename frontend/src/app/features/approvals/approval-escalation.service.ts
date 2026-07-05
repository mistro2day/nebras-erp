import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface Escalation {
  id: string;
  request: string;
  original_approver_id: string;
  escalated_to_id: string;
  escalated_at: string;
  escalation_level: number;
  reason: string | null;
  resolved: boolean;
  resolved_at: string | null;
}

export interface SlaTracking {
  id: string;
  request: string;
  due_at: string;
  is_violated: boolean;
  warning_at: string | null;
  violated_at: string | null;
  business_hours_only: boolean;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class ApprovalEscalationService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/approvals';

  escalations = signal<Escalation[]>([]);
  overdueRequests = signal<SlaTracking[]>([]);
  loading = signal<boolean>(false);

  getActiveEscalations(): Observable<Escalation[]> {
    this.loading.set(true);
    return this.http.get<Escalation[]>(`${this.apiUrl}/escalations/active/`).pipe(
      tap({ next: (data) => this.escalations.set(data), finalize: () => this.loading.set(false) })
    );
  }

  createEscalation(payload: { request: string; escalated_to_id: string; reason?: string }): Observable<Escalation> {
    return this.http.post<Escalation>(`${this.apiUrl}/escalations/`, payload);
  }

  resolveEscalation(id: string): Observable<Escalation> {
    return this.http.post<Escalation>(`${this.apiUrl}/escalations/${id}/resolve/`, {});
  }

  getOverdueRequests(): Observable<SlaTracking[]> {
    return this.http.get<SlaTracking[]>(`${this.apiUrl}/sla-tracking/overdue/`).pipe(
      tap((data) => this.overdueRequests.set(data))
    );
  }
}
