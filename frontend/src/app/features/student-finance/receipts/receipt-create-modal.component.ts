import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentFinanceService } from '../student-finance.service';
import { StudentsService } from '../../students/students.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbModalComponent } from '../../../shared/nebras/nb-modal.component';
import { NbStepperComponent } from '../../../shared/nebras/nb-stepper.component';
import { NbSearchableSelectComponent, NbSelectItem } from '../../../shared/nebras/nb-searchable-select.component';
import { tafqeetArabic } from '../../finance/journals/journal-voucher-print';

@Component({
  selector: 'app-receipt-create-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    NbModalComponent,
    NbStepperComponent,
    NbSearchableSelectComponent,
  ],
  template: `
    <nb-modal
      [open]="open"
      title="استلام دفعة مالية وتسجيل سند قبض"
      subtitle="معالج تسجيل سندات القبض بنمط نبراس مع اختيار طريقة الدفع والخزينة وتأكيد الاستلام والتسوية."
      maxWidth="780px"
      (closed)="onCancel()"
    >
      <nb-stepper [steps]="steps" [current]="currentStep() + 1"></nb-stepper>

      <div class="step-content">
        <!-- الخطوة 1: حساب الطالب والمبلغ المقبوض -->
        @if (currentStep() === 0) {
          <div class="form-grid">
            <label class="full-width">
              <span class="fld-title">حساب الطالب المالي *</span>
              <nb-searchable-select
                [items]="accountSelectItems()"
                [(value)]="selectedAccountId"
                (valueChange)="onAccountChange()"
                placeholder="ابحث برقم الحساب أو اسم الطالب أو رقم القيد…"
                searchPlaceholder="اكتب للبحث السريع في الحسابات…"
              ></nb-searchable-select>
            </label>

            @if (selectedAccount(); as acc) {
              <div class="full-width account-info-card">
                <div class="info-item">
                  <span class="lbl">اسم الطالب:</span>
                  <span class="val bold">{{ getStudentName(acc.student_id) }}</span>
                </div>
                <div class="info-item">
                  <span class="lbl">رقم القيد الأكاديمي:</span>
                  <span class="val mono">{{ getStudentNumber(acc.student_id) }}</span>
                </div>
                <div class="info-item">
                  <span class="lbl">إجمالي المستحق حالياً:</span>
                  <span class="val mono due">{{ (+acc.outstanding_balance || 0) | number:'1.2-2' }} ج.س</span>
                </div>
                <div class="info-item">
                  <span class="lbl">الرصيد الدائن المتوفر:</span>
                  <span class="val mono ok">{{ (+acc.credit_balance || 0) | number:'1.2-2' }} ج.س</span>
                </div>
              </div>
            }

            <div class="full-width amount-section">
              <div class="amount-header">
                <span class="fld-title">المبلغ المقبوض (ج.س) *</span>
                @if (selectedAccount() && +selectedAccount()!.outstanding_balance > 0) {
                  <div class="quick-amounts">
                    <button type="button" class="btn-quick" (click)="setQuickAmount(1)">كامل المستحق</button>
                    <button type="button" class="btn-quick" (click)="setQuickAmount(0.5)">50% من المستحق</button>
                  </div>
                }
              </div>
              <input
                type="number"
                class="fld mono font-bold big-amount-input"
                [(ngModel)]="amount"
                min="1"
                step="any"
                placeholder="0.00"
                required
              />
            </div>

            @if (amount > 0) {
              <div class="full-width tafqeet-box">
                <span class="tafqeet-title">المبلغ كتابةً:</span>
                <span class="tafqeet-text">{{ getTafqeet(amount) }}</span>
              </div>
            }
          </div>

          <div class="step-hint-box">
            <span class="hint-icon">💡</span>
            <span>حدد حساب الطالب والمبلغ المحصل للانتقال إلى تحديد وسيلة القبض وحساب الإيداع.</span>
          </div>
        }

        <!-- الخطوة 2: وسيلة الدفع والخزينة / البنك -->
        @if (currentStep() === 1) {
          <div class="form-grid">
            <label class="half-width">
              <span class="fld-title">طريقة السداد / التحصيل *</span>
              <select class="fld" [(ngModel)]="paymentMethodId" (change)="onMethodChange()">
                <option value="">اختر طريقة الدفع…</option>
                @for (m of methods(); track m.id) {
                  <option [value]="m.id">{{ m.name_ar }}</option>
                }
              </select>
            </label>

            <label class="half-width">
              <span class="fld-title">الصندوق / الخزينة النقدية</span>
              <select class="fld" [(ngModel)]="cashBoxId">
                <option [ngValue]="null">— بدون (أو خيار بنكي) —</option>
                @for (cb of cashBoxes(); track cb.id) {
                  <option [ngValue]="cb.id">{{ cb.name_ar }}</option>
                }
              </select>
            </label>

            <label class="full-width">
              <span class="fld-title">الحساب البنكي المودع به (تطبيق بنكك / فوري / أوكاش / حساب مصرفي)</span>
              <select class="fld" [(ngModel)]="bankAccountId">
                <option [ngValue]="null">— بدون (إيداع خزينة نقدية) —</option>
                @for (b of bankAccounts(); track b.id) {
                  <option [ngValue]="b.id">{{ b.bank_name }} — رقم الحساب: {{ b.account_number }}</option>
                }
              </select>
            </label>

            <label class="full-width">
              <span class="fld-title">رقم إشعار التحويل / المرجع البنكي (اختياري)</span>
              <input
                type="text"
                class="fld mono"
                [(ngModel)]="referenceNumber"
                placeholder="مثال: رقم العملية في تطبيق بنكك (10293848) أو شيك…"
              />
            </label>
          </div>

          <div class="step-hint-box">
            <span class="hint-icon">🏦</span>
            <span>يدعم نظام نبراس المحافظ والتطبيقات البنكية السودانية المعتمدة (بنكك، فوري، أوكاش) والخزائن النقدية الفرعية.</span>
          </div>
        }

        <!-- الخطوة 3: المراجعة والتأكيد النهائي -->
        @if (currentStep() === 2) {
          <div class="review-step">
            <div class="review-card">
              <div class="rc-section-title">بيانات سند القبض</div>
              <div class="rc-grid">
                <div class="rc-item">
                  <span class="k">اسم الطالب:</span>
                  <span class="v bold">{{ getStudentName(selectedAccount()?.student_id) }}</span>
                </div>
                <div class="rc-item">
                  <span class="k">رقم حساب الطالب:</span>
                  <span class="v mono">{{ selectedAccount()?.account_number }}</span>
                </div>
                <div class="rc-item">
                  <span class="k">طريقة الدفع:</span>
                  <span class="v bold">{{ getMethodName(paymentMethodId) }}</span>
                </div>
                <div class="rc-item">
                  <span class="k">وجهة الإيداع:</span>
                  <span class="v">{{ getDepositDestination() }}</span>
                </div>
                @if (referenceNumber) {
                  <div class="rc-item">
                    <span class="k">رقم المرجع / الإشعار:</span>
                    <span class="v mono">{{ referenceNumber }}</span>
                  </div>
                }
                <div class="rc-item">
                  <span class="k">تاريخ السند:</span>
                  <span class="v mono">{{ todayDate }}</span>
                </div>
              </div>

              <div class="rc-section-title">الأثر المالي والتسوية</div>
              <div class="financial-impact-card">
                <div class="fic-row">
                  <span>المبلغ المستلم المقيد بالسند:</span>
                  <strong class="font-bold ok mono">{{ amount | number:'1.2-2' }} ج.س</strong>
                </div>
                <div class="fic-row">
                  <span>المستحق قبل السداد:</span>
                  <span class="mono">{{ (+selectedAccount()?.outstanding_balance || 0) | number:'1.2-2' }} ج.س</span>
                </div>
                <div class="fic-row total">
                  <span>المتبقي المتوقع بعد خصم الدفعة:</span>
                  <strong class="mono" [class.due]="remainingAfterPay() > 0" [class.ok]="remainingAfterPay() <= 0">
                    {{ remainingAfterPay() | number:'1.2-2' }} ج.س
                  </strong>
                </div>
              </div>

              <div class="tafqeet-box" style="margin-top: 14px;">
                <span class="tafqeet-title">المبلغ كتابةً:</span>
                <span class="tafqeet-text">{{ getTafqeet(amount) }}</span>
              </div>

              <div class="confirm-notice">
                <span class="notice-icon">✓</span>
                <span>سيتم توليد سند قبض رسمي مرقم، وخصم المبلغ فورياً من مستحقات الطالب وتحديث أرصدة الخزينة/البنك في دفتر الأستاذ.</span>
              </div>
            </div>
          </div>
        }
      </div>

      <div class="modal-actions" slot="footer">
        <button type="button" class="btn ghost" (click)="onCancel()" [disabled]="submitting()">
          إلغاء
        </button>

        <div class="actions-spacer"></div>

        @if (currentStep() > 0) {
          <button type="button" class="btn ghost" (click)="prevStep()" [disabled]="submitting()">
            السابق
          </button>
        }

        @if (currentStep() < steps.length - 1) {
          <button type="button" class="btn primary" (click)="nextStep()" [disabled]="!canProceed()">
            التالي
          </button>
        } @else {
          <button type="button" class="btn primary confirm-btn" (click)="submit()" [disabled]="submitting() || !canProceed()">
            {{ submitting() ? 'جارٍ تسجيل السند والتسوية…' : '✓ تأكيد واستلام الدفعة' }}
          </button>
        }
      </div>
    </nb-modal>
  `,
  styles: [`
    .step-content {
      padding: 18px 4px;
      min-height: 360px;
    }

    .form-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    .full-width { width: 100%; }
    .half-width { width: calc(50% - 8px); }

    .fld-title {
      display: block;
      margin-bottom: 6px;
      font-size: 13px;
      font-weight: 600;
      color: var(--nb-text);
    }
    .fld {
      width: 100%;
      height: 40px;
      padding: 0 12px;
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius);
      background: var(--nb-surface);
      color: var(--nb-text);
      font-family: inherit;
      font-size: 13.5px;
      box-sizing: border-box;
    }

    .amount-section { display: flex; flex-direction: column; gap: 6px; }
    .amount-header { display: flex; justify-content: space-between; align-items: center; }
    .quick-amounts { display: flex; gap: 8px; }
    .btn-quick {
      height: 26px;
      padding: 0 10px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: var(--nb-radius-pill, 9999px);
      color: #1e40af;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-quick:hover {
      background: #dbeafe;
    }

    .big-amount-input {
      font-size: 18px !important;
      height: 44px !important;
      color: var(--nb-primary-700) !important;
    }

    .account-info-card {
      background: var(--nb-surface-raised);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
      padding: 12px 16px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 12px;
    }
    .info-item { display: flex; flex-direction: column; gap: 3px; font-size: 12.5px; }
    .info-item .lbl { color: var(--nb-text-muted); }
    .info-item .val { color: var(--nb-text); }
    .info-item .val.bold { font-weight: 700; }
    .info-item .val.mono { font-family: monospace; }
    .info-item .val.due { color: var(--nb-danger, #dc2626); font-weight: 700; }
    .info-item .val.ok { color: #15803d; font-weight: 700; }

    .step-hint-box {
      margin-top: 20px;
      display: flex;
      gap: 10px;
      padding: 12px 14px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: var(--nb-radius);
      color: #1e40af;
      font-size: 13px;
      line-height: 1.5;
    }

    .tafqeet-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: var(--nb-radius);
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }
    .tafqeet-title { font-weight: 700; color: #15803d; }
    .tafqeet-text { font-weight: 700; color: #166534; }

    .review-card {
      background: var(--nb-surface-raised);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
      padding: 16px;
    }
    .rc-section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--nb-text-muted);
      margin: 12px 0 8px;
    }
    .rc-section-title:first-child { margin-top: 0; }
    .rc-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      padding: 10px 14px;
      background: var(--nb-surface);
      border-radius: var(--nb-radius);
      border: 1px solid var(--nb-border-soft);
    }
    .rc-item { display: flex; justify-content: space-between; font-size: 13px; }
    .rc-item .k { color: var(--nb-text-muted); }
    .rc-item .v { color: var(--nb-text); }
    .rc-item .v.bold { font-weight: 700; }
    .rc-item .v.mono { font-family: monospace; }

    .financial-impact-card {
      background: var(--nb-surface);
      border: 1px solid var(--nb-border-soft);
      border-radius: var(--nb-radius);
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 13px;
    }
    .fic-row { display: flex; justify-content: space-between; }
    .fic-row.total {
      border-top: 1px dashed var(--nb-border);
      padding-top: 8px;
      font-size: 14px;
      font-weight: 700;
    }
    .ok { color: #15803d; }
    .due { color: var(--nb-danger, #dc2626); }

    .confirm-notice {
      display: flex;
      gap: 10px;
      margin-top: 14px;
      padding: 10px 14px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: var(--nb-radius);
      color: #166534;
      font-size: 12.5px;
      line-height: 1.5;
    }

    .modal-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
    }
    .actions-spacer { flex: 1; }

    .btn {
      height: 38px;
      padding: 0 18px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 600;
      border-radius: var(--nb-radius);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: none;
      transition: all 0.15s ease;
    }
    .btn.primary {
      background: var(--nb-primary-600);
      color: #fff;
    }
    .btn.primary:hover:not(:disabled) {
      background: var(--nb-primary-700);
    }
    .btn.ghost {
      background: var(--nb-surface-raised);
      border: 1px solid var(--nb-border);
      color: var(--nb-text);
    }
    .btn.ghost:hover:not(:disabled) {
      background: var(--nb-surface);
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .confirm-btn {
      background: #059669 !important;
    }
    .confirm-btn:hover:not(:disabled) {
      background: #047857 !important;
    }
  `]
})
export class ReceiptCreateModalComponent implements OnInit, OnChanges {
  private svc = inject(StudentFinanceService);
  private studentsSvc = inject(StudentsService);
  private notify = inject(NotificationService);

