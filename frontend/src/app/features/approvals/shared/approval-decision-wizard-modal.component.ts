import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NbModalComponent } from '../../../shared/nebras/nb-modal.component';
import { NbStepperComponent } from '../../../shared/nebras/nb-stepper.component';
import { tafqeetArabic } from '../../finance/journals/journal-voucher-print';
import { UnifiedApprovalItem } from '../approval-core.service';

export interface DecisionPayload {
  item: UnifiedApprovalItem;
  action: 'approve' | 'reject' | 'return';
  comments: string;
}

@Component({
  selector: 'app-approval-decision-wizard-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe, NbModalComponent, NbStepperComponent],
  template: `
    <nb-modal [open]="open" [title]="modalTitle()" [subtitle]="modalSubtitle()" maxWidth="740px" (closed)="onCancel()">
      <div class="decision-wizard" dir="rtl">
        <!-- مؤشر الخطوات المعتمد في نظام نبراس -->
        <div class="stepper-container">
          <nb-stepper [steps]="steps" [current]="currentStep() + 1"></nb-stepper>
        </div>

        @if (item) {
          <!-- ================= الخطوة 1: مراجعة تفاصيل الطلب ================= -->
          @if (currentStep() === 0) {
            <div class="step-card">
              <div class="item-summary-header">
                <span class="module-icon">{{ item.icon || '📄' }}</span>
                <div class="title-meta">
                  <div class="badge-row">
                    <span class="badge-module">{{ item.module_name_ar }}</span>
                    <span class="badge-category">{{ item.category_name_ar }}</span>
                    <span class="badge-ref mono">{{ item.reference_number }}</span>
                  </div>
                  <h3 class="item-heading">{{ item.title_ar }}</h3>
                  <div class="sub-meta">
                    <span>مقدم الطلب: <strong>{{ item.requester_name }}</strong></span>
                    @if (item.created_at) {
                      <span class="dot-sep">•</span>
                      <span>التاريخ: {{ item.created_at | date:'yyyy-MM-dd HH:mm' }}</span>
                    }
                  </div>
                </div>
              </div>

              <!-- بطاقة المبالغ المالية مع التفقيط السوداني إن وجدت -->
              @if (item.amount !== null && item.amount !== undefined) {
                <div class="amount-card">
                  <div class="amount-header">
                    <span class="amount-label">القيمة المالية الإجمالية:</span>
                    <div class="amount-val">
                      <span class="num">{{ item.amount | number:'1.2-2' }}</span>
                      <span class="cur">ج.س</span>
                    </div>
                  </div>
                  <div class="tafqeet-box">
                    <span class="tafqeet-label">المبلغ كتابةً:</span>
                    <span class="tafqeet-text">{{ getTafqeet(item.amount) }}</span>
                  </div>
                </div>
              }

              <!-- بطاقة الغرض والبيان التفصيلي للمعاملة -->
              @if (item.details?.description) {
                <div class="purpose-card">
                  <div class="purpose-title">
                    <span class="purpose-icon">💡</span>
                    <span class="purpose-label">الغرض والبيان من المعاملة:</span>
                  </div>
                  <p class="purpose-text">{{ item.details.description }}</p>
                </div>
              }

              <!-- تفاصيل إضافية حسب الكيان -->
              @if (item.details) {
                <div class="details-grid">
                  @for (key of objectKeys(item.details); track key) {
                    @if (key !== 'description' && item.details[key] !== null && item.details[key] !== undefined && item.details[key] !== '') {
                      <div class="detail-cell">
                        <span class="d-key">{{ translateKey(key) }}:</span>
                        <span class="d-val">{{ item.details[key] }}</span>
                      </div>
                    }
                  }
                </div>
              }
            </div>
          }

          <!-- ================= الخطوة 2: تحديد الإجراء والمبررات ================= -->
          @if (currentStep() === 1) {
            <div class="step-card">
              <h4 class="section-title">اختر قرار الاعتماد:</h4>
              <div class="action-selector">
                <label class="action-card" [class.selected]="selectedAction() === 'approve'" (click)="selectedAction.set('approve')">
                  <input type="radio" name="decisionAction" [checked]="selectedAction() === 'approve'" />
                  <div class="action-info">
                    <div class="action-title-row">
                      <span class="action-badge badge-approve">اعتماد ومصادقة ✓</span>
                    </div>
                    <p class="action-desc">الموافقة التامة على المعاملة وتحويلها للمرحلة التالية في الدورة المستندية.</p>
                  </div>
                </label>

                <label class="action-card" [class.selected]="selectedAction() === 'reject'" (click)="selectedAction.set('reject')">
                  <input type="radio" name="decisionAction" [checked]="selectedAction() === 'reject'" />
                  <div class="action-info">
                    <div class="action-title-row">
                      <span class="action-badge badge-reject">رفض الطلب ✕</span>
                    </div>
                    <p class="action-desc">رفض المعاملة مع ذكر الأسباب القانونية أو الإدارية الإلزامية.</p>
                  </div>
                </label>

                <label class="action-card" [class.selected]="selectedAction() === 'return'" (click)="selectedAction.set('return')">
                  <input type="radio" name="decisionAction" [checked]="selectedAction() === 'return'" />
                  <div class="action-info">
                    <div class="action-title-row">
                      <span class="action-badge badge-return">إعادة للاستيضاح ↺</span>
                    </div>
                    <p class="action-desc">إرجاع المعاملة لمقدمها لتعديل البيانات أو إرفاق مستندات ناقصة.</p>
                  </div>
                </label>
              </div>

              <!-- حقل الملاحظات والمبررات -->
              <div class="notes-area">
                <label class="form-label" [class.req]="selectedAction() === 'reject' || selectedAction() === 'return'">
                  <span>الملاحظات والمبررات الرسمية:</span>
                  @if (selectedAction() === 'reject' || selectedAction() === 'return') {
                    <span class="req-star">* (إلزامي للرفض أو الإرجاع)</span>
                  }
                </label>
                <textarea
                  class="nb-textarea"
                  rows="3"
                  [(ngModel)]="comments"
                  placeholder="أدخل ملاحظاتك وتوجيهاتك الرسمية حول هذا القرار..."
                ></textarea>
              </div>
            </div>
          }

          <!-- ================= الخطوة 3: المراجعة والتأكيد النهائي ================= -->
          @if (currentStep() === 2) {
            <div class="step-card review-step">
              <div class="review-banner" [class]="'banner-' + selectedAction()">
                <span class="review-icon">
                  {{ selectedAction() === 'approve' ? '✅' : (selectedAction() === 'reject' ? '🛑' : '⚠️') }}
                </span>
                <div>
                  <h4 class="review-status-text">
                    {{ selectedAction() === 'approve' ? 'تأكيد الاعتماد والمصادقة' : (selectedAction() === 'reject' ? 'تأكيد رفض الطلب' : 'تأكيد الإرجاع للاستيضاح') }}
                  </h4>
                  <p class="review-hint">سيتم تحديث سجلات النظام وسجل التدقيق المركزي فور الضغط على زر التأكيد.</p>
                </div>
              </div>

              <div class="summary-table">
                <div class="s-row">
                  <span class="s-label">المعاملة:</span>
                  <span class="s-val">{{ item.title_ar }}</span>
                </div>
                <div class="s-row">
                  <span class="s-label">الرقم المرجعي:</span>
                  <span class="s-val mono">{{ item.reference_number }}</span>
                </div>
                <div class="s-row">
                  <span class="s-label">القطاع / الفئة:</span>
                  <span class="s-val">{{ item.module_name_ar }} - {{ item.category_name_ar }}</span>
                </div>
                @if (item.amount !== null && item.amount !== undefined) {
                  <div class="s-row highlight-row">
                    <span class="s-label">المبلغ:</span>
                    <span class="s-val mono bold">{{ item.amount | number:'1.2-2' }} ج.س</span>
                  </div>
                  <div class="s-row">
                    <span class="s-label">التفقيط:</span>
                    <span class="s-val tafqeet-preview">{{ getTafqeet(item.amount) }}</span>
                  </div>
                }
                <div class="s-row">
                  <span class="s-label">القرار المتخذ:</span>
                  <span class="s-val bold" [class]="'text-' + selectedAction()">
                    {{ selectedAction() === 'approve' ? 'اعتماد (Approved)' : (selectedAction() === 'reject' ? 'رفض (Rejected)' : 'إرجاع (Returned)') }}
                  </span>
                </div>
                <div class="s-row">
                  <span class="s-label">المبررات المسجلة:</span>
                  <span class="s-val">{{ comments() || 'لا توجد ملاحظات إضافية' }}</span>
                </div>
              </div>
            </div>
          }
        }

        <!-- أزرار شريط التنقل السفلي المعتمدة في نبراس OS -->
        <div class="wizard-footer">
          <button type="button" class="btn ghost sm" (click)="onCancel()">إلغاء</button>
          <div class="spacer"></div>
          @if (currentStep() > 0) {
            <button type="button" class="btn secondary sm" (click)="prevStep()">← السابق</button>
          }
          @if (currentStep() < steps.length - 1) {
            <button
              type="button"
              class="btn primary sm"
              [disabled]="!canProceed()"
              (click)="nextStep()"
            >
              التالي ←
            </button>
          } @else {
            <button
              type="button"
              class="btn primary sm confirm-btn"
              [class.btn-danger]="selectedAction() === 'reject'"
              [disabled]="submitting()"
              (click)="submitDecision()"
            >
              {{ submitting() ? 'جاري المعالجة...' : 'تأكيد وإتمام القرار النهائي' }}
            </button>
          }
        </div>
      </div>
    </nb-modal>
  `,
  styles: [
    `
      .decision-wizard {
        display: flex;
        flex-direction: column;
        gap: 16px;
        font-family: var(--nb-font-family, system-ui, sans-serif);
      }

      .stepper-container {
        padding-bottom: 8px;
        border-bottom: 1px solid var(--nb-border-soft, #e2e8f0);
      }

      .step-card {
        background: var(--nb-surface, #ffffff);
        border: 1px solid var(--nb-border-soft, #e2e8f0);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      /* الرأس وتفاصيل المعاملة */
      .item-summary-header {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }

      .module-icon {
        font-size: 28px;
        background: var(--nb-surface-raised, #f8fafc);
        border: 1px solid var(--nb-border, #cbd5e1);
        width: 52px;
        height: 52px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        flex-shrink: 0;
      }

      .title-meta {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .badge-row {
        display: flex;
        gap: 6px;
        align-items: center;
        flex-wrap: wrap;
      }

      .badge-module {
        background: #e0e7ff;
        color: #3730a3;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 6px;
      }

      .badge-category {
        background: #f1f5f9;
        color: #334155;
        font-size: 11px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 6px;
      }

      .badge-ref {
        background: #fef3c7;
        color: #92400e;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 6px;
      }

      .item-heading {
        margin: 4px 0 0;
        font-size: 15px;
        font-weight: 700;
        color: var(--nb-text, #0f172a);
      }

      .sub-meta {
        font-size: 12px;
        color: var(--nb-text-muted, #64748b);
        display: flex;
        gap: 6px;
      }

      /* المبالغ والتفقيط */
      .amount-card {
        background: linear-gradient(135deg, #f0fdf4 0%, #e8f5e9 100%);
        border: 1px solid #bbf7d0;
        border-radius: 10px;
        padding: 12px 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .amount-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .amount-label {
        font-size: 13px;
        font-weight: 700;
        color: #166534;
      }

      .amount-val {
        display: flex;
        align-items: baseline;
        gap: 4px;
      }

      .amount-val .num {
        font-size: 20px;
        font-weight: 800;
        color: #15803d;
      }

      .amount-val .cur {
        font-size: 13px;
        font-weight: 700;
        color: #166534;
      }

      .tafqeet-box {
        background: #ffffff;
        border: 1px dashed #86efac;
        border-radius: 6px;
        padding: 6px 12px;
        font-size: 12px;
        display: flex;
        gap: 6px;
      }

      .tafqeet-label {
        font-weight: 700;
        color: #15803d;
        flex-shrink: 0;
      }

      .tafqeet-text {
        color: #1e293b;
        font-weight: 600;
      }

      /* بطاقة الغرض والبيان */
      .purpose-card {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 10px;
        padding: 12px 16px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .purpose-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 700;
        color: #166534;
      }

      .purpose-text {
        margin: 0;
        font-size: 13.5px;
        font-weight: 700;
        color: #0f172a;
        line-height: 1.5;
      }

      /* شبكة التفاصيل الإضافية */
      .details-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 10px;
        background: var(--nb-surface-raised, #f8fafc);
        border-radius: 8px;
        padding: 12px;
        border: 1px solid var(--nb-border-soft, #e2e8f0);
      }

      .detail-cell {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .d-key {
        font-size: 11px;
        color: var(--nb-text-muted, #64748b);
        font-weight: 600;
      }

      .d-val {
        font-size: 13px;
        color: var(--nb-text, #0f172a);
        font-weight: 600;
      }

      /* الخطوة 2: الإجراءات */
      .section-title {
        margin: 0;
        font-size: 14px;
        font-weight: 700;
        color: var(--nb-text, #0f172a);
      }

      .action-selector {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .action-card {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 14px;
        border: 2px solid var(--nb-border, #cbd5e1);
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
        background: var(--nb-surface, #ffffff);

        &:hover {
          border-color: #94a3b8;
        }

        &.selected {
          border-color: #2563eb;
          background: #eff6ff;
        }
      }

      .action-badge {
        font-size: 12px;
        font-weight: 700;
        padding: 2px 10px;
        border-radius: 6px;
      }

      .badge-approve { background: #dcfce7; color: #15803d; }
      .badge-reject { background: #fee2e2; color: #b91c1c; }
      .badge-return { background: #fef3c7; color: #92400e; }

      .action-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .action-desc {
        margin: 0;
        font-size: 12px;
        color: var(--nb-text-muted, #64748b);
      }

      .notes-area {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 6px;
      }

      .form-label {
        font-size: 12px;
        font-weight: 700;
        color: var(--nb-text, #0f172a);
        display: flex;
        gap: 6px;
      }

      .req-star {
        color: #dc2626;
        font-weight: 600;
      }

      .nb-textarea {
        border: 1px solid var(--nb-border, #cbd5e1);
        border-radius: 8px;
        padding: 8px 12px;
        font-family: inherit;
        font-size: 13px;
        color: var(--nb-text, #0f172a);
        background: var(--nb-surface, #ffffff);
        resize: vertical;
        outline: none;

        &:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }
      }

      /* الخطوة 3: المراجعة */
      .review-banner {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-radius: 8px;
      }

      .banner-approve { background: #f0fdf4; border: 1px solid #bbf7d0; }
      .banner-reject { background: #fef2f2; border: 1px solid #fecaca; }
      .banner-return { background: #fffbeb; border: 1px solid #fde68a; }

      .review-icon { font-size: 24px; }
      .review-status-text { margin: 0; font-size: 14px; font-weight: 800; color: #0f172a; }
      .review-hint { margin: 2px 0 0; font-size: 12px; color: #475569; }

      .summary-table {
        display: flex;
        flex-direction: column;
        border: 1px solid var(--nb-border-soft, #e2e8f0);
        border-radius: 8px;
        overflow: hidden;
      }

      .s-row {
        display: flex;
        padding: 8px 14px;
        font-size: 12px;
        border-bottom: 1px solid var(--nb-border-soft, #e2e8f0);
        &:last-child { border-bottom: none; }
        &:nth-child(even) { background: #f8fafc; }
      }

      .s-label { width: 140px; font-weight: 700; color: #64748b; flex-shrink: 0; }
      .s-val { flex: 1; color: #0f172a; }
      .highlight-row { background: #f0fdf4 !important; }
      .text-approve { color: #15803d; }
      .text-reject { color: #b91c1c; }
      .text-return { color: #b45309; }

      /* الفوتر */
      .wizard-footer {
        display: flex;
        align-items: center;
        gap: 8px;
        padding-top: 10px;
        border-top: 1px solid var(--nb-border-soft, #e2e8f0);
      }

      .spacer { flex: 1; }

      .btn {
        padding: 6px 14px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        border: 1px solid transparent;
        transition: all 0.15s ease;
      }

      .btn.ghost {
        background: transparent;
        color: #64748b;
        border-color: #cbd5e1;
        &:hover { background: #f1f5f9; }
      }

      .btn.secondary {
        background: #f1f5f9;
        color: #334155;
        border-color: #cbd5e1;
        &:hover { background: #e2e8f0; }
      }

      .btn.primary {
        background: #2563eb;
        color: #ffffff;
        &:hover { background: #1d4ed8; }
        &:disabled { opacity: 0.5; cursor: not-allowed; }
      }

      .btn-danger {
        background: #dc2626 !important;
        &:hover { background: #b91c1c !important; }
      }

      .mono { font-family: monospace; }
      .bold { font-weight: 700; }
    `,
  ],
})
export class ApprovalDecisionWizardModalComponent {
  @Input() open = false;
  @Input() item: UnifiedApprovalItem | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<DecisionPayload>();

