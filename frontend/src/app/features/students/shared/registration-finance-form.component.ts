import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentFinanceService } from '../../student-finance/student-finance.service';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbDatepickerComponent } from '../../../shared/nebras/nb-datepicker.component';

export interface CustomFeeItem {
  name: string;
  amount: number;
}

export interface InstallmentItem {
  due_date: string;
  amount: number;
}

export interface FinancialConfig {
  registration_fee: number;
  tuition_fee: number;
  discount_amount: number;
  discount_reason: string;
  custom_fee_items: CustomFeeItem[];
  installment_plan: {
    plan_type: string; // '1_installment' | '2_installments' | '3_installments' | '4_installments' | 'custom'
    installments: InstallmentItem[];
  };
  initial_payment: {
    is_paid: boolean;
    amount: number;
    payment_method_id: string;
    cash_box_id?: string;
    bank_account_id?: string;
    notes?: string;
  };
}

@Component({
  selector: 'app-registration-finance-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPanelComponent, NbDatepickerComponent],
  template: `
    <div class="finance-form-container" dir="rtl">
      <!-- 1. قسم تعديل الرسوم الأساسية والخصومات -->
      <nb-panel title="تعديل الرسوم الدراسية والخصومات" subtitle="تحديد رسوم التسجيل، الرسوم السنوية، والخصومات المطبقة للطالب.">
        <div class="form-grid">
          <div class="field">
            <label>رسوم التسجيل والقبول (جنيه/ريال)</label>
            <input type="number" [(ngModel)]="registrationFee" (ngModelChange)="onFeesChange()" min="0" placeholder="150000" />
          </div>

          <div class="field">
            <label>الرسوم الدراسية السنوية (جنيه/ريال)</label>
            <input type="number" [(ngModel)]="tuitionFee" (ngModelChange)="onFeesChange()" min="0" placeholder="1200000" />
          </div>

          <div class="field">
            <label>قيمة الخصم / التخفيض</label>
            <input type="number" [(ngModel)]="discountAmount" (ngModelChange)="onFeesChange()" min="0" placeholder="0" />
          </div>

          <div class="field">
            <label>سبب الخصم / تفاصيل المنحة</label>
            <input type="text" [(ngModel)]="discountReason" (ngModelChange)="notifyParent()" placeholder="مثال: خصم الأخوة / تفوق أكاديمي" />
          </div>
        </div>

        <!-- رسوم إضافية مخصصة -->
        <div class="custom-items-section">
          <div class="section-header">
            <h5>بنود رسوم إضافية (اختياري)</h5>
            <button type="button" class="btn-add-small" (click)="addCustomItem()">+ إضافة بند رسوم</button>
          </div>

          @for (item of customItems(); track $index) {
            <div class="custom-item-row">
              <input type="text" [(ngModel)]="item.name" (ngModelChange)="notifyParent()" placeholder="اسم البند (مثال: رسوم النقل)" />
              <input type="number" [(ngModel)]="item.amount" (ngModelChange)="onFeesChange()" placeholder="المبلغ" />
              <button type="button" class="btn-remove-icon" (click)="removeCustomItem($index)">✕</button>
            </div>
          }
        </div>

        <!-- ملخص إجمالي الصافي -->
        <div class="fee-summary-banner">
          <div class="summary-item">
            <span class="lbl">إجمالي الرسوم:</span>
            <span class="val">{{ totalGrossFees() | number }}</span>
          </div>
          <div class="summary-item">
            <span class="lbl">إجمالي الخصم:</span>
            <span class="val text-danger">- {{ discountAmount() | number }}</span>
          </div>
          <div class="summary-item highlight">
            <span class="lbl">صافي المستحق النهائي:</span>
            <span class="val text-primary">{{ netTotal() | number }}</span>
          </div>
        </div>
      </nb-panel>

      <!-- 2. قسم خطة وتقسيط الرسوم -->
      <nb-panel title="خطة الأقساط وتواريخ الاستحقاق" subtitle="تحديد وتوزيع الأقساط المجدولة على العام الدراسي.">
        <div class="plan-type-selector">
          <label>اختر خطة الأقساط المناسبة:</label>
          <div class="plan-buttons">
            <button type="button" [class.active]="planType() === '1_installment'" (click)="selectPlanType('1_installment')">دفعة واحدة (100%)</button>
            <button type="button" [class.active]="planType() === '2_installments'" (click)="selectPlanType('2_installments')">قسطين (50% / 50%)</button>
            <button type="button" [class.active]="planType() === '3_installments'" (click)="selectPlanType('3_installments')">3 أقساط (40% / 30% / 30%)</button>
            <button type="button" [class.active]="planType() === '4_installments'" (click)="selectPlanType('4_installments')">4 أقساط متساوية</button>
            <button type="button" [class.active]="planType() === 'custom'" (click)="selectPlanType('custom')">مخصص</button>
          </div>
        </div>

        <div class="installments-table-container">
          <table class="installments-table">
            <thead>
              <tr>
                <th>#</th>
                <th>تاريخ الاستحقاق</th>
                <th>مبلغ القسط</th>
                <th>النسبة من الصافي</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              @for (inst of installments(); track $index) {
                <tr>
                  <td class="idx">{{ $index + 1 }}</td>
                  <td>
                    <nb-datepicker [(value)]="inst.due_date" (valueChange)="notifyParent()"></nb-datepicker>
                  </td>
                  <td>
                    <input type="number" [(ngModel)]="inst.amount" (ngModelChange)="onInstallmentAmountChange()" class="amount-input" />
                  </td>
                  <td class="pct font-mono">
                    {{ (netTotal() > 0 ? (inst.amount / netTotal()) * 100 : 0) | number:'1.0-1' }}%
                  </td>
                  <td>
                    <button type="button" class="btn-remove-icon" (click)="removeInstallment($index)">✕</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <div class="table-actions">
            <button type="button" class="btn-add-small" (click)="addInstallment()">+ إضافة قسط جديد</button>
          </div>

          <!-- شريط التحقق من توازن الأقساط -->
          <div class="balance-check-bar" [class.balanced]="isInstallmentsBalanced()" [class.unbalanced]="!isInstallmentsBalanced()">
            <span>مجموع الأقساط المجدولة: <strong>{{ totalInstallmentsSum() | number }}</strong></span>
            <span>الصافي المطلوب: <strong>{{ netTotal() | number }}</strong></span>
            @if (!isInstallmentsBalanced()) {
              <span class="warning-msg">⚠️ الفارق: {{ (netTotal() - totalInstallmentsSum()) | number }}</span>
            } @else {
              <span class="success-msg">✓ الأقساط متوازنة تماماً</span>
            }
          </div>
        </div>
      </nb-panel>

      <!-- 3. قسم إصدار إيصال السداد الفوري عند التسجيل -->
      <nb-panel title="إصدار إيصال سداد فوري عند التسجيل" subtitle="تحصيل دفعة كاش أو تحويل بنكي فوري عند التسجيل مع توضيح وتفصيل بنود المبلغ المسدد.">
        <div class="receipt-toggle-box">
          <label class="toggle-switch">
            <input type="checkbox" [(ngModel)]="isImmediatePayment" (ngModelChange)="onReceiptToggle()" />
            <span class="slider"></span>
          </label>
          <span class="toggle-label">إصدار إيصال قبض فوري وتسجيل المبلغ في حسابات المدرسة المباشرة</span>
        </div>

        @if (isImmediatePayment()) {
          <div class="receipt-breakdown-container fade-in">
            <div class="breakdown-header-bar">
              <h5 class="breakdown-title">📌 تحديد بنود ومكونات المبلغ المسدد بالإيصال:</h5>
              <span class="breakdown-hint">حدد البنود المشمولة بالدفعة الفورية وسيتم احتساب الإجمالي والبيان تلقائياً</span>
            </div>

            <div class="breakdown-cards-grid">
              <!-- بند 1: رسوم التسجيل والقبول -->
              <div class="breakdown-card" [class.active]="includeRegistrationFee()">
                <div class="breakdown-card-head">
                  <label class="checkbox-label">
                    <input type="checkbox" [ngModel]="includeRegistrationFee()" (ngModelChange)="includeRegistrationFee.set($event); onBreakdownItemToggle('reg');" />
                    <span class="card-label-title">📝 رسوم التسجيل والقبول</span>
                  </label>
                  <span class="badge-mini">رسوم القبول</span>
                </div>
                @if (includeRegistrationFee()) {
                  <div class="breakdown-input-box">
                    <label>المبلغ المخصص:</label>
                    <input type="number" [ngModel]="payRegistrationAmount()" (ngModelChange)="payRegistrationAmount.set($event); updateImmediateBreakdown();" min="0" />
                  </div>
                }
              </div>

              <!-- بند 2: الدفعة الأولى / القسط الأول من الرسوم الدراسية -->
              <div class="breakdown-card" [class.active]="includeFirstInstallment()">
                <div class="breakdown-card-head">
                  <label class="checkbox-label">
                    <input type="checkbox" [ngModel]="includeFirstInstallment()" (ngModelChange)="includeFirstInstallment.set($event); onBreakdownItemToggle('first_inst');" />
                    <span class="card-label-title">🎓 الدفعة الأولى / القسط الأول</span>
                  </label>
                  <span class="badge-mini secondary">رسوم دراسية</span>
                </div>
                @if (includeFirstInstallment()) {
                  <div class="breakdown-input-box">
                    <label>المبلغ المخصص (من القسط 1):</label>
                    <input type="number" [ngModel]="payFirstInstallmentAmount()" (ngModelChange)="payFirstInstallmentAmount.set($event); updateImmediateBreakdown();" min="0" />
                  </div>
                }
              </div>

              <!-- بند 3: بند إضافي / مخصص (اختياري) -->
              <div class="breakdown-card" [class.active]="includeCustomPay()">
                <div class="breakdown-card-head">
                  <label class="checkbox-label">
                    <input type="checkbox" [ngModel]="includeCustomPay()" (ngModelChange)="includeCustomPay.set($event); onBreakdownItemToggle('custom');" />
                    <span class="card-label-title">✨ بند تحصيل إضافي / مخصص</span>
                  </label>
                  <span class="badge-mini tertiary">اختياري</span>
                </div>
                @if (includeCustomPay()) {
                  <div class="breakdown-input-box-multi">
                    <input type="text" [ngModel]="payCustomName()" (ngModelChange)="payCustomName.set($event); updateImmediateBreakdown();" placeholder="اسم البند (مثال: زي مدرسي / كتب)" />
                    <input type="number" [ngModel]="payCustomAmount()" (ngModelChange)="payCustomAmount.set($event); updateImmediateBreakdown();" min="0" placeholder="المبلغ" />
                  </div>
                }
              </div>
            </div>

            <!-- إجمالي وتفاصيل طريقة الدفع والخزينة -->
            <div class="receipt-details-grid">
              <div class="field">
                <label>إجمالي المبلغ المحصّل بالإيصال (محسوب آلياً)</label>
                <div class="total-receipt-amount-display">
                  <span class="currency">جنيه / ريال</span>
                  <input type="number" [ngModel]="receiptAmount()" (ngModelChange)="receiptAmount.set($event); notifyParent();" min="0" />
                </div>
              </div>

              <div class="field">
                <label>طريقة الدفع والتحصيل</label>
                <select [(ngModel)]="paymentMethodId" (ngModelChange)="onPaymentMethodChange()">
                  <option value="">اختر طريقة الدفع...</option>
                  @for (pm of paymentMethods(); track pm.id) {
                    <option [value]="pm.id">{{ pm.name_ar || pm.name }}</option>
                  }
                </select>
              </div>

              @if (selectedPaymentMethodType() === 'cash' || isCashMethod()) {
                <div class="field">
                  <label>الخزنة المستلمة (الصندوق)</label>
                  <select [(ngModel)]="cashBoxId" (ngModelChange)="notifyParent()">
                    <option value="">{{ cashBoxes().length > 0 ? 'اختر الصندوق...' : 'الخزينة الرئيسية' }}</option>
                    @for (cb of cashBoxes(); track cb.id) {
                      <option [value]="cb.id">{{ cb.name_ar || cb.name_en || cb.name || 'الصندوق الرئيسي' }}</option>
                    }
                  </select>
                </div>
              }

              @if (selectedPaymentMethodType() === 'bank' || isBankMethod()) {
                <div class="field">
                  <label>الحساب البنكي المستلم</label>
                  <select [(ngModel)]="bankAccountId" (ngModelChange)="notifyParent()">
                    <option value="">اختر البنك...</option>
                    @for (ba of bankAccounts(); track ba.id) {
                      <option [value]="ba.id">{{ ba.bank_name ? (ba.bank_name + ' - ' + ba.account_number) : (ba.account_number || ba.name_ar || ba.name) }}</option>
                    }
                  </select>
                </div>
              }

              <div class="field full-width">
                <label>البيان وملاحظات سند الإيصال</label>
                <input type="text" [(ngModel)]="receiptNotes" (ngModelChange)="notifyParent()" placeholder="بيان سند القبض والملاحظات" />
              </div>
            </div>
          </div>
        }
      </nb-panel>
    </div>
  `,
  styles: [
    `
      .finance-form-container {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 14px;
      }
      .field { display: flex; flex-direction: column; gap: 5px; }
      .field.full-width { grid-column: 1 / -1; }
      .field label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
      .field input, .field select {
        height: 38px;
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius);
        padding: 0 10px;
        font-family: var(--nb-font-family);
        font-size: 13px;
        color: var(--nb-text);
        background: var(--nb-surface);
        outline: none;
      }
      
      .custom-items-section {
        margin-top: 14px;
        padding-top: 14px;
        border-top: 1px dashed var(--nb-border-soft);
      }
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      .section-header h5 { margin: 0; font-size: 13px; font-weight: 700; color: var(--nb-text); }
      
      .custom-item-row {
        display: flex;
        gap: 10px;
        align-items: center;
        margin-bottom: 8px;
      }
      .custom-item-row input[type="text"] { flex: 2; }
      .custom-item-row input[type="number"] { flex: 1; }

      .btn-add-small {
        background: var(--nb-primary-50);
        color: var(--nb-primary-600);
        border: 1px dashed var(--nb-primary-400);
        border-radius: var(--nb-radius);
        padding: 4px 10px;
        font-size: 11.5px;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-remove-icon {
        background: transparent;
        border: none;
        color: #dc3545;
        font-size: 14px;
        cursor: pointer;
        padding: 4px 8px;
      }

      .fee-summary-banner {
        margin-top: 16px;
        background: var(--nb-surface-raised);
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius-card);
        padding: 12px 18px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
      }
      .summary-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
      .summary-item .lbl { color: var(--nb-text-secondary); font-weight: 600; }
      .summary-item .val { font-weight: 700; font-size: 14px; }
      .summary-item.highlight { background: var(--nb-primary-50); padding: 6px 12px; border-radius: var(--nb-radius); }
      .text-danger { color: #dc3545; }
      .text-primary { color: var(--nb-primary-600); font-size: 16px !important; }

      .plan-type-selector {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 14px;
      }
      .plan-type-selector label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
      .plan-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
      .plan-buttons button {
        background: var(--nb-surface-raised);
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius);
        padding: 6px 12px;
        font-size: 12px;
        font-weight: 600;
        color: var(--nb-text-secondary);
        cursor: pointer;
        transition: all 0.2s;
      }
      .plan-buttons button.active {
        background: var(--nb-primary-600);
        color: white;
        border-color: var(--nb-primary-600);
      }

      .installments-table-container { overflow-x: auto; }
      .installments-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 10px;
      }
      .installments-table th, .installments-table td {
        padding: 8px 10px;
        text-align: right;
        border-bottom: 1px solid var(--nb-border-soft);
        font-size: 12.5px;
      }
      .installments-table th { background: var(--nb-surface-raised); font-weight: 700; color: var(--nb-text); }
      .amount-input { width: 140px; height: 32px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 8px; }
      .font-mono { font-family: monospace; font-weight: 600; }

      .balance-check-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        border-radius: var(--nb-radius);
        font-size: 12px;
        margin-top: 8px;
      }
      .balance-check-bar.balanced { background: #e2f9e6; color: #1e7e34; border: 1px solid #b7ebc2; }
      .balance-check-bar.unbalanced { background: #fff3cd; color: #856404; border: 1px solid #ffeeba; }
      .warning-msg { color: #d39e00; font-weight: 700; }
      .success-msg { color: #28a745; font-weight: 700; }

      .receipt-toggle-box {
        display: flex;
        align-items: center;
        gap: 12px;
        background: var(--nb-surface-raised);
        padding: 12px;
        border-radius: var(--nb-radius-card);
        border: 1px solid var(--nb-border);
      }
      .toggle-switch {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
      }
      .toggle-switch input { opacity: 0; width: 0; height: 0; }
      .slider {
        position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
        background-color: #ccc; transition: .3s; border-radius: 24px;
      }
      .slider:before {
        position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px;
        background-color: white; transition: .3s; border-radius: 50%;
      }
      input:checked + .slider { background-color: var(--nb-primary-600); }
      input:checked + .slider:before { transform: translateX(20px); }
      .toggle-label { font-size: 13px; font-weight: 700; color: var(--nb-text); }

      .receipt-breakdown-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-top: 14px;
      }
      .breakdown-header-bar {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .breakdown-title {
        margin: 0;
        font-size: 13px;
        font-weight: 700;
        color: var(--nb-text);
      }
      .breakdown-hint {
        font-size: 11px;
        color: var(--nb-text-muted);
      }
      .breakdown-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 12px;
      }
      .breakdown-card {
        background: var(--nb-surface);
        border: 1.5px solid var(--nb-border);
        border-radius: var(--nb-radius);
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        transition: all 0.2s ease;
      }
      .breakdown-card.active {
        border-color: var(--nb-primary-500);
        background: var(--nb-surface-raised);
        box-shadow: 0 2px 8px rgba(14, 116, 144, 0.08);
      }
      .breakdown-card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        user-select: none;
      }
      .checkbox-label input[type="checkbox"] {
        width: 17px;
        height: 17px;
        accent-color: var(--nb-primary-600);
        cursor: pointer;
      }
      .card-label-title {
        font-size: 13px;
        font-weight: 700;
        color: var(--nb-text);
      }
      .badge-mini {
        font-size: 10px;
        padding: 2px 8px;
        border-radius: 12px;
        font-weight: 600;
        background: rgba(14, 116, 144, 0.1);
        color: var(--nb-primary-700);
      }
      .badge-mini.secondary {
        background: rgba(16, 185, 129, 0.1);
        color: #047857;
      }
      .badge-mini.tertiary {
        background: rgba(245, 158, 11, 0.1);
        color: #b45309;
      }
      .breakdown-input-box {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .breakdown-input-box label {
        font-size: 11px;
        color: var(--nb-text-muted);
        white-space: nowrap;
      }
      .breakdown-input-box input {
        height: 34px;
        border: 1px solid var(--nb-border);
        border-radius: 6px;
        padding: 0 10px;
        font-size: 13px;
        font-weight: 600;
        color: var(--nb-text);
        background: var(--nb-surface);
        width: 100%;
        outline: none;
      }
      .breakdown-input-box input:focus {
        border-color: var(--nb-primary-500);
      }
      .breakdown-input-box-multi {
        display: grid;
        grid-template-columns: 1.4fr 1fr;
        gap: 8px;
      }
      .breakdown-input-box-multi input {
        height: 34px;
        border: 1px solid var(--nb-border);
        border-radius: 6px;
        padding: 0 10px;
        font-size: 12px;
        color: var(--nb-text);
        background: var(--nb-surface);
        outline: none;
      }
      .total-receipt-amount-display {
        display: flex;
        align-items: center;
        position: relative;
      }
      .total-receipt-amount-display input {
        height: 38px;
        width: 100%;
        border: 1.5px solid var(--nb-primary-400);
        background: var(--nb-surface-raised);
        border-radius: var(--nb-radius);
        padding: 0 12px 0 75px;
        font-size: 15px;
        font-weight: 700;
        color: var(--nb-primary-700);
        outline: none;
      }
      .total-receipt-amount-display .currency {
        position: absolute;
        left: 12px;
        font-size: 11px;
        font-weight: 600;
        color: var(--nb-text-muted);
        pointer-events: none;
      }

      .receipt-details-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 14px;
        margin-top: 14px;
        padding-top: 14px;
        border-top: 1px dashed var(--nb-border-soft);
      }
      .fade-in { animation: fadeIn 0.3s ease-out; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    `
  ]
})
export class RegistrationFinanceFormComponent implements OnInit {
  private financeSvc = inject(StudentFinanceService);

