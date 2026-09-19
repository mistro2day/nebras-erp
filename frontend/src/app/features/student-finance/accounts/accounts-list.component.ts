import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StudentFinanceService } from '../student-finance.service';
import { StudentsService } from '../../students/students.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbDrawerComponent } from '../../../shared/nebras/nb-drawer.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { NbExportMenuComponent, ExportColumn } from '../../../shared/export';
import { SfDocumentDrawerComponent, SfDoc } from '../shared/sf-document-drawer.component';
import { BillingAccountCreateModalComponent } from './billing-account-create-modal.component';
import { InvoiceCreateModalComponent } from '../invoices/invoice-create-modal.component';
import { ReceiptCreateModalComponent } from '../receipts/receipt-create-modal.component';

/**
 * حسابات الطلاب المالية — عرض 360° لحساب الطالب.
 * يربط الطالب (وحدة الطلاب) بالمالية (قيود واستحقاق وسندات قبض) عبر لوح تفاصيل موحّد:
 * الأرصدة، الفواتير، التحصيلات، المستحقات، المنح، والحظر المالي — مع معالجات نبراس
 * منبثقة بنظام الخطوات (فتح حساب، إصدار فاتورة، تحصيل دفعة) تُرحّل مباشرة في دفتر أستاذ المالية.
 */
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-sf-accounts-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, DecimalPipe, NbPageHeaderComponent, NbPanelComponent,
    NbDrawerComponent, NbExportMenuComponent, NbLoadingComponent,
    SfDocumentDrawerComponent, BillingAccountCreateModalComponent, InvoiceCreateModalComponent, ReceiptCreateModalComponent,
  ],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="حسابات الطلاب المالية"
        subtitle="عرض 360° لكل طالب: الأرصدة والفواتير والتحصيلات والمنح والحظر — مربوطة مباشرة بدفتر أستاذ المالية.">
        <button class="btn ghost" (click)="goDashboard()">لوحة التحكم</button>
        <nb-export-menu [columns]="cols()" [rows]="filtered()" title="حسابات الطلاب المالية" filename="حسابات-الطلاب"></nb-export-menu>
        <button class="btn primary" (click)="openCreateAccountModal()">＋ فتح حساب لطالب</button>
      </nb-page-header>

      @if (!settingsReady() && settingsChecked()) {
        <div class="warn-banner">⚠︎ لم تُضبط الإعدادات المالية للطلاب (حساب المدينين والإيرادات). قد تتعذّر الفوترة والتحصيل حتى تُهيّأ الوحدة.</div>
      }

      <app-billing-account-create-modal
        [open]="createAccountModalOpen()"
        (closed)="createAccountModalOpen.set(false)"
        (saved)="onAccountCreated($event)"
      ></app-billing-account-create-modal>

      <app-invoice-create-modal
        [open]="createInvoiceModalOpen()"
        [preselectedAccountId]="modalAccountId()"
        (closed)="createInvoiceModalOpen.set(false)"
        (saved)="onInvoiceSaved($event)"
      ></app-invoice-create-modal>

      <app-receipt-create-modal
        [open]="createReceiptModalOpen()"
        [preselectedAccountId]="modalAccountId()"
        [preselectedAccount]="accountForReceiptModal()"
        (closed)="createReceiptModalOpen.set(false)"
        (saved)="onReceiptSaved($event)"
      ></app-receipt-create-modal>

      <!-- نافذة عكس سند القبض -->
      @if (cancelReceiptModalOpen()) {
        <div class="modal-backdrop" (click)="closeCancelReceiptModal()">
          <div class="modal cancel-receipt-modal" (click)="$event.stopPropagation()" dir="rtl">
            @if (cancelReceiptStep() === 'confirm') {
              <div class="modal-header danger">
                <h3>⚠️ عكس سند القبض</h3>
                <p class="subtitle">هذا الإجراء سيعكس السند المالي ويعيد جميع الأرصدة إلى حالتها السابقة.</p>
              </div>
              <div class="modal-body">
                <div class="cancel-receipt-info">
                  <div class="info-row"><span class="label">رقم السند:</span><span class="value">{{ cancelReceiptTarget()?.receipt_number }}</span></div>
                  <div class="info-row"><span class="label">المبلغ:</span><span class="value danger-text">{{ cancelReceiptTarget()?.amount | number:'1.0-0' }} ج.س</span></div>
                  <div class="info-row"><span class="label">تاريخ التحصيل:</span><span class="value">{{ cancelReceiptTarget()?.payment_date }}</span></div>
                </div>
                <div class="form-field">
                  <label>سبب العكس <span class="required">*</span></label>
                  <textarea [(ngModel)]="cancelReceiptReason" rows="3" placeholder="يرجى كتابة سبب واضح لعكس هذا السند..."></textarea>
                </div>
                <div class="warning-box">
                  <span>⚠️</span>
                  <div>
                    <strong>تنبيه هام:</strong>
                    سيتم عكس القيد المحاسبي في دفتر الأستاذ العام وإعادة المبالغ المخصصة إلى المستحقات المفتوحة.
                    هذا الإجراء يتطلب صلاحية مدير المدرسة أو مستخدم فائق.
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn ghost" (click)="closeCancelReceiptModal()">إلغاء</button>
                <button class="btn danger" [disabled]="cancelReceiptBusy() || !cancelReceiptReason.trim()" (click)="confirmCancelReceipt()">
                  @if (cancelReceiptBusy()) { <span class="spinner-sm"></span> جاري العكس... } @else { 🔄 تأكيد عكس السند }
                </button>
              </div>
            }
            @if (cancelReceiptStep() === 'success') {
              <div class="modal-header success">
                <div class="success-icon">✓</div>
                <h3>تم عكس السند بنجاح</h3>
                <p class="subtitle">تم عكس القيد المحاسبي وتحديث جميع الأرصدة المالية.</p>
              </div>
              <div class="modal-body">
                <div class="success-card">
                  <div class="info-row"><span class="label">رقم السند المعكوس:</span><span class="value">{{ cancelReceiptTarget()?.receipt_number }}</span></div>
                  <div class="info-row"><span class="label">المبلغ المعكوس:</span><span class="value danger-text">{{ cancelReceiptTarget()?.amount | number:'1.0-0' }} ج.س</span></div>
                  <div class="info-row"><span class="label">سبب العكس:</span><span class="value">{{ cancelReceiptReason }}</span></div>
                  <div class="info-row"><span class="label">الحالة:</span><span class="badge reversed-badge">معكوس</span></div>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn primary" (click)="closeCancelReceiptModal()">✓ إنهاء وإغلاق</button>
              </div>
            }
          </div>
        </div>
      }

      <!-- نافذة حذف سند القبض (خلال 24 ساعة) -->
      @if (deleteReceiptModalOpen()) {
        <div class="modal-backdrop" (click)="closeDeleteReceiptModal()">
          <div class="modal cancel-receipt-modal" (click)="$event.stopPropagation()" dir="rtl">
            <div class="modal-header danger">
              <h3>🗑️ حذف سند القبض نهائياً</h3>
              <p class="subtitle">حذف السند وإلغاء أثره المالي وإرجاع المبالغ للمستحقات المفتوحة (خلال مهلة 24 ساعة).</p>
            </div>
            <div class="modal-body">
              <div class="cancel-receipt-info">
                <div class="info-row"><span class="label">رقم السند:</span><span class="value font-bold">{{ deleteReceiptTarget()?.receipt_number }}</span></div>
                <div class="info-row"><span class="label">المبلغ:</span><span class="value danger-text">{{ deleteReceiptTarget()?.amount | number:'1.0-0' }} ج.س</span></div>
                <div class="info-row"><span class="label">تاريخ التحصيل:</span><span class="value">{{ deleteReceiptTarget()?.payment_date }}</span></div>
              </div>
              <div class="form-field">
                <label>سبب الحذف (اختياري)</label>
                <textarea [(ngModel)]="deleteReceiptReason" rows="2" placeholder="يرجى كتابة سبب حذف السند وتصحيحه..."></textarea>
              </div>
              <div class="warning-box" style="background: #fef2f2; border-color: #fca5a5; color: #991b1b;">
                <span>🗑️</span>
                <div>
                  <strong>تنبيه الحذف المالي:</strong>
                  يُتاح الحذف المباشر خلال 24 ساعة فقط لتصحيح الأخطاء دون توليد قيود عكسية متراكمة. سيتم إلغاء السند وإرجاع الفاتورة للحالة المستحقة فوراً.
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn ghost" (click)="closeDeleteReceiptModal()" [disabled]="deleteReceiptBusy()">إلغاء</button>
              <button class="btn danger" [disabled]="deleteReceiptBusy()" (click)="confirmDeleteReceipt()">
                @if (deleteReceiptBusy()) { <span class="spinner-sm"></span> جاري الحذف... } @else { 🗑️ تأكيد حذف السند وإرجاع الرصيد }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- مؤشرات سريعة -->
      <div class="kpis">
        <div class="kpi"><span class="l">إجمالي المديونية</span><span class="v danger">{{ totalOutstanding() | number:'1.2-2' }} <em>ج.س</em></span></div>
        <div class="kpi"><span class="l">الأرصدة الدائنة</span><span class="v success">{{ totalCredit() | number:'1.2-2' }} <em>ج.س</em></span></div>
        <div class="kpi"><span class="l">حسابات محظورة</span><span class="v warning">{{ blockedCount() }}</span></div>
        <div class="kpi"><span class="l">إجمالي الحسابات</span><span class="v">{{ rows().length }}</span></div>
      </div>

      <div class="filters">
        <input class="fld search" [(ngModel)]="search" placeholder="بحث بالاسم أو رقم الحساب أو رقم الطالب…" />
        <select class="fld" [(ngModel)]="statusFilter">
          <option value="">كل الحالات</option>
          <option value="outstanding">عليه مديونية</option>
          <option value="credit">رصيد دائن</option>
          <option value="hold">إيقاف مالي</option>
          <option value="clear">سليم</option>
        </select>
        <span class="count">{{ filtered().length }} حساب</span>
      </div>

      <nb-panel [flush]="true">
       @if (loading() || !studentsLoaded()) {
         <nb-loading message="جارٍ تحميل حسابات الطلاب…"></nb-loading>
       } @else {
        <div class="table-wrap">
          <table class="nb-table">
            <thead><tr><th>الطالب</th><th>رقم الحساب</th><th class="end">الرصيد الحالي</th><th class="end">المستحق</th><th class="end">دائن</th><th>الحالة</th></tr></thead>
            <tbody>
              @for (a of filtered(); track a.id) {
                <tr class="clickable" (click)="openAccount(a)">
                  <td><strong>{{ studentName(a.student_id) }}</strong> <span class="nm">{{ studentNumber(a.student_id) }}</span></td>
                  <td class="mono">{{ a.account_number }}</td>
                  <td class="end mono">{{ a.current_balance | number:'1.2-2' }}</td>
                  <td class="end mono" [class.due]="+a.outstanding_balance > 0">{{ a.outstanding_balance | number:'1.2-2' }}</td>
                  <td class="end mono">{{ a.credit_balance | number:'1.2-2' }}</td>
                  <td>
                    @if (a.financial_hold) { <span class="badge warn">إيقاف مالي</span> }
                    @else if (+a.outstanding_balance > 0) { <span class="badge due">مديونية</span> }
                    @else { <span class="badge ok">سليم</span> }
                  </td>
                </tr>
              }
              @if (!filtered().length) { <tr><td colspan="6" class="empty">لا توجد حسابات مطابقة.</td></tr> }
            </tbody>
          </table>
        </div>
       }
      </nb-panel>

      <!-- لوح 360° لحساب الطالب -->
      <nb-drawer [open]="!!sel()" [width]="720"
        [title]="sel() ? studentName(sel().student_id) : ''"
        [subtitle]="sel() ? ('حساب ' + sel().account_number + ' • رقم الطالب ' + studentNumber(sel().student_id)) : ''"
        (closed)="sel.set(null)">
        @if (sel(); as a) {
          <!-- بطاقات الأرصدة -->
          <div class="bal-cards">
            <div class="bal"><span class="bl">الرصيد الحالي</span><span class="bv">{{ a.current_balance | number:'1.2-2' }}</span></div>
            <div class="bal due"><span class="bl">المستحق</span><span class="bv">{{ a.outstanding_balance | number:'1.2-2' }}</span></div>
            <div class="bal disc"><span class="bl">الخصومات المعتمدة</span><span class="bv warn">{{ totalDiscountsForAccount() | number:'1.2-2' }}</span></div>
            <div class="bal cr"><span class="bl">دائن</span><span class="bv">{{ a.credit_balance | number:'1.2-2' }}</span></div>
            <div class="bal"><span class="bl">الحالة</span><span class="bv sm">{{ a.financial_hold ? 'إيقاف مالي' : 'سليم' }}</span></div>
          </div>

          <!-- إجراءات سريعة -->
          <div class="quick">
            <button class="btn primary sm" (click)="openInvoiceModal(a.id)">＋ إصدار فاتورة</button>
            <button class="btn primary sm" (click)="openReceiptModal(a.id)">💵 تحصيل دفعة</button>
            <button class="btn ghost sm" (click)="openStatement(a.id)">📄 كشف الحساب</button>
            <button class="btn ghost sm" [class.on]="pane()==='scholarship'" (click)="setPane('scholarship')">🎓 منحة</button>
            <button class="btn ghost sm" [class.on]="pane()==='hold'" (click)="setPane('hold')">⛔ حظر مالي</button>
            <a class="btn ghost sm" (click)="openStudent(a.student_id)">👤 ملف الطالب</a>
          </div>

          @if (pane() === 'scholarship') {
            <div class="action-box">
              @if (!confirmSchOpen()) {
                <div class="action-box-header">
                  <h4>إضافة منحة أو تخفيض مالي</h4>
                  <div class="calc-toggle">
                    <button type="button" class="calc-btn" [class.on]="schForm.calc_type === 'percentage'" (click)="schForm.calc_type = 'percentage'">نسبة مئوية (%)</button>
                    <button type="button" class="calc-btn" [class.on]="schForm.calc_type === 'fixed'" (click)="schForm.calc_type = 'fixed'">مبلغ مقطوع (ج.س)</button>
                  </div>
                </div>
                <div class="grid3">
                  <label>اسم المنحة / التخفيض<input class="fld" [(ngModel)]="schForm.name" placeholder="مثال: منحة تفوق / تخفيض إدارة" /></label>
                  <label>النوع<select class="fld" [(ngModel)]="schForm.type"><option value="merit">تفوق</option><option value="need">حاجة</option><option value="partial">جزئية</option><option value="full">كاملة</option></select></label>
                  @if (schForm.calc_type === 'percentage') {
                    <label>النسبة %<input class="fld num" type="number" min="1" max="100" [(ngModel)]="schForm.amount_percentage" placeholder="25" /></label>
                  } @else {
                    <label>المبلغ المالي (ج.س)<input class="fld num" type="number" min="1" [(ngModel)]="schForm.fixed_amount" placeholder="مثال: 300000" /></label>
                  }
                </div>
                <button class="btn primary" [disabled]="busy() || !schForm.name || (schForm.calc_type === 'percentage' ? !schForm.amount_percentage : !schForm.fixed_amount)" (click)="openConfirmScholarship(a)">
                  اعتماد التخفيض
                </button>
              } @else {
                <!-- خطوة المراجعة والتأكيد الشاملة -->
                <div class="confirm-sch-card">
                  <div class="confirm-head">
                    <span class="c-icon">⚠️</span>
                    <div>
                      <strong>تأكيد تطبيق التخفيض المالي</strong>
                      <p>يرجى مراجعة تفاصيل التخفيض وتأثيره على الفاتورة قبل التطبيق النهائي:</p>
                    </div>
                  </div>
                  <div class="confirm-summary-grid">
                    <div class="cs-item"><span class="cs-lbl">الطالب:</span><span class="cs-val">{{ studentName(a.student_id) }}</span></div>
                    <div class="cs-item"><span class="cs-lbl">بيان التخفيض:</span><span class="cs-val">{{ schForm.name }}</span></div>
                    <div class="cs-item"><span class="cs-lbl">القيمة المخصومة:</span><span class="cs-val warn font-bold">{{ schCalculatedAmount(a) | number:'1.2-2' }} ج.س</span></div>
                    <div class="cs-item"><span class="cs-lbl">المستحق الحالي:</span><span class="cs-val">{{ a.outstanding_balance | number:'1.2-2' }} ج.س</span></div>
                    <div class="cs-item"><span class="cs-lbl">المستحق بعد التخفيض:</span><span class="cs-val success font-bold">{{ newOutstandingAfterSch(a) | number:'1.2-2' }} ج.س</span></div>
                  </div>
                  <div class="confirm-actions">
                    <button class="btn primary" [disabled]="busy()" (click)="applyScholarship(a)">
                      {{ busy() ? 'جارٍ التنفيذ…' : '✓ نعم، تأكيد وتنفيذ الخصم' }}
                    </button>
                    <button class="btn ghost" [disabled]="busy()" (click)="confirmSchOpen.set(false)">تراجع وتعديل</button>
                  </div>
                </div>
              }
            </div>
          }
          @if (pane() === 'hold') {
            <div class="action-box">
              <h4>فرض حظر مالي</h4>
              <div class="grid3">
                <label>نوع الحظر<select class="fld" [(ngModel)]="holdForm.hold_type">
                  <option value="exam">حجب الامتحانات</option><option value="registration">منع التسجيل</option>
                  <option value="certificate">منع الشهادات</option><option value="graduation">حظر التخرج</option><option value="custom">مخصص</option>
                </select></label>
                <label class="col2">السبب<input class="fld" [(ngModel)]="holdForm.reason" placeholder="سبب فرض الحظر" /></label>
              </div>
              <button class="btn danger" [disabled]="busy() || !holdForm.reason" (click)="applyHold(a)">{{ busy() ? 'جارٍ…' : 'فرض الحظر' }}</button>
            </div>
          }

          <!-- تبويبات القوائم الفرعية -->
          @if (bundleLoading()) {
            <nb-loading message="جارٍ تحميل بيانات الحساب…"></nb-loading>
          } @else {
          <div class="subtabs">
            <button class="stab" [class.on]="tab()==='invoices'" (click)="tab.set('invoices')">الفواتير ({{ invoices().length }})</button>
            <button class="stab" [class.on]="tab()==='receipts'" (click)="tab.set('receipts')">التحصيلات ({{ receipts().length }})</button>
            <button class="stab" [class.on]="tab()==='receivables'" (click)="tab.set('receivables')">المستحقات ({{ receivables().length }})</button>
            <button class="stab" [class.on]="tab()==='discounts'" (click)="tab.set('discounts')">الخصومات ({{ allDiscounts().length }})</button>
            <button class="stab" [class.on]="tab()==='scholarships'" (click)="tab.set('scholarships')">المنح ({{ scholarships().length }})</button>
            <button class="stab" [class.on]="tab()==='holds'" (click)="tab.set('holds')">الحظر ({{ holds().length }})</button>
          </div>

          <div class="sub-list">
            @if (tab() === 'invoices') {
              @for (i of invoices(); track i.id) {
                <div class="sub-row clickable" (click)="openDoc('invoice', i)"><span><strong>{{ i.invoice_number }}</strong> <span class="nm">{{ i.issue_date }}</span></span>
                  <span class="mono">
                    {{ i.total_amount | number:'1.0-0' }} ج.س
                    @if (getInvoiceDiscount(i) > 0) {
                      <small class="warn" style="display:block; font-size:11px;">(خصم: {{ getInvoiceDiscount(i) | number:'1.0-0' }}-)</small>
                    }
                  </span>
                  <span class="mono due" [class.paid]="+i.outstanding_amount===0">متبقٍ {{ i.outstanding_amount | number:'1.0-0' }}</span>
                  <span class="badge" [class.ok]="i.status==='posted'">{{ i.status === 'posted' ? 'مرحلة' : i.status }}</span></div>
              } @empty { <div class="empty sm">لا توجد فواتير.</div> }
            }
            @if (tab() === 'receipts') {
              @for (r of receipts(); track r.id) {
                <div class="sub-row clickable" (click)="openDoc('receipt', r)">
                  <span><strong>{{ r.receipt_number }}</strong> <span class="nm">{{ r.payment_date }}</span></span>
                  <span class="mono" [class.success]="r.status==='posted'" [class.reversed-amount]="r.status==='reversed'">{{ r.amount | number:'1.0-0' }} ج.س</span>
                  <span class="receipt-actions" (click)="$event.stopPropagation()">
                    <span class="badge" [class.ok]="r.status==='posted'" [class.reversed-badge]="r.status==='reversed'">{{ receiptStatusLabel(r.status) }}</span>
                    @if (r.status === 'posted') {
                      @if (canEditOrDeleteReceipt(r)) {
                        <button class="btn danger xs" (click)="openDeleteReceiptModal(r)" title="حذف السند وإلغاء أثره المالي (خلال 24 ساعة)">🗑️ حذف</button>
                      }
                      @if (canReverseReceipt(r)) {
                        <button class="btn warn xs" (click)="openCancelReceiptModal(r)" title="عكس السند محاسبياً في دفتر الأستاذ">↺ عكس</button>
                      }
                      @if (!canEditOrDeleteReceipt(r) && !canReverseReceipt(r)) {
                        <span class="badge-locked" title="تم قفل خيار الحذف والتعديل لمرور 24 ساعة">🔒 مقفل</span>
                      }
                      @if (!isReceiptUnder24h(r) && canUnlockReceipt(r)) {
                        <button class="btn primary xs" (click)="unlockReceiptForAdmin(r)" title="فتح قفل السند (صلاحية الأدمن)">🔓 فتح</button>
                      }
                    }
                  </span>
                </div>
              } @empty { <div class="empty sm">لا توجد تحصيلات.</div> }
            }
            @if (tab() === 'receivables') {
              @for (r of receivables(); track r.id) {
                <div class="sub-row clickable" (click)="openDoc('receivable', r)"><span>مستحق فاتورة</span>
                  <span class="mono">{{ r.amount | number:'1.0-0' }}</span>
                  <span class="mono due" [class.paid]="r.status==='paid'">متبقٍ {{ r.outstanding_amount | number:'1.0-0' }}</span>
                  <span class="badge" [class.ok]="r.status==='paid'" [class.due]="r.status==='outstanding'">{{ r.status === 'paid' ? 'مسدد' : 'مستحق' }}</span></div>
              } @empty { <div class="empty sm">لا توجد مستحقات.</div> }
            }
            @if (tab() === 'discounts') {
              @for (d of allDiscounts(); track d.id) {
                <div class="sub-row"><span><strong>خصم: {{ d.discount_reason || 'تخفيض مالي معتمد' }}</strong> <span class="nm">فاتورة: {{ d.invoice_number }}</span></span>
                  <span class="mono warn font-bold">- {{ d.amount | number:'1.2-2' }} ج.س</span>
                  <span class="badge ok">معتمد</span></div>
              } @empty { <div class="empty sm">لا توجد خصومات ممنوحة لهذا الحساب.</div> }
            }
            @if (tab() === 'scholarships') {
              @for (s of scholarships(); track s.id) {
                <div class="sub-row"><span><strong>{{ s.name }}</strong></span>
                  <span>{{ s.amount_percentage > 0 ? s.amount_percentage + '%' : (s.fixed_amount | number:'1.0-0') + ' ج.س' }}</span>
                  <span class="badge" [class.ok]="s.status==='approved'" [class.warn]="s.status==='cancelled'">{{ s.status === 'approved' ? 'نشطة' : (s.status === 'cancelled' ? 'ملغاة' : s.status) }}</span>
                  @if (s.status === 'approved') {
                    <button class="btn danger xs" (click)="cancelScholarship(a, s)">إلغاء وعكس</button>
                  }
                </div>
              } @empty { <div class="empty sm">لا توجد منح.</div> }
            }
            @if (tab() === 'holds') {
              @for (h of holds(); track h.id) {
                <div class="sub-row"><span><strong>{{ holdLabel(h.hold_type) }}</strong> <span class="nm">{{ h.reason }}</span></span>
                  <span class="badge" [class.warn]="h.status==='active'" [class.ok]="h.status==='released'">{{ h.status === 'active' ? 'نشط' : 'مرفوع' }}</span>
                  @if (h.status === 'active') { <button class="btn ghost xs" (click)="releaseHold(a, h)">رفع</button> }</div>
              } @empty { <div class="empty sm">لا يوجد حظر.</div> }
            }
          </div>
          }
        }
      </nb-drawer>

      <!-- نافذة تفاصيل المستند (فاتورة / تحصيل / مستحق) — مشتركة مع صفحة تفاصيل الطالب -->
      <sf-document-drawer [doc]="doc()"
        [student]="drawerStudent()"
        [studentName]="sel() ? studentName(sel().student_id) : ''"
        [billingAccount]="sel()"
        [schoolInfo]="schoolInfo()"
        [methods]="methods()"
        (closed)="doc.set(null)"></sf-document-drawer>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .mb { margin-bottom: 16px; }
    .warn-banner { background: var(--nb-warning-bg); color: var(--nb-warning); border: 1px solid var(--nb-warning-border, #f0c36d); border-radius: var(--nb-radius); padding: 10px 14px; font-size: 12.5px; margin-bottom: 14px; }
    .fld { height: 34px; padding: 0 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; box-sizing: border-box; width: 100%; }
    .fld.num { text-align: end; } .fld.search { min-width: 280px; }
    .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 800px) { .grid3 { grid-template-columns: 1fr; } }
    label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--nb-text-muted); }
    label.col2 { grid-column: span 2; }
    .form-actions { display: flex; gap: 10px; margin-top: 12px; }
    .hint { font-size: 12px; color: var(--nb-text-muted); margin: 10px 0 0; }

    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; }
    @media (max-width: 720px) { .kpis { grid-template-columns: 1fr 1fr; } }
    .kpi { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
    .kpi .l { font-size: 12px; color: var(--nb-text-muted); }
    .kpi .v { font-size: 20px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .kpi .v em { font-size: 11px; font-weight: 500; font-style: normal; color: var(--nb-text-muted); }
    .kpi .v.danger { color: var(--nb-danger); } .kpi .v.success { color: var(--nb-success); } .kpi .v.warning { color: var(--nb-warning); }

    .filters { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
    .filters .count { margin-inline-start: auto; font-size: 12px; color: var(--nb-text-muted); }

    .table-wrap { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .nb-table th { text-align: start; font-weight: 700; font-size: 11px; color: var(--nb-text-muted); background: var(--nb-surface-raised); padding: 9px 12px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table th.end { text-align: end; }
    .nb-table td { padding: 9px 12px; border-bottom: 1px solid var(--nb-border-row); color: var(--nb-text); }
    .nb-table tr:last-child td { border-bottom: none; }
    .nb-table tbody tr.clickable { cursor: pointer; }
    .nb-table tbody tr:hover td { background: var(--nb-surface-raised); }
    .mono { font-variant-numeric: tabular-nums; } .end { text-align: end; }
    .mono.due { color: var(--nb-danger); font-weight: 600; }
    .nm { color: var(--nb-text-muted); font-size: 11px; margin-inline-start: 6px; }
    .empty { text-align: center; padding: 24px; color: var(--nb-text-muted); } .empty.sm { padding: 16px; font-size: 12.5px; }
    .badge { display: inline-flex; padding: 2px 8px; font-size: 11px; font-weight: 700; border-radius: var(--nb-radius-sm); }
    .badge.ok { background: var(--nb-success-bg); color: var(--nb-success); }
    .badge.due { background: var(--nb-danger-bg); color: var(--nb-danger); }
    .badge.warn { background: var(--nb-warning-bg); color: var(--nb-warning); }

    /* الدرج 360 */
    .bal-cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 16px; }
    .bal { border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius); padding: 10px 12px; background: var(--nb-surface-raised); display: flex; flex-direction: column; gap: 4px; }
    .bal.due { border-top: 3px solid var(--nb-danger); } .bal.cr { border-top: 3px solid var(--nb-success); }
    .bal.disc { border-top: 3px solid var(--nb-warning, #d97706); }
    .bl { font-size: 11px; color: var(--nb-text-muted); }
    .bv { font-size: 18px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; } .bv.sm { font-size: 14px; }
    .bv.warn, .mono.warn, .warn { color: var(--nb-warning, #d97706); }
    .quick { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
    .action-box { border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 14px; margin-bottom: 16px; background: var(--nb-surface-raised); }
    .action-box-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 10px; flex-wrap: wrap; }
    .action-box-header h4 { margin: 0; font-size: 13px; font-weight: 700; color: var(--nb-text); }
    .calc-toggle { display: inline-flex; border: 1px solid var(--nb-border); border-radius: var(--nb-radius-sm, 6px); overflow: hidden; background: var(--nb-surface); }
    .calc-btn { border: none; background: transparent; padding: 4px 10px; font-size: 11.5px; font-family: inherit; font-weight: 600; color: var(--nb-text-muted); cursor: pointer; }
    .calc-btn.on { background: var(--nb-primary-600); color: #fff; }
    .action-box h4 { margin: 0 0 10px; font-size: 13px; font-weight: 700; color: var(--nb-text); }
    .confirm-sch-card { background: var(--nb-surface, #fff); border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius, 8px); padding: 14px; display: flex; flex-direction: column; gap: 12px; }
    .confirm-head { display: flex; align-items: flex-start; gap: 10px; }
    .confirm-head .c-icon { font-size: 20px; line-height: 1; }
    .confirm-head strong { font-size: 13.5px; color: var(--nb-text); display: block; margin-bottom: 2px; }
    .confirm-head p { font-size: 12px; color: var(--nb-text-muted); margin: 0; }
    .confirm-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; background: var(--nb-surface-raised, #f9fafb); padding: 10px 12px; border-radius: var(--nb-radius-sm, 6px); }
    .cs-item { display: flex; flex-direction: column; gap: 2px; }
    .cs-lbl { font-size: 11px; color: var(--nb-text-muted); }
    .cs-val { font-size: 13px; font-weight: 700; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .confirm-actions { display: flex; gap: 10px; align-items: center; margin-top: 4px; }
    .fee-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .chk { flex-direction: row; align-items: center; gap: 8px; font-size: 13px; color: var(--nb-text); }
    .chk .amt { margin-inline-start: auto; color: var(--nb-text-muted); font-variant-numeric: tabular-nums; }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: end; margin-bottom: 12px; }
    .tot { font-size: 13px; color: var(--nb-text); align-self: center; }

    .subtabs { display: flex; gap: 6px; flex-wrap: wrap; border-bottom: 1px solid var(--nb-border-soft); margin-bottom: 10px; }
    .stab { background: transparent; border: none; border-bottom: 2px solid transparent; padding: 8px 10px; font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--nb-text-muted); cursor: pointer; }
    .stab.on { color: var(--nb-primary-700); border-bottom-color: var(--nb-primary-600); }
    .sub-list { display: flex; flex-direction: column; }
    .sub-row { display: flex; align-items: center; gap: 12px; padding: 9px 4px; border-bottom: 1px solid var(--nb-border-soft); font-size: 13px; }
    .sub-row > span:first-child { flex: 1; }
    .sub-row .success { color: var(--nb-success); } .sub-row .due { color: var(--nb-danger); } .sub-row .due.paid { color: var(--nb-success); }
    .sub-row.clickable { cursor: pointer; } .sub-row.clickable:hover { background: var(--nb-surface-raised); }

    /* تفاصيل المستند */
    .dl { display: flex; flex-direction: column; margin-bottom: 8px; }
    .dl-row { display: flex; justify-content: space-between; gap: 16px; padding: 10px 2px; border-bottom: 1px solid var(--nb-border-soft); font-size: 13px; }
    .dl-row .k { color: var(--nb-text-muted); }
    .dl-row .v { color: var(--nb-text); font-weight: 700; text-align: end; }
    .dl-row .v.success { color: var(--nb-success); } .dl-row .v.danger { color: var(--nb-danger); }
    .dl-row.total { border-bottom: none; border-top: 2px solid var(--nb-border); margin-top: 4px; }
    .dl-row.total .v { font-size: 16px; }
    .dh { font-size: 13px; font-weight: 700; color: var(--nb-text); margin: 14px 0 10px; }
    .dlines .sum td { border-top: 2px solid var(--nb-border); font-weight: 700; background: var(--nb-surface-raised); }
    .dlines .disc { color: var(--nb-danger); }

    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 4px; }
    .btn.sm { height: 30px; padding: 0 10px; font-size: 12px; } .btn.xs { height: 26px; padding: 0 8px; font-size: 11px; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; } .btn.primary:hover:not(:disabled) { background: var(--nb-primary-700); }
    .btn.primary.on, .btn.ghost.on { outline: 2px solid var(--nb-primary-400); }
    .btn.danger { background: var(--nb-danger); color: #fff; }
    .btn.warn { background: #ea580c; color: #fff; } .btn.warn:hover:not(:disabled) { background: #c2410c; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn:disabled { opacity: .55; cursor: not-allowed; }
    .badge-locked { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }

    /* عكس سند القبض — badge و amount */
    .reversed-badge { background: #fef3c7 !important; color: #92400e !important; }
    .reversed-amount { color: var(--nb-text-muted); text-decoration: line-through; }
    .receipt-actions { display: inline-flex; align-items: center; gap: 6px; }

    /* modal عكس سند القبض */
    .modal-backdrop { position: fixed; inset: 0; z-index: 900; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; }
    .cancel-receipt-modal { background: var(--nb-surface); border-radius: var(--nb-radius-card); box-shadow: 0 12px 40px rgba(0,0,0,.2); width: 95%; max-width: 500px; overflow: hidden; animation: modalIn .2s ease; }
    @keyframes modalIn { from { transform: translateY(20px); opacity: 0; } to { transform: none; opacity: 1; } }
    .modal-header { padding: 20px 24px 14px; }
    .modal-header.danger { background: linear-gradient(135deg, #fee2e2, #fef2f2); border-bottom: 1px solid #fecaca; }
    .modal-header.success { background: linear-gradient(135deg, #dcfce7, #f0fdf4); border-bottom: 1px solid #bbf7d0; text-align: center; }
    .modal-header h3 { margin: 0 0 4px; font-size: 16px; font-weight: 800; color: var(--nb-text); }
    .modal-header .subtitle { margin: 0; font-size: 12.5px; color: var(--nb-text-muted); }
    .success-icon { width: 48px; height: 48px; border-radius: 50%; background: var(--nb-success); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 900; margin: 0 auto 10px; animation: scaleIn .3s ease; }
    @keyframes scaleIn { from { transform: scale(0); } to { transform: scale(1); } }
    .modal-body { padding: 16px 24px; }
    .cancel-receipt-info, .success-card { background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius); padding: 14px; margin-bottom: 14px; }
    .success-card { background: #f0fdf4; border-color: #bbf7d0; }
    .info-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--nb-border-soft); font-size: 13px; }
    .info-row:last-child { border-bottom: none; }
    .info-row .label { color: var(--nb-text-muted); font-weight: 500; }
    .info-row .value { color: var(--nb-text); font-weight: 700; }
    .danger-text { color: var(--nb-danger) !important; }
    .form-field { margin-bottom: 14px; }
    .form-field label { font-size: 13px; font-weight: 600; color: var(--nb-text); margin-bottom: 6px; }
    .form-field .required { color: var(--nb-danger); }
    .form-field textarea { width: 100%; padding: 10px 12px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; resize: vertical; box-sizing: border-box; }
    .form-field textarea:focus { border-color: var(--nb-primary-500); outline: none; }
    .warning-box { display: flex; gap: 10px; background: #fffbeb; border: 1px solid #fbbf24; border-radius: var(--nb-radius); padding: 12px 14px; font-size: 12px; color: #92400e; line-height: 1.6; }
    .warning-box span { font-size: 18px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 24px; border-top: 1px solid var(--nb-border-soft); }
    .spinner-sm { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class SfAccountsListComponent implements OnInit {
  private svc = inject(StudentFinanceService);
  private studentsSvc = inject(StudentsService);
  private notify = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  authService = inject(AuthService);

  loading = signal(false);
  rows = signal<any[]>([]);
  studentsMap = signal<Map<string, any>>(new Map());
  allStudents = signal<any[]>([]);
  studentsLoaded = signal(false);
  settingsReady = signal(false);
  settingsChecked = signal(false);

  methods = signal<any[]>([]);
  cashBoxes = signal<any[]>([]);
  feeStructures = signal<any[]>([]);
  schoolInfo = signal<any>(null);

  // درج الحساب
  sel = signal<any | null>(null);
  pane = signal<'' | 'invoice' | 'pay' | 'scholarship' | 'hold'>('');
  tab = signal<'invoices' | 'receipts' | 'receivables' | 'discounts' | 'scholarships' | 'holds'>('invoices');
  busy = signal(false);
  bundleLoading = signal(false);
  invoices = signal<any[]>([]);
  receipts = signal<any[]>([]);
  receivables = signal<any[]>([]);
  scholarships = signal<any[]>([]);
  holds = signal<any[]>([]);
  doc = signal<SfDoc>(null);

  allDiscounts = computed(() => {
    const list: any[] = [];
    for (const inv of this.invoices()) {
      if (inv?.discounts && Array.isArray(inv.discounts)) {
        for (const d of inv.discounts) {
          list.push({ ...d, invoice_number: inv.invoice_number });
        }
      }
    }
    return list;
  });

  totalDiscountsForAccount = computed(() => {
    return this.allDiscounts().reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  });

  getInvoiceDiscount(inv: any): number {
    if (!inv?.discounts || !Array.isArray(inv.discounts)) return 0;
    return inv.discounts.reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);
  }

  // ---- معالجات نبراس متعددة الخطوات المنبثقة ----
  createAccountModalOpen = signal(false);
  createInvoiceModalOpen = signal(false);
  createReceiptModalOpen = signal(false);
  modalAccountId = signal<string | undefined>(undefined);

  accountForReceiptModal = computed(() => {
    const a = this.sel();
    if (!a) return null;
    return {
      ...a,
      student_name: this.studentName(a.student_id),
      student_number: this.studentNumber(a.student_id),
    };
  });

  // ---- عكس/إلغاء وحذف سند القبض ----
  cancelReceiptModalOpen = signal(false);
  cancelReceiptTarget = signal<any>(null);
  cancelReceiptStep = signal<'confirm' | 'success'>('confirm');
  cancelReceiptBusy = signal(false);
  cancelReceiptReason = '';

  deleteReceiptModalOpen = signal(false);
  deleteReceiptTarget = signal<any>(null);
  deleteReceiptBusy = signal(false);
  deleteReceiptReason = '';

  schForm: any = { name: '', type: 'merit', calc_type: 'percentage', amount_percentage: 25, fixed_amount: null };
  confirmSchOpen = signal(false);
  holdForm: any = { hold_type: 'exam', reason: '' };

  search = '';
  statusFilter = '';

  filtered = computed(() => {
    const q = this.search.trim().toLowerCase();
    return this.rows().filter((a) => {
      const nm = (this.studentName(a.student_id) + ' ' + this.studentNumber(a.student_id) + ' ' + a.account_number).toLowerCase();
      if (q && !nm.includes(q)) return false;
      switch (this.statusFilter) {
        case 'outstanding': return +a.outstanding_balance > 0;
        case 'credit': return +a.credit_balance > 0;
        case 'hold': return !!a.financial_hold;
        case 'clear': return !a.financial_hold && +a.outstanding_balance === 0;
        default: return true;
      }
    });
  });
  totalOutstanding = computed(() => this.rows().reduce((s, a) => s + (+a.outstanding_balance || 0), 0));
  totalCredit = computed(() => this.rows().reduce((s, a) => s + (+a.credit_balance || 0), 0));
  blockedCount = computed(() => this.rows().filter((a) => a.financial_hold).length);
  studentsWithoutAccount = computed(() => {
    const linked = new Set(this.rows().map((a) => a.student_id));
    return this.allStudents().filter((s) => !linked.has(s.id));
  });

  ngOnInit() {
    const q = this.route.snapshot.queryParamMap.get('q');
    if (q) this.search = q;
    this.loadStudents();
    this.reload();
    this.studentsSvc.getBranding().subscribe((b) => this.schoolInfo.set(b));
    this.svc.listPaymentMethods().subscribe((r) => this.methods.set(r?.data ?? []));
    this.svc.listCashBoxes().subscribe((r) => this.cashBoxes.set(r?.data ?? []));
    this.svc.listFeeStructures().subscribe((r) => this.feeStructures.set((r?.data ?? []).filter((f: any) => f.is_active)));
    this.svc.getSettings().subscribe({
      next: (r) => { this.settingsReady.set((r?.data ?? []).length > 0); this.settingsChecked.set(true); },
      error: () => this.settingsChecked.set(true),
    });
  }

  loadStudents() {
    this.studentsSvc.getStudents({ page_size: 500 }).subscribe({
      next: (res: any) => {
        const list = res?.data ?? [];
        this.allStudents.set(list);
        const m = new Map<string, any>();
        list.forEach((s: any) => m.set(s.id, s));
        this.studentsMap.set(m);
        this.studentsLoaded.set(true);
      },
      error: () => this.studentsLoaded.set(true),
    });
  }

  reload() {
    this.loading.set(true);
    this.svc.listBillingAccounts({ page_size: 200, ordering: '-outstanding_balance' }).subscribe({
      next: (res) => { this.rows.set(res?.data ?? []); this.loading.set(false); },
      error: () => { this.rows.set([]); this.loading.set(false); },
    });
  }

  studentName(id: string): string { const s = this.studentsMap().get(id); return s?.profile?.arabic_name || 'طالب'; }
  studentNumber(id: string): string { return this.studentsMap().get(id)?.student_number || ''; }

  drawerStudent(): any {
    if (this.sel()?.student_id) {
      return this.studentsMap().get(this.sel().student_id) || null;
    }
    const d = this.doc()?.data;
    if (d?.student_id) {
      return this.studentsMap().get(d.student_id) || null;
    }
    return null;
  }

  cols(): ExportColumn[] {
    return [
      { key: 'student', label: 'الطالب', map: (a) => this.studentName(a.student_id) },
      { key: 'number', label: 'رقم الطالب', map: (a) => this.studentNumber(a.student_id) },
      { key: 'account_number', label: 'رقم الحساب' },
      { key: 'current_balance', label: 'الرصيد الحالي', align: 'end' },
      { key: 'outstanding_balance', label: 'المستحق', align: 'end' },
      { key: 'credit_balance', label: 'دائن', align: 'end' },
      { key: 'financial_hold', label: 'الحالة', map: (a) => (a.financial_hold ? 'إيقاف مالي' : 'سليم') },
    ];
  }

  // ---- فتح الحساب عبر المعالج المنبثق ----
  openCreateAccountModal() {
    this.createAccountModalOpen.set(true);
  }

  onAccountCreated(res: any) {
    this.reload();
  }

  // ---- إصدار فاتورة عبر المعالج المنبثق ----
  openInvoiceModal(accountId?: string) {
    this.modalAccountId.set(accountId);
    this.createInvoiceModalOpen.set(true);
  }

  onInvoiceSaved(res: any) {
    this.reload();
    if (this.sel()) {
      this.refreshAfter(this.sel());
    }
  }

  // ---- تحصيل دفعة وسند قبض عبر المعالج المنبثق ----
  openReceiptModal(accountId?: string) {
    this.modalAccountId.set(accountId);
    this.createReceiptModalOpen.set(true);
  }

  onReceiptSaved(res: any) {
    this.reload();
    if (this.sel()) {
      this.refreshAfter(this.sel());
    }
  }

  // ---- درج الحساب ----
  openAccount(a: any) {
    this.sel.set(a); this.pane.set(''); this.tab.set('invoices');
    this.loadAccountBundle(a.id);
  }
  loadAccountBundle(id: string) {
    this.bundleLoading.set(true);
    let pending = 5;
    const done = () => { if (--pending <= 0) this.bundleLoading.set(false); };
    this.svc.invoicesForAccount(id).subscribe({ next: (r) => this.invoices.set(r?.data ?? []), error: done, complete: done });
    this.svc.receiptsForAccount(id).subscribe({ next: (r) => this.receipts.set(r?.data ?? []), error: done, complete: done });
    this.svc.receivablesForAccount(id).subscribe({ next: (r) => this.receivables.set(r?.data ?? []), error: done, complete: done });
    this.svc.scholarshipsForAccount(id).subscribe({ next: (r) => this.scholarships.set(r?.data ?? []), error: done, complete: done });
    this.svc.holdsForAccount(id).subscribe({ next: (r) => this.holds.set(r?.data ?? []), error: done, complete: done });
  }
  setPane(p: any) { this.pane.set(this.pane() === p ? '' : p); this.confirmSchOpen.set(false); }

  openConfirmScholarship(a: any) {
    if (!this.schForm.name) return;
    if (this.schForm.calc_type === 'percentage' && !this.schForm.amount_percentage) return;
    if (this.schForm.calc_type === 'fixed' && !this.schForm.fixed_amount) return;
    this.confirmSchOpen.set(true);
  }

  schCalculatedAmount(a: any): number {
    if (this.schForm.calc_type === 'percentage') {
      const pct = Number(this.schForm.amount_percentage) || 0;
      const base = Number(a?.outstanding_balance) || 0;
      return (base * pct) / 100;
    }
    return Number(this.schForm.fixed_amount) || 0;
  }

  newOutstandingAfterSch(a: any): number {
    const cur = Number(a?.outstanding_balance) || 0;
    return Math.max(0, cur - this.schCalculatedAmount(a));
  }

  // ---- تفاصيل المستند (فاتورة/تحصيل/مستحق) — عبر المكوّن المشترك sf-document-drawer ----
  openDoc(type: 'invoice' | 'receipt' | 'receivable', data: any) { this.doc.set({ type, data }); }

  private refreshAfter(a: any) {
    this.loadAccountBundle(a.id);
    this.svc.listBillingAccounts({ page_size: 200 }).subscribe((res) => {
      this.rows.set(res?.data ?? []);
      const updated = (res?.data ?? []).find((x: any) => x.id === a.id);
      if (updated) this.sel.set(updated);
    });
  }

  applyScholarship(a: any) {
    this.busy.set(true);
    const isPct = this.schForm.calc_type === 'percentage';
    const payload = {
      billing_account_id: a.id,
      name: this.schForm.name,
      type: this.schForm.type,
      amount_percentage: isPct ? (+this.schForm.amount_percentage || 0) : 0,
      fixed_amount: !isPct ? (+this.schForm.fixed_amount || 0) : 0,
      start_date: new Date().toISOString().slice(0, 10)
    };
    this.svc.applyScholarshipApi(payload).subscribe({
      next: (res: any) => {
        this.busy.set(false);
        this.confirmSchOpen.set(false);
        this.notify.success('تم اعتماد التخفيض وتطبيقه على الفاتورة والحساب المالي بنجاح.');
        this.pane.set('');
        this.tab.set('discounts');
        this.refreshAfter(a);
      },
      error: (e) => {
        this.busy.set(false);
        this.confirmSchOpen.set(false);
        const msg = e?.error?.message || e?.error?.error?.message || 'تعذّر اعتماد التخفيض.';
        this.notify.error(msg);
      },
    });
  }
  cancelScholarship(a: any, s: any) {
    this.busy.set(true);
    this.svc.cancelScholarship(s.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.notify.success(`تم إلغاء المنحة «${s.name}» وعكس الخصم واستعادة رصيد الفاتورة بنجاح.`);
        this.refreshAfter(a);
      },
      error: (e) => {
        this.busy.set(false);
        this.notify.error(e?.error?.message || 'تعذّر إلغاء المنحة.');
      }
    });
  }
  applyHold(a: any) {
    this.busy.set(true);
    this.svc.applyHoldApi({ billing_account_id: a.id, hold_type: this.holdForm.hold_type, reason: this.holdForm.reason }).subscribe({
      next: () => { this.busy.set(false); this.notify.success('تم فرض الحظر المالي.'); this.pane.set(''); this.tab.set('holds'); this.refreshAfter(a); },
      error: (e) => { this.busy.set(false); this.notify.error(e?.error?.message || 'تعذّر فرض الحظر.'); },
    });
  }
  releaseHold(a: any, h: any) {
    this.svc.releaseHold(h.id).subscribe({
      next: () => { this.notify.success('تم رفع الحظر المالي.'); this.refreshAfter(a); },
      error: (e) => this.notify.error(e?.error?.message || 'تعذّر رفع الحظر.'),
    });
  }
  openStudent(studentId: string) { this.router.navigate(['/students/details', studentId]); }
  openStatement(accountId: string) { this.router.navigate(['/student-finance/accounts', accountId, 'statement']); }
  goDashboard() { this.router.navigateByUrl('/student-finance/dashboard'); }
  holdLabel(t: string) { return ({ exam: 'حجب الامتحانات', registration: 'منع التسجيل', certificate: 'منع الشهادات', graduation: 'حظر التخرج', library: 'حظر المكتبة', custom: 'مخصص' } as any)[t] || t; }
  receiptStatusLabel(s: string) { return ({ draft: 'مسودة', posted: 'مرحل', cancelled: 'ملغي', reversed: 'معكوس' } as any)[s] || s; }

  isReceiptUnder24h(r: any): boolean {
    if (r?.is_under_24h !== undefined) return !!r.is_under_24h;
    if (!r?.created_at) return true;
    const diffHours = (new Date().getTime() - new Date(r.created_at).getTime()) / (1000 * 3600);
    return diffHours <= 24;
  }

  canEditOrDeleteReceipt(r: any): boolean {
    if (r?.status === 'reversed') return false;
    if (this.authService.isSuperuser() || this.authService.hasPermission('receipts:delete')) {
      if (this.isReceiptUnder24h(r) || r?.is_admin_unlocked || this.authService.isSuperuser()) {
        return true;
      }
    }
    return this.isReceiptUnder24h(r);
  }

  canReverseReceipt(r: any): boolean {
    if (r?.status !== 'posted') return false;
    if (this.authService.isSuperuser()) return true;
    return !this.isReceiptUnder24h(r) && this.authService.hasPermission('receipts:reverse');
  }

  canUnlockReceipt(r: any): boolean {
    if (r?.status === 'reversed') return false;
    return this.authService.isSuperuser() || this.authService.hasPermission('receipts:unlock');
  }

  // ---- عكس/إلغاء سند القبض ----
  openCancelReceiptModal(receipt: any) {
    this.cancelReceiptTarget.set(receipt);
    this.cancelReceiptStep.set('confirm');
    this.cancelReceiptReason = '';
    this.cancelReceiptModalOpen.set(true);
  }

  closeCancelReceiptModal() {
    this.cancelReceiptModalOpen.set(false);
    this.cancelReceiptTarget.set(null);
    this.cancelReceiptReason = '';
  }

  confirmCancelReceipt() {
    const receipt = this.cancelReceiptTarget();
    if (!receipt || !this.cancelReceiptReason.trim()) return;

    this.cancelReceiptBusy.set(true);
    this.svc.cancelReceipt(receipt.id, this.cancelReceiptReason.trim()).subscribe({
      next: () => {
        this.cancelReceiptBusy.set(false);
        this.cancelReceiptStep.set('success');
        this.notify.success('تم عكس سند القبض وتحديث الأرصدة المالية بنجاح.');
        // تحديث البيانات المالية (مثل AJAX)
        if (this.sel()) {
          this.refreshAfter(this.sel());
        }
      },
      error: (e) => {
        this.cancelReceiptBusy.set(false);
        const msg = e?.error?.error?.message || e?.error?.message || 'تعذّر عكس سند القبض.';
        this.notify.error(msg);
      },
    });
  }

  // ---- حذف سند القبض (صالح خلال أول 24 ساعة) ----
  openDeleteReceiptModal(receipt: any) {
    this.deleteReceiptTarget.set(receipt);
    this.deleteReceiptReason = '';
    this.deleteReceiptModalOpen.set(true);
  }

  closeDeleteReceiptModal() {
    this.deleteReceiptModalOpen.set(false);
    this.deleteReceiptTarget.set(null);
    this.deleteReceiptReason = '';
  }

  confirmDeleteReceipt() {
    const receipt = this.deleteReceiptTarget();
    if (!receipt) return;

    this.deleteReceiptBusy.set(true);
    this.svc.deleteReceipt(receipt.id, this.deleteReceiptReason.trim()).subscribe({
      next: () => {
        this.deleteReceiptBusy.set(false);
        this.closeDeleteReceiptModal();
        this.notify.success(`تم حذف سند القبض ${receipt.receipt_number} وإعادة الرصيد للمستحقات بنجاح.`);
        if (this.sel()) {
          this.refreshAfter(this.sel());
        }
      },
      error: (e) => {
        this.deleteReceiptBusy.set(false);
        const msg = e?.error?.error?.message || e?.error?.message || 'تعذّر حذف سند القبض.';
        this.notify.error(msg);
      }
    });
  }

  unlockReceiptForAdmin(receipt: any) {
    this.svc.unlockReceipt(receipt.id, 24).subscribe({
      next: () => {
        this.notify.success(`تم فتح قفل السند ${receipt.receipt_number} للتعديل والحذف لمدة 24 ساعة.`);
        if (this.sel()) {
          this.refreshAfter(this.sel());
        }
      },
      error: (e) => {
        const msg = e?.error?.error?.message || e?.error?.message || 'تعذّر فتح قفل السند.';
        this.notify.error(msg);
      }
    });
  }
}
