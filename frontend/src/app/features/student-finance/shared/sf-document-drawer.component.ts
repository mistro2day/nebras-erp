import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, inject, signal, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { NbDrawerComponent } from '../../../shared/nebras/nb-drawer.component';
import { NbExportMenuComponent, ExportColumn, exportElementToPdf } from '../../../shared/export';
import { StudentsService } from '../../students/students.service';
import { StudentFinanceService } from '../student-finance.service';
import { TenantService } from '../../../core/services/tenant.service';
import { AuthService } from '../../../core/auth/auth.service';
import { environment } from '../../../../environments/environment';

export type SfDoc = { type: 'invoice' | 'receipt' | 'receivable'; data: any } | null;

export const DEFAULT_BRAND = {
  name: 'مدارس المورد الجديدة للتعليم الخاص الخاصة',
  name_ar: 'مدارس المورد الجديدة للتعليم الخاص الخاصة',
  name_en: 'Al-Mawred Model Private Schools',
  accreditation: 'وزارة التعليم والتربية الوطنية',
  address: 'جمهورية السودان — ولاية الخرطوم — أركويت — شارع الفردوس — مربع 54',
  logo_url: '',
  stamp_url: '',
};

function tafqeetArabic(num: number, currency = 'جنيه'): string {
  if (!num || num <= 0) return 'صفر ' + currency;
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertGroup(n: number): string {
    let res = '';
    const h = Math.floor(n / 100);
    const rem = n % 100;
    if (h > 0) res += hundreds[h];
    if (rem > 0) {
      if (res) res += ' و';
      if (rem < 20) {
        res += ones[rem];
      } else {
        const t = Math.floor(rem / 10);
        const o = rem % 10;
        if (o > 0) res += ones[o] + ' و';
        res += tens[t];
      }
    }
    return res;
  }

  const intPart = Math.floor(num);
  let words = '';
  const millions = Math.floor(intPart / 1000000);
  const thousands = Math.floor((intPart % 1000000) / 1000);
  const rem = intPart % 1000;

  if (millions > 0) {
    if (millions === 1) words += 'مليون';
    else if (millions === 2) words += 'مليونان';
    else if (millions >= 3 && millions <= 10) words += convertGroup(millions) + ' ملايين';
    else words += convertGroup(millions) + ' مليون';
  }

  if (thousands > 0) {
    if (words) words += ' و';
    if (thousands === 1) words += 'ألف';
    else if (thousands === 2) words += 'ألفان';
    else if (thousands >= 3 && thousands <= 10) words += convertGroup(thousands) + ' آلاف';
    else words += convertGroup(thousands) + ' ألف';
  }

  if (rem > 0) {
    if (words) words += ' و';
    words += convertGroup(rem);
  }

  return `فقط ${words} ${currency} لا غير`;
}

/**
 * نافذة وتصميم مستند فوترة الطلاب الفاخر (فاتورة رسوم دراسية / سند قبض مالي رسمي / مستحق)
 * مزوّد بترويسة وتذييل مدرسة المستأجر (المورد)، تفاصيل الطالب والولي، تفقيط المبالغ، والختم المعتمد والطباعة A4.
 */
