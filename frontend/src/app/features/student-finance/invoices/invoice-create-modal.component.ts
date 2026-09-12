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

export interface CustomFeeEntry {
  id: string;
  name: string;
  amount: number;
  fee_type_id?: string;
  fee_type_name?: string;
  description?: string;
}

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
      maxWidth="820px"
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

        <!-- الخطوة 2: تحديد الرسوم (معتمدة أو إدخال يدوي) -->
        @if (currentStep() === 1) {
          <div class="fees-container">
            <!-- شريط التبديل بين هياكل الرسوم المعتمدة والإدخال اليدوي -->
            <div class="fees-mode-tabs">
              <button
                type="button"
                class="mode-tab"
                [class.active]="feeTab() === 'structures'"
                (click)="feeTab.set('structures')"
              >
                📋 هياكل الرسوم المعتمدة ({{ feeStructures().length }})
                @if (selectedFeeIds().length > 0) {
                  <span class="pill-badge">{{ selectedFeeIds().length }}</span>
                }
              </button>

              <button
                type="button"
                class="mode-tab"
                [class.active]="feeTab() === 'manual'"
                (click)="feeTab.set('manual')"
              >
                ✏️ إدخال يدوي لبنود الرسوم
                @if (customItems().length > 0) {
                  <span class="pill-badge green">{{ customItems().length }}</span>
                }
              </button>
            </div>

            <!-- عرض هياكل الرسوم المعتمدة -->
            @if (feeTab() === 'structures') {
              <div class="fees-header">
                <span class="fh-title">هياكل الرسوم الدراسية المعتمدة في النظام</span>
                <span class="fh-count">المحدد: {{ selectedFeeIds().length }} رسم بمبلغ {{ selectedStructuresTotal() | number:'1.2-2' }} ج.س</span>
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
                      <div class="fc-name" [title]="fs.name">{{ fs.name }}</div>
                      @if (fs.code) {
                        <div class="fc-code">{{ fs.code }}</div>
                      }
                    </div>
                    <div class="fc-amount">
                      <span class="num">{{ getFeeAmount(fs) | number:'1.2-2' }}</span>
                      <span class="curr">ج.س</span>
                    </div>
                  </div>
                }
                @if (feeStructures().length === 0) {
                  <div class="empty-fees">لا توجد هياكل رسوم معرّفة حالياً في النظام. يمكنك إدخال الرسوم يدوياً عبر التبويب الآخر.</div>
                }
              </div>
            }

            <!-- قسم الإدخال اليدوي لبنود الرسوم -->
            @if (feeTab() === 'manual') {
              <div class="manual-fee-box">
                <div class="mf-title">إضافة بند رسم يدوي / مخصص للفاتورة</div>
                <div class="mf-grid">
                  <label class="mf-name-fld">
                    <span class="fld-title">اسم الرسم أو البيان *</span>
                    <input
                      type="text"
                      class="fld"
                      [(ngModel)]="newCustomName"
                      placeholder="مثال: رسوم نقل إضافي، دروس تقوية، زي رياضي، بدل فاقد…"
                      (keydown.enter)="addCustomItem()"
                    />
                  </label>

                  <label class="mf-amt-fld">
                    <span class="fld-title">المبلغ (ج.س) *</span>
                    <input
                      type="number"
                      class="fld mono font-bold"
                      [(ngModel)]="newCustomAmount"
                      min="1"
                      step="any"
                      placeholder="0.00"
                      (keydown.enter)="addCustomItem()"
                    />
                  </label>

                  <label class="mf-type-fld">
                    <span class="fld-title">تصنيف الرسم (اختياري)</span>
                    <select class="fld" [(ngModel)]="newCustomFeeTypeId">
                      <option value="">— رسوم عامة / متنوعة —</option>
                      @for (ft of feeTypes(); track ft.id) {
                        <option [value]="ft.id">{{ ft.name_ar }}</option>
                      }
                    </select>
                  </label>

                  <div class="mf-btn-wrap">
                    <button
                      type="button"
                      class="btn primary mf-add-btn"
                      (click)="addCustomItem()"
                      [disabled]="!newCustomName.trim() || !(newCustomAmount && newCustomAmount > 0)"
                    >
                      ＋ إضافة البند
                    </button>
                  </div>
                </div>

                <!-- جدول البنود اليدوية المضافة -->
                @if (customItems().length > 0) {
                  <div class="custom-items-section">
                    <div class="cis-header">البنود اليدوية المضافة للفاتورة ({{ customItems().length }}):</div>
                    <table class="cis-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>اسم الرسم / البيان</th>
                          <th>التصنيف</th>
                          <th style="text-align: left;">المبلغ (ج.س)</th>
                          <th style="width: 50px; text-align: center;">إجراء</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (ci of customItems(); track ci.id; let idx = $index) {
                          <tr>
                            <td class="mono muted">{{ idx + 1 }}</td>
                            <td class="bold">{{ ci.name }}</td>
                            <td class="muted">{{ ci.fee_type_name || 'عام / مخصص' }}</td>
                            <td class="mono font-bold" style="text-align: left;">{{ ci.amount | number:'1.2-2' }}</td>
                            <td style="text-align: center;">
                              <button type="button" class="btn-del" (click)="removeCustomItem(ci.id)" title="حذف هذا البند">
                                ✕
                              </button>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                } @else {
                  <div class="empty-custom-items">
                    <span>لم تتم إضافة أي بنود يدوية بعد. املأ الحقول أعلاه واضغط على <strong>"＋ إضافة البند"</strong>.</span>
                  </div>
                }
              </div>
            }

            <!-- شريط ملخص إجمالي الرسوم المعتمدة واليدوية والتفقيط -->
            <div class="total-summary-card">
              <div class="tsc-row">
                <div class="tsc-stats">
                  <span>تم تحديد <strong>{{ selectedFeeIds().length }}</strong> رسم معتمد</span>
                  <span class="sep">•</span>
                  <span><strong>{{ customItems().length }}</strong> بند يدوي</span>
                  <span class="sep">•</span>
                  <span class="tot-label">الإجمالي الكلي:</span>
                  <strong class="tot-amount mono">{{ selectedTotal() | number:'1.2-2' }} ج.س</strong>
                </div>
              </div>

              @if (selectedTotal() > 0) {
                <div class="tafqeet-box">
                  <span class="tafqeet-title">المبلغ كتابةً:</span>
                  <span class="tafqeet-text">{{ getTafqeet(selectedTotal()) }}</span>
                </div>
              }
            </div>
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

              <div class="rc-section-title">بنود الفاتورة المشمولة ({{ totalItemsCount() }})</div>
              <table class="rc-table">
                <thead>
                  <tr>
                    <th>البند / الرسم</th>
                    <th>النوع</th>
                    <th style="text-align: left;">المبلغ (ج.س)</th>
                  </tr>
                </thead>
                <tbody>
                  <!-- بنود هياكل الرسوم المعتمدة -->
                  @for (fs of selectedFeeItems(); track fs.id) {
                    <tr>
                      <td class="bold">{{ fs.name }}</td>
                      <td><span class="source-badge standard">هيكل معتمد</span></td>
                      <td class="mono font-bold" style="text-align: left;">{{ getFeeAmount(fs) | number:'1.2-2' }}</td>
                    </tr>
                  }

                  <!-- بنود الرسوم اليدوية -->
                  @for (ci of customItems(); track ci.id) {
                    <tr>
                      <td class="bold">{{ ci.name }}</td>
                      <td><span class="source-badge manual">إدخال يدوي</span></td>
                      <td class="mono font-bold" style="text-align: left;">{{ ci.amount | number:'1.2-2' }}</td>
                    </tr>
                  }
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="2" class="bold">الإجمالي الكلي للفاتورة:</td>
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
      min-height: 400px;
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
      gap: 14px;
    }

    .fees-mode-tabs {
      display: flex;
      gap: 10px;
      border-bottom: 2px solid var(--nb-border-soft);
      padding-bottom: 8px;
    }
    .mode-tab {
      background: transparent;
      border: none;
      padding: 8px 16px;
      font-family: inherit;
      font-size: 13.5px;
      font-weight: 600;
      color: var(--nb-text-muted);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border-radius: var(--nb-radius);
      transition: all 0.15s ease;
    }
    .mode-tab:hover {
      background: var(--nb-surface-raised);
      color: var(--nb-text);
    }
    .mode-tab.active {
      background: #eff6ff;
      color: var(--nb-primary-700);
      font-weight: 700;
    }
    .pill-badge {
      background: var(--nb-primary-600);
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      padding: 1px 7px;
      border-radius: 9999px;
    }
    .pill-badge.green {
      background: #059669;
    }

    .fees-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 4px;
    }
    .fh-title { font-weight: 700; font-size: 13px; color: var(--nb-text); }
    .fh-count { font-size: 12px; font-weight: 600; color: var(--nb-primary-700); }

    .fees-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 10px;
      max-height: 250px;
      overflow-y: auto;
      padding: 4px;
    }
    .fee-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
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
    .fc-name {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--nb-text);
      line-height: 1.35;
      word-break: break-word;
    }
    .fc-code { font-size: 11px; color: var(--nb-text-muted); font-family: monospace; }
    .fc-amount { text-align: left; flex-shrink: 0; }
    .fc-amount .num { font-weight: 700; font-size: 13.5px; color: var(--nb-text); font-family: monospace; }
    .fc-amount .curr { font-size: 10px; color: var(--nb-text-muted); margin-right: 3px; }
    .empty-fees { padding: 30px; text-align: center; color: var(--nb-text-muted); grid-column: 1 / -1; font-size: 13px; }

    /* الإدخال اليدوي */
    .manual-fee-box {
      background: var(--nb-surface-raised);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
      padding: 16px;
    }
    .mf-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--nb-text);
      margin-bottom: 12px;
    }
    .mf-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: flex-end;
      margin-bottom: 14px;
    }
    .mf-name-fld { flex: 2; min-width: 220px; }
    .mf-amt-fld { flex: 1; min-width: 130px; }
    .mf-type-fld { flex: 1.2; min-width: 160px; }
    .mf-btn-wrap { flex-shrink: 0; }
    .mf-add-btn { height: 40px; padding: 0 16px; }

    .custom-items-section {
      margin-top: 14px;
    }
    .cis-header {
      font-size: 12px;
      font-weight: 700;
      color: var(--nb-text-muted);
      margin-bottom: 6px;
    }
    .cis-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
      background: var(--nb-surface);
      border: 1px solid var(--nb-border-soft);
      border-radius: var(--nb-radius);
      overflow: hidden;
    }
    .cis-table th {
      background: #f8fafc;
      padding: 7px 10px;
      text-align: right;
      font-weight: 600;
      color: var(--nb-text-muted);
      border-bottom: 1px solid var(--nb-border-soft);
    }
    .cis-table td {
      padding: 8px 10px;
      border-bottom: 1px solid var(--nb-border-soft);
      color: var(--nb-text);
    }
    .cis-table tr:last-child td { border-bottom: none; }
    .btn-del {
      background: #fee2e2;
      border: 1px solid #fca5a5;
      color: #b91c1c;
      width: 26px;
      height: 26px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }
    .btn-del:hover {
      background: #ef4444;
      color: #fff;
    }
    .empty-custom-items {
      padding: 18px;
      text-align: center;
      font-size: 12.5px;
      color: var(--nb-text-muted);
      background: var(--nb-surface);
      border: 1px dashed var(--nb-border);
      border-radius: var(--nb-radius);
    }

    .total-summary-card {
      background: var(--nb-surface-raised);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .tsc-row { display: flex; justify-content: space-between; align-items: center; }
    .tsc-stats { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--nb-text); flex-wrap: wrap; }
    .tsc-stats .sep { color: var(--nb-border); }
    .tot-label { color: var(--nb-text-muted); font-weight: 600; }
    .tot-amount { font-size: 16px; color: var(--nb-primary-700); font-weight: 800; }

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

    .source-badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .source-badge.standard {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }
    .source-badge.manual {
      background: #f0fdf4;
      color: #15803d;
      border: 1px solid #bbf7d0;
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
    'هياكل وبنود الرسوم',
    'المراجعة والتأكيد',
  ];

  currentStep = signal(0);
  submitting = signal(false);

  accounts = signal<any[]>([]);
  studentsMap = signal<Map<string, any>>(new Map());
  feeStructures = signal<any[]>([]);
  feeTypes = signal<any[]>([]);

  selectedAccountId = '';
  dueDate = this.formatDate(new Date(Date.now() + 14 * 86400000)); // بعد أسبوعين افتراضياً
  selectedFeeIds = signal<string[]>([]);
  feeStructureAmounts = signal<Record<string, number>>({});

  // الإدخال اليدوي للرسوم
  feeTab = signal<'structures' | 'manual'>('structures');
  customItems = signal<CustomFeeEntry[]>([]);
  newCustomName = '';
  newCustomAmount: number | null = null;
  newCustomFeeTypeId = '';

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

  selectedStructuresTotal = computed(() => {
    return this.selectedFeeItems().reduce((sum, fs) => sum + this.getFeeAmount(fs), 0);
  });

  customItemsTotal = computed(() => {
    return this.customItems().reduce((sum, ci) => sum + (+ci.amount || 0), 0);
  });

  selectedTotal = computed(() => {
    return this.selectedStructuresTotal() + this.customItemsTotal();
  });

  totalItemsCount = computed(() => {
    return this.selectedFeeIds().length + this.customItems().length;
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

    this.svc.listFeeTypes().subscribe({
      next: (res) => {
        this.feeTypes.set(res?.data ?? []);
      },
    });
  }

  resetForm() {
    this.currentStep.set(0);
    this.selectedAccountId = this.preselectedAccountId || '';
    this.dueDate = this.formatDate(new Date(Date.now() + 14 * 86400000));
    this.selectedFeeIds.set([]);
    this.feeStructureAmounts.set({});
    this.customItems.set([]);
    this.newCustomName = '';
    this.newCustomAmount = null;
    this.newCustomFeeTypeId = '';
    this.feeTab.set('structures');
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

  getFeeAmount(fs: any): number {
    const overrides = this.feeStructureAmounts();
    if (overrides[fs.id] !== undefined) {
      return overrides[fs.id];
    }
    return +fs.amount || 0;
  }

  addCustomItem() {
    const name = this.newCustomName.trim();
    const amount = +(this.newCustomAmount || 0);

    if (!name) {
      this.notify.warning('يرجى كتابة اسم أو بيان الرسم.');
      return;
    }
    if (!amount || amount <= 0) {
      this.notify.warning('يرجى تحديد مبلغ صحيح للرسم.');
      return;
    }

    const ft = this.feeTypes().find((t) => t.id === this.newCustomFeeTypeId);
    const item: CustomFeeEntry = {
      id: 'custom-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      name,
      amount,
      fee_type_id: this.newCustomFeeTypeId || undefined,
      fee_type_name: ft?.name_ar || ft?.name || undefined,
    };

    this.customItems.update((items) => [...items, item]);
    this.newCustomName = '';
    this.newCustomAmount = null;
    this.newCustomFeeTypeId = '';
    this.notify.success(`تمت إضافة بند "${name}" بمبلغ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.س.`);
  }

  removeCustomItem(id: string) {
    this.customItems.update((items) => items.filter((x) => x.id !== id));
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
      return this.selectedFeeIds().length > 0 || this.customItems().length > 0;
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
      fee_structure_ids: this.selectedFeeIds(),
      due_date: this.dueDate,
    };

    if (this.customItems().length > 0) {
      payload.custom_items = this.customItems().map((ci) => ({
        name: ci.name,
        amount: ci.amount,
        fee_type_id: ci.fee_type_id,
      }));
    }

    if (Object.keys(this.feeStructureAmounts()).length > 0) {
      payload.fee_structure_amounts = this.feeStructureAmounts();
    }

    this.svc.generateStudentInvoice(payload).subscribe({
      next: (res) => {
        this.notify.success('تم إصدار الفاتورة الدراسية بنجاح وترحيلها إلى دفتر الأستاذ.');
        this.saved.emit(res?.data || res);
        this.closed.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = err?.error?.error?.message || err?.error?.detail || err?.error?.error || 'تعذّر إصدار الفاتورة. يرجى التحقق من المدخلات.';
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
