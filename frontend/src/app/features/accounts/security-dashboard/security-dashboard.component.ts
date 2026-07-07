import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiClientService } from '../../../core/services/api-client.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../../shared/nebras/nb-stat-card.component';

export interface SecurityStats {
  active_sessions: number;
  total_users: number;
  locked_users: number;
}

export interface UserSession {
  id: number;
  device_name: string;
  browser: string;
  operating_system: string;
  ip_address: string;
  last_activity: string;
  created_at: string;
  is_current: boolean;
}

/**
 * لوحة التحكم الأمنية — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-security-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="لوحة التحكم الأمنية (Security Dashboard)"
        subtitle="مراقبة الجلسات الفعالة، والتحقق من حالة الحسابات ومحاولات الاختراق."
      ></nb-page-header>

      <div class="stats-grid">
        <nb-stat-card label="الجلسات النشطة" [value]="stats()?.active_sessions || 0" valueKind="info"></nb-stat-card>
        <nb-stat-card label="إجمالي المستخدمين" [value]="stats()?.total_users || 0"></nb-stat-card>
        <nb-stat-card label="الحسابات المغلقة (Locked)" [value]="stats()?.locked_users || 0" [valueKind]="(stats()?.locked_users || 0) ? 'danger' : 'default'"></nb-stat-card>
      </div>

      <nb-panel title="جلسات العمل الخاصة بك">
        <div class="sessions-list">
          @for (session of sessions(); track session.id) {
            <div class="session-item" [class.current]="session.is_current">
              <div class="session-details">
                <div class="device-name">
                  {{ session.device_name || 'جهاز غير معروف' }}
                  @if (session.is_current) { <span class="nb-badge-info">الجلسة الحالية</span> }
                </div>
                <div class="technical-details">
                  <span>{{ session.browser }} ({{ session.operating_system }})</span> ·
                  <span>{{ session.ip_address }}</span>
                </div>
                <div class="activity-time">آخر نشاط: {{ session.last_activity | date:'yyyy-MM-dd HH:mm' }}</div>
              </div>
              @if (!session.is_current) {
                <button class="nb-btn-danger sm" (click)="terminateSession(session.id)">إنهاء الجلسة</button>
              }
            </div>
          }
        </div>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .sessions-list { display: flex; flex-direction: column; gap: 12px; }
    .session-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 16px; background: var(--nb-surface-raised);
      border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius);
    }
    .session-item.current { border-color: var(--nb-primary-300); background: var(--nb-primary-50); }
    .device-name { color: var(--nb-text); font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 8px; }
    .technical-details { font-size: 12px; color: var(--nb-text-muted); margin-top: 4px; }
    .activity-time { font-size: 11px; color: var(--nb-text-faint); margin-top: 4px; }
    .nb-btn-danger.sm { height: 30px; padding: 0 14px; font-size: 12px; }
  `]
})
export class SecurityDashboardComponent implements OnInit {
  private apiClient = inject(ApiClientService);

  stats = signal<SecurityStats | null>(null);
  sessions = signal<UserSession[]>([]);

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.apiClient.get<any>('identity/security-dashboard/').subscribe(res => {
      if (res.success) {
        this.stats.set(res.data.stats);
        this.sessions.set(res.data.my_sessions);
      }
    });
  }

  terminateSession(sessionId: number) {
    this.apiClient.post<any>(`identity/sessions/${sessionId}/terminate/`, {}).subscribe(res => {
      if (res.success) {
        this.loadDashboard();
      }
    });
  }
}