import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { CommunicationsService } from './communications.service';

@Component({
  selector: 'app-communications-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatTableModule, MatTabsModule],
  template: `
    <div class="communications-dashboard" dir="rtl">
      <!-- Header -->
      <header class="dashboard-header">
        <div class="header-info">
          <h1>منصة الاتصالات الموحدة والإشعارات</h1>
          <p>لوحة التحكم المركزية لإرسال وتتبع الرسائل (بريد إلكتروني، SMS، واتساب، إشعارات فورية)</p>
        </div>
      </header>

      <!-- Stats Grid -->
      <div class="stats-grid" *ngIf="summary()">
        <div class="stat-card">
          <mat-icon class="icon total">message</mat-icon>
          <div class="meta">
            <h3>إجمالي الاتصالات اليوم</h3>
            <p class="value">{{ summary().today_messages }}</p>
          </div>
        </div>
        <div class="stat-card">
          <mat-icon class="icon sent">done_all</mat-icon>
          <div class="meta">
            <h3>تم تسليمها</h3>
            <p class="value">{{ summary().delivered_today }}</p>
          </div>
        </div>
        <div class="stat-card">
          <mat-icon class="icon failed">error</mat-icon>
          <div class="meta">
            <h3>فشلت</h3>
            <p class="value">{{ summary().failed_today }}</p>
          </div>
        </div>
        <div class="stat-card">
          <mat-icon class="icon pending">hourglass_empty</mat-icon>
          <div class="meta">
            <h3>في الطابور</h3>
            <p class="value">{{ summary().queued }}</p>
          </div>
        </div>
      </div>

      <!-- Main Tabs -->
      <mat-tab-group class="dashboard-tabs">
        <!-- Tab 1: Recent Messages -->
        <mat-tab label="أحدث الرسائل">
          <div class="tab-content">
            <table mat-table [dataSource]="messages()" class="mat-elevation-z8 comm-table">
              <ng-container matColumnDef="channel">
                <th mat-header-cell *matHeaderCellDef>القناة</th>
                <td mat-cell *matCellDef="let element">
                  <span class="channel-badge" [ngClass]="element.channel_type">
                    <mat-icon>{{ getChannelIcon(element.channel_type) }}</mat-icon>
                    {{ element.channel_name }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="recipient">
                <th mat-header-cell *matHeaderCellDef>المستلم</th>
                <td mat-cell *matCellDef="let element">
                  {{ element.recipients && element.recipients[0] ? element.recipients[0].address : 'غير محدد' }}
                </td>
              </ng-container>

              <ng-container matColumnDef="subject">
                <th mat-header-cell *matHeaderCellDef>الموضوع / المحتوى</th>
                <td mat-cell *matCellDef="let element">{{ element.subject || element.body | slice:0:60 }}...</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>الحالة</th>
                <td mat-cell *matCellDef="let element">
                  <span class="status-badge" [ngClass]="element.status">
                    {{ getStatusLabel(element.status) }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="time">
                <th mat-header-cell *matHeaderCellDef>الوقت</th>
                <td mat-cell *matCellDef="let element">{{ element.created_at | date:'short' }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>

            <div class="no-data" *ngIf="messages().length === 0">
              لا توجد رسائل مرسلة مؤخراً.
            </div>
          </div>
        </mat-tab>

        <!-- Tab 2: Channels & Providers -->
        <mat-tab label="مزودي الخدمة والقنوات">
          <div class="tab-content grid-cards">
            <div class="channel-card" *ngFor="let p of providers()">
              <div class="card-header">
                <h3>{{ p.name }}</h3>
                <span class="provider-type">{{ p.provider_type }}</span>
              </div>
              <div class="card-body">
                <p><strong>القناة:</strong> {{ p.channel_name }}</p>
                <p><strong>الحالة:</strong> 
                  <span class="status-badge" [ngClass]="p.health_status === 'healthy' ? 'sent' : 'failed'">
                    {{ p.health_status === 'healthy' ? 'نشط وسليم' : 'غير متصل' }}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .communications-dashboard {
      padding: 1.5rem;
      font-family: 'Cairo', sans-serif;
      background: #0f172a;
      color: #f8fafc;
      min-height: 100vh;
    }
    .dashboard-header {
      margin-bottom: 2rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 1rem;
    }
    .dashboard-header h1 {
      font-size: 2rem;
      font-weight: 800;
      background: linear-gradient(to left, #6366f1, #10b981);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
    }
    .dashboard-header p { color: #94a3b8; margin: 4px 0 0; }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
      margin-bottom: 2.5rem;
    }
    .stat-card {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .stat-card .icon {
      font-size: 32px; width: 32px; height: 32px;
      padding: 8px; border-radius: 12px;
    }
    .stat-card .icon.total { background: rgba(99, 102, 241, 0.15); color: #818cf8; }
    .stat-card .icon.sent { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .stat-card .icon.failed { background: rgba(239, 68, 68, 0.15); color: #f87171; }
    .stat-card .icon.pending { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .stat-card h3 { font-size: 0.75rem; color: #94a3b8; margin: 0; }
    .stat-card .value { font-size: 1.6rem; font-weight: bold; margin: 2px 0 0 0; }

    .dashboard-tabs {
      background: #1e293b;
      border-radius: 16px;
      padding: 1rem;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .tab-content { padding: 1.5rem 0; }
    
    .comm-table {
      width: 100%;
      background: #1e293b;
      color: #f8fafc;
    }
    .mat-mdc-header-cell {
      color: #94a3b8 !important;
      font-weight: bold;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    }
    .mat-mdc-cell {
      border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
      color: #cbd5e1 !important;
    }

    .channel-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
    }
    .channel-badge mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .channel-badge.email { color: #60a5fa; }
    .channel-badge.whatsapp { color: #34d399; }
    .channel-badge.sms { color: #fbbf24; }

    .status-badge {
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: bold;
    }
    .status-badge.sent, .status-badge.delivered, .status-badge.read {
      background: rgba(16, 185, 129, 0.15); color: #34d399;
    }
    .status-badge.failed, .status-badge.bounced {
      background: rgba(239, 68, 68, 0.15); color: #f87171;
    }
    .status-badge.queued, .status-badge.processing {
      background: rgba(245, 158, 11, 0.15); color: #fbbf24;
    }

    .grid-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem;
    }
    .channel-card {
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 1.25rem;
    }
    .channel-card h3 { margin: 0; font-size: 1.1rem; }
    .provider-type { font-size: 0.7rem; background: rgba(99, 102, 241, 0.2); padding: 2px 6px; border-radius: 4px; color: #818cf8; }
    .no-data { text-align: center; padding: 3rem; color: #64748b; }
  `]
})
export class CommunicationsDashboardComponent implements OnInit {
  commService = inject(CommunicationsService);

  summary = signal<any>(null);
  messages = signal<any[]>([]);
  providers = signal<any[]>([]);
  displayedColumns: string[] = ['channel', 'recipient', 'subject', 'status', 'time'];

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.commService.getDashboardSummary().subscribe({
      next: (res) => {
        if (res && res.success) {
          this.summary.set(res.data);
        }
      }
    });

    this.commService.getMessages().subscribe({
      next: (res) => {
        if (res && res.success) {
          this.messages.set(res.data);
        }
      }
    });

    this.commService.getProviders().subscribe({
      next: (res) => {
        if (res && res.success) {
          this.providers.set(res.data);
        }
      }
    });
  }

  getChannelIcon(type: string): string {
    switch (type) {
      case 'email': return 'email';
      case 'whatsapp': return 'chat';
      case 'sms': return 'textsms';
      case 'push': return 'notifications_active';
      default: return 'message';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'sent': return 'تم الإرسال';
      case 'delivered': return 'تم التسليم';
      case 'read': return 'تمت القراءة';
      case 'failed': return 'فشل';
      case 'queued': return 'في الانتظار';
      default: return status;
    }
  }
}
