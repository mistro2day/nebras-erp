import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentFinanceService } from '../student-finance.service';
import { StudentsService } from '../../students/students.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbModalComponent } from '../../../shared/nebras/nb-modal.component';
import { NbStepperComponent } from '../../../shared/nebras/nb-stepper.component';
import { NbDatepickerComponent } from '../../../shared/nebras/nb-datepicker.component';
import { NbSearchableSelectComponent, NbSelectItem } from '../../../shared/nebras/nb-searchable-select.component';
import { tafqeetArabic } from '../../finance/journals/journal-voucher-print';

@Component({
  selector: 'app-invoice-create-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    NbModalComponent,
    NbStepperComponent,
    NbDatepickerComponent,
    NbSearchableSelectComponent,
  ],
  template: `
    <nb-modal
      [open]="open"
      title="إصدار فاتورة رسوم دراسية"
      subtitle="معالج إصدار الفواتير بنمط نبراس مع اختيار الرسوم ومراجعة الاستحقاق والتأكيد النهائي."
      maxWidth="780px"
      (closed)="onCancel()"
    >
      <nb-stepper [steps]="steps" [current]="currentStep() + 1"></nb-stepper>

      <div class="step-content">
        <!-- الخطوة 1: حساب الطالب وتاريخ الاستحقاق -->
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
                  <span class="lbl">الرصيد المستحق الحالي:</span>
                  <span class="val mono" [class.due]="+acc.outstanding_balance > 0">
                    {{ acc.outstanding_balance | number:'1.2-2' }} ج.س
                  </span>
                </div>
                <div class="info-item">
                  <span class="lbl">حالة الحساب:</span>
                  <span class="val badge" [class.badge-warn]="acc.financial_hold" [class.badge-ok]="!acc.financial_hold">
                    {{ acc.financial_hold ? 'إيقاف مالي' : 'نشط وسليم' }}
                  </span>
                </div>
              </div>
            }

            <label class="half-width">
              <span class="fld-title">تاريخ استحقاق الفاتورة *</span>
              <nb-datepicker [(value)]="dueDate" ariaLabel="تاريخ الاستحقاق"></nb-datepicker>
            </label>

            <label class="half-width">
              <span class="fld-title">العملة المعتمدة</span>
              <input type="text" class="fld" value="الجنيه السوداني (ج.س)" readonly disabled />
            </label>
          </div>

          <div class="step-hint-box">
            <span class="hint-icon">💡</span>
            <span>اختر حساب الطالب الذي ستصدر الفاتورة باسمه وتاريخ استحقاقها للانتقال لتحديد بنود الرسوم.</span>
          </div>
        }

        <!-- الخطوة 2: هياكل الرسوم الدراسية -->
        @if (currentStep() === 1) {
          <div class="fees-container">
            <div class="fees-header">
              <span class="fh-title">قائمة هياكل الرسوم الدراسية المعتمدة</span>
              <span class="fh-count">تم تحديد {{ selectedFeeIds().length }} رسم بمبلغ {{ selectedTotal() | number:'1.2-2' }} ج.س</span>
            </div>

            <div class="fees-grid">
              @for (fs of feeStructures(); track fs.id) {
                <div
                  class="fee-card"
                  [class.selected]="isFeeSelected(fs.id)"
                  (click)="toggleFee(fs.id)"
                >
                  <div class="fc-checkbox">
                    <input type="checkbox" [checked]="isFeeSelected(fs.id)" (click)="$event.stopPropagation()" (change)="toggleFee(fs.id)" />
                  </div>
                  <div class="fc-body">
                    <div class="fc-name">{{ fs.name }}</div>
                    @if (fs.code) {
                      <div class="fc-code">{{ fs.code }}</div>
                    }
                  </div>
                  <div class="fc-amount">
                    <span class="num">{{ fs.amount | number:'1.2-2' }}</span>
                    <span class="curr">ج.س</span>
                  </div>
                </div>
              }
              @if (feeStructures().length === 0) {
                <div class="empty-fees">لا توجد هياكل رسوم معرّفة حالياً في النظام.</div>
              }
            </div>

            @if (selectedTotal() > 0) {
              <div class="tafqeet-box">
                <span class="tafqeet-title">إجمالي الفاتورة كتابةً:</span>
                <span class="tafqeet-text">{{ getTafqeet(selectedTotal()) }}</span>
              </div>
            }
          </div>
        }

        <!-- الخطوة 3: المراجعة والتأكيد النهائي -->
        @if (currentStep() === 2) {
          <div class="review-step">
            <div class="review-card">
              <div class="rc-section-title">بيانات الفاتورة الأساسية</div>
              <div class="rc-grid">
                <div class="rc-item">
                  <span class="k">حساب الطالب:</span>
                  <span class="v mono">{{ selectedAccount()?.account_number }}</span>
                </div>
                <div class="rc-item">
                  <span class="k">اسم الطالب:</span>
                  <span class="v bold">{{ getStudentName(selectedAccount()?.student_id) }}</span>
                </div>
                <div class="rc-item">
                  <span class="k">تاريخ الاستحقاق:</span>
                  <span class="v mono">{{ dueDate }}</span>
                </div>
                <div class="rc-item">
                  <span class="k">العملة:</span>
                  <span class="v">الجنيه السوداني (ج.س)</span>
                </div>
              </div>

              <div class="rc-section-title">بنود الرسوم المشمولة ({{ selectedFeeIds().length }})</div>
              <table class="rc-table">
                <thead>
                  <tr>
                    <th>البند / الرسم</th>
                    <th style="text-align: left;">المبلغ (ج.س)</th>
                  </tr>
                </thead>
                <tbody>
                  @for (fs of selectedFeeItems(); track fs.id) {
                    <tr>
                      <td>{{ fs.name }}</td>
                      <td class="mono font-bold" style="text-align: left;">{{ fs.amount | number:'1.2-2' }}</td>
                    </tr>
                  }
                </tbody>
                <tfoot>
                  <tr>
                    <td class="bold">الإجمالي الكلي للفاتورة:</td>
                    <td class="total-val mono" style="text-align: left;">{{ selectedTotal() | number:'1.2-2' }} ج.س</td>
                  </tr>
                </tfoot>
              </table>

              <div class="tafqeet-box" style="margin-top: 14px;">
                <span class="tafqeet-title">المبلغ كتابةً:</span>
                <span class="tafqeet-text">{{ getTafqeet(selectedTotal()) }}</span>
              </div>

              <div class="confirm-notice">
                <span class="notice-icon">⚠️</span>
                <span>عند تأكيد الحفظ، سيتم إصدار الفاتورة وترحيل القيد المحاسبي المالي مباشرة لحساب الطالب ودفتر الأستاذ العام.</span>
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
            {{ submitting() ? 'جارٍ الإصدار والترحيل…' : '✓ تأكيد وإصدار الفاتورة' }}
          </button>
        }
      </div>
    </nb-modal>
  `,
  styles: [`
    .step-content {
      padding: 18px 4px;
      min-height: 380px;
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
    .fld:disabled {
      background: var(--nb-surface-raised);
      opacity: 0.8;
      cursor: not-allowed;
    }

    .account-info-card {
      background: var(--nb-surface-raised);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
      padding: 12px 16px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 3px;
      font-size: 12.5px;
    }
    .info-item .lbl { color: var(--nb-text-muted); }
    .info-item .val { color: var(--nb-text); }
    .info-item .val.bold { font-weight: 700; }
    .info-item .val.mono { font-family: monospace; }
    .info-item .val.due { color: var(--nb-danger, #dc2626); font-weight: 700; }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      width: fit-content;
    }
    .badge-ok { background: #dcfce7; color: #15803d; }
    .badge-warn { background: #fef3c7; color: #b45309; }

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

    .fees-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .fees-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--nb-border-soft);
    }
    .fh-title { font-weight: 700; font-size: 13.5px; color: var(--nb-text); }
    .fh-count { font-size: 12.5px; font-weight: 600; color: var(--nb-primary-700); }

    .fees-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
      gap: 10px;
      max-height: 280px;
      overflow-y: auto;
      padding: 4px;
    }
    .fee-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      border: 1.5px solid var(--nb-border);
      border-radius: var(--nb-radius);
      background: var(--nb-surface);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .fee-card:hover {
      border-color: var(--nb-primary-400);
      background: var(--nb-surface-raised);
    }
    .fee-card.selected {
      border-color: var(--nb-primary-600);
      background: #eff6ff;
    }
    .fc-checkbox input {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: var(--nb-primary-600);
    }
    .fc-body { flex: 1; min-width: 0; }
    .fc-name { font-size: 13px; font-weight: 600; color: var(--nb-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .fc-code { font-size: 11px; color: var(--nb-text-muted); font-family: monospace; }
    .fc-amount { text-align: left; }
    .fc-amount .num { font-weight: 700; font-size: 14px; color: var(--nb-text); font-family: monospace; }
    .fc-amount .curr { font-size: 10.5px; color: var(--nb-text-muted); margin-right: 3px; }
    .empty-fees { padding: 30px; text-align: center; color: var(--nb-text-muted); grid-column: 1 / -1; }

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

    .rc-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-top: 6px;
      background: var(--nb-surface);
      border: 1px solid var(--nb-border-soft);
      border-radius: var(--nb-radius);
      overflow: hidden;
    }
    .rc-table th {
      background: var(--nb-surface-raised);
      padding: 8px 12px;
      text-align: right;
      font-weight: 600;
      color: var(--nb-text-muted);
      border-bottom: 1px solid var(--nb-border-soft);
    }
    .rc-table td {
      padding: 8px 12px;
      border-bottom: 1px solid var(--nb-border-soft);
      color: var(--nb-text);
    }
    .rc-table tfoot td {
      border-bottom: none;
      border-top: 2px solid var(--nb-border);
      background: var(--nb-surface-raised);
      font-weight: 700;
    }
    .rc-table .total-val {
      font-size: 15px;
      color: var(--nb-primary-700);
      font-weight: 800;
    }

    .confirm-notice {
      display: flex;
      gap: 10px;
      margin-top: 14px;
      padding: 10px 14px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: var(--nb-radius);
      color: #92400e;
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
export class InvoiceCreateModalComponent implements OnInit, OnChanges {
  private svc = inject(StudentFinanceService);
  private studentsSvc = inject(StudentsService);
  private notify = inject(NotificationService);

  @Input() open = false;
  @Input() preselectedAccountId?: string;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<any>();

  steps: string[] = [
    'حساب الطالب والاستحقاق',
    'هياكل الرسوم',
    'المراجعة والتأكيد',
  ];

  currentStep = signal(0);
  submitting = signal(false);

  accounts = signal<any[]>([]);
  studentsMap = signal<Map<string, any>>(new Map());
  feeStructures = signal<any[]>([]);

  selectedAccountId = '';
  dueDate = this.formatDate(new Date(Date.now() + 14 * 86400000)); // بعد أسبوعين افتراضياً
  selectedFeeIds = signal<string[]>([]);

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

  selectedFeeItems = computed(() => {
    const set = new Set(this.selectedFeeIds());
    return this.feeStructures().filter((fs) => set.has(fs.id));
  });

  selectedTotal = computed(() => {
    return this.selectedFeeItems().reduce((sum, fs) => sum + (+fs.amount || 0), 0);
  });

  ngOnInit() {
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['open'] && this.open) {
      this.resetForm();
      if (this.preselectedAccountId) {
        this.selectedAccountId = this.preselectedAccountId;
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

    this.svc.listFeeStructures({ page_size: 100 }).subscribe({
      next: (res) => {
        this.feeStructures.set((res?.data ?? []).filter((fs: any) => fs.is_active));
      },
    });
  }

  resetForm() {
    this.currentStep.set(0);
    this.selectedAccountId = this.preselectedAccountId || '';
    this.dueDate = this.formatDate(new Date(Date.now() + 14 * 86400000));
    this.selectedFeeIds.set([]);
    this.submitting.set(false);
  }

  onAccountChange() {
    // triggered on selection
  }

  toggleFee(id: string) {
    const current = [...this.selectedFeeIds()];
    const idx = current.indexOf(id);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(id);
    }
    this.selectedFeeIds.set(current);
  }

  isFeeSelected(id: string): boolean {
    return this.selectedFeeIds().includes(id);
  }

  getStudentName(studentId?: string): string {
    if (!studentId) return '—';
    return this.studentsMap().get(studentId)?.profile?.arabic_name || 'طالب';
  }

  getStudentNumber(studentId?: string): string {
    if (!studentId) return '—';
    return this.studentsMap().get(studentId)?.student_number || '—';
  }

  getTafqeet(amount: number): string {
    return tafqeetArabic(amount, 'جنيه سوداني');
  }

  canProceed(): boolean {
    if (this.currentStep() === 0) {
      return !!this.selectedAccountId && !!this.dueDate;
    }
    if (this.currentStep() === 1) {
      return this.selectedFeeIds().length > 0;
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
    const payload = {
      billing_account_id: this.selectedAccountId,
      fee_structure_ids: this.selectedFeeIds(),
      due_date: this.dueDate,
    };

    this.svc.generateStudentInvoice(payload).subscribe({
      next: (res) => {
        this.notify.success('تم إصدار الفاتورة الدراسية وترحيلها بنجاح.');
        this.saved.emit(res?.data || res);
        this.closed.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = err?.error?.error?.message || err?.error?.detail || 'تعذّر إصدار الفاتورة. يرجى التحقق من المدخلات.';
        this.notify.error(msg);
      },
    });
  }

  onCancel() {
    this.closed.emit();
  }

  private formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
