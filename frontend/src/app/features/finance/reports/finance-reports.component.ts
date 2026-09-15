import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FinanceService } from '../finance.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { NbDatepickerComponent } from '../../../shared/nebras/nb-datepicker.component';
import { NbExportMenuComponent } from '../../../shared/export/nb-export-menu.component';
import { ExportColumn } from '../../../shared/export/export.types';
import { printFinancialReport } from './finance-report-print';

/** أنواع التقارير المالية */
type ReportType = 'revenue' | 'trial-balance' | 'income-statement' | 'cost-center' | 'balance-sheet';

interface ReportTab {
  key: ReportType;
  label: string;
  icon: string;
  desc: string;
}

interface KPI {
  label: string;
  value: string;
  sub?: string;
  kind?: 'default' | 'success' | 'danger' | 'info' | 'warning';
}

/**
 * شاشة التقارير المالية المتكاملة — Nebras OS
 * ───────────────────────────────────────────────
 * تدعم 5 تقارير مالية أساسية:
 *   1. الإيرادات حسب التاريخ  2. ميزان المراجعة  3. قائمة الدخل
 *   4. مراكز التكلفة  5. المركز المالي (الميزانية العمومية)
 *
 * مع شريط فلترة ذكي، مؤشرات أداء (KPIs)، جدول بيانات محاسبي،
 * وأدوات تصدير (Excel / PDF / CSV) وطباعة A4 رسمية بهوية المدرسة.
 */
