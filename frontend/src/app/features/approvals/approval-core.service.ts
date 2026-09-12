import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface InboxItem {
  id: string;
  item_type: string;
  item_id: string;
  title_ar: string;
  title_en: string;
  status: string;
  is_starred: boolean;
  priority_code: string | null;
}

export interface ApprovalRequest {
  id: string;
  workflow_instance_id: string | null;
  category: string;
  category_name: string | null;
  requester_id: string;
  status: string;
  payload: any;
  title_ar: string;
  title_en: string;
  priority: string | null;
  priority_code: string | null;
  current_step: string | null;
  created_at: string;
}

export interface ApprovalCategory {
  id: string;
  name_ar: string;
  name_en: string;
  code: string;
}

export interface ApprovalPriority {
  id: string;
  name: string;
  code: string;
}

export interface UnifiedApprovalItem {
  id: string;
  source: string;
  original_id: string;
  category_code: string;
  category_name_ar: string;
  module: string;
  module_name_ar: string;
  icon: string;
  title_ar: string;
  reference_number: string;
  amount: number | null;
  currency: string;
  requester_name: string;
  status: string;
  priority_code: string;
  created_at: string | null;
  details: any;
}

export interface ApprovalStats {
  total_pending: number;
  urgent_count: number;
  approved_today: number;
  total_pending_amount_sdg: number;
  counts_by_module: Record<string, number>;
  counts_by_category: Record<string, number>;
}

function unwrapList<T>(res: any): T[] {
  return Array.isArray(res) ? res : (res?.data ?? []);
}


@Injectable({ providedIn: 'root' })
export class ApprovalCoreService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/approvals';

  inboxItems = signal<InboxItem[]>([]);
  selectedRequest = signal<ApprovalRequest | null>(null);
  categories = signal<ApprovalCategory[]>([]);
  priorities = signal<ApprovalPriority[]>([]);
  loading = signal<boolean>(false);

  getMyInboxItems(): Observable<InboxItem[]> {
    this.loading.set(true);
    return this.http.get<InboxItem[]>(`${this.apiUrl}/inbox/my-items/`).pipe(
      tap({ next: (data) => this.inboxItems.set(data), finalize: () => this.loading.set(false) })
    );
  }

  toggleStar(itemId: string): Observable<InboxItem> {
    return this.http.post<InboxItem>(`${this.apiUrl}/inbox/${itemId}/toggle-star/`, {});
  }

  archiveItem(itemId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/inbox/${itemId}/archive/`, {});
  }

  markRead(itemId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/inbox/${itemId}/mark-read/`, {});
  }

  bulkArchive(itemIds: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/inbox/bulk-archive/`, { item_ids: itemIds });
  }

  getRequest(id: string): Observable<ApprovalRequest> {
    this.loading.set(true);
    return this.http.get<ApprovalRequest>(`${this.apiUrl}/requests/${id}/`).pipe(
      tap({ next: (data) => this.selectedRequest.set(data), finalize: () => this.loading.set(false) })
    );
  }

  createRequest(payload: {
    category: string; title_ar?: string; title_en?: string; payload?: any;
    priority_code?: string; assignee_id?: string; requester_id?: string;
  }): Observable<ApprovalRequest> {
    return this.http.post<ApprovalRequest>(`${this.apiUrl}/requests/`, payload);
  }

  makeDecision(requestId: string, action: 'approve' | 'reject' | 'return', comments?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/requests/${requestId}/decision/`, { action, comments });
  }

  cancelRequest(requestId: string, reason?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/requests/${requestId}/cancel/`, { reason });
  }

  bulkApprove(requestIds: string[], comments?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/requests/bulk-approve/`, { request_ids: requestIds, comments });
  }

  bulkReject(requestIds: string[], comments?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/requests/bulk-reject/`, { request_ids: requestIds, comments });
  }

  bulkDelegate(requestIds: string[], delegateToId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/requests/bulk-delegate/`, {
      request_ids: requestIds, delegate_to_id: delegateToId,
    });
  }

  getTimeline(requestId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/requests/${requestId}/timeline/`);
  }

  getSlaStatus(requestId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/requests/${requestId}/sla-status/`);
  }

  getComments(requestId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/comments/`, { params: { request: requestId } as any });
  }

  addComment(requestId: string, comment: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/comments/`, { request: requestId, comment });
  }

  getAttachments(requestId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/attachments/with-documents/`, { params: { request: requestId } as any });
  }

  addAttachment(requestId: string, documentId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/attachments/`, { request: requestId, document_id: documentId });
  }

  loadCategories(): Observable<ApprovalCategory[]> {
    return this.http.get(`${this.apiUrl}/categories/`).pipe(
      map((res) => unwrapList<ApprovalCategory>(res)),
      tap((data) => this.categories.set(data))
    );
  }

  loadPriorities(): Observable<ApprovalPriority[]> {
    return this.http.get(`${this.apiUrl}/priorities/`).pipe(
      map((res) => unwrapList<ApprovalPriority>(res)),
      tap((data) => this.priorities.set(data))
    );
  }

  // ==========================================
  // مركز الموافقات الموحد — Unified Approvals Hub
  // ==========================================
  unifiedItems = signal<UnifiedApprovalItem[]>([]);
  unifiedStats = signal<ApprovalStats | null>(null);

  getUnifiedInbox(params?: { module?: string; category?: string; status?: string; search?: string }): Observable<UnifiedApprovalItem[]> {
    this.loading.set(true);
    return this.http.get<UnifiedApprovalItem[]>(`${this.apiUrl}/unified-inbox/`, { params: (params || {}) as any }).pipe(
      tap({
        next: (data) => this.unifiedItems.set(data),
        finalize: () => this.loading.set(false),
      })
    );
  }

  getUnifiedStats(): Observable<ApprovalStats> {
    return this.http.get<ApprovalStats>(`${this.apiUrl}/unified-inbox/stats/`).pipe(
      tap({
        next: (s) => this.unifiedStats.set(s),
      })
    );
  }

  takeUnifiedAction(payload: {
    source: string;
    original_id: string;
    action: 'approve' | 'reject' | 'return';
    comments?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/unified-inbox/take-action/`, payload);
  }

  bulkUnifiedAction(
    items: { source: string; original_id: string; id: string }[],
    action: 'approve' | 'reject',
    comments?: string
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/unified-inbox/bulk-action/`, { items, action, comments });
  }
}

