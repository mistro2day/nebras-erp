import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface Delegation {
  id: string;
  user_id: string;
  delegate_to_id: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  category: string | null;
  department_id: string | null;
  reason: string | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class ApprovalDelegationService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/approvals';

  delegations = signal<Delegation[]>([]);
  loading = signal<boolean>(false);

  getMyDelegations(): Observable<Delegation[]> {
    this.loading.set(true);
    return this.http.get<Delegation[]>(`${this.apiUrl}/delegations/my-delegations/`).pipe(
      tap({ next: (data) => this.delegations.set(data), finalize: () => this.loading.set(false) })
    );
  }

  createDelegation(payload: {
    delegate_to_id: string; start_date: string; end_date: string;
    category?: string; department_id?: string; reason?: string;
  }): Observable<Delegation> {
    return this.http.post<Delegation>(`${this.apiUrl}/delegations/`, payload);
  }

  deactivateDelegation(id: string): Observable<Delegation> {
    return this.http.post<Delegation>(`${this.apiUrl}/delegations/${id}/deactivate/`, {});
  }
}
