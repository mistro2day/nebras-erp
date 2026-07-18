import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FinanceService } from './finance.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbLoadingComponent } from '../../shared/nebras/nb-loading.component';

interface FinanceModule {
  key: string; title: string; desc: string; icon: string; route: string;
}

/**
 * مساحة العمل المالية (Finance Workspace)
 * العنصر المميّز: «ميزان المعادلة المحاسبية» (الأصول = الخصوم + حقوق الملكية) —
 * الأثر الأصيل في عالم المحاسبة، يُظهر توازن المركز المالي بصريًا.
 * البقية هادئة ومنضبطة على غرار Workspace في D365 Finance ولوحة Odoo Accounting.
 */
@Component({
  selector: 'app-finance-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NbPageHeaderComponent, NbPanelComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="المنصة المالية ودفتر الأستاذ العام"
        subtitle="مساحة عمل محاسبية موحّدة للقيد المزدوج، شجرة الحسابات، الموازنات، والرقابة المالية.">
        <span class="fiscal-chip"><span class="dot"></span>حالة النظام: <strong>{{ stats().fiscal_status || 'مستقر ونشط' }}</strong></span>
      </nb-page-header>

      <!-- العنصر المميّز: ميزان المعادلة المحاسبية -->
      <section class="beam-card">
        <div class="beam-head">
          <div>
            <h2 class="beam-title">ميزان المركز المالي</h2>
            <p class="beam-sub">المعادلة المحاسبية الأساسية — الأصول تساوي الخصوم مضافًا إليها حقوق الملكية</p>
          </div>
          <span class="beam-verdict" [class.ok]="isBalanced()" [class.off]="!isBalanced()">
            {{ isBalanced() ? '⚖︎ متوازن' : '⚠︎ فرق: ' + fmt(imbalance()) }}
          </span>
        </div>

        <div class="equation">
          <div class="term assets">
            <span class="term-label">الأصول</span>
            <span class="term-value">{{ fmt(stats().total_assets) }}</span>
            <span class="term-unit">ر.س</span>
          </div>
          <span class="op">=</span>
          <div class="term liab">
            <span class="term-label">الخصوم</span>
            <span class="term-value">{{ fmt(stats().total_liabilities) }}</span>
            <span class="term-unit">ر.س</span>
          </div>
          <span class="op">+</span>
          <div class="term equity">
            <span class="term-label">حقوق الملكية</span>
            <span class="term-value">{{ fmt(equity()) }}</span>
            <span class="term-unit">ر.س</span>
          </div>
        </div>

        <!-- الشريط النسبي: توزيع تمويل الأصول بين الخصوم وحقوق الملكية -->
        <div class="beam-bar">
          <span class="seg-liab" [style.width.%]="liabShare()">
            @if (liabShare() > 12) { <span class="seg-txt">خصوم {{ liabShare() | number:'1.0-0' }}%</span> }
          </span>
          <span class="seg-equity" [style.width.%]="100 - liabShare()">
            @if (100 - liabShare() > 12) { <span class="seg-txt">ملكية {{ (100 - liabShare()) | number:'1.0-0' }}%</span> }
          </span>
        </div>
      </section>

      <!-- صف النتائج: الإيرادات والمصروفات وصافي الفترة -->
      <div class="result-row">
        <div class="rk">
          <span class="rk-label">الإيرادات</span>
          <span class="rk-value pos">{{ fmt(stats().revenue) }}</span>
          <span class="rk-unit">ر.س</span>
        </div>
        <span class="minus">−</span>
        <div class="rk">
          <span class="rk-label">المصروفات</span>
          <span class="rk-value neg">{{ fmt(stats().expenses) }}</span>
          <span class="rk-unit">ر.س</span>
        </div>
        <span class="eq">=</span>
        <div class="rk net" [class.profit]="netResult() >= 0" [class.loss]="netResult() < 0">
          <span class="rk-label">{{ netResult() >= 0 ? 'صافي الربح' : 'صافي الخسارة' }}</span>
          <span class="rk-value">{{ fmt(abs(netResult())) }}</span>
          <span class="rk-unit">ر.س</span>
        </div>
      </div>

      <!-- صف الرؤى: السيولة، الموازنة، التنبيهات -->
      <div class="insight-row">
        <nb-panel title="السيولة والخزائن" subtitle="توزيع النقد بين الصناديق والحسابات البنكية.">
          <div class="liquidity">
            <div class="liq-item"><span class="lbl">الخزينة النقدية</span><span class="val">{{ fmt(stats().cash_balance) }} <em>ر.س</em></span></div>
            <div class="liq-item"><span class="lbl">الحسابات البنكية</span><span class="val">{{ fmt(stats().bank_balance) }} <em>ر.س</em></span></div>
            <div class="bar"><span class="fill" [style.width.%]="40"></span></div>
          </div>
        </nb-panel>

        <nb-panel title="استهلاك الموازنة التقديرية" subtitle="نسبة المنفَق من إجمالي المرصود المعتمد.">
          <div class="liquidity">
            <div class="liq-item"><span class="lbl">المنفَق</span><span class="val">{{ fmt(stats().budget_consumed) }} <em>ر.س</em></span></div>
            <div class="liq-item"><span class="lbl">المرصود</span><span class="val">{{ fmt(stats().budget_allocated) }} <em>ر.س</em></span></div>
            <div class="bar"><span class="fill" [class.warn]="(stats().budget_utilization_rate || 0) > 85" [style.width.%]="clamp(stats().budget_utilization_rate)"></span></div>
            <span class="rate">نسبة الاستهلاك: <strong>{{ fmt(stats().budget_utilization_rate) }}%</strong></span>
          </div>
        </nb-panel>

        <nb-panel title="التنبيهات المالية النشطة" subtitle="إشعارات الرقابة والالتزام بالموازنة.">
          <div class="alerts">
            @for (a of stats().alerts || []; track a.id) {
              <div class="alert" [class]="a.type"><span class="dot"></span>{{ a.message }}</div>
            }
            @if (!(stats().alerts || []).length) { <div class="alert info"><span class="dot"></span>لا توجد تنبيهات مالية حالياً.</div> }
          </div>
          <div class="counters">
            <span>قيود قيد الإدخال (مسودة): <strong>{{ stats().open_journals || 0 }}</strong></span>
            <span>بانتظار الترحيل (معتمدة): <strong>{{ stats().pending_approvals || 0 }}</strong></span>
          </div>
        </nb-panel>
      </div>

      <!-- أحدث القيود المحاسبية -->
      <nb-panel title="أحدث القيود المحاسبية" subtitle="آخر الحركات المسجلة في اليومية العامة." [flush]="true" class="recent">
        <div class="table-wrap">
          <table class="nb-table">
            <thead><tr><th>رقم القيد</th><th>التاريخ</th><th>البيان</th><th>الحالة</th></tr></thead>
            <tbody>
              @if (loadingRecent()) {
                <tr><td colspan="4"><nb-loading message="جارٍ تحميل أحدث القيود…"></nb-loading></td></tr>
              } @else {
              @for (j of recent(); track j.id) {
                <tr (click)="go('/finance/journals')">
                  <td><strong>{{ j.entry_number }}</strong></td>
                  <td class="mono">{{ j.date }}</td>
                  <td class="desc">{{ j.description }}</td>
                  <td><span class="badge" [class]="j.status">{{ statusLabel(j.status) }}</span></td>
                </tr>
              }
              @if (!recent().length) { <tr><td colspan="4" class="empty">لا توجد قيود مسجلة بعد — ابدأ بإنشاء قيد جديد.</td></tr> }
              }
            </tbody>
          </table>
        </div>
      </nb-panel>

      <!-- بطاقات التنقل -->
      <h3 class="section-title">العمليات المحاسبية</h3>
      <div class="tiles">
        @for (m of operations; track m.key) {
          <button class="tile" (click)="go(m.route)">
            <span class="tile-icon">{{ m.icon }}</span>
            <span class="tile-body"><span class="tile-title">{{ m.title }}</span><span class="tile-desc">{{ m.desc }}</span></span>
            <span class="tile-arrow">←</span>
          </button>
        }
      </div>

      <h3 class="section-title">الإعداد والمرجعيات المالية</h3>
      <div class="tiles">
        @for (m of setup; track m.key) {
          <button class="tile" (click)="go(m.route)">
            <span class="tile-icon">{{ m.icon }}</span>
            <span class="tile-body"><span class="tile-title">{{ m.title }}</span><span class="tile-desc">{{ m.desc }}</span></span>
            <span class="tile-arrow">←</span>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .fiscal-chip { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: var(--nb-text-secondary);
      background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 7px 12px; }
    .fiscal-chip .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--nb-success); }

    /* ===== العنصر المميّز: ميزان المعادلة المحاسبية ===== */
    .beam-card {
      background:
        radial-gradient(120% 140% at 100% 0%, color-mix(in srgb, var(--nb-primary-600) 9%, transparent), transparent 55%),
        var(--nb-surface);
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      padding: 20px 22px; margin-bottom: 14px;
    }
    .beam-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 18px; }
    .beam-title { margin: 0; font-size: 16px; font-weight: 800; color: var(--nb-text); letter-spacing: -0.2px; }
    .beam-sub { margin: 3px 0 0; font-size: 12px; color: var(--nb-text-muted); }
    .beam-verdict { font-size: 12px; font-weight: 700; padding: 6px 12px; border-radius: var(--nb-radius-pill); white-space: nowrap; }
    .beam-verdict.ok { background: var(--nb-success-bg); color: var(--nb-success); }
    .beam-verdict.off { background: var(--nb-warning-bg); color: var(--nb-warning); }

    .equation { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; align-items: stretch; gap: 12px; }
    .term { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
      padding: 16px 10px; border-radius: var(--nb-radius); border: 1px solid var(--nb-border-soft); background: var(--nb-surface-raised);
      border-top: 3px solid var(--nb-text-faint); }
    .term.assets { border-top-color: var(--nb-info); }
    .term.liab { border-top-color: var(--nb-warning); }
    .term.equity { border-top-color: var(--nb-success); }
    .term-label { font-size: 12px; color: var(--nb-text-muted); }
    .term-value { font-size: 24px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; letter-spacing: -0.5px; }
    .term-unit { font-size: 11px; color: var(--nb-text-faint); }
    .op { align-self: center; font-size: 26px; font-weight: 300; color: var(--nb-text-muted); }

    .beam-bar { display: flex; height: 12px; border-radius: var(--nb-radius-pill); overflow: hidden; margin-top: 16px; border: 1px solid var(--nb-border-soft); }
    .beam-bar span { display: flex; align-items: center; justify-content: center; min-width: 0; transition: width .5s ease; }
    .seg-liab { background: color-mix(in srgb, var(--nb-warning) 82%, white); }
    .seg-equity { background: color-mix(in srgb, var(--nb-success) 82%, white); }
    .seg-txt { font-size: 9.5px; font-weight: 800; color: #fff; white-space: nowrap; }

    /* ===== صف النتائج ===== */
    .result-row { display: flex; align-items: stretch; gap: 10px; margin-bottom: 14px; }
    .rk { flex: 1; display: flex; flex-direction: column; gap: 2px; padding: 12px 16px;
      background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); }
    .rk-label { font-size: 12px; color: var(--nb-text-muted); }
    .rk-value { font-size: 20px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .rk-value.pos { color: var(--nb-success); } .rk-value.neg { color: var(--nb-danger); }
    .rk-unit { font-size: 11px; color: var(--nb-text-faint); }
    .rk.net.profit { border-color: var(--nb-success); background: var(--nb-success-bg); }
    .rk.net.loss { border-color: var(--nb-danger); background: var(--nb-danger-bg); }
    .rk.net.profit .rk-value { color: var(--nb-success); } .rk.net.loss .rk-value { color: var(--nb-danger); }
    .minus, .eq { align-self: center; font-size: 20px; font-weight: 300; color: var(--nb-text-muted); }
    @media (max-width: 720px) { .result-row { flex-wrap: wrap; } .minus, .eq { display: none; } .rk { flex: 1 1 40%; } }

    /* ===== صف الرؤى ===== */
    .insight-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 14px; }
    @media (max-width: 1000px) { .insight-row { grid-template-columns: 1fr; } .equation { grid-template-columns: 1fr; } .op { display: none; } }
    .liquidity { display: flex; flex-direction: column; gap: 8px; }
    .liq-item { display: flex; justify-content: space-between; font-size: 13px; }
    .liq-item .lbl { color: var(--nb-text-muted); }
    .liq-item .val { font-weight: 700; color: var(--nb-text); }
    .liq-item .val em { font-size: 11px; font-weight: 500; color: var(--nb-text-muted); font-style: normal; }
    .bar { height: 8px; border-radius: 6px; background: var(--nb-border-soft); overflow: hidden; margin-top: 4px; }
    .fill { display: block; height: 100%; background: var(--nb-primary-600); border-radius: 6px; }
    .fill.warn { background: var(--nb-danger); }
    .rate { font-size: 12px; color: var(--nb-text-muted); }
    .alerts { display: flex; flex-direction: column; gap: 8px; }
    .alert { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--nb-text-secondary); }
    .alert .dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
    .alert.warning .dot { background: var(--nb-warning); }
    .alert.info .dot { background: var(--nb-info); }
    .counters { display: flex; flex-direction: column; gap: 4px; margin-top: 12px; padding-top: 10px;
      border-top: 1px solid var(--nb-border-soft); font-size: 12px; color: var(--nb-text-muted); }
    .counters strong { color: var(--nb-text); }

    /* ===== أحدث القيود ===== */
    .recent { margin-bottom: 20px; }
    .table-wrap { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .nb-table th { text-align: start; font-weight: 700; font-size: 11px; color: var(--nb-text-muted);
      background: var(--nb-surface-raised); padding: 9px 14px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table td { padding: 9px 14px; border-bottom: 1px solid var(--nb-border-row); color: var(--nb-text); }
    .nb-table tbody tr { cursor: pointer; }
    .nb-table tbody tr:hover td { background: var(--nb-surface-raised); }
    .nb-table tr:last-child td { border-bottom: none; }
    .mono { font-variant-numeric: tabular-nums; }
    .desc { color: var(--nb-text-secondary); }
    .empty { text-align: center; padding: 22px; color: var(--nb-text-muted); }
    .badge { display: inline-flex; padding: 2px 8px; font-size: 11px; font-weight: 700; border-radius: var(--nb-radius-sm); }
    .badge.draft { background: var(--nb-border-soft); color: var(--nb-text-secondary); }
    .badge.approved { background: var(--nb-info-bg); color: var(--nb-info); }
    .badge.posted { background: var(--nb-success-bg); color: var(--nb-success); }
    .badge.reversed, .badge.cancelled { background: var(--nb-danger-bg); color: var(--nb-danger); }

    /* ===== بطاقات التنقل ===== */
    .section-title { font-size: 14px; font-weight: 700; color: var(--nb-text); margin: 4px 0 12px; }
    .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    @media (max-width: 720px) { .tiles { grid-template-columns: 1fr; } }
    .tile { display: flex; align-items: center; gap: 14px; text-align: start; cursor: pointer;
      background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      padding: 16px; transition: all 0.15s ease; font-family: inherit; }
    .tile:hover { border-color: var(--nb-primary-400); background: var(--nb-surface-raised); transform: translateY(-1px); }
    .tile:hover .tile-arrow { opacity: 1; transform: translateX(-3px); }
    .tile-icon { font-size: 22px; width: 44px; height: 44px; display: grid; place-items: center; flex: none;
      background: var(--nb-primary-50); border-radius: var(--nb-radius); }
    .tile-body { display: flex; flex-direction: column; gap: 3px; flex: 1; }
    .tile-title { font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .tile-desc { font-size: 12px; color: var(--nb-text-muted); }
    .tile-arrow { color: var(--nb-primary-600); font-size: 18px; opacity: 0; transition: all 0.15s ease; }
  `],
})
export class FinanceDashboardComponent implements OnInit {
  private service = inject(FinanceService);
  private router = inject(Router);

  stats = signal<any>({ alerts: [] });
  recent = signal<any[]>([]);
  loadingRecent = signal(true);

  equity = computed(() => (Number(this.stats().total_assets) || 0) - (Number(this.stats().total_liabilities) || 0));
  netResult = computed(() => (Number(this.stats().revenue) || 0) - (Number(this.stats().expenses) || 0));
  imbalance = computed(() => Math.abs((Number(this.stats().total_assets) || 0) - (Number(this.stats().total_liabilities) || 0) - this.equity()));
  isBalanced = computed(() => this.imbalance() < 0.01);
  liabShare = computed(() => {
    const l = Number(this.stats().total_liabilities) || 0;
    const e = this.equity();
    const total = l + e;
    return total > 0 ? this.clamp((l / total) * 100) : 50;
  });

  readonly operations: FinanceModule[] = [
    { key: 'coa', title: 'شجرة الحسابات', desc: 'دليل الحسابات والتصنيفات المحاسبية.', icon: '🗂️', route: '/finance/coa' },
    { key: 'journals', title: 'قيود اليومية', desc: 'إنشاء واعتماد وترحيل القيود المزدوجة.', icon: '📝', route: '/finance/journals' },
    { key: 'ledger', title: 'دفتر الأستاذ العام', desc: 'استعراض حركات وأرصدة الحسابات.', icon: '📚', route: '/finance/ledger' },
    { key: 'vouchers', title: 'سندات الصرف والقبض', desc: 'السندات المالية وترحيلها للدفاتر.', icon: '🧾', route: '/finance/vouchers' },
    { key: 'budgets', title: 'الموازنات التقديرية', desc: 'رصد واعتماد الموازنات ومتابعة الاستهلاك.', icon: '📊', route: '/finance/budgets' },
    { key: 'fiscal', title: 'الفترات والإغلاق', desc: 'السنوات المالية وإغلاق الفترات.', icon: '🔒', route: '/finance/fiscal' },
  ];
  readonly setup: FinanceModule[] = [
    { key: 'banking', title: 'البنوك والصناديق', desc: 'الحسابات البنكية والخزائن النقدية.', icon: '🏦', route: '/finance/banking' },
    { key: 'cost-centers', title: 'مراكز التكلفة', desc: 'هيكل مراكز التكلفة والفروع.', icon: '🎯', route: '/finance/cost-centers' },
    { key: 'taxes', title: 'الضرائب', desc: 'ضريبة القيمة المضافة والاستقطاع.', icon: '％', route: '/finance/taxes' },
    { key: 'currencies', title: 'العملات وأسعار الصرف', desc: 'العملات المعتمدة وأسعار التحويل.', icon: '💱', route: '/finance/currencies' },
    { key: 'setup', title: 'الإعداد والمرجعيات', desc: 'أنواع الحسابات والتصنيفات وطرق الدفع.', icon: '⚙️', route: '/finance/setup' },
  ];

  ngOnInit() {
    this.service.getDashboardData().subscribe({ next: (r) => { if (r?.success) this.stats.set(r.data); }, error: () => {} });
    this.loadingRecent.set(true);
    this.service.getJournals().subscribe({
      next: (r) => { if (r?.success) this.recent.set((r.data || []).slice(0, 6)); this.loadingRecent.set(false); },
      error: () => this.loadingRecent.set(false),
    });
  }

  go(route: string) { this.router.navigateByUrl(route); }
  fmt(v: any): string { return (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  abs(v: number): number { return Math.abs(v); }
  clamp(v: any): number { const n = Number(v) || 0; return Math.max(0, Math.min(100, n)); }
  statusLabel(s: string) { return ({ draft: 'مسودة', approved: 'معتمد', posted: 'مرحّل', cancelled: 'ملغي', reversed: 'معكوس' } as any)[s] || s; }
}
