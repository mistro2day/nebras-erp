import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { InventoryService } from '../inventory.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';

/**
 * المستودعات وهيكلها التخزيني.
 * يُعرض كل مستودع كبطاقة تحمل ما بداخله فعلاً — عدد الأصناف وقيمتها —
 * لأن اسم المستودع وحده لا يفيد أمين المخزن.
 */
@Component({
  selector: 'app-warehouses',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DecimalPipe, NbPageHeaderComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="المستودعات" subtitle="مواقع التخزين ومناطقها ورفوفها، وما تحويه من أصناف.">
        <button class="btn ghost" (click)="back()">رجوع للوحة</button>
        <button class="btn ghost" (click)="load()">تحديث</button>
      </nb-page-header>

      @if (loading()) {
        <nb-loading message="جارٍ تحميل المستودعات…"></nb-loading>
      } @else if (!cards().length) {
        <div class="empty-card">لا توجد مستودعات مُعرّفة بعد.</div>
      } @else {
        <section class="grid">
          @for (w of cards(); track w.id) {
            <article class="wh" [class.virtual]="w.isVirtual">
              <header class="wh-head">
                <div class="wh-id">
                  <strong>{{ w.name }}</strong>
                  <span class="code">{{ w.code }}</span>
                </div>
                @if (w.isDefault) { <span class="badge def">افتراضي</span> }
                @if (w.isTransit) { <span class="badge tr">عبور</span> }
              </header>

              @if (w.location) { <p class="wh-loc">📍 {{ w.location }}</p> }

              <div class="wh-stats">
                <div class="ws">
                  <span class="ws-val">{{ w.itemCount }}</span>
                  <span class="ws-lbl">صنف مخزّن</span>
                </div>
                <div class="ws">
                  <span class="ws-val">{{ w.qty | number:'1.0-0' }}</span>
                  <span class="ws-lbl">إجمالي الكميات</span>
                </div>
                <div class="ws">
                  <span class="ws-val">{{ w.bins }}</span>
                  <span class="ws-lbl">موقع رف</span>
                </div>
              </div>

              @if (w.capacity > 0) {
                <div class="cap">
                  <div class="cap-head">
                    <span>السعة التخزينية</span>
                    <span class="mono">{{ w.capacity | number:'1.0-0' }} م³</span>
                  </div>
                </div>
              }

              @if (w.lowCount > 0) {
                <footer class="wh-alert">
                  <span>{{ w.lowCount }} صنف تحت حد الطلب</span>
                  <button class="mini" (click)="go('/inventory/items')">مراجعة ‹</button>
                </footer>
              }
            </article>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 22px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .btn { font-family: inherit; font-size: 13px; font-weight: 700; padding: 8px 14px;
      border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }

    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 1000px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 680px) { .grid { grid-template-columns: 1fr; } }

    .wh { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .wh.virtual { border-style: dashed; background: var(--nb-surface-raised); }

    .wh-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .wh-id { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
    .wh-id strong { font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .code { font-size: 11px; color: var(--nb-text-muted); font-family: ui-monospace, monospace; }
    .badge { font-size: 10px; font-weight: 700; border-radius: 20px; padding: 2px 9px; }
    .badge.def { background: var(--nb-primary-50); color: var(--nb-primary-700); }
    .badge.tr { background: var(--nb-surface-raised); color: var(--nb-text-muted); border: 1px solid var(--nb-border); }

    .wh-loc { margin: 0; font-size: 12px; color: var(--nb-text-muted); }

    .wh-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
      padding: 11px 0; border-block: 1px solid var(--nb-border-soft, #f0f1f5); }
    .ws { display: flex; flex-direction: column; gap: 1px; }
    .ws-val { font-size: 19px; font-weight: 800; color: var(--nb-text); line-height: 1.1; font-variant-numeric: tabular-nums; }
    .ws-lbl { font-size: 11px; color: var(--nb-text-muted); }

    .cap-head { display: flex; justify-content: space-between; font-size: 11px; color: var(--nb-text-muted); }
    .mono { font-family: ui-monospace, monospace; }

    .wh-alert { display: flex; align-items: center; justify-content: space-between; gap: 10px;
      font-size: 11.5px; color: #B45309; background: #fffaf0; border: 1px solid #fde9c8;
      border-radius: 8px; padding: 7px 10px; }
    .mini { border: none; background: none; font-family: inherit; font-size: 11.5px; font-weight: 700;
      color: #B45309; cursor: pointer; }

    .empty-card { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 32px; text-align: center;
      font-size: 13px; color: var(--nb-text-muted); }
  `],
})
export class WarehousesComponent implements OnInit {
  private svc = inject(InventoryService);
  private router = inject(Router);

  readonly loading = signal(true);
  private warehouses = signal<any[]>([]);
  private balances = signal<any[]>([]);
  private bins = signal<any[]>([]);
  private rules = signal<any[]>([]);

  readonly cards = computed(() =>
    this.warehouses().map((w) => {
      const bals = this.balances().filter((b) => b.warehouse === w.id);
      const lowCount = bals.filter((b) => {
        const rule = this.rules().find((r) => r.item === b.item && r.warehouse === w.id);
        const min = Number(rule?.min_stock) || 0;
        const qty = Number(b.qty_on_hand) || 0;
        return min > 0 && qty < min;
      }).length;
      return {
        id: w.id,
        name: w.name_ar || w.name_en,
        code: w.code,
        location: w.location,
        isDefault: !!w.is_default,
        isVirtual: !!w.is_virtual,
        isTransit: !!w.is_transit,
        capacity: Number(w.capacity_volume) || 0,
        itemCount: bals.length,
        qty: bals.reduce((s, b) => s + (Number(b.qty_on_hand) || 0), 0),
        // الرفوف تنتمي للممرات داخل المناطق، ولا يحمل الرصيد رابطاً مباشراً للمستودع
        bins: this.bins().filter((bn) => bals.some((b) => b.bin_location === bn.id)).length,
        lowCount,
      };
    }),
  );

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getWarehouses().subscribe({
      next: (d) => { this.warehouses.set(this.rows(d)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.svc.getBalances().subscribe({ next: (d) => this.balances.set(this.rows(d)), error: () => {} });
    this.svc.getBins().subscribe({ next: (d) => this.bins.set(this.rows(d)), error: () => {} });
    this.svc.getReorderRules().subscribe({ next: (d) => this.rules.set(this.rows(d)), error: () => {} });
  }

  private rows(d: any): any[] { return Array.isArray(d) ? d : (d?.data ?? d?.results ?? []); }

  go(route: string) { this.router.navigateByUrl(route); }
  back() { this.router.navigateByUrl('/inventory/dashboard'); }
}
