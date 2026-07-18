import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InventoryService } from '../inventory.service';
import { ProcurementService } from '../../procurement/procurement.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';

interface ReceiveLine {
  name: string;
  unit: string;
  ordered: number;
  price: number;
  budgetAccount: string;
  costCenter: string;
  /** الصنف المخزني المقابل — بنود أمر الشراء نصّ حر فتلزم المطابقة. */
  itemId: string;
  received: number;
  matched: boolean;
}

/**
 * استلام بضاعة مقابل أمر شراء.
 *
 * بنود أمر الشراء تُكتب نصّاً حراً عند الطلب، والمخزون يحتاج صنفاً معرّفاً.
 * لذلك تُظهر الشاشة المطابقة صراحةً: لكل بند صنفه المخزني، مع اقتراح أولي
 * بالاسم، ولا يُسمح بالاستلام قبل اكتمال المطابقة — وإلا دخلت البضاعة مجهولة.
 */
@Component({
  selector: 'app-receive-po',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe, NbPageHeaderComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header [title]="'استلام بضاعة — ' + (po()?.po_number || '')"
        subtitle="طابق بنود أمر الشراء بأصنافها المخزنية، وسجّل الكميات المستلمة فعلاً.">
        <button class="btn ghost" (click)="back()">‹ سندات الاستلام</button>
      </nb-page-header>

      @if (loading()) {
        <nb-loading message="جارٍ تحميل أمر الشراء…"></nb-loading>
      } @else if (!po()) {
        <div class="empty-card">تعذّر العثور على أمر الشراء.</div>
      } @else {
        <!-- مسار الأثر -->
        <div class="flow">
          <span class="f-step done">أمر شراء {{ po()!.po_number }}</span>
          <span class="f-arrow">←</span>
          <span class="f-step on">استلام</span>
          <span class="f-arrow">←</span>
          <span class="f-step">رصيد المخزون</span>
          <span class="f-arrow">←</span>
          <span class="f-step">قيد مسودة بالمالية</span>
        </div>

        <section class="panel">
          <div class="fields">
            <label>
              <span>مستودع الاستلام <i>*</i></span>
              <select [(ngModel)]="warehouse">
                <option value="">اختر…</option>
                @for (w of stockWarehouses(); track w.id) { <option [value]="w.id">{{ w.name_ar }}</option> }
              </select>
            </label>
            <div class="po-meta">
              <span><b>المورّد:</b> {{ vendorName() }}</span>
              <span><b>تاريخ الأمر:</b> {{ po()!.date }}</span>
              <span><b>القيمة:</b> {{ po()!.total_amount | number:'1.2-2' }} ر.س</span>
            </div>
          </div>
        </section>

        <!-- المطابقة -->
        <section class="panel">
          <div class="p-head">
            <div>
              <h3>مطابقة البنود</h3>
              <p>بنود أمر الشراء نصّ حرّ — اختر لكل بند صنفه المخزني قبل الاستلام.</p>
            </div>
            <span class="match-state" [class.ok]="allMatched()">
              {{ matchedCount() }} / {{ lines().length }} مطابَق
            </span>
          </div>

          <div class="l-head">
            <span>بند أمر الشراء</span><span>الصنف المخزني</span>
            <span class="ta-end">المطلوب</span><span class="ta-end">المستلم</span><span class="ta-end">القيمة</span>
          </div>

          @for (l of lines(); track $index) {
            <div class="l-row" [class.unmatched]="!l.itemId">
              <span class="l-name">
                <strong>{{ l.name }}</strong>
                <span class="l-unit">{{ l.unit }} · {{ l.price | number:'1.2-2' }} ر.س</span>
              </span>
              <select [ngModel]="l.itemId" (ngModelChange)="setItem($index, $event)">
                <option value="">— اختر الصنف —</option>
                @for (it of items(); track it.id) {
                  <option [value]="it.id">{{ it.name_ar }} ({{ it.sku }})</option>
                }
              </select>
              <span class="ta-end mono muted">{{ l.ordered | number:'1.0-2' }}</span>
              <input class="ta-end" type="number" min="0" [ngModel]="l.received"
                (ngModelChange)="setReceived($index, $event)" />
              <span class="ta-end mono">{{ (l.received * l.price) | number:'1.2-2' }}</span>
            </div>
            @if (l.received > l.ordered) {
              <p class="l-warn">المستلم ({{ l.received }}) يتجاوز المطلوب ({{ l.ordered }}).</p>
            }
          }

          @if (!lines().length) { <div class="empty">لا بنود في أمر الشراء.</div> }
        </section>

        <!-- الأثر قبل التنفيذ -->
        <section class="impact">
          <div class="im">
            <span class="im-lbl">أثر المخزون</span>
            <span class="im-val">{{ totalQty() | number:'1.0-2' }} وحدة تُضاف</span>
          </div>
          <div class="im">
            <span class="im-lbl">أثر المالية</span>
            <span class="im-val">{{ total() | number:'1.2-2' }} ر.س</span>
            <span class="im-note">يصل قيداً <b>مسودة</b> بانتظار اعتماد المحاسب.</span>
          </div>
        </section>

        @if (error()) { <p class="err">{{ error() }}</p> }

        <div class="acts">
          <button class="btn ghost" (click)="back()">إلغاء</button>
          <button class="btn primary" [disabled]="saving() || !canSubmit()" (click)="submit()">
            {{ saving() ? 'جارٍ الاستلام…' : 'تأكيد الاستلام' }}
          </button>
        </div>
        @if (!canSubmit() && !saving()) {
          <p class="hint">{{ blockReason() }}</p>
        }
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 22px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .btn { font-family: inherit; font-size: 13px; font-weight: 700; padding: 8px 14px;
      border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn:disabled { opacity: .5; cursor: default; }

    .flow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 14px;
      padding: 11px 14px; background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); }
    .f-step { font-size: 12px; font-weight: 700; color: var(--nb-text-muted);
      background: var(--nb-surface-raised); border: 1px solid var(--nb-border);
      border-radius: 20px; padding: 4px 12px; }
    .f-step.on { background: var(--nb-primary-50); color: var(--nb-primary-700); border-color: var(--nb-primary-200, #d9dcf7); }
    .f-step.done { background: #f0fdf4; color: #15803D; border-color: #bbf7d0; }
    .f-arrow { color: var(--nb-primary-400); }

    .panel { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 16px 18px; margin-bottom: 12px; }
    .p-head { display: flex; align-items: flex-start; justify-content: space-between;
      gap: 14px; flex-wrap: wrap; margin-bottom: 12px; }
    .p-head h3 { margin: 0 0 2px; font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .p-head p { margin: 0; font-size: 12px; color: var(--nb-text-muted); }
    .match-state { font-size: 11.5px; font-weight: 700; color: #B45309;
      background: #fffaf0; border: 1px solid #fde9c8; border-radius: 20px; padding: 4px 12px; }
    .match-state.ok { color: #15803D; background: #f0fdf4; border-color: #bbf7d0; }

    .fields { display: flex; gap: 20px; align-items: flex-end; flex-wrap: wrap; }
    .fields label { display: grid; grid-template-rows: 18px auto; gap: 4px; min-width: 220px; }
    .fields label > span { font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .fields label i { color: #DC2626; font-style: normal; }
    .fields select { height: 38px; padding: 0 11px; font-family: inherit; font-size: 13px;
      border: 1px solid var(--nb-border); border-radius: 8px; background: var(--nb-surface);
      color: var(--nb-text); width: 100%; box-sizing: border-box; }
    .po-meta { display: flex; gap: 18px; flex-wrap: wrap; font-size: 12px;
      color: var(--nb-text-muted); padding-bottom: 9px; }
    .po-meta b { color: var(--nb-text); font-weight: 700; }

    .l-head, .l-row { display: grid; grid-template-columns: 1.7fr 2fr 0.8fr 0.9fr 0.9fr;
      gap: 10px; align-items: center; }
    .l-head { font-size: 11px; font-weight: 700; color: var(--nb-text-muted);
      padding-bottom: 8px; border-bottom: 1px solid var(--nb-border); }
    .l-row { padding: 10px 0; border-bottom: 1px solid var(--nb-border-soft, #f0f1f5); }
    .l-row.unmatched { background: #fffdf8; }
    .l-name { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .l-name strong { font-size: 13px; font-weight: 700; color: var(--nb-text); }
    .l-unit { font-size: 11px; color: var(--nb-text-muted); }
    .l-row select, .l-row input { height: 36px; padding: 0 10px; font-family: inherit; font-size: 12.5px;
      border: 1px solid var(--nb-border); border-radius: 7px; background: var(--nb-surface);
      color: var(--nb-text); width: 100%; box-sizing: border-box; }
    .l-warn { margin: 4px 0 8px; font-size: 11.5px; color: #B45309; }
    .mono { font-family: ui-monospace, monospace; font-variant-numeric: tabular-nums; }
    .muted { color: var(--nb-text-muted); }
    .ta-end { text-align: end; }

    .impact { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    @media (max-width: 700px) { .impact { grid-template-columns: 1fr; } }
    .im { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 13px 16px; display: flex; flex-direction: column; gap: 2px; }
    .im-lbl { font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .im-val { font-size: 20px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .im-note { font-size: 11px; color: var(--nb-text-muted); }

    .acts { display: flex; justify-content: flex-end; gap: 8px; }
    .hint { margin: 8px 0 0; text-align: end; font-size: 11.5px; color: var(--nb-text-muted); }
    .err { margin: 0 0 12px; font-size: 12.5px; color: #B91C1C; background: #fef2f2;
      border: 1px solid #fecaca; border-radius: 8px; padding: 10px 13px; }
    .empty, .empty-card { padding: 26px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
    .empty-card { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); }
  `],
})
export class ReceivePoComponent implements OnInit {
  private svc = inject(InventoryService);
  private procurement = inject(ProcurementService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly po = signal<any | null>(null);
  readonly lines = signal<ReceiveLine[]>([]);
  readonly items = signal<any[]>([]);
  private warehouses = signal<any[]>([]);
  private vendors = signal<any[]>([]);
  warehouse = '';

  readonly stockWarehouses = computed(() => this.warehouses().filter((w) => !w.is_virtual));
  readonly matchedCount = computed(() => this.lines().filter((l) => !!l.itemId).length);
  readonly allMatched = computed(() => this.lines().length > 0 && this.matchedCount() === this.lines().length);
  readonly total = computed(() => this.lines().reduce((s, l) => s + l.received * l.price, 0));
  readonly totalQty = computed(() => this.lines().reduce((s, l) => s + l.received, 0));

  vendorName(): string {
    return this.vendors().find((v) => v.id === this.po()?.vendor)?.name_ar || '—';
  }

  canSubmit(): boolean {
    return !!this.warehouse && this.allMatched() && this.totalQty() > 0;
  }

  blockReason(): string {
    if (!this.warehouse) return 'اختر مستودع الاستلام أولاً.';
    if (!this.allMatched()) return 'طابق كل البنود بأصنافها المخزنية قبل الاستلام.';
    if (this.totalQty() <= 0) return 'أدخل الكميات المستلمة.';
    return '';
  }

  setItem(i: number, v: string) {
    this.lines.update((ls) => ls.map((l, x) => (x === i ? { ...l, itemId: v } : l)));
  }
  setReceived(i: number, v: any) {
    this.lines.update((ls) => ls.map((l, x) => (x === i ? { ...l, received: Number(v) || 0 } : l)));
  }

  submit() {
    if (!this.canSubmit()) return;
    const valid = this.lines().filter((l) => l.itemId && l.received > 0);
    if (!valid.length) { this.error.set('لا توجد كميات مستلمة.'); return; }

    this.saving.set(true);
    this.error.set('');
    this.svc.receivePO({
      purchase_order_id: this.po()!.id,
      warehouse_id: this.warehouse,
      items: valid.map((l) => ({
        item_id: l.itemId,
        qty_received: l.received,
        unit_price: l.price,
        budget_account_id: l.budgetAccount,
        cost_center_id: l.costCenter,
      })),
    }).subscribe({
      next: () => { this.saving.set(false); this.router.navigateByUrl('/inventory/receipts'); },
      error: (e: any) => {
        this.saving.set(false);
        const d = e?.details?.error ?? e?.details;
        this.error.set(typeof d === 'string' ? d : (e?.message || 'تعذّر تنفيذ الاستلام.'));
      },
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.loading.set(false); return; }

    this.procurement.getPurchaseOrder(id).subscribe({
      next: (r: any) => {
        const o = r?.data ?? r;
        this.po.set(o);
        this.buildLines(o?.items || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.svc.getItems().subscribe({
      next: (d) => { this.items.set(this.rows(d)); this.buildLines(this.po()?.items || []); },
      error: () => {},
    });
    this.svc.getWarehouses().subscribe({
      next: (d) => {
        this.warehouses.set(this.rows(d));
        const def = this.stockWarehouses().find((w) => w.is_default);
        if (def && !this.warehouse) this.warehouse = def.id;
      },
      error: () => {},
    });
    this.procurement.getVendors({ page_size: 200 }).subscribe({
      next: (d) => this.vendors.set(this.rows(d)), error: () => {},
    });
  }

  /** يقترح الصنف المخزني بمطابقة الاسم — ويترك القرار للمستخدم. */
  private buildLines(poItems: any[]) {
    if (!poItems.length) return;
    const inv = this.items();
    this.lines.set(poItems.map((it: any) => {
      const name = (it.item_name || '').trim();
      const guess = inv.find((x) =>
        (x.name_ar || '').trim() === name ||
        (name && (x.name_ar || '').includes(name)) ||
        (name && name.includes((x.name_ar || '').trim()) && (x.name_ar || '').length > 3));
      const qty = Number(it.quantity) || 0;
      return {
        name,
        unit: it.unit || '',
        ordered: qty,
        price: Number(it.unit_price) || 0,
        budgetAccount: it.budget_account_id,
        costCenter: it.cost_center_id,
        itemId: guess?.id || '',
        received: qty,
        matched: !!guess,
      };
    }));
  }

  private rows(d: any): any[] { return Array.isArray(d) ? d : (d?.data ?? d?.results ?? []); }

  back() { this.router.navigateByUrl('/inventory/receipts'); }
}
