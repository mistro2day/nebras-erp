import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NbModalComponent } from '../../../shared/nebras/nb-modal.component';
import { NbStepperComponent } from '../../../shared/nebras/nb-stepper.component';
import { tafqeetArabic } from '../journals/journal-voucher-print';

@Component({
  selector: 'app-voucher-create-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe, NbModalComponent, NbStepperComponent],
  template: `
    <nb-modal
      [open]="open"
      [title]="modalTitle()"
      subtitle="معالج إنشاء السندات المالية بنمط نبراس مع مراجعة الحسابات وتأكيد الإصدار."
      maxWidth="780px"
      (closed)="onCancel()"
    >
      <nb-stepper [steps]="steps" [current]="currentStep() + 1"></nb-stepper>

      <div class="step-content">
        <!-- الخطوة 1: نوع السند والبيانات الأساسية -->
        @if (currentStep() === 0) {
          <div class="form-grid">
            <label>
              <span>نوع السند المالي *</span>
              <select class="fld" [(ngModel)]="voucherType">
                <option value="payment">سند صرف مالي (Payment Voucher)</option>
                <option value="receipt">سند قبض مالي (Receipt Voucher)</option>
                <option value="journal">سند تسوية مالية (Journal Voucher)</option>
              </select>
            </label>

            <label>
              <span>رقم السند *</span>
              <input type="text" class="fld mono" [(ngModel)]="voucherNumber" placeholder="مثال: PV-2026-001" required />
            </label>

            <label>
              <span>تاريخ السند *</span>
              <input type="date" class="fld mono" [(ngModel)]="voucherDate" required />
            </label>

            <label>
              <span>العملة المعتمدة *</span>
              <select class="fld" [(ngModel)]="currencyId">
                @for (c of currencies; track c.id) {
                  <option [value]="c.id">{{ c.name_ar }} ({{ c.code }})</option>
                }
              </select>
            </label>
          </div>

          <div class="step-hint-box">
            <span class="hint-icon">💡</span>
            <span>يتم توليد السندات تلقائياً في حالة تحصيل الرسوم الدراسية أو سداد فواتير المشتريات، واستخدم هذا المعالج للإصدار اليدوي المباشر.</span>
          </div>
        }

        <!-- الخطوة 2: الحسابات والمبالغ -->
        @if (currentStep() === 1) {
          <div class="form-grid">
            <label>
              <span>طريقة الدفع / التحصيل *</span>
              <select class="fld" [(ngModel)]="paymentMethodId">
                <option value="">اختر طريقة السداد…</option>
                @for (m of methods; track m.id) {
                  <option [value]="m.id">{{ m.name_ar }}</option>
                }
              </select>
            </label>

            <label>
              <span>الحساب البنكي (إن وُجد)</span>
              <select class="fld" [(ngModel)]="bankAccountId">
                <option [ngValue]="null">— بدون (أو خيار نقدي) —</option>
                @for (b of bankAccounts; track b.id) {
                  <option [ngValue]="b.id">{{ b.bank_name }} - {{ b.account_number }}</option>
                }
              </select>
            </label>

            <label>
              <span>الصندوق / الخزينة النقدية</span>
              <select class="fld" [(ngModel)]="cashBoxId">
                <option [ngValue]="null">— بدون —</option>
                @for (cb of cashBoxes; track cb.id) {
                  <option [ngValue]="cb.id">{{ cb.name_ar }}</option>
                }
              </select>
            </label>

            <label>
              <span>الحساب المقابل في الدليل (GL) *</span>
              <select class="fld" [(ngModel)]="glAccountId">
                <option value="">اختر الحساب المحاسبي المقابل…</option>
                @for (a of accounts; track a.id) {
                  <option [value]="a.id">{{ a.code }} - {{ a.name_ar }}</option>
                }
              </select>
            </label>

            <label class="full-width">
              <span>المبلغ الإجمالي (بالجنيه السوداني ج.س) *</span>
              <input type="number" min="0.01" step="0.01" class="fld mono font-bold big-input" [(ngModel)]="amount" placeholder="0.00" />
            </label>

            @if (amount > 0) {
              <div class="tafqeet-preview full-width">
                <span class="t-lbl">التفقيط الرسمي:</span>
                <span class="t-val">{{ tafqeet(amount) }}</span>
              </div>
            }

            <label class="full-width">
              <span>البيان والغرض من السند *</span>
              <textarea class="fld-area" [(ngModel)]="description" rows="2" placeholder="اكتب بياناً واضحاً للعملية والمستفيد أو الدافع…"></textarea>
            </label>
          </div>
        }

        <!-- الخطوة 3: المراجعة والتأكيد النهائي -->
        @if (currentStep() === 2) {
          <div class="review-panel">
            <div class="review-summary-card">
              <div class="rev-row">
                <span class="k">نوع السند:</span>
                <span class="v badge" [class.payment]="voucherType === 'payment'" [class.receipt]="voucherType === 'receipt'">
                  {{ voucherTypeLabel() }}
                </span>
              </div>
              <div class="rev-row">
                <span class="k">رقم السند والتاريخ:</span>
                <span class="v mono font-bold">{{ voucherNumber }} — {{ voucherDate }}</span>
              </div>
              <div class="rev-row">
                <span class="k">طريقة الدفع:</span>
                <span class="v">{{ selectedMethodName() }}</span>
              </div>
              <div class="rev-row">
                <span class="k">الحساب البنكي / الخزينة:</span>
                <span class="v">{{ selectedSourceAccount() }}</span>
              </div>
              <div class="rev-row">
                <span class="k">الحساب المقابل (GL):</span>
                <span class="v">{{ selectedGlAccountName() }}</span>
              </div>
              <div class="rev-row highlight">
                <span class="k">المبلغ الإجمالي:</span>
                <span class="v amount mono font-bold">{{ amount | number:'1.2-2' }} جنيه سوداني</span>
              </div>
              <div class="rev-row">
                <span class="k">المبلغ كتابة:</span>
                <span class="v font-bold text-primary">{{ tafqeet(amount) }}</span>
              </div>
              <div class="rev-row">
                <span class="k">البيان المدون:</span>
                <span class="v">{{ description }}</span>
              </div>
            </div>

            <div class="confirm-notice">
              <div class="cn-icon">⚠️</div>
              <div class="cn-text">
                <strong>تأكيد إصدار السند المالي:</strong>
                <span>بالضغط على زر التأكيد أدناه، سيتم إنشاء السند وحفظه في سجلات النظام كمسودة جاهزة للاعتماد والترحيل المالي.</span>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- أزرار شريط الإجراءات السفلي -->
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
              {{ saving ? 'جارٍ حفظ السند…' : '✓ تأكيد وحفظ السند' }}
            </button>
          }
        </div>
      </div>
    </nb-modal>
  `,
  styles: [`
    .step-content { min-height: 280px; padding: 12px 4px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .full-width { grid-column: 1 / -1; }
    label { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; font-weight: 600; color: var(--nb-text); }
    .fld { height: 38px; padding: 0 12px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; width: 100%; box-sizing: border-box; }
    .fld.big-input { font-size: 16px; height: 42px; }
    .fld-area { padding: 8px 12px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; width: 100%; box-sizing: border-box; resize: vertical; }
    .fld:focus, .fld-area:focus { outline: none; border-color: var(--nb-primary-600); box-shadow: 0 0 0 2px rgba(30, 58, 138, 0.15); }
    .mono { font-family: 'Consolas', 'Courier New', monospace; }
    .font-bold { font-weight: 700; }
    .step-hint-box { margin-top: 18px; padding: 12px 14px; border-radius: 8px; background: #f0fdf4; border: 1px solid #bbf7d0; display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: #166534; }
    .tafqeet-preview { padding: 10px 14px; border-radius: 8px; background: #eff6ff; border: 1px solid #bfdbfe; display: flex; gap: 8px; align-items: center; font-size: 13px; }
    .t-lbl { font-weight: 700; color: #1e40af; }
    .t-val { font-weight: 800; color: #1e3a8a; }

    .review-summary-card { background: var(--nb-surface-raised, #f8fafc); border: 1px solid var(--nb-border); border-radius: 10px; padding: 16px; margin-bottom: 14px; }
    .rev-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--nb-border-soft, #e2e8f0); font-size: 13px; }
    .rev-row:last-child { border-bottom: none; }
    .rev-row .k { color: var(--nb-text-muted); font-weight: 600; }
    .rev-row .v { color: var(--nb-text); font-weight: 700; }
    .rev-row.highlight { background: rgba(30, 58, 138, 0.05); margin: 6px -16px; padding: 10px 16px; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; }
    .rev-row .v.amount { font-size: 18px; color: #1e3a8a; }

    .confirm-notice { display: flex; gap: 12px; padding: 12px 16px; border-radius: 8px; background: #fefce8; border: 1px solid #fef08a; color: #854d0e; font-size: 12.5px; }
    .cn-icon { font-size: 20px; }
    .cn-text { display: flex; flex-direction: column; gap: 3px; }

    .badge { padding: 3px 10px; border-radius: 6px; font-size: 11.5px; font-weight: 700; }
    .badge.payment { background: #fee2e2; color: #991b1b; }
    .badge.receipt { background: #dcfce7; color: #166534; }

    .wizard-actions { display: flex; justify-content: space-between; align-items: center; width: 100%; margin-top: 10px; }
    .right-actions, .left-actions { display: flex; gap: 10px; }
    .btn { height: 38px; padding: 0 16px; font-family: inherit; font-size: 13px; font-weight: 700; border-radius: var(--nb-radius); cursor: pointer; border: none; display: inline-flex; align-items: center; justify-content: center; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.primary:hover:not(:disabled) { background: var(--nb-primary-700); }
    .btn.secondary { background: #e2e8f0; color: #1e293b; }
    .btn.success { background: #16a34a; color: #fff; }
    .btn.success:hover:not(:disabled) { background: #15803d; }
    .btn.ghost { background: transparent; border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; }
  `]
})
export class VoucherCreateModalComponent {
  @Input() open = false;
  @Input() currencies: any[] = [];
  @Input() methods: any[] = [];
  @Input() accounts: any[] = [];
  @Input() bankAccounts: any[] = [];
  @Input() cashBoxes: any[] = [];
  @Input() saving = false;

  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<any>();