@Component({
  selector: 'sf-document-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DecimalPipe, NbDrawerComponent, NbExportMenuComponent],
  template: `
    <nb-drawer [open]="!!doc" [width]="740" [title]="meta().title" [subtitle]="meta().subtitle" (closed)="closed.emit()">
      @if (doc; as d) {
        <!-- شريط الإجراءات العلوي للطباعة والتصدير -->
        <div class="doc-actions-bar no-print">
          <button type="button" class="btn-print-action" (click)="printDocument()">
            <span>🖨️</span>
            <span>طباعة المستند الرسمي (A4)</span>
          </button>
          <div class="meta-tag">
            <span class="status-pill" [class.posted]="d.data?.status === 'posted'" [class.draft]="d.data?.status === 'draft'">
              {{ d.data?.status === 'posted' ? '✓ مستند معتمد ومرحل' : 'مسودة' }}
            </span>
          </div>
        </div>

        <!-- ورقة المستند الرسمية الفاخرة (سند قبض / فاتورة) -->
        <div class="official-voucher-card" id="official-print-voucher">
          <!-- 1. ترويسة المدرسة الرسمية (Tenant Header - المورد) -->
          <div class="voucher-header">
            <div class="school-brand-meta">
              <h2 class="school-name-ar">{{ getSchoolNameAr() }}</h2>
              <h4 class="school-name-en">{{ getSchoolNameEn() }}</h4>
              <p class="accreditation-line">وزارة التعليم والتربية الوطنية</p>
              <p class="school-contact-line">📍 {{ getSchoolAddress() }}</p>
            </div>
            <div class="school-logo-wrapper">
              @if (getLogoUrl()) {
                <img [src]="getLogoUrl()" alt="شعار المدرسة" class="school-logo-img" (error)="onLogoError()" />
              } @else {
                <div class="school-logo-placeholder">
                  <span>🏛️</span>
                </div>
              }
            </div>
          </div>

          <!-- الفاصل الهندسي التزييني -->
          <div class="luxury-divider">
            <span class="divider-diamond">◆</span>
          </div>

          <!-- 2. شريط عنوان المستند ورقمه وتاريخه في سطر واحد ومحاذاة متناسقة -->
          <div class="doc-banner">
            <div class="doc-title-box">
              <h1 class="doc-main-title">
                {{ d.type === 'receipt' ? 'سند قـبـض مـالـي' : (d.type === 'invoice' ? 'فاتـورة رسـوم دراسـيـة رسميـة' : 'إشعار مطالبة مالية') }}
              </h1>
              <span class="doc-sub-title">
                {{ d.type === 'receipt' ? 'OFFICIAL PAYMENT RECEIPT' : (d.type === 'invoice' ? 'OFFICIAL TUITION FEES INVOICE' : 'OFFICIAL PAYMENT NOTICE') }}
              </span>
            </div>
            <div class="doc-meta-row">
              <div class="meta-item-box">
                <span class="lbl">{{ d.type === 'invoice' ? 'رقم الفاتورة:' : 'رقم السند:' }}</span>
                <span class="val mono">{{ d.data?.receipt_number || d.data?.invoice_number || '—' }}</span>
              </div>
              <div class="meta-item-box">
                <span class="lbl">{{ d.type === 'invoice' ? 'تاريخ الإصدار:' : 'التاريخ:' }}</span>
                <span class="val">{{ d.data?.payment_date || d.data?.issue_date || todayDate }}</span>
              </div>
              @if (d.type === 'invoice' && d.data?.due_date) {
                <div class="meta-item-box">
                  <span class="lbl">الاستحقاق:</span>
                  <span class="val mono">{{ d.data?.due_date }}</span>
                </div>
              }
              <div class="meta-item-box">
                <span class="lbl">{{ d.type === 'invoice' ? 'المحاسب المسؤول:' : 'أمين الصندوق / المحاسب:' }}</span>
                <span class="val bold">{{ getAccountantName() || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- 3. شبكة تفاصيل الطالب وولي الأمر -->
          <div class="student-info-section">
            <div class="info-cell">
              <span class="c-label">اسم الطالب/ـة:</span>
              <span class="c-val strong">{{ getStudentName() }}</span>
            </div>
            <div class="info-cell">
              <span class="c-label">الرقم الأكاديمي / المدرسي:</span>
              <span class="c-val mono">{{ getStudentNumber() }}</span>
            </div>
            <div class="info-cell">
              <span class="c-label">المرحلة والصف:</span>
              <span class="c-val">{{ getGradeName() }}</span>
            </div>
            <div class="info-cell">
              <span class="c-label">الشعبة / الفصل:</span>
              <span class="c-val">{{ getSectionName() }}</span>
            </div>
            <div class="info-cell">
              <span class="c-label">ولي الأمر:</span>
              <span class="c-val">{{ getGuardianName() }}</span>
            </div>
            <div class="info-cell">
              <span class="c-label">هاتف ولي الأمر:</span>
              <span class="c-val mono">{{ getGuardianPhone() }}</span>
            </div>
            <div class="info-cell">
              <span class="c-label">رقم حساب الطالب:</span>
              <span class="c-val mono">{{ getAccountNumber() }}</span>
            </div>
            @if (d.type === 'receipt') {
              <div class="info-cell">
                <span class="c-label">طريقة السداد:</span>
                <span class="c-val">{{ getPaymentMethodText() }}</span>
              </div>
              <div class="info-cell balance-cell">
                <span class="c-label">المتبقي من الرسوم:</span>
                <span class="c-val mono remaining-val" [class.danger]="getRemainingBalance() > 0" [class.success]="getRemainingBalance() <= 0">
                  {{ getRemainingBalance() | number:'1.2-2' }} ج.س
                </span>
              </div>
            } @else if (d.type === 'invoice') {
              <div class="info-cell">
                <span class="c-label">تاريخ الاستحقاق:</span>
                <span class="c-val mono">{{ d.data?.due_date || '—' }}</span>
              </div>
              <div class="info-cell balance-cell">
                <span class="c-label">المتبقي من الفاتورة:</span>
                <span class="c-val mono remaining-val" [class.danger]="getInvoiceOutstanding() > 0" [class.success]="getInvoiceOutstanding() <= 0">
                  {{ getInvoiceOutstanding() | number:'1.2-2' }} ج.س
                </span>
              </div>
            }
          </div>

          <!-- 4. جدول بنود الرسوم والمبالغ -->
          <div class="breakdown-section">
            <h3 class="section-heading">{{ d.type === 'invoice' ? 'تفاصيل الرسوم الدراسية والبنود' : 'تفاصيل البنود والمبالغ المالية' }}</h3>
            <table class="voucher-table">
              <thead>
                <tr>
                  <th style="width: 45px;">#</th>
                  <th>{{ d.type === 'invoice' ? 'بيان الرسوم الدراسية / تفاصيل البند' : 'بيان الرسوم / تفاصيل القسط' }}</th>
                  <th class="text-end" style="width: 140px;">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                @if (d.type === 'invoice') {
                  @if (d.data.items?.length) {
                    @for (it of d.data.items; track it.id || $index; let idx = $index) {
                      <tr>
                        <td class="text-center">{{ idx + 1 }}</td>
                        <td class="item-desc">{{ it.description || it.fee_structure_name || 'بند رسوم دراسية' }}</td>
                        <td class="text-end mono">{{ (it.amount || 0) | number:'1.2-2' }}</td>
                      </tr>
                    }
                  } @else {
                    <tr>
                      <td class="text-center">1</td>
                      <td class="item-desc">
                        رسوم دراسية وفاتورة مستحقة للطالب — {{ d.data?.notes || d.data?.title || ('فاتورة رقم ' + (d.data?.invoice_number || '')) }}
                      </td>
                      <td class="text-end mono font-bold">{{ (d.data?.total_amount || 0) | number:'1.2-2' }}</td>
                    </tr>
                  }
                  @if (d.data.discounts?.length) {
                    @for (dc of d.data.discounts; track dc.id || $index) {
                      <tr class="discount-row">
                        <td class="text-center">★</td>
                        <td class="item-desc">خصم: {{ dc.discount_reason || 'منحة / تخفيض مالي معتمد' }}</td>
                        <td class="text-end mono">- {{ (dc.amount || 0) | number:'1.2-2' }}</td>
                      </tr>
                    }
                  }
                } @else if (d.type === 'receipt') {
                  <tr>
                    <td class="text-center">1</td>
                    <td class="item-desc">
                      سداد رسوم دراسية وتسجيل للطالب — {{ d.data?.notes || 'دفعة سداد معتمدة بموجب إيصال قبض' }}
                    </td>
                    <td class="text-end mono font-bold">{{ (d.data?.amount || 0) | number:'1.2-2' }}</td>
                  </tr>
                } @else {
                  <tr>
                    <td class="text-center">1</td>
                    <td class="item-desc">مستحقات رسوم دراسية مجدولة</td>
                    <td class="text-end mono">{{ (d.data?.amount || 0) | number:'1.2-2' }}</td>
                  </tr>
                }
              </tbody>
              <tfoot>
                @if (d.type === 'invoice') {
                  @if (getInvoiceDiscount() > 0) {
                    <tr class="subtotal-row">
                      <td colspan="2" class="subtotal-label">إجمالي الرسوم (قبل الخصم):</td>
                      <td class="mono text-end">{{ getInvoiceGross() | number:'1.2-2' }}</td>
                    </tr>
                    <tr class="discount-total-row">
                      <td colspan="2" class="discount-total-label">إجمالي الخصومات والتخفيضات:</td>
                      <td class="mono text-end text-danger">- {{ getInvoiceDiscount() | number:'1.2-2' }}</td>
                    </tr>
                  }
                  <tr class="total-row">
                    <td colspan="2" class="total-label">إجمالي الفاتورة الصافي المستحق:</td>
                    <td class="total-amount mono text-end font-bold">{{ (d.data?.total_amount || 0) | number:'1.2-2' }}</td>
                  </tr>
                  @if (getPaidAmount() > 0) {
                    <tr class="paid-row">
                      <td colspan="2" class="paid-label">المبلغ المسدد والمدفوع حتى تاريخه:</td>
                      <td class="mono text-end text-success font-bold">{{ getPaidAmount() | number:'1.2-2' }}</td>
                    </tr>
                  }
                  <tr class="remaining-row">
                    <td colspan="2" class="remaining-label">
                      <span class="remaining-title">المتبقي المستحق من هذه الفاتورة:</span>
                    </td>
                    <td class="remaining-amount mono text-end font-bold" [class.has-due]="getInvoiceOutstanding() > 0" [class.cleared]="getInvoiceOutstanding() <= 0">
                      {{ getInvoiceOutstanding() | number:'1.2-2' }}
                    </td>
                  </tr>
                } @else if (d.type === 'receipt') {
                  <tr class="total-row">
                    <td colspan="2" class="total-label">
                      إجمالي المبلغ المقبوض والمحصّل بهذا السند:
                    </td>
                    <td class="total-amount mono text-end font-bold">
                      {{ (d.data?.amount || 0) | number:'1.2-2' }}
                    </td>
                  </tr>
                  <tr class="remaining-row">
                    <td colspan="2" class="remaining-label">
                      <span class="remaining-title">المتبقي من الرسوم الدراسية (الرصيد المستحق):</span>
                    </td>
                    <td class="remaining-amount mono text-end font-bold" [class.has-due]="getRemainingBalance() > 0" [class.cleared]="getRemainingBalance() <= 0">
                      {{ getRemainingBalance() | number:'1.2-2' }}
                    </td>
                  </tr>
                } @else {
                  <tr class="total-row">
                    <td colspan="2" class="total-label">إجمالي المبلغ المستحق:</td>
                    <td class="total-amount mono text-end">{{ (d.data?.amount || 0) | number:'1.2-2' }}</td>
                  </tr>
                }
              </tfoot>
            </table>
          </div>

          <!-- 5. التفقيط المالي (المبلغ كتابة باللغة العربية) -->
          <div class="tafqeet-container">
            @if (d.type === 'invoice') {
              <div class="tafqeet-box">
                <span class="tafqeet-title">إجمالي الفاتورة كتابةً:</span>
                <span class="tafqeet-text">{{ getInvoiceTafqeetText() }}</span>
              </div>
              @if (getInvoiceOutstanding() > 0) {
                <div class="tafqeet-box remaining-tafqeet-box">
                  <span class="tafqeet-title remaining-tafqeet-title">المتبقي المستحق من الفاتورة كتابةً:</span>
                  <span class="tafqeet-text remaining-tafqeet-text">{{ getInvoiceOutstandingTafqeetText() }}</span>
                </div>
              }
            } @else {
              <div class="tafqeet-box">
                <span class="tafqeet-title">المبلغ المقبوض كتابةً:</span>
                <span class="tafqeet-text">{{ getTafqeetText() }}</span>
              </div>
              @if (getRemainingBalance() > 0) {
                <div class="tafqeet-box remaining-tafqeet-box">
                  <span class="tafqeet-title remaining-tafqeet-title">المتبقي من الرسوم كتابةً:</span>
                  <span class="tafqeet-text remaining-tafqeet-text">{{ getRemainingTafqeetText() }}</span>
                </div>
              }
            }
          </div>

          <!-- 6. الملاحظات والسياسة المالية -->
          <div class="terms-box">
            @if (d.type === 'invoice') {
              <p><strong>ملاحظات هامة:</strong> تستحق هذه الفاتورة وتخضع للائحة والسياسة المالية المعتمدة لمدارس المورد الجديدة للتعليم الخاص. يرجى سداد المبلغ المتبقي قبل حلول تاريخ الاستحقاق لتجنب تعليق الخدمات الأكاديمية أو فرض غرامات التأخير.</p>
            } @else {
              <p><strong>ملاحظات هامة:</strong> الرسوم المدفوعة تخضع للائحة والسياسة المالية للمدرسة. يرجى الاحتفاظ بهذا السند كإثبات رسمي لعملية السداد.</p>
            }
          </div>

          <!-- 7. التذييل والتوقيعات الرسمية والختم المعتمد -->
          <div class="signatures-section">
            <div class="sig-box">
              <span class="sig-title">{{ d.type === 'invoice' ? 'محاسب المدرسة / شؤون الطلاب المالية' : 'أمين الصندوق / المحاسب' }}</span>
              <div class="sig-signer-name">{{ getAccountantName() }}</div>
              <div class="sig-space"></div>
              <span class="sig-hint">التوقيع والاعتماد</span>
            </div>
            <div class="sig-box">
              <span class="sig-title">{{ d.type === 'invoice' ? 'استلام ولي الأمر / الطالب' : 'توقيع ولي الأمر / المسدد' }}</span>
              <div class="sig-space"></div>
              <span class="sig-hint">{{ d.type === 'invoice' ? 'الاسم والتوقيع بالعلم' : 'الاسم والتوقيع' }}</span>
            </div>
            <div class="sig-box stamp-box">
              <span class="sig-title">ختم الإدارة المالية للمدرسة</span>
              <div class="stamp-container">
                @if (getStampUrl()) {
                  <img [src]="getStampUrl()" alt="الختم الرسمي للمدرسة" class="official-school-stamp-img" (error)="onStampError()" />
                } @else {
                  <div class="stamp-badge">
                    <span class="stamp-school-text">{{ getSchoolNameAr() }}</span>
                    <span class="stamp-center-text">الإدارة المالية</span>
                    <span class="stamp-approved-text">★ معتمد ★</span>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- 8. التذييل النهائي للمستأجر والنظام -->
          <div class="voucher-footer-meta">
            <span>تم الإصدار عبر نظام نبراس لإدارة المؤسسات التعليمية (Nebras ERP)</span>
            <span>تاريخ ووقت الطباعة: {{ currentDateTime() }}</span>
          </div>
        </div>
      }

      <div drawer-actions class="drawer-actions-wrapper">
        <button type="button" class="btn-print-drawer-primary" (click)="printDocument()">
          <span>🖨️</span>
          <span>طباعة المستند الرسمي (A4)</span>
        </button>
        <nb-export-menu
          [columns]="exportCols()"
          [rows]="exportRows()"
          [title]="meta().title"
          [subtitle]="meta().subtitle"
          [filename]="meta().title"
          [showPrint]="true"
          [customPrint]="printFn"
          [customPdf]="pdfFn">
        </nb-export-menu>
      </div>
    </nb-drawer>
  `,
  styles: [`
    .drawer-actions-wrapper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      gap: 12px;
    }
    .btn-print-drawer-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #0284c7, #0369a1);
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(2, 132, 199, 0.25);
      transition: all 0.2s ease;
    }
    .btn-print-drawer-primary:hover {
      background: linear-gradient(135deg, #0369a1, #075985);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
    }
    .doc-actions-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--nb-border-soft);
    }
    .btn-print-action {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #0284c7, #0369a1);
      color: #ffffff;
      border: none;
      padding: 9px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(2, 132, 199, 0.25);
      transition: all 0.2s ease;
    }
    .btn-print-action:hover {
      background: linear-gradient(135deg, #0369a1, #075985);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
    }
    .status-pill {
      font-size: 12px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 20px;
    }
    .status-pill.posted {
      background: rgba(16, 185, 129, 0.12);
      color: #059669;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .status-pill.draft {
      background: rgba(245, 158, 11, 0.12);
      color: #d97706;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    /* كرت السند / الفاتورة الرسمي الفاخر */
    .official-voucher-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 24px;
      color: #0f172a;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
      position: relative;
    }

    /* الترويسة */
    .voucher-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    .school-brand-meta .school-name-ar {
      font-size: 19px;
      font-weight: 800;
      color: #0284c7;
      margin: 0 0 2px;
    }
    .school-brand-meta .school-name-en {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      margin: 0 0 4px;
      letter-spacing: 0.5px;
    }
    .school-brand-meta .accreditation-line {
      font-size: 11px;
      color: #475569;
      margin: 0 0 2px;
    }
    .school-brand-meta .school-contact-line {
      font-size: 11px;
      color: #64748b;
      margin: 0;
    }
    .school-logo-wrapper {
      max-width: 140px;
      max-height: 80px;
      min-width: 60px;
      min-height: 60px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      padding: 4px;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }
    .school-logo-img {
      max-width: 130px;
      max-height: 72px;
      width: auto;
      height: auto;
      object-fit: contain;
    }
    .school-logo-placeholder {
      font-size: 32px;
    }

    /* الفاصل */
    .luxury-divider {
      position: relative;
      height: 2px;
      background: linear-gradient(90deg, transparent, #0284c7, transparent);
      margin: 16px 0;
      text-align: center;
    }
    .divider-diamond {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #ffffff;
      padding: 0 8px;
      color: #0284c7;
      font-size: 12px;
    }

    /* شريط عنوان المستند الموحد في سطر واحد */
    .doc-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 16px;
      margin-bottom: 16px;
    }
    .doc-title-box {
      display: flex;
      flex-direction: column;
    }
    .doc-main-title {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .doc-sub-title {
      font-size: 9.5px;
      color: #64748b;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .doc-meta-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .meta-item-box {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #ffffff;
      padding: 5px 12px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
    }
    .meta-item-box .lbl { font-size: 11px; color: #64748b; font-weight: 600; }
    .meta-item-box .val { font-size: 12px; font-weight: 800; color: #0f172a; }

    /* تفاصيل الطالب */
    .student-info-section {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px 16px;
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
    }
    .info-cell {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }
    .info-cell .c-label { color: #64748b; width: 140px; flex-shrink: 0; }
    .info-cell .c-val { color: #1e293b; font-weight: 600; }
    .info-cell .c-val.strong { font-weight: 800; color: #0284c7; }
    .info-cell.balance-cell {
      background: rgba(239, 68, 68, 0.05);
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px dashed rgba(239, 68, 68, 0.25);
      grid-column: 2;
    }
    .remaining-val { font-size: 13px; font-weight: 800; }
    .remaining-val.danger { color: #dc2626; }
    .remaining-val.success { color: #059669; }

    /* جدول البنود */
    .breakdown-section {
      margin-bottom: 14px;
    }
    .section-heading {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 8px;
    }
    .voucher-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .voucher-table th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 700;
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      text-align: start;
    }
    .voucher-table td {
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      color: #1e293b;
    }
    .voucher-table .discount-row td {
      color: #dc2626;
      background: rgba(220, 38, 38, 0.03);
    }
    .voucher-table tfoot .total-row td {
      background: #f8fafc;
      border-top: 2px solid #cbd5e1;
      font-weight: 800;
    }
    .total-label { font-size: 13px; color: #0f172a; }
    .total-amount { font-size: 15px; color: #059669; font-weight: 800; }

    .voucher-table tfoot .remaining-row td {
      background: rgba(254, 242, 242, 0.7);
      border-top: 1px dashed #fca5a5;
      border-bottom: 2px solid #ef4444;
      font-weight: 800;
    }
    .remaining-label { font-size: 13px; color: #991b1b; }
    .remaining-title { font-weight: 800; }
    .remaining-amount { font-size: 16px; font-weight: 800; }
    .remaining-amount.has-due { color: #dc2626; }
    .remaining-amount.cleared { color: #059669; }

    /* التفقيط */
    .tafqeet-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;
    }
    .tafqeet-box {
      background: rgba(2, 132, 199, 0.06);
      border: 1px solid rgba(2, 132, 199, 0.2);
      border-radius: 6px;
      padding: 8px 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }
    .tafqeet-title { font-weight: 700; color: #0284c7; flex-shrink: 0; }
    .tafqeet-text { font-weight: 700; color: #0f172a; }

    .remaining-tafqeet-box {
      background: rgba(254, 242, 242, 0.85);
      border: 1px solid rgba(239, 68, 68, 0.35);
    }
    .remaining-tafqeet-title { color: #dc2626; font-weight: 800; }
    .remaining-tafqeet-text { color: #991b1b; font-weight: 700; }

    /* الملاحظات */
    .terms-box {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 18px;
      line-height: 1.5;
    }
    .terms-box p { margin: 0; }

    /* التوقيعات */
    .signatures-section {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      padding-top: 14px;
      border-top: 1px solid #cbd5e1;
      margin-bottom: 14px;
    }
    .sig-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .sig-title { font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 8px; }
    .sig-signer-name {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 12px;
      background: #f1f5f9;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }
    .sig-space { width: 100%; border-bottom: 1px dashed #cbd5e1; margin-bottom: 4px; }
    .sig-hint { font-size: 10px; color: #94a3b8; }
    .stamp-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 70px;
    }
    .official-school-stamp-img {
      max-height: 80px;
      max-width: 110px;
      object-fit: contain;
      transform: rotate(-3deg);
    }
    .stamp-badge {
      width: 80px;
      height: 56px;
      border: 1.5px dashed #0284c7;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      color: #0284c7;
      font-weight: 700;
      transform: rotate(-3deg);
      text-align: center;
      line-height: 1.2;
      padding: 4px;
    }

    /* التذييل النهائي */
    .voucher-footer-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 8px;
    }

    .mono { font-family: monospace, sans-serif; }
    .text-center { text-align: center; }
    .text-end { text-align: end; }

    @media print {
      @page {
        size: A4 portrait;
        margin: 10mm 12mm;
      }
      body * {
        visibility: hidden !important;
      }
      #official-print-voucher,
      #official-print-voucher * {
        visibility: visible !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      #official-print-voucher {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 16px 20px !important;
        border: 1.5px solid #cbd5e1 !important;
        box-shadow: none !important;
        background: #ffffff !important;
        z-index: 999999 !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .doc-actions-bar,
      [drawer-actions],
      .no-print {
        display: none !important;
      }
    }
  `],
})
export class SfDocumentDrawerComponent implements OnInit, OnChanges {
  private elRef = inject(ElementRef);
  private studentsService = inject(StudentsService);
  private studentFinanceService = inject(StudentFinanceService);
  private tenantService = inject(TenantService);
  private authService = inject(AuthService, { optional: true });