  @Input() set config(val: Partial<FinancialConfig> | null) {
    if (val) {
      if (val.registration_fee !== undefined) {
        this.registrationFee.set(val.registration_fee);
        this.payRegistrationAmount.set(val.registration_fee);
      }
      if (val.tuition_fee !== undefined) this.tuitionFee.set(val.tuition_fee);
      if (val.discount_amount !== undefined) this.discountAmount.set(val.discount_amount);
      if (val.discount_reason !== undefined) this.discountReason.set(val.discount_reason);
      if (val.custom_fee_items) this.customItems.set([...val.custom_fee_items]);
      if (val.installment_plan) {
        this.planType.set(val.installment_plan.plan_type || '1_installment');
        if (val.installment_plan.installments) {
          this.installments.set([...val.installment_plan.installments]);
        }
      }
      if (val.initial_payment) {
        this.isImmediatePayment.set(val.initial_payment.is_paid || false);
        this.receiptAmount.set(val.initial_payment.amount || 0);
        this.paymentMethodId.set(val.initial_payment.payment_method_id || '');
        this.cashBoxId.set(val.initial_payment.cash_box_id || '');
        this.bankAccountId.set(val.initial_payment.bank_account_id || '');
        this.receiptNotes.set(val.initial_payment.notes || '');
      }
    }
  }