  currentStep = signal(0);

  voucherType = 'payment';
  voucherNumber = '';
  voucherDate = new Date().toISOString().split('T')[0];
  currencyId = '';
  paymentMethodId = '';
  bankAccountId: string | null = null;
  cashBoxId: string | null = null;
  glAccountId = '';
  amount = 0;
  description = '';

  steps: string[] = [
    'البيانات الأساسية',
    'الحسابات والمبلغ',
    'المراجعة والتأكيد',
  ];

  modalTitle = computed(() => {
    return this.voucherType === 'payment' ? 'إنشاء سند صرف مالي جديد' :
      (this.voucherType === 'receipt' ? 'إنشاء سند قبض مالي جديد' : 'إنشاء سند تسوية مالية');
  });

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
      return !!this.voucherType && !!this.voucherNumber.trim() && !!this.voucherDate;
    }
    if (this.currentStep() === 1) {
      return !!this.paymentMethodId && !!this.glAccountId && this.amount > 0 && !!this.description.trim();
    }
    return true;
  }

  tafqeet(amt: number): string {
    return tafqeetArabic(amt, 'جنيه سوداني');
  }

  voucherTypeLabel(): string {
    return this.voucherType === 'payment' ? 'سند صرف مالي' :
      (this.voucherType === 'receipt' ? 'سند قبض مالي' : 'سند تسوية مالية');
  }

  selectedMethodName(): string {
    return this.methods.find(m => m.id === this.paymentMethodId)?.name_ar || '—';
  }

  selectedSourceAccount(): string {
    if (this.bankAccountId) {
      const b = this.bankAccounts.find(x => x.id === this.bankAccountId);
      return b ? `${b.bank_name} (${b.account_number})` : 'حساب بنكي';
    }
    if (this.cashBoxId) {
      const cb = this.cashBoxes.find(x => x.id === this.cashBoxId);
      return cb ? `${cb.name_ar} (صندوق نقدي)` : 'صندوق نقدي';
    }
    return 'الخزينة النقدية الرئيسية';
  }

  selectedGlAccountName(): string {
    const a = this.accounts.find(x => x.id === this.glAccountId);
    return a ? `${a.code} - ${a.name_ar}` : '—';
  }

  onCancel() {
    this.currentStep.set(0);
    this.cancel.emit();
  }

  onConfirm() {
    const payload = {
      voucher_type: this.voucherType,
      voucher_number: this.voucherNumber.trim(),
      date: this.voucherDate,
      currency: this.currencyId || (this.currencies.find(c => c.is_base)?.id || this.currencies[0]?.id),
      payment_method: this.paymentMethodId,
      bank_account: this.bankAccountId || null,
      cash_box: this.cashBoxId || null,
      gl_account: this.glAccountId,
      amount: Number(this.amount),
      description: this.description.trim(),
      status: 'draft'
    };
    this.confirm.emit(payload);
  }
}
