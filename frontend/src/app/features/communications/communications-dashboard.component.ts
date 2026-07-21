import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { CommunicationsService, CommunicationMessageItem, MessageStatus } from './communications.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../shared/nebras/nb-stat-card.component';

type SortKey = 'recipient_name' | 'channel_name' | 'status' | 'priority' | 'sent_at';
type SortDir = 'asc' | 'desc';

interface StatusMeta {
  label: string;
  cls: string;
  icon: string;
  step: number; // موضع الحالة في مسار التسليم (للترتيب المنطقي)
}

const STATUS_META: Record<MessageStatus, StatusMeta> = {
  queued:    { label: 'في الطابور', cls: 'st-queued',    icon: '🕐', step: 0 },
  sent:      { label: 'أُرسلت',      cls: 'st-sent',      icon: '➤',  step: 1 },
  delivered: { label: 'تم التسليم',  cls: 'st-delivered', icon: '✓✓', step: 2 },
  read:      { label: 'مقروءة',      cls: 'st-read',      icon: '✓✓', step: 3 },
  failed:    { label: 'فشلت',        cls: 'st-failed',    icon: '✕',  step: -1 },
  bounced:   { label: 'مرتجعة',      cls: 'st-bounced',   icon: '↩',  step: -1 },
};

const CHANNEL_ICON: Record<string, string> = {
  email: '📧', whatsapp: '💬', sms: '📱', push: '🔔',
};

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
            <div class="log">
              <div class="log-head">
                <div class="log-title">
                  <h3>سجل حركة الرسائل الفورية</h3>
                  <span class="log-sub">تتبّع دقيق لحالة التسليم الفعلية لكل رسالة صادرة</span>
                </div>
                <div class="status-legend">
                  @for (s of statusChips(); track s.key) {
                    <button class="chip" [class.active]="statusFilter() === s.key"
                            [class]="'chip ' + s.cls" (click)="setStatusFilter(s.key)">
                      {{ s.icon }} {{ s.label }} <b>{{ s.count }}</b>
                    </button>
                  }
                </div>
              </div>

              <!-- شريط الأدوات: بحث + فلاتر -->
              <div class="toolbar">
                <div class="search-box">
                  <span class="s-icon">🔍</span>
                  <input type="text" [ngModel]="searchTerm()" (ngModelChange)="onSearch($event)"
                         placeholder="ابحث بالمستلم أو العنوان أو الموضوع..." />
                </div>
                <select [ngModel]="channelFilter()" (ngModelChange)="setChannelFilter($event)">
                  <option value="all">كل القنوات</option>
                  <option value="email">📧 البريد الإلكتروني</option>
                  <option value="whatsapp">💬 واتساب</option>
                  <option value="sms">📱 SMS</option>
                  <option value="push">🔔 إشعارات فورية</option>
                </select>
                <select [ngModel]="priorityFilter()" (ngModelChange)="setPriorityFilter($event)">
                  <option value="all">كل الأولويات</option>
                  <option value="high">أولوية عالية</option>
                  <option value="normal">عادية</option>
                  <option value="low">منخفضة</option>
                </select>
                @if (isFiltered()) {
                  <button class="reset-btn" (click)="resetFilters()">✕ مسح الفلاتر</button>
                }
                <span class="result-count">{{ filtered().length }} نتيجة</span>
              </div>

              <!-- الجدول -->
              <div class="table-wrap">
                <table class="msg-table">
                  <thead>
                    <tr>
                      <th class="col-expand"></th>
                      <th class="sortable" (click)="toggleSort('recipient_name')">
                        المستلم <span class="sort-ind">{{ sortIndicator('recipient_name') }}</span>
                      </th>
                      <th class="sortable" (click)="toggleSort('channel_name')">
                        القناة <span class="sort-ind">{{ sortIndicator('channel_name') }}</span>
                      </th>
                      <th>الموضوع</th>
                      <th class="sortable" (click)="toggleSort('status')">
                        حالة التسليم <span class="sort-ind">{{ sortIndicator('status') }}</span>
                      </th>
                      <th class="sortable" (click)="toggleSort('priority')">
                        الأولوية <span class="sort-ind">{{ sortIndicator('priority') }}</span>
                      </th>
                      <th class="sortable" (click)="toggleSort('sent_at')">
                        وقت الإرسال <span class="sort-ind">{{ sortIndicator('sent_at') }}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (m of paged(); track m.id) {
                      <tr class="data-row" [class.expanded]="expandedId() === m.id" (click)="toggleExpand(m.id)">
                        <td class="col-expand"><span class="caret" [class.open]="expandedId() === m.id">▾</span></td>
                        <td class="col-recipient">
                          <strong>{{ m.recipient_name }}</strong>
                          <span class="addr">{{ m.recipient_address }}</span>
                        </td>
                        <td>
                          <span class="channel-tag">{{ channelIcon(m.channel_type) }} {{ m.channel_name }}</span>
                        </td>
                        <td class="col-subject">{{ m.subject || '—' }}</td>
                        <td>
                          <span class="st-badge" [class]="'st-badge ' + statusMeta(m.status).cls">
                            {{ statusMeta(m.status).icon }} {{ statusMeta(m.status).label }}
                          </span>
                          @if ((m.attempts ?? 0) > 1) {
                            <span class="attempts" title="عدد المحاولات">×{{ m.attempts }}</span>
                          }
                        </td>
                        <td>
                          <span class="prio" [class]="'prio prio-' + m.priority">{{ priorityLabel(m.priority) }}</span>
                        </td>
                        <td class="col-time">{{ formatTime(m.sent_at) }}</td>
                      </tr>
                      @if (expandedId() === m.id) {
                        <tr class="detail-row">
                          <td colspan="7">
                            <div class="detail">
                              <div class="timeline">
                                <div class="tl-step done">
                                  <span class="dot">➤</span>
                                  <div><b>أُرسلت</b><span>{{ formatTime(m.sent_at) || 'لم تُرسل بعد' }}</span></div>
                                </div>
                                <div class="tl-step" [class.done]="!!m.delivered_at" [class.failed]="isFail(m.status)">
                                  <span class="dot">{{ isFail(m.status) ? '✕' : '✓✓' }}</span>
                                  <div>
                                    <b>{{ isFail(m.status) ? (m.status === 'bounced' ? 'ارتدّت' : 'فشل التسليم') : 'تم التسليم' }}</b>
                                    <span>{{ isFail(m.status) ? (m.external_status || '—') : (formatTime(m.delivered_at) || 'قيد الانتظار') }}</span>
                                  </div>
                                </div>
                                @if (!isFail(m.status)) {
                                  <div class="tl-step" [class.done]="!!m.read_at">
                                    <span class="dot">👁</span>
                                    <div><b>قُرئت</b><span>{{ formatTime(m.read_at) || 'لم تُقرأ بعد' }}</span></div>
                                  </div>
                                }
                              </div>
                              <div class="detail-meta">
                                <div><span class="k">رمز حالة المزود الخارجي</span><span class="v">{{ m.external_status || '—' }}</span></div>
                                <div><span class="k">عدد المحاولات</span><span class="v">{{ m.attempts ?? 0 }}</span></div>
                                <div><span class="k">معرّف الرسالة</span><span class="v mono">#{{ m.id }}</span></div>
                                @if (m.error_message) {
                                  <div class="err-line"><span class="k">سبب الفشل</span><span class="v err">{{ m.error_message }}</span></div>
                                }
                              </div>
                            </div>
                          </td>
                        </tr>
                      }
                    } @empty {
                      <tr class="empty-row">
                        <td colspan="7">
                          <div class="empty">📭 لا توجد رسائل مطابقة للفلاتر الحالية.</div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- ترقيم الصفحات -->
              @if (filtered().length > 0) {
                <div class="pagination">
                  <span class="page-info">
                    عرض {{ rangeStart() }}–{{ rangeEnd() }} من {{ filtered().length }} رسالة
                  </span>
                  <div class="pager">
                    <button class="pg-btn" [disabled]="currentPage() === 1" (click)="goTo(1)">«</button>
                    <button class="pg-btn" [disabled]="currentPage() === 1" (click)="goTo(currentPage() - 1)">‹</button>
                    @for (p of pageNumbers(); track p) {
                      <button class="pg-btn num" [class.active]="p === currentPage()" (click)="goTo(p)">{{ p }}</button>
                    }
                    <button class="pg-btn" [disabled]="currentPage() === totalPages()" (click)="goTo(currentPage() + 1)">›</button>
                    <button class="pg-btn" [disabled]="currentPage() === totalPages()" (click)="goTo(totalPages())">»</button>
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

    .log { padding: 16px; }
    .log-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
    .log-title h3 { font-weight: 700; color: var(--nb-text); margin: 0 0 2px; font-size: 15px; }
    .log-title .log-sub { font-size: 11.5px; color: var(--nb-text-muted); }
    .status-legend { display: flex; gap: 6px; flex-wrap: wrap; }
    .chip { border: 1px solid var(--nb-border); background: var(--nb-surface); border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 600; cursor: pointer; color: var(--nb-text-secondary); display: inline-flex; align-items: center; gap: 5px; transition: all .15s; }
    .chip b { font-weight: 800; }
    .chip:hover { border-color: var(--nb-primary-600); }
    .chip.active { box-shadow: 0 0 0 2px var(--nb-primary-100, #dbeafe) inset; border-color: var(--nb-primary-600); }

    /* Toolbar */
    .toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
    .search-box { position: relative; flex: 1; min-width: 220px; }
    .search-box .s-icon { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 13px; opacity: .6; }
    .search-box input { width: 100%; padding: 8px 32px 8px 12px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); font-size: 13px; outline: none; background: var(--nb-surface); color: var(--nb-text); }
    .search-box input:focus { border-color: var(--nb-primary-600); }
    .toolbar select { padding: 8px 12px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); font-size: 12.5px; background: var(--nb-surface); color: var(--nb-text); outline: none; cursor: pointer; }
    .reset-btn { padding: 7px 12px; border: 1px solid var(--nb-border); background: var(--nb-bg); border-radius: var(--nb-radius); font-size: 12px; cursor: pointer; color: var(--nb-danger, #dc2626); }
    .result-count { margin-inline-start: auto; font-size: 12px; color: var(--nb-text-muted); font-weight: 600; }

    /* Table */
    .table-wrap { overflow-x: auto; border: 1px solid var(--nb-border); border-radius: var(--nb-radius-lg, 10px); }
    .msg-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    .msg-table thead th { background: var(--nb-bg); color: var(--nb-text-secondary); font-weight: 700; text-align: right; padding: 10px 12px; border-bottom: 1px solid var(--nb-border); white-space: nowrap; font-size: 11.5px; }
    .msg-table th.sortable { cursor: pointer; user-select: none; }
    .msg-table th.sortable:hover { color: var(--nb-primary-600); }
    .sort-ind { font-size: 10px; color: var(--nb-primary-600); }
    .col-expand { width: 26px; text-align: center; }
    .caret { display: inline-block; transition: transform .18s; color: var(--nb-text-faint); font-size: 11px; }
    .caret.open { transform: rotate(180deg); color: var(--nb-primary-600); }
    .data-row { cursor: pointer; transition: background .12s; border-bottom: 1px solid var(--nb-border-soft); }
    .data-row:hover { background: var(--nb-bg); }
    .data-row.expanded { background: var(--nb-primary-50, #eff6ff); }
    .msg-table td { padding: 9px 12px; color: var(--nb-text); vertical-align: middle; }
    .col-recipient strong { display: block; font-size: 12.5px; color: var(--nb-text); }
    .col-recipient .addr { font-size: 10.5px; color: var(--nb-text-muted); direction: ltr; unicode-bidi: plaintext; display: block; }
    .channel-tag { white-space: nowrap; font-size: 11.5px; }
    .col-subject { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--nb-text-secondary); }
    .col-time { white-space: nowrap; font-size: 11px; color: var(--nb-text-muted); direction: ltr; unicode-bidi: plaintext; }

    .st-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
    .st-queued    { background: #f1f5f9; color: #475569; }
    .st-sent      { background: #e0f2fe; color: #0369a1; }
    .st-delivered { background: #dcfce7; color: #166534; }
    .st-read      { background: #d1fae5; color: #065f46; box-shadow: inset 0 0 0 1px #6ee7b7; }
    .st-failed    { background: #fee2e2; color: #991b1b; }
    .st-bounced   { background: #ffedd5; color: #9a3412; }
    .attempts { font-size: 10px; color: #b45309; font-weight: 700; margin-inline-start: 4px; }

    .prio { font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 6px; }
    .prio-high { background: #fef2f2; color: #dc2626; }
    .prio-normal { background: #eff6ff; color: #2563eb; }
    .prio-low { background: #f8fafc; color: #64748b; }

    /* Detail row */
    .detail-row td { background: var(--nb-primary-50, #eff6ff); border-bottom: 1px solid var(--nb-border); padding: 0; }
    .detail { display: flex; gap: 24px; padding: 14px 18px; flex-wrap: wrap; }
    .timeline { display: flex; gap: 8px; align-items: stretch; flex-wrap: wrap; }
    .tl-step { display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: 8px; min-width: 150px; opacity: .55; }
    .tl-step.done { opacity: 1; border-color: #6ee7b7; }
    .tl-step.failed { opacity: 1; border-color: #fca5a5; }
    .tl-step .dot { width: 22px; height: 22px; border-radius: 50%; background: var(--nb-bg); display: inline-flex; align-items: center; justify-content: center; font-size: 10px; color: var(--nb-text-secondary); }
    .tl-step.done .dot { background: #dcfce7; color: #166534; }
    .tl-step.failed .dot { background: #fee2e2; color: #991b1b; }
    .tl-step b { display: block; font-size: 11.5px; color: var(--nb-text); }
    .tl-step span { font-size: 10.5px; color: var(--nb-text-muted); direction: ltr; unicode-bidi: plaintext; }
    .detail-meta { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 220px; }
    .detail-meta > div { display: flex; justify-content: space-between; gap: 10px; font-size: 11.5px; border-bottom: 1px dashed var(--nb-border-soft); padding-bottom: 4px; }
    .detail-meta .k { color: var(--nb-text-muted); }
    .detail-meta .v { color: var(--nb-text); font-weight: 600; }
    .detail-meta .v.mono { font-family: monospace; direction: ltr; }
    .detail-meta .v.err { color: #991b1b; font-weight: 600; text-align: left; }
    .err-line { border-bottom: none !important; }

    .empty { text-align: center; padding: 40px 0; color: var(--nb-text-muted); font-size: 13px; }

    /* Pagination */
    .pagination { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; flex-wrap: wrap; }
    .page-info { font-size: 12px; color: var(--nb-text-muted); }
    .pager { display: flex; gap: 4px; }
    .pg-btn { min-width: 30px; height: 30px; padding: 0 6px; border: 1px solid var(--nb-border); background: var(--nb-surface); border-radius: var(--nb-radius); font-size: 12px; cursor: pointer; color: var(--nb-text-secondary); }
    .pg-btn:hover:not(:disabled) { border-color: var(--nb-primary-600); color: var(--nb-primary-600); }
    .pg-btn:disabled { opacity: .4; cursor: not-allowed; }
    .pg-btn.num.active { background: var(--nb-primary-600); color: #fff; border-color: var(--nb-primary-600); font-weight: 700; }

    .nb-btn-primary { background: var(--nb-primary-600); color: white; border: none; padding: 8px 16px; border-radius: var(--nb-radius); font-size: 13px; font-weight: 600; cursor: pointer; }
    .nb-btn-secondary { background: var(--nb-surface); border: 1px solid var(--nb-border); color: var(--nb-text); padding: 8px 16px; border-radius: var(--nb-radius); font-size: 13px; cursor: pointer; }

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

  messages = signal<CommunicationMessageItem[]>([]);
  showNewMessageModal = signal(false);

  // حالة الجدول التفاعلي
  searchTerm = signal('');
  channelFilter = signal<'all' | string>('all');
  statusFilter = signal<'all' | MessageStatus>('all');
  priorityFilter = signal<'all' | string>('all');
  sortKey = signal<SortKey>('sent_at');
  sortDir = signal<SortDir>('desc');
  currentPage = signal(1);
  readonly pageSize = 10;
  expandedId = signal<string | null>(null);

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

  // ---- الفلترة ----
  filtered = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const ch = this.channelFilter();
    const st = this.statusFilter();
    const pr = this.priorityFilter();
    let list = this.messages().filter((m) => {
      if (ch !== 'all' && m.channel_type !== ch) return false;
      if (st !== 'all' && m.status !== st) return false;
      if (pr !== 'all' && m.priority !== pr) return false;
      if (term) {
        const hay = `${m.recipient_name} ${m.recipient_address} ${m.subject || ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    // ---- الترتيب ----
    const key = this.sortKey();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      let av: any; let bv: any;
      if (key === 'status') { av = STATUS_META[a.status].step; bv = STATUS_META[b.status].step; }
      else if (key === 'priority') { const w: any = { high: 3, normal: 2, low: 1 }; av = w[a.priority]; bv = w[b.priority]; }
      else { av = (a as any)[key] || ''; bv = (b as any)[key] || ''; }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return list;
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));

  paged = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const cur = this.currentPage();
    const nums: number[] = [];
    const from = Math.max(1, cur - 2);
    const to = Math.min(total, from + 4);
    for (let i = Math.max(1, to - 4); i <= to; i++) nums.push(i);
    return nums;
  });

  rangeStart = computed(() => this.filtered().length === 0 ? 0 : (this.currentPage() - 1) * this.pageSize + 1);
  rangeEnd = computed(() => Math.min(this.currentPage() * this.pageSize, this.filtered().length));

  isFiltered = computed(() =>
    this.searchTerm().trim() !== '' || this.channelFilter() !== 'all' ||
    this.statusFilter() !== 'all' || this.priorityFilter() !== 'all');

  statusChips = computed(() => {
    const all = this.messages();
    const keys: MessageStatus[] = ['sent', 'delivered', 'read', 'failed', 'bounced', 'queued'];
    return keys.map((k) => ({
      key: k,
      label: STATUS_META[k].label,
      icon: STATUS_META[k].icon,
      cls: STATUS_META[k].cls,
      count: all.filter((m) => m.status === k).length,
    })).filter((c) => c.count > 0);
  });

  // ---- الإجراءات ----
  onSearch(v: string): void { this.searchTerm.set(v); this.currentPage.set(1); }
  setChannelFilter(v: string): void { this.channelFilter.set(v); this.currentPage.set(1); }
  setPriorityFilter(v: string): void { this.priorityFilter.set(v); this.currentPage.set(1); }
  setStatusFilter(k: MessageStatus): void {
    this.statusFilter.update((cur) => cur === k ? 'all' : k);
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.channelFilter.set('all');
    this.statusFilter.set('all');
    this.priorityFilter.set('all');
    this.currentPage.set(1);
  }

  toggleSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.update((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
    this.currentPage.set(1);
  }

  sortIndicator(key: SortKey): string {
    if (this.sortKey() !== key) return '⇅';
    return this.sortDir() === 'asc' ? '▲' : '▼';
  }

  goTo(page: number): void {
    const p = Math.min(Math.max(1, page), this.totalPages());
    this.currentPage.set(p);
    this.expandedId.set(null);
  }

  toggleExpand(id: string): void {
    this.expandedId.update((cur) => cur === id ? null : id);
  }

  // ---- مساعدات العرض ----
  statusMeta(s: MessageStatus): StatusMeta { return STATUS_META[s]; }
  channelIcon(t?: string): string { return CHANNEL_ICON[t || ''] || '📨'; }
  isFail(s: MessageStatus): boolean { return s === 'failed' || s === 'bounced'; }
  priorityLabel(p: string): string { return p === 'high' ? 'عالية' : p === 'low' ? 'منخفضة' : 'عادية'; }

  formatTime(t?: string): string {
    if (!t) return '';
    // نعرض التاريخ والوقت كما هو (قادم من الخادم بصيغة مقروءة)
    return t.replace('T', ' ').slice(0, 19);
  }

  toggleNewMessageModal(): void {
    this.showNewMessageModal.update((v) => !v);
  }

  submitSendMessage(): void {
    if (!this.newMessageForm.recipient_name) return;
    this.commService.sendMessage(this.newMessageForm).subscribe(() => {
      const now = new Date();
      const stamp = now.toISOString().slice(0, 19).replace('T', ' ');
      const ch = this.newMessageForm.channel;
      this.messages.update((list) => [
        {
          id: String(Date.now()),
          channel_name: ch === 'whatsapp' ? 'واتساب الأعمال' : ch === 'sms' ? 'SMS' : 'البريد الإلكتروني',
          channel_type: (ch as any),
          recipient_name: this.newMessageForm.recipient_name,
          recipient_address: this.newMessageForm.address || '0912345678',
          subject: this.newMessageForm.subject || 'إشعار مباشر من النظام',
          status: 'sent',
          priority: 'high',
          sent_at: stamp,
          attempts: 1,
          external_status: 'PENDING',
        } as CommunicationMessageItem,
        ...(Array.isArray(list) ? list : []),
      ]);
      this.currentPage.set(1);
      this.sortKey.set('sent_at');
      this.sortDir.set('desc');
      this.toggleNewMessageModal();
      this.newMessageForm = { recipient_name: '', channel: 'email', address: '', subject: '', body: '' };
    });
  }
}
