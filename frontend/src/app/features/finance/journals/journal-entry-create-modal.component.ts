import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NbModalComponent } from '../../../shared/nebras/nb-modal.component';
import { NbStepperComponent } from '../../../shared/nebras/nb-stepper.component';
import { tafqeetArabic } from './journal-voucher-print';

export interface CreateJournalLine {
  account: string;
  debit: number;
  credit: number;
  cost_center: string | null;
  description?: string;
}

@Component({
  selector: 'app-journal-entry-create-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe, NbModalComponent, NbStepperComponent],
  template: `
    <nb-modal
      [open]="open"
      title="إنشاء قيد يومية محاسبي جديد"
      subtitle="معالج متعدد الخطوات بنمط نبراس مع مراجعة التوازن والتأكيد النهائي."
      maxWidth="860px"
      (closed)="onCancel()"
    >
      <nb-stepper [steps]="stepLabels" [current]="currentStep() + 1"></nb-stepper>

      <div class="step-content">
        <!-- الخطوة 1: البيانات الأساسية للقيد -->
        @if (currentStep() === 0) {
          <div class="form-grid">
            <label>
              <span>رقم القيد المحاسبي *</span>
              <input type="text" class="fld mono" [(ngModel)]="entryNumber" placeholder="مثال: JV-2026-001" required />
            </label>

            <label>
              <span>تاريخ القيد *</span>
              <input type="date" class="fld mono" [(ngModel)]="entryDate" required />
            </label>

            <label>
              <span>الفترة المحاسبية *</span>
              <select class="fld" [(ngModel)]="selectedPeriod">
                <option value="">اختر الفترة المالية المفتوحة…</option>
                @for (p of periods; track p.id) {
                  <option [value]="p.id">{{ p.name }} ({{ p.start_date }} إلى {{ p.end_date }})</option>
                }
              </select>
            </label>

            <label>
              <span>المستند المرجعي (اختياري)</span>
              <input type="text" class="fld mono" [(ngModel)]="reference" placeholder="مثال: INV-2026-01 أو RCP-005" />
            </label>

            <label class="full-width">
              <span>البيان المحاسبي العام للقيد *</span>
              <textarea class="fld-area" [(ngModel)]="description" rows="2" placeholder="اكتب بياناً محاسبياً واضحاً يشمل الطرف والغاية من القيد…"></textarea>
            </label>
          </div>
        }

        <!-- الخطوة 2: أسطر القيد المزدوج والتحقق من التوازن -->
        @if (currentStep() === 1) {
          <div class="lines-builder">
            <div class="builder-header">
              <span class="sec-title">أسطر القيد المزدوج (مدين / دائن)</span>
              <button type="button" class="btn primary xs" (click)="addLine()">+ إضافة سطر محاسبي</button>
            </div>

            <div class="table-wrap">
              <table class="nb-table">
                <thead>
                  <tr>
                    <th style="width: 35%;">الحساب المحاسبي *</th>
                    <th style="width: 25%;">مركز التكلفة</th>
                    <th style="width: 18%;" class="end">مدين (ج.س)</th>
                    <th style="width: 18%;" class="end">دائن (ج.س)</th>
                    <th style="width: 4%;"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (l of lines; track $index) {
                    <tr>
                      <td>
                        <select class="fld-sm" [(ngModel)]="l.account" (ngModelChange)="onLineChange()">
                          <option value="">اختر الحساب…</option>
                          @for (a of accounts; track a.id) {
                            <option [value]="a.id">{{ a.code }} - {{ a.name_ar }}</option>
                          }
                        </select>
                      </td>
                      <td>
                        <select class="fld-sm" [(ngModel)]="l.cost_center">
                          <option [ngValue]="null">بدون مركز تكلفة</option>
                          @for (c of costCenters; track c.id) {
                            <option [value]="c.id">{{ c.name_ar }}</option>
                          }
                        </select>
                      </td>
                      <td>
                        <input type="number" class="fld-sm num" [(ngModel)]="l.debit" (input)="onDebitChange(l)" placeholder="0.00" min="0" />
                      </td>
                      <td>
                        <input type="number" class="fld-sm num" [(ngModel)]="l.credit" (input)="onCreditChange(l)" placeholder="0.00" min="0" />
                      </td>
                      <td class="center">
                        <button type="button" class="del-btn" (click)="removeLine($index)" [disabled]="lines.length <= 2" title="حذف السطر">✕</button>
                      </td>
                    </tr>
                  }
                </tbody>
                <tfoot>
                  <tr class="sum-row">
                    <td colspan="2"><strong>الإجمالي المحاسبي للقيد:</strong></td>
                    <td class="end mono text-info"><strong>{{ totalDebit() | number:'1.2-2' }}</strong></td>
                    <td class="end mono text-success"><strong>{{ totalCredit() | number:'1.2-2' }}</strong></td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- شريط حالة توازن القيد -->
            <div class="balance-banner" [class.balanced]="isBalanced()" [class.unbalanced]="!isBalanced()">
              @if (isBalanced()) {
                <span class="icon">✓</span>
                <span class="msg">القيد المحاسبي متوازن تماماً (المدين يطابق الدائن بمبلغ {{ totalDebit() | number:'1.2-2' }} ج.س).</span>
              } @else {
                <span class="icon">⚠️</span>
                <span class="msg">
                  القيد غير متوازن! الفارق المحاسبي: <strong>{{ balanceDiff() | number:'1.2-2' }} ج.س</strong>
                  ({{ totalDebit() > totalCredit() ? 'المدين أكبر من الدائن' : 'الدائن أكبر من المدين' }}).
                </span>
              }
            </div>
          </div>
        }

        <!-- الخطوة 3: المراجعة والتأكيد النهائي -->
        @if (currentStep() === 2) {
          <div class="review-box">
            <div class="review-meta">
              <div class="rm-col"><span class="k">رقم القيد:</span><span class="v mono">{{ entryNumber }}</span></div>
              <div class="rm-col"><span class="k">التاريخ:</span><span class="v mono">{{ entryDate }}</span></div>
              <div class="rm-col"><span class="k">المستند المرجعي:</span><span class="v mono">{{ reference || '—' }}</span></div>
              <div class="rm-col"><span class="k">العملة:</span><span class="v">الجنيه السوداني (ج.س)</span></div>
            </div>

            <div class="rm-desc">
              <strong>البيان المحاسبي:</strong> {{ description }}
            </div>

            <div class="review-lines">
              <span class="rl-title">ملخص أسطر القيد المزمع إنشاؤه:</span>
              <table class="nb-table preview-table">
                <thead>
                  <tr>
                    <th>الحساب</th>
                    <th class="end">مدين (ج.س)</th>
                    <th class="end">دائن (ج.س)</th>
                  </tr>
                </thead>
                <tbody>
                  @for (l of validLines(); track $index) {
                    <tr>
                      <td><strong>{{ getAccountLabel(l.account) }}</strong></td>
                      <td class="end mono text-info">{{ +l.debit > 0 ? (l.debit | number:'1.2-2') : '—' }}</td>
                      <td class="end mono text-success">{{ +l.credit > 0 ? (l.credit | number:'1.2-2') : '—' }}</td>
                    </tr>
                  }
                  <tr class="sum-row">
                    <td><strong>الإجمالي الكلي المتطابق:</strong></td>
                    <td class="end mono text-info"><strong>{{ totalDebit() | number:'1.2-2' }} ج.س</strong></td>
                    <td class="end mono text-success"><strong>{{ totalCredit() | number:'1.2-2' }} ج.س</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="tafqeet-card">
              <span class="t-lbl">المبلغ كتابةً:</span>
              <span class="t-txt">{{ tafqeetText() }}</span>
            </div>

            <div class="confirm-alert">
              <span class="ca-icon">🛡️</span>
              <div class="ca-txt">
                <strong>تأكيد نهائي:</strong>
                <span>سيتم حفظ هذا القيد كمسودة معتمدة وجاهزة للتدقيق والترحيل لدفتر الأستاذ العام. يرجى تأكيد العملية للمتابعة.</span>
              </div>
            </div>
          </div>
        }
      </div>

      <div modal-actions class="wizard-actions">
        <button type="button" class="btn ghost" (click)="onCancel()" [disabled]="submitting">إلغاء</button>
        <div class="step-nav">
          @if (currentStep() > 0) {
            <button type="button" class="btn ghost" (click)="prevStep()" [disabled]="submitting">السابق</button>
          }
          @if (currentStep() < 2) {
            <button type="button" class="btn primary" (click)="nextStep()" [disabled]="!canProceed()">التالي</button>
          }
          @if (currentStep() === 2) {
            <button type="button" class="btn success-btn" (click)="confirmSave()" [disabled]="submitting || !isBalanced()">
              {{ submitting ? 'جارٍ الحفظ…' : '✓ تأكيد وحفظ القيد المحاسبي' }}
            </button>
          }
        </div>
      </div>
    </nb-modal>
  `,
  styles: [`
    .step-content { min-height: 290px; padding: 10px 0; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .full-width { grid-column: 1 / -1; }
    label { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; color: var(--nb-text-muted); font-weight: 600; }
    .fld { height: 36px; padding: 0 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; box-sizing: border-box; }
    .fld-area { padding: 8px 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; box-sizing: border-box; resize: vertical; }

    .builder-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .sec-title { font-size: 13px; font-weight: 700; color: var(--nb-text); }
    .fld-sm { height: 30px; padding: 0 6px; border: 1px solid var(--nb-border); border-radius: 4px;
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 12px; width: 100%; box-sizing: border-box; }
    .fld-sm.num { text-align: end; font-variant-numeric: tabular-nums; font-family: monospace; }
    .del-btn { background: none; border: none; color: #ef4444; font-weight: bold; cursor: pointer; padding: 4px 6px; border-radius: 4px; }
    .del-btn:disabled { opacity: 0.3; cursor: not-allowed; }

    .table-wrap { border: 1px solid var(--nb-border); border-radius: var(--nb-radius); overflow: hidden; margin-bottom: 10px; }
    .nb-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    .nb-table th { background: var(--nb-surface-raised); padding: 7px 10px; font-size: 11px; font-weight: 700; color: var(--nb-text-muted); text-align: start; }
    .nb-table td { padding: 6px 10px; border-bottom: 1px solid var(--nb-border-soft); }
    .sum-row td { background: var(--nb-surface-raised); font-weight: 700; border-top: 2px solid var(--nb-border); }

    .balance-banner { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; }
    .balance-banner.balanced { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    .balance-banner.unbalanced { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }

    .review-box { display: flex; flex-direction: column; gap: 10px; }
    .review-meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; background: var(--nb-surface-raised); border: 1px solid var(--nb-border); border-radius: 6px; padding: 8px 10px; }
    .rm-col .k { font-size: 10px; color: var(--nb-text-muted); display: block; font-weight: 600; }
    .rm-col .v { font-size: 12px; font-weight: 700; color: var(--nb-text); }
    .rm-desc { background: #fff; border: 1px dashed var(--nb-border); border-radius: 6px; padding: 8px 10px; font-size: 12px; color: var(--nb-text); }
    .preview-table { font-size: 12px; }
    .rl-title { font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); margin-bottom: 4px; display: block; }

    .tafqeet-card { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 8px 12px; font-size: 12px; }
    .t-lbl { font-weight: 700; color: #1e40af; margin-inline-end: 6px; }
    .t-txt { font-weight: 700; color: #0f172a; }

    .confirm-alert { display: flex; gap: 10px; align-items: center; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 12px; font-size: 12px; color: #92400e; }
    .confirm-alert .ca-icon { font-size: 18px; }
    .confirm-alert .ca-txt { display: flex; flex-direction: column; gap: 2px; }

    .wizard-actions { display: flex; justify-content: space-between; align-items: center; width: 100%; }
    .step-nav { display: flex; gap: 8px; }
    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.success-btn { background: #16a34a; color: #fff; }
    .btn.xs { height: 28px; padding: 0 10px; font-size: 11.5px; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .mono { font-family: monospace; font-variant-numeric: tabular-nums; }
    .end { text-align: end; }
    .center { text-align: center; }
    .text-info { color: #0284c7; }
    .text-success { color: #16a34a; }
  `]
})
export class JournalEntryCreateModalComponent {
  @Input() open = false;
  @Input() accounts: any[] = [];
  @Input() periods: any[] = [];
  @Input() costCenters: any[] = [];
  @Input() submitting = false;