  readonly printFn = () => this.printDocument();
  readonly pdfFn = () => this.exportVoucherPdf();

  @Input() doc: SfDoc = null;
  @Input() studentName = '';
  @Input() student: any = null;
  @Input() schoolInfo: any = null;
  @Input() billingAccount: any = null;
  @Input() methods: any[] = [];
  @Output() closed = new EventEmitter<void>();

  brandingData = signal<any>(null);
  resolvedStudent = signal<any>(null);
  resolvedAccount = signal<any>(null);
  logoFailed = signal(false);
  stampFailed = signal(false);
  todayDate = new Date().toLocaleDateString('ar-EG');

  ngOnInit(): void {
    this.logoFailed.set(false);
    this.stampFailed.set(false);
    this.resolveMissingData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['doc'] || changes['student'] || changes['billingAccount']) {
      this.resolveMissingData();
    }
  }

  private resolveMissingData(): void {
    const d = this.doc?.data;

    // 1. استرجاع وتحديث بيانات المدرسة والترويسة
    if (!this.schoolInfo && !this.brandingData()) {
      this.studentsService.getBranding().subscribe({
        next: (res) => {
          if (res) this.brandingData.set(res);
        },
        error: () => { }
      });
    }

    if (!d) return;

    // 2. استرجاع بيانات الطالب إذا لم تكن ممررة
    const studentId = d.student_id || d.student?.id;
    if (!this.student && studentId && (!this.resolvedStudent() || this.resolvedStudent()?.id !== studentId)) {
      this.studentsService.getStudentById(studentId).subscribe({
        next: (res) => {
          if (res && res.success && res.data) {
            this.resolvedStudent.set(res.data);
          }
        },
        error: () => { }
      });
    }

    // 3. استرجاع بيانات الحساب المالي إذا لم تكن ممررة
    const accountId = d.student_billing_account_id || (typeof d.student_billing_account === 'string' ? d.student_billing_account : d.student_billing_account?.id);
    if (!this.billingAccount && accountId && (!this.resolvedAccount() || this.resolvedAccount()?.id !== accountId)) {
      this.studentFinanceService.listBillingAccounts({ id: accountId }).subscribe({
        next: (res) => {
          const acc = res?.data?.[0];
          if (acc) this.resolvedAccount.set(acc);
        },
        error: () => { }
      });
    }
  }

  schoolData(): any {
    return this.schoolInfo || this.brandingData() || this.tenantService.currentTenant() || null;
  }

  getSchoolNameAr(): string {
    return this.schoolData()?.school_name_ar || this.schoolData()?.name_ar || this.schoolData()?.name || DEFAULT_BRAND.name_ar;
  }

  getSchoolNameEn(): string {
    return this.schoolData()?.school_name_en || this.schoolData()?.name_en || DEFAULT_BRAND.name_en;
  }

  getSchoolAddress(): string {
    return this.schoolData()?.address || DEFAULT_BRAND.address;
  }

  getLogoUrl(): string {
    if (this.logoFailed()) return '';
    const info = this.schoolData();
    let url = this.tenantService.currentTenant()?.logoUrl
      || info?.logo_url
      || info?.logo
      || '';
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    const backendBase = environment.apiUrl.replace(/\/api\/v1\/?$/, '');
    return url.startsWith('/') ? `${backendBase}${url}` : `${backendBase}/${url}`;
  }

  getStampUrl(): string {
    if (this.stampFailed()) return '';
    const info = this.schoolData();
    // سند القبض المالي والفواتير تتبع حصراً للإدارة المالية والخزينة
    let url = this.tenantService.currentTenant()?.stampFinanceUrl
      || info?.stamp_finance_url
      || info?.stamp_finance
      || '';
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    const backendBase = environment.apiUrl.replace(/\/api\/v1\/?$/, '');
    return url.startsWith('/') ? `${backendBase}${url}` : `${backendBase}/${url}`;
  }

  onLogoError(): void {
    this.logoFailed.set(true);
  }

  onStampError(): void {
    this.stampFailed.set(true);
  }

  getStudentObj(): any {
    return this.student || this.resolvedStudent() || null;
  }

  getBillingAccountObj(): any {
    return this.billingAccount || this.resolvedAccount() || (typeof this.doc?.data?.student_billing_account === 'object' ? this.doc?.data?.student_billing_account : null);
  }

  getStudentName(): string {
    const s = this.getStudentObj();
    return this.doc?.data?.student_name
      || this.studentName
      || s?.profile?.arabic_name
      || s?.arabic_name
      || s?.profile?.english_name
      || s?.english_name
      || '—';
  }

  getStudentNumber(): string {
    const s = this.getStudentObj();
    return this.doc?.data?.student_number
      || s?.student_number
      || '—';
  }

  getGradeName(): string {
    const s = this.getStudentObj();
    return this.doc?.data?.grade_name
      || s?.grade_name
      || s?.enrollments?.[0]?.grade_level
      || '—';
  }

  getSectionName(): string {
    const s = this.getStudentObj();
    return this.doc?.data?.section_name
      || s?.section_name
      || s?.enrollments?.[0]?.section_name
      || '—';
  }

  getGuardianName(): string {
    const s = this.getStudentObj();
    return this.doc?.data?.guardian_name
      || s?.guardian_name
      || s?.family_relations?.[0]?.full_name
      || '—';
  }

  getGuardianPhone(): string {
    const s = this.getStudentObj();
    return this.doc?.data?.guardian_phone
      || s?.guardian_phone
      || s?.family_relations?.[0]?.phone
      || '—';
  }

  getAccountNumber(): string {
    if (this.doc?.data?.account_number) return this.doc.data.account_number;
    const acc = this.getBillingAccountObj();
    if (acc?.account_number) return acc.account_number;
    const stdNum = this.getStudentNumber();
    return stdNum && stdNum !== '—' ? `ACC-${stdNum}` : '—';
  }

  getRemainingBalance(): number {
    const d = this.doc?.data;
    if (d?.remaining_balance !== undefined && d?.remaining_balance !== null) {
      return Number(d.remaining_balance) || 0;
    }
    if (d?.outstanding_balance !== undefined && d?.outstanding_balance !== null) {
      return Number(d.outstanding_balance) || 0;
    }
    const acc = this.getBillingAccountObj();
    if (acc?.outstanding_balance !== undefined && acc?.outstanding_balance !== null) {
      return Number(acc.outstanding_balance) || 0;
    }
    return 0;
  }

  getRemainingTafqeetText(): string {
    const rem = this.getRemainingBalance();
    return tafqeetArabic(rem, 'جنيه');
  }

  getPaymentMethodText(): string {
    const d = this.doc?.data;
    if (d?.payment_method_name) return d.payment_method_name;
    if (d?.payment_method?.name_ar) return d.payment_method.name_ar;
    if (d?.payment_method_id) {
      const found = this.methods.find((m) => m.id === d.payment_method_id);
      if (found) return found.name_ar || found.name;
    }
    return 'نقداً / كاش';
  }

  methodName(id: string): string {
    return this.methods.find((m) => m.id === id)?.name_ar || 'نقداً / كاش';
  }

  getInvoiceGross(): number {
    const d = this.doc?.data;
    if (!d) return 0;
    const itemsSum = (d.items || []).reduce((s: number, it: any) => s + (Number(it.amount) || 0), 0);
    if (itemsSum > 0) return itemsSum;
    return (Number(d.total_amount) || 0) + this.getInvoiceDiscount();
  }

  getInvoiceDiscount(): number {
    const d = this.doc?.data;
    if (!d?.discounts || !Array.isArray(d.discounts)) return 0;
    return d.discounts.reduce((s: number, dc: any) => s + (Number(dc.amount) || 0), 0);
  }

  getInvoiceOutstanding(): number {
    const d = this.doc?.data;
    if (!d) return 0;
    if (d.outstanding_amount !== undefined && d.outstanding_amount !== null) {
      return Number(d.outstanding_amount) || 0;
    }
    const total = Number(d.total_amount) || 0;
    const paid = Number(d.paid_amount) || 0;
    return Math.max(0, total - paid);
  }

  getPaidAmount(): number {
    return Number(this.doc?.data?.paid_amount) || 0;
  }

  getInvoiceTafqeetText(): string {
    const total = Number(this.doc?.data?.total_amount) || 0;
    return tafqeetArabic(total, 'جنيه');
  }

  getInvoiceOutstandingTafqeetText(): string {
    const rem = this.getInvoiceOutstanding();
    return tafqeetArabic(rem, 'جنيه');
  }

  getAccountantName(): string {
    const d = this.doc?.data;
    if (!d) return '';
    const name = d.accountant_name || d.created_by_name || d.collector_name || d.collector;
    if (name && typeof name === 'string' && name.trim() && name.trim() !== '—') {
      return name.trim();
    }
    // إذا كان المستند في طور الإنشاء الجديد فقط ولم يحفظ بعد، نأخذ المستخدم الحالي
    if (d.is_new_creation) {
      const current = this.authService?.currentUser();
      if (current) {
        const full = `${current.first_name || ''} ${current.last_name || ''}`.trim();
        if (full) return full;
        if (current.username) return current.username;
      }
    }
    // السجلات القديمة تترك فارغة
    return '';
  }

  meta(): { title: string; subtitle: string } {
    const d = this.doc;
    if (!d) return { title: '', subtitle: '' };
    if (d.type === 'invoice') return { title: `فاتورة رسوم دراسية ${d.data?.invoice_number || ''}`, subtitle: this.getStudentName() };
    if (d.type === 'receipt') return { title: `سند قبض مالي ${d.data?.receipt_number || ''}`, subtitle: this.getStudentName() };
    return { title: 'مستحق مالي', subtitle: this.getStudentName() };
  }

  getTafqeetText(): string {
    const amount = Number(this.doc?.type === 'receipt' ? this.doc?.data?.amount : this.doc?.data?.total_amount) || 0;
    return tafqeetArabic(amount, 'جنيه');
  }

  currentDateTime(): string {
    const now = new Date();
    return `${now.toLocaleDateString('ar-EG')} - ${now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
  }

  printDocument(): void {
    const rootEl = this.elRef.nativeElement as HTMLElement;
    const printContent = rootEl.querySelector('#official-print-voucher') || document.getElementById('official-print-voucher');
    if (!printContent) {
      window.print();
      return;
    }

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.top = '-10000px';
    printFrame.style.left = '-10000px';
    printFrame.style.width = '1000px';
    printFrame.style.height = '1000px';
    printFrame.style.border = '0';
    printFrame.style.opacity = '0';
    printFrame.style.pointerEvents = 'none';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document;
    if (!frameDoc) {
      window.print();
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <base href="${window.location.origin}/">
        <title>${this.meta().title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            background: #ffffff !important;
            color: #0f172a;
            font-family: 'Cairo', 'IBM Plex Sans Arabic', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
            direction: rtl;
            font-size: 12px;
            line-height: 1.4;
            width: 100%;
          }
          .official-voucher-card {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
            border: 1.5px solid #cbd5e1 !important;
            border-radius: 12px !important;
            padding: 20px 24px !important;
            background: #ffffff !important;
            box-shadow: none !important;
            position: relative !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .voucher-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            gap: 16px !important;
            margin-bottom: 4px !important;
          }
          .school-brand-meta .school-name-ar {
            font-size: 20px !important;
            font-weight: 800 !important;
            color: #0284c7 !important;
            margin: 0 0 2px !important;
            line-height: 1.2 !important;
          }
          .school-brand-meta .school-name-en {
            font-size: 12px !important;
            font-weight: 600 !important;
            color: #64748b !important;
            margin: 0 0 4px !important;
            letter-spacing: 0.5px !important;
          }
          .school-brand-meta .accreditation-line {
            font-size: 11px !important;
            color: #475569 !important;
            margin: 0 0 2px !important;
          }
          .school-brand-meta .school-contact-line {
            font-size: 11px !important;
            color: #64748b !important;
            margin: 0 !important;
          }
          .school-logo-wrapper {
            max-width: 140px !important;
            max-height: 80px !important;
            min-width: 60px !important;
            min-height: 60px !important;
            border-radius: 8px !important;
            border: 1px solid #cbd5e1 !important;
            padding: 4px !important;
            background: #ffffff !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            overflow: hidden !important;
            flex-shrink: 0 !important;
          }
          .school-logo-img {
            max-width: 130px !important;
            max-height: 72px !important;
            width: auto !important;
            height: auto !important;
            object-fit: contain !important;
          }
          .school-logo-placeholder {
            font-size: 32px !important;
          }
          .luxury-divider {
            position: relative !important;
            height: 2px !important;
            background: linear-gradient(90deg, transparent, #0284c7, transparent) !important;
            margin: 14px 0 !important;
            text-align: center !important;
          }
          .divider-diamond {
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            background: #ffffff !important;
            padding: 0 8px !important;
            color: #0284c7 !important;
            font-size: 13px !important;
            font-weight: bold !important;
          }
          .doc-banner {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            background: #f8fafc !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            padding: 10px 16px !important;
            margin-bottom: 14px !important;
          }
          .doc-title-box {
            display: flex !important;
            flex-direction: column !important;
          }
          .doc-main-title {
            font-size: 18px !important;
            font-weight: 800 !important;
            color: #0f172a !important;
            margin: 0 !important;
            line-height: 1.2 !important;
          }
          .doc-sub-title {
            font-size: 9.5px !important;
            color: #64748b !important;
            font-weight: 700 !important;
            letter-spacing: 0.5px !important;
          }
          .doc-meta-row {
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
          }
          .meta-item-box {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
            background: #ffffff !important;
            padding: 5px 12px !important;
            border-radius: 6px !important;
            border: 1px solid #cbd5e1 !important;
          }
          .meta-item-box .lbl {
            font-size: 11px !important;
            color: #64748b !important;
            font-weight: 600 !important;
          }
          .meta-item-box .val {
            font-size: 12px !important;
            font-weight: 800 !important;
            color: #0f172a !important;
          }
          .student-info-section {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px 16px !important;
            background: #ffffff !important;
            border: 1px dashed #cbd5e1 !important;
            border-radius: 8px !important;
            padding: 12px 16px !important;
            margin-bottom: 14px !important;
          }
          .info-cell {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            font-size: 12px !important;
          }
          .info-cell .c-label {
            color: #64748b !important;
            width: 140px !important;
            flex-shrink: 0 !important;
            font-weight: 600 !important;
          }
          .info-cell .c-val {
            color: #1e293b !important;
            font-weight: 600 !important;
          }
          .info-cell .c-val.strong {
            font-weight: 800 !important;
            color: #0284c7 !important;
          }
          .info-cell.balance-cell {
            background: #fef2f2 !important;
            padding: 5px 10px !important;
            border-radius: 6px !important;
            border: 1px dashed #fca5a5 !important;
            grid-column: 2 !important;
          }
          .remaining-val {
            font-size: 12.5px !important;
            font-weight: 800 !important;
          }
          .remaining-val.danger {
            color: #dc2626 !important;
          }
          .remaining-val.success {
            color: #059669 !important;
          }
          .breakdown-section {
            margin-bottom: 12px !important;
          }
          .section-heading {
            font-size: 13px !important;
            font-weight: 700 !important;
            color: #1e293b !important;
            margin: 0 0 8px !important;
          }
          .voucher-table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 12px !important;
          }
          .voucher-table th {
            background: #f1f5f9 !important;
            color: #475569 !important;
            font-weight: 700 !important;
            padding: 8px 12px !important;
            border: 1px solid #cbd5e1 !important;
            text-align: start !important;
          }
          .voucher-table td {
            padding: 8px 12px !important;
            border: 1px solid #cbd5e1 !important;
            color: #1e293b !important;
          }
          .voucher-table .discount-row td {
            color: #dc2626 !important;
            background: rgba(220, 38, 38, 0.03) !important;
          }
          .voucher-table tfoot .total-row td {
            background: #f8fafc !important;
            border-top: 2px solid #cbd5e1 !important;
            font-weight: 800 !important;
          }
          .total-label {
            font-size: 13px !important;
            color: #0f172a !important;
          }
          .total-amount {
            font-size: 14.5px !important;
            color: #059669 !important;
            font-weight: 800 !important;
          }
          .voucher-table tfoot .subtotal-row td {
            background: #f8fafc !important;
            font-weight: 600 !important;
          }
          .voucher-table tfoot .discount-total-row td {
            background: #fff5f5 !important;
            font-weight: 600 !important;
          }
          .voucher-table tfoot .paid-row td {
            background: #f0fdf4 !important;
            font-weight: 600 !important;
          }
          .voucher-table tfoot .remaining-row td {
            background: #fef2f2 !important;
            border-top: 1px dashed #fca5a5 !important;
            border-bottom: 2px solid #ef4444 !important;
            font-weight: 800 !important;
          }
          .remaining-label {
            font-size: 13px !important;
            color: #991b1b !important;
          }
          .remaining-title {
            font-weight: 800 !important;
          }
          .remaining-amount {
            font-size: 15px !important;
            font-weight: 800 !important;
          }
          .remaining-amount.has-due {
            color: #dc2626 !important;
          }
          .remaining-amount.cleared {
            color: #059669 !important;
          }
          .tafqeet-container {
            display: flex !important;
            flex-direction: column !important;
            gap: 7px !important;
            margin-bottom: 12px !important;
          }
          .tafqeet-box {
            background: #f0f9ff !important;
            border: 1px solid #bae6fd !important;
            border-radius: 6px !important;
            padding: 7px 12px !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            font-size: 12px !important;
          }
          .tafqeet-title {
            font-weight: 700 !important;
            color: #0284c7 !important;
            flex-shrink: 0 !important;
          }
          .tafqeet-text {
            font-weight: 700 !important;
            color: #0f172a !important;
          }
          .remaining-tafqeet-box {
            background: #fef2f2 !important;
            border: 1px solid #fca5a5 !important;
          }
          .remaining-tafqeet-title {
            color: #dc2626 !important;
            font-weight: 800 !important;
            flex-shrink: 0 !important;
          }
          .remaining-tafqeet-text {
            color: #991b1b !important;
            font-weight: 700 !important;
          }
          .terms-box {
            font-size: 10.5px !important;
            color: #64748b !important;
            margin-bottom: 14px !important;
            line-height: 1.5 !important;
          }
          .terms-box p {
            margin: 0 !important;
          }
          .signatures-section {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 16px !important;
            padding-top: 12px !important;
            border-top: 1px solid #cbd5e1 !important;
            margin-bottom: 12px !important;
          }
          .sig-box {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
          }
          .sig-title {
            font-size: 11px !important;
            font-weight: 700 !important;
            color: #475569 !important;
            margin-bottom: 8px !important;
          }
          .sig-signer-name {
            font-size: 11px !important;
            font-weight: 800 !important;
            color: #0f172a !important;
            margin-bottom: 10px !important;
            background: #f1f5f9 !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
            border: 1px solid #e2e8f0 !important;
          }
          .sig-space {
            width: 100% !important;
            border-bottom: 1px dashed #cbd5e1 !important;
            margin-bottom: 4px !important;
          }
          .sig-hint {
            font-size: 9.5px !important;
            color: #94a3b8 !important;
          }
          .stamp-container {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            min-height: 65px !important;
          }
          .official-school-stamp-img {
            max-height: 85px !important;
            max-width: 140px !important;
            width: auto !important;
            height: auto !important;
            object-fit: contain !important;
            transform: rotate(-3deg) !important;
          }
          .stamp-badge, .stamp-circle {
            min-width: 85px !important;
            max-width: 130px !important;
            height: 56px !important;
            padding: 4px 8px !important;
            border: 1.5px dashed #0284c7 !important;
            border-radius: 8px !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 8px !important;
            color: #0284c7 !important;
            font-weight: 700 !important;
            transform: rotate(-3deg) !important;
            text-align: center !important;
            line-height: 1.2 !important;
            padding: 2px 4px !important;
          }
          .voucher-footer-meta {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            font-size: 9.5px !important;
            color: #94a3b8 !important;
            border-top: 1px solid #f1f5f9 !important;
            padding-top: 8px !important;
            margin-top: 8px !important;
          }
          .mono { font-family: monospace, sans-serif; }
          .text-center { text-align: center; }
          .text-end { text-align: end; }
          .font-bold { font-weight: 700; }
          .text-danger { color: #dc2626 !important; }
          .text-success { color: #059669 !important; }
        </style>
      </head>
      <body>
        ${printContent.outerHTML}
      </body>
      </html>
    `;


    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    let printed = false;
    const cleanup = () => {
      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      }, 60000);
    };

    const doPrint = () => {
      if (printed) return;
      printed = true;
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch (e) {
        console.error('Error during printing', e);
      }
      cleanup();
    };

    printFrame.contentWindow?.addEventListener('afterprint', () => {
      if (document.body.contains(printFrame)) {
        document.body.removeChild(printFrame);
      }
    });

    const images = Array.from(frameDoc.images);
    const imagePromises = images.map((img) => {
      if (img.complete) return Promise.resolve(true);
      return new Promise((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
      });
    });

    const fontsPromise = (frameDoc as any).fonts?.ready || Promise.resolve();

    Promise.race([
      Promise.all([...imagePromises, fontsPromise]),
      new Promise((resolve) => setTimeout(resolve, 800))
    ]).then(() => {
      setTimeout(doPrint, 150);
    });
  }

  async exportVoucherPdf(): Promise<void> {
    const rootEl = this.elRef.nativeElement as HTMLElement;
    const el = (rootEl.querySelector('#official-print-voucher') as HTMLElement) || document.getElementById('official-print-voucher');
    if (!el) {
      this.printDocument();
      return;
    }
    try {
      await exportElementToPdf(el, this.meta().title || 'سند-قبض-مالي');
    } catch (err) {
      console.warn('exportElementToPdf fallback to print dialog', err);
      this.printDocument();
    }
  }

  exportCols(): ExportColumn[] {
    if (this.doc?.type === 'invoice') {
      return [
        { key: 'description', label: 'البيان / تفاصيل البند' },
        { key: 'amount', label: 'المبلغ (ج.س)', align: 'end' }
      ];
    }
    return [
      { key: 'field', label: 'البيان المالي / التفاصيل' },
      { key: 'value', label: 'القيمة / البيان', align: 'end' }
    ];
  }

  exportRows(): any[] {
    const d = this.doc;
    if (!d) return [];
    if (d.type === 'invoice') {
      const rows: any[] = [
        { description: 'رقم الفاتورة: ' + (d.data?.invoice_number || '—'), amount: '' },
        { description: 'تاريخ الإصدار: ' + (d.data?.issue_date || '—'), amount: '' },
        { description: 'اسم الطالب: ' + this.getStudentName(), amount: '' },
        { description: 'الرقم الأكاديمي: ' + this.getStudentNumber(), amount: '' },
        { description: 'المرحلة والصف: ' + this.getGradeName(), amount: '' },
        { description: '--- بنود الفاتورة ---', amount: '' }
      ];
      (d.data.items || []).forEach((i: any, idx: number) => {
        rows.push({ description: `${idx + 1}. ${i.description || 'بند رسوم دراسية'}`, amount: Number(i.amount).toFixed(2) });
      });
      (d.data.discounts || []).forEach((dc: any) => {
        rows.push({ description: `خصم: ${dc.discount_reason || 'منحة / تخفيض'}`, amount: '-' + Number(dc.amount).toFixed(2) });
      });
      rows.push({ description: 'إجمالي الفاتورة المستحق', amount: Number(d.data?.total_amount || 0).toFixed(2) });
      return rows;
    }
    const method = d.data?.payment_method_name || this.methodName(d.data?.payment_method_id);
    return [
      { field: 'نوع المستند', value: 'سند قبض مالي رسمي' },
      { field: 'رقم السند', value: d.data?.receipt_number || '—' },
      { field: 'تاريخ السداد', value: d.data?.payment_date || this.todayDate },
      { field: 'اسم الطالب/ـة', value: this.getStudentName() },
      { field: 'الرقم الأكاديمي', value: this.getStudentNumber() },
      { field: 'المرحلة والصف', value: this.getGradeName() },
      { field: 'الشعبة / الفصل', value: this.getSectionName() },
      { field: 'ولي الأمر', value: this.getGuardianName() },
      { field: 'هاتف ولي الأمر', value: this.getGuardianPhone() },
      { field: 'رقم حساب الطالب', value: this.getAccountNumber() },
      { field: 'طريقة السداد', value: method },
      { field: 'المبلغ المقبوض (ج.س)', value: Number(d.data?.amount || 0).toFixed(2) },
      { field: 'المبلغ كتابةً (التفقيط)', value: this.getTafqeetText() },
      { field: 'المتبقي من الرسوم (ج.س)', value: Number(this.getRemainingBalance()).toFixed(2) },
      { field: 'المتبقي كتابةً', value: this.getRemainingTafqeetText() },
      { field: 'حالة السند', value: d.data?.status === 'posted' ? 'معتمد ومرحل للحسابات العامة' : 'مسودة' }
    ];
  }
}
