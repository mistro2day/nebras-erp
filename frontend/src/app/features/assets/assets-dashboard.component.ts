import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { AssetsService } from './assets.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../shared/nebras/nb-loading.component';

interface AssetLife {
  id: string;
  number: string;
  name: string;
  category: string;
  cost: number;
  nbv: number;
  accum: number;
  /** نسبة العمر المستهلك من العمر الافتراضي. */
  agePct: number;
  /** نسبة القيمة المتبقية من التكلفة — عرض الجزء الأخضر. */
  valuePct: number;
  status: string;
  nearEnd: boolean;
}

/**
 * مساحة عمل الأصول الثابتة.
 *
 * التوقيع البصري: «شريط عمر الأصل» — حقيقة الأصل الثابت أنه يفقد قيمته وفق
 * جدول معلوم. كل أصل يظهر بشريطين متوازيين: القيمة المتبقية من التكلفة،
 * ونسبة العمر المستهلك. حين يسبق العمرُ القيمةَ يعني الأصل يقترب من نهايته.
 * مستوحى من دورة حياة الأصل في Odoo وسجل الأصول الثابتة في D365.
 */
@Component({
  selector: 'app-assets-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DecimalPipe, NbPageHeaderComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="الأصول الثابتة"
        subtitle="سجل الأصول، الرسملة والإهلاك الدوري، والعهد والاستبعاد.">
        <button class="btn ghost" (click)="load()">تحديث</button>
        <button class="btn primary" (click)="go('/assets/register')">سجل الأصول</button>
      </nb-page-header>

      <!-- أصول مسجّلة لم تُرسمل: لا تُهلك ولا تظهر في الميزانية حتى ترسمل -->
      @if (!loading() && pendingCapitalization() > 0) {
        <div class="alert" (click)="go('/assets/register')">
          <span class="a-ic">◔</span>
          <span class="a-body">
            <strong>{{ pendingCapitalization() }}</strong> أصل مسجّل لم يُرسمل بعد.
            <span class="a-hint">لا يبدأ إهلاكه ولا يظهر أثره في المالية قبل الرسملة.</span>
          </span>
          <span class="a-go">رسملة الأصول ‹</span>
        </div>
      }

      <section class="kpis">
        <div class="kpi">
          <span class="k-label">القيمة الدفترية</span>
          <span class="k-val">{{ stat('net_book_value') | number:'1.0-0' }} <small>ر.س</small></span>
          <span class="k-hint">صافي قيمة الأصول بعد الإهلاك</span>
        </div>
        <div class="kpi">
          <span class="k-label">إهلاك الشهر</span>
          <span class="k-val">{{ stat('depr_mtd') | number:'1.0-0' }} <small>ر.س</small></span>
          <span class="k-hint">يُرحّل قيداً للمالية</span>
        </div>
        <div class="kpi">
          <span class="k-label">الأصول المرسملة</span>
          <span class="k-val">{{ stat('capitalized_assets') }}<small class="of">/ {{ stat('total_assets') }}</small></span>
          <span class="k-hint">من إجمالي الأصول المسجّلة</span>
        </div>
        <div class="kpi" [class.warn]="stat('pending_transfers') + stat('pending_disposals') > 0">
          <span class="k-label">بانتظار الاعتماد</span>
          <span class="k-val">{{ stat('pending_transfers') + stat('pending_disposals') }}</span>
          <span class="k-hint">تحويلات واستبعادات معلّقة</span>
        </div>
      </section>

      <!-- التوقيع: شريط عمر الأصل -->
      <section class="panel">
        <div class="p-head">
          <div>
            <h3>عمر الأصول وقيمتها</h3>
            <p>القيمة المتبقية مقابل العمر المستهلك. تجاوُز العمر للقيمة يعني اقتراب الاستبدال.</p>
          </div>
          <div class="legend">
            <span><i class="sw val"></i>القيمة المتبقية</span>
            <span><i class="sw age"></i>العمر المستهلك</span>
          </div>
        </div>

        @if (loading()) {
          <nb-loading message="جارٍ تحميل سجل الأصول…"></nb-loading>
        } @else if (!lives().length) {
          <div class="empty">لا توجد أصول مسجّلة بعد. ابدأ بتسجيل أصل في سجل الأصول.</div>
        } @else {
          <div class="lives">
            @for (a of lives(); track a.id) {
              <div class="life" [class.near]="a.nearEnd" (click)="go('/assets/register')">
                <div class="f-name">
                  <strong>{{ a.name }}</strong>
                  <span class="f-meta">{{ a.number }} · {{ a.category }}</span>
                </div>

                <div class="bars">
                  <div class="bar val" [title]="'القيمة المتبقية ' + (a.valuePct | number:'1.0-0') + '%'">
                    <span class="fill" [style.width.%]="a.valuePct"></span>
                  </div>
                  <div class="bar age" [title]="'العمر المستهلك ' + (a.agePct | number:'1.0-0') + '%'">
                    <span class="fill" [style.width.%]="a.agePct"></span>
                  </div>
                </div>

                <div class="f-money">
                  <strong>{{ a.nbv | number:'1.0-0' }}</strong>
                  <span class="f-of">من {{ a.cost | number:'1.0-0' }}</span>
                </div>

                <div class="f-state">
                  @if (a.status !== 'capitalized') { <span class="tag draft">لم تُرسمل</span> }
                  @else if (a.nearEnd) { <span class="tag near">قارب الانتهاء</span> }
                  @else { <span class="tag ok">قيد التشغيل</span> }
                </div>
              </div>
            }
          </div>
        }
      </section>

      <h3 class="sec-title">إدارة الأصول</h3>
      <section class="tiles">
        @for (t of tiles; track t.route) {
          <button class="tile" (click)="go(t.route)">
            <span class="t-ic">{{ t.icon }}</span>
            <span class="t-title">{{ t.title }}</span>
            <span class="t-desc">{{ t.desc }}</span>
          </button>
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

    .alert { display: flex; align-items: center; gap: 14px; background: var(--nb-primary-50, #f5f6ff);
      border: 1px solid var(--nb-primary-100, #e3e6fb); border-inline-start: 4px solid var(--nb-primary-500);
      border-radius: var(--nb-radius-card); padding: 13px 16px; margin-bottom: 16px; cursor: pointer; }
    .a-ic { font-size: 18px; color: var(--nb-primary-700); }
    .a-body { flex: 1; font-size: 13px; color: var(--nb-text); }
    .a-body strong { font-weight: 800; }
    .a-hint { color: var(--nb-text-muted); margin-inline-start: 6px; }
    .a-go { font-size: 12px; font-weight: 700; color: var(--nb-primary-700); }

    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
    @media (max-width: 900px) { .kpis { grid-template-columns: repeat(2, 1fr); } }
    .kpi { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 14px 16px; display: flex; flex-direction: column; gap: 3px; }
    .kpi.warn { border-color: #fde9c8; background: #fffdf8; }
    .k-label { font-size: 12px; font-weight: 700; color: var(--nb-text-muted); }
    .k-val { font-size: 25px; font-weight: 800; color: var(--nb-text); line-height: 1.15; font-variant-numeric: tabular-nums; }
    .k-val small { font-size: 13px; font-weight: 700; color: var(--nb-text-muted); }
    .k-val small.of { margin-inline-start: 4px; }
    .k-hint { font-size: 11px; color: var(--nb-text-muted); }

    .panel { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 16px 18px; margin-bottom: 20px; }
    .p-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
      flex-wrap: wrap; margin-bottom: 14px; }
    .p-head h3 { margin: 0 0 2px; font-size: 15px; font-weight: 700; color: var(--nb-text); }
    .p-head p { margin: 0; font-size: 12px; color: var(--nb-text-muted); }
    .legend { display: flex; align-items: center; gap: 12px; font-size: 11px; color: var(--nb-text-muted); }
    .legend span { display: inline-flex; align-items: center; gap: 5px; }
    .sw { width: 9px; height: 9px; border-radius: 2px; display: inline-block; }
    .sw.val { background: var(--nb-primary-500); } .sw.age { background: #cbd0dd; }

    .lives { display: flex; flex-direction: column; }
    .life { display: grid; grid-template-columns: 1.6fr 2.2fr 1fr 0.8fr; align-items: center; gap: 14px;
      padding: 12px 8px; border-top: 1px solid var(--nb-border-soft, #f0f1f5); cursor: pointer;
      border-radius: 8px; transition: background .15s ease; }
    .life:first-child { border-top: none; }
    .life:hover { background: var(--nb-surface-raised); }
    @media (max-width: 820px) { .life { grid-template-columns: 1fr 1fr; row-gap: 8px; } }

    .f-name { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .f-name strong { font-size: 13px; font-weight: 700; color: var(--nb-text);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .f-meta { font-size: 11px; color: var(--nb-text-muted); }

    .bars { display: flex; flex-direction: column; gap: 4px; }
    .bar { position: relative; height: 7px; border-radius: 4px; background: #eef0f5; }
    .bar .fill { position: absolute; inset-block: 0; inset-inline-start: 0; border-radius: 4px;
      transition: width .5s cubic-bezier(.4,0,.2,1); }
    .bar.val .fill { background: var(--nb-primary-500); }
    .bar.age .fill { background: #cbd0dd; }
    .life.near .bar.age .fill { background: #F59E0B; }

    .f-money { display: flex; flex-direction: column; gap: 1px; }
    .f-money strong { font-size: 15px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .f-of { font-size: 11px; color: var(--nb-text-muted); }

    .f-state { text-align: end; }
    .tag { font-size: 11px; font-weight: 700; border-radius: 20px; padding: 3px 10px; display: inline-block; }
    .tag.ok { background: #f0fdf4; color: #15803D; }
    .tag.near { background: #fffaf0; color: #B45309; }
    .tag.draft { background: var(--nb-surface-raised); color: var(--nb-text-muted); border: 1px solid var(--nb-border); }

    .empty { padding: 28px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }

    .sec-title { margin: 0 0 10px; font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    @media (max-width: 900px) { .tiles { grid-template-columns: repeat(2, 1fr); } }
    .tile { text-align: start; font-family: inherit; cursor: pointer; background: var(--nb-surface);
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 14px;
      display: flex; flex-direction: column; gap: 3px; transition: transform .15s ease, box-shadow .15s ease; }
    .tile:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(48,63,159,.1); border-color: var(--nb-primary-400); }
    .t-ic { font-size: 19px; }
    .t-title { font-size: 13px; font-weight: 700; color: var(--nb-text); }
    .t-desc { font-size: 11px; color: var(--nb-text-muted); }

    @media (prefers-reduced-motion: reduce) { .bar .fill, .tile { transition: none; } }
  `],
})
export class AssetsDashboardComponent implements OnInit {
  private svc = inject(AssetsService);
  private router = inject(Router);

  readonly stats = signal<any>({});
  readonly loading = signal(true);
  private assets = signal<any[]>([]);
  private categories = signal<any[]>([]);

  readonly tiles = [
    { icon: '🏛️', title: 'سجل الأصول', desc: 'الأصول وبياناتها ودورة حياتها.', route: '/assets/register' },
    { icon: '📉', title: 'الإهلاك', desc: 'الإهلاك الدوري وقيوده المالية.', route: '/assets/depreciation' },
    { icon: '🧾', title: 'العهد والتغطية', desc: 'من يحمل كل أصل، وضماناته وتأمينه.', route: '/assets/custody' },
    { icon: '📒', title: 'القيود المحاسبية', desc: 'أثر الرسملة والإهلاك في المالية.', route: '/finance/journals' },
    { icon: '🔧', title: 'الصيانة', desc: 'أوامر صيانة الأصول وتاريخها.', route: '/maintenance' },
  ];

  stat(k: string): number { return Number(this.stats()?.[k] ?? 0); }

  readonly pendingCapitalization = computed(
    () => this.assets().filter((a) => a.status === 'registered').length,
  );

  readonly lives = computed<AssetLife[]>(() => {
    const catMap = new Map(this.categories().map((c) => [c.id, c]));
    return this.assets()
      .filter((a) => a.status !== 'disposed')
      .map((a) => {
        const cost = Number(a.acquisition_cost) || 0;
        const nbv = Number(a.book_value) || 0;
        const life = Number(a.useful_life_months) || 0;
        // العمر المستهلك يُشتقّ من نسبة الإهلاك المتحقق، وهو أدق من فارق التواريخ
        const salvage = Number(a.salvage_value) || 0;
        const depreciable = Math.max(cost - salvage, 1);
        const accum = Math.max(cost - nbv, 0);
        const agePct = life ? Math.min(100, (accum / depreciable) * 100) : 0;
        const valuePct = cost ? Math.max(0, Math.min(100, (nbv / cost) * 100)) : 0;
        return {
          id: a.id,
          number: a.asset_number || '—',
          name: a.name_ar || a.name_en || 'أصل',
          category: catMap.get(a.category)?.name_ar || '—',
          cost, nbv, accum, agePct, valuePct,
          status: a.status,
          nearEnd: agePct >= 75,
        };
      })
      // الأقرب لنهاية عمره أولاً — هو ما يحتاج قراراً
      .sort((a, b) => b.agePct - a.agePct);
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getDashboardStats().subscribe({
      next: (d: any) => this.stats.set(d),
      error: () => this.stats.set({}),
    });
    this.svc.getAssets().subscribe({
      next: (d) => { this.assets.set(this.rows(d)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.svc.getCategories().subscribe({ next: (d) => this.categories.set(this.rows(d)), error: () => {} });
  }

  private rows(d: any): any[] {
    return Array.isArray(d) ? d : (d?.data ?? d?.results ?? []);
  }

  go(route: string) { this.router.navigateByUrl(route); }
}