  @Output() configChange = new EventEmitter<FinancialConfig>();

  registrationFee = signal(150000);
  tuitionFee = signal(1200000);
  discountAmount = signal(0);
  discountReason = signal('');
  customItems = signal<CustomFeeItem[]>([]);

  planType = signal<string>('3_installments');
  installments = signal<InstallmentItem[]>([]);

  isImmediatePayment = signal(false);
  receiptAmount = signal(150000);
  paymentMethodId = signal('');
  cashBoxId = signal('');
  bankAccountId = signal('');
  receiptNotes = signal('سداد رسوم التسجيل والقبول عند التسجيل');

  // تفصيل بنود التحصيل الفوري بالإيصال
  includeRegistrationFee = signal(true);
  payRegistrationAmount = signal(150000);

  includeFirstInstallment = signal(false);
  payFirstInstallmentAmount = signal(0);

  includeCustomPay = signal(false);
  payCustomName = signal('');
  payCustomAmount = signal(0);

  paymentMethods = signal<any[]>([]);
  cashBoxes = signal<any[]>([]);
  bankAccounts = signal<any[]>([]);

  totalGrossFees = computed(() => {
    const customSum = this.customItems().reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
    return Number(this.registrationFee()) + Number(this.tuitionFee()) + customSum;
  });

