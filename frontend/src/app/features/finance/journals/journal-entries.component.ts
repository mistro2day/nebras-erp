import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FinanceService } from '../finance.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbDatepickerComponent } from '../../../shared/nebras/nb-datepicker.component';
import { NbDrawerComponent } from '../../../shared/nebras/nb-drawer.component';
import { NbExportMenuComponent, ExportColumn } from '../../../shared/export';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { TenantService } from '../../../core/services/tenant.service';
import { JournalActionReviewModalComponent, JournalActionMode } from './journal-action-review-modal.component';
import { JournalEntryCreateModalComponent } from './journal-entry-create-modal.component';
import { printJournalVoucher } from './journal-voucher-print';

interface Line { account: string; debit: number; credit: number; cost_center: string | null; description?: string; }

/**
 * قيود اليومية والاعتمادات (Journal Entries & Approvals) — لغة تصميم Nebras OS
 * مستوحاة من محركات القيود الرائدة في Odoo 18 و Microsoft Dynamics 365 Finance،
 * مع ربط أطراف المعاملات (Partner / الطالب)، والمستندات المصدرية، ونوافذ مراجعة متعددة الخطوات.
 */
@Component({
  selector: 'app-journal-entries',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, DecimalPipe,
    NbPageHeaderComponent, NbPanelComponent, NbDatepickerComponent,
    NbDrawerComponent, NbExportMenuComponent, NbLoadingComponent,
    JournalActionReviewModalComponent,
    JournalEntryCreateModalComponent,
  ],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="قيود اليومية والاعتمادات" subtitle="إنشاء القيود المزدوجة المتوازنة، ومراجعتها واعتمادها وترحيلها لدفتر الأستاذ العام وفق معايير Odoo و Dynamics 365.">
        <button class="btn ghost" (click)="back()">رجوع لمساحة العمل</button>
        <nb-export-menu [columns]="cols()" [rows]="journals()" title="قيود اليومية" subtitle="سجل القيود المحاسبية" filename="قيود-اليومية"></nb-export-menu>
        <button class="btn primary" (click)="openCreateModal()">＋ قيد يومية جديد</button>
      </nb-page-header>

      <div class="statusbar">
        @for (s of statuses; track s.key) {
          <button class="seg" [class.active]="statusFilter()===s.key" (click)="setStatus(s.key)">{{ s.label }}</button>
        }
      </div>

      <nb-panel [flush]="true">
        <div class="table-wrap">
          <table class="nb-table">
            <thead>
              <tr>
                <th>رقم القيد</th>
                <th>التاريخ</th>
                <th>الطرف المعني / الطالب</th>
                <th>المستند المصدري</th>
                <th>البيان المحاسبي</th>
                <th>المصدر</th>
                <th>الحالة</th>
                <th>إجراءات التدقيق والاعتماد</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr><td colspan="8"><nb-loading message="جارٍ تحميل سجل القيود المحاسبية…"></nb-loading></td></tr>
              } @else {
              @for (j of journals(); track j.id) {
                <tr class="clickable" (click)="openDetail(j)">
                  <td><strong class="entry-code mono">{{ j.entry_number }}</strong></td>
                  <td class="mono date-col">{{ j.date }}</td>
                  <td>
                    @if (j.partner_details; as p) {
                      <div class="partner-cell">
                        <span class="p-name">{{ p.name }}</span>
                        @if (p.student_number) { <span class="p-num mono">{{ p.student_number }}</span> }
                      </div>
                    } @else {
                      <span class="text-muted">—</span>
                    }
                  </td>
                  <td>
                    @if (j.reference) {
                      <span class="ref-pill mono">{{ j.reference }}</span>
                    } @else {
                      <span class="text-muted">—</span>
                    }
                  </td>
                  <td class="desc-cell" [title]="j.description">{{ j.description }}</td>
                  <td><span class="src-tag">{{ sourceLabel(j.source_type) }}</span></td>
                  <td><span class="badge" [class]="j.status">{{ statusLabel(j.status) }}</span></td>
                  <td (click)="$event.stopPropagation()">
                    <div class="actions">
                      <button class="btn ghost xs" (click)="openDetail(j)" title="معاينة التفاصيل الكاملة">تفاصيل</button>
                      <button class="btn ghost xs" (click)="printJournal(j)" title="طباعة سند القيد الرسمي (ترويسة المستأجر)">🖨️ طباعة</button>
                      @if (j.status === 'draft') {
                        <button class="btn primary xs" (click)="triggerActionModal(j, 'approve')">اعتماد</button>
                      }
                      @if (j.status === 'approved') {
                        <button class="btn info-btn xs" (click)="triggerActionModal(j, 'post')">ترحيل</button>
                      }
                      @if (j.status === 'posted') {
                        <button class="btn danger xs" (click)="triggerActionModal(j, 'reverse')">عكس القيد</button>
                      }
                    </div>
                  </td>
                </tr>
              }
              @if (!journals().length) { <tr><td colspan="8" class="empty">لا توجد قيود مسجلة بهذه الحالة.</td></tr> }
              }
            </tbody>
          </table>
        </div>
      </nb-panel>

      <!-- درج تفاصيل القيد المحاسبي المعمق (Deep Drawer View) -->
      <nb-drawer [open]="!!detail()" [width]="680"
        [title]="'تفاصيل القيد المحاسبي: ' + (detail()?.entry_number || '')"
        [subtitle]="detail()?.description" (closed)="detail.set(null)">
        @if (detail(); as d) {
          <!-- بطاقة الطرف المقابل (طالب / مورد / موظف) -->
          @if (d.partner_details; as p) {
            <div class="drawer-card partner-drawer-card">
              <div class="p-head">
                <span class="p-avatar">🎓</span>
                <div class="p-titles">
                  <span class="p-role">{{ p.partner_type_label || 'الطرف المعني' }}</span>
                  <h4 class="p-main-name">{{ p.name }}</h4>
                  @if (p.student_number) { <span class="p-num-large mono">الرقم الأكاديمي: {{ p.student_number }}</span> }
                </div>
              </div>
              <div class="p-specs">
                @if (p.grade_name) { <div><span class="k">الصف / المرحلة:</span> <span class="v">{{ p.grade_name }}</span></div> }
                @if (p.guardian_name) { <div><span class="k">ولي الأمر:</span> <span class="v">{{ p.guardian_name }}</span></div> }
                @if (d.source_details?.payment_method) { <div><span class="k">وسيلة الدفع:</span> <span class="v badge-method">{{ d.source_details.payment_method }}</span></div> }
                @if (d.source_details?.destination) { <div><span class="k">الحساب المستلم:</span> <span class="v">{{ d.source_details.destination }}</span></div> }
              </div>
            </div>
          }

          <!-- بطاقة المستند المصدر وبنود الرسوم -->
          @if (d.source_details; as src) {
            <div class="drawer-card source-drawer-card">
              <div class="src-head">
                <div>
                  <span class="src-type-label">{{ src.doc_type_label }}</span>
                  <strong class="src-number mono">{{ src.doc_number }}</strong>
                  <span class="src-dt">تاريخ: {{ src.date }}</span>
                </div>
                <div class="src-total mono">
                  <span class="t-val">{{ src.amount | number:'1.2-2' }}</span>
                  <span class="t-cur">ج.س</span>
                </div>
              </div>
            </div>
          }

          @if (d.fee_breakdown && d.fee_breakdown.length > 0) {
            <div class="drawer-card fee-breakdown-card">
              <h5 class="dh5">تفصيل بنود الرسوم والخدمات المسددة / المستحقة</h5>
              <div class="fee-table-wrap">
                <table class="nb-table mini">
                  <thead><tr><th>بند الرسوم</th><th>البيان</th><th>الفاتورة</th><th class="end">المبلغ (ج.س)</th></tr></thead>
                  <tbody>
                    @for (item of d.fee_breakdown; track $index) {
                      <tr>
                        <td><strong>{{ item.fee_name }}</strong></td>
                        <td class="text-muted">{{ item.description || item.fee_name }}</td>
                        <td class="mono">{{ item.invoice_number || '—' }}</td>
                        <td class="end mono highlight">{{ (item.allocated_amount || item.amount) | number:'1.2-2' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <div class="dsummary">
            <div class="chip"><span class="k">تاريخ القيد</span><span class="v mono">{{ d.date }}</span></div>
            <div class="chip"><span class="k">الحالة</span><span class="badge" [class]="d.status">{{ statusLabel(d.status) }}</span></div>
            <div class="chip"><span class="k">المصدر</span><span class="v">{{ sourceLabel(d.source_type) }}</span></div>
            @if (d.reference) { <div class="chip"><span class="k">المرجع</span><span class="v mono">{{ d.reference }}</span></div> }
          </div>

          <h4 class="dh">أسطر القيد المحاسبي المزدوج</h4>
          <div class="table-wrap">
            <table class="nb-table dlines">
              <thead>
                <tr>
                  <th>الحساب المحاسبي</th>
                  <th>مركز التكلفة / البيان</th>
                  <th class="end">مدين (ج.س)</th>
                  <th class="end">دائن (ج.س)</th>
                </tr>
              </thead>
              <tbody>
                @for (l of d.lines || []; track $index) {
                  <tr>
                    <td><strong>{{ l.account_code }}</strong> <span class="nm">{{ l.account_name }}</span></td>
                    <td class="desc-cell">{{ l.description || l.cost_center_name || '—' }}</td>
                    <td class="end mono info">{{ +l.debit > 0 ? (l.debit | number:'1.2-2') : '—' }}</td>
                    <td class="end mono success">{{ +l.credit > 0 ? (l.credit | number:'1.2-2') : '—' }}</td>
                  </tr>
                }
                <tr class="sum">
                  <td colspan="2">الإجمالي الكلي</td>
                  <td class="end mono"><strong>{{ detailDebit() | number:'1.2-2' }}</strong></td>
                  <td class="end mono"><strong>{{ detailCredit() | number:'1.2-2' }}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        }
        <div drawer-actions>
          <button class="btn ghost" (click)="printDetail()">🖨️ طباعة القيد</button>
          @if (detail()?.status === 'draft') {
            <button class="btn primary" (click)="triggerActionModal(detail(), 'approve')">اعتماد القيد</button>
          }
          @if (detail()?.status === 'approved') {
            <button class="btn info-btn" (click)="triggerActionModal(detail(), 'post')">ترحيل لدفتر الأستاذ</button>
          }
          @if (detail()?.status === 'posted') {
            <button class="btn danger" (click)="triggerActionModal(detail(), 'reverse')">عكس القيد</button>
          }
        </div>
      </nb-drawer>

      <!-- نافذة المراجعة والتأكيد متعددة الخطوات بنمط نبراس (Nebras Modal Wizard) -->
      <app-journal-action-review-modal
        [open]="actionModalOpen()"
        [entry]="actionTarget()"
        [mode]="actionMode()"
        [submitting]="actionSubmitting()"
        (confirmed)="onActionConfirmed($event)"
        (cancelled)="actionModalOpen.set(false)"
      ></app-journal-action-review-modal>

      <!-- معالج إنشاء قيد يومية جديد بنمط نبراس (Nebras Create Wizard Modal) -->
      <app-journal-entry-create-modal
        [open]="createModalOpen()"
        [accounts]="accounts()"
        [periods]="periods()"
        [costCenters]="costCenters()"
        [submitting]="saving()"
        (submitted)="onCreateJournalSubmitted($event)"
        (cancelled)="createModalOpen.set(false)"
      ></app-journal-entry-create-modal>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-background); font-family: var(--nb-font-family); }
    .mb { margin-bottom: 16px; }
    .statusbar { display: flex; gap: 6px; margin-bottom: 14px; flex-wrap: wrap; }
    .seg { height: 32px; padding: 0 14px; border: 1px solid var(--nb-border); background: var(--nb-surface);
      color: var(--nb-text-secondary); border-radius: var(--nb-radius); font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; }
    .seg.active { background: var(--nb-primary-600); border-color: var(--nb-primary-600); color: #fff; }

    .fld { height: 34px; padding: 0 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; box-sizing: border-box; width: 100%; }
    .fld.num { text-align: end; font-variant-numeric: tabular-nums; }
    .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    @media (max-width: 800px) { .grid4 { grid-template-columns: 1fr 1fr; } }
    label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--nb-text-muted); }
    label.full { margin-top: 12px; }

    .lines-head, .line { display: grid; grid-template-columns: 2.2fr 1.4fr 1fr 1fr 34px; gap: 8px; align-items: center; }
    .lines-head { margin: 16px 0 6px; font-size: 11px; font-weight: 700; color: var(--nb-text-muted); padding: 0 2px; }
    .line { margin-bottom: 8px; }
    .icon-btn { width: 30px; height: 30px; border: 1px solid var(--nb-border); background: var(--nb-surface); border-radius: var(--nb-radius);
      cursor: pointer; color: var(--nb-danger); font-size: 12px; }

    .totals { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; margin: 14px 0; padding: 10px 14px;
      border-radius: var(--nb-radius); font-size: 13px; background: var(--nb-surface-raised); border: 1px solid var(--nb-border); }
    .totals.ok { border-color: var(--nb-success); }
    .totals.bad { border-color: var(--nb-danger); }
    .totals .verdict { margin-inline-start: auto; font-weight: 700; }
    .totals.ok .verdict { color: var(--nb-success); }
    .totals.bad .verdict { color: var(--nb-danger); }
    .form-actions { display: flex; gap: 10px; }

    /* جدول القيود */
    .table-wrap { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .nb-table th { text-align: start; font-weight: 700; font-size: 11px; color: var(--nb-text-muted);
      background: var(--nb-surface-raised); padding: 10px 12px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table td { padding: 10px 12px; border-bottom: 1px solid var(--nb-border-row); color: var(--nb-text); vertical-align: middle; }
    .nb-table tr:last-child td { border-bottom: none; }
    .nb-table tbody tr:hover td { background: var(--nb-surface-raised); }
    .nb-table.mini th { padding: 6px 10px; font-size: 10.5px; }
    .nb-table.mini td { padding: 6px 10px; font-size: 12px; }
    .mono { font-variant-numeric: tabular-nums; }
    .empty { text-align: center; padding: 26px; color: var(--nb-text-muted); }
    .actions { display: flex; gap: 6px; align-items: center; }
    .nb-table tbody tr.clickable { cursor: pointer; }
    .info { color: var(--nb-info); } .success { color: var(--nb-success); }
    .nm { color: var(--nb-text-muted); font-size: 12px; }

    .entry-code { color: var(--nb-primary-600); }
    .date-col { font-size: 12px; color: var(--nb-text-muted); }
    .partner-cell { display: flex; flex-direction: column; gap: 2px; }
    .p-name { font-weight: 700; color: var(--nb-text); font-size: 13px; }
    .p-num { font-size: 11px; color: var(--nb-text-muted); }
    .ref-pill { background: #f1f5f9; border: 1px solid #e2e8f0; padding: 2px 7px; border-radius: 6px; font-size: 11.5px; color: #334155; }
    .desc-cell { max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12.5px; color: #475569; }
    .src-tag { font-size: 11.5px; color: #64748b; }

    /* درج التفاصيل */
    .drawer-card { border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; }
    .partner-drawer-card { background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%); border: 1px solid #bbf7d0; }
    .p-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .p-avatar { width: 34px; height: 34px; border-radius: 8px; background: #dcfce7; display: grid; place-items: center; font-size: 17px; }
    .p-role { font-size: 10.5px; font-weight: 700; color: #15803d; }
    .p-main-name { margin: 0; font-size: 14.5px; font-weight: 800; color: #111827; }
    .p-num-large { font-size: 11.5px; color: #6b7280; }
    .p-specs { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px; border-top: 1px solid #dcfce7; padding-top: 6px; }
    .p-specs .k { color: #6b7280; }
    .p-specs .v { font-weight: 600; color: #1f2937; }
    .badge-method { background: #e0e7ff; color: #3730a3; padding: 1px 5px; border-radius: 4px; font-size: 11px; }

    .source-drawer-card { background: #f8fafc; border: 1px solid #e2e8f0; }
    .src-head { display: flex; justify-content: space-between; align-items: center; }
    .src-type-label { font-size: 11px; color: #64748b; margin-inline-end: 6px; }
    .src-number { color: var(--nb-primary-600); font-size: 13px; }
    .src-dt { font-size: 11px; color: #94a3b8; margin-inline-start: 8px; }
    .src-total { display: flex; align-items: baseline; gap: 4px; }
    .t-val { font-size: 15px; font-weight: 800; color: #0f172a; }
    .t-cur { font-size: 11px; font-weight: 700; color: #64748b; }

    .fee-breakdown-card { background: #ffffff; border: 1px solid #e2e8f0; }
    .dh5 { margin: 0 0 8px; font-size: 12px; font-weight: 700; color: #475569; }
    .fee-table-wrap { border: 1px solid #f1f5f9; border-radius: 6px; overflow: hidden; }

    .dsummary { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
    .chip { display: flex; flex-direction: column; gap: 3px; padding: 8px 10px; border: 1px solid var(--nb-border-soft);
      border-radius: var(--nb-radius); background: var(--nb-surface-raised); min-width: 100px; }
    .chip .k { font-size: 10.5px; color: var(--nb-text-muted); }
    .chip .v { font-size: 12.5px; font-weight: 700; color: var(--nb-text); }
    .dh { font-size: 13px; font-weight: 700; color: var(--nb-text); margin: 6px 0 10px; }
    .dlines .sum td { border-top: 2px solid var(--nb-border); font-weight: 700; background: var(--nb-surface-raised); }

    .badge { display: inline-flex; padding: 2px 8px; font-size: 11px; font-weight: 700; border-radius: var(--nb-radius-sm); }
    .badge.draft { background: var(--nb-border-soft); color: var(--nb-text-secondary); }
    .badge.approved { background: var(--nb-info-bg); color: var(--nb-info); }
    .badge.posted { background: var(--nb-success-bg); color: var(--nb-success); }
    .badge.reversed, .badge.cancelled { background: var(--nb-danger-bg); color: var(--nb-danger); }

    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.sm { height: 30px; }
    .btn.xs { height: 28px; padding: 0 10px; font-size: 11.5px; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.primary:hover:not(:disabled) { background: var(--nb-primary-700); }
    .btn.info-btn { background: #0284c7; color: #fff; }
    .btn.info-btn:hover:not(:disabled) { background: #0369a1; }
    .btn.danger { background: var(--nb-danger); color: #fff; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn:disabled { opacity: .55; cursor: not-allowed; }
  `],
})
export class JournalEntriesComponent implements OnInit {
  private service = inject(FinanceService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  journals = signal<any[]>([]);
  loading = signal(true);
  accounts = signal<any[]>([]);
  periods = signal<any[]>([]);
  costCenters = signal<any[]>([]);
  showEditor = signal(false);
  createModalOpen = signal(false);
  saving = signal(false);
  statusFilter = signal<string>('');
  detail = signal<any | null>(null);

  // حالة نافذة المراجعة المتدرجة (Modal Review Wizard)
  actionModalOpen = signal(false);
  actionTarget = signal<any | null>(null);
  actionMode = signal<JournalActionMode>('approve');
  actionSubmitting = signal(false);

  detailDebit = computed(() => (this.detail()?.lines || []).reduce((s: number, l: any) => s + (Number(l.debit) || 0), 0));
  detailCredit = computed(() => (this.detail()?.lines || []).reduce((s: number, l: any) => s + (Number(l.credit) || 0), 0));

  statuses = [
    { key: '', label: 'الكل' }, { key: 'draft', label: 'مسودة' },
    { key: 'approved', label: 'معتمد' }, { key: 'posted', label: 'مرحّل' }, { key: 'reversed', label: 'معكوس' },
  ];

  ngOnInit() {
    // تحميل القيود فوراً وبأعلى أولوية دون تزاحم في الطلبات
    this.load();
  }

  private editorDataLoaded = false;
  private ensureEditorData() {
    if (this.editorDataLoaded) return;
    this.editorDataLoaded = true;
    this.service.getCOA({ status: 'active' }).subscribe((r) => { if (r?.success) this.accounts.set(r.data); });
    this.service.getPeriods({ status: 'open' }).subscribe((r) => { if (r?.success) this.periods.set(r.data); });
    this.service.getCostCenters({ status: 'active' }).subscribe((r) => { if (r?.success) this.costCenters.set(r.data); });
  }

  openCreateModal() {
    this.ensureEditorData();
    this.createModalOpen.set(true);
  }

  onCreateJournalSubmitted(data: any) {
    this.saving.set(true);
    this.service.getCurrencies({ is_base: true }).subscribe({
      next: (cr) => {
        const base = cr?.data?.[0];
        const payload = {
          ...data,
          currency: base?.id,
          exchange_rate: 1.0,
        };
        this.service.createJournal(payload).subscribe({
          next: (r) => {
            this.saving.set(false);
            if (r?.success) {
              this.notify.success('تم إنشاء وحفظ قيد اليومية بنجاح كمسودة معتمدة.');
              this.createModalOpen.set(false);
              this.load();
            } else {
              this.notify.error(r?.message || 'تعذر إنشاء القيد المحاسبي.');
            }
          },
          error: (err) => {
            this.saving.set(false);
            this.notify.error(err?.error?.message || 'حدث خطأ أثناء حفظ القيد المحاسبي.');
          }
        });
      },
      error: () => {
        this.saving.set(false);
        this.notify.error('تعذر جلب العملة الأساسية للنظام.');
      }
    });
  }

  setStatus(s: string) { this.statusFilter.set(s); this.load(); }
  load() {
    this.loading.set(true);
    const params = this.statusFilter() ? { status: this.statusFilter() } : undefined;
    this.service.getJournals(params).subscribe({
      next: (r) => { if (r?.success) this.journals.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  /**
   * فتح نافذة المراجعة والتأكيد متعددة الخطوات (بدون نوافذ متصفح تلقائية)
   */
  triggerActionModal(j: any, mode: JournalActionMode) {
    this.actionSubmitting.set(false);
    this.actionMode.set(mode);

    // إذا كانت بيانات القيد غير مكتملة الأسطر، نجلب التفاصيل أولاً لضمان دقة المعاينة
    if (!j.lines || j.lines.length === 0) {
      this.service.getJournalDetails(j.id).subscribe({
        next: (r) => {
          this.actionTarget.set(r?.data || j);
          this.actionModalOpen.set(true);
        },
        error: () => {
          this.actionTarget.set(j);
          this.actionModalOpen.set(true);
        }
      });
    } else {
      this.actionTarget.set(j);
      this.actionModalOpen.set(true);
    }
  }

  onActionConfirmed(event: { mode: JournalActionMode; notes?: string; reversal_date?: string; reversal_reason?: string }) {
    const target = this.actionTarget();
    if (!target) return;

    this.actionSubmitting.set(true);

    if (event.mode === 'approve') {
      this.service.approveJournal(target.id, { notes: event.notes }).subscribe({
        next: (r) => {
          this.actionSubmitting.set(false);
          this.actionModalOpen.set(false);
          if (r?.success) {
            this.notify.success('تم اعتماد القيد المحاسبي بنجاح.');
            this.load();
            if (this.detail()?.id === target.id) this.openDetail(target);
          } else {
            this.notify.error(r?.message || 'تعذر اعتماد القيد.');
          }
        },
        error: (e) => {
          this.actionSubmitting.set(false);
          this.notify.error(e?.error?.message || 'تعذر اعتماد القيد.');
        }
      });
    } else if (event.mode === 'post') {
      this.service.postJournal(target.id).subscribe({
        next: (r) => {
          this.actionSubmitting.set(false);
          this.actionModalOpen.set(false);
          if (r?.success) {
            this.notify.success('تم ترحيل القيد إلى دفتر الأستاذ العام بنجاح.');
            this.load();
            if (this.detail()?.id === target.id) this.openDetail(target);
          } else {
            this.notify.error(r?.message || 'تعذر ترحيل القيد.');
          }
        },
        error: (e) => {
          this.actionSubmitting.set(false);
          this.notify.error(e?.error?.message || 'تعذر ترحيل القيد لدفتر الأستاذ.');
        }
      });
    } else if (event.mode === 'reverse') {
      this.service.reverseJournal(target.id, {
        reversal_date: event.reversal_date,
        reversal_reason: event.reversal_reason
      }).subscribe({
        next: (r) => {
          this.actionSubmitting.set(false);
          this.actionModalOpen.set(false);
          if (r?.success) {
            this.notify.success('تم إنشاء القيد العكسي وترحيله لتصحيح الأرصدة.');
            this.load();
            if (this.detail()?.id === target.id) this.openDetail(target);
          } else {
            this.notify.error(r?.message || 'تعذر عكس القيد.');
          }
        },
        error: (e) => {
          this.actionSubmitting.set(false);
          this.notify.error(e?.error?.message || 'تعذر عكس القيد المحاسبي.');
        }
      });
    }
  }

  cols(): ExportColumn[] {
    return [
      { key: 'entry_number', label: 'رقم القيد' },
      { key: 'date', label: 'التاريخ' },
      { key: 'partner', label: 'الطرف المعني', map: (r) => r.partner_details?.name || '—' },
      { key: 'reference', label: 'المستند المصدري', map: (r) => r.reference || '—' },
      { key: 'description', label: 'البيان' },
      { key: 'source_type', label: 'المصدر', map: (r) => this.sourceLabel(r.source_type) },
      { key: 'status', label: 'الحالة', map: (r) => this.statusLabel(r.status) },
    ];
  }

  private tenantService = inject(TenantService);

  openDetail(j: any) {
    this.detail.set(j);
    this.service.getJournalDetails(j.id).subscribe({ next: (r) => { if (r?.success) this.detail.set(r.data); } });
  }

  printJournal(j: any) {
    if (!j) return;
    if (!j.lines || j.lines.length === 0 || !j.partner_details) {
      this.service.getJournalDetails(j.id).subscribe({
        next: (r) => {
          const full = r?.data || j;
          printJournalVoucher(full, this.tenantService.currentTenant());
        },
        error: () => printJournalVoucher(j, this.tenantService.currentTenant())
      });
    } else {
      printJournalVoucher(j, this.tenantService.currentTenant());
    }
  }

  printDetail() {
    this.printJournal(this.detail());
  }

  statusLabel(s: string) { return ({ draft: 'مسودة', approved: 'معتمد', posted: 'مرحّل', cancelled: 'ملغي', reversed: 'معكوس' } as any)[s] || s; }
  sourceLabel(s: string) { return ({ manual: 'يدوي', automatic: 'تلقائي', recurring: 'دوري', reversing: 'عكسي', imported: 'مستورد' } as any)[s] || s; }
  back() { this.router.navigateByUrl('/finance/dashboard'); }
}