@Component({
  selector: 'app-finance-reports',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    NbPageHeaderComponent, NbPanelComponent, NbLoadingComponent,
    NbDatepickerComponent, NbExportMenuComponent,
  ],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="التقارير المالية والختامية"
        subtitle="تقارير الإيرادات والمصروفات، ميزان المراجعة، قائمة الدخل، والمركز المالي — الجنيه السوداني (ج.س).">
        <nb-export-menu
          [columns]="activeColumns()"
          [rows]="tableRows()"
          [title]="activeTab().label"
          [subtitle]="filterSummary()"
          [customPrint]="onPrint">
        </nb-export-menu>
      </nb-page-header>

      <!-- تبويبات أنواع التقارير -->
      <div class="tabs-bar">
        @for (tab of tabs; track tab.key) {
          <button
            class="tab-btn"
            [class.active]="currentTab() === tab.key"
            (click)="switchTab(tab.key)">
            <span class="tab-icon">{{ tab.icon }}</span>
            <span class="tab-label">{{ tab.label }}</span>
          </button>
        }
      </div>

      <!-- شريط الفلاتر -->
      <section class="filters-bar">
        <div class="filter-group">
          <label class="filter-label">من تاريخ</label>
          <nb-datepicker
            [value]="dateFrom()"
            (valueChange)="dateFrom.set($event)"
            placeholder="بداية الفترة">
          </nb-datepicker>
        </div>
        <div class="filter-group">
          <label class="filter-label">إلى تاريخ</label>
          <nb-datepicker
            [value]="dateTo()"
            (valueChange)="dateTo.set($event)"
            placeholder="نهاية الفترة">
          </nb-datepicker>
        </div>
        <div class="filter-group">
          <label class="filter-label">حساب / تصنيف</label>
          <select class="nb-select" [(ngModel)]="accountFilter" (change)="generateReport()">
            <option value="">— جميع الحسابات —</option>
            @for (acc of accounts(); track acc.id) {
              <option [value]="acc.id">{{ acc.code }} - {{ acc.name }}</option>
            }
          </select>
        </div>
        <button class="btn primary sm" (click)="generateReport()">
          <span>📊</span> توليد التقرير
        </button>
        <button class="btn ghost sm" (click)="resetFilters()">
          <span>↺</span> إعادة تعيين
        </button>
      </section>

      <!-- مؤشرات الأداء الرئيسية (KPIs) -->
      <div class="kpi-row">
        @for (kpi of kpis(); track kpi.label) {
          <div class="kpi-card" [class]="kpi.kind || 'default'">
            <span class="kpi-label">{{ kpi.label }}</span>
            <span class="kpi-value">{{ kpi.value }}</span>
            @if (kpi.sub) {
              <span class="kpi-sub">{{ kpi.sub }}</span>
            }
          </div>
        }
      </div>

      <!-- جدول البيانات المالي -->
      <nb-panel
        [title]="activeTab().label"
        [subtitle]="filterSummary()"
        [flush]="true"
        class="report-table-panel">
        <div class="table-wrap">
          @if (loading()) {
            <nb-loading message="جارٍ تحميل بيانات التقرير…"></nb-loading>
          } @else {
            <table class="report-table">
              <thead>
                <tr>
                  @for (col of activeColumns(); track col.key) {
                    <th [class.num]="col.align === 'end'">{{ col.label }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of tableRows(); track $index) {
                  <tr [class.total-row]="row._isTotal" [class.sub-total]="row._isSubTotal">
                    @for (col of activeColumns(); track col.key) {
                      <td [class.num]="col.align === 'end'" [class.bold]="row._isTotal || row._isSubTotal">
                        {{ col.map ? col.map(row) : row[col.key] }}
                      </td>
                    }
                  </tr>
                }
                @if (!tableRows().length && !loading()) {
                  <tr>
                    <td [colSpan]="activeColumns().length" class="empty-row">
                      <div class="empty-state">
                        <span class="empty-icon">📋</span>
                        <span class="empty-text">لا توجد بيانات للفترة المحددة — حدد نطاق التاريخ ثم اضغط «توليد التقرير».</span>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      </nb-panel>

      <!-- تذييل معلوماتي -->
      <div class="report-footer">
        <span>عدد السجلات: <strong>{{ tableRows().length }}</strong></span>
        <span>العملة: <strong>الجنيه السوداني (ج.س / SDG)</strong></span>
        <span>تاريخ التوليد: <strong>{{ generatedAt() }}</strong></span>
      </div>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }

    /* ===== تبويبات التقارير ===== */
    .tabs-bar {
      display: flex; gap: 6px; margin-bottom: 16px; padding: 4px;
      background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      overflow-x: auto;
    }
    .tab-btn {
      display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px;
      font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
      border: 1px solid transparent; border-radius: var(--nb-radius); background: none; color: var(--nb-text-secondary);
      white-space: nowrap; transition: all 0.15s ease;
    }
    .tab-btn:hover { background: var(--nb-surface-raised); color: var(--nb-text); }
    .tab-btn.active {
      background: var(--nb-primary-50); border-color: var(--nb-primary-200); color: var(--nb-primary-700); font-weight: 700;
      box-shadow: 0 1px 3px color-mix(in srgb, var(--nb-primary-600) 12%, transparent);
    }
    .tab-icon { font-size: 16px; }
    .tab-label { letter-spacing: -0.2px; }
    @media (max-width: 720px) { .tab-label { display: none; } .tab-icon { font-size: 20px; } .tab-btn { padding: 10px 12px; } }

    /* ===== شريط الفلاتر ===== */
    .filters-bar {
      display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap;
      padding: 14px 18px; margin-bottom: 14px;
      background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
    }
    .filter-group { display: flex; flex-direction: column; gap: 4px; min-width: 150px; }
    .filter-label { font-size: 11px; font-weight: 600; color: var(--nb-text-muted); letter-spacing: 0.3px; }
    .nb-select {
      height: 38px; padding: 0 12px; font-family: inherit; font-size: 13px;
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface-raised); color: var(--nb-text);
      cursor: pointer; direction: rtl;
    }
    .nb-select:focus { outline: none; border-color: var(--nb-primary-400); box-shadow: 0 0 0 2px color-mix(in srgb, var(--nb-primary-600) 15%, transparent); }

    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px;
      font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
      border: 1px solid transparent; border-radius: var(--nb-radius); transition: all 0.15s ease; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.primary:hover { background: var(--nb-primary-700); }
    .btn.ghost { background: none; color: var(--nb-text-secondary); border-color: var(--nb-border); }
    .btn.ghost:hover { background: var(--nb-surface-raised); color: var(--nb-text); }
    .btn.sm { height: 38px; font-size: 12px; padding: 0 14px; }

    /* ===== مؤشرات الأداء (KPIs) ===== */
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-bottom: 14px; }
    .kpi-card {
      display: flex; flex-direction: column; gap: 3px; padding: 16px 18px;
      background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      border-right: 4px solid var(--nb-border-soft); transition: transform 0.15s ease;
    }
    .kpi-card:hover { transform: translateY(-1px); }
    .kpi-card.success { border-right-color: var(--nb-success); }
    .kpi-card.danger { border-right-color: var(--nb-danger); }
    .kpi-card.info { border-right-color: var(--nb-info); }
    .kpi-card.warning { border-right-color: var(--nb-warning); }
    .kpi-label { font-size: 11px; font-weight: 600; color: var(--nb-text-muted); letter-spacing: 0.3px; }
    .kpi-value { font-size: 22px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; letter-spacing: -0.5px; }
    .kpi-sub { font-size: 11px; color: var(--nb-text-faint); }

    /* ===== جدول التقرير ===== */
    .report-table-panel { margin-bottom: 12px; }
    .table-wrap { overflow-x: auto; }
    .report-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .report-table th {
      text-align: start; font-weight: 700; font-size: 11px; color: var(--nb-text-muted);
      background: var(--nb-surface-raised); padding: 10px 14px;
      border-bottom: 2px solid var(--nb-border-soft); letter-spacing: 0.2px; position: sticky; top: 0; z-index: 1;
    }
    .report-table th.num { text-align: end; }
    .report-table td { padding: 9px 14px; border-bottom: 1px solid var(--nb-border-row); color: var(--nb-text); }
    .report-table td.num { text-align: end; font-variant-numeric: tabular-nums; font-family: 'Cascadia Code', 'Consolas', monospace; }
    .report-table td.bold { font-weight: 700; }
    .report-table tbody tr:hover td { background: var(--nb-surface-raised); }
    .report-table .total-row td {
      background: color-mix(in srgb, var(--nb-primary-600) 8%, var(--nb-surface)) !important;
      font-weight: 800; font-size: 13.5px; border-top: 2px solid var(--nb-primary-200);
      border-bottom: 2px double var(--nb-primary-300);
    }
    .report-table .sub-total td {
      background: var(--nb-surface-raised) !important; font-weight: 700; font-size: 13px;
      border-top: 1px solid var(--nb-border);
    }
    .empty-row { text-align: center; padding: 40px; }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .empty-icon { font-size: 36px; opacity: 0.5; }
    .empty-text { font-size: 13px; color: var(--nb-text-muted); max-width: 400px; }

    /* ===== تذييل ===== */
    .report-footer {
      display: flex; gap: 24px; flex-wrap: wrap; padding: 10px 0; font-size: 12px; color: var(--nb-text-muted);
    }
    .report-footer strong { color: var(--nb-text); }
  `],
})
export class FinanceReportsComponent implements OnInit {
  private service = inject(FinanceService);
  private router = inject(Router);

  /* ───── حالة الفلاتر ───── */
  dateFrom = signal('');
  dateTo = signal('');
  accountFilter = '';
  currentTab = signal<ReportType>('revenue');

  /* ───── حالة البيانات ───── */
  loading = signal(false);
  accounts = signal<any[]>([]);
  rawData = signal<any[]>([]);
  dashStats = signal<any>({});
  generatedAt = signal(new Date().toLocaleString('ar-SD', { dateStyle: 'full', timeStyle: 'short' }));

  /* ───── التبويبات ───── */
  readonly tabs: ReportTab[] = [
    { key: 'revenue', label: 'الإيرادات حسب التاريخ', icon: '💰', desc: 'تحليل الإيرادات المحصّلة مصنّفة بالتاريخ والمصدر' },
    { key: 'trial-balance', label: 'ميزان المراجعة', icon: '⚖️', desc: 'أرصدة الحسابات المدينة والدائنة وصافي الفرق' },
    { key: 'income-statement', label: 'قائمة الدخل', icon: '📈', desc: 'الإيرادات مقابل المصروفات وصافي الربح أو الخسارة' },
    { key: 'cost-center', label: 'مراكز التكلفة', icon: '🎯', desc: 'تحليل الإيرادات والمصروفات حسب الفروع والأقسام' },
    { key: 'balance-sheet', label: 'المركز المالي', icon: '🏛️', desc: 'الميزانية العمومية: الأصول والخصوم وحقوق الملكية' },
  ];

  /* ───── الأعمدة الديناميكية حسب نوع التقرير ───── */
  activeTab = computed(() => this.tabs.find(t => t.key === this.currentTab()) || this.tabs[0]);

  activeColumns = computed<ExportColumn[]>(() => {
    switch (this.currentTab()) {
      case 'revenue':
        return [
          { key: 'date', label: 'التاريخ', width: 15 },
          { key: 'entry_number', label: 'رقم القيد', width: 14 },
          { key: 'account_name', label: 'الحساب المحاسبي', width: 28 },
          { key: 'description', label: 'البيان', width: 30 },
          { key: 'credit', label: 'المبلغ (ج.س)', align: 'end', width: 18, map: (r: any) => r._isTotal || r._isSubTotal ? this.fmt(r.credit) : this.fmt(r.credit) },
        ];
      case 'trial-balance':
        return [
          { key: 'account_code', label: 'رقم الحساب', width: 14 },
          { key: 'account_name', label: 'اسم الحساب', width: 30 },
          { key: 'debit', label: 'مدين (ج.س)', align: 'end', width: 18, map: (r: any) => this.fmt(r.debit) },
          { key: 'credit', label: 'دائن (ج.س)', align: 'end', width: 18, map: (r: any) => this.fmt(r.credit) },
          { key: 'balance', label: 'الرصيد (ج.س)', align: 'end', width: 18, map: (r: any) => this.fmt(r.balance) },
        ];
      case 'income-statement':
        return [
          { key: 'category', label: 'التصنيف', width: 14 },
          { key: 'account_name', label: 'البند', width: 30 },
          { key: 'amount', label: 'المبلغ (ج.س)', align: 'end', width: 22, map: (r: any) => this.fmt(r.amount) },
        ];
      case 'cost-center':
        return [
          { key: 'cost_center', label: 'مركز التكلفة', width: 22 },
          { key: 'account_name', label: 'الحساب', width: 26 },
          { key: 'debit', label: 'مدين (ج.س)', align: 'end', width: 18, map: (r: any) => this.fmt(r.debit) },
          { key: 'credit', label: 'دائن (ج.س)', align: 'end', width: 18, map: (r: any) => this.fmt(r.credit) },
          { key: 'net', label: 'الصافي (ج.س)', align: 'end', width: 18, map: (r: any) => this.fmt(r.net) },
        ];
      case 'balance-sheet':
        return [
          { key: 'section', label: 'القسم', width: 14 },
          { key: 'account_name', label: 'البند', width: 30 },
          { key: 'balance', label: 'الرصيد (ج.س)', align: 'end', width: 22, map: (r: any) => this.fmt(r.balance) },
        ];
      default:
        return [];
    }
  });

  /* ───── صفوف الجدول ───── */
  tableRows = computed(() => {
    const data = this.rawData();
    if (!data.length) return [];
    switch (this.currentTab()) {
      case 'revenue': return this.buildRevenueRows(data);
      case 'trial-balance': return this.buildTrialBalanceRows(data);
      case 'income-statement': return this.buildIncomeStatementRows(data);
      case 'cost-center': return this.buildCostCenterRows(data);
      case 'balance-sheet': return this.buildBalanceSheetRows(data);
      default: return data;
    }
  });

  /* ───── مؤشرات الأداء ───── */
  kpis = computed<KPI[]>(() => {
    const rows = this.tableRows();
    const stats = this.dashStats();
    switch (this.currentTab()) {
      case 'revenue': {
        const dataRows = rows.filter((r: any) => !r._isTotal && !r._isSubTotal);
        const total = dataRows.reduce((s: number, r: any) => s + (Number(r.credit) || 0), 0);
        const avg = dataRows.length ? total / dataRows.length : 0;
        const maxRow = dataRows.reduce((m: any, r: any) => (Number(r.credit) || 0) > (Number(m?.credit) || 0) ? r : m, dataRows[0]);
        return [
          { label: 'إجمالي الإيرادات', value: this.fmt(total) + ' ج.س', kind: 'success' as const },
          { label: 'متوسط المبلغ لكل حركة', value: this.fmt(avg) + ' ج.س', kind: 'info' as const },
          { label: 'عدد الحركات', value: String(dataRows.length), sub: 'حركة مالية', kind: 'default' as const },
          { label: 'أعلى إيراد', value: maxRow ? this.fmt(maxRow.credit) + ' ج.س' : '—', sub: maxRow?.date || '', kind: 'warning' as const },
        ];
      }
      case 'trial-balance': {
        const totalDebit = rows.filter((r: any) => !r._isTotal).reduce((s: number, r: any) => s + (Number(r.debit) || 0), 0);
        const totalCredit = rows.filter((r: any) => !r._isTotal).reduce((s: number, r: any) => s + (Number(r.credit) || 0), 0);
        const diff = Math.abs(totalDebit - totalCredit);
        return [
          { label: 'إجمالي المدين', value: this.fmt(totalDebit) + ' ج.س', kind: 'info' as const },
          { label: 'إجمالي الدائن', value: this.fmt(totalCredit) + ' ج.س', kind: 'info' as const },
          { label: 'الفرق', value: this.fmt(diff) + ' ج.س', kind: diff < 0.01 ? 'success' as const : 'danger' as const, sub: diff < 0.01 ? 'متوازن ⚖️' : 'غير متوازن ⚠️' },
          { label: 'عدد الحسابات', value: String(rows.filter((r: any) => !r._isTotal).length), kind: 'default' as const },
        ];
      }
      case 'income-statement': {
        const rev = rows.filter((r: any) => r.category === 'إيرادات' && !r._isTotal && !r._isSubTotal).reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
        const exp = rows.filter((r: any) => r.category === 'مصروفات' && !r._isTotal && !r._isSubTotal).reduce((s: number, r: any) => s + Math.abs(Number(r.amount) || 0), 0);
        const net = rev - exp;
        return [
          { label: 'إجمالي الإيرادات', value: this.fmt(rev) + ' ج.س', kind: 'success' as const },
          { label: 'إجمالي المصروفات', value: this.fmt(exp) + ' ج.س', kind: 'danger' as const },
          { label: net >= 0 ? 'صافي الربح' : 'صافي الخسارة', value: this.fmt(Math.abs(net)) + ' ج.س', kind: net >= 0 ? 'success' as const : 'danger' as const, sub: net >= 0 ? '📈 ربح' : '📉 خسارة' },
          { label: 'هامش الربح', value: rev > 0 ? ((net / rev) * 100).toFixed(1) + '%' : '—', kind: 'info' as const },
        ];
      }
      case 'cost-center': {
        const dataRows = rows.filter((r: any) => !r._isTotal && !r._isSubTotal);
        const centers = new Set(dataRows.map((r: any) => r.cost_center));
        const totalNet = dataRows.reduce((s: number, r: any) => s + (Number(r.net) || 0), 0);
        return [
          { label: 'عدد مراكز التكلفة', value: String(centers.size), kind: 'info' as const },
          { label: 'صافي الحركات', value: this.fmt(totalNet) + ' ج.س', kind: totalNet >= 0 ? 'success' as const : 'danger' as const },
          { label: 'عدد السجلات', value: String(dataRows.length), kind: 'default' as const },
        ];
      }
      case 'balance-sheet': {
        const assets = Number(stats.total_assets) || 0;
        const liab = Number(stats.total_liabilities) || 0;
        const equity = assets - liab;
        return [
          { label: 'إجمالي الأصول', value: this.fmt(assets) + ' ج.س', kind: 'info' as const },
          { label: 'إجمالي الخصوم', value: this.fmt(liab) + ' ج.س', kind: 'warning' as const },
          { label: 'حقوق الملكية', value: this.fmt(equity) + ' ج.س', kind: 'success' as const },
          { label: 'التوازن', value: Math.abs(assets - liab - equity) < 0.01 ? 'متوازن ⚖️' : 'فرق ⚠️', kind: Math.abs(assets - liab - equity) < 0.01 ? 'success' as const : 'danger' as const },
        ];
      }
      default: return [];
    }
  });

  filterSummary = computed(() => {
    const parts: string[] = [];
    if (this.dateFrom()) parts.push(`من: ${this.dateFrom()}`);
    if (this.dateTo()) parts.push(`إلى: ${this.dateTo()}`);
    if (this.accountFilter) parts.push(`حساب محدد`);
    return parts.length ? parts.join(' | ') : 'جميع الفترات';
  });

  /* ───── دالة الطباعة المخصصة ───── */
  onPrint = () => {
    printFinancialReport(
      this.activeTab().label,
      this.activeColumns(),
      this.tableRows(),
      this.filterSummary(),
      this.kpis(),
    );
  };

  ngOnInit(): void {
    // تحميل بيانات شجرة الحسابات للفلاتر
    this.service.getCOA().subscribe({
      next: (r) => {
        if (r?.success) this.accounts.set(r.data || []);
      },
    });
    // تحميل إحصائيات لوحة التحكم للمركز المالي
    this.service.getDashboardData().subscribe({
      next: (r) => {
        if (r?.success) this.dashStats.set(r.data || {});
      },
    });
    // تعيين الفترة الافتراضية (أول الشهر الحالي إلى اليوم)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    this.dateFrom.set(firstDay.toISOString().slice(0, 10));
    this.dateTo.set(now.toISOString().slice(0, 10));
    // توليد التقرير الافتراضي
    this.generateReport();
  }

  switchTab(tab: ReportType): void {
    this.currentTab.set(tab);
    this.generateReport();
  }

  resetFilters(): void {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    this.dateFrom.set(firstDay.toISOString().slice(0, 10));
    this.dateTo.set(now.toISOString().slice(0, 10));
    this.accountFilter = '';
    this.generateReport();
  }

  generateReport(): void {
    this.loading.set(true);
    this.generatedAt.set(new Date().toLocaleString('ar-SD', { dateStyle: 'full', timeStyle: 'short' }));
    const params: Record<string, any> = {};
    if (this.dateFrom()) params['date_from'] = this.dateFrom();
    if (this.dateTo()) params['date_to'] = this.dateTo();
    if (this.accountFilter) params['account'] = this.accountFilter;
    params['page_size'] = 500;

    const tab = this.currentTab();
    let obs;
    switch (tab) {
      case 'revenue':
        obs = this.service.getRevenueReport(params);
        break;
      case 'income-statement':
        // جلب الإيرادات والمصروفات معًا
        obs = this.service.getTrialBalance(params);
        break;
      case 'trial-balance':
      case 'cost-center':
      case 'balance-sheet':
      default:
        obs = this.service.getTrialBalance(params);
        break;
    }

    obs.subscribe({
      next: (r) => {
        if (r?.success) {
          this.rawData.set(r.data || []);
        } else {
          this.rawData.set([]);
        }
        this.loading.set(false);
      },
      error: () => {
        this.rawData.set([]);
        this.loading.set(false);
      },
    });
  }

  /* ═══════════════ بناة الصفوف حسب نوع التقرير ═══════════════ */

  private buildRevenueRows(data: any[]): any[] {
    const rows: any[] = data.map((entry: any) => ({
      date: entry.date || entry.journal_entry?.date || '—',
      entry_number: entry.entry_number || entry.journal_entry?.entry_number || '—',
      account_name: entry.account?.name || entry.account_name || '—',
      description: entry.description || entry.journal_entry?.description || '—',
      credit: Number(entry.credit) || 0,
    }));

    if (rows.length) {
      const total = rows.reduce((s: number, r: any) => s + r.credit, 0);
      rows.push({
        _isTotal: true,
        date: '', entry_number: '', account_name: '',
        description: 'الإجمالي الكلي',
        credit: total,
      });
    }
    return rows;
  }

  private buildTrialBalanceRows(data: any[]): any[] {
    // تجميع حسب الحساب
    const map = new Map<string, { account_code: string; account_name: string; debit: number; credit: number }>();
    for (const entry of data) {
      const code = entry.account?.code || entry.account_code || '—';
      const name = entry.account?.name || entry.account_name || '—';
      const key = code;
      const existing = map.get(key) || { account_code: code, account_name: name, debit: 0, credit: 0 };
      existing.debit += Number(entry.debit) || 0;
      existing.credit += Number(entry.credit) || 0;
      map.set(key, existing);
    }
    const rows: any[] = Array.from(map.values()).map(r => ({
      ...r,
      balance: r.debit - r.credit,
    }));
    // صف الإجمالي
    if (rows.length) {
      const totalDebit = rows.reduce((s: number, r: any) => s + r.debit, 0);
      const totalCredit = rows.reduce((s: number, r: any) => s + r.credit, 0);
      rows.push({
        _isTotal: true,
        account_code: '', account_name: 'المجموع الكلي',
        debit: totalDebit, credit: totalCredit, balance: totalDebit - totalCredit,
      });
    }
    return rows;
  }

  private buildIncomeStatementRows(data: any[]): any[] {
    // تصنيف إلى إيرادات ومصروفات حسب نوع الحساب
    const revenueRows: any[] = [];
    const expenseRows: any[] = [];
    for (const entry of data) {
      const typeCode = entry.account?.account_type?.code || entry.account_type_code || '';
      const amount = (Number(entry.credit) || 0) - (Number(entry.debit) || 0);
      const row = {
        account_name: entry.account?.name || entry.account_name || '—',
        amount: Math.abs(amount),
      };
      if (typeCode === 'revenue' || typeCode === 'income' || amount > 0) {
        revenueRows.push({ ...row, category: 'إيرادات' });
      } else {
        expenseRows.push({ ...row, category: 'مصروفات', amount: Math.abs(amount) });
      }
    }
    const totalRevenue = revenueRows.reduce((s, r) => s + r.amount, 0);
    const totalExpenses = expenseRows.reduce((s, r) => s + r.amount, 0);
    const rows: any[] = [
      ...revenueRows,
      { _isSubTotal: true, category: '', account_name: 'إجمالي الإيرادات', amount: totalRevenue },
      ...expenseRows,
      { _isSubTotal: true, category: '', account_name: 'إجمالي المصروفات', amount: totalExpenses },
      { _isTotal: true, category: '', account_name: totalRevenue - totalExpenses >= 0 ? 'صافي الربح' : 'صافي الخسارة', amount: Math.abs(totalRevenue - totalExpenses) },
    ];
    return rows;
  }

  private buildCostCenterRows(data: any[]): any[] {
    const rows: any[] = data.map((entry: any) => ({
      cost_center: entry.cost_center?.name || entry.cost_center_name || 'عام',
      account_name: entry.account?.name || entry.account_name || '—',
      debit: Number(entry.debit) || 0,
      credit: Number(entry.credit) || 0,
      net: (Number(entry.debit) || 0) - (Number(entry.credit) || 0),
    }));
    if (rows.length) {
      rows.push({
        _isTotal: true,
        cost_center: '', account_name: 'المجموع الكلي',
        debit: rows.reduce((s: number, r: any) => s + r.debit, 0),
        credit: rows.reduce((s: number, r: any) => s + r.credit, 0),
        net: rows.reduce((s: number, r: any) => s + r.net, 0),
      });
    }
    return rows;
  }

  private buildBalanceSheetRows(data: any[]): any[] {
    const stats = this.dashStats();
    // بناء الميزانية العمومية من الإحصائيات
    const rows: any[] = [
      { section: 'الأصول', account_name: 'الأصول المتداولة — النقد', balance: Number(stats.cash_balance) || 0 },
      { section: 'الأصول', account_name: 'الأصول المتداولة — البنوك', balance: Number(stats.bank_balance) || 0 },
      { section: 'الأصول', account_name: 'أصول أخرى', balance: (Number(stats.total_assets) || 0) - (Number(stats.cash_balance) || 0) - (Number(stats.bank_balance) || 0) },
      { _isSubTotal: true, section: '', account_name: 'إجمالي الأصول', balance: Number(stats.total_assets) || 0 },
      { section: 'الخصوم', account_name: 'الخصوم المتداولة', balance: Number(stats.total_liabilities) || 0 },
      { _isSubTotal: true, section: '', account_name: 'إجمالي الخصوم', balance: Number(stats.total_liabilities) || 0 },
      { section: 'حقوق الملكية', account_name: 'رأس المال وحقوق الملكية', balance: (Number(stats.total_assets) || 0) - (Number(stats.total_liabilities) || 0) },
      { _isSubTotal: true, section: '', account_name: 'إجمالي حقوق الملكية', balance: (Number(stats.total_assets) || 0) - (Number(stats.total_liabilities) || 0) },
      { _isTotal: true, section: '', account_name: 'إجمالي الخصوم وحقوق الملكية', balance: Number(stats.total_assets) || 0 },
    ];
    return rows;
  }

  /* ═══════════════ أدوات مساعدة ═══════════════ */
  fmt(v: any): string {
    return (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
