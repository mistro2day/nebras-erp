import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NbModalComponent } from '../../../shared/nebras/nb-modal.component';
import { NbStepperComponent } from '../../../shared/nebras/nb-stepper.component';
import { tafqeetArabic } from '../../finance/journals/journal-voucher-print';

export interface PurchaseOrderItemInput {
  item_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  budget_account_id: string;
  cost_center_id: string;
}

@Component({
  selector: 'app-purchase-order-create-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe, NbModalComponent, NbStepperComponent],
  template: `
    <nb-modal
      [open]="open"
      title="إنشاء أمر شراء رسمي جديد (Purchase Order)"
      subtitle="معالج متعدد الخطوات بنمط نبراس مع ربط الأبعاد المالية والتأكيد النهائي."
      maxWidth="880px"
      (closed)="onCancel()"
    >
      <nb-stepper [steps]="steps" [current]="currentStep() + 1"></nb-stepper>

      <div class="step-content">
        <!-- الخطوة 1: المورد والبيانات الأساسية -->
        @if (currentStep() === 0) {
          <div class="form-grid">
            <label>
              <span>المورّد المعتمد *</span>
              <select class="fld" [(ngModel)]="vendorId" required>
                <option value="">اختر المورّد…</option>
                @for (v of vendors; track v.id) {
                  <option [value]="v.id">{{ v.name }} ({{ v.phone || v.city || 'الخرطوم' }})</option>
                }
              </select>
            </label>

            <label>
              <span>رقم أمر الشراء *</span>
              <input type="text" class="fld mono" [(ngModel)]="poNumber" placeholder="مثال: PO-2026-001" required />
            </label>

            <label>
              <span>تاريخ أمر الشراء *</span>
              <input type="date" class="fld mono" [(ngModel)]="orderDate" required />
            </label>

            <label>
              <span>شروط الدفع والتسليم</span>
              <input type="text" class="fld" [(ngModel)]="paymentTerms" placeholder="مثال: سداد خلال 15 يوماً من الاستلام والفحص" />
            </label>
          </div>

          <div class="hint-box">
            <span class="hint-ic">ℹ️</span>
            <span>أمر الشراء يُعد التزاماً مالياً قانونياً تجاه المورّد. عند إصدار الأمر، يتم حجز واستهلاك الموازنة المخصصة في حسابات المشتريات.</span>
          </div>
        }

        <!-- الخطوة 2: البنود والأصناف والأبعاد المالية -->
        @if (currentStep() === 1) {
          <div class="items-builder">
            <div class="builder-header">
              <span class="sec-title">بنود وأصناف أمر الشراء</span>
              <button type="button" class="btn primary xs" (click)="addItem()">+ إضافة صنف</button>
            </div>

            <div class="table-wrap">
              <table class="nb-table">
                <thead>
                  <tr>
                    <th style="width: 25%;">اسم الصنف والبيان *</th>
                    <th style="width: 10%;">الوحدة</th>
                    <th style="width: 12%;" class="end">الكمية *</th>
                    <th style="width: 15%;" class="end">سعر الوحدة (ج.س) *</th>
                    <th style="width: 18%;">حساب الموازنة</th>
                    <th style="width: 15%;">مركز التكلفة</th>
                    <th style="width: 5%;"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (it of items; track $index) {
                    <tr>
                      <td>
                        <input type="text" class="fld-sm" [(ngModel)]="it.item_name" placeholder="اسم الصنف المطلوب" required />
                      </td>
                      <td>
                        <input type="text" class="fld-sm center" [(ngModel)]="it.unit" placeholder="حبة / طرد" />
                      </td>
                      <td>
                        <input type="number" min="1" class="fld-sm end mono" [(ngModel)]="it.quantity" (ngModelChange)="onCalc()" placeholder="1" required />
                      </td>
                      <td>
                        <input type="number" min="0" step="0.5" class="fld-sm end mono" [(ngModel)]="it.unit_price" (ngModelChange)="onCalc()" placeholder="0.00" required />
                      </td>
                      <td>
                        <select class="fld-sm" [(ngModel)]="it.budget_account_id">
                          <option value="">— اختر الحساب —</option>
                          @for (a of accounts; track a.id) {
                            <option [value]="a.id">{{ a.code }} - {{ a.name_ar }}</option>
                          }
                        </select>
                      </td>
                      <td>
                        <select class="fld-sm" [(ngModel)]="it.cost_center_id">
                          <option value="">— مركز التكلفة —</option>
                          @for (c of costCenters; track c.id) {
                            <option [value]="c.id">{{ c.name_ar || c.name }}</option>
                          }
                        </select>
                      </td>
                      <td class="center">
                        <button type="button" class="btn-del" (click)="removeItem($index)" [disabled]="items.length === 1" title="حذف السطر">✕</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="total-summary-bar">
              <div class="total-calc">
                <span>الإجمالي المحسوب:</span>
                <strong class="total-val mono">{{ totalAmount() | number:'1.2-2' }}</strong>
                <span>جنيه سوداني (ج.س)</span>
              </div>
              <div class="total-tafqeet-preview">
                {{ tafqeet(totalAmount()) }}
              </div>
            </div>
          </div>
        }

        <!-- الخطوة 3: المراجعة والتأكيد النهائي -->
        @if (currentStep() === 2) {
          <div class="review-panel">
            <div class="review-card">
              <div class="rev-row">
                <span class="k">المورّد المعني:</span>
                <span class="v font-bold">{{ selectedVendorName() }}</span>
              </div>
              <div class="rev-row">
                <span class="k">رقم أمر الشراء والتاريخ:</span>
                <span class="v mono font-bold">{{ poNumber }} — {{ orderDate }}</span>
              </div>
              <div class="rev-row">
                <span class="k">شروط الدفع:</span>
                <span class="v">{{ paymentTerms || 'سداد آجل بعد الفحص والاستلام' }}</span>
              </div>
              <div class="rev-row">
                <span class="k">عدد البنود المضافة:</span>
                <span class="v mono">{{ items.length }} صنف</span>
              </div>
              <div class="rev-row highlight">
                <span class="k">القيمة الإجمالية لأمر الشراء:</span>
                <span class="v amount mono font-bold">{{ totalAmount() | number:'1.2-2' }} جنيه سوداني</span>
              </div>
              <div class="rev-row">
                <span class="k">المبلغ كتابة:</span>
                <span class="v font-bold text-primary">{{ tafqeet(totalAmount()) }}</span>
              </div>
            </div>

            <!-- جدول مختصر للبنود -->
            <div class="mini-items-review">
              <div class="mini-title">كشف البنود المختارة:</div>
              <table class="nb-table mini">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>الصنف</th>
                    <th class="center">الكمية</th>
                    <th class="end">سعر الوحدة</th>
                    <th class="end">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  @for (it of items; track $index) {
                    <tr>
                      <td class="mono center">{{ $index + 1 }}</td>
                      <td><strong>{{ it.item_name }}</strong></td>
                      <td class="mono center">{{ it.quantity }} {{ it.unit }}</td>
                      <td class="mono end">{{ it.unit_price | number:'1.2-2' }}</td>
                      <td class="mono end font-bold">{{ (it.quantity * it.unit_price) | number:'1.2-2' }} ج.س</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="confirm-alert">
              <span class="ca-icon">📝</span>
              <div class="ca-content">
                <strong>رسالة تأكيد الاعتماد المالي:</strong>
                <span>سيتم حفظ أمر الشراء بحالة «مسودة» تمهيداً للاعتماد الإداري والإصدار للمورّد وربط الفاتورة لاحقاً.</span>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- شريط الإجراءات السفلي -->
      <div modal-actions class="wizard-actions">
        <div class="left-actions">
          <button type="button" class="btn ghost" (click)="onCancel()" [disabled]="saving">إلغاء</button>
        </div>
        <div class="right-actions">
          @if (currentStep() > 0) {
            <button type="button" class="btn secondary" (click)="prevStep()" [disabled]="saving">‹ السابق</button>
          }
          @if (currentStep() < steps.length - 1) {
            <button type="button" class="btn primary" (click)="nextStep()" [disabled]="!canProceed()">
              التالي ›
            </button>
          } @else {
            <button type="button" class="btn success" (click)="onConfirm()" [disabled]="saving || !canProceed()">
              {{ saving ? 'جارٍ الحفظ…' : '✓ تأكيد وحفظ أمر الشراء' }}
            </button>
          }
        </div>
      </div>
    </nb-modal>
  `,
  styles: [`
    .step-content { min-height: 310px; padding: 12px 4px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    label { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; font-weight: 600; color: var(--nb-text); }
    .fld { height: 38px; padding: 0 12px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; width: 100%; box-sizing: border-box; }
    .fld:focus { outline: none; border-color: var(--nb-primary-600); box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.15); }
    .mono { font-family: 'Consolas', 'Courier New', monospace; }
    .font-bold { font-weight: 700; }
    .center { text-align: center; }
    .end { text-align: end; }

    .hint-box { margin-top: 18px; padding: 12px 14px; border-radius: 8px; background: #f0fdfa; border: 1px solid #99f6e4; display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: #0f766e; }

    .items-builder { display: flex; flex-direction: column; gap: 12px; }
    .builder-header { display: flex; justify-content: space-between; align-items: center; }
    .sec-title { font-size: 13.5px; font-weight: 700; color: var(--nb-text); }
    .table-wrap { overflow-x: auto; max-height: 240px; border: 1px solid var(--nb-border); border-radius: 8px; }
    .nb-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    .nb-table th { background: var(--nb-surface-raised); padding: 8px 10px; font-size: 11px; font-weight: 700; color: var(--nb-text-muted); text-align: start; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table td { padding: 6px 8px; border-bottom: 1px solid var(--nb-border-row); }
    .fld-sm { height: 30px; padding: 0 8px; border: 1px solid var(--nb-border); border-radius: 6px; background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 12px; width: 100%; box-sizing: border-box; }
    .fld-sm:focus { outline: none; border-color: var(--nb-primary-600); }
    .btn-del { width: 26px; height: 26px; border: none; background: #fee2e2; color: #dc2626; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 700; }
    .btn-del:hover:not(:disabled) { background: #fecaca; }
    .btn-del:disabled { opacity: 0.4; cursor: not-allowed; }

    .total-summary-bar { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; font-size: 13px; }
    .total-calc { display: flex; align-items: baseline; gap: 8px; color: #0f766e; }
    .total-val { font-size: 18px; font-weight: 900; }
    .total-tafqeet-preview { font-size: 12px; font-weight: 700; color: #115e59; background: #ffffff; padding: 4px 10px; border-radius: 6px; border: 1px solid #ccfbf1; }

    .review-panel { display: flex; flex-direction: column; gap: 12px; }
    .review-card { background: var(--nb-surface-raised, #f8fafc); border: 1px solid var(--nb-border); border-radius: 8px; padding: 14px; }
    .rev-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--nb-border-soft); font-size: 12.5px; }
    .rev-row:last-child { border-bottom: none; }
    .rev-row .k { color: var(--nb-text-muted); font-weight: 600; }
    .rev-row .v { color: var(--nb-text); font-weight: 700; }
    .rev-row.highlight { background: rgba(15, 118, 110, 0.08); margin: 4px -14px; padding: 8px 14px; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; }
    .rev-row .v.amount { font-size: 17px; color: #0f766e; }

    .mini-items-review { border: 1px solid var(--nb-border); border-radius: 8px; padding: 10px; background: var(--nb-surface); }
    .mini-title { font-size: 12px; font-weight: 700; color: var(--nb-text-muted); margin-bottom: 6px; }
    .nb-table.mini td { padding: 4px 8px; font-size: 11.5px; }

    .confirm-alert { display: flex; gap: 10px; padding: 10px 14px; border-radius: 8px; background: #fefce8; border: 1px solid #fef08a; color: #854d0e; font-size: 12px; }
    .ca-icon { font-size: 18px; }

    .wizard-actions { display: flex; justify-content: space-between; align-items: center; width: 100%; margin-top: 10px; }
    .right-actions, .left-actions { display: flex; gap: 10px; }
    .btn { height: 38px; padding: 0 16px; font-family: inherit; font-size: 13px; font-weight: 700; border-radius: var(--nb-radius); cursor: pointer; border: none; display: inline-flex; align-items: center; justify-content: center; }
    .btn.xs { height: 28px; padding: 0 10px; font-size: 11.5px; }
    .btn.primary { background: #0f766e; color: #fff; }
    .btn.primary:hover:not(:disabled) { background: #115e59; }
    .btn.secondary { background: #e2e8f0; color: #1e293b; }
    .btn.success { background: #16a34a; color: #fff; }
    .btn.success:hover:not(:disabled) { background: #15803d; }
    .btn.ghost { background: transparent; border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; }
  `]
})
export class PurchaseOrderCreateModalComponent {
  @Input() open = false;
  @Input() vendors: any[] = [];
  @Input() accounts: any[] = [];
  @Input() costCenters: any[] = [];
  @Input() saving = false;

  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<any>();