  netTotal = computed(() => {
    return Math.max(0, this.totalGrossFees() - Number(this.discountAmount()));
  });

  totalInstallmentsSum = computed(() => {
    return this.installments().reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  });

  isInstallmentsBalanced = computed(() => {
    return Math.abs(this.netTotal() - this.totalInstallmentsSum()) < 1;
  });

  selectedPaymentMethodType = computed(() => {
    const pm = this.paymentMethods().find(p => p.id === this.paymentMethodId());
    return pm?.type || pm?.code || '';
  });

  isCashMethod = computed(() => {
    const code = (this.selectedPaymentMethodType() || '').toLowerCase();
    return code.includes('cash') || code.includes('box') || code.includes('صندوق') || code.includes('نقدي');
  });

  isBankMethod = computed(() => {
    const code = (this.selectedPaymentMethodType() || '').toLowerCase();
    return code.includes('bank') || code.includes('transfer') || code.includes('بنك') || code.includes('تحويل');
  });

  ngOnInit() {
    this.loadFinanceMetadata();
    this.recalculateInstallments();
    this.payRegistrationAmount.set(this.registrationFee());
    this.updateImmediateBreakdown();
  }

  loadFinanceMetadata() {
    this.financeSvc.listPaymentMethods().subscribe({
      next: (res) => {
        const list = (res?.data as any)?.results || res?.data || res || [];
        if (Array.isArray(list)) {
          this.paymentMethods.set(list);
          if (list.length > 0 && !this.paymentMethodId()) {
            this.paymentMethodId.set(list[0].id);
            this.notifyParent();
          }
        }
      }
    });

    this.financeSvc.listCashBoxes().subscribe({
      next: (res) => {
        const list = (res?.data as any)?.results || res?.data || res || [];
        if (Array.isArray(list)) {
          this.cashBoxes.set(list);
          if (list.length > 0 && !this.cashBoxId()) {
            this.cashBoxId.set(list[0].id);
            this.notifyParent();
          }
        }
      }
    });

    this.financeSvc.listBankAccounts().subscribe({
      next: (res) => {
        const list = (res?.data as any)?.results || res?.data || res || [];
        if (Array.isArray(list)) {
          this.bankAccounts.set(list);
          if (list.length > 0 && !this.bankAccountId()) {
            this.bankAccountId.set(list[0].id);
            this.notifyParent();
          }
        }
      }
    });
  }

