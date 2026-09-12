import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { StudentFinanceService } from '../student-finance.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { downloadCsv } from '../../../shared/export';
import { SfDocumentDrawerComponent, SfDoc } from '../shared/sf-document-drawer.component';
import { ReceiptCreateModalComponent } from './receipt-create-modal.component';

/**
 * سندات القبض / المدفوعات — وحدة عاملة (Nebras OS).
 * قائمة حقيقية من student-finance/receipts/ (تاريخ الدفعات) مع بحث، تصفية حالة،
 * فرز، ترقيم، حالات تحميل/فراغ، وتصدير CSV، ومعالج إنشاء متعدد الخطوات بنمط نبراس.
 */
@Component({
  selector: 'app-sf-receipts-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DecimalPipe,
    MatSnackBarModule,
    NbPageHeaderComponent,
    NbPanelComponent,
    NbLoadingComponent,
    ReceiptCreateModalComponent,
    SfDocumentDrawerComponent,
  ],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="سندات القبض والمدفوعات"
        subtitle="سجل الدفعات المستلمة من الطلاب وحالتها في الصندوق."
      >
        <button class="nb-btn-secondary" (click)="exportCsv()" [disabled]="filtered().length === 0">تصدير CSV</button>
        <button class="nb-btn-secondary" (click)="reload()">تحديث</button>
        <button class="nb-btn-primary" (click)="openCreateModal()">＋ استلام دفعة جديدة</button>
      </nb-page-header>

      <app-receipt-create-modal
        [open]="createModalOpen()"
        (closed)="createModalOpen.set(false)"
        (saved)="onReceiptSaved($event)"
      ></app-receipt-create-modal>

      <div class="stat-row">
        <div class="mini"><span class="mini-label">عدد السندات المعروضة</span><span class="mini-val">{{ filtered().length }}</span></div>
        <div class="mini"><span class="mini-label">إجمالي المقبوضات</span><span class="mini-val ok">{{ sumAmount() | number:'1.2-2' }} ج.س</span></div>
      </div>

      <div class="filter-bar">
        <div class="search">
          <input type="text" [(ngModel)]="search" (input)="onFilter()" aria-label="بحث"
                 placeholder="بحث برقم السند…" />
        </div>
        <div class="field">
          <label>الحالة</label>
          <select [(ngModel)]="statusFilter" (change)="onFilter()">
            <option value="">الكل</option>
            <option value="draft">مسودة</option>
            <option value="posted">مرحل ومقفل</option>
            <option value="cancelled">ملغي</option>
          </select>
        </div>
        <div class="field">
          <label>الفرز</label>
          <select [(ngModel)]="sortKey" (change)="onFilter()">
            <option value="date_desc">الأحدث</option>
            <option value="amount_desc">الأعلى مبلغاً</option>
          </select>
        </div>
      </div>

      @if (truncated()) {
        <div class="notice">يُعرض أول {{ rows().length }} سند من إجمالي {{ total() }}. استخدم البحث لتضييق النتائج.</div>
      }

      <nb-panel [flush]="true">
        <div class="tbl">
          <div class="tbl-head">
            <span>رقم السند</span>
            <span>تاريخ الدفع</span>
            <span>المبلغ</span>
            <span>الحالة</span>
            <span style="text-align: center;">إجراءات</span>
          </div>
          @if (loading()) {
            <nb-loading message="جارٍ تحميل السندات…"></nb-loading>
          } @else {
            @for (r of paged(); track r.id) {
              <div class="tbl-row clickable" (click)="openDoc(r)">
                <span class="mono strong">{{ r.receipt_number }}</span>
                <span class="mono">{{ r.payment_date }}</span>
                <span class="mono ok">{{ r.amount | number:'1.2-2' }} جنيه</span>
                <span><span [class]="badge(r.status)">{{ statusText(r.status) }}</span></span>
                <span class="row-actions" style="text-align: center;" (click)="$event.stopPropagation()">
                  <button class="btn ghost xs" title="طباعة سند القبض الرسمي A4" (click)="openDoc(r)">طباعة</button>
                </span>
              </div>
            }
            @if (filtered().length === 0) {
              <div class="tbl-empty">لا توجد سندات تطابق خيارات البحث.</div>
            }
          }
        </div>
      </nb-panel>

      @if (totalPages() > 1) {
        <div class="pager">
          <button class="nb-btn-ghost sm" [disabled]="page() === 1" (click)="prev()">السابق</button>
          <span class="pager-info">صفحة {{ page() }} من {{ totalPages() }} · {{ filtered().length }} سند</span>
          <button class="nb-btn-ghost sm" [disabled]="page() === totalPages()" (click)="next()">التالي</button>
        </div>
      }

      <sf-document-drawer [doc]="doc()" [methods]="methods()" (closed)="doc.set(null)"></sf-document-drawer>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .stat-row { display: flex; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
    .mini { display: flex; flex-direction: column; gap: 3px; background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 10px 14px; min-width: 170px; }
    .mini-label { font-size: 11px; color: var(--nb-text-muted); }
    .mini-val { font-size: 17px; font-weight: 700; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .mini-val.ok { color: var(--nb-success); }
    .filter-bar { display: flex; gap: 12px; align-items: flex-end; margin-bottom: 12px; flex-wrap: wrap; }
    .search { flex: 1; min-width: 240px; height: 34px; background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius); display: flex; align-items: center; padding: 0 12px; }
    .search input { flex: 1; border: none; background: transparent; outline: none; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); }
    .search input::placeholder { color: var(--nb-text-faint); }
    .field { display: flex; flex-direction: column; gap: 5px; }
    .field label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
    .field select { height: 34px; min-width: 160px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); background: var(--nb-surface); outline: none; }
    .notice { font-size: 12px; color: var(--nb-text-muted); background: var(--nb-info-bg); border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius); padding: 8px 12px; margin-bottom: 12px; }
    .tbl { display: flex; flex-direction: column; }
    .tbl-head, .tbl-row { display: grid; grid-template-columns: 1.4fr 1.2fr 1.2fr 1fr 1fr; gap: 8px; padding: 9px 16px; align-items: center; }
    .tbl-head { background: var(--nb-surface-raised); border-bottom: 1px solid var(--nb-border-soft); padding: 8px 16px; font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .tbl-row { border-bottom: 1px solid var(--nb-border-row); font-size: 13px; color: var(--nb-text); }
    .tbl-row:last-child { border-bottom: none; }
    .tbl-row:hover { background: var(--nb-surface-raised); }
    .strong { font-weight: 600; }
    .mono { font-variant-numeric: tabular-nums; }
    .mono.ok { color: var(--nb-success); font-weight: 600; }
    .tbl-empty { padding: 28px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
    .row-actions { display: flex; align-items: center; justify-content: center; gap: 6px; }
    .btn { height: 32px; padding: 0 12px; font-family: inherit; font-size: 12px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; display: inline-flex; align-items: center; justify-content: center; gap: 4px; transition: all 0.15s ease; }
    .btn.xs { height: 26px; padding: 0 8px; font-size: 11px; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.primary:hover:not(:disabled) { background: var(--nb-primary-700); }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.ghost:hover:not(:disabled) { background: var(--nb-surface); }
    .nb-btn-ghost.sm { height: 26px; padding: 0 12px; font-size: 12px; }
    .pager { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 14px; }
    .pager-info { font-size: 12px; color: var(--nb-text-muted); }
  `],
})
export class SfReceiptsListComponent implements OnInit {
  private readonly svc = inject(StudentFinanceService);
  private readonly snack = inject(MatSnackBar);

  // ---- معالج استلام الدفعات الجديد بنمط الخطوات ----
  readonly createModalOpen = signal(false);
  readonly methods = signal<any[]>([]);

  openCreateModal(): void {
    this.createModalOpen.set(true);
  }

  onReceiptSaved(res: any): void {
    this.reload();
  }

  readonly loading = signal(false);
  readonly rows = signal<any[]>([]);
  readonly total = signal(0);
  readonly truncated = computed(() => this.total() > this.rows().length);
  readonly doc = signal<SfDoc>(null);

  openDoc(r: any): void {
    this.doc.set({ type: 'receipt', data: r });
  }

  search = '';
  statusFilter = '';
  sortKey = 'date_desc';

  private readonly pageSize = 15;
  readonly page = signal(1);

  readonly filtered = computed(() => {
    const q = this.search.trim().toLowerCase();
    let list = this.rows().filter((r) => {
      if (q && !`${r.receipt_number}`.toLowerCase().includes(q)) return false;
      if (this.statusFilter && r.status !== this.statusFilter) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (this.sortKey === 'amount_desc') return +b.amount - +a.amount;
      return `${b.payment_date}`.localeCompare(`${a.payment_date}`);
    });
    return list;
  });

  readonly sumAmount = computed(() =>
    this.filtered().filter((r) => r.status !== 'cancelled').reduce((s, r) => s + (+r.amount || 0), 0));

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  readonly paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  ngOnInit(): void { this.reload(); }

  reload(): void {
    this.loading.set(true);
    this.page.set(1);
    this.svc.listReceipts({ page_size: 100, ordering: '-payment_date' }).subscribe({
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
    const map: Record<string, string> = { posted: 'مرحل ومقفل', draft: 'مسودة', cancelled: 'ملغي' };
    return map[status] || status;
  }

  exportCsv(): void {
    const header = ['رقم السند', 'تاريخ الدفع', 'المبلغ', 'الحالة'];
    const lines = this.filtered().map((r) => [r.receipt_number, r.payment_date, r.amount, this.statusText(r.status)].join(','));
    downloadCsv('student_receipts.csv', [header.join(','), ...lines].join('\n'));
  }
}
