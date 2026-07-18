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
        <button class="btn primary" (click)="openForm()">＋ صنف جديد</button>
      </nb-page-header>

      <!-- نموذج إضافة صنف: التعريف + مكان التخزين + حدّ الطلب في خطوة واحدة -->
      @if (showForm()) {
        <section class="form-card">
          <header class="fc-head">
            <h3>صنف جديد</h3>
            <button class="x" (click)="closeForm()" aria-label="إغلاق">✕</button>
          </header>

          <div class="fc-body">
            <p class="fc-note">
              الصنف يحتاج تعريفاً ومكاناً وحدّاً. بدون حدّ إعادة الطلب لن يظهر ضمن النواقص
              لأن لا مرجع يُقاس عليه.
            </p>

            <div class="fields">
              <label class="wide">
                <span>اسم الصنف <i>*</i></span>
                <input [(ngModel)]="form.name_ar" placeholder="ورق تصوير A4 80 جم" />
              </label>
              <label>
                <span>رمز الصنف (SKU) <i>*</i></span>
                <input [(ngModel)]="form.sku" placeholder="SKU-1001" />
              </label>
              <label>
                <span>الباركود</span>
                <input [(ngModel)]="form.barcode" placeholder="اختياري" />
              </label>
              <label>
                <span>الفئة <i>*</i></span>
                <select [(ngModel)]="form.category">
                  <option value="">اختر…</option>
                  @for (c of categoriesList(); track c.id) { <option [value]="c.id">{{ c.name_ar }}</option> }
                </select>
              </label>
              <label>
                <span>وحدة القياس <i>*</i></span>
                <select [(ngModel)]="form.uom">
                  <option value="">اختر…</option>
                  @for (u of unitsList(); track u.id) { <option [value]="u.id">{{ u.name_ar }}</option> }
                </select>
              </label>
              <label>
                <span>المستودع <i>*</i></span>
                <select [(ngModel)]="form.warehouse">
                  <option value="">اختر…</option>
                  @for (w of stockWarehouses(); track w.id) { <option [value]="w.id">{{ w.name_ar }}</option> }
                </select>
              </label>
              <label>
                <span>الرصيد الافتتاحي</span>
                <input type="number" min="0" [(ngModel)]="form.qty" placeholder="0" />
              </label>
              <label>
                <span>حدّ إعادة الطلب</span>
                <input type="number" min="0" [(ngModel)]="form.min" placeholder="0" />
              </label>
              <label>
                <span>الحد الأقصى</span>
                <input type="number" min="0" [(ngModel)]="form.max" placeholder="0" />
              </label>
            </div>

            @if (error()) { <p class="err">{{ error() }}</p> }
          </div>

          <footer class="fc-acts">
            <button class="btn ghost" (click)="closeForm()">إلغاء</button>
            <button class="btn primary" [disabled]="saving()" (click)="save()">
              {{ saving() ? 'جارٍ الحفظ…' : 'إضافة الصنف' }}
            </button>
          </footer>
        </section>
      }

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
    .btn:disabled { opacity: .55; cursor: default; }

    .form-card { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); overflow: hidden; margin-bottom: 16px; }
    .fc-head { display: flex; align-items: center; justify-content: space-between;
      padding: 13px 18px; background: var(--nb-primary-50, #f5f6ff);
      border-bottom: 1px solid var(--nb-primary-100, #e3e6fb); }
    .fc-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--nb-primary-800, #2a3178); }
    .x { border: none; background: none; font-size: 15px; color: var(--nb-text-muted);
      cursor: pointer; line-height: 1; padding: 4px; }
    .fc-body { padding: 16px 18px; }
    .fc-note { margin: 0 0 14px; font-size: 12px; color: var(--nb-text-muted); }
    .fc-acts { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px;
      background: var(--nb-surface-raised); border-top: 1px solid var(--nb-border); }

    .fields { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 900px) { .fields { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 560px) { .fields { grid-template-columns: 1fr; } }
    .fields .wide { grid-column: 1 / -1; }
    .fields label { display: grid; grid-template-rows: 18px auto; gap: 4px; }
    .fields label > span { font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .fields label i { color: #DC2626; font-style: normal; }
    .fields input, .fields select { height: 38px; padding: 0 11px; font-family: inherit; font-size: 13px;
      border: 1px solid var(--nb-border); border-radius: 8px; background: var(--nb-surface);
      color: var(--nb-text); width: 100%; box-sizing: border-box; }
    .fields input:focus, .fields select:focus { outline: 2px solid var(--nb-primary-400);
      outline-offset: -1px; border-color: transparent; }

    .err { margin: 12px 0 0; font-size: 12.5px; color: #B91C1C; background: #fef2f2;
      border: 1px solid #fecaca; border-radius: 8px; padding: 9px 12px; }
  `],
})
export class InventoryItemsComponent implements OnInit {
  private svc = inject(InventoryService);
  private router = inject(Router);

  readonly loading = signal(true);
  readonly q = signal('');
  readonly filter = signal('');
  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  form: any = this.blank();

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

  // ---- قوائم النموذج ----
  readonly categoriesList = computed(() => this.categories());
  readonly unitsList = computed(() => this.units());
  /** مستودعات العبور الافتراضية لا تُستقبل فيها أرصدة افتتاحية. */
  readonly stockWarehouses = computed(() => this.warehouses().filter((w) => !w.is_virtual));

  blank() {
    return { name_ar: '', sku: '', barcode: '', category: '', uom: '',
      warehouse: '', qty: 0, min: 0, max: 0 };
  }

  openForm() { this.form = this.blank(); this.error.set(''); this.showForm.set(true); }
  closeForm() { this.showForm.set(false); this.error.set(''); }

  save() {
    const f = this.form;
    if (!f.name_ar?.trim() || !f.sku?.trim() || !f.category || !f.uom || !f.warehouse) {
      this.error.set('الاسم والرمز والفئة والوحدة والمستودع حقول مطلوبة.');
      return;
    }
    if (Number(f.max) && Number(f.min) > Number(f.max)) {
      this.error.set('حدّ إعادة الطلب لا يمكن أن يتجاوز الحد الأقصى.');
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.svc.createItem({
      name_ar: f.name_ar.trim(),
      name_en: f.sku.trim(),
      sku: f.sku.trim(),
      barcode: f.barcode?.trim() || null,
      category: f.category,
      uom: f.uom,
      item_type: 'stock',
    }).subscribe({
      next: (res: any) => {
        const item = res?.data ?? res;
        // الرصيد وقاعدة الطلب يُنشآن بعد الصنف لأنهما يحيلان إليه
        this.svc.createBalance({
          item: item.id, warehouse: f.warehouse,
          qty_on_hand: Number(f.qty) || 0, qty_reserved: 0,
        }).subscribe({ next: () => {}, error: () => {} });

        if (Number(f.min) > 0 || Number(f.max) > 0) {
          this.svc.createReorderRule({
            item: item.id, warehouse: f.warehouse,
            min_stock: Number(f.min) || 0,
            max_stock: Number(f.max) || Number(f.min) * 3 || 0,
            safety_stock: Math.round((Number(f.min) || 0) / 2),
            lead_time_days: 7,
          }).subscribe({ next: () => {}, error: () => {} });
        }

        // مهلة قصيرة ليكتمل إنشاء التابعين قبل إعادة الجلب
        setTimeout(() => { this.saving.set(false); this.closeForm(); this.load(); }, 400);
      },
      error: (e: any) => {
        this.saving.set(false);
        const d = e?.details?.error ?? e?.details;
        this.error.set(typeof d === 'string' ? d : (e?.message || 'تعذّر حفظ الصنف.'));
      },
    });
  }

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
