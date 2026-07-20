import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { CommunicationsService } from './communications.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../shared/nebras/nb-stat-card.component';

@Component({
  selector: 'app-communications-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, MatTabsModule, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="مركز عمليات الاتصالات (Communications Command Center)"
        subtitle="متابعة حركة الرسائل عبر البريد الإلكتروني والواتساب وSMS والإشعارات بالسودان."
      >
        <button class="nb-btn-primary" (click)="toggleNewMessageModal()">+ إرسال رسالة جديدة</button>
      </nb-page-header>

      <div class="stats-grid">
        <nb-stat-card label="رسائل اليوم المرسلة" [value]="(summary().total_sent_today | number) ?? ''" suffix="رسالة" valueKind="info"></nb-stat-card>
        <nb-stat-card label="نسبة نجاح التسليم" [value]="summary().delivery_success_rate" suffix="%" valueKind="success"></nb-stat-card>
        <nb-stat-card label="الرسائل المرتجعة/الفاشلة" [value]="summary().failed_messages" suffix="رسالة" valueKind="danger"></nb-stat-card>
        <nb-stat-card label="القنوات والمزودين النشطين" [value]="summary().active_channels_count + ' قنوات'"></nb-stat-card>
      </div>

      <div class="quick-nav-cards">
        <a routerLink="/communications/templates" class="nav-card">
          <div class="nav-icon">📝</div>
          <div class="nav-meta">
            <strong>قوالب الرسائل والمتغيرات</strong>
            <span>إدارة صياغة الرسائل والرموز {{ '{{student_name}}' }}</span>
          </div>
          <span class="arrow">➔</span>
        </a>
        <a routerLink="/communications/channels" class="nav-card">
          <div class="nav-icon">🔌</div>
          <div class="nav-meta">
            <strong>قنوات ومزودات الخدمة</strong>
            <span>فحص واختبار ربط SMTP, WhatsApp & Zain Gateway</span>
          </div>
          <span class="arrow">➔</span>
        </a>
      </div>

      <nb-panel [flush]="true">
        <mat-tab-group class="nb-tabs">
          <mat-tab label="سجل حركة الرسائل الفورية">
            <div class="list">
              <h3>أحدث الرسائل الصادرة وحالة التسليم</h3>
              @for (m of safeMessages(); track m.id) {
                <div class="row">
                  <div class="msg-info">
                    <strong>{{ m.recipient_name }} ({{ m.recipient_address }})</strong>
                    <span class="meta">{{ m.channel_name }} — {{ m.subject || 'رسالة قصيرة' }}</span>
                  </div>
                  <div class="msg-status">
                    <span class="time">{{ m.sent_at }}</span>
                    <span class="nb-badge-success">تم التسليم ✓</span>
                  </div>
                </div>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      </nb-panel>

      <!-- Modal إرسال رسالة جديدة (Nebras OS Approved Modal) -->
      @if (showNewMessageModal()) {
        <div class="modal-backdrop" (click)="toggleNewMessageModal()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>إرسال رسالة إشعار جديدة</h3>
              <button class="close-btn" (click)="toggleNewMessageModal()">×</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>اسم المستلم / ولي الأمر *</label>
                <input type="text" [(ngModel)]="newMessageForm.recipient_name" placeholder="مثال: عثمان إبراهيم الكباشي" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>قناة الإرسال</label>
                  <select [(ngModel)]="newMessageForm.channel">
                    <option value="email">البريد الإلكتروني (SMTP)</option>
                    <option value="whatsapp">واتساب الأعمال</option>
                    <option value="sms">الرسائل النصية SMS (زين / سوداني)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>العنوان / الرقم *</label>
                  <input type="text" [(ngModel)]="newMessageForm.address" placeholder="09xxxxxxxx أو بريد" />
                </div>
              </div>
              <div class="form-group">
                <label>موضوع الرسالة</label>
                <input type="text" [(ngModel)]="newMessageForm.subject" placeholder="مثال: إشعار هام من إدارة المدرسة" />
              </div>
              <div class="form-group">
                <label>محتوى الرسالة *</label>
                <textarea rows="3" [(ngModel)]="newMessageForm.body" placeholder="اكتب نص الرسالة هنا..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="nb-btn-secondary" (click)="toggleNewMessageModal()">إلغاء</button>
              <button class="nb-btn-primary" (click)="submitSendMessage()">إرسال الرسالة الآن</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .quick-nav-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .nav-card { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-lg, 10px); padding: 14px 16px; display: flex; align-items: center; gap: 12px; text-decoration: none; color: inherit; transition: border-color 0.2s, box-shadow 0.2s; }
    .nav-card:hover { border-color: var(--nb-primary-600); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .nav-icon { font-size: 24px; }
    .nav-meta { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .nav-meta strong { font-size: 13.5px; color: var(--nb-text); }
    .nav-meta span { font-size: 11.5px; color: var(--nb-text-muted); }
    .arrow { font-size: 14px; color: var(--nb-primary-600); }
    .nb-tabs { padding: 4px 8px 8px; }
    .list { padding: 16px; }
    .list h3 { font-weight: 700; color: var(--nb-text); margin: 0 0 14px; font-size: 14px; }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--nb-border-soft); }
    .row:last-child { border-bottom: none; }
    .msg-info strong { display: block; font-size: 13px; color: var(--nb-text); }
    .msg-info .meta { font-size: 11px; color: var(--nb-text-muted); }
    .msg-status { display: flex; align-items: center; gap: 10px; }
    .time { font-size: 11px; color: var(--nb-text-faint); }
    .nb-btn-primary { background: var(--nb-primary-600); color: white; border: none; padding: 8px 16px; border-radius: var(--nb-radius); font-size: 13px; font-weight: 600; cursor: pointer; }
    .nb-btn-secondary { background: var(--nb-surface); border: 1px solid var(--nb-border); color: var(--nb-text); padding: 8px 16px; border-radius: var(--nb-radius); font-size: 13px; cursor: pointer; }
    .nb-badge-success { background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }

    /* Modal */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-card { background: var(--nb-surface); width: 500px; max-width: 90vw; border-radius: var(--nb-radius-lg, 12px); box-shadow: 0 10px 25px rgba(0,0,0,0.15); overflow: hidden; }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--nb-border-soft); }
    .modal-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--nb-text); }
    .close-btn { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--nb-text-muted); }
    .modal-body { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group label { font-size: 12px; font-weight: 600; color: var(--nb-text-secondary); }
    .form-group input, .form-group select, .form-group textarea { padding: 8px 12px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); font-size: 13px; outline: none; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--nb-border-soft); background: var(--nb-bg); }
  `]
})
export class CommunicationsDashboardComponent {
  private commService = inject(CommunicationsService);

  summary = signal({
    total_sent_today: 1420,
    delivery_success_rate: 99.2,
    failed_messages: 8,
    active_channels_count: 4,
  });

  messages = signal<any[]>([]);
  showNewMessageModal = signal(false);

  newMessageForm = {
    recipient_name: '',
    channel: 'email',
    address: '',
    subject: '',
    body: '',
  };

  constructor() {
    this.commService.getDashboardSummary().subscribe((data) => this.summary.set(data));
    this.commService.getMessages().subscribe((data) => {
      const arr = Array.isArray(data) ? data : (data as any)?.results || [];
      this.messages.set(arr);
    });
  }

  safeMessages = computed(() => {
    const raw = this.messages();
    return Array.isArray(raw) ? raw : [];
  });

  toggleNewMessageModal(): void {
    this.showNewMessageModal.update((v) => !v);
  }

  submitSendMessage(): void {
    if (!this.newMessageForm.recipient_name) return;
    this.commService.sendMessage(this.newMessageForm).subscribe(() => {
      this.messages.update((list) => [
        {
          id: String(Date.now()),
          channel_name: this.newMessageForm.channel === 'whatsapp' ? 'واتساب الأعمال' : this.newMessageForm.channel === 'sms' ? 'SMS' : 'البريد الإلكتروني',
          recipient_name: this.newMessageForm.recipient_name,
          recipient_address: this.newMessageForm.address || '0912345678',
          subject: this.newMessageForm.subject || 'إشعار مباشر من النظام',
          status: 'sent',
          priority: 'high',
          sent_at: 'الآن',
        },
        ...(Array.isArray(list) ? list : []),
      ]);
      this.toggleNewMessageModal();
      this.newMessageForm = { recipient_name: '', channel: 'email', address: '', subject: '', body: '' };
    });
  }
}
