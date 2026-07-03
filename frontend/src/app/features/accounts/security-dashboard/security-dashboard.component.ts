import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiClientService } from '../../../core/services/api-client.service';

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

@Component({
  selector: 'app-security-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container" dir="rtl">
      <div class="page-header">
        <h1>لوحة التحكم الأمنية (Security Dashboard)</h1>
        <p>مراقبة الجلسات الفعالة، والتحقق من حالة الحسابات ومحاولات الاختراق.</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-title">الجلسات النشطة</div>
          <div class="stat-value">{{ stats()?.active_sessions || 0 }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">إجمالي المستخدمين</div>
          <div class="stat-value">{{ stats()?.total_users || 0 }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">الحسابات المغلقة (Locked)</div>
          <div class="stat-value warning">{{ stats()?.locked_users || 0 }}</div>
        </div>
      </div>

      <div class="sessions-section">
        <h2>جلسات العمل الخاصة بك</h2>
        <div class="sessions-list">
          <div *ngFor="let session of sessions()" class="session-item" [class.current]="session.is_current">
            <div class="session-details">
              <div class="device-name">
                {{ session.device_name || 'جهاز غير معروف' }} 
                <span *ngIf="session.is_current" class="current-badge">الجلسة الحالية</span>
              </div>
              <div class="technical-details">
                <span>{{ session.browser }} ({{ session.operating_system }})</span> • 
                <span>{{ session.ip_address }}</span>
              </div>
              <div class="activity-time">
                آخر نشاط: {{ session.last_activity | date:'yyyy-MM-dd HH:mm' }}
              </div>
            </div>
            <button 
              *ngIf="!session.is_current" 
              class="btn-danger" 
              (click)="terminateSession(session.id)"
            >
              إنهاء الجلسة
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 24px;
    }
    .page-header {
      margin-bottom: 32px;
    }
    .page-header h1 {
      font-size: 24px;
      color: #f3f4f6;
      margin-bottom: 8px;
    }
    .page-header p {
      color: #9ca3af;
      font-size: 14px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }
    .stat-card {
      background-color: var(--surface-color, #1f2937);
      border: 1px solid var(--border-color, #374151);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .stat-title {
      font-size: 14px;
      color: #9ca3af;
      margin-bottom: 8px;
    }
    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #f3f4f6;
    }
    .stat-value.warning {
      color: #f87171;
    }
    .sessions-section {
      background-color: var(--surface-color, #1f2937);
      border: 1px solid var(--border-color, #374151);
      border-radius: 12px;
      padding: 24px;
    }
    .sessions-section h2 {
      font-size: 18px;
      color: #f3f4f6;
      margin-bottom: 20px;
    }
    .sessions-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .session-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background-color: #111827;
      border: 1px solid #374151;
      border-radius: 8px;
    }
    .session-item.current {
      border-color: var(--primary-color, #2563eb);
      background-color: rgba(37, 99, 235, 0.05);
    }
    .device-name {
      color: #f3f4f6;
      font-weight: 600;
      font-size: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .current-badge {
      font-size: 11px;
      background-color: var(--primary-color, #2563eb);
      color: white;
      padding: 2px 8px;
      border-radius: 9999px;
    }
    .technical-details {
      font-size: 13px;
      color: #9ca3af;
      margin-top: 4px;
    }
    .activity-time {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
    }
    .btn-danger {
      padding: 8px 16px;
      background-color: #ef4444;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      font-size: 13px;
      transition: background 0.2s;
    }
    .btn-danger:hover {
      background-color: #dc2626;
    }
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