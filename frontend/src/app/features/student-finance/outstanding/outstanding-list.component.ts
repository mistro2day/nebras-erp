import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentFinanceService } from '../student-finance.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { downloadCsv } from '../accounts/accounts-list.component';

/**
 * الأرصدة المستحقة (المديونيات) — وحدة عاملة (Nebras OS).
 * قائمة حقيقية من student-finance/receivables/ مع تصفية حالة (افتراضياً غير المسددة)،
 * فرز، ترقيم، حالات تحميل/فراغ، وتصدير CSV.
 */
@Component({
  selector: 'app-sf-outstanding-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DecimalPipe, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="الأرصدة المستحقة"
        subtitle="مديونيات الطلاب غير المسددة والمبالغ المتبقية على كل مطالبة."
      >
        <button class="nb-btn-secondary" (click)="exportCsv()" [disabled]="filtered().length === 0">تصدير CSV</button>
        <button class="nb-btn-secondary" (click)="reload()">تحديث</button>
      </nb-page-header>

      <div class="stat-row">
        <div class="mini"><span class="mini-label">عدد المطالبات المعروضة</span><span class="mini-val">{{ filtered().length }}</span></div>
        <div class="mini"><span class="mini-label">إجمالي المتبقي</span><span class="mini-val due">{{ sumOutstanding() | number:'1.2-2' }} ر.س</span></div>
      </div>

      <div class="filter-bar">
        <div class="field">
          <label>الحالة</label>
          <select [(ngModel)]="statusFilter" (change)="onFilter()">
            <option value="outstanding">مستحق وغير مدفوع</option>
            <option value="paid">مدفوع بالكامل</option>
            <option value="written_off">معدم ومشطوب</option>
            <option value="">الكل</option>
          </select>
        </div>
        <div class="field">
          <label>الفرز</label>
          <select [(ngModel)]="sortKey" (change)="onFilter()">
            <option value="outstanding_desc">الأعلى متبقياً</option>
            <option value="outstanding_asc">الأقل متبقياً</option>
          </select>
        </div>
      </div>

      @if (truncated()) {
        <div class="notice">تُعرض أول {{ rows().length }} مطالبة من إجمالي {{ total() }}.</div>
      }

      <nb-panel [flush]="true">
        <div class="tbl">
          <div class="tbl-head">
            <span>المبلغ الأصلي</span>
            <span>المدفوع</span>
            <span>المتبقي</span>
            <span>الحالة</span>
          </div>
          @if (loading()) {
            <div class="tbl-empty">جارٍ تحميل المطالبات…</div>
          } @else {
            @for (r of paged(); track r.id) {
              <div class="tbl-row">
                <span class="mono">{{ r.amount | number:'1.2-2' }} ر.س</span>
                <span class="mono">{{ r.paid_amount | number:'1.2-2' }} ر.س</span>
                <span class="mono due">{{ r.outstanding_amount | number:'1.2-2' }} ر.س</span>
                <span><span [class]="badge(r.status)">{{ statusText(r.status) }}</span></span>
              </div>
            }
            @if (filtered().length === 0) {
              <div class="tbl-empty">لا توجد مطالبات تطابق خيارات البحث.</div>
            }
          }
        </div>
      </nb-panel>

      @if (totalPages() > 1) {
        <div class="pager">
          <button class="nb-btn-ghost sm" [disabled]="page() === 1" (click)="prev()">السابق</button>
          <span class="pager-info">صفحة {{ page() }} من {{ totalPages() }} · {{ filtered().length }} مطالبة</span>
          <button class="nb-btn-ghost sm" [disabled]="page() === totalPages()" (click)="next()">التالي</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .stat-row { display: flex; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
    .mini { display: flex; flex-direction: column; gap: 3px; background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 10px 14px; min-width: 180px; }
    .mini-label { font-size: 11px; color: var(--nb-text-muted); }
    .mini-val { font-size: 17px; font-weight: 700; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .mini-val.due { color: var(--nb-danger); }
    .filter-bar { display: flex; gap: 12px; align-items: flex-end; margin-bottom: 12px; flex-wrap: wrap; }
    .field { display: flex; flex-direction: column; gap: 5px; }
    .field label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
    .field select { height: 34px; min-width: 190px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); background: var(--nb-surface); outline: none; }
    .notice { font-size: 12px; color: var(--nb-text-muted); background: var(--nb-info-bg); border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius); padding: 8px 12px; margin-bottom: 12px; }
    .tbl { display: flex; flex-direction: column; }
    .tbl-head, .tbl-row { display: grid; grid-template-columns: 1.2fr 1.2fr 1.2fr 1.4fr; gap: 8px; padding: 9px 16px; align-items: center; }
    .tbl-head { background: var(--nb-surface-raised); border-bottom: 1px solid var(--nb-border-soft); padding: 8px 16px; font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .tbl-row { border-bottom: 1px solid var(--nb-border-row); font-size: 13px; color: var(--nb-text); }
    .tbl-row:last-child { border-bottom: none; }
    .tbl-row:hover { background: var(--nb-surface-raised); }
    .mono { font-variant-numeric: tabular-nums; }
    .mono.due { color: var(--nb-danger); font-weight: 600; }
    .tbl-empty { padding: 28px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
    .nb-btn-ghost.sm { height: 26px; padding: 0 12px; font-size: 12px; }
    .pager { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 14px; }
    .pager-info { font-size: 12px; color: var(--nb-text-muted); }
  `],
})
export class SfOutstandingListComponent implements OnInit {
  private readonly svc = inject(StudentFinanceService);

  readonly loading = signal(false);
  readonly rows = signal<any[]>([]);
  readonly total = signal(0);
  readonly truncated = computed(() => this.total() > this.rows().length);

  statusFilter = 'outstanding';
  sortKey = 'outstanding_desc';

  private readonly pageSize = 15;
  readonly page = signal(1);

  readonly filtered = computed(() => {
    let list = this.rows().filter((r) => !this.statusFilter || r.status === this.statusFilter);
    list = [...list].sort((a, b) =>
      this.sortKey === 'outstanding_asc'
        ? +a.outstanding_amount - +b.outstanding_amount
        : +b.outstanding_amount - +a.outstanding_amount);
    return list;
  });

  readonly sumOutstanding = computed(() => this.filtered().reduce((s, r) => s + (+r.outstanding_amount || 0), 0));

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  readonly paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  ngOnInit(): void { this.reload(); }

  reload(): void {
    this.loading.set(true);
    this.page.set(1);
    this.svc.listReceivables({ page_size: 100, ordering: '-outstanding_amount' }).subscribe({
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
    const map: Record<string, string> = { outstanding: 'nb-badge-danger', paid: 'nb-badge-success', written_off: 'nb-badge-neutral' };
    return map[status] || 'nb-badge-neutral';
  }
  statusText(status: string): string {
    const map: Record<string, string> = { outstanding: 'مستحق وغير مدفوع', paid: 'مدفوع بالكامل', written_off: 'معدم ومشطوب' };
    return map[status] || status;
  }

  exportCsv(): void {
    const header = ['المبلغ الأصلي', 'المدفوع', 'المتبقي', 'الحالة'];
    const lines = this.filtered().map((r) => [r.amount, r.paid_amount, r.outstanding_amount, this.statusText(r.status)].join(','));
    downloadCsv('outstanding_receivables.csv', [header.join(','), ...lines].join('\n'));
  }
}
