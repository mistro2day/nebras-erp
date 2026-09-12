import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NbModalComponent } from '../../../shared/nebras/nb-modal.component';
import { NbStepperComponent } from '../../../shared/nebras/nb-stepper.component';
import { NbDatepickerComponent } from '../../../shared/nebras/nb-datepicker.component';
import { NbSearchableSelectComponent } from '../../../shared/nebras/nb-searchable-select.component';
import { tafqeetArabic } from '../journals/journal-voucher-print';

@Component({
  selector: 'app-voucher-create-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe, NbModalComponent, NbStepperComponent, NbDatepickerComponent, NbSearchableSelectComponent],
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
              <select class="fld" [(ngModel)]="voucherType" (change)="onTypeChange()">
                <option value="payment">سند صرف مالي (Payment Voucher)</option>
                <option value="receipt">سند قبض مالي (Receipt Voucher)</option>
                <option value="journal">سند تسوية مالية (Journal Voucher)</option>
              </select>
            </label>

            <label>
              <div class="fld-header-row">
                <span>رقم السند *</span>
                @if (autoNumber()) {
                  <span class="auto-badge">⚡ توليد آلي</span>
                }
              </div>
              <div class="auto-input-wrap">
                <input
                  type="text"
                  class="fld mono"
                  [class.auto-active]="autoNumber()"
                  [(ngModel)]="voucherNumber"
                  [readonly]="autoNumber()"
                  placeholder="يتم التوليد آلياً بواسطة النظام…"
                  required
                />
                <button
                  type="button"
                  class="btn-toggle-auto"
                  (click)="toggleAutoNumber()"
                  [title]="autoNumber() ? 'التبديل إلى الإدخال اليدوي' : 'العودة للتوليد الآلي'"
                >
                  {{ autoNumber() ? '✏️ تعديل' : '⚡ آلي' }}
                </button>
              </div>
            </label>

            <label>
              <span>تاريخ السند *</span>
              <nb-datepicker [(value)]="voucherDate" ariaLabel="تاريخ السند"></nb-datepicker>
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
            <span>يتم ترقيم السندات المالية آلياً بالتسلسل المالي المعتمد، ويمكنك التحويل للإدخال اليدوي عند تسجيل سند ورقي سابق.</span>
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
              <nb-searchable-select
                [items]="accounts"
                [(value)]="glAccountId"
                placeholder="اختر الحساب المحاسبي المقابل…"
                searchPlaceholder="ابحث برقم الحساب أو الاسم (مثال: 1200 أو مصروفات)…"
              ></nb-searchable-select>
            </label>

            <label class="full-width">
              <span>المبلغ الإجمالي المالي (ج.س) *</span>
              <input type="number" class="fld mono font-bold big-input" [(ngModel)]="amount" min="1" step="any" placeholder="0.00" required />
            </label>

            @if (amount > 0) {
              <div class="full-width tafqeet-preview">
                <span class="t-lbl">المبلغ كتابة باللغة العربية:</span>
                <span class="t-val">{{ tafqeet(amount) }}</span>
              </div>
            }

            <label class="full-width">
              <span>البيان والغرض المالي من السند *</span>
              <textarea class="fld-area" [(ngModel)]="description" rows="2" placeholder="اكتب بياناً مفصلاً عن الغرض من السند والطرف المستفيد…" required></textarea>
            </label>
          </div>
        }

        <!-- الخطوة 3: المراجعة والتأكيد النهائي -->
        @if (currentStep() === 2) {
          <div class="step-review">
            <div class="review-summary-card">
              <div class="rev-row">
                <span class="k">نوع السند:</span>
                <span class="v badge" [class.payment]="voucherType === 'payment'" [class.receipt]="voucherType === 'receipt'">
                  {{ voucherTypeLabel() }}
                </span>
              </div>
              <div class="rev-row">
                <span class="k">رقم السند والتاريخ:</span>
                <span class="v mono font-bold">
                  {{ voucherNumber || 'توليد تلقائي' }}
                  @if (autoNumber()) { <span class="auto-badge-sm">آلي</span> }
                  — {{ voucherDate }}
                </span>
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
    .fld-header-row { display: flex; justify-content: space-between; align-items: center; }
    .auto-badge { font-size: 11px; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 12px; font-weight: 700; }
    .auto-badge-sm { font-size: 10px; background: #e0f2fe; color: #0369a1; padding: 1px 6px; border-radius: 8px; font-weight: 700; margin: 0 4px; }
    .auto-input-wrap { display: flex; gap: 6px; align-items: center; width: 100%; }
    .auto-input-wrap .fld { flex: 1; }
    .auto-input-wrap .fld.auto-active { background: #f8fafc; color: #1e3a8a; font-weight: 700; border-color: #cbd5e1; }
    .btn-toggle-auto { height: 38px; padding: 0 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); background: var(--nb-surface); color: var(--nb-text-muted); cursor: pointer; font-size: 11.5px; font-weight: 600; white-space: nowrap; }
    .btn-toggle-auto:hover { background: var(--nb-surface-raised); color: var(--nb-text); }
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
export class VoucherCreateModalComponent implements OnInit, OnChanges {
  private http = inject(HttpClient);

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
  autoNumber = signal(true);

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

  ngOnInit(): void {
    this.refreshNextVoucherNumber();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue === true) {
      this.currentStep.set(0);
      if (this.autoNumber()) {
        this.refreshNextVoucherNumber();
      }
    }
  }

  onTypeChange(): void {
    if (this.autoNumber()) {
      this.refreshNextVoucherNumber();
    }
  }

  toggleAutoNumber(): void {
    this.autoNumber.update(a => !a);
    if (this.autoNumber()) {
      this.refreshNextVoucherNumber();
    }
  }

  refreshNextVoucherNumber(): void {
    const base = (environment.apiUrl || '/api/v1/').replace(/\/?$/, '/');
    this.http.get<any>(`${base}finance/vouchers/next-number/?voucher_type=${this.voucherType}`).subscribe({
      next: (res) => {
        if (res?.next_number) {
          this.voucherNumber = res.next_number;
        } else {
          this.generateFallbackNumber();
        }
      },
      error: () => {
        this.generateFallbackNumber();
      }
    });
  }

  private generateFallbackNumber(): void {
    const prefix = this.voucherType === 'payment' ? 'PV-' : (this.voucherType === 'receipt' ? 'RV-' : 'JV-');
    const year = new Date().getFullYear();
    this.voucherNumber = `${prefix}${year}-${String(Math.floor(1000 + Math.random() * 9000)).padStart(4, '0')}`;
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
      const hasNumber = this.autoNumber() || !!this.voucherNumber.trim();
      return !!this.voucherType && hasNumber && !!this.voucherDate;
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
      voucher_number: this.autoNumber() ? (this.voucherNumber || 'AUTO') : this.voucherNumber.trim(),
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