  @Output() submitted = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();

  stepLabels: string[] = ['البيانات الأساسية', 'الأسطر والتوازن', 'المراجعة والتأكيد'];

  currentStep = signal(0);

  entryNumber = '';
  entryDate = new Date().toISOString().split('T')[0];
  selectedPeriod = '';
  reference = '';
  description = '';

  lines: CreateJournalLine[] = [
    { account: '', debit: 0, credit: 0, cost_center: null },
    { account: '', debit: 0, credit: 0, cost_center: null }
  ];

  private linesVersion = signal(0);

  totalDebit = computed(() => {
    this.linesVersion();
    return this.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  });

  totalCredit = computed(() => {
    this.linesVersion();
    return this.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  });

  balanceDiff = computed(() => Math.abs(this.totalDebit() - this.totalCredit()));
  isBalanced = computed(() => this.totalDebit() > 0 && this.balanceDiff() < 0.01);

  validLines = computed(() => {
    this.linesVersion();
    return this.lines.filter(l => l.account && (Number(l.debit) > 0 || Number(l.credit) > 0));
  });

  tafqeetText = computed(() => tafqeetArabic(this.totalDebit(), 'جنيه سوداني'));

  onStepChange(stepIndex: number) {
    if (stepIndex <= this.currentStep() || this.canProceed()) {
      this.currentStep.set(stepIndex);
    }
  }

