import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { StudentFinanceService } from '../student-finance.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { NbDatepickerComponent } from '../../../shared/nebras/nb-datepicker.component';
import { downloadCsv } from '../../../shared/export';
import { SendMessageModalComponent } from '../../communications/components/send-message-modal.component';

/**
 * فواتير الطلاب — وحدة عاملة (Nebras OS).
 * قائمة حقيقية من student-finance/invoices/ مع بحث برقم الفاتورة، تصفية حالة،
 * فرز، ترقيم، حالات تحميل/فراغ، وتصدير CSV.
 */
@Component({
  selector: 'app-sf-invoices-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DecimalPipe, MatSnackBarModule, NbPageHeaderComponent, NbPanelComponent, NbDatepickerComponent, NbLoadingComponent, SendMessageModalComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="فواتير الطلاب"
        subtitle="فواتير الرسوم الدراسية بحالاتها والمبالغ المدفوعة والمتبقية."
      >
        <button class="nb-btn-secondary" (click)="exportCsv()" [disabled]="filtered().length === 0">تصدير CSV</button>
        <button class="nb-btn-secondary" (click)="reload()">تحديث</button>
        <button class="nb-btn-primary" (click)="toggleCreate()">{{ creating() ? 'إغلاق' : 'إنشاء فاتورة' }}</button>
      </nb-page-header>

      @if (creating()) {
        <div class="create-panel">
          <div class="cp-grid">
            <div class="cfld req"><label>حساب الطالب</label>
              <select [(ngModel)]="gf.billing_account_id">
                <option value="">اختر الحساب…</option>
                @for (a of accounts(); track a.id) { <option [value]="a.id">{{ a.account_number }}</option> }
              </select>
            </div>
            <div class="cfld req"><label>تاريخ الاستحقاق</label>
              <nb-datepicker [(value)]="gf.due_date" ariaLabel="تاريخ الاستحقاق"></nb-datepicker>
            </div>
            <button class="nb-btn-primary" (click)="generate()" [disabled]="genBusy() || !gf.billing_account_id || !gf.due_date || selectedFees().length === 0">
              {{ genBusy() ? 'جارٍ الإنشاء…' : 'توليد الفاتورة' }}
            </button>
          </div>
          <div class="cp-label">هياكل الرسوم <span>(اختر بندًا واحدًا على الأقل)</span></div>
          <div class="chips">
            @for (fs of feeStructures(); track fs.id) {
              <label class="chip" [class.sel]="isFeeSelected(fs.id)">
                <input type="checkbox" [checked]="isFeeSelected(fs.id)" (change)="toggleFee(fs.id)" />
                {{ fs.name }} — {{ fs.amount | number:'1.2-2' }} ر.س
              </label>
            }
            @if (feeStructures().length === 0 && lookupsLoaded()) {
              <span class="cp-hint">لا توجد هياكل رسوم معرّفة بعد — أنشئها من إعدادات الرسوم في الخادم.</span>
            }
          </div>
        </div>
      }

      <div class="stat-row">
        <div class="mini"><span class="mini-label">إجمالي الفواتير المعروضة</span><span class="mini-val">{{ filtered().length }}</span></div>
        <div class="mini"><span class="mini-label">إجمالي القيمة</span><span class="mini-val">{{ sumTotal() | number:'1.2-2' }} ر.س</span></div>
        <div class="mini"><span class="mini-label">إجمالي المتبقي</span><span class="mini-val due">{{ sumOutstanding() | number:'1.2-2' }} ر.س</span></div>
      </div>

      <div class="filter-bar">
        <div class="search">
          <input type="text" [(ngModel)]="search" (input)="onFilter()" aria-label="بحث"
                 placeholder="بحث برقم الفاتورة…" />
        </div>
        <div class="field">
          <label>الحالة</label>
          <select [(ngModel)]="statusFilter" (change)="onFilter()">
            <option value="">الكل</option>
            <option value="draft">مسودة</option>
            <option value="posted">مرحلة ومسجلة</option>
            <option value="cancelled">ملغاة</option>
          </select>
        </div>
        <div class="field">
          <label>الفرز</label>
          <select [(ngModel)]="sortKey" (change)="onFilter()">
            <option value="issue_desc">الأحدث إصداراً</option>
            <option value="outstanding_desc">الأعلى متبقياً</option>
            <option value="due_asc">الأقرب استحقاقاً</option>
          </select>
        </div>
      </div>

      @if (truncated()) {
        <div class="notice">تُعرض أول {{ rows().length }} فاتورة من إجمالي {{ total() }}. استخدم البحث لتضييق النتائج.</div>
      }

      <nb-panel [flush]="true">
        <div class="tbl">
          <div class="tbl-head">
            <span>رقم الفاتورة</span>
            <span>تاريخ الإصدار</span>
            <span>الاستحقاق</span>
            <span>الإجمالي</span>
            <span>المدفوع</span>
            <span>المتبقي</span>
            <span>الحالة</span>
            <span>إجراءات</span>
          </div>
          @if (loading()) {
            <nb-loading message="جارٍ تحميل الفواتير…"></nb-loading>
          } @else {
            @for (i of paged(); track i.id) {
              <div class="tbl-row">
                <span class="mono strong">{{ i.invoice_number }}</span>
                <span class="mono">{{ i.issue_date }}</span>
                <span class="mono">{{ i.due_date }}</span>
                <span class="mono">{{ i.total_amount | number:'1.2-2' }}</span>
                <span class="mono">{{ i.paid_amount | number:'1.2-2' }}</span>
                <span class="mono" [class.due]="+i.outstanding_amount > 0">{{ i.outstanding_amount | number:'1.2-2' }}</span>
                <span><span [class]="badge(i.status)">{{ statusText(i.status) }}</span></span>
                <span class="row-actions">
                  <button class="nb-btn-ghost sm" (click)="openMessageModal(i)">💬 إرسال</button>
                </span>
              </div>
            }
            @if (filtered().length === 0) {
              <div class="tbl-empty">لا توجد فواتير تطابق خيارات البحث.</div>
            }
          }
        </div>
      </nb-panel>

      @if (totalPages() > 1) {
        <div class="pager">
          <button class="nb-btn-ghost sm" [disabled]="page() === 1" (click)="prev()">السابق</button>
          <span class="pager-info">صفحة {{ page() }} من {{ totalPages() }} · {{ filtered().length }} فاتورة</span>
          <button class="nb-btn-ghost sm" [disabled]="page() === totalPages()" (click)="next()">التالي</button>
        </div>
      }

      <app-send-message-modal
        [(open)]="showMsgModal"
        [recipientName]="selectedInvoice()?.guardian_name || 'ولي الأمر'"
        [recipientPhone]="selectedInvoice()?.guardian_phone || ''"
        [contextVariables]="{ 
          invoice_number: selectedInvoice()?.invoice_number,
          amount: selectedInvoice()?.total_amount,
          student_name: selectedInvoice()?.student_name || '',
          guardian_name: selectedInvoice()?.guardian_name || 'ولي الأمر'
        }"
        defaultTemplateCode="INVOICE_ISSUED"
        [allowedCategories]="['finance']"
      ></app-send-message-modal>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .create-panel { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 16px; margin-bottom: 14px; animation: paneIn 220ms cubic-bezier(0.2,0,0,1); }
    @keyframes paneIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .create-panel { animation: none; } }
    .cp-grid { display: grid; grid-template-columns: 1.6fr 1.2fr auto; gap: 12px; align-items: end; }
    @media (max-width: 760px) { .cp-grid { grid-template-columns: 1fr; } }
    .cfld { display: flex; flex-direction: column; gap: 5px; }
    .cfld label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
    .cfld.req label::after { content: ' *'; color: var(--nb-danger); }
    .cfld select { height: 36px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); background: var(--nb-surface); outline: none; }
    .cp-label { font-size: 12px; font-weight: 600; color: var(--nb-text); margin: 14px 0 8px; }
    .cp-label span { font-weight: 400; color: var(--nb-text-muted); font-size: 11px; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; padding: 6px 12px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius-pill); cursor: pointer; color: var(--nb-text-secondary); transition: background 150ms ease, border-color 150ms ease; }
    .chip.sel { background: var(--nb-primary-50); border-color: var(--nb-primary-600); color: var(--nb-primary-600); font-weight: 600; }
    .chip input { display: none; }
    .cp-hint { font-size: 12px; color: var(--nb-text-muted); }
    .stat-row { display: flex; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
    .mini { display: flex; flex-direction: column; gap: 3px; background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 10px 14px; min-width: 160px; }
    .mini-label { font-size: 11px; color: var(--nb-text-muted); }
    .mini-val { font-size: 17px; font-weight: 700; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .mini-val.due { color: var(--nb-danger); }
    .filter-bar { display: flex; gap: 12px; align-items: flex-end; margin-bottom: 12px; flex-wrap: wrap; }
    .search { flex: 1; min-width: 240px; height: 34px; background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius); display: flex; align-items: center; padding: 0 12px; }
    .search input { flex: 1; border: none; background: transparent; outline: none; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); }
    .search input::placeholder { color: var(--nb-text-faint); }
    .field { display: flex; flex-direction: column; gap: 5px; }
    .field label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
    .field select { height: 34px; min-width: 160px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); background: var(--nb-surface); outline: none; }
    .notice { font-size: 12px; color: var(--nb-text-muted); background: var(--nb-info-bg); border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius); padding: 8px 12px; margin-bottom: 12px; }
    .tbl { display: flex; flex-direction: column; }
    .tbl-head, .tbl-row { display: grid; grid-template-columns: 1.3fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr; gap: 8px; padding: 9px 16px; align-items: center; }
    .tbl-head { background: var(--nb-surface-raised); border-bottom: 1px solid var(--nb-border-soft); padding: 8px 16px; font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .tbl-row { border-bottom: 1px solid var(--nb-border-row); font-size: 13px; color: var(--nb-text); }
    .tbl-row:last-child { border-bottom: none; }
    .tbl-row:hover { background: var(--nb-surface-raised); }
    .strong { font-weight: 600; }
    .mono { font-variant-numeric: tabular-nums; }
    .mono.due { color: var(--nb-danger); font-weight: 600; }
    .tbl-empty { padding: 28px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
    .nb-btn-ghost.sm { height: 26px; padding: 0 12px; font-size: 12px; }
    .pager { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 14px; }
    .pager-info { font-size: 12px; color: var(--nb-text-muted); }
  `],
})
export class SfInvoicesListComponent implements OnInit {
  private readonly svc = inject(StudentFinanceService);
  private readonly snack = inject(MatSnackBar);

  // ---- توليد فاتورة (دورة: حساب ← فاتورة) ----
  readonly creating = signal(false);
  readonly genBusy = signal(false);
  readonly lookupsLoaded = signal(false);
  readonly accounts = signal<any[]>([]);
  readonly feeStructures = signal<any[]>([]);
  readonly selectedFees = signal<string[]>([]);
  gf = { billing_account_id: '', due_date: '' };

  showMsgModal = false;
  selectedInvoice = signal<any | null>(null);

  openMessageModal(invoice: any) {
    this.selectedInvoice.set(invoice);
    this.showMsgModal = true;
  }

  isFeeSelected(id: string): boolean { return this.selectedFees().includes(id); }
  toggleFee(id: string): void {
    this.selectedFees.update((l) => l.includes(id) ? l.filter((x) => x !== id) : [...l, id]);
  }

  toggleCreate(): void {
    this.creating.update((v) => !v);
    if (this.creating() && !this.lookupsLoaded()) {
      this.svc.listBillingAccounts({ page_size: 100 }).subscribe((res) => this.accounts.set(res?.data ?? []));
      this.svc.listFeeStructures().subscribe({
        next: (res) => { this.feeStructures.set(res?.data ?? []); this.lookupsLoaded.set(true); },
        error: () => this.lookupsLoaded.set(true),
      });
    }
  }

  generate(): void {
    if (this.genBusy()) return;
    this.genBusy.set(true);
    this.svc.generateStudentInvoice({
      billing_account_id: this.gf.billing_account_id,
      fee_structure_ids: this.selectedFees(),
      due_date: this.gf.due_date,
    }).subscribe({
      next: (res) => {
        this.genBusy.set(false);
        this.creating.set(false);
        const num = res?.invoice_number || res?.data?.invoice_number || '';
        this.snack.open(num ? `تم توليد الفاتورة ${num} بنجاح.` : 'تم توليد الفاتورة بنجاح.', 'إغلاق', { duration: 4000 });
        this.gf = { billing_account_id: '', due_date: '' };
        this.selectedFees.set([]);
        this.reload();
      },
      error: (e) => {
        this.genBusy.set(false);
        this.snack.open(e?.error?.message || e?.error?.error || 'تعذّر توليد الفاتورة.', 'إغلاق', { duration: 5000 });
      },
    });
  }

  readonly loading = signal(false);
  readonly rows = signal<any[]>([]);
  readonly total = signal(0);
  readonly truncated = computed(() => this.total() > this.rows().length);

  search = '';
  statusFilter = '';
  sortKey = 'issue_desc';

  private readonly pageSize = 15;
  readonly page = signal(1);

  readonly filtered = computed(() => {
    const q = this.search.trim().toLowerCase();
    let list = this.rows().filter((i) => {
      if (q && !`${i.invoice_number}`.toLowerCase().includes(q)) return false;
      if (this.statusFilter && i.status !== this.statusFilter) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (this.sortKey) {
        case 'outstanding_desc': return +b.outstanding_amount - +a.outstanding_amount;
        case 'due_asc': return `${a.due_date}`.localeCompare(`${b.due_date}`);
        default: return `${b.issue_date}`.localeCompare(`${a.issue_date}`);
      }
    });
    return list;
  });

  readonly sumTotal = computed(() => this.filtered().reduce((s, i) => s + (+i.total_amount || 0), 0));
  readonly sumOutstanding = computed(() => this.filtered().reduce((s, i) => s + (+i.outstanding_amount || 0), 0));

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  readonly paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  ngOnInit(): void { this.reload(); }

  reload(): void {
    this.loading.set(true);
    this.page.set(1);
    this.svc.listInvoices({ page_size: 100, ordering: '-issue_date' }).subscribe({
      next: (res) => {
        this.rows.set(res?.data ?? []);
        this.total.set(res?.metadata?.count ?? (res?.data?.length ?? 0));
        this.loading.set(false);
      },
      error: () => { this.rows.set([]); this.total.set(0); this.loading.set(false); },
    });
  }

  onFilter(): void { this.page.set(1); }
  prev(): void { if (this.page() > 1) this.page.update((p) => p - 1); }
  next(): void { if (this.page() < this.totalPages()) this.page.update((p) => p + 1); }

  badge(status: string): string {
    const map: Record<string, string> = { posted: 'nb-badge-success', draft: 'nb-badge-neutral', cancelled: 'nb-badge-danger' };
    return map[status] || 'nb-badge-neutral';
  }
  statusText(status: string): string {
    const map: Record<string, string> = { posted: 'مرحلة ومسجلة', draft: 'مسودة', cancelled: 'ملغاة' };
    return map[status] || status;
  }

  exportCsv(): void {
    const header = ['رقم الفاتورة', 'الإصدار', 'الاستحقاق', 'الإجمالي', 'المدفوع', 'المتبقي', 'الحالة'];
    const lines = this.filtered().map((i) => [
      i.invoice_number, i.issue_date, i.due_date, i.total_amount, i.paid_amount, i.outstanding_amount, this.statusText(i.status),
    ].join(','));
    downloadCsv('student_invoices.csv', [header.join(','), ...lines].join('\n'));
  }
}
