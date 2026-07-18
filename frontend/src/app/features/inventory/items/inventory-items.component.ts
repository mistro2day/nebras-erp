import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InventoryService } from '../inventory.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { NbExportMenuComponent, ExportColumn } from '../../../shared/export';

/** الأصناف وأرصدتها بالمستودعات — دليل المخزون وحالة كل صنف مقابل حدّ إعادة الطلب. */
@Component({
  selector: 'app-inventory-items',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe, NbPageHeaderComponent, NbLoadingComponent, NbExportMenuComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="الأصناف والأرصدة" subtitle="دليل الأصناف وأرصدتها في المستودعات مقابل حدود إعادة الطلب.">
        <button class="btn ghost" (click)="back()">رجوع للوحة</button>
        <nb-export-menu [columns]="cols" [rows]="exportRows()" title="الأصناف والأرصدة"
          subtitle="أرصدة الأصناف بالمستودعات" filename="اصناف-المخزون"></nb-export-menu>
        <button class="btn ghost" (click)="load()">تحديث</button>
      </nb-page-header>

      <div class="toolbar">
        <input class="search" [ngModel]="q()" (ngModelChange)="q.set($event)" placeholder="بحث بالاسم أو رمز الصنف…" />
        <div class="chips">
          <button [class.on]="filter()===''" (click)="filter.set('')">الكل ({{ all().length }})</button>
          <button [class.on]="filter()==='out'" (click)="filter.set('out')">نفد ({{ count('out') }})</button>
          <button [class.on]="filter()==='low'" (click)="filter.set('low')">تحت الحد ({{ count('low') }})</button>
          <button [class.on]="filter()==='ok'" (click)="filter.set('ok')">سليم ({{ count('ok') }})</button>
        </div>
      </div>

      <section class="card">
        <div class="row head">
          <span>الصنف</span><span>المستودع</span>
          <span class="ta-end">المتوفر</span><span class="ta-end">المحجوز</span>
          <span class="ta-end">حدّ الطلب</span><span class="ta-end">الحالة</span>
        </div>

        @if (loading()) {
          <nb-loading message="جارٍ تحميل الأصناف والأرصدة…"></nb-loading>
        } @else {
          @for (r of filtered(); track r.id) {
            <div class="row">
              <span class="cell-name">
                <strong>{{ r.name }}</strong>
                <span class="muted">{{ r.sku }}@if (r.category) { · {{ r.category }} }</span>
              </span>
              <span class="muted">{{ r.warehouse }}</span>
              <span class="ta-end mono strong">{{ r.onHand | number:'1.0-2' }} <small>{{ r.uom }}</small></span>
              <span class="ta-end mono muted">{{ r.reserved ? (r.reserved | number:'1.0-2') : '—' }}</span>
              <span class="ta-end mono muted">{{ r.min ? (r.min | number:'1.0-0') : '—' }}</span>
              <span class="ta-end">
                @if (r.state === 'out') { <span class="badge out">نفد</span> }
                @else if (r.state === 'low') { <span class="badge low">اطلب الآن</span> }
                @else if (r.state === 'over') { <span class="badge over">فوق الحد</span> }
                @else { <span class="badge ok">سليم</span> }
              </span>
            </div>
          }
          @if (!filtered().length) { <div class="empty">لا توجد أصناف مطابقة.</div> }
        }
      </section>

      <!-- الربط بالمشتريات: النواقص تتحوّل لطلب شراء -->
      @if (!loading() && count('out') + count('low') > 0) {
        <div class="link-note">
          <span class="ln-body">
            <strong>{{ count('out') + count('low') }}</strong> صنف يحتاج تجديداً.
            النواقص تُعالَج بطلب شراء يمرّ بدورة الاعتماد ثم يعود مستلماً للمخزون.
          </span>
          <button class="btn primary sm" (click)="go('/procurement/requests')">إنشاء طلب شراء ‹</button>
        </div>
      }
    </div>
  `,
  styleUrl: '../../procurement/shared/procurement-table.scss',
  styles: [`
    .row { grid-template-columns: 2fr 1.2fr 1fr 0.9fr 0.9fr 0.9fr; }
    .cell-name { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .cell-name strong { font-weight: 700; }
    .cell-name .muted { font-size: 11px; }
    .strong { font-weight: 800; }
    .mono small { font-size: 10px; font-weight: 600; color: var(--nb-text-muted); }
    .badge.out { background: #fef2f2; color: #B91C1C; }
    .badge.low { background: #fffaf0; color: #B45309; }
    .badge.ok { background: #f0fdf4; color: #15803D; }
    .badge.over { background: var(--nb-primary-50); color: var(--nb-primary-700); }
    .link-note { display: flex; align-items: center; justify-content: space-between; gap: 16px;
      flex-wrap: wrap; margin-top: 14px; padding: 13px 16px; background: var(--nb-surface);
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); }
    .ln-body { font-size: 13px; color: var(--nb-text); }
    .ln-body strong { font-weight: 800; }
    .btn.sm { padding: 6px 12px; font-size: 12px; }
  `],
})
export class InventoryItemsComponent implements OnInit {
  private svc = inject(InventoryService);
  private router = inject(Router);

  readonly loading = signal(true);
  readonly q = signal('');
  readonly filter = signal('');

  private balances = signal<any[]>([]);
  private items = signal<any[]>([]);
  private warehouses = signal<any[]>([]);
  private categories = signal<any[]>([]);
  private units = signal<any[]>([]);
  private rules = signal<any[]>([]);

  readonly cols: ExportColumn[] = [
    { key: 'name', label: 'الصنف' },
    { key: 'sku', label: 'الرمز' },
    { key: 'warehouse', label: 'المستودع' },
    { key: 'onHand', label: 'المتوفر' },
    { key: 'reserved', label: 'المحجوز' },
    { key: 'min', label: 'حدّ الطلب' },
    { key: 'stateLabel', label: 'الحالة' },
  ];

  readonly all = computed(() => {
    const itemMap = new Map(this.items().map((i) => [i.id, i]));
    const whMap = new Map(this.warehouses().map((w) => [w.id, w]));
    const catMap = new Map(this.categories().map((c) => [c.id, c]));
    const uomMap = new Map(this.units().map((u) => [u.id, u]));

    return this.balances().map((b) => {
      const item = itemMap.get(b.item);
      const rule = this.rules().find((r) => r.item === b.item && r.warehouse === b.warehouse);
      const onHand = Number(b.qty_on_hand) || 0;
      const min = Number(rule?.min_stock) || 0;
      const max = Number(rule?.max_stock) || 0;
      const state = onHand <= 0 ? 'out' : min && onHand < min ? 'low' : max && onHand > max ? 'over' : 'ok';
      return {
        id: b.id,
        name: item?.name_ar || item?.name_en || 'صنف غير معروف',
        sku: item?.sku || '—',
        category: catMap.get(item?.category)?.name_ar || '',
        uom: uomMap.get(item?.uom)?.name_ar || '',
        warehouse: whMap.get(b.warehouse)?.name_ar || '—',
        onHand,
        reserved: Number(b.qty_reserved) || 0,
        min,
        state,
        stateLabel: { out: 'نفد', low: 'تحت الحد', ok: 'سليم', over: 'فوق الحد' }[state],
      };
    }).sort((a, b) => {
      const rank: Record<string, number> = { out: 0, low: 1, over: 2, ok: 3 };
      return rank[a.state] - rank[b.state];
    });
  });

  readonly filtered = computed(() => {
    const term = this.q().trim();
    const f = this.filter();
    return this.all().filter((r) =>
      (!f || r.state === f) &&
      (!term || r.name.includes(term) || (r.sku || '').includes(term)));
  });

  readonly exportRows = computed(() => this.filtered());

  count(state: string): number { return this.all().filter((r) => r.state === state).length; }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getBalances().subscribe({
      next: (d) => { this.balances.set(this.rows(d)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.svc.getItems().subscribe({ next: (d) => this.items.set(this.rows(d)), error: () => {} });
    this.svc.getWarehouses().subscribe({ next: (d) => this.warehouses.set(this.rows(d)), error: () => {} });
    this.svc.getCategories().subscribe({ next: (d) => this.categories.set(this.rows(d)), error: () => {} });
    this.svc.getUnits().subscribe({ next: (d) => this.units.set(this.rows(d)), error: () => {} });
    this.svc.getReorderRules().subscribe({ next: (d) => this.rules.set(this.rows(d)), error: () => {} });
  }

  private rows(d: any): any[] { return Array.isArray(d) ? d : (d?.data ?? d?.results ?? []); }

  go(route: string) { this.router.navigateByUrl(route); }
  back() { this.router.navigateByUrl('/inventory/dashboard'); }
}