  nextStep() {
    if (this.currentStep() < 2 && this.canProceed()) {
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
      return !!(this.entryNumber && this.entryDate && this.selectedPeriod && this.description);
    }
    if (this.currentStep() === 1) {
      return this.isBalanced() && this.validLines().length >= 2;
    }
    return true;
  }

  addLine() {
    this.lines.push({ account: '', debit: 0, credit: 0, cost_center: null });
    this.linesVersion.update(v => v + 1);
  }

  removeLine(index: number) {
    if (this.lines.length > 2) {
      this.lines.splice(index, 1);
      this.linesVersion.update(v => v + 1);
    }
  }

  onDebitChange(l: CreateJournalLine) {
    if (l.debit) l.credit = 0;
    this.linesVersion.update(v => v + 1);
  }

  onCreditChange(l: CreateJournalLine) {
    if (l.credit) l.debit = 0;
    this.linesVersion.update(v => v + 1);
  }

  onLineChange() {
    this.linesVersion.update(v => v + 1);
  }

  getAccountLabel(accId: string): string {
    const acc = this.accounts.find(a => a.id === accId);
    return acc ? `${acc.code} - ${acc.name_ar}` : 'حساب محاسبي';
  }

  confirmSave() {
    if (!this.canProceed() || !this.isBalanced()) return;
    const payload = {
      entry_number: this.entryNumber,
      date: this.entryDate,
      accounting_period: this.selectedPeriod,
      reference: this.reference,
      description: this.description,
      lines: this.validLines()
    };
    this.submitted.emit(payload);
  }

  onCancel() {
    this.cancelled.emit();
  }

  reset() {
    this.currentStep.set(0);
    this.entryNumber = `JV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    this.entryDate = new Date().toISOString().split('T')[0];
    this.selectedPeriod = this.periods.length > 0 ? this.periods[0].id : '';
    this.reference = '';
    this.description = '';
    this.lines = [
      { account: '', debit: 0, credit: 0, cost_center: null },
      { account: '', debit: 0, credit: 0, cost_center: null }
    ];
    this.linesVersion.update(v => v + 1);
  }
}