  onFeesChange() {
    this.recalculateInstallments();
    this.payRegistrationAmount.set(this.registrationFee());
    if (this.installments().length > 0 && (!this.payFirstInstallmentAmount() || this.payFirstInstallmentAmount() === 0)) {
      this.payFirstInstallmentAmount.set(this.installments()[0].amount);
    }
    this.updateImmediateBreakdown();
  }

  selectPlanType(type: string) {
    this.planType.set(type);
    this.recalculateInstallments();
    if (this.installments().length > 0) {
      this.payFirstInstallmentAmount.set(this.installments()[0].amount);
    }
    this.updateImmediateBreakdown();
  }

  recalculateInstallments() {
    const net = this.netTotal();
    const today = new Date();
    const type = this.planType();

    if (type === '1_installment') {
      const d1 = new Date(today.getTime() + 30 * 86400000).toISOString().split('T')[0];
      this.installments.set([{ due_date: d1, amount: net }]);
    } else if (type === '2_installments') {
      const d1 = new Date(today.getTime() + 30 * 86400000).toISOString().split('T')[0];
      const d2 = new Date(today.getTime() + 120 * 86400000).toISOString().split('T')[0];
      const half = Math.round(net / 2);
      this.installments.set([
        { due_date: d1, amount: half },
        { due_date: d2, amount: net - half }
      ]);
    } else if (type === '3_installments') {
      const d1 = new Date(today.getTime() + 30 * 86400000).toISOString().split('T')[0];
      const d2 = new Date(today.getTime() + 120 * 86400000).toISOString().split('T')[0];
      const d3 = new Date(today.getTime() + 210 * 86400000).toISOString().split('T')[0];
      const p1 = Math.round(net * 0.4);
      const p2 = Math.round(net * 0.3);
      const p3 = net - p1 - p2;
      this.installments.set([
        { due_date: d1, amount: p1 },
        { due_date: d2, amount: p2 },
        { due_date: d3, amount: p3 }
      ]);
    } else if (type === '4_installments') {
      const quarter = Math.round(net / 4);
      const list: InstallmentItem[] = [];
      for (let i = 0; i < 4; i++) {
        const d = new Date(today.getTime() + (30 + i * 75) * 86400000).toISOString().split('T')[0];
        const amt = i === 3 ? net - (quarter * 3) : quarter;
        list.push({ due_date: d, amount: amt });
      }
      this.installments.set(list);
    }
  }

