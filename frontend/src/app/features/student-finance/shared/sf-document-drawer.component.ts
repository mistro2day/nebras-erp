import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { NbDrawerComponent } from '../../../shared/nebras/nb-drawer.component';
import { NbExportMenuComponent, ExportColumn } from '../../../shared/export';
import { StudentsService } from '../../students/students.service';

export type SfDoc = { type: 'invoice' | 'receipt' | 'receivable'; data: any } | null;

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
              <p class="accreditation-line">وزارة التربية والتعليم — قطاع التعليم الأهلي والأجنبي</p>
              @if (schoolData()?.address) {
                <p class="school-contact-line">📍 {{ schoolData()?.address }}</p>
              }
            </div>
            <div class="school-logo-wrapper">
              @if (getLogoUrl()) {
                <img [src]="getLogoUrl()" alt="شعار المدرسة" class="school-logo-img" />
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
                {{ d.type === 'receipt' ? 'سند قـبـض مـالـي' : (d.type === 'invoice' ? 'فاتورة رسوم دراسية' : 'إشعار مطالبة مالية') }}
              </h1>
              <span class="doc-sub-title">
                {{ d.type === 'receipt' ? 'OFFICIAL PAYMENT RECEIPT' : (d.type === 'invoice' ? 'TUITION FEES INVOICE' : 'PAYMENT NOTICE') }}
              </span>
            </div>
            <div class="doc-meta-row">
              <div class="meta-item-box">
                <span class="lbl">رقم المستند:</span>
                <span class="val mono">{{ d.data?.receipt_number || d.data?.invoice_number || '—' }}</span>
              </div>
              <div class="meta-item-box">
                <span class="lbl">التاريخ:</span>
                <span class="val">{{ d.data?.payment_date || d.data?.issue_date || todayDate }}</span>
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
            <div class="info-cell">
              <span class="c-label">طريقة السداد:</span>
              <span class="c-val">{{ d.type === 'receipt' ? methodName(d.data?.payment_method_id) : 'حساب بنكي / نقدي' }}</span>
            </div>
          </div>

          <!-- 4. جدول بنود الرسوم والمبالغ -->
          <div class="breakdown-section">
            <h3 class="section-heading">تفاصيل البنود والمبالغ المالية</h3>
            <table class="voucher-table">
              <thead>
                <tr>
                  <th style="width: 45px;">#</th>
                  <th>بيان الرسوم / تفاصيل القسط</th>
                  <th class="text-end" style="width: 140px;">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                @if (d.type === 'invoice' && d.data.items?.length) {
                  @for (it of d.data.items; track it.id; let idx = $index) {
                    <tr>
                      <td class="text-center">{{ idx + 1 }}</td>
                      <td class="item-desc">{{ it.description || 'بند رسوم دراسية' }}</td>
                      <td class="text-end mono">{{ it.amount | number:'1.2-2' }}</td>
                    </tr>
                  }
                  @if (d.data.discounts?.length) {
                    @for (dc of d.data.discounts; track dc.id) {
                      <tr class="discount-row">
                        <td class="text-center">★</td>
                        <td class="item-desc">خصم: {{ dc.discount_reason || 'منحة / تخفيض مالي' }}</td>
                        <td class="text-end mono">- {{ dc.amount | number:'1.2-2' }}</td>
                      </tr>
                    }
                  }
                } @else if (d.type === 'receipt') {
                  <tr>
                    <td class="text-center">1</td>
                    <td class="item-desc">
                      سداد رسوم دراسية وتسجيل للطالب — {{ d.data?.notes || 'دفعة سداد معتمدة بموجب إيصال قبض' }}
                    </td>
                    <td class="text-end mono font-bold">{{ d.data?.amount | number:'1.2-2' }}</td>
                  </tr>
                } @else {
                  <tr>
                    <td class="text-center">1</td>
                    <td class="item-desc">مستحقات رسوم دراسية مجدولة</td>
                    <td class="text-end mono">{{ d.data?.amount | number:'1.2-2' }}</td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td colspan="2" class="total-label">
                    {{ d.type === 'receipt' ? 'إجمالي المبلغ المقبوض والمحصّل:' : 'إجمالي المبلغ المستحق:' }}
                  </td>
                  <td class="total-amount mono text-end">
                    {{ (d.type === 'receipt' ? d.data?.amount : d.data?.total_amount) | number:'1.2-2' }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- 5. التفقيط المالي (المبلغ كتابة باللغة العربية) -->
          <div class="tafqeet-box">
            <span class="tafqeet-title">المبلغ كتابةً:</span>
            <span class="tafqeet-text">{{ getTafqeetText() }}</span>
          </div>

          <!-- 6. الملاحظات والسياسة المالية -->
          <div class="terms-box">
            <p><strong>ملاحظات هامة:</strong> الرسوم المدفوعة تخضع للائحة والسياسة المالية للمدرسة. يرجى الاحتفاظ بهذا السند كإثبات رسمي لعملية السداد.</p>
          </div>

          <!-- 7. التذييل والتوقيعات الرسمية والختم المعتمد -->
          <div class="signatures-section">
            <div class="sig-box">
              <span class="sig-title">أمين الصندوق / المحاسب</span>
              <div class="sig-space"></div>
              <span class="sig-hint">التوقيع والاعتماد</span>
            </div>
            <div class="sig-box">
              <span class="sig-title">توقيع ولي الأمر / المسدد</span>
              <div class="sig-space"></div>
              <span class="sig-hint">الاسم والتوقيع</span>
            </div>
            <div class="sig-box stamp-box">
              <span class="sig-title">ختم الإدارة المالية للمدرسة</span>
              <div class="stamp-container">
                @if (getStampUrl()) {
                  <img [src]="getStampUrl()" alt="الختم الرسمي للمدرسة" class="official-school-stamp-img" />
                } @else {
                  <div class="stamp-circle">
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

      <div drawer-actions>
        <nb-export-menu [columns]="exportCols()" [rows]="exportRows()" [title]="meta().title" [subtitle]="meta().subtitle" [filename]="meta().title"></nb-export-menu>
      </div>
    </nb-drawer>
  `,
  styles: [`
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
      width: 74px;
      height: 74px;
      border-radius: 50%;
      border: 2px solid #0284c7;
      padding: 3px;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }
    .school-logo-img {
      max-width: 100%;
      max-height: 100%;
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

    /* التفقيط */
    .tafqeet-box {
      background: rgba(2, 132, 199, 0.06);
      border: 1px solid rgba(2, 132, 199, 0.2);
      border-radius: 6px;
      padding: 8px 14px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }
    .tafqeet-title { font-weight: 700; color: #0284c7; flex-shrink: 0; }
    .tafqeet-text { font-weight: 700; color: #0f172a; }

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
    .sig-title { font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 24px; }
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
      transform: rotate(-6deg);
    }
    .stamp-circle {
      width: 70px;
      height: 70px;
      border: 1.5px dashed #0284c7;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      color: #0284c7;
      font-weight: 700;
      transform: rotate(-6deg);
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
  `],
})
export class SfDocumentDrawerComponent implements OnInit {
  private studentsService = inject(StudentsService);

  @Input() doc: SfDoc = null;
  @Input() studentName = '';
  @Input() student: any = null;
  @Input() schoolInfo: any = null;
  @Input() methods: any[] = [];
  @Output() closed = new EventEmitter<void>();

  brandingData = signal<any>(null);
  todayDate = new Date().toLocaleDateString('ar-EG');

  ngOnInit(): void {
    if (!this.schoolInfo) {
      this.studentsService.getBranding().subscribe({
        next: (res) => {
          if (res) this.brandingData.set(res);
        }
      });
    }
  }

  schoolData(): any {
    return this.schoolInfo || this.brandingData() || null;
  }

  getSchoolNameAr(): string {
    return this.schoolData()?.school_name_ar || this.schoolData()?.name_ar || this.schoolData()?.name || 'مدارس المورد الأهلية النموذجية';
  }

  getSchoolNameEn(): string {
    return this.schoolData()?.school_name_en || this.schoolData()?.name_en || 'Al-Mawrid Model Private Schools';
  }

  getLogoUrl(): string {
    return this.schoolData()?.logo_url || this.schoolData()?.logo || '';
  }

  getStampUrl(): string {
    return this.schoolData()?.stamp_url || this.schoolData()?.stamp || '';
  }

  methodName(id: string): string {
    return this.methods.find((m) => m.id === id)?.name_ar || 'نقداً — الخزينة الرئيسية';
  }

  meta(): { title: string; subtitle: string } {
    const d = this.doc;
    if (!d) return { title: '', subtitle: '' };
    if (d.type === 'invoice') return { title: `فاتورة رسوم دراسية ${d.data?.invoice_number || ''}`, subtitle: this.getStudentName() };
    if (d.type === 'receipt') return { title: `سند قبض مالي ${d.data?.receipt_number || ''}`, subtitle: this.getStudentName() };
    return { title: 'مستحق مالي', subtitle: this.getStudentName() };
  }

  getStudentName(): string {
    return this.doc?.data?.student_name || this.studentName || this.student?.profile?.arabic_name || this.student?.profile?.english_name || '—';
  }

  getStudentNumber(): string {
    return this.doc?.data?.student_number || this.student?.student_number || '—';
  }

  getGradeName(): string {
    return this.doc?.data?.grade_name || this.student?.grade_name || this.student?.enrollments?.[0]?.grade_level || '—';
  }

  getSectionName(): string {
    return this.doc?.data?.section_name || this.student?.enrollments?.[0]?.section_name || '—';
  }

  getGuardianName(): string {
    return this.doc?.data?.guardian_name || this.student?.guardian_name || this.student?.family_relations?.[0]?.full_name || '—';
  }

  getGuardianPhone(): string {
    return this.doc?.data?.guardian_phone || this.student?.guardian_phone || this.student?.family_relations?.[0]?.phone || '—';
  }

  getAccountNumber(): string {
    if (this.doc?.data?.account_number) return this.doc.data.account_number;
    if (this.doc?.data?.student_billing_account?.account_number) return this.doc.data.student_billing_account.account_number;
    const stdNum = this.getStudentNumber();
    return stdNum && stdNum !== '—' ? `ACC-${stdNum}` : '—';
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
    const printContent = document.getElementById('official-print-voucher');
    if (!printContent) {
      window.print();
      return;
    }

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
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
        <title>${this.meta().title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
            direction: rtl;
            background: #ffffff;
            color: #0f172a;
            padding: 24px;
            font-size: 12px;
          }
          .official-voucher-card {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #0f172a;
            border-radius: 12px;
            padding: 24px;
            background: #ffffff;
          }
          .voucher-header { display: flex; justify-content: space-between; align-items: center; }
          .school-brand-meta .school-name-ar { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
          .school-brand-meta .school-name-en { font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 4px; }
          .school-brand-meta .accreditation-line { font-size: 11px; color: #334155; }
          .school-brand-meta .school-contact-line { font-size: 11px; color: #64748b; }
          .school-logo-wrapper { width: 75px; height: 75px; border-radius: 50%; border: 2px solid #0284c7; padding: 2px; display: flex; align-items: center; justify-content: center; }
          .school-logo-img { max-width: 100%; max-height: 100%; object-fit: contain; }
          .school-logo-placeholder { font-size: 32px; }
          .luxury-divider { position: relative; height: 2px; background: #0284c7; margin: 16px 0; text-align: center; }
          .divider-diamond { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #ffffff; padding: 0 8px; color: #0284c7; font-size: 12px; }
          .doc-banner { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 16px; margin-bottom: 16px; }
          .doc-main-title { font-size: 17px; font-weight: 800; color: #0f172a; margin: 0; }
          .doc-sub-title { font-size: 10px; color: #64748b; font-weight: 700; letter-spacing: 0.5px; }
          .doc-meta-row { display: flex; align-items: center; gap: 14px; }
          .meta-item-box { display: flex; align-items: center; gap: 6px; background: #ffffff; padding: 5px 12px; border-radius: 6px; border: 1px solid #cbd5e1; }
          .meta-item-box .lbl { font-size: 11px; color: #64748b; font-weight: 600; }
          .meta-item-box .val { font-size: 12px; font-weight: 800; color: #0f172a; }
          .student-info-section { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 16px; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; background: #ffffff; }
          .info-cell { display: flex; align-items: center; gap: 8px; font-size: 12px; }
          .info-cell .c-label { color: #64748b; width: 140px; font-weight: 600; flex-shrink: 0; }
          .info-cell .c-val { color: #0f172a; font-weight: 600; }
          .info-cell .c-val.strong { font-weight: 800; color: #0284c7; }
          .section-heading { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
          .breakdown-section { margin-bottom: 14px; }
          .voucher-table { width: 100%; border-collapse: collapse; font-size: 12px; }
          .voucher-table th { background: #f1f5f9; color: #334155; font-weight: 700; padding: 8px 12px; border: 1px solid #cbd5e1; text-align: start; }
          .voucher-table td { padding: 8px 12px; border: 1px solid #cbd5e1; color: #0f172a; }
          .voucher-table .discount-row td { color: #dc2626; }
          .voucher-table tfoot .total-row td { background: #f8fafc; border-top: 2px solid #0f172a; font-weight: 800; }
          .total-label { font-size: 13px; }
          .total-amount { font-size: 15px; color: #059669; font-weight: 800; }
          .tafqeet-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 8px 14px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; font-size: 12px; }
          .tafqeet-title { font-weight: 700; color: #0284c7; }
          .tafqeet-text { font-weight: 700; color: #0f172a; }
          .terms-box { font-size: 11px; color: #64748b; margin-bottom: 18px; line-height: 1.5; }
          .signatures-section { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding-top: 14px; border-top: 1px solid #cbd5e1; margin-bottom: 14px; }
          .sig-box { display: flex; flex-direction: column; align-items: center; text-align: center; }
          .sig-title { font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 30px; }
          .sig-space { width: 100%; border-bottom: 1px dashed #94a3b8; margin-bottom: 4px; }
          .sig-hint { font-size: 10px; color: #94a3b8; }
          .stamp-container { display: flex; align-items: center; justify-content: center; min-height: 70px; }
          .official-school-stamp-img { max-height: 80px; max-width: 110px; object-fit: contain; transform: rotate(-5deg); }
          .stamp-circle { width: 70px; height: 70px; border: 1.5px dashed #0284c7; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 8px; color: #0284c7; font-weight: 700; transform: rotate(-5deg); text-align: center; line-height: 1.2; padding: 4px; }
          .voucher-footer-meta { display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 12px; }
          .mono { font-family: monospace, sans-serif; }
          .text-center { text-align: center; }
          .text-end { text-align: end; }
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

    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      }, 1500);
    }, 300);
  }

  exportCols(): ExportColumn[] {
    if (this.doc?.type === 'invoice') return [{ key: 'description', label: 'البند' }, { key: 'amount', label: 'المبلغ', align: 'end' }];
    return [{ key: 'k', label: 'البيان' }, { key: 'v', label: 'القيمة', align: 'end' }];
  }

  exportRows(): any[] {
    const d = this.doc;
    if (!d) return [];
    if (d.type === 'invoice') {
      const rows = (d.data.items || []).map((i: any) => ({ description: i.description || 'بند رسوم', amount: Number(i.amount).toFixed(2) }));
      (d.data.discounts || []).forEach((dc: any) => rows.push({ description: dc.discount_reason, amount: '-' + Number(dc.amount).toFixed(2) }));
      rows.push({ description: 'الإجمالي', amount: Number(d.data.total_amount).toFixed(2) });
      return rows;
    }
    return [
      { k: 'رقم السند', v: d.data?.receipt_number },
      { k: 'تاريخ الدفع', v: d.data?.payment_date },
      { k: 'المبلغ', v: d.data?.amount },
      { k: 'المستلم', v: this.getStudentName() }
    ];
  }
}
