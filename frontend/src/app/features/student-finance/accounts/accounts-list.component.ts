import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { StudentFinanceService } from '../student-finance.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';

/**
 * حسابات الطلاب المالية — وحدة عاملة (Nebras OS).
 * قائمة حقيقية من student-finance/billing-accounts/ مع بحث، فرز، تصفية،
 * ترقيم صفحات، حالات تحميل/فراغ، وتصدير CSV للصفوف المحمّلة.
 * البيانات كلها من الخادم — لا صفوف مُختلقة.
 */
@Component({
  selector: 'app-sf-accounts-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DecimalPipe, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="حسابات الطلاب المالية"
        subtitle="أرصدة الطلاب المفتوحة والمستحقة والدائنة مع حالات الحظر والإيقاف المالي."
      >
        <button class="nb-btn-secondary" (click)="exportCsv()" [disabled]="filtered().length === 0">تصدير CSV</button>
        <button class="nb-btn-secondary" (click)="reload()">تحديث</button>
      </nb-page-header>

      <div class="filter-bar">
        <div class="search">
          <input type="text" [(ngModel)]="search" (input)="onFilter()" aria-label="بحث"
                 placeholder="بحث برقم الحساب أو رقم الطالب…" />
        </div>
        <div class="field">
          <label>الحالة</label>
          <select [(ngModel)]="statusFilter" (change)="onFilter()">
            <option value="">الكل</option>
            <option value="outstanding">عليه مديونية</option>
            <option value="credit">رصيد دائن</option>
            <option value="blocked">محظور</option>
            <option value="hold">إيقاف مالي</option>
            <option value="clear">سليم</option>
          </select>
        </div>
        <div class="field">
          <label>الفرز</label>
          <select [(ngModel)]="sortKey" (change)="onFilter()">
            <option value="outstanding_desc">الأعلى مديونية</option>
            <option value="outstanding_asc">الأقل مديونية</option>
            <option value="account">رقم الحساب</option>
          </select>
        </div>
      </div>

      @if (truncated()) {
        <div class="notice">يُعرض أول {{ rows().length }} حساب من إجمالي {{ total() }}. استخدم البحث لتضييق النتائج.</div>
      }

      <nb-panel [flush]="true">
        <div class="tbl">
          <div class="tbl-head">
            <span>رقم الحساب</span>
            <span>الرصيد الحالي</span>
            <span>المستحق</span>
            <span>الرصيد الدائن</span>
            <span>الحالة</span>
          </div>
          @if (loading()) {
            <div class="tbl-empty">جارٍ تحميل الحسابات…</div>
          } @else {
            @for (a of paged(); track a.id) {
              <div class="tbl-row">
                <span class="mono strong">{{ a.account_number }}</span>
                <span class="mono">{{ a.current_balance | number:'1.2-2' }} ر.س</span>
                <span class="mono" [class.due]="+a.outstanding_balance > 0">{{ a.outstanding_balance | number:'1.2-2' }} ر.س</span>
                <span class="mono">{{ a.credit_balance | number:'1.2-2' }} ر.س</span>
                <span class="badges">
                  @if (a.is_blocked) { <span class="nb-badge-danger">محظور</span> }
                  @if (a.financial_hold) { <span class="nb-badge-warning">إيقاف مالي</span> }
                  @if (!a.is_blocked && !a.financial_hold) { <span class="nb-badge-success">سليم</span> }
                </span>
              </div>
            }
            @if (filtered().length === 0) {
              <div class="tbl-empty">لا توجد حسابات تطابق خيارات البحث.</div>
            }
          }
        </div>
      </nb-panel>

      @if (totalPages() > 1) {
        <div class="pager">
          <button class="nb-btn-ghost sm" [disabled]="page() === 1" (click)="prev()">السابق</button>
          <span class="pager-info">صفحة {{ page() }} من {{ totalPages() }} · {{ filtered().length }} حساب</span>
          <button class="nb-btn-ghost sm" [disabled]="page() === totalPages()" (click)="next()">التالي</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .filter-bar { display: flex; gap: 12px; align-items: flex-end; margin-bottom: 12px; flex-wrap: wrap; }
    .search { flex: 1; min-width: 260px; height: 34px; background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius); display: flex; align-items: center; padding: 0 12px; }
    .search input { flex: 1; border: none; background: transparent; outline: none; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); }
    .search input::placeholder { color: var(--nb-text-faint); }
    .field { display: flex; flex-direction: column; gap: 5px; }
    .field label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
    .field select { height: 34px; min-width: 170px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); background: var(--nb-surface); outline: none; }
    .notice { font-size: 12px; color: var(--nb-text-muted); background: var(--nb-info-bg); border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius); padding: 8px 12px; margin-bottom: 12px; }
    .tbl { display: flex; flex-direction: column; }
    .tbl-head, .tbl-row { display: grid; grid-template-columns: 1.4fr 1.2fr 1.2fr 1.2fr 1.4fr; gap: 8px; padding: 9px 16px; align-items: center; }
    .tbl-head { background: var(--nb-surface-raised); border-bottom: 1px solid var(--nb-border-soft); padding: 8px 16px; font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .tbl-row { border-bottom: 1px solid var(--nb-border-row); font-size: 13px; color: var(--nb-text); }
    .tbl-row:last-child { border-bottom: none; }
    .tbl-row:hover { background: var(--nb-surface-raised); }
    .strong { font-weight: 600; }
    .mono { font-variant-numeric: tabular-nums; }
    .mono.due { color: var(--nb-danger); font-weight: 600; }
    .badges { display: flex; gap: 6px; flex-wrap: wrap; }
    .tbl-empty { padding: 28px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
    .nb-btn-ghost.sm { height: 26px; padding: 0 12px; font-size: 12px; }
    .pager { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 14px; }
    .pager-info { font-size: 12px; color: var(--nb-text-muted); }
  `],
})
export class SfAccountsListComponent implements OnInit {
  private readonly svc = inject(StudentFinanceService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly rows = signal<any[]>([]);
  readonly total = signal(0);
  readonly truncated = computed(() => this.total() > this.rows().length);

  search = '';
  statusFilter = '';
  sortKey = 'outstanding_desc';

  private readonly pageSize = 15;
  readonly page = signal(1);

  readonly filtered = computed(() => {
    const q = this.search.trim().toLowerCase();
    let list = this.rows().filter((a) => {
      if (q && !`${a.account_number} ${a.student_id}`.toLowerCase().includes(q)) return false;
      switch (this.statusFilter) {
        case 'outstanding': return +a.outstanding_balance > 0;
        case 'credit': return +a.credit_balance > 0;
        case 'blocked': return !!a.is_blocked;
        case 'hold': return !!a.financial_hold;
        case 'clear': return !a.is_blocked && !a.financial_hold;
        default: return true;
      }
    });
    list = [...list].sort((a, b) => {
      switch (this.sortKey) {
        case 'outstanding_asc': return +a.outstanding_balance - +b.outstanding_balance;
        case 'account': return `${a.account_number}`.localeCompare(`${b.account_number}`);
        default: return +b.outstanding_balance - +a.outstanding_balance;
      }
    });
    return list;
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  readonly paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap.get('q');
    if (q) this.search = q;
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.page.set(1);
    this.svc.listBillingAccounts({ page_size: 100, ordering: '-outstanding_balance' }).subscribe({
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

  exportCsv(): void {
    const header = ['رقم الحساب', 'الرصيد الحالي', 'المستحق', 'الرصيد الدائن', 'محظور', 'إيقاف مالي'];
    const lines = this.filtered().map((a) => [
      a.account_number, a.current_balance, a.outstanding_balance, a.credit_balance,
      a.is_blocked ? 'نعم' : 'لا', a.financial_hold ? 'نعم' : 'لا',
    ].join(','));
    downloadCsv('student_accounts.csv', [header.join(','), ...lines].join('\n'));
  }
}

/** تنزيل CSV من نص في المتصفح (بيانات حقيقية من الجدول المحمّل) */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}
