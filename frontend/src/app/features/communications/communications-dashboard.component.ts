import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { CommunicationsService } from './communications.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../shared/nebras/nb-stat-card.component';

/**
 * منصة الاتصالات الموحدة والإشعارات — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-communications-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, SlicePipe, MatTabsModule, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="منصة الاتصالات الموحدة والإشعارات"
        subtitle="إرسال وتتبع الرسائل (بريد إلكتروني، SMS، واتساب، إشعارات فورية)"
      ></nb-page-header>

      @if (summary(); as s) {
        <div class="stats-grid">
          <nb-stat-card label="إجمالي الاتصالات اليوم" [value]="s.today_messages"></nb-stat-card>
          <nb-stat-card label="تم تسليمها" [value]="s.delivered_today" valueKind="success"></nb-stat-card>
          <nb-stat-card label="فشلت" [value]="s.failed_today" [valueKind]="s.failed_today ? 'danger' : 'default'"></nb-stat-card>
          <nb-stat-card label="في الطابور" [value]="s.queued" [valueKind]="s.queued ? 'warning' : 'default'"></nb-stat-card>
        </div>
      }

      <nb-panel [flush]="true">
        <mat-tab-group class="nb-tabs">
          <mat-tab label="أحدث الرسائل">
            <div class="tbl">
              <div class="tbl-head msg">
                <span>القناة</span><span>المستلم</span><span>الموضوع / المحتوى</span><span>الحالة</span><span>الوقت</span>
              </div>
              @for (element of messages(); track element.id) {
                <div class="tbl-row msg">
                  <span class="ch">{{ element.channel_name }}</span>
                  <span>{{ element.recipients && element.recipients[0] ? element.recipients[0].address : 'غير محدد' }}</span>
                  <span>{{ (element.subject || element.body) | slice:0:60 }}…</span>
                  <span><span [class]="statusBadge(element.status)">{{ getStatusLabel(element.status) }}</span></span>
                  <span>{{ element.created_at | date:'short' }}</span>
                </div>
              }
              @if (messages().length === 0) { <div class="tbl-empty">لا توجد رسائل مرسلة مؤخراً.</div> }
            </div>
          </mat-tab>

          <mat-tab label="مزودي الخدمة والقنوات">
            <div class="grid-cards">
              @for (p of providers(); track p.id) {
                <div class="nb-card">
                  <div class="pc-head">
                    <h3>{{ p.name }}</h3>
                    <span class="nb-badge-ai">{{ p.provider_type }}</span>
                  </div>
                  <p><strong>القناة:</strong> {{ p.channel_name }}</p>
                  <p><strong>الحالة:</strong>
                    <span [class]="p.health_status === 'healthy' ? 'nb-badge-success' : 'nb-badge-danger'">
                      {{ p.health_status === 'healthy' ? 'نشط وسليم' : 'غير متصل' }}
                    </span>
                  </p>
                </div>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .nb-tabs { padding: 4px 8px 8px; }
    .tbl { display: flex; flex-direction: column; padding-top: 8px; }
    .tbl-head.msg, .tbl-row.msg { grid-template-columns: 1.2fr 1.4fr 2fr 1fr 1fr; }
    .tbl-head, .tbl-row { display: grid; gap: 8px; padding: 9px 16px; align-items: center; }
    .tbl-head {
      background: var(--nb-surface-raised);
      border-bottom: 1px solid var(--nb-border-soft);
      padding: 8px 16px;
      font-size: 11px;
      font-weight: 700;
      color: var(--nb-text-muted);
    }
    .tbl-row { border-bottom: 1px solid var(--nb-border-row); font-size: 13px; color: var(--nb-text); }
    .tbl-row:last-child { border-bottom: none; }
    .tbl-row:hover { background: var(--nb-surface-raised); }
    .ch { font-weight: 600; }
    .tbl-empty { padding: 28px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
    .grid-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 12px;
      padding: 12px 8px 8px;
    }
    .pc-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .pc-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .nb-card p { font-size: 12px; color: var(--nb-text-secondary); margin: 6px 0; }
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

  statusBadge(status: string): string {
    switch (status) {
      case 'sent': case 'delivered': case 'read': return 'nb-badge-success';
      case 'failed': case 'bounced': return 'nb-badge-danger';
      case 'queued': case 'processing': return 'nb-badge-warning';
      default: return 'nb-badge-neutral';
    }
  }
}
