import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  category: string;
  priority: string;
  icon?: string;
  is_read: boolean;
  action_url?: string;
  action_label?: string;
  created_at: string;
}

/**
 * مركز الإشعارات داخل التطبيق — يجلب إشعارات المستخدم الحالي، يتابع العدد غير المقروء،
 * ويحدّدها كمقروءة. مصدر البيانات: communications/notifications.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private http = inject(HttpClient);
  private base = environment.apiUrl || '/api/v1/';

  readonly items = signal<AppNotification[]>([]);
  readonly unread = signal<number>(0);

  /** جلب أحدث الإشعارات (غير المؤرشفة). */
  load(): Observable<any> {
    return this.http.get<any>(`${this.base}communications/notifications/`, {
      params: { page_size: '15', ordering: '-created_at' } as any,
    }).pipe(tap((res) => {
      const data = res?.data || res?.results || res || [];
      this.items.set(data);
      this.unread.set(data.filter((n: AppNotification) => !n.is_read).length);
    }));
  }

  /** تحديث عدّاد غير المقروء فقط (خفيف — للاستطلاع الدوري). */
  refreshCount(): Observable<any> {
    return this.http.get<any>(`${this.base}communications/notifications/unread-count/`).pipe(
      tap((res) => this.unread.set(res?.data?.count ?? res?.count ?? 0))
    );
  }

  markRead(id: string): Observable<any> {
    return this.http.post<any>(`${this.base}communications/notifications/${id}/mark-read/`, {}).pipe(
      tap(() => {
        this.items.update(list => list.map(n => n.id === id ? { ...n, is_read: true } : n));
        this.unread.update(c => Math.max(0, c - 1));
      })
    );
  }

  markAllRead(): Observable<any> {
    return this.http.post<any>(`${this.base}communications/notifications/mark-all-read/`, {}).pipe(
      tap(() => {
        this.items.update(list => list.map(n => ({ ...n, is_read: true })));
        this.unread.set(0);
      })
    );
  }
}
