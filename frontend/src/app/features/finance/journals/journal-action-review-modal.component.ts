import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NbModalComponent } from '../../../shared/nebras/nb-modal.component';
import { NbStepperComponent } from '../../../shared/nebras/nb-stepper.component';

export type JournalActionMode = 'approve' | 'post' | 'reverse';

@Component({
  selector: 'app-journal-action-review-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe, NbModalComponent, NbStepperComponent],
  template: `
    <nb-modal [open]="open" [title]="modalTitle()" [subtitle]="modalSubtitle()" maxWidth="760px" (closed)="onCancel()">
      <div class="review-flow" dir="rtl">
        <!-- مؤشر الخطوات المعتمد في نظام نبراس -->
        <div class="stepper-wrap">
          <nb-stepper [steps]="steps()" [current]="currentStep()"></nb-stepper>
        </div>

        @if (entry; as j) {
          <!-- ================= الخطوة الأولى ================= -->
          @if (currentStep() === 1) {
            <div class="step-content">
              <!-- بطاقة الطرف المقابل (طالب / مورد / موظف) المستوحاة من Odoo و Dynamics 365 -->
              @if (j.partner_details; as p) {
                <div class="card partner-card">
                  <div class="card-header">
                    <span class="icon-avatar">🎓</span>
                    <div class="card-titles">
                      <span class="badge-partner">{{ p.partner_type_label || 'طرف المعاملة' }}</span>
                      <h4 class="partner-name">{{ p.name }}</h4>
                      @if (p.student_number) { <span class="partner-meta">الرقم الأكاديمي: <strong class="mono">{{ p.student_number }}</strong></span> }
                    </div>
                  </div>
                  <div class="partner-grid">
                    @if (p.grade_name) {
                      <div class="meta-item"><span class="k">الصف/المرحلة:</span><span class="v">{{ p.grade_name }}</span></div>
                    }
                    @if (p.guardian_name) {
                      <div class="meta-item"><span class="k">ولي الأمر:</span><span class="v">{{ p.guardian_name }}</span></div>
                    }
                    @if (j.source_details?.payment_method) {
                      <div class="meta-item"><span class="k">طريقة الدفع:</span><span class="v tag-bank">{{ j.source_details.payment_method }}</span></div>
                    }
                    @if (j.source_details?.destination) {
                      <div class="meta-item"><span class="k">الحساب المستلم:</span><span class="v">{{ j.source_details.destination }}</span></div>
                    }
                  </div>
                </div>
              }

              <!-- بطاقة المستند المصدر وبنود الرسوم إن وجدت -->
              @if (j.source_details; as src) {
                <div class="source-bar">
                  <div class="src-info">
                    <span class="src-label">{{ src.doc_type_label }}:</span>
                    <strong class="mono highlight-ref">{{ src.doc_number }}</strong>
                    <span class="src-date">بتاريخ {{ src.date }}</span>
                  </div>
                  <div class="src-amt">
                    <span class="amt-num">{{ src.amount | number:'1.2-2' }}</span>
                    <span class="amt-cur">ج.س</span>
                  </div>
                </div>
              }

              @if (j.fee_breakdown && j.fee_breakdown.length > 0) {
                <div class="fee-chips">
                  <span class="chips-title">بنود الرسوم المسددة / المستحقة:</span>
                  <div class="chips-list">
                    @for (fee of j.fee_breakdown; track $index) {
                      <span class="fee-chip">
                        <span class="f-name">{{ fee.fee_name }}</span>
                        <span class="f-amt mono">{{ (fee.allocated_amount || fee.amount) | number:'1.2-2' }} ج.س</span>
                      </span>
                    }
                  </div>
                </div>
              }

              <!-- في حالة العكس: معاينة القيد العكسي المقترح وإدخال السبب -->
              @if (mode === 'reverse') {
                <div class="reversal-form">
                  <div class="alert-box alert-warning">
                    <span class="alert-icon">⚠️</span>
                    <div class="alert-text">
                      <strong>تنبيه عكس القيد:</strong>
                      سيقوم النظام بإنشاء قيد يومية عكسي متوازن يقلب الحسابات المدينة لتصبح دائنة والعكس، لإلغاء الأثر المحاسبي في دفتر الأستاذ العام.
                    </div>
                  </div>

                  <div class="form-grid2">
                    <label>
                      <span class="req">تاريخ القيد العكسي *</span>
                      <input class="fld" type="date" [(ngModel)]="reversalDate" />
                    </label>
                    <label>
                      <span class="req">سبب عكس القيد (إلزامي) *</span>
                      <input class="fld" type="text" [(ngModel)]="reversalReason" placeholder="مثال: تصحيح توجيه حسابات / إلغاء سند القبض" />
                    </label>
                  </div>
                </div>
              }

              <!-- جدول أسطر الحسابات والتوازن المحاسبي -->
              <div class="accounts-section">
                <h5 class="sec-title">التوجيه المحاسبي وأسطر القيد</h5>
                <div class="table-wrap">
                  <table class="review-table">
                    <thead>
                      <tr>
                        <th>الحساب المحاسبي</th>
                        <th>مركز التكلفة / البيان</th>
                        <th class="end">مدين (ج.س)</th>
                        <th class="end">دائن (ج.س)</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (l of j.lines || []; track $index) {
                        <tr>
                          <td>
                            <div class="acc-cell">
                              <span class="acc-code mono">{{ l.account_code }}</span>
                              <span class="acc-name">{{ l.account_name }}</span>
                            </div>
                          </td>
                          <td class="desc-cell">{{ l.description || l.cost_center_name || '—' }}</td>
                          <td class="end mono dr-val">{{ +l.debit > 0 ? (l.debit | number:'1.2-2') : '—' }}</td>
                          <td class="end mono cr-val">{{ +l.credit > 0 ? (l.credit | number:'1.2-2') : '—' }}</td>
                        </tr>
                      }
                      <tr class="total-row">
                        <td colspan="2"><strong>الإجمالي الكلي للقيد</strong></td>
                        <td class="end mono"><strong>{{ totalDebit() | number:'1.2-2' }}</strong></td>
                        <td class="end mono"><strong>{{ totalCredit() | number:'1.2-2' }}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- مؤشر التوازن الدقيق -->
                <div class="balance-status" [class.balanced]="isBalanced()" [class.unbalanced]="!isBalanced()">
                  <span class="b-icon">{{ isBalanced() ? '✓' : '✗' }}</span>
                  <span class="b-text">{{ isBalanced() ? 'القيد متوازن محاسبياً (المدين = الدائن)' : 'تنبيه: القيد غير متوازن، الفرق: ' + (totalDebit() - totalCredit() | number:'1.2-2') + ' ج.س' }}</span>
                  <span class="b-diff mono">الفارق: {{ (totalDebit() - totalCredit()) | number:'1.2-2' }} ج.س</span>
                </div>
              </div>
            </div>
          }

          <!-- ================= الخطوة الثانية ================= -->
          @if (currentStep() === 2) {
            <div class="step-content confirm-step">
              <div class="confirm-card">
                <div class="confirm-icon-wrap" [class]="mode">
                  @if (mode === 'approve') { <span>✓</span> }
                  @if (mode === 'post') { <span>📑</span> }
                  @if (mode === 'reverse') { <span>🔄</span> }
                </div>

                <h3 class="confirm-heading">
                  @if (mode === 'approve') { تأكيد اعتماد القيد المالي }
                  @if (mode === 'post') { تأكيد الترحيل النهائي لدفتر الأستاذ }
                  @if (mode === 'reverse') { تأكيد إصدار القيد العكسي }
                </h3>

                <p class="confirm-sub">
                  @if (mode === 'approve') { سيتم تغيير حالة القيد إلى <strong>معتمد</strong> وتوثيق اسم وتوقيت الاعتماد الإداري. }
                  @if (mode === 'post') { سيتم إدراج الحركات فوراً في دفتر الأستاذ العام وتحديث أرصدة الحسابات وميزان المراجعة. }
                  @if (mode === 'reverse') { سيتم توليد قيد عكسي مرحل جديد وتعديل حالة القيد الحالي إلى <strong>معكوس</strong>. }
                </p>

                <div class="summary-box">
                  <div class="s-row"><span class="sk">رقم القيد:</span><strong class="sv mono">{{ j.entry_number }}</strong></div>
                  <div class="s-row"><span class="sk">تاريخ القيد:</span><span class="sv mono">{{ j.date }}</span></div>
                  @if (j.partner_details?.name) {
                    <div class="s-row"><span class="sk">الطرف المعني:</span><span class="sv">{{ j.partner_details.name }}</span></div>
                  }
                  <div class="s-row"><span class="sk">إجمالي المبلغ:</span><strong class="sv mono highlight">{{ totalDebit() | number:'1.2-2' }} ج.س</strong></div>
                  @if (mode === 'reverse' && reversalReason) {
                    <div class="s-row"><span class="sk">سبب العكس:</span><span class="sv text-danger">{{ reversalReason }}</span></div>
                  }
                </div>

                @if (mode === 'approve') {
                  <label class="notes-field">
                    <span>ملاحظات الاعتماد (اختياري):</span>
                    <input class="fld" [(ngModel)]="approvalNotes" placeholder="أدخل أي توجيهات أو ملاحظات تدقيق..." />
                  </label>
                }

                @if (mode === 'post') {
                  <div class="alert-box alert-caution">
                    <span class="alert-icon">⚡</span>
                    <div class="alert-text">
                      <strong>إقرار الترحيل المحاسبي:</strong>
                      الترحيل لدفتر الأستاذ العام إجراء نهائي لا يمكن التراجع عنه أو حذفه، ويكون التصحيح متاحاً لاحقاً عبر إنشاء قيد عكسي فقط.
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        }
      </div>

      <!-- أزرار الإجراءات في أسفل الـ Modal -->
      <div modal-actions class="modal-actions-bar">
        <button class="btn ghost" (click)="onCancel()">إلغاء</button>
        @if (currentStep() === 1) {
          <button class="btn primary" [disabled]="!canProceedToStep2()" (click)="goToStep(2)">
            متابعة الخطوة التالية ⬅
          </button>
        } @else {
          <button class="btn ghost" (click)="goToStep(1)">
            ➡ الرجوع للمراجعة
          </button>
          <button class="btn" [class.primary]="mode !== 'reverse'" [class.danger]="mode === 'reverse'" [disabled]="submitting" (click)="onConfirm()">
            {{ submitting ? 'جارٍ التنفيذ…' : confirmButtonText() }}
          </button>
        }
      </div>
    </nb-modal>
  `,
  styles: [`
    .review-flow { display: flex; flex-direction: column; gap: 16px; font-family: var(--nb-font-family, inherit); }
    .stepper-wrap { margin-bottom: 4px; padding-bottom: 8px; border-bottom: 1px solid var(--nb-border-soft, #f3f4f6); }
    .step-content { display: flex; flex-direction: column; gap: 14px; animation: fadeIn 0.2s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

    /* بطاقة الطرف والشريك */
    .partner-card { background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%); border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px 16px; }
    .card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .icon-avatar { width: 38px; height: 38px; border-radius: 10px; background: #dcfce7; display: grid; place-items: center; font-size: 18px; }
    .card-titles { display: flex; flex-direction: column; gap: 2px; }
    .badge-partner { font-size: 11px; font-weight: 700; color: #15803d; text-transform: uppercase; }
    .partner-name { margin: 0; font-size: 15px; font-weight: 800; color: var(--nb-text, #111827); }
    .partner-meta { font-size: 12px; color: var(--nb-text-muted, #6b7280); }
    .partner-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 14px; font-size: 12.5px; border-top: 1px solid #dcfce7; padding-top: 8px; }
    .meta-item { display: flex; gap: 6px; }
    .meta-item .k { color: var(--nb-text-muted, #6b7280); }
    .meta-item .v { font-weight: 600; color: var(--nb-text, #1f2937); }
    .tag-bank { background: #e0e7ff; color: #3730a3; padding: 1px 6px; border-radius: 4px; font-size: 11.5px; }

    /* المستند المصدري وبنود الرسوم */
    .source-bar { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid var(--nb-border, #e2e8f0); border-radius: 10px; padding: 10px 14px; font-size: 13px; }
    .src-info { display: flex; align-items: center; gap: 8px; }
    .src-label { color: var(--nb-text-muted, #64748b); font-size: 12px; }
    .highlight-ref { color: var(--nb-primary-600, #2563eb); }
    .src-date { color: var(--nb-text-muted, #94a3b8); font-size: 12px; }
    .src-amt { display: flex; align-items: baseline; gap: 4px; }
    .amt-num { font-size: 16px; font-weight: 800; color: #0f172a; font-variant-numeric: tabular-nums; }
    .amt-cur { font-size: 11.5px; font-weight: 700; color: #64748b; }

    .fee-chips { display: flex; flex-direction: column; gap: 6px; background: #fff; border: 1px dashed var(--nb-border, #cbd5e1); border-radius: 8px; padding: 10px 12px; }
    .chips-title { font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted, #64748b); }
    .chips-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .fee-chip { display: inline-flex; align-items: center; gap: 6px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; padding: 3px 8px; font-size: 12px; }
    .f-name { font-weight: 600; color: #334155; }
    .f-amt { font-size: 11px; font-weight: 700; color: #0284c7; }

    /* نموذج العكس */
    .reversal-form { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
    .form-grid2 { display: grid; grid-template-columns: 1fr 2fr; gap: 10px; }
    label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 600; color: var(--nb-text-secondary, #475569); }
    .req { color: var(--nb-text, #1e293b); }
    .fld { height: 36px; padding: 0 10px; border: 1px solid var(--nb-border, #cbd5e1); border-radius: 8px; font-family: inherit; font-size: 13px; outline: none; transition: border-color 0.15s; }
    .fld:focus { border-color: var(--nb-primary-600, #2563eb); }

    /* جدول التوجيه المحاسبي */
    .accounts-section { display: flex; flex-direction: column; gap: 8px; }
    .sec-title { margin: 0; font-size: 12.5px; font-weight: 700; color: var(--nb-text-muted, #475569); }
    .table-wrap { border: 1px solid var(--nb-border, #e2e8f0); border-radius: 8px; overflow: hidden; }
    .review-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    .review-table th { background: #f8fafc; padding: 8px 10px; font-size: 11px; font-weight: 700; color: #64748b; text-align: start; border-bottom: 1px solid #e2e8f0; }
    .review-table td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
    .acc-cell { display: flex; flex-direction: column; gap: 1px; }
    .acc-code { font-size: 11px; font-weight: 700; color: #64748b; }
    .acc-name { font-weight: 600; font-size: 12.5px; }
    .desc-cell { color: #64748b; font-size: 11.5px; }
    .dr-val { color: #0284c7; font-weight: 600; }
    .cr-val { color: #16a34a; font-weight: 600; }
    .end { text-align: end; }
    .mono { font-variant-numeric: tabular-nums; }
    .total-row td { background: #f8fafc; border-top: 2px solid #e2e8f0; font-weight: 700; }

    /* حالة التوازن */
    .balance-status { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; }
    .balance-status.balanced { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
    .balance-status.unbalanced { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
    .b-diff { margin-inline-start: auto; font-size: 11.5px; }

    /* شاشة التأكيد */
    .confirm-card { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 12px 16px; gap: 12px; }
    .confirm-icon-wrap { width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; font-size: 24px; font-weight: bold; }
    .confirm-icon-wrap.approve { background: #dcfce7; color: #15803d; }
    .confirm-icon-wrap.post { background: #e0e7ff; color: #3730a3; }
    .confirm-icon-wrap.reverse { background: #fee2e2; color: #b91c1c; }
    .confirm-heading { margin: 0; font-size: 17px; font-weight: 800; color: #0f172a; }
    .confirm-sub { margin: 0; font-size: 13px; color: #64748b; max-width: 500px; line-height: 1.5; }
    .summary-box { width: 100%; max-width: 440px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; text-align: start; }
    .s-row { display: flex; justify-content: space-between; font-size: 13px; }
    .sk { color: #64748b; }
    .sv { color: #0f172a; font-weight: 600; }
    .sv.highlight { color: #2563eb; font-size: 14px; }
    .notes-field { width: 100%; max-width: 440px; text-align: start; }
    .text-danger { color: #dc2626; }

    /* التنبيهات */
    .alert-box { display: flex; gap: 10px; align-items: flex-start; padding: 10px 14px; border-radius: 8px; font-size: 12.5px; text-align: start; }
    .alert-warning { background: #fffbeb; border: 1px solid #fef3c7; color: #92400e; }
    .alert-caution { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; width: 100%; max-width: 440px; }
    .alert-icon { font-size: 16px; flex: none; }
    .alert-text { line-height: 1.4; }

    /* الأزرار */
    .modal-actions-bar { display: flex; justify-content: flex-end; gap: 10px; width: 100%; }
    .btn { height: 36px; padding: 0 16px; font-family: inherit; font-size: 13px; font-weight: 600; border-radius: 8px; cursor: pointer; border: none; transition: background 0.15s; }
    .btn.primary { background: var(--nb-primary-600, #2563eb); color: #fff; }
    .btn.primary:hover:not(:disabled) { background: #1d4ed8; }
    .btn.danger { background: #dc2626; color: #fff; }
    .btn.danger:hover:not(:disabled) { background: #b91c1c; }
    .btn.ghost { background: #f1f5f9; border: 1px solid #cbd5e1; color: #334155; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class JournalActionReviewModalComponent {
  @Input() open = false;
  @Input() entry: any = null;
  @Input() mode: JournalActionMode = 'approve';
  @Input() submitting = false;

  @Output() confirmed = new EventEmitter<{ mode: JournalActionMode; notes?: string; reversal_date?: string; reversal_reason?: string }>();
  @Output() cancelled = new EventEmitter<void>();

  currentStep = signal<number>(1);
  approvalNotes = '';
  reversalReason = '';
  reversalDate = new Date().toISOString().split('T')[0];

  steps = computed(() => {
    if (this.mode === 'approve') return ['مراجعة القيد والتوازن', 'تأكيد الاعتماد'];
    if (this.mode === 'post') return ['فحص دفتر الأستاذ', 'إقرار الترحيل النهائي'];
    return ['معاينة القيد العكسي', 'تأكيد إنشاء القيد'];
  });

  modalTitle = computed(() => {
    const num = this.entry?.entry_number || '';
    if (this.mode === 'approve') return `مراجعة واعتماد القيد (${num})`;
    if (this.mode === 'post') return `مراجعة وترحيل القيد لدفتر الأستاذ (${num})`;
    return `مراجعة وعكس القيد المحاسبي (${num})`;
  });

  modalSubtitle = computed(() => {
    if (this.mode === 'approve') return 'التأكد من التوازن المحاسبي، الأطراف، وبنود الرسوم قبل اعتماد القيد.';
    if (this.mode === 'post') return 'معاينة التأثير المالي على دفتر الأستاذ العام قبل الترحيل.';
    return 'معاينة القيد العكسي لتصحيح الأرصدة وإلغاء أثر المعاملة الأصلية.';
  });

  confirmButtonText = computed(() => {
    if (this.mode === 'approve') return '✓ تأكيد الاعتماد المالي';
    if (this.mode === 'post') return '📑 تأكيد الترحيل لدفتر الأستاذ';
    return '🔄 تأكيد عكس القيد';
  });

  totalDebit = computed(() => (this.entry?.lines || []).reduce((s: number, l: any) => s + (Number(l.debit) || 0), 0));
  totalCredit = computed(() => (this.entry?.lines || []).reduce((s: number, l: any) => s + (Number(l.credit) || 0), 0));
  isBalanced = computed(() => Math.abs(this.totalDebit() - this.totalCredit()) < 0.01);

  canProceedToStep2(): boolean {
    if (this.mode === 'reverse') {
      return !!this.reversalReason.trim() && !!this.reversalDate && this.isBalanced();
    }
    return this.isBalanced();
  }

  goToStep(step: number) {
    this.currentStep.set(step);
  }

  onConfirm() {
    this.confirmed.emit({
      mode: this.mode,
      notes: this.approvalNotes,
      reversal_date: this.reversalDate,
      reversal_reason: this.reversalReason,
    });
  }

  onCancel() {
    this.currentStep.set(1);
    this.approvalNotes = '';
    this.reversalReason = '';
    this.cancelled.emit();
  }
}
