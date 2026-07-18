import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { InventoryService } from './inventory.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../shared/nebras/nb-loading.component';

interface StockLine {
  id: string;
  name: string;
  sku: string;
  warehouse: string;
  onHand: number;
  reserved: number;
  min: number;
  max: number;
  /** موضع الرصيد على المسار من 0 إلى 100 — للرسم فقط. */
  pos: number;
  minPos: number;
  state: 'out' | 'low' | 'ok' | 'over';
}

/**
 * مساحة عمل المخزون والمستودعات.
 *
 * التوقيع البصري: «خط إعادة الطلب» — السؤال الحقيقي في مستودع ليس «كم لديّ»
 * بل «متى ينفد». كل صنف يُرسم على مسار بين الصفر والحد الأقصى، وعليه علامة
 * حدّ إعادة الطلب؛ فيُقرأ الوضع في لمحة بدل قراءة أرقام مجرّدة.
 * مستوحى من قواعد إعادة الطلب في Odoo وتخطيط التجديد في D365.
 */
@Component({
  selector: 'app-inventory-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DecimalPipe, NbPageHeaderComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="المخزون والمستودعات"
        subtitle="أرصدة الأصناف، حدود إعادة الطلب، وحركة المخزون بين المستودعات.">
        <button class="btn ghost" (click)="load()">تحديث</button>
        <button class="btn primary" (click)="go('/inventory/items')">الأصناف والأرصدة</button>
      </nb-page-header>

      <!-- تنبيه النواقص: أول ما يجب أن يراه أمين المستودع -->
      @if (!loading() && (stat('out_of_stock') > 0 || stat('low_stock') > 0)) {
        <div class="alert" (click)="go('/inventory/items')">
          <span class="a-ic">⚠︎</span>
          <span class="a-body">
            <strong>{{ stat('out_of_stock') }}</strong> صنف نفد،
            و<strong>{{ stat('low_stock') }}</strong> تحت حد إعادة الطلب.
            <span class="a-hint">تحتاج أمر شراء قبل أن تتوقف الخدمة.</span>
          </span>
          <span class="a-go">مراجعة النواقص ‹</span>
        </div>
      }

      <!-- مؤشرات -->
      <section class="kpis">
        <div class="kpi">
          <span class="k-label">قيمة المخزون</span>
          <span class="k-val">{{ stat('total_value') | number:'1.0-0' }} <small>ر.س</small></span>
          <span class="k-hint">القيمة الدفترية للأصناف القائمة</span>
        </div>
        <div class="kpi">
          <span class="k-label">الأصناف</span>
          <span class="k-val">{{ stat('total_items') }}</span>
          <span class="k-hint">صنف مُعرّف في الدليل</span>
        </div>
        <div class="kpi">
          <span class="k-label">المستودعات</span>
          <span class="k-val">{{ stat('total_warehouses') }}</span>
          <span class="k-hint">مواقع تخزين فعلية</span>
        </div>
        <div class="kpi" [class.warn]="stat('pending_transfers') + stat('pending_adjustments') > 0">
          <span class="k-label">بانتظار الاعتماد</span>
          <span class="k-val">{{ stat('pending_transfers') + stat('pending_adjustments') }}</span>
          <span class="k-hint">تحويلات وتسويات معلّقة</span>
        </div>
      </section>

      <!-- التوقيع: خط إعادة الطلب -->
      <section class="panel">
        <div class="p-head">
          <div>
            <h3>خط إعادة الطلب</h3>
            <p>موضع كل صنف بين الصفر والحد الأقصى، وعليه علامة حدّ إعادة الطلب.</p>
          </div>
          <div class="legend">
            <span><i class="sw out"></i>نفد</span>
            <span><i class="sw low"></i>تحت الحد</span>
            <span><i class="sw ok"></i>سليم</span>
            <span class="mark">▏حدّ الطلب</span>
          </div>
        </div>

        @if (loading()) {
          <nb-loading message="جارٍ تحميل أرصدة الأصناف…"></nb-loading>
        } @else if (!lines().length) {
          <div class="empty">لا توجد أرصدة مسجّلة بعد. ابدأ بتعريف الأصناف وقواعد إعادة الطلب.</div>
        } @else {
          <div class="ladder">
            @for (l of lines(); track l.id) {
              <div class="line" [class]="l.state" (click)="go('/inventory/items')">
                <div class="l-name">
                  <strong>{{ l.name }}</strong>
                  <span class="l-meta">{{ l.sku }} · {{ l.warehouse }}</span>
                </div>
                <div class="track">
                  <span class="fill" [style.width.%]="l.pos"></span>
                  <span class="reorder" [style.inset-inline-start.%]="l.minPos" title="حدّ إعادة الطلب"></span>
                </div>
                <div class="l-qty">
                  <strong>{{ l.onHand | number:'1.0-0' }}</strong>
                  <span class="l-of">/ {{ l.max | number:'1.0-0' }}</span>
                  @if (l.reserved > 0) { <span class="l-res">محجوز {{ l.reserved | number:'1.0-0' }}</span> }
                </div>
                <div class="l-state">
                  @if (l.state === 'out') { <span class="tag out">نفد</span> }
                  @else if (l.state === 'low') { <span class="tag low">اطلب الآن</span> }
                  @else if (l.state === 'over') { <span class="tag over">فوق الحد</span> }
                  @else { <span class="tag ok">سليم</span> }
                </div>
              </div>
            }
          </div>
        }
      </section>

      <!-- الانتقال لبقية الفرع -->
      <h3 class="sec-title">إدارة المخزون</h3>
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

    .alert { display: flex; align-items: center; gap: 14px; background: #fffaf0; border: 1px solid #fde9c8;
      border-inline-start: 4px solid #F59E0B; border-radius: var(--nb-radius-card); padding: 13px 16px;
      margin-bottom: 16px; cursor: pointer; }
    .a-ic { font-size: 18px; color: #B45309; }
    .a-body { flex: 1; font-size: 13px; color: var(--nb-text); }
    .a-body strong { font-weight: 800; }
    .a-hint { color: var(--nb-text-muted); margin-inline-start: 6px; }
    .a-go { font-size: 12px; font-weight: 700; color: #B45309; }

    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
    @media (max-width: 900px) { .kpis { grid-template-columns: repeat(2, 1fr); } }
    .kpi { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 14px 16px; display: flex; flex-direction: column; gap: 3px; }
    .kpi.warn { border-color: #fde9c8; background: #fffdf8; }
    .k-label { font-size: 12px; font-weight: 700; color: var(--nb-text-muted); }
    .k-val { font-size: 25px; font-weight: 800; color: var(--nb-text); line-height: 1.15; font-variant-numeric: tabular-nums; }
    .k-val small { font-size: 13px; font-weight: 700; color: var(--nb-text-muted); }
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
    .sw.out { background: #DC2626; } .sw.low { background: #F59E0B; } .sw.ok { background: #16A34A; }
    .legend .mark { color: var(--nb-text-muted); font-weight: 700; }

    .ladder { display: flex; flex-direction: column; }
    .line { display: grid; grid-template-columns: 1.5fr 2.4fr 0.9fr 0.7fr; align-items: center; gap: 14px;
      padding: 11px 8px; border-top: 1px solid var(--nb-border-soft, #f0f1f5); cursor: pointer;
      border-radius: 8px; transition: background .15s ease; }
    .line:first-child { border-top: none; }
    .line:hover { background: var(--nb-surface-raised); }
    @media (max-width: 820px) { .line { grid-template-columns: 1fr 1fr; row-gap: 8px; } }

    .l-name { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .l-name strong { font-size: 13px; font-weight: 700; color: var(--nb-text);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .l-meta { font-size: 11px; color: var(--nb-text-muted); }

    .track { position: relative; height: 9px; border-radius: 5px; background: #eef0f5; }
    .fill { position: absolute; inset-block: 0; inset-inline-start: 0; border-radius: 5px;
      background: #16A34A; transition: width .5s cubic-bezier(.4,0,.2,1); }
    .line.low .fill { background: #F59E0B; }
    .line.out .fill { background: #DC2626; }
    .line.over .fill { background: var(--nb-primary-500); }
    /* علامة حدّ إعادة الطلب — الخط الفاصل بين الاطمئنان والتصرّف */
    .reorder { position: absolute; top: -4px; bottom: -4px; width: 2px; background: var(--nb-text);
      opacity: .45; border-radius: 2px; }

    .l-qty { display: flex; align-items: baseline; gap: 5px; flex-wrap: wrap; }
    .l-qty strong { font-size: 15px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .l-of { font-size: 11px; color: var(--nb-text-muted); }
    .l-res { font-size: 10px; color: var(--nb-text-muted); background: var(--nb-surface-raised);
      border: 1px solid var(--nb-border); border-radius: 4px; padding: 1px 5px; }

    .l-state { text-align: end; }
    .tag { font-size: 11px; font-weight: 700; border-radius: 20px; padding: 3px 10px; display: inline-block; }
    .tag.out { background: #fef2f2; color: #B91C1C; }
    .tag.low { background: #fffaf0; color: #B45309; }
    .tag.ok { background: #f0fdf4; color: #15803D; }
    .tag.over { background: var(--nb-primary-50); color: var(--nb-primary-700); }

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

    @media (prefers-reduced-motion: reduce) { .fill, .tile { transition: none; } }
  `],
})
export class InventoryDashboardComponent implements OnInit {
  private svc = inject(InventoryService);
  private router = inject(Router);

  readonly stats = signal<any>({});
  readonly loading = signal(true);
  private balances = signal<any[]>([]);
  private items = signal<any[]>([]);
  private warehouses = signal<any[]>([]);
  private rules = signal<any[]>([]);

  readonly tiles = [
    { icon: '📦', title: 'الأصناف والأرصدة', desc: 'دليل الأصناف وأرصدتها بالمستودعات.', route: '/inventory/items' },
    { icon: '🏬', title: 'المستودعات', desc: 'المواقع والمناطق والرفوف.', route: '/inventory/warehouses' },
    { icon: '↕︎', title: 'حركة المخزون', desc: 'كارت الصنف وسجل الحركات.', route: '/inventory/movements' },
    { icon: '🚚', title: 'استلام البضاعة', desc: 'سندات الاستلام مقابل أوامر الشراء.', route: '/inventory/receipts' },
  ];

  stat(k: string): number { return Number(this.stats()?.[k] ?? 0); }

  /** يدمج الرصيد بقاعدة إعادة الطلب ليصير سطراً قابلاً للقراءة على المسار. */
  readonly lines = computed<StockLine[]>(() => {
    const itemMap = new Map(this.items().map((i) => [i.id, i]));
    const whMap = new Map(this.warehouses().map((w) => [w.id, w]));
    const ruleFor = (itemId: string, whId: string) =>
      this.rules().find((r) => r.item === itemId && r.warehouse === whId);

    return this.balances()
      .map((b) => {
        const item = itemMap.get(b.item);
        const rule = ruleFor(b.item, b.warehouse);
        const onHand = Number(b.qty_on_hand) || 0;
        const reserved = Number(b.qty_reserved) || 0;
        const min = Number(rule?.min_stock) || 0;
        const max = Number(rule?.max_stock) || Math.max(onHand, min * 2, 1);
        const state: StockLine['state'] =
          onHand <= 0 ? 'out' : onHand < min ? 'low' : onHand > max ? 'over' : 'ok';
        return {
          id: b.id,
          name: item?.name_ar || item?.name_en || 'صنف غير معروف',
          sku: item?.sku || '—',
          warehouse: whMap.get(b.warehouse)?.name_ar || '—',
          onHand, reserved, min, max,
          pos: Math.max(0, Math.min(100, (onHand / max) * 100)),
          minPos: Math.max(0, Math.min(100, (min / max) * 100)),
          state,
        };
      })
      // الأحرج أولاً: النافد ثم تحت الحد ثم الباقي
      .sort((a, b) => {
        const rank = { out: 0, low: 1, over: 2, ok: 3 } as Record<string, number>;
        return rank[a.state] - rank[b.state] || a.pos - b.pos;
      });
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getDashboardStats().subscribe({
      next: (d: any) => this.stats.set(d),
      error: () => this.stats.set({}),
    });
    // المسار يحتاج الأربعة مجتمعة ليُرسم بشكل صحيح
    this.svc.getBalances().subscribe({
      next: (d) => { this.balances.set(this.rows(d)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.svc.getItems().subscribe({ next: (d) => this.items.set(this.rows(d)), error: () => {} });
    this.svc.getWarehouses().subscribe({ next: (d) => this.warehouses.set(this.rows(d)), error: () => {} });
    this.svc.getReorderRules().subscribe({ next: (d) => this.rules.set(this.rows(d)), error: () => {} });
  }

  private rows(d: any): any[] {
    return Array.isArray(d) ? d : (d?.data ?? d?.results ?? []);
  }

  go(route: string) { this.router.navigateByUrl(route); }
}