  @Input() open = false;
  @Input() preselectedAccountId?: string;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<any>();

  steps: string[] = [
    'حساب الطالب والمبلغ',
    'وسيلة الدفع والخزينة',
    'المراجعة والتأكيد',
  ];

  currentStep = signal(0);
  submitting = signal(false);

  accounts = signal<any[]>([]);
  studentsMap = signal<Map<string, any>>(new Map());
  methods = signal<any[]>([]);
  cashBoxes = signal<any[]>([]);
  bankAccounts = signal<any[]>([]);

  selectedAccountId = '';
  amount: number = 0;
  paymentMethodId = '';
  cashBoxId: string | null = null;
  bankAccountId: string | null = null;
  referenceNumber = '';

  todayDate = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'numeric', day: 'numeric' });

  selectedAccount = computed(() => {
    return this.accounts().find((a) => a.id === this.selectedAccountId) || null;
  });

  accountSelectItems = computed<NbSelectItem[]>(() => {
    return this.accounts().map((a) => {
      const s = this.studentsMap().get(a.student_id);
      const studentName = s?.profile?.arabic_name || 'طالب';
      const studentNum = s?.student_number || '';
      return {
        id: a.id,
        code: a.account_number,
        name_ar: `${studentName} (${studentNum}) — مستحق: ${(+a.outstanding_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.س`,
        name: studentName,
      };
    });
  });

  remainingAfterPay = computed(() => {
    const acc = this.selectedAccount();
    const currentDue = +acc?.outstanding_balance || 0;
    return Math.max(0, currentDue - (this.amount || 0));
  });

  ngOnInit() {
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['open'] && this.open) {
      this.resetForm();
      if (this.preselectedAccountId) {
        this.selectedAccountId = this.preselectedAccountId;
        this.onAccountChange();
      }
    }
  }

  loadData() {
    this.svc.listBillingAccounts({ page_size: 500 }).subscribe({
      next: (res) => this.accounts.set(res?.data ?? []),
    });

    this.studentsSvc.getStudents({ page_size: 500 }).subscribe({
      next: (res: any) => {
        const map = new Map<string, any>();
        (res?.data ?? []).forEach((s: any) => map.set(s.id, s));
        this.studentsMap.set(map);
      },
    });

    this.svc.listPaymentMethods().subscribe({
      next: (res) => {
        const list = res?.data ?? [];
        this.methods.set(list);
        if (list.length > 0 && !this.paymentMethodId) {
          this.paymentMethodId = list[0].id;
        }
      },
    });

    this.svc.listCashBoxes().subscribe({
      next: (res) => this.cashBoxes.set(res?.data ?? []),
    });

    this.svc.listBankAccounts().subscribe({
      next: (res) => this.bankAccounts.set(res?.data ?? []),
    });
  }

  resetForm() {
    this.currentStep.set(0);
    this.selectedAccountId = this.preselectedAccountId || '';
    this.amount = 0;
    this.cashBoxId = null;
    this.bankAccountId = null;
    this.referenceNumber = '';
    this.submitting.set(false);
  }

  onAccountChange() {
    const acc = this.selectedAccount();
    if (acc && +acc.outstanding_balance > 0 && this.amount === 0) {
      this.amount = +acc.outstanding_balance;
    }
  }

  onMethodChange() {
    // optional logic when method changes
  }

  setQuickAmount(ratio: number) {
    const acc = this.selectedAccount();
    if (acc) {
      this.amount = Math.round((+acc.outstanding_balance || 0) * ratio);
    }
  }

  getStudentName(studentId?: string): string {
    if (!studentId) return '—';
    return this.studentsMap().get(studentId)?.profile?.arabic_name || 'طالب';
  }

  getStudentNumber(studentId?: string): string {
    if (!studentId) return '—';
    return this.studentsMap().get(studentId)?.student_number || '—';
  }

  getMethodName(methodId: string): string {
    const m = this.methods().find((item) => item.id === methodId);
    return m?.name_ar || m?.name || '—';
  }

  getDepositDestination(): string {
    if (this.bankAccountId) {
      const b = this.bankAccounts().find((x) => x.id === this.bankAccountId);
      return b ? `${b.bank_name} (${b.account_number})` : 'حساب بنكي';
    }
    if (this.cashBoxId) {
      const cb = this.cashBoxes().find((x) => x.id === this.cashBoxId);
      return cb ? `خزينة: ${cb.name_ar}` : 'خزينة نقدية';
    }
    return 'صندوق المركز المالي العام';
  }

  getTafqeet(amount: number): string {
    return tafqeetArabic(amount, 'جنيه سوداني');
  }

  canProceed(): boolean {
    if (this.currentStep() === 0) {
      return !!this.selectedAccountId && this.amount > 0;
    }
    if (this.currentStep() === 1) {
      return !!this.paymentMethodId;
    }
    return true;
  }

  nextStep() {
    if (this.canProceed() && this.currentStep() < this.steps.length - 1) {
      this.currentStep.update((s) => s + 1);
    }
  }

  prevStep() {
    if (this.currentStep() > 0) {
      this.currentStep.update((s) => s - 1);
    }
  }

  submit() {
    if (!this.canProceed() || this.submitting()) return;

    this.submitting.set(true);
    const payload: any = {
      billing_account_id: this.selectedAccountId,
      amount: this.amount,
      payment_method_id: this.paymentMethodId,
    };
    if (this.bankAccountId) payload.bank_account_id = this.bankAccountId;
    if (this.cashBoxId) payload.cash_box_id = this.cashBoxId;

    this.svc.receiveStudentPayment(payload).subscribe({
      next: (res) => {
        this.notify.success('تم تسجيل سند القبض واستلام الدفعة وتسويتها بنجاح.');
        this.saved.emit(res?.data || res);
        this.closed.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = err?.error?.error?.message || err?.error?.detail || 'تعذّر تسجيل سند القبض. يرجى مراجعة البيانات.';
        this.notify.error(msg);
      },
    });
  }

  onCancel() {
    this.closed.emit();
  }
}
