import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, FormsModule, DecimalPipe, NbPageHeaderComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="المستودعات" subtitle="مواقع التخزين ومناطقها ورفوفها، وما تحويه من أصناف.">
        <button class="btn ghost" (click)="back()">رجوع للوحة</button>
        <button class="btn ghost" (click)="load()">تحديث</button>
        <button class="btn primary" (click)="openForm()">＋ مستودع جديد</button>
      </nb-page-header>

      <!-- نموذج الإضافة والتعديل -->
      @if (showForm()) {
        <section class="form-card">
          <header class="fc-head">
            <h3>{{ editing() ? 'تعديل المستودع' : 'مستودع جديد' }}</h3>
            <button class="x" (click)="closeForm()" aria-label="إغلاق">✕</button>
          </header>

          <div class="fc-body">
            <div class="fields">
              <label>
                <span>الاسم بالعربي <i>*</i></span>
                <input [(ngModel)]="form.name_ar" placeholder="المستودع الرئيسي" />
              </label>
              <label>
                <span>الاسم بالإنجليزي</span>
                <input [(ngModel)]="form.name_en" placeholder="Main Warehouse" />
              </label>
              <label>
                <span>الرمز <i>*</i></span>
                <input [(ngModel)]="form.code" placeholder="WH-MAIN" [disabled]="!!editing()" />
              </label>
              <label>
                <span>السعة التخزينية (م³)</span>
                <input type="number" min="0" [(ngModel)]="form.capacity_volume" placeholder="0" />
              </label>
              <label class="wide">
                <span>الموقع</span>
                <input [(ngModel)]="form.location" placeholder="المبنى الإداري — الدور الأرضي" />
              </label>
            </div>

            <div class="switches">
              <label class="sw">
                <input type="checkbox" [(ngModel)]="form.is_default" />
                <span>
                  <strong>المستودع الافتراضي</strong>
                  <small>يُقترح تلقائياً في عمليات الاستلام والصرف.</small>
                </span>
              </label>
              <label class="sw">
                <input type="checkbox" [(ngModel)]="form.is_transit" (ngModelChange)="onTransit($event)" />
                <span>
                  <strong>مستودع عبور</strong>
                  <small>للبضاعة في الطريق بين موقعين — لا تُحتسب ضمن المخزون الفعلي.</small>
                </span>
              </label>
            </div>

            @if (error()) { <p class="err">{{ error() }}</p> }
          </div>

          <footer class="fc-acts">
            <button class="btn ghost" (click)="closeForm()">إلغاء</button>
            <button class="btn primary" [disabled]="saving()" (click)="save()">
              {{ saving() ? 'جارٍ الحفظ…' : (editing() ? 'حفظ التعديلات' : 'إضافة المستودع') }}
            </button>
          </footer>
        </section>
      }

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
                <button class="edit" (click)="openForm(w.id)" title="تعديل المستودع">تعديل</button>
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
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn:disabled { opacity: .55; cursor: default; }

    /* نموذج الإضافة — ترويسة وجسم وتذييل، بلغة نوافذ نبراس */
    .form-card { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); overflow: hidden; margin-bottom: 16px; }
    .fc-head { display: flex; align-items: center; justify-content: space-between;
      padding: 13px 18px; background: var(--nb-primary-50, #f5f6ff);
      border-bottom: 1px solid var(--nb-primary-100, #e3e6fb); }
    .fc-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--nb-primary-800, #2a3178); }
    .x { border: none; background: none; font-size: 15px; color: var(--nb-text-muted);
      cursor: pointer; line-height: 1; padding: 4px; }
    .fc-body { padding: 16px 18px; }
    .fc-acts { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px;
      background: var(--nb-surface-raised); border-top: 1px solid var(--nb-border); }

    .fields { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; }
    @media (max-width: 900px) { .fields { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 560px) { .fields { grid-template-columns: 1fr; } }
    .fields .wide { grid-column: 1 / -1; }
    .fields label { display: grid; grid-template-rows: 18px auto; gap: 4px; }
    .fields label > span { font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .fields label i { color: #DC2626; font-style: normal; }
    .fields input { height: 38px; padding: 0 11px; font-family: inherit; font-size: 13px;
      border: 1px solid var(--nb-border); border-radius: 8px; background: var(--nb-surface);
      color: var(--nb-text); width: 100%; box-sizing: border-box; }
    .fields input:focus { outline: 2px solid var(--nb-primary-400); outline-offset: -1px; border-color: transparent; }
    .fields input:disabled { background: var(--nb-surface-raised); color: var(--nb-text-muted); }

    .switches { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    @media (max-width: 720px) { .switches { grid-template-columns: 1fr; } }
    .sw { display: flex; align-items: flex-start; gap: 9px; padding: 10px 12px;
      border: 1px solid var(--nb-border); border-radius: 10px; cursor: pointer; }
    .sw input { margin-top: 2px; accent-color: var(--nb-primary-600); }
    .sw span { display: flex; flex-direction: column; gap: 1px; }
    .sw strong { font-size: 12.5px; font-weight: 700; color: var(--nb-text); }
    .sw small { font-size: 11px; color: var(--nb-text-muted); }

    .err { margin: 12px 0 0; font-size: 12.5px; color: #B91C1C; background: #fef2f2;
      border: 1px solid #fecaca; border-radius: 8px; padding: 9px 12px; }

    .edit { border: none; background: var(--nb-surface-raised); border: 1px solid var(--nb-border);
      border-radius: 7px; font-family: inherit; font-size: 11px; font-weight: 700;
      color: var(--nb-text-muted); cursor: pointer; padding: 4px 10px; }
    .edit:hover { color: var(--nb-primary-700); border-color: var(--nb-primary-400); }

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
  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly editing = signal<string | null>(null);
  readonly error = signal('');
  form: any = this.blank();

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

  blank() {
    return { name_ar: '', name_en: '', code: '', location: '',
      capacity_volume: 0, is_default: false, is_transit: false, is_virtual: false };
  }

  openForm(id?: string) {
    this.error.set('');
    if (id) {
      const w = this.warehouses().find((x) => x.id === id);
      this.editing.set(id);
      this.form = {
        name_ar: w?.name_ar || '', name_en: w?.name_en || '', code: w?.code || '',
        location: w?.location || '', capacity_volume: Number(w?.capacity_volume) || 0,
        is_default: !!w?.is_default, is_transit: !!w?.is_transit, is_virtual: !!w?.is_virtual,
      };
    } else {
      this.editing.set(null);
      this.form = this.blank();
    }
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); this.editing.set(null); this.error.set(''); }

  /** مستودع العبور افتراضي بطبيعته — لا يحمل مخزوناً فعلياً. */
  onTransit(v: boolean) { this.form.is_virtual = v; }

  save() {
    const f = this.form;
    if (!f.name_ar?.trim() || !f.code?.trim()) {
      this.error.set('الاسم بالعربي والرمز حقلان مطلوبان.');
      return;
    }
    const payload: any = {
      name_ar: f.name_ar.trim(),
      name_en: (f.name_en || f.code).trim(),
      location: f.location?.trim() || null,
      capacity_volume: Number(f.capacity_volume) || 0,
      is_default: !!f.is_default,
      is_transit: !!f.is_transit,
      is_virtual: !!f.is_virtual,
    };
    const id = this.editing();
    // الرمز معرّف ثابت بعد الإنشاء — تغييره يكسر الإحالات القائمة
    if (!id) payload.code = f.code.trim();

    this.saving.set(true);
    this.error.set('');
    const req = id ? this.svc.updateWarehouse(id, payload) : this.svc.createWarehouse(payload);
    req.subscribe({
      next: () => { this.saving.set(false); this.closeForm(); this.load(); },
      error: (e: any) => {
        this.saving.set(false);
        // errorInterceptor يسطّح الخطأ — التفاصيل في details لا في error
        const d = e?.details?.error ?? e?.details;
        this.error.set(typeof d === 'string' ? d : (e?.message || 'تعذّر حفظ المستودع.'));
      },
    });
  }

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