  addCustomItem() {
    this.customItems.update(items => [...items, { name: '', amount: 0 }]);
    this.notifyParent();
  }

  removeCustomItem(index: number) {
    this.customItems.update(items => items.filter((_, i) => i !== index));
    this.onFeesChange();
  }

  addInstallment() {
    const today = new Date();
    const count = this.installments().length;
    const d = new Date(today.getTime() + (30 + count * 60) * 86400000).toISOString().split('T')[0];
    this.installments.update(list => [...list, { due_date: d, amount: 0 }]);
    this.planType.set('custom');
    this.notifyParent();
  }

  removeInstallment(index: number) {
    this.installments.update(list => list.filter((_, i) => i !== index));
    this.planType.set('custom');
    this.notifyParent();
  }

  onInstallmentAmountChange() {
    this.notifyParent();
  }

  onBreakdownItemToggle(type: 'reg' | 'first_inst' | 'custom') {
    if (type === 'first_inst' && this.includeFirstInstallment()) {
      if (this.payFirstInstallmentAmount() === 0) {
        const firstAmt = this.installments()[0]?.amount || Math.round(this.netTotal() / 3);
        this.payFirstInstallmentAmount.set(firstAmt);
      }
    }
    if (type === 'reg' && this.includeRegistrationFee()) {
      if (this.payRegistrationAmount() === 0) {
        this.payRegistrationAmount.set(this.registrationFee());
      }
    }
    this.updateImmediateBreakdown();
  }

