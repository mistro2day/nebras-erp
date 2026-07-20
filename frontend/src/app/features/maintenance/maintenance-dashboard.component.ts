import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { MaintenanceService } from './maintenance.service';
import { AssetsService } from '../assets/assets.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../shared/nebras/nb-loading.component';

interface Burden {
  id: string;
  name: string;
  number: string;
  faults: number;
  cost: number;
  bookValue: number;
  /** نسبة تكلفة الصيانة من القيمة الدفترية — عرض الشريط. */
  ratio: number;
  verdict: 'replace' | 'watch' | 'ok';
}

interface Stage {
  key: string;
  label: string;
  count: number;
  hint: string;
  route: string;
}

/**
 * مساحة عمل الصيانة.
 *
 * التوقيع البصري: «عبء الصيانة على الأصول» — سؤال مدير الصيانة ليس
 * «كم أمر عمل لديّ» بل «أي أصل يستنزفني». لذلك يُقاس ما أُنفق على كل
 * أصل مقابل قيمته الدفترية: حين تقترب تكلفة إصلاحه من قيمته يصير
 * الاستبدال أوفر. هذا ما يصل الصيانة بالأصول وبالمالية في رقم واحد.
 */
@Component({
  selector: 'app-maintenance-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DecimalPipe, NbPageHeaderComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="الصيانة وأوامر العمل"
        subtitle="بلاغات الأعطال، تنفيذ الصيانة على الأصول، وما تكلّفه فعلاً.">
        <button class="btn ghost" (click)="load()">تحديث</button>
        <button class="btn primary" (click)="go('/maintenance/requests')">البلاغات</button>
      </nb-page-header>

      <!-- ما يحتاج تصرّفاً الآن -->
      @if (!loading() && urgentOpen() > 0) {
        <button class="alert" (click)="go('/maintenance/requests')">
          <span class="a-ic">⚠︎</span>
          <span class="a-body">
            <strong>{{ urgentOpen() }}</strong> بلاغ عاجل مفتوح لم يُنجز بعد.
            <span class="a-hint">العاجل يوقف الخدمة — عالجه قبل ما هو أقدم.</span>
          </span>
          <span class="a-go">فتح البلاغات ‹</span>
        </button>
      }

      <!-- مسار العمل: كل محطة قابلة للفتح -->
      <section class="flow">
        @for (s of stages(); track s.key; let last = $last) {
          <button class="stage" (click)="go(s.route)">
            <span class="s-count">{{ s.count }}</span>
            <span class="s-label">{{ s.label }}</span>
            <span class="s-hint">{{ s.hint }}</span>
          </button>
          @if (!last) { <span class="s-arrow">←</span> }
        }
      </section>

      <!-- التوقيع: عبء الصيانة على الأصول -->
      <section class="panel">
        <div class="p-head">
          <div>
            <h3>عبء الصيانة على الأصول</h3>
            <p>ما أُنفق على كل أصل مقابل قيمته الدفترية. تجاوز الثلث إشارة لمراجعة قرار الاستبدال.</p>
          </div>
          <div class="legend">
            <span><i class="sw ok"></i>ضمن المعقول</span>
            <span><i class="sw watch"></i>يستحق المتابعة</span>
            <span><i class="sw rep"></i>الاستبدال أوفر</span>
          </div>
        </div>

        @if (loading()) {
          <nb-loading message="جارٍ حساب عبء الصيانة…"></nb-loading>
        } @else if (!burdens().length) {
          <div class="empty">
            <p>لم تُسجَّل تكاليف صيانة على أي أصل بعد.</p>
            <p class="hint">يظهر العبء هنا بعد إقفال أوامر العمل وترحيل تكاليفها.</p>
          </div>
        } @else {
          <div class="burdens">
            @for (b of burdens(); track b.id) {
              <button class="row" [class]="b.verdict" (click)="openAsset(b.id)">
                <span class="r-name">
                  <strong>{{ b.name }}</strong>
                  <span class="r-meta">{{ b.number }} · {{ b.faults }} عطل</span>
                </span>
                <span class="r-track">
                  <span class="r-fill" [style.width.%]="clamp(b.ratio)"></span>
                  <span class="r-mark" title="ثلث القيمة الدفترية"></span>
                </span>
                <span class="r-cost">
                  <strong>{{ b.cost | number:'1.0-0' }}</strong>
                  <span class="r-of">من {{ b.bookValue | number:'1.0-0' }} ر.س</span>
                </span>
                <span class="r-verdict">
                  @if (b.verdict === 'replace') { <span class="tag rep">الاستبدال أوفر</span> }
                  @else if (b.verdict === 'watch') { <span class="tag watch">{{ b.ratio | number:'1.0-0' }}٪</span> }
                  @else { <span class="tag ok">{{ b.ratio | number:'1.0-0' }}٪</span> }
                </span>
              </button>
            }
          </div>
        }
      </section>

      <!-- مؤشرات -->
      <section class="kpis">
        <div class="kpi">
          <span class="k-label">تكلفة الصيانة</span>
          <span class="k-val">{{ totalCost() | number:'1.0-0' }} <small>ر.س</small></span>
          <span class="k-hint">مواد وأجور على كل الأوامر</span>
        </div>
        <div class="kpi">
          <span class="k-label">متوسط تكلفة العطل</span>
          <span class="k-val">{{ avgCost() | number:'1.0-0' }} <small>ر.س</small></span>
          <span class="k-hint">إجمالي التكلفة ÷ عدد الأوامر المكلَّفة</span>
        </div>
        <div class="kpi" [class.warn]="unposted() > 0">
          <span class="k-label">بانتظار الترحيل</span>
          <span class="k-val">{{ unposted() }}</span>
          <span class="k-hint">أوامر مكتملة لم تُقفل ماليّاً</span>
        </div>
        <div class="kpi">
          <span class="k-label">أصول تحت الصيانة</span>
          <span class="k-val">{{ assetsUnderWork() }}</span>
          <span class="k-hint">لها أمر عمل غير مغلق</span>
        </div>
      </section>

      <!-- أحدث أوامر العمل -->
      <section class="panel">
        <div class="p-head">
          <div><h3>أحدث أوامر العمل</h3></div>
          <button class="link" (click)="go('/maintenance/work-orders')">عرض الكل ‹</button>
        </div>
        @if (loading()) {
          <nb-loading message="جارٍ تحميل أوامر العمل…"></nb-loading>
        } @else if (!recent().length) {
          <div class="empty"><p>لا توجد أوامر عمل بعد.</p></div>
        } @else {
          <div class="wo-list">
            @for (w of recent(); track w.id) {
              <button class="wo" (click)="go('/maintenance/work-orders')">
                <span class="w-num">{{ w.wo_number }}</span>
                <span class="w-asset">{{ assetName(w.asset) }}</span>
                <span class="w-cost">{{ costOf(w.id) ? (costOf(w.id) | number:'1.0-0') + ' ر.س' : '—' }}</span>
                <span class="w-status"><span class="badge" [class]="w.status">{{ statusText(w.status) }}</span></span>
              </button>
            }
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 22px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .btn { font-family: inherit; font-size: 13px; font-weight: 700; padding: 8px 14px;
      border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }

    .alert { display: flex; align-items: center; gap: 14px; width: 100%; text-align: start;
      font-family: inherit; cursor: pointer; background: #fef2f2; border: 1px solid #fecaca;
      border-inline-start: 4px solid #DC2626; border-radius: var(--nb-radius-card);
      padding: 13px 16px; margin-bottom: 16px; }
    .a-ic { font-size: 18px; color: #B91C1C; }
    .a-body { flex: 1; font-size: 13px; color: var(--nb-text); }
    .a-body strong { font-weight: 800; }
    .a-hint { color: var(--nb-text-muted); margin-inline-start: 6px; }
    .a-go { font-size: 12px; font-weight: 700; color: #B91C1C; }

    /* مسار العمل */
    .flow { display: flex; align-items: stretch; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
    .stage { flex: 1; min-width: 132px; text-align: start; font-family: inherit; cursor: pointer;
      background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 13px 15px;
      display: flex; flex-direction: column; gap: 2px;
      transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
    .stage:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(48,63,159,.1);
      border-color: var(--nb-primary-400); }
    .stage:focus-visible { outline: 2px solid var(--nb-primary-500); outline-offset: 2px; }
    .s-count { font-size: 25px; font-weight: 800; color: var(--nb-text); line-height: 1.1;
      font-variant-numeric: tabular-nums; }
    .s-label { font-size: 13px; font-weight: 700; color: var(--nb-text); }
    .s-hint { font-size: 11px; color: var(--nb-text-muted); }
    .s-arrow { align-self: center; color: var(--nb-primary-400); font-size: 17px; }

    .panel { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 16px 18px; margin-bottom: 18px; }
    .p-head { display: flex; align-items: flex-start; justify-content: space-between;
      gap: 16px; flex-wrap: wrap; margin-bottom: 14px; }
    .p-head h3 { margin: 0 0 2px; font-size: 15px; font-weight: 700; color: var(--nb-text); }
    .p-head p { margin: 0; font-size: 12px; color: var(--nb-text-muted); }
    .legend { display: flex; align-items: center; gap: 12px; font-size: 11px; color: var(--nb-text-muted); }
    .legend span { display: inline-flex; align-items: center; gap: 5px; }
    .sw { width: 9px; height: 9px; border-radius: 2px; display: inline-block; }
    .sw.ok { background: #16A34A; } .sw.watch { background: #F59E0B; } .sw.rep { background: #DC2626; }
    .link { border: none; background: none; font-family: inherit; font-size: 12px;
      font-weight: 700; color: var(--nb-primary-600); cursor: pointer; padding: 0; }

    /* عبء الصيانة */
    .burdens { display: flex; flex-direction: column; }
    .row { display: grid; grid-template-columns: 1.6fr 2.2fr 1.1fr 0.9fr; align-items: center; gap: 14px;
      width: 100%; text-align: start; font-family: inherit; cursor: pointer; background: none;
      border: none; border-top: 1px solid var(--nb-border-soft, #f0f1f5);
      padding: 11px 8px; border-radius: 8px; transition: background .15s ease; }
    .row:first-child { border-top: none; }
    .row:hover { background: var(--nb-surface-raised); }
    .row:focus-visible { outline: 2px solid var(--nb-primary-500); outline-offset: -2px; }
    @media (max-width: 820px) { .row { grid-template-columns: 1fr 1fr; row-gap: 8px; } }

    .r-name { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .r-name strong { font-size: 13px; font-weight: 700; color: var(--nb-text);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .r-meta { font-size: 11px; color: var(--nb-text-muted); }

    .r-track { position: relative; height: 9px; border-radius: 5px; background: #eef0f5; }
    .r-fill { position: absolute; inset-block: 0; inset-inline-start: 0; border-radius: 5px;
      background: #16A34A; transition: width .5s cubic-bezier(.4,0,.2,1); }
    .row.watch .r-fill { background: #F59E0B; }
    .row.replace .r-fill { background: #DC2626; }
    /* علامة الثلث — الحد الذي يستدعي مراجعة قرار الاستبدال */
    .r-mark { position: absolute; top: -4px; bottom: -4px; inset-inline-start: 33.3%;
      width: 2px; background: var(--nb-text); opacity: .4; border-radius: 2px; }

    .r-cost { display: flex; flex-direction: column; gap: 1px; }
    .r-cost strong { font-size: 15px; font-weight: 800; color: var(--nb-text);
      font-variant-numeric: tabular-nums; }
    .r-of { font-size: 11px; color: var(--nb-text-muted); }
    .r-verdict { text-align: end; }

    .tag { font-size: 11px; font-weight: 700; border-radius: 20px; padding: 3px 10px; display: inline-block; }
    .tag.ok { background: #f0fdf4; color: #15803D; }
    .tag.watch { background: #fffaf0; color: #B45309; }
    .tag.rep { background: #fef2f2; color: #B91C1C; }

    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
    @media (max-width: 900px) { .kpis { grid-template-columns: repeat(2, 1fr); } }
    .kpi { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 14px 16px;
      display: flex; flex-direction: column; gap: 3px; }
    .kpi.warn { border-color: #fde9c8; background: #fffdf8; }
    .k-label { font-size: 12px; font-weight: 700; color: var(--nb-text-muted); }
    .k-val { font-size: 25px; font-weight: 800; color: var(--nb-text); line-height: 1.15;
      font-variant-numeric: tabular-nums; }
    .k-val small { font-size: 13px; font-weight: 700; color: var(--nb-text-muted); }
    .k-hint { font-size: 11px; color: var(--nb-text-muted); }

    .wo-list { display: flex; flex-direction: column; }
    .wo { display: grid; grid-template-columns: 1.1fr 2fr 1fr 1fr; align-items: center; gap: 12px;
      width: 100%; text-align: start; font-family: inherit; cursor: pointer; background: none;
      border: none; border-top: 1px solid var(--nb-border-soft, #f0f1f5); padding: 10px 8px;
      border-radius: 8px; transition: background .15s ease; }
    .wo:first-child { border-top: none; }
    .wo:hover { background: var(--nb-surface-raised); }
    .wo:focus-visible { outline: 2px solid var(--nb-primary-500); outline-offset: -2px; }
    .w-num { font-size: 12.5px; font-weight: 700; color: var(--nb-text);
      font-family: ui-monospace, monospace; }
    .w-asset { font-size: 12.5px; color: var(--nb-text-muted);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .w-cost { font-size: 12.5px; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .w-status { text-align: end; }

    .badge { font-size: 11px; font-weight: 700; border-radius: 20px; padding: 3px 10px; }
    .badge.draft { background: var(--nb-surface-raised); color: var(--nb-text-muted); }
    .badge.assigned, .badge.in_progress { background: var(--nb-primary-50); color: var(--nb-primary-700); }
    .badge.on_hold { background: #fffaf0; color: #B45309; }
    .badge.completed { background: #f0fdf4; color: #15803D; }
    .badge.closed { background: #eef0f5; color: var(--nb-text-muted); }
    .badge.cancelled { background: #fef2f2; color: #B91C1C; }

    .empty { padding: 26px; text-align: center; }
    .empty p { margin: 0 0 4px; font-size: 13px; color: var(--nb-text); }
    .empty .hint { font-size: 12px; color: var(--nb-text-muted); }

    @media (prefers-reduced-motion: reduce) {
      .stage, .row, .wo, .r-fill { transition: none; }
      .stage:hover { transform: none; }
    }
  `],
})
export class MaintenanceDashboardComponent implements OnInit {
  private svc = inject(MaintenanceService);
  private assetsSvc = inject(AssetsService);
  private router = inject(Router);

  readonly loading = signal(true);
  private requests = signal<any[]>([]);
  private orders = signal<any[]>([]);
  private costs = signal<any[]>([]);
  private assets = signal<any[]>([]);
  private priorities = signal<any[]>([]);

  /** المحطات تُحسب من البيانات لا من إحصائية جاهزة — فتبقى متسقة مع القوائم. */
  readonly stages = computed<Stage[]>(() => {
    const o = this.orders();
    return [
      {
        key: 'reported', label: 'بلاغات مفتوحة',
        count: this.requests().filter((r) => ['submitted', 'approved'].includes(r.status)).length,
        hint: 'بانتظار أمر عمل', route: '/maintenance/requests',
      },
      {
        key: 'active', label: 'قيد التنفيذ',
        count: o.filter((w) => ['draft', 'assigned', 'in_progress', 'on_hold'].includes(w.status)).length,
        hint: 'أوامر عمل جارية', route: '/maintenance/work-orders',
      },
      {
        key: 'done', label: 'مكتملة فنيّاً',
        count: o.filter((w) => w.status === 'completed').length,
        hint: 'تنتظر الإقفال المالي', route: '/maintenance/work-orders',
      },
      {
        key: 'closed', label: 'مُقفلة ماليّاً',
        count: o.filter((w) => w.status === 'closed').length,
        hint: 'رُحّلت تكاليفها', route: '/maintenance/work-orders',
      },
    ];
  });

  private priorityCode(id: string): string {
    return this.priorities().find((p) => p.id === id)?.code || '';
  }

  readonly urgentOpen = computed(() =>
    this.requests().filter(
      (r) => ['submitted', 'approved', 'in_progress'].includes(r.status)
        && ['EMERGENCY', 'HIGH'].includes(this.priorityCode(r.priority)),
    ).length,
  );

  /** التوقيع: ما أُنفق على كل أصل مقابل قيمته الدفترية. */
  readonly burdens = computed<Burden[]>(() => {
    const costByOrder = new Map<string, number>();
    for (const c of this.costs()) {
      costByOrder.set(c.work_order, (costByOrder.get(c.work_order) || 0) + (Number(c.total_cost) || 0));
    }

    const perAsset = new Map<string, { cost: number; faults: number }>();
    for (const w of this.orders()) {
      const spent = costByOrder.get(w.id) || 0;
      if (!w.asset) continue;
      const cur = perAsset.get(w.asset) || { cost: 0, faults: 0 };
      cur.cost += spent;
      cur.faults += 1;
      perAsset.set(w.asset, cur);
    }

    const out: Burden[] = [];
    for (const [assetId, agg] of perAsset) {
      if (agg.cost <= 0) continue;
      const a = this.assets().find((x) => x.id === assetId);
      const bookValue = Number(a?.book_value) || 0;
      const ratio = bookValue > 0 ? (agg.cost / bookValue) * 100 : 100;
      out.push({
        id: assetId,
        name: a?.name_ar || a?.name_en || 'أصل غير معروف',
        number: a?.asset_number || '—',
        faults: agg.faults,
        cost: agg.cost,
        bookValue,
        ratio,
        // الثلث حدّ عملي: ما تجاوزه يستحق مقارنة الإصلاح بالاستبدال
        verdict: ratio >= 33.3 ? 'replace' : ratio >= 20 ? 'watch' : 'ok',
      });
    }
    return out.sort((x, y) => y.ratio - x.ratio);
  });

  readonly totalCost = computed(() =>
    this.costs().reduce((s, c) => s + (Number(c.total_cost) || 0), 0),
  );
  readonly avgCost = computed(() => {
    const n = this.costs().filter((c) => Number(c.total_cost) > 0).length;
    return n ? this.totalCost() / n : 0;
  });
  readonly unposted = computed(() => this.orders().filter((w) => w.status === 'completed').length);
  readonly assetsUnderWork = computed(() => {
    const ids = this.orders()
      .filter((w) => !['closed', 'cancelled'].includes(w.status) && w.asset)
      .map((w) => w.asset);
    return new Set(ids).size;
  });

  readonly recent = computed(() =>
    [...this.orders()]
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 6),
  );

  /** اسم الأصل يُقرأ من السجل — لا يُكتب في الشيفرة. */
  assetName(id: string): string {
    const a = this.assets().find((x) => x.id === id);
    return a ? `${a.name_ar} (${a.asset_number})` : '—';
  }
  costOf(orderId: string): number {
    return this.costs()
      .filter((c) => c.work_order === orderId)
      .reduce((s, c) => s + (Number(c.total_cost) || 0), 0);
  }
  clamp(v: number): number { return Math.max(0, Math.min(100, v)); }
  statusText(s: string): string {
    return ({ draft: 'مسودة', assigned: 'مسند', in_progress: 'قيد التنفيذ', on_hold: 'معلّق',
      completed: 'مكتمل فنيّاً', closed: 'مغلق', cancelled: 'ملغى' } as any)[s] || s;
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const rows = (d: any) => (Array.isArray(d) ? d : (d?.data ?? d?.results ?? []));
    this.svc.getWorkOrders().subscribe({
      next: (d) => { this.orders.set(rows(d)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.svc.getRequests().subscribe({ next: (d) => this.requests.set(rows(d)), error: () => {} });
    this.svc.getCosts().subscribe({ next: (d) => this.costs.set(rows(d)), error: () => {} });
    this.svc.getPriorities().subscribe({ next: (d) => this.priorities.set(rows(d)), error: () => {} });
    this.assetsSvc.getAssets().subscribe({ next: (d) => this.assets.set(rows(d)), error: () => {} });
  }

  go(route: string) { this.router.navigateByUrl(route); }
  openAsset(id: string) { this.router.navigate(['/assets/register', id]); }
}
