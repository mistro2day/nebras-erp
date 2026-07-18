import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InventoryService } from '../inventory.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';

interface Line { item: string; qty: number; cost: number; }

/**
 * التحويل بين المستودعات.
 *
 * التحويل الداخلي لا يغيّر قيمة المخزون — تنتقل الكمية من موقع لآخر داخل
 * المنشأة، فلا قيد محاسبي. تُبرز الشاشة هذه الحقيقة صراحةً لتمييز التحويل
 * عن الصرف الذي يُثبت مصروفاً.
 */
@Component({
  selector: 'app-inventory-transfers',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe, NbPageHeaderComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="التحويل بين المستودعات" subtitle="نقل الأصناف بين مواقع التخزين دون أثر محاسبي.">
        <button class="btn ghost" (click)="back()">رجوع للوحة</button>
        <button class="btn ghost" (click)="load()">تحديث</button>
        <button class="btn primary" (click)="openForm()">＋ تحويل جديد</button>
      </nb-page-header>

      @if (showForm()) {
        <section class="form-card">
          <header class="fc-head">
            <h3>تحويل جديد</h3>
            <button class="x" (click)="closeForm()" aria-label="إغلاق">✕</button>
          </header>

          <div class="fc-body">
            <!-- الاتجاه -->
            <div class="route">
              <label class="r-side">
                <span>من مستودع <i>*</i></span>
                <select [(ngModel)]="form.from" (ngModelChange)="onSource()">
                  <option value="">اختر…</option>
                  @for (w of stockWarehouses(); track w.id) { <option [value]="w.id">{{ w.name_ar }}</option> }
                </select>
              </label>
              <span class="r-arrow">←</span>
              <label class="r-side">
                <span>إلى مستودع <i>*</i></span>
                <select [(ngModel)]="form.to">
                  <option value="">اختر…</option>
                  @for (w of destinations(); track w.id) { <option [value]="w.id">{{ w.name_ar }}</option> }
                </select>
              </label>
            </div>

            @if (!form.from) {
              <p class="fc-note">اختر المستودع المصدر لعرض الأصناف المتاحة فيه.</p>
            } @else {
              <div class="lines">
                <div class="l-head"><span>الصنف</span><span>الكمية</span><span>تكلفة الوحدة</span><span></span></div>
                @for (l of lines(); track $index) {
                  <div class="l-row">
                    <select [ngModel]="l.item" (ngModelChange)="setItem($index, $event)">
                      <option value="">اختر الصنف…</option>
                      @for (o of availableItems(); track o.id) {
                        <option [value]="o.id">{{ o.name }} — متوفر {{ o.available }}</option>
                      }
                    </select>
                    <input type="number" min="0" [ngModel]="l.qty" (ngModelChange)="setQty($index, $event)" />
                    <input type="number" min="0" step="0.01" [ngModel]="l.cost" (ngModelChange)="setCost($index, $event)" />
                    <button class="rm" (click)="removeLine($index)" aria-label="حذف">✕</button>
                  </div>
                  @if (overQty($index); as msg) { <p class="l-warn">{{ msg }}</p> }
                }
                <button class="add-line" (click)="addLine()">＋ إضافة بند</button>
              </div>

              <div class="impact">
                <span class="im-t">{{ totalQty() | number:'1.0-2' }} وحدة تنتقل</span>
                <span class="im-n">لا قيد محاسبي — قيمة المخزون الإجمالية لا تتغيّر بالتحويل الداخلي.</span>
              </div>
            }

            @if (error()) { <p class="err">{{ error() }}</p> }
          </div>

          <footer class="fc-acts">
            <button class="btn ghost" (click)="closeForm()">إلغاء</button>
            <button class="btn primary" [disabled]="saving()" (click)="save()">
              {{ saving() ? 'جارٍ التحويل…' : 'تنفيذ التحويل' }}
            </button>
          </footer>
        </section>
      }

      <section class="card">
        <div class="row head">
          <span>رقم التحويل</span><span>من</span><span>إلى</span>
          <span class="ta-end">البنود</span><span class="ta-end">الحالة</span>
        </div>
        @if (loading()) {
          <nb-loading message="جارٍ تحميل التحويلات…"></nb-loading>
        } @else {
          @for (t of transfers(); track t.id) {
            <div class="row">
              <span class="mono strong">{{ t.transfer_number }}</span>
              <span class="muted">{{ whName(t.from_warehouse) }}</span>
              <span class="muted">{{ whName(t.to_warehouse) }}</span>
              <span class="ta-end mono">{{ t.items?.length || 0 }}</span>
              <span class="ta-end"><span class="badge ok">{{ statusLabel(t.status) }}</span></span>
            </div>
          }
          @if (!transfers().length) { <div class="empty">لا توجد تحويلات بعد.</div> }
        }
      </section>
    </div>
  `,
  styleUrl: '../../procurement/shared/procurement-table.scss',
  styles: [`
    .row { grid-template-columns: 1.4fr 1.3fr 1.3fr 0.7fr 0.9fr; }
    .strong { font-weight: 800; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn:disabled { opacity: .55; cursor: default; }

    .form-card { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); overflow: hidden; margin-bottom: 14px; }
    .fc-head { display: flex; align-items: center; justify-content: space-between; padding: 13px 18px;
      background: var(--nb-primary-50, #f5f6ff); border-bottom: 1px solid var(--nb-primary-100, #e3e6fb); }
    .fc-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--nb-primary-800, #2a3178); }
    .x { border: none; background: none; font-size: 15px; color: var(--nb-text-muted); cursor: pointer; padding: 4px; }
    .fc-body { padding: 16px 18px; }
    .fc-note { margin: 0; font-size: 12.5px; color: var(--nb-text-muted); }
    .fc-acts { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px;
      background: var(--nb-surface-raised); border-top: 1px solid var(--nb-border); }

    /* الاتجاه يُقرأ كمسار لا كحقلين منفصلين */
    .route { display: flex; align-items: end; gap: 14px; margin-bottom: 16px; flex-wrap: wrap; }
    .r-side { display: grid; grid-template-rows: 18px auto; gap: 4px; flex: 1; min-width: 200px; }
    .r-side > span { font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .r-side i { color: #DC2626; font-style: normal; }
    .r-side select { height: 38px; padding: 0 11px; font-family: inherit; font-size: 13px;
      border: 1px solid var(--nb-border); border-radius: 8px; background: var(--nb-surface);
      color: var(--nb-text); width: 100%; box-sizing: border-box; }
    .r-arrow { font-size: 20px; color: var(--nb-primary-500); padding-bottom: 8px; }

    .lines { border: 1px solid var(--nb-border); border-radius: 10px; padding: 12px; margin-bottom: 12px; }
    .l-head, .l-row { display: grid; grid-template-columns: 2.6fr 1fr 1fr 36px; gap: 8px; align-items: center; }
    .l-head { font-size: 11px; font-weight: 700; color: var(--nb-text-muted); margin-bottom: 7px; }
    .l-row { margin-bottom: 7px; }
    .l-row select, .l-row input { height: 36px; padding: 0 10px; font-family: inherit; font-size: 12.5px;
      border: 1px solid var(--nb-border); border-radius: 7px; background: var(--nb-surface);
      color: var(--nb-text); width: 100%; box-sizing: border-box; }
    .rm { border: 1px solid var(--nb-border); background: var(--nb-surface); border-radius: 7px;
      height: 36px; cursor: pointer; color: var(--nb-text-muted); }
    .rm:hover { color: #B91C1C; border-color: #fecaca; }
    .l-warn { margin: -3px 0 8px; font-size: 11.5px; color: #B45309; }
    .add-line { border: 1px dashed var(--nb-border); background: none; border-radius: 8px;
      font-family: inherit; font-size: 12px; font-weight: 700; color: var(--nb-text-muted);
      cursor: pointer; padding: 7px 14px; width: 100%; }

    .impact { background: var(--nb-surface-raised); border: 1px solid var(--nb-border);
      border-radius: 9px; padding: 11px 13px; display: flex; flex-direction: column; gap: 2px; }
    .im-t { font-size: 15px; font-weight: 800; color: var(--nb-text); }
    .im-n { font-size: 11.5px; color: var(--nb-text-muted); }

    .err { margin: 12px 0 0; font-size: 12.5px; color: #B91C1C; background: #fef2f2;
      border: 1px solid #fecaca; border-radius: 8px; padding: 9px 12px; }
  `],
})
export class InventoryTransfersComponent implements OnInit {
  private svc = inject(InventoryService);
  private router = inject(Router);

  readonly loading = signal(true);
  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly transfers = signal<any[]>([]);
  readonly lines = signal<Line[]>([{ item: '', qty: 0, cost: 0 }]);

  private warehouses = signal<any[]>([]);
  private items = signal<any[]>([]);
  private balances = signal<any[]>([]);

  form: any = { from: '', to: '' };

  readonly stockWarehouses = computed(() => this.warehouses().filter((w) => !w.is_virtual));
  /** الوجهة لا تشمل المصدر — التحويل لنفس المستودع بلا معنى. */
  readonly destinations = computed(() => this.warehouses().filter((w) => w.id !== this.form.from));

  readonly availableItems = computed(() => {
    const from = this.form.from;
    if (!from) return [];
    const itemMap = new Map(this.items().map((i) => [i.id, i]));
    return this.balances()
      .filter((b) => b.warehouse === from && (Number(b.qty_on_hand) || 0) > 0)
      .map((b) => ({
        id: b.item,
        name: itemMap.get(b.item)?.name_ar || '—',
        available: (Number(b.qty_on_hand) || 0) - (Number(b.qty_reserved) || 0),
      }));
  });

  readonly totalQty = computed(() => this.lines().reduce((s, l) => s + (l.qty || 0), 0));

  overQty(idx: number): string | null {
    const l = this.lines()[idx];
    if (!l?.item || !l.qty) return null;
    const av = this.availableItems().find((a) => a.id === l.item);
    if (av && l.qty > av.available) return `الكمية (${l.qty}) تتجاوز المتاح (${av.available}).`;
    return null;
  }

  addLine() { this.lines.update((l) => [...l, { item: '', qty: 0, cost: 0 }]); }
  removeLine(i: number) { this.lines.update((l) => l.filter((_, x) => x !== i)); }
  setItem(i: number, v: string) { this.lines.update((ls) => ls.map((l, x) => (x === i ? { ...l, item: v } : l))); }
  setQty(i: number, v: any) { this.lines.update((ls) => ls.map((l, x) => (x === i ? { ...l, qty: Number(v) || 0 } : l))); }
  setCost(i: number, v: any) { this.lines.update((ls) => ls.map((l, x) => (x === i ? { ...l, cost: Number(v) || 0 } : l))); }
  onSource() {
    this.lines.set([{ item: '', qty: 0, cost: 0 }]);
    if (this.form.to === this.form.from) this.form.to = '';
  }

  openForm() {
    this.form = { from: '', to: '' };
    this.lines.set([{ item: '', qty: 0, cost: 0 }]);
    this.error.set('');
    this.showForm.set(true);
  }
  closeForm() { this.showForm.set(false); this.error.set(''); }

  save() {
    const f = this.form;
    const valid = this.lines().filter((l) => l.item && l.qty > 0);
    if (!f.from || !f.to) { this.error.set('المستودع المصدر والوجهة مطلوبان.'); return; }
    if (!valid.length) { this.error.set('أضف بنداً واحداً على الأقل بكمية أكبر من صفر.'); return; }
    for (let i = 0; i < this.lines().length; i++) {
      const w = this.overQty(i);
      if (w) { this.error.set(w); return; }
    }

    this.saving.set(true);
    this.error.set('');
    this.svc.executeTransfer({
      from_warehouse_id: f.from,
      to_warehouse_id: f.to,
      items: valid.map((l) => ({ item_id: l.item, quantity: l.qty, unit_cost: l.cost })),
    }).subscribe({
      next: () => { this.saving.set(false); this.closeForm(); this.load(); },
      error: (e: any) => {
        this.saving.set(false);
        const d = e?.details?.error ?? e?.details;
        this.error.set(typeof d === 'string' ? d : (e?.message || 'تعذّر تنفيذ التحويل.'));
      },
    });
  }

  whName(id: string): string { return this.warehouses().find((w) => w.id === id)?.name_ar || '—'; }
  statusLabel(s: string): string {
    return ({ draft: 'مسودة', pending: 'قيد الموافقة', transit: 'في الطريق',
      completed: 'مكتمل', cancelled: 'ملغى' } as any)[s] || s;
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getTransfers().subscribe({
      next: (d) => { this.transfers.set(this.rows(d)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.svc.getWarehouses().subscribe({ next: (d) => this.warehouses.set(this.rows(d)), error: () => {} });
    this.svc.getItems().subscribe({ next: (d) => this.items.set(this.rows(d)), error: () => {} });
    this.svc.getBalances().subscribe({ next: (d) => this.balances.set(this.rows(d)), error: () => {} });
  }

  private rows(d: any): any[] { return Array.isArray(d) ? d : (d?.data ?? d?.results ?? []); }

  back() { this.router.navigateByUrl('/inventory/dashboard'); }
}
