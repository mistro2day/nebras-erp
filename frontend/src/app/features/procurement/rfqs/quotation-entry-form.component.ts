import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ProcurementService } from '../procurement.service';
import { NotificationService } from '../../../core/services/notification.service';
import { QuickVendorDialogComponent } from '../vendors/quick-vendor-dialog.component';

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
  imports: [CommonModule, FormsModule, MatDialogModule],
  template: `
    <div class="panel" dir="rtl">
      <div class="panel-head">
        <div class="ph-title">
          <span class="ph-ic">📩</span>
          <div>
            <h4>تسجيل عرض سعر</h4>
            <p>أدخل عرض المورّد كما ورد — يُحتسب الإجمالي آلياً من كميات الطلب.</p>
          </div>
        </div>
        <button class="x" (click)="cancel.emit()" aria-label="إغلاق">✕</button>
      </div>

      <!-- بيانات العرض — بنية موحّدة لكل حقل (تسمية + حقل) فتتحاذى الصفوف -->
      <div class="fieldset">
        <span class="legend">بيانات العرض</span>
        <div class="grid">
          <label>
            <span class="lbl">
              المورّد <b class="req">*</b>
              <button type="button" class="quick-add" (click)="quickAddVendor()">＋ تسجيل سريع</button>
            </span>
            <select [(ngModel)]="vendorId">
              <option value="">اختر المورّد…</option>
              @for (v of vendors(); track v.id) {
                <option [value]="v.id">{{ v.name_ar || v.name_en }}{{ v.status === 'pending' ? ' — تحت التأهيل' : '' }}</option>
              }
            </select>
          </label>
          <label>
            <span class="lbl">مرجع العرض</span>
            <input [(ngModel)]="reference" placeholder="اختياري — يُولَّد تلقائياً" />
          </label>
          <label>
            <span class="lbl">مدة التوريد (يوم)</span>
            <input type="number" min="1" [(ngModel)]="leadTime" placeholder="7" />
          </label>
        </div>
      </div>

      <!-- تسعير البنود -->
      <div class="fieldset">
        <span class="legend">تسعير البنود</span>
        <div class="lines">
          <div class="l head">
            <span>البند</span><span class="ta-end">الكمية</span><span>الوحدة</span>
            <span class="ta-end">سعر الوحدة</span><span class="ta-end">إجمالي البند</span>
          </div>
          @for (row of rows(); track row.rfq_item_id) {
            <div class="l" [class.priced]="(row.unit_price || 0) > 0">
              <span class="strong">{{ row.item_name }}</span>
              <span class="ta-end mono">{{ row.quantity }}</span>
              <span class="muted">{{ row.unit }}</span>
              <span class="price-cell">
                <input type="number" min="0" step="0.01" [(ngModel)]="row.unit_price" placeholder="0.00" />
              </span>
              <span class="ta-end line-total" [class.on]="(row.unit_price || 0) > 0">
                {{ lineTotal(row) | number:'1.0-2' }}
              </span>
            </div>
          }
          @if (rows().length === 0) { <div class="empty">لا توجد بنود في طلب عروض الأسعار.</div> }
        </div>
      </div>

      <div class="foot">
        <div class="total">
          <span class="t-lbl">إجمالي العرض</span>
          <strong>{{ total() | number:'1.0-2' }}</strong>
        </div>
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
    .panel { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 18px; margin: 14px 0; font-family: var(--nb-font-family); }

    .panel-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 18px; }
    .ph-title { display: flex; align-items: center; gap: 12px; }
    .ph-ic { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; font-size: 18px;
      background: var(--nb-primary-50); flex: none; }
    .panel-head h4 { margin: 0; font-size: 15px; font-weight: 800; color: var(--nb-text); }
    .panel-head p { margin: 2px 0 0; font-size: 12px; color: var(--nb-text-muted); }
    .x { background: none; border: none; font-size: 16px; color: var(--nb-text-muted); cursor: pointer; }

    .fieldset { border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius);
      padding: 16px 14px 14px; margin-bottom: 14px; position: relative; }
    .legend { position: absolute; top: -8px; inset-inline-start: 12px; background: var(--nb-surface);
      padding: 0 8px; font-size: 11px; font-weight: 800; color: var(--nb-text-muted); }

    /* شبكة موحّدة: كل خلية = تسمية بسطر ثابت + حقل بارتفاع واحد */
    .grid { display: grid; grid-template-columns: 1.6fr 1.1fr 0.9fr; gap: 14px; align-items: start; }
    @media (max-width: 820px) { .grid { grid-template-columns: 1fr; } }
    label { display: grid; grid-template-rows: 18px auto; gap: 6px; }
    .lbl { font-size: 12.5px; font-weight: 700; color: var(--nb-text); line-height: 18px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      display: flex; align-items: center; gap: 8px; }
    .req { color: var(--nb-danger); }
    /* زر التسجيل السريع داخل سطر التسمية — لا يزيد ارتفاع الصف */
    .quick-add { margin-inline-start: auto; background: none; border: none; padding: 0;
      font-family: inherit; font-size: 11.5px; font-weight: 800; line-height: 18px;
      color: var(--nb-primary-600); cursor: pointer; }
    .quick-add:hover { text-decoration: underline; }
    input, select { font-family: inherit; font-size: 13px; height: 38px; padding: 0 11px;
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); width: 100%; box-sizing: border-box; }
    input:focus, select:focus { outline: none; border-color: var(--nb-primary-400); box-shadow: 0 0 0 3px rgba(63,81,181,0.12); }
    input::placeholder { color: var(--nb-text-muted); opacity: .8; }

    /* سطور التسعير */
    .lines { border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius); overflow: hidden; }
    .l { display: grid; grid-template-columns: 2fr 0.7fr 0.7fr 1.1fr 1fr; gap: 10px; align-items: center;
      padding: 8px 12px; font-size: 13px; border-top: 1px solid var(--nb-border-soft); min-height: 54px; }
    .l.head { border-top: none; background: var(--nb-surface-raised); font-size: 11px;
      font-weight: 700; color: var(--nb-text-muted); min-height: 0; padding: 9px 12px; }
    .l.priced { background: color-mix(in srgb, var(--nb-primary-50) 40%, transparent); }
    .price-cell input { text-align: end; font-variant-numeric: tabular-nums; }
    .line-total { font-weight: 800; color: var(--nb-text-muted); font-variant-numeric: tabular-nums; }
    .line-total.on { color: var(--nb-primary-700); }
    .ta-end { text-align: end; } .mono { font-variant-numeric: tabular-nums; } .muted { color: var(--nb-text-muted); }
    .strong { font-weight: 700; color: var(--nb-text); }
    .empty { padding: 20px; text-align: center; font-size: 12.5px; color: var(--nb-text-muted); }

    .foot { display: flex; align-items: center; justify-content: space-between; margin-top: 4px;
      padding-top: 14px; border-top: 1px solid var(--nb-border-soft); }
    .total { display: flex; flex-direction: column; gap: 1px; }
    .t-lbl { font-size: 11.5px; color: var(--nb-text-muted); }
    .total strong { font-size: 20px; color: var(--nb-text); font-weight: 800; font-variant-numeric: tabular-nums; }
    .acts { display: flex; gap: 8px; }
    .btn { height: 36px; padding: 0 18px; font-family: inherit; font-size: 13px; font-weight: 700;
      border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
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
  private dialog = inject(MatDialog);

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

  /**
   * تسجيل مورّد سريع دون مغادرة نموذج العرض، ثم اختياره تلقائياً.
   * يوفّر الانتقال إلى سجل الموردين والعودة (نمط Quick Create).
   */
  quickAddVendor(): void {
    this.dialog.open(QuickVendorDialogComponent, { autoFocus: false, panelClass: 'nb-dialog-panel' })
      .afterClosed().subscribe((created: any) => {
        if (!created?.id) return;
        this.vendors.update(list => [created, ...list]);
        this.vendorId = created.id;          // اختياره فوراً
        this.notify.success(`تم تسجيل «${created.name_ar || created.name_en}» واختياره.`);
      });
  }

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
