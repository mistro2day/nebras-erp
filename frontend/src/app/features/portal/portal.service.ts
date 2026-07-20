import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

export interface PortalAnnouncement {
  id: string;
  title: string;
  content: string;
  target_audience: 'all' | 'parents' | 'students' | 'applicants';
  publish_date: string;
  is_published: boolean;
}

export interface PortalSessionInfo {
  id: string;
  user_name: string;
  user_type: string;
  ip_address: string;
  logged_in_at: string;
}

const FALLBACK_ANNOUNCEMENTS: PortalAnnouncement[] = [
  {
    id: 'a1',
    title: 'بدء التسجيل للنقل المدرسي وحافلات الفصل القادم',
    content: 'نرجو من السادة أولياء الأمور حجز مقاعد أبنائهم قبل انتهاء الموعد المضي المحدد.',
    target_audience: 'parents',
    publish_date: '2026-07-19',
    is_published: true,
  },
  {
    id: 'a2',
    title: 'جدول امتحانات الفصل الدراسي الثاني الموحد',
    content: 'تم نشر جداول الامتحانات النهائية عبر البوابات الأكاديمية للطالب وولي الأمر.',
    target_audience: 'all',
    publish_date: '2026-07-18',
    is_published: true,
  },
];

const FALLBACK_SESSIONS: PortalSessionInfo[] = [
  { id: 's1', user_name: 'أحمد الجميل (ولي أمر)', user_type: 'parent', ip_address: '197.252.12.4', logged_in_at: 'منذ 5 دقائق' },
  { id: 's2', user_name: 'خالد أحمد الجميل (طالب)', user_type: 'student', ip_address: '197.252.12.5', logged_in_at: 'منذ 12 دقيقة' },
  { id: 's3', user_name: 'فهد المطيري (متقدم)', user_type: 'applicant', ip_address: '185.12.44.1', logged_in_at: 'منذ ساعة' },
];

@Injectable({
  providedIn: 'root',
})
export class PortalService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/portal';

  private toArray<T>(res: any, fallback: T[]): T[] {
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.results)) return res.results;
    return fallback;
  }

  // 1. Announcements
  getAnnouncements(): Observable<PortalAnnouncement[]> {
    return this.http.get<any>(`${this.baseUrl}/announcements/`).pipe(
      map((res) => this.toArray<PortalAnnouncement>(res, FALLBACK_ANNOUNCEMENTS)),
      catchError(() => of(FALLBACK_ANNOUNCEMENTS))
    );
  }

  createAnnouncement(data: Partial<PortalAnnouncement>): Observable<PortalAnnouncement> {
    return this.http.post<PortalAnnouncement>(`${this.baseUrl}/announcements/`, data);
  }

  // 2. Portal Active Sessions & Audits
  getActiveSessions(): Observable<PortalSessionInfo[]> {
    return this.http.get<any>(`${this.baseUrl}/sessions/`).pipe(
      map((res) => this.toArray<PortalSessionInfo>(res, FALLBACK_SESSIONS)),
      catchError(() => of(FALLBACK_SESSIONS))
    );
  }
}
