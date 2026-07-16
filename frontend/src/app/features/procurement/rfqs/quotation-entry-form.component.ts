import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProcurementService } from '../procurement.service';
import { NotificationService } from '../../../core/services/notification.service';

interface PriceRow { rfq_item_id: string; item_name: string; quantity: number; unit: string; unit_price: number | null; }

/**
 * تسجيل عرض سعر مورّد على طلب عروض الأسعار.
 *
 * هذه الحلقة تصل RFQ بالترسية: بدون عروض مسجّلة لا يمكن الترسية، فلا يتولّد أمر
 * شراء ولا يصل شيء للمالية. يُدخل موظف المشتريات سعر الوحدة لكل بند كما ورد من
 * المورّد (نمط إدخال عرض المورّد في Odoo/D365) ويُحتسب الإجمالي آلياً.
 */
@Component({
  selector: 'app-quotation-entry-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="panel" dir="rtl">
      <div class="panel-head">
        <h4>تسجيل عرض سعر — {{ rfqNumber() }}</h4>
        <button class="x" (click)="cancel.emit()" aria-label="إغلاق">✕</button>
      </div>

      <div class="grid">
        <label>المورّد <b class="req">*</b>
          <select [(ngModel)]="vendorId">
            <option value="">اختر المورّد…</option>
            @for (v of vendors(); track v.id) { <option [value]="v.id">{{ v.name_ar || v.name_en }}</option> }
          </select>
        </label>
        <label>مرجع العرض
          <input [(ngModel)]="reference" placeholder="رقم عرض المورّد" />
        </label>
        <label>مدة التوريد (يوم)
          <input type="number" min="1" [(ngModel)]="leadTime" />
        </label>
      </div>

      <div class="lines">
        <div class="l head"><span>البند</span><span class="ta-end">الكمية</span><span>الوحدة</span>
          <span class="ta-end">سعر الوحدة</span><span class="ta-end">الإجمالي</span></div>
        @for (row of rows(); track row.rfq_item_id) {
          <div class="l">
            <span class="strong">{{ row.item_name }}</span>
            <span class="ta-end mono">{{ row.quantity }}</span>
            <span class="muted">{{ row.unit }}</span>
            <span class="ta-end"><input type="number" min="0" step="0.01" [(ngModel)]="row.unit_price" placeholder="0.00" /></span>
            <span class="ta-end strong">{{ lineTotal(row) | number:'1.0-2' }}</span>
          </div>
        }
        @if (rows().length === 0) { <div class="empty">لا توجد بنود في طلب عروض الأسعار.</div> }
      </div>

      <div class="foot">
        <div class="total">إجمالي العرض: <strong>{{ total() | number:'1.0-2' }}</strong></div>
        <div class="acts">
          <button class="btn ghost" (click)="cancel.emit()">إلغاء</button>
          <button class="btn primary" [disabled]="saving()" (click)="submit()">
            {{ saving() ? 'جارٍ الحفظ…' : 'حفظ عرض السعر' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .panel { background: var(--nb-surface-raised); border: 1px dashed var(--nb-primary-300);
      border-radius: var(--nb-radius); padding: 14px; margin: 12px 0; font-family: var(--nb-font-family); }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .panel-head h4 { margin: 0; font-size: 13.5px; font-weight: 800; color: var(--nb-text); }
    .x { background: none; border: none; font-size: 15px; color: var(--nb-text-muted); cursor: pointer; }
    .grid { display: grid; grid-template-columns: 1.6fr 1.2fr 0.8fr; gap: 10px; margin-bottom: 12px; }
    @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
    label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; font-weight: 700; color: var(--nb-text); }
    .req { color: var(--nb-danger); }
    input, select { font-family: inherit; font-size: 12.5px; padding: 7px 9px; border: 1px solid var(--nb-border);
      border-radius: 8px; background: var(--nb-surface); color: var(--nb-text); width: 100%; box-sizing: border-box; }
    input:focus, select:focus { outline: none; border-color: var(--nb-primary-400); box-shadow: 0 0 0 3px rgba(63,81,181,0.12); }
    .lines { background: var(--nb-surface); border: 1px solid var(--nb-border-soft); border-radius: 8px; overflow: hidden; }
    .l { display: grid; grid-template-columns: 1.8fr 0.7fr 0.7fr 1fr 1fr; gap: 8px; align-items: center;
      padding: 8px 12px; font-size: 12.5px; border-top: 1px solid var(--nb-border-soft); }
    .l.head { border-top: none; background: var(--nb-surface-raised); font-size: 10.5px; font-weight: 700; color: var(--nb-text-muted); }
    .ta-end { text-align: end; } .mono { font-variant-numeric: tabular-nums; } .muted { color: var(--nb-text-muted); }
    .strong { font-weight: 700; color: var(--nb-text); }
    .empty { padding: 18px; text-align: center; font-size: 12.5px; color: var(--nb-text-muted); }
    .foot { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; }
    .total { font-size: 12.5px; color: var(--nb-text-muted); }
    .total strong { font-size: 16px; color: var(--nb-text); font-weight: 800; }
    .acts { display: flex; gap: 8px; }
    .btn { height: 32px; padding: 0 16px; font-family: inherit; font-size: 12.5px; font-weight: 700;
      border-radius: 8px; cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.primary:disabled { opacity: .6; }
  `]
})
export class QuotationEntryFormComponent implements OnInit {
  readonly rfqId = input.required<string>();
  readonly rfqNumber = input<string>('');
  readonly saved = output<void>();
  readonly cancel = output<void>();

  private svc = inject(ProcurementService);
  private notify = inject(NotificationService);

  readonly vendors = signal<any[]>([]);
  readonly rows = signal<PriceRow[]>([]);
  readonly saving = signal(false);

  vendorId = ''; reference = ''; leadTime = 7;

  readonly total = computed(() => this.rows().reduce((s, r) => s + this.lineTotal(r), 0));

  ngOnInit() {
    const pick = (d: any) => Array.isArray(d) ? d : (d?.data ?? d?.results ?? []);
    this.svc.getVendors({ page_size: 200 }).subscribe({
      next: (d: any) => this.vendors.set(pick(d).filter((v: any) => v.status !== 'blacklisted')),
      error: () => {},
    });
    // بنود الـ RFQ هي أساس التسعير
    this.svc.getRFQ(this.rfqId()).subscribe({
      next: (res: any) => {
        const rfq = res?.data ?? res;
        this.rows.set((rfq?.items || []).map((i: any) => ({
          rfq_item_id: i.id, item_name: i.item_name,
          quantity: Number(i.quantity) || 0, unit: i.unit, unit_price: null,
        })));
      },
      error: () => {},
    });
  }

  lineTotal(r: PriceRow): number { return (Number(r.unit_price) || 0) * (Number(r.quantity) || 0); }

  submit() {
    if (!this.vendorId) { this.notify.error('اختر المورّد.'); return; }
    const priced = this.rows().filter(r => r.unit_price !== null && Number(r.unit_price) > 0);
    if (priced.length === 0) { this.notify.error('أدخل سعر بند واحد على الأقل.'); return; }

    this.saving.set(true);
    this.svc.submitQuotation(this.rfqId(), {
      vendor_id: this.vendorId,
      quotation_reference: this.reference.trim() || `Q-${this.rfqNumber()}`,
      lead_time_days: Number(this.leadTime) || 7,
      items: priced.map(r => ({ rfq_item_id: r.rfq_item_id, unit_price: Number(r.unit_price) })),
    }).subscribe({
      next: () => { this.saving.set(false); this.notify.success('تم تسجيل عرض السعر.'); this.saved.emit(); },
      error: (e) => { this.saving.set(false); this.notify.error(e?.details?.error || e?.message || 'تعذّر حفظ العرض.'); },
    });
  }
}
