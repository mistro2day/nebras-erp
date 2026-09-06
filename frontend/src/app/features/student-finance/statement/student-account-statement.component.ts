import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { StudentFinanceService } from '../student-finance.service';
import { exportExcel, exportPdf } from '../../../shared/export';
import { ExportColumn, ExportMeta } from '../../../shared/export/export.types';

@Component({
  selector: 'app-student-account-statement',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="statement-page" dir="rtl">
      <!-- شريط الإجراءات والتحكم العلوي (يُخفى تلقائياً عند الطباعة) -->
      <header class="statement-toolbar no-print">
        <div class="toolbar-left">
          <button class="tb-btn secondary" (click)="goBack()">
            <span>←</span> العودة
          </button>
          <span class="toolbar-divider"></span>
          <span class="toolbar-title">كشف حساب الطالب المالي</span>
        </div>

        <div class="toolbar-actions">
          <button class="tb-btn primary" (click)="printStatement()">
            <span>🖨️</span> طباعة كشف الحساب
          </button>
          <button class="tb-btn export-pdf" (click)="onExportPdf()">
            <span>📄</span> تصدير PDF
          </button>
          <button class="tb-btn export-excel" (click)="onExportExcel()">
            <span>📊</span> تصدير Excel
          </button>
        </div>
      </header>

      <!-- محتوى كشف الحساب الرسمي المجهز للطباعة والمعاينة -->
      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <span>جارٍ إعداد واستخراج كشف الحساب المالي للطالب…</span>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <span class="error-icon">⚠️</span>
          <h3>تعذر استخراج كشف الحساب</h3>
          <p>{{ error() }}</p>
          <button class="tb-btn secondary" (click)="goBack()">العودة للقائمة</button>
        </div>
      } @else if (statement()) {
        <div class="printable-document" id="statement-print-area">
          <!-- 1. ترويسة وهوية المستأجر الرسمية -->
          <div class="doc-header">
            <div class="school-brand">
              <div class="school-logo-wrap">
                <img [src]="statement()?.tenant?.logo_url || '/assets/images/branding/nebras_official_blue.png'"
                     alt="شعار المدرسة"
                     class="school-logo"
                     (error)="onLogoError($event)" />
              </div>
              <div class="school-names">
                <h1 class="school-name-ar">{{ statement()?.tenant?.name_ar || statement()?.tenant?.name || 'مدارس المورد النموذجية الخاصة' }}</h1>
                <span class="school-name-en">{{ statement()?.tenant?.name_en || 'Al-Mawred Model Private Schools' }}</span>
                <span class="school-affiliation">{{ statement()?.tenant?.affiliation || 'المرحلة الابتدائية والمتوسطة والثانوية • ولاية الخرطوم' }}</span>
              </div>
            </div>

            <div class="doc-title-box">
              <div class="doc-badge">وثيقة محاسبية رسمية</div>
              <h2 class="doc-main-title">كشف حساب مالي تفصيلي</h2>
              <span class="doc-sub-title">Student Financial Account Statement</span>
              <span class="doc-academic-year">العام الدراسي: {{ statement()?.meta?.academic_year }}</span>
            </div>

            <div class="doc-metadata">
              <div class="meta-row">
                <span class="meta-lbl">رقم الكشف:</span>
                <strong class="meta-val mono">{{ statement()?.meta?.statement_number }}</strong>
              </div>
              <div class="meta-row">
                <span class="meta-lbl">تاريخ الإصدار:</span>
                <span class="meta-val">{{ statement()?.meta?.generated_at }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-lbl">العملة المعتمدة:</span>
                <strong class="meta-val">{{ statement()?.meta?.currency }} (جنيه سوداني)</strong>
              </div>
              <div class="meta-row">
                <span class="meta-lbl">العنوان:</span>
                <span class="meta-val-sm">{{ statement()?.tenant?.address }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-lbl">الهاتف:</span>
                <span class="meta-val-sm" dir="ltr">{{ statement()?.tenant?.phone }}</span>
              </div>
            </div>
          </div>

          <div class="divider-line"></div>

          <!-- 2. بطاقة معلومات الطالب والحساب المالي -->
          <div class="profile-card">
            <div class="profile-section">
              <span class="sec-badge">بيانات الطالب الأكاديمية</span>
              <div class="profile-grid">
                <div class="p-item">
                  <span class="p-lbl">اسم الطالب:</span>
                  <strong class="p-val highlight-student">{{ statement()?.student?.student_name }}</strong>
                </div>
                <div class="p-item">
                  <span class="p-lbl">الرقم المدرسي:</span>
                  <strong class="p-val mono">{{ statement()?.student?.student_number }}</strong>
                </div>
                <div class="p-item">
                  <span class="p-lbl">الصف الدراسي:</span>
                  <span class="p-val">{{ statement()?.student?.grade_name || 'الصف الأول الابتدائي' }} {{ statement()?.student?.section_name ? ('- شعبة ' + statement()?.student?.section_name) : '' }}</span>
                </div>
              </div>
            </div>

            <div class="profile-section">
              <span class="sec-badge">بيانات الحساب وولي الأمر</span>
              <div class="profile-grid">
                <div class="p-item">
                  <span class="p-lbl">رقم الحساب المالي:</span>
                  <strong class="p-val mono">{{ statement()?.account?.account_number }}</strong>
                </div>
                <div class="p-item">
                  <span class="p-lbl">ولي أمر الطالب:</span>
                  <span class="p-val">{{ statement()?.student?.guardian_name || 'أبوبكر تاج السر عثمان' }}</span>
                </div>
                <div class="p-item">
                  <span class="p-lbl">هاتف ولي الأمر:</span>
                  <span class="p-val mono" dir="ltr">{{ statement()?.student?.guardian_phone || '0912345678' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 3. ملخص الأرصدة الإجمالية (Financial KPIs) -->
          <div class="kpi-summary-bar">
            <div class="kpi-box">
              <span class="kb-lbl">إجمالي الرسوم الصادرة</span>
              <strong class="kb-val">{{ fmt(statement()?.summary?.total_invoiced) }} <small>ج.س</small></strong>
            </div>

            <div class="kpi-box discount">
              <span class="kb-lbl">إجمالي المنح والخصومات</span>
              <strong class="kb-val">{{ fmt(statement()?.summary?.total_discounted) }} <small>ج.س</small></strong>
            </div>

            <div class="kpi-box paid">
              <span class="kb-lbl">إجمالي المسدد (التحصيلات)</span>
              <strong class="kb-val success">{{ fmt(statement()?.summary?.total_paid) }} <small>ج.س</small></strong>
            </div>

            <div class="kpi-box outstanding">
              <span class="kb-lbl">صافي الرصيد المستحق (المديونية)</span>
              <strong class="kb-val danger">{{ fmt(statement()?.summary?.net_outstanding) }} <small>ج.س</small></strong>
            </div>
          </div>

          <!-- 4. جدول حركات كشف الحساب ودفتر الأستاذ (Ledger Transactions) -->
          <div class="doc-section">
            <div class="section-title-wrap">
              <h3 class="doc-section-title">سجل القيود والعمليات المالية التفصيلي (Running Balance)</h3>
              <span class="sec-note">الحركات مرتبة تصاعدياً وفق تاريخ استحقاقها وقيدها المحاسبي</span>
            </div>

            <table class="statement-table">
              <thead>
                <tr>
                  <th class="col-num">#</th>
                  <th class="col-date">التاريخ</th>
                  <th class="col-desc">البيان والوصف</th>
                  <th class="col-ref">رقم المرجع</th>
                  <th class="col-amt end">مدين (+)</th>
                  <th class="col-amt end">دائن (-)</th>
                  <th class="col-bal end">الرصيد التراكمي</th>
                  <th class="col-method">طريقة السداد / الملاحظات</th>
                </tr>
              </thead>
              <tbody>
                @for (t of statement()?.transactions; track $index) {
                  <tr [class.row-invoice]="t.type === 'invoice'" [class.row-receipt]="t.type === 'receipt'">
                    <td class="col-num">{{ $index + 1 }}</td>
                    <td class="col-date mono">{{ t.date }}</td>
                    <td class="col-desc">
                      <strong class="t-label">{{ t.type_label }}</strong>
                      <span class="t-sub">{{ t.description }}</span>
                    </td>
                    <td class="col-ref mono">{{ t.reference_number }}</td>
                    <td class="col-amt end mono debit-cell">
                      {{ t.debit > 0 ? (fmt(t.debit) + ' ج.س') : '-' }}
                    </td>
                    <td class="col-amt end mono credit-cell">
                      {{ t.credit > 0 ? (fmt(t.credit) + ' ج.س') : '-' }}
                    </td>
                    <td class="col-bal end mono bal-cell" [class.danger-bal]="t.running_balance > 0">
                      {{ fmt(t.running_balance) }} ج.س
                    </td>
                    <td class="col-method">
                      @if (t.payment_method) {
                        <span class="method-badge">{{ t.payment_method }}</span>
                      } @else {
                        <span class="text-muted">-</span>
                      }
                    </td>
                  </tr>
                }
                @if (!statement()?.transactions?.length) {
                  <tr>
                    <td colspan="8" class="empty-table">لا توجد عمليات مالية مقيدة في هذا الحساب حتى الآن.</td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr class="totals-row">
                  <th colspan="4" class="start">الإجمالي العام للحركات</th>
                  <th class="end mono">{{ fmt(statement()?.summary?.total_invoiced) }} ج.س</th>
                  <th class="end mono">{{ fmt(statement()?.summary?.total_paid + statement()?.summary?.total_discounted) }} ج.س</th>
                  <th class="end mono danger-bal">{{ fmt(statement()?.summary?.net_outstanding) }} ج.س</th>
                  <th></th>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- 5. جدول خطة الأقساط المجدولة واستحقاقاتها -->
          @if (statement()?.installments?.length) {
            <div class="doc-section page-break-inside-avoid">
              <div class="section-title-wrap">
                <h3 class="doc-section-title">جدول استحقاق الأقساط الدراسية</h3>
                <span class="sec-note">مواعيد السداد المجدولة للعام الدراسي</span>
              </div>

              <table class="statement-table installments-table">
                <thead>
                  <tr>
                    <th class="th-center">القسط / الخطة</th>
                    <th class="th-center">تاريخ الاستحقاق</th>
                    <th class="th-center">مبلغ القسط</th>
                    <th class="th-center">المسدد</th>
                    <th class="th-center">المتبقي المطلوب</th>
                    <th class="th-center">حالة السداد</th>
                  </tr>
                </thead>
                <tbody>
                  @for (ins of statement()?.installments; track ins.id) {
                    <tr>
                      <td class="col-inst-name">
                        <strong>{{ ins.plan_name || 'قسط دراسي' }}</strong>
                      </td>
                      <td class="mono cell-center">{{ ins.due_date }}</td>
                      <td class="end mono">{{ fmt(ins.amount) }} ج.س</td>
                      <td class="end mono success">{{ fmt(ins.paid_amount) }} ج.س</td>
                      <td class="end mono danger">{{ fmt(ins.remaining_amount) }} ج.س</td>
                      <td class="cell-center">
                        <span class="status-tag" [attr.data-status]="ins.status">
                          {{ ins.status_label }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
                <tfoot>
                  <tr class="totals-row">
                    <th colspan="2" class="start">إجمالي خطة الأقساط المعتمدة للطالب</th>
                    <th class="end mono">{{ fmt(statement()?.summary?.installments_total || statement()?.summary?.total_invoiced) }} ج.س</th>
                    <th class="end mono success">{{ fmt(statement()?.summary?.installments_paid || 0) }} ج.س</th>
                    <th class="end mono danger-bal">{{ fmt(statement()?.summary?.installments_remaining || statement()?.summary?.net_outstanding) }} ج.س</th>
                    <th></th>
                  </tr>
                </tfoot>
              </table>
            </div>
          }

          <!-- 6. إقرار التوثيق والتوقيعات والختم الرسمي -->
          <div class="doc-footer page-break-inside-avoid">
            <p class="legal-notice">
              • يعتبر هذا الكشف وثيقة مالية رسمية صادرة ومعتمدة لدى إدارة الحسابات في {{ statement()?.tenant?.name_ar || statement()?.tenant?.name || 'المؤسسة التعليمية' }}.<br>
              • لأي استفسار أو تسوية مالية، يرجى مراجعة الإدارة المالية مصطحبين إشعار التحويل البنكي أو سند القبض الأصلي.
            </p>

            <div class="signatures-grid">
              <div class="sig-block">
                <span class="sig-title">إعداد المحاسب المالي</span>
                <span class="sig-dots">...................................</span>
                <span class="sig-date">التاريخ: {{ statement()?.meta?.generated_at?.split(' ')?.[0] }}</span>
              </div>

              <div class="sig-block stamp-block">
                <span class="sig-title">ختم المؤسسة التعليمية الرسمي</span>
                <div class="stamp-box">
                  @if (statement()?.tenant?.stamp_url) {
                    <img [src]="statement()?.tenant?.stamp_url" alt="الختم الرسمي" class="stamp-img" />
                  } @else {
                    <div class="stamp-placeholder">
                      <span>الختم المعتمد</span>
                      <small>{{ statement()?.tenant?.name_ar || 'المؤسسة التعليمية' }}</small>
                    </div>
                  }
                </div>
              </div>

              <div class="sig-block">
                <span class="sig-title">اعتماد الإدارة المالية / المدير العام</span>
                <span class="sig-dots">...................................</span>
                <span class="sig-date">التوقيع والاعتماد</span>
              </div>
            </div>

            <!-- 7. تذييل المنصة الصغير (تذييل تقني رسمي في أسفل الصفحة) -->
            <div class="platform-system-footer">
              <div class="sys-footer-right">
                <span class="sys-brand">منظومة نبراس لإدارة المؤسسات التعليمية — السودان</span>
              </div>
              <div class="sys-footer-center">
                <span>رقم المرجع المحاسبي: <strong class="mono">{{ statement()?.meta?.statement_number }}</strong></span>
              </div>
              <div class="sys-footer-left">
                <span>تاريخ التوليد: {{ statement()?.meta?.generated_at }}</span>
                <span class="sep">•</span>
                <span>صفحة 1 من 1</span>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .statement-page {
      background: #f1f5f9;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      font-family: var(--nb-font-family, 'IBM Plex Sans Arabic', sans-serif);
      color: #1e293b;
    }

    /* شريط الأدوات العلوي */
    .statement-toolbar {
      background: #ffffff;
      border-bottom: 1px solid #cbd5e1;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 4px rgba(0,0,0,0.04);
    }
    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .toolbar-divider {
      width: 1px;
      height: 20px;
      background: #cbd5e1;
    }
    .toolbar-title {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    .toolbar-actions {
      display: flex;
      gap: 10px;
    }

    .tb-btn {
      font-family: inherit;
      font-size: 13.5px;
      font-weight: 700;
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid transparent;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .tb-btn.primary { background: #2563eb; color: #fff; }
    .tb-btn.primary:hover { background: #1d4ed8; }
    .tb-btn.secondary { background: #f8fafc; border-color: #cbd5e1; color: #334155; }
    .tb-btn.secondary:hover { background: #e2e8f0; }
    .tb-btn.export-pdf { background: #dc2626; color: #fff; }
    .tb-btn.export-pdf:hover { background: #b91c1c; }
    .tb-btn.export-excel { background: #16a34a; color: #fff; }
    .tb-btn.export-excel:hover { background: #15803d; }

    /* الورقة الرسمية المطبوعة */
    .printable-document {
      background: #ffffff;
      max-width: 980px;
      margin: 24px auto;
      padding: 36px 42px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* 1. ترويسة المدرسة */
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
    }
    .school-brand {
      display: flex;
      align-items: center;
      gap: 14px;
      flex: 1;
    }
    .school-logo-wrap {
      width: 72px;
      height: 72px;
      flex: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .school-logo {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .school-names {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .school-name-ar {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
    }
    .school-name-en {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      font-family: sans-serif;
    }
    .school-affiliation {
      font-size: 11.5px;
      color: #64748b;
      font-weight: 600;
    }

    .doc-title-box {
      text-align: center;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    .doc-badge {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      border-radius: 999px;
      padding: 2px 10px;
      font-size: 11px;
      font-weight: 800;
    }
    .doc-main-title {
      margin: 4px 0 0;
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
    }
    .doc-sub-title {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      font-family: sans-serif;
    }
    .doc-academic-year {
      font-size: 12.5px;
      font-weight: 700;
      color: #16a34a;
      margin-top: 2px;
    }

    .doc-metadata {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      background: #f8fafc;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      font-size: 12px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
    .meta-lbl { color: #64748b; }
    .meta-val { color: #0f172a; font-weight: 700; }
    .meta-val-sm { color: #334155; font-size: 11px; }

    .divider-line {
      height: 2px;
      background: linear-gradient(90deg, #2563eb, #cbd5e1, #2563eb);
    }

    /* 2. بطاقة الطالب والحساب */
    .profile-card {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px 20px;
    }
    .profile-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .profile-section:first-child {
      border-left: 1px solid #e2e8f0;
      padding-left: 20px;
    }
    .sec-badge {
      font-size: 12px;
      font-weight: 800;
      color: #1d4ed8;
      border-bottom: 2px solid #dbeafe;
      padding-bottom: 6px;
      margin-bottom: 4px;
    }
    .profile-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .p-item {
      display: flex;
      align-items: baseline;
      font-size: 13px;
      gap: 12px;
    }
    .p-lbl {
      color: #64748b;
      font-weight: 600;
      width: 120px;
      min-width: 120px;
      flex-shrink: 0;
      text-align: right;
    }
    .p-val {
      color: #0f172a;
      font-weight: 700;
      text-align: right;
      flex: 1;
    }
    .highlight-student {
      color: #1e3a8a;
      font-size: 14.5px;
      font-weight: 800;
    }

    /* 3. ملخص الأرصدة (KPIs) */
    .kpi-summary-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    .kpi-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .kpi-box.discount { border-inline-start: 4px solid #f59e0b; }
    .kpi-box.paid { border-inline-start: 4px solid #16a34a; background: #f0fdf4; }
    .kpi-box.outstanding { border-inline-start: 4px solid #dc2626; background: #fef2f2; }
    .kb-lbl { font-size: 11.5px; font-weight: 700; color: #64748b; }
    .kb-val { font-size: 18px; font-weight: 800; color: #0f172a; font-variant-numeric: tabular-nums; }
    .kb-val small { font-size: 11px; font-weight: 600; color: #64748b; }
    .kb-val.success { color: #15803d; }
    .kb-val.danger { color: #b91c1c; }

    /* 4. جداول الكشف المحاسبي */
    .doc-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .section-title-wrap {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .doc-section-title {
      margin: 0;
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
    }
    .sec-note { font-size: 11.5px; color: #64748b; }

    .statement-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
      border: 1px solid #e2e8f0;
    }
    .statement-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 800;
      padding: 9px 10px;
      border: 1px solid #e2e8f0;
      text-align: right;
    }
    .statement-table td {
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    .statement-table th.end, .statement-table td.end { text-align: left; }
    .statement-table th.start { text-align: right; }

    .row-invoice { background: #ffffff; }
    .row-receipt { background: #f8fafc; }

    .col-num { width: 32px; text-align: center; color: #64748b; }
    .col-date { width: 90px; }
    .col-ref { width: 110px; }
    .col-amt { width: 105px; }
    .col-bal { width: 115px; font-weight: 800; }
    .col-method { width: 130px; }

    .col-desc {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .t-label { font-weight: 800; color: #0f172a; }
    .t-sub { font-size: 11px; color: #64748b; }

    .debit-cell { color: #0f172a; font-weight: 700; }
    .credit-cell { color: #16a34a; font-weight: 700; }
    .bal-cell { color: #0f172a; }
    .danger-bal { color: #dc2626 !important; font-weight: 800; }

    .method-badge {
      background: #eff6ff;
      color: #1d4ed8;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
    }

    .totals-row th {
      background: #e2e8f0;
      color: #0f172a;
      font-size: 13px;
      font-weight: 800;
      padding: 10px;
    }

    /* توسيط رأس جدول الاستحقاقات والخلايا المحددة */
    .th-center {
      text-align: center !important;
    }
    .cell-center {
      text-align: center !important;
    }
    .installments-table thead th {
      text-align: center !important;
      background: #f8fafc;
      color: #0f172a;
      font-weight: 800;
      vertical-align: middle;
    }

    .status-tag {
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
    }
    .status-tag[data-status="paid"] { background: #dcfce7; color: #166534; }
    .status-tag[data-status="pending"] { background: #fef3c7; color: #92400e; }

    /* 6. التذييل والتوقيعات والختم */
    .doc-footer {
      border-top: 1px dashed #cbd5e1;
      padding-top: 14px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .legal-notice {
      font-size: 11px;
      color: #64748b;
      line-height: 1.6;
      margin: 0;
    }

    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      align-items: end;
      margin-top: 10px;
    }
    .sig-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      text-align: center;
    }
    .sig-title {
      font-size: 12.5px;
      font-weight: 800;
      color: #334155;
    }
    .sig-dots {
      color: #94a3b8;
      font-size: 14px;
      letter-spacing: 2px;
      margin-top: 14px;
    }
    .sig-date {
      font-size: 11px;
      color: #64748b;
    }

    .stamp-block { align-items: center; }
    .stamp-box {
      width: 90px;
      height: 90px;
      border: 2px dashed #94a3b8;
      border-radius: 50%;
      display: grid;
      place-items: center;
      margin: 4px 0;
    }
    .stamp-img {
      max-width: 80%;
      max-height: 80%;
      object-fit: contain;
    }
    .stamp-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: #94a3b8;
      font-size: 11px;
      font-weight: 800;
    }
    .stamp-placeholder small { font-size: 9px; }

    /* تذييل المنصة الصغير أسفل الصفحة */
    .platform-system-footer {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px dashed #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #94a3b8;
    }
    .platform-system-footer .sys-brand {
      font-weight: 700;
      color: #475569;
    }
    .platform-system-footer .sep {
      margin: 0 6px;
    }
    .loading-state, .error-state {
      max-width: 500px;
      margin: 60px auto;
      background: #fff;
      padding: 40px;
      border-radius: 12px;
      border: 1px solid #cbd5e1;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .spinner {
      width: 28px;
      height: 28px;
      border: 3px solid #cbd5e1;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-icon { font-size: 36px; }

    .mono { font-family: monospace; }

    /* ══════════════════════════════════════════════════════════════════
       إعدادات الطباعة الاحترافية الرسمية في صفحة واحدة A4 (@media print)
       ══════════════════════════════════════════════════════════════════ */
    @media print {
      @page {
        size: A4 portrait;
        margin: 6mm 8mm;
      }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body, html {
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
        font-size: 11px !important;
        -webkit-font-smoothing: antialiased;
      }
      .no-print {
        display: none !important;
      }
      .statement-page {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
        min-height: auto !important;
      }
      .printable-document {
        box-shadow: none !important;
        border: none !important;
        margin: 0 !important;
        padding: 0 !important;
        max-width: 100% !important;
        width: 100% !important;
        gap: 8px !important;
      }

      /* 1. الترويسة في الطباعة */
      .doc-header {
        gap: 10px !important;
      }
      .school-logo-wrap {
        width: 52px !important;
        height: 52px !important;
      }
      .school-names {
        gap: 1px !important;
      }
      .school-name-ar {
        font-size: 15px !important;
      }
      .school-name-en {
        font-size: 9.5px !important;
      }
      .school-affiliation {
        font-size: 9px !important;
      }
      .doc-title-box {
        gap: 1px !important;
      }
      .doc-badge {
        font-size: 9px !important;
        padding: 1px 6px !important;
      }
      .doc-main-title {
        font-size: 15px !important;
        margin: 1px 0 0 !important;
      }
      .doc-sub-title {
        font-size: 9px !important;
      }
      .doc-academic-year {
        font-size: 10px !important;
        margin-top: 1px !important;
      }
      .doc-metadata {
        padding: 5px 8px !important;
        font-size: 10px !important;
        gap: 2px !important;
      }
      .meta-row {
        gap: 4px !important;
      }
      .divider-line {
        height: 1.5px !important;
      }

      /* 2. بطاقة الطالب والحساب */
      .profile-card {
        padding: 8px 12px !important;
        gap: 16px !important;
        border-radius: 6px !important;
      }
      .profile-section {
        gap: 3px !important;
      }
      .profile-section:first-child {
        padding-left: 12px !important;
      }
      .sec-badge {
        font-size: 10px !important;
        padding-bottom: 2px !important;
        margin-bottom: 2px !important;
      }
      .profile-grid {
        gap: 3px !important;
      }
      .p-item {
        font-size: 10.5px !important;
        gap: 6px !important;
      }
      .p-lbl {
        width: 90px !important;
        min-width: 90px !important;
      }
      .highlight-student {
        font-size: 12px !important;
      }

      /* 3. ملخص الأرصدة (KPIs) */
      .kpi-summary-bar {
        gap: 6px !important;
      }
      .kpi-box {
        padding: 5px 7px !important;
        gap: 1px !important;
        border-radius: 6px !important;
      }
      .kb-lbl {
        font-size: 9px !important;
      }
      .kb-val {
        font-size: 13.5px !important;
      }
      .kb-val small {
        font-size: 9px !important;
      }

      /* 4. جداول الكشف */
      .doc-section {
        gap: 3px !important;
      }
      .doc-section-title {
        font-size: 11.5px !important;
      }
      .sec-note {
        font-size: 9px !important;
      }
      .statement-table {
        font-size: 10px !important;
      }
      .statement-table th {
        padding: 4px 5px !important;
        font-size: 10px !important;
        background-color: #f1f5f9 !important;
      }
      .statement-table td {
        padding: 3.5px 5px !important;
      }
      .col-ref {
        white-space: nowrap !important;
      }
      .col-date {
        white-space: nowrap !important;
      }
      .totals-row th {
        padding: 4px 5px !important;
        font-size: 10.5px !important;
      }
      .t-label {
        font-size: 10px !important;
      }
      .t-sub {
        font-size: 8.5px !important;
      }
      .status-tag {
        padding: 1px 5px !important;
        font-size: 9px !important;
      }

      /* 5. التذييل والتوقيعات والختم */
      .doc-footer {
        padding-top: 6px !important;
        gap: 6px !important;
      }
      .legal-notice {
        font-size: 8.5px !important;
        line-height: 1.35 !important;
        margin: 0 !important;
      }
      .signatures-grid {
        margin-top: 2px !important;
        gap: 10px !important;
      }
      .sig-title {
        font-size: 10px !important;
      }
      .sig-dots {
        font-size: 10px !important;
        margin-top: 4px !important;
      }
      .sig-date {
        font-size: 8.5px !important;
      }
      .stamp-box {
        width: 54px !important;
        height: 54px !important;
        margin: 1px 0 !important;
      }
      .stamp-placeholder {
        font-size: 8px !important;
      }
      .stamp-placeholder small {
        font-size: 7px !important;
      }
      .platform-system-footer {
        margin-top: 4px !important;
        padding-top: 3px !important;
        font-size: 8.5px !important;
      }

      /* منع فواصل الصفحات تماماً */
      .printable-document,
      .doc-header,
      .profile-card,
      .kpi-summary-bar,
      .doc-section,
      .doc-footer,
      .page-break-inside-avoid {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
    }
  `]
})
export class StudentAccountStatementComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(StudentFinanceService);

  accountId = signal<string>('');
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  statement = signal<any | null>(null);

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.accountId.set(id);
        this.loadStatement(id);
      } else {
        this.error.set('لم يتم تحديد معرف الحساب المالي للطالب.');
        this.loading.set(false);
      }
    });
  }

  loadStatement(id: string) {
    this.loading.set(true);
    this.error.set(null);

    this.svc.getAccountStatement(id).subscribe({
      next: (res) => {
        if (res?.success && res?.data) {
          this.statement.set(res.data);
        } else {
          this.error.set('تعذر استخراج بيانات كشف الحساب من الخادم.');
        }
        this.loading.set(false);
      },
      error: (err) => {
        const msg = err?.error?.message || err?.error?.error?.message || 'حدث خطأ أثناء جلب كشف حساب الطالب.';
        this.error.set(msg);
        this.loading.set(false);
      }
    });
  }

  printStatement() {
    window.print();
  }

  async onExportPdf() {
    const s = this.statement();
    if (!s) return;
    const meta: ExportMeta = {
      title: `كشف حساب مالي - ${s.student?.student_name || 'طالب'}`,
      filename: `كشف-حساب-${s.student?.student_number || s.account?.account_number}`
    };
    const columns: ExportColumn[] = [
      { key: 'date', label: 'التاريخ' },
      { key: 'type_label', label: 'النوع' },
      { key: 'description', label: 'البيان' },
      { key: 'reference_number', label: 'المرجع' },
      { key: 'debit', label: 'مدين (ج.س)' },
      { key: 'credit', label: 'دائن (ج.س)' },
      { key: 'running_balance', label: 'الرصيد التراكمي (ج.س)' },
      { key: 'payment_method', label: 'طريقة الدفع' },
    ];
    await exportPdf(meta, columns, s.transactions || []);
  }

  async onExportExcel() {
    const s = this.statement();
    if (!s) return;
    const meta: ExportMeta = {
      title: `كشف حساب مالي - ${s.student?.student_name || 'طالب'}`,
      filename: `كشف-حساب-${s.student?.student_number || s.account?.account_number}`
    };
    const columns: ExportColumn[] = [
      { key: 'date', label: 'التاريخ' },
      { key: 'type_label', label: 'النوع' },
      { key: 'description', label: 'البيان' },
      { key: 'reference_number', label: 'المرجع' },
      { key: 'debit', label: 'مدين (ج.س)' },
      { key: 'credit', label: 'دائن (ج.س)' },
      { key: 'running_balance', label: 'الرصيد التراكمي (ج.س)' },
      { key: 'payment_method', label: 'طريقة الدفع' },
    ];
    await exportExcel(meta, columns, s.transactions || []);
  }

  onLogoError(event: any) {
    event.target.src = '/assets/branding/al_mawadda_logo.jpg';
  }

  goBack() {
    // العودة للتقويم أو لحسابات الطلاب
    window.history.back();
  }

  fmt(v: any): string {
    return (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
}
