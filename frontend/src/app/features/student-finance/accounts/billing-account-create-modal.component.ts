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
  selector: 'app-billing-account-create-modal',
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
      title="فتح حساب مالي لطالب جديد"
      subtitle="معالج فتح حسابات الفوترة بنمط نبراس مع ربط الطالب وتوليد رقم الحساب الآلي وضبط الرصيد الافتتاحي."
      maxWidth="740px"
      (closed)="onCancel()"
    >
      <nb-stepper [steps]="steps" [current]="currentStep() + 1"></nb-stepper>

      <div class="step-content">
        <!-- الخطوة 1: اختيار الطالب ورقم الحساب -->
        @if (currentStep() === 0) {
          <div class="form-grid">
            <label class="full-width">
              <span class="fld-title">اختيار الطالب *</span>
              <nb-searchable-select
                [items]="studentSelectItems()"
                [(value)]="studentId"
                (valueChange)="onStudentSelected()"
                placeholder="ابحث باسم الطالب أو رقم القيد الأكاديمي…"
                searchPlaceholder="اكتب للبحث عن طالب ليس لديه حساب فوترة…"
              ></nb-searchable-select>
            </label>

            @if (selectedStudent(); as student) {
              <div class="full-width student-info-card">
                <div class="info-item">
                  <span class="lbl">اسم الطالب الكامل:</span>
                  <span class="val bold">{{ student.profile?.arabic_name || student.student_number }}</span>
                </div>
                <div class="info-item">
                  <span class="lbl">رقم القيد الأكاديمي:</span>
                  <span class="val mono">{{ student.student_number }}</span>
                </div>
                <div class="info-item">
                  <span class="lbl">المرحلة / الصف:</span>
                  <span class="val">{{ student.grade_level?.name || student.grade_level_name || 'غير محدد' }}</span>
                </div>
                <div class="info-item">
                  <span class="lbl">ولي الأمر:</span>
                  <span class="val">{{ student.guardian?.name || student.profile?.guardian_name || '—' }}</span>
                </div>
              </div>
            }

            <label class="full-width">
              <div class="fld-header-row">
                <span class="fld-title">رقم حساب الفوترة المالي *</span>
                @if (autoNumber()) {
                  <span class="auto-badge">⚡ توليد آلي</span>
                }
              </div>
              <div class="auto-input-wrap">
                <input
                  type="text"
                  class="fld mono"
                  [class.auto-active]="autoNumber()"
                  [(ngModel)]="accountNumber"
                  [readonly]="autoNumber()"
                  placeholder="SF-2026-XXXX"
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
          </div>

          <div class="step-hint-box">
            <span class="hint-icon">💡</span>
            <span>يتم توليد رقم الحساب المالي آلياً برمز وحدة مالية الطلاب (SF) متوافقاً مع الهيكل المالي الموحد.</span>
          </div>
        }

        <!-- الخطوة 2: الأرصدة والبيانات الافتتاحية -->
        @if (currentStep() === 1) {
          <div class="form-grid">
            <label class="half-width">
              <span class="fld-title">الرصيد الافتتاحي (ج.س)</span>
              <input
                type="number"
                class="fld mono font-bold"
                [(ngModel)]="openingBalance"
                step="any"
                placeholder="0.00"
              />
            </label>

            <label class="half-width">
              <span class="fld-title">العملة المعتمدة</span>
              <input type="text" class="fld" value="الجنيه السوداني (ج.س)" readonly disabled />
            </label>

            @if (openingBalance > 0) {
              <div class="full-width tafqeet-box">
                <span class="tafqeet-title">الرصيد الافتتاحي كتابةً:</span>
                <span class="tafqeet-text">{{ getTafqeet(openingBalance) }}</span>
              </div>
            }

            <label class="full-width">
              <span class="fld-title">بيان أو ملاحظات افتتاح الحساب (اختياري)</span>
              <textarea
                class="fld-area"
                [(ngModel)]="notes"
                rows="2"
                placeholder="اكتب أية تفاصيل إضافية عن خلفية الحساب أو الاتفاق المالي مع ولي الأمر…"
              ></textarea>
            </label>
          </div>

          <div class="step-hint-box">
            <span class="hint-icon">📝</span>
            <span>إذا كان الطالب قد سدد مسبقاً أو عليه مديونية مرحلة من أعوام سابقة، يمكنك إدراجها كرصيد افتتاحي.</span>
          </div>
        }

        <!-- الخطوة 3: المراجعة والتأكيد النهائي -->
        @if (currentStep() === 2) {
          <div class="review-step">
            <div class="review-card">
              <div class="rc-section-title">بيانات الحساب المالي الجديد</div>
              <div class="rc-grid">
                <div class="rc-item">
                  <span class="k">اسم الطالب:</span>
                  <span class="v bold">{{ selectedStudent()?.profile?.arabic_name || selectedStudent()?.student_number }}</span>
                </div>
                <div class="rc-item">
                  <span class="k">رقم القيد الأكاديمي:</span>
                  <span class="v mono">{{ selectedStudent()?.student_number }}</span>
                </div>
                <div class="rc-item">
                  <span class="k">رقم الحساب المالي:</span>
                  <span class="v mono bold">{{ accountNumber }}</span>
                </div>
                <div class="rc-item">
                  <span class="k">العملة المعتمدة:</span>
                  <span class="v">الجنيه السوداني (ج.س)</span>
                </div>
                <div class="rc-item">
                  <span class="k">الرصيد الافتتاحي:</span>
                  <span class="v mono font-bold">{{ openingBalance | number:'1.2-2' }} ج.س</span>
                </div>
                <div class="rc-item">
                  <span class="k">تاريخ الفتح:</span>
                  <span class="v mono">{{ todayDate }}</span>
                </div>
              </div>

              @if (openingBalance > 0) {
                <div class="tafqeet-box" style="margin-top: 14px;">
                  <span class="tafqeet-title">الرصيد الافتتاحي كتابةً:</span>
                  <span class="tafqeet-text">{{ getTafqeet(openingBalance) }}</span>
                </div>
              }

              <div class="confirm-notice">
                <span class="notice-icon">✓</span>
                <span>سيتم فتح الحساب المالي وربطه رسمياً مع شجرة الحسابات بدفتر أستاذ المالية ليصبح جاهزاً لإصدار الفواتير وتحصيل الرسوم.</span>
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
            {{ submitting() ? 'جارٍ فتح الحساب والربط…' : '✓ تأكيد وفتح الحساب' }}
          </button>
        }
      </div>
    </nb-modal>
  `,
  styles: [`
    .step-content {
      padding: 18px 4px;
      min-height: 350px;
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
    .fld-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .auto-badge {
      font-size: 11px;
      font-weight: 700;
      color: #0284c7;
      background: #e0f2fe;
      padding: 2px 8px;
      border-radius: 9999px;
      border: 1px solid #bae6fd;
    }
    .auto-input-wrap {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .btn-toggle-auto {
      height: 40px;
      padding: 0 12px;
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius);
      background: var(--nb-surface-raised);
      color: var(--nb-text);
      font-family: inherit;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .btn-toggle-auto:hover {
      background: var(--nb-surface);
      border-color: var(--nb-primary-400);
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
    .fld.auto-active {
      background: #f8fafc;
      color: #0369a1;
      font-weight: 700;
    }
    .fld:disabled {
      background: var(--nb-surface-raised);
      opacity: 0.8;
      cursor: not-allowed;
    }
    .fld-area {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius);
      background: var(--nb-surface);
      color: var(--nb-text);
      font-family: inherit;
      font-size: 13px;
      resize: vertical;
      box-sizing: border-box;
    }

    .student-info-card {
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
export class BillingAccountCreateModalComponent implements OnInit, OnChanges {
  private svc = inject(StudentFinanceService);
  private studentsSvc = inject(StudentsService);
  private notify = inject(NotificationService);

  @Input() open = false;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<any>();

  steps: string[] = [
    'الطالب ورقم الحساب',
    'الأرصدة الافتتاحية',
    'المراجعة والتأكيد',
  ];

  currentStep = signal(0);
  submitting = signal(false);

  allStudents = signal<any[]>([]);
  existingAccounts = signal<any[]>([]);

  studentId = '';
  accountNumber = '';
  autoNumber = signal(true);
  openingBalance = 0;
  notes = '';

  todayDate = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'numeric', day: 'numeric' });

  availableStudents = computed(() => {
    const linked = new Set(this.existingAccounts().map((a) => a.student_id));
    return this.allStudents().filter((s) => !linked.has(s.id));
  });

  selectedStudent = computed(() => {
    return this.allStudents().find((s) => s.id === this.studentId) || null;
  });

  studentSelectItems = computed<NbSelectItem[]>(() => {
    return this.availableStudents().map((s) => {
      const name = s.profile?.arabic_name || s.student_number;
      return {
        id: s.id,
        code: s.student_number,
        name_ar: `${name} — الصف: ${s.grade_level?.name || s.grade_level_name || 'غير محدد'}`,
        name: name,
      };
    });
  });

  ngOnInit() {
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['open'] && this.open) {
      this.resetForm();
      this.loadData();
    }
  }

  loadData() {
    this.svc.listBillingAccounts({ page_size: 1000 }).subscribe({
      next: (res) => {
        this.existingAccounts.set(res?.data ?? []);
        this.generateSuggestedNumber();
      },
    });

    this.studentsSvc.getStudents({ page_size: 1000 }).subscribe({
      next: (res: any) => {
        this.allStudents.set(res?.data ?? []);
      },
    });
  }

  resetForm() {
    this.currentStep.set(0);
    this.studentId = '';
    this.autoNumber.set(true);
    this.openingBalance = 0;
    this.notes = '';
    this.submitting.set(false);
    this.generateSuggestedNumber();
  }

  generateSuggestedNumber() {
    if (!this.autoNumber()) return;
    const year = new Date().getFullYear();
    const count = this.existingAccounts().length + 1;
    const padded = String(count).padStart(4, '0');
    this.accountNumber = `SF-${year}-${padded}`;
  }

  toggleAutoNumber() {
    this.autoNumber.update((v) => !v);
    if (this.autoNumber()) {
      this.generateSuggestedNumber();
    }
  }

  onStudentSelected() {
    if (this.autoNumber()) {
      this.generateSuggestedNumber();
    }
  }

  getTafqeet(amount: number): string {
    return tafqeetArabic(amount, 'جنيه سوداني');
  }

  canProceed(): boolean {
    if (this.currentStep() === 0) {
      return !!this.studentId && !!this.accountNumber.trim();
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
      student_id: this.studentId,
      account_number: this.accountNumber.trim(),
      opening_balance: +this.openingBalance || 0,
    };

    this.svc.createBillingAccount(payload).subscribe({
      next: (res) => {
        this.notify.success(`تم فتح الحساب المالي (${this.accountNumber}) بنجاح.`);
        this.saved.emit(res?.data || res);
        this.closed.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = err?.error?.error?.message || err?.error?.detail || 'تعذّر فتح الحساب المالي. تأكد من عدم تكرار رقم الحساب.';
        this.notify.error(msg);
      },
    });
  }

  onCancel() {
    this.closed.emit();
  }
}