  steps: string[] = [
    'مراجعة المعاملة',
    'تحديد الإجراء',
    'التأكيد النهائي',
  ];


  currentStep = signal<number>(0);
  selectedAction = signal<'approve' | 'reject' | 'return'>('approve');
  comments = signal<string>('');
  submitting = signal<boolean>(false);

  modalTitle = computed(() => {
    if (!this.item) return 'معالج اتخاذ القرار';
    return `اتخاذ قرار اعتماد — ${this.item.title_ar}`;
  });

  modalSubtitle = computed(() => {
    return 'نظام الخطوات الإلزامي لمراجعة واعتماد المعاملات في نبراس OS';
  });

  getTafqeet(amount: number): string {
    return tafqeetArabic(amount, 'جنيه سوداني');
  }

  objectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  translateKey(k: string): string {
    const dict: Record<string, string> = {
      entry_number: 'رقم القيد',
      date: 'التاريخ',
      description: 'البيان / الغرض',
      source_type: 'مصدر القيد',
      total_debit: 'إجمالي المدين',
      voucher_number: 'رقم السند',
      voucher_type: 'نوع السند',
      amount: 'المبلغ',
      gl_account: 'الحساب المحاسبي',
      payment_method: 'طريقة التحصيل / الدفع',
      deposit_to: 'جهة الإيداع / الخزينة',
      beneficiary: 'المستفيد / الطرف المعني',
      paid_by: 'الدافع / المستلم منه',
      request_number: 'رقم الطلب',
      title: 'العنوان',
      order_number: 'رقم أمر الشراء',
      total_amount: 'المبلغ الإجمالي',
      month: 'الشهر',
      year: 'السنة',
      employees_count: 'عدد الموظفين',
      employee: 'الموظف المعني',
      reason: 'السبب / المبرر',
      start_date: 'تاريخ بدء الإجازة',
      end_date: 'تاريخ انتهاء الإجازة',
      repayment_months: 'مدة التقسيط والخصم',
      monthly_installment: 'القسط الشهري المستقطع',
      student_name: 'اسم الطالب',
      student: 'الطالب',
      grade: 'الصف',
      exam: 'الامتحان',
      subject: 'المادة',
      asset: 'الأصل',
      from_warehouse: 'من مستودع',
      to_warehouse: 'إلى مستودع',
    };
    return dict[k] || k;
  }

  canProceed(): boolean {
    if (this.currentStep() === 1) {
      if (this.selectedAction() === 'reject' || this.selectedAction() === 'return') {
        return this.comments().trim().length > 3;
      }
    }
    return true;
  }

  nextStep(): void {
    if (this.currentStep() < this.steps.length - 1) {
      this.currentStep.update((s) => s + 1);
    }
  }

  prevStep(): void {
    if (this.currentStep() > 0) {
      this.currentStep.update((s) => s - 1);
    }
  }

  onCancel(): void {
    this.currentStep.set(0);
    this.comments.set('');
    this.selectedAction.set('approve');
    this.submitting.set(false);
    this.closed.emit();
  }

  submitDecision(): void {
    if (!this.item) return;
    this.submitting.set(true);
    this.confirmed.emit({
      item: this.item,
      action: this.selectedAction(),
      comments: this.comments().trim(),
    });
  }
}