  currentStep = signal(0);

  vendorId = '';
  poNumber = 'PO-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900);
  orderDate = new Date().toISOString().split('T')[0];
  paymentTerms = 'سداد بعد 15 يوماً من استلام وفحص البضاعة';

  items: PurchaseOrderItemInput[] = [
    { item_name: '', quantity: 1, unit: 'حبة', unit_price: 0, budget_account_id: '', cost_center_id: '' }
  ];

  steps: string[] = [
    'بيانات المورّد',
    'الأصناف والأسعار',
    'المراجعة والتأكيد',
  ];

  totalAmount = computed(() => {
    return this.items.reduce((sum, it) => sum + ((Number(it.quantity) || 0) * (Number(it.unit_price) || 0)), 0);
  });

  onCalc() {
    // trigger recalculation
  }

  addItem() {
    this.items.push({
      item_name: '',
      quantity: 1,
      unit: 'حبة',
      unit_price: 0,
      budget_account_id: '',
      cost_center_id: ''
    });
  }

  removeItem(idx: number) {
    if (this.items.length > 1) {
      this.items.splice(idx, 1);
    }
  }

  onStepChange(step: number) {
    if (step <= this.currentStep() || this.canProceed()) {
      this.currentStep.set(step);
    }
  }

  nextStep() {
    if (this.canProceed() && this.currentStep() < this.steps.length - 1) {
      this.currentStep.update(s => s + 1);
    }
  }