  updateImmediateBreakdown() {
    let total = 0;
    const parts: string[] = [];

    if (this.includeRegistrationFee()) {
      const reg = Number(this.payRegistrationAmount()) || 0;
      total += reg;
      parts.push(`رسوم التسجيل (${reg.toLocaleString()})`);
    }

    if (this.includeFirstInstallment()) {
      const inst = Number(this.payFirstInstallmentAmount()) || 0;
      total += inst;
      parts.push(`القسط الأول (${inst.toLocaleString()})`);
    }

    if (this.includeCustomPay()) {
      const custAmt = Number(this.payCustomAmount()) || 0;
      const custName = this.payCustomName() || 'بند مخصص';
      total += custAmt;
      parts.push(`${custName} (${custAmt.toLocaleString()})`);
    }

    this.receiptAmount.set(total);
    if (parts.length > 0) {
      this.receiptNotes.set(`سداد فوري عند التسجيل: ${parts.join(' + ')}`);
    } else {
      this.receiptNotes.set('سداد دفعة فورية عند التسجيل');
    }
    this.notifyParent();
  }

  onReceiptToggle() {
    if (this.isImmediatePayment()) {
      this.payRegistrationAmount.set(this.registrationFee());
      if (this.installments().length > 0 && this.payFirstInstallmentAmount() === 0) {
        this.payFirstInstallmentAmount.set(this.installments()[0].amount);
      }
      this.updateImmediateBreakdown();
    }
    this.notifyParent();
  }

  onPaymentMethodChange() {
    this.notifyParent();
  }

  notifyParent() {
    const payload: FinancialConfig = {
      registration_fee: Number(this.registrationFee()) || 0,
      tuition_fee: Number(this.tuitionFee()) || 0,
      discount_amount: Number(this.discountAmount()) || 0,
      discount_reason: this.discountReason(),
      custom_fee_items: this.customItems().map(i => ({ name: i.name, amount: Number(i.amount) || 0 })),
      installment_plan: {
        plan_type: this.planType(),
        installments: this.installments().map(i => ({ due_date: i.due_date, amount: Number(i.amount) || 0 }))
      },
      initial_payment: {
        is_paid: this.isImmediatePayment(),
        amount: Number(this.receiptAmount()) || 0,
        payment_method_id: this.paymentMethodId(),
        cash_box_id: this.cashBoxId() || undefined,
        bank_account_id: this.bankAccountId() || undefined,
        notes: this.receiptNotes()
      }
    };
    this.configChange.emit(payload);
  }
}