  prevStep() {
    if (this.currentStep() > 0) {
      this.currentStep.update(s => s - 1);
    }
  }

  canProceed(): boolean {
    if (this.currentStep() === 0) {
      return !!this.vendorId && !!this.poNumber.trim() && !!this.orderDate;
    }
    if (this.currentStep() === 1) {
      return this.items.length > 0 &&
        this.items.every(it => !!it.item_name.trim() && Number(it.quantity) > 0 && Number(it.unit_price) >= 0);
    }
    return true;
  }

  tafqeet(amt: number): string {
    return tafqeetArabic(amt, 'جنيه سوداني');
  }

  selectedVendorName(): string {
    return this.vendors.find(v => v.id === this.vendorId)?.name || '—';
  }

  onCancel() {
    this.currentStep.set(0);
    this.cancel.emit();
  }

  onConfirm() {
    const payload = {
      vendor: this.vendorId,
      po_number: this.poNumber.trim(),
      date: this.orderDate,
      payment_terms: this.paymentTerms.trim(),
      total_amount: this.totalAmount(),
      status: 'draft',
      items: this.items.map(it => ({
        item_name: it.item_name.trim(),
        quantity: Number(it.quantity),
        unit: it.unit.trim() || 'حبة',
        unit_price: Number(it.unit_price),
        total_price: Number(it.quantity) * Number(it.unit_price),
        budget_account_id: it.budget_account_id || null,
        cost_center_id: it.cost_center_id || null,
      }))
    };
    this.confirm.emit(payload);
  }
}
