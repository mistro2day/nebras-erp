import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { StudentFinanceService } from '../student-finance.service';
import { exportElementToPdf } from '../../../shared/export';

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
          <button class="tb-btn export-pdf" (click)="onExportPdf()" [disabled]="exporting()">
            <span>📄</span> {{ exporting() ? 'جارٍ التصدير…' : 'تصدير PDF' }}
          </button>
          <button class="tb-btn export-excel" (click)="onExportExcel()" [disabled]="exporting()">
            <span>📊</span> {{ exporting() ? 'جارٍ التصدير…' : 'تصدير Excel' }}
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
  exporting = signal<boolean>(false);
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

  /**
   * تصدير كشف الحساب كملف PDF رسمي عالي الدقة (مطابق 100% للشاشة)
   */
  async onExportPdf() {
    const s = this.statement();
    if (!s || this.exporting()) return;
    this.exporting.set(true);

    try {
      const stName = s.student?.student_name ? s.student.student_name.replace(/\s+/g, '-') : 'طالب';
      const acNum = s.account?.account_number || s.student?.student_number || 'STMT';
      const filename = `كشف-حساب-مالي-${stName}-${acNum}-${new Date().toISOString().slice(0, 10)}.pdf`;
      await exportElementToPdf('statement-print-area', filename, { scale: 2.5, orientation: 'p' });
    } catch (e) {
      console.error('فشل تصدير كشف الحساب إلى PDF:', e);
    } finally {
      this.exporting.set(false);
    }
  }

  /**
   * تصدير كشف الحساب كملف Excel (.xlsx) احترافي متكامل
   * يشمل: الترويسة الرسمية، بيانات الطالب وولي الأمر، ملخص الأرصدة، سجل الحركات، وجدول الأقساط
   */
  async onExportExcel() {
    const s = this.statement();
    if (!s || this.exporting()) return;
    this.exporting.set(true);

    try {
      const mod: any = await import('exceljs');
      const ExcelJS = mod.default ?? mod;
      const wb = new ExcelJS.Workbook();
      wb.creator = 'نظام نبراس — إدارة الحسابات المالية';
      wb.created = new Date();

      // ورقة عمل رئيسية باتجاه اليمين إلى اليسار (RTL)
      const ws = wb.addWorksheet('كشف الحساب المالي', {
        views: [{ rightToLeft: true }]
      });

      // تحديد قياسات الأعمدة لتناسب المحتوى بالكامل
      ws.columns = [
        { width: 8 },   // A: #
        { width: 14 },  // B: التاريخ
        { width: 34 },  // C: البيان والوصف
        { width: 18 },  // D: رقم المرجع
        { width: 18 },  // E: مدين (+) ج.س
        { width: 18 },  // F: دائن (-) ج.س
        { width: 20 },  // G: الرصيد التراكمي ج.س
        { width: 22 },  // H: طريقة السداد / الملاحظات
      ];

      const BRAND_BLUE = '1E3A8A';
      const BORDER_COLOR = 'CBD5E1';

      // 1. ترويسة المدرسة الرسمية
      ws.mergeCells('A1:H1');
      const schoolCell = ws.getCell('A1');
      schoolCell.value = s.tenant?.name_ar || s.tenant?.name || 'مدارس المورد النموذجية الخاصة';
      schoolCell.font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } };
      schoolCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_BLUE } };
      schoolCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 30;

      ws.mergeCells('A2:H2');
      const titleCell = ws.getCell('A2');
      titleCell.value = `كشف حساب مالي تفصيلي — العام الدراسي: ${s.meta?.academic_year || '2026 / 2027'}`;
      titleCell.font = { bold: true, size: 12, color: { argb: 'FF0F172A' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(2).height = 24;

      // سطر بيانات الكشف الفوقية
      ws.mergeCells('A3:H3');
      const metaCell = ws.getCell('A3');
      metaCell.value = `رقم الكشف: ${s.meta?.statement_number || ''}   •   تاريخ الإصدار: ${s.meta?.generated_at || ''}   •   العملة المعتمدة: ${s.meta?.currency || 'SDG'} (جنيه سوداني)   •   الهاتف: ${s.tenant?.phone || '0912345678'}`;
      metaCell.font = { size: 9.5, color: { argb: 'FF64748B' } };
      metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(3).height = 20;

      // سطر فارغ
      ws.addRow([]);

      // 2. بطاقة معلومات الطالب وولي الأمر
      ws.mergeCells('A5:D5');
      const stHead = ws.getCell('A5');
      stHead.value = 'بيانات الطالب الأكاديمية';
      stHead.font = { bold: true, size: 11, color: { argb: 'FF1D4ED8' } };
      stHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
      stHead.alignment = { horizontal: 'right', vertical: 'middle' };

      ws.mergeCells('E5:H5');
      const acHead = ws.getCell('E5');
      acHead.value = 'بيانات الحساب وولي الأمر';
      acHead.font = { bold: true, size: 11, color: { argb: 'FF1D4ED8' } };
      acHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
      acHead.alignment = { horizontal: 'right', vertical: 'middle' };
      ws.getRow(5).height = 22;

      // الصف 6
      ws.getCell('A6').value = 'اسم الطالب:';
      ws.getCell('A6').font = { bold: true, size: 10, color: { argb: 'FF64748B' } };
      ws.getCell('B6').value = s.student?.student_name || 'منه ابوبكر تاج السر عثمان';
      ws.getCell('B6').font = { bold: true, size: 11, color: { argb: 'FF0F172A' } };
      ws.mergeCells('B6:D6');

      ws.getCell('E6').value = 'رقم الحساب المالي:';
      ws.getCell('E6').font = { bold: true, size: 10, color: { argb: 'FF64748B' } };
      ws.getCell('F6').value = s.account?.account_number || '';
      ws.getCell('F6').font = { bold: true, size: 10 };
      ws.mergeCells('F6:H6');

      // الصف 7
      ws.getCell('A7').value = 'الرقم المدرسي:';
      ws.getCell('A7').font = { bold: true, size: 10, color: { argb: 'FF64748B' } };
      ws.getCell('B7').value = s.student?.student_number || '';
      ws.mergeCells('B7:D7');

      ws.getCell('E7').value = 'ولي أمر الطالب:';
      ws.getCell('E7').font = { bold: true, size: 10, color: { argb: 'FF64748B' } };
      ws.getCell('F7').value = s.student?.guardian_name || 'أبوبكر تاج السر عثمان';
      ws.mergeCells('F7:H7');

      // الصف 8
      ws.getCell('A8').value = 'الصف الدراسي:';
      ws.getCell('A8').font = { bold: true, size: 10, color: { argb: 'FF64748B' } };
      ws.getCell('B8').value = (s.student?.grade_name || 'الصف السادس الابتدائي') + (s.student?.section_name ? (' - شعبة ' + s.student.section_name) : ' - شعبة أ');
      ws.mergeCells('B8:D8');

      ws.getCell('E8').value = 'هاتف ولي الأمر:';
      ws.getCell('E8').font = { bold: true, size: 10, color: { argb: 'FF64748B' } };
      ws.getCell('F8').value = s.student?.guardian_phone || '0912345678';
      ws.mergeCells('F8:H8');

      // سطر فارغ
      ws.addRow([]);

      // 3. ملخص الأرصدة (KPIs)
      ws.mergeCells('A10:H10');
      const kpiHead = ws.getCell('A10');
      kpiHead.value = 'ملخص الأرصدة والموقف المالي الإجمالي';
      kpiHead.font = { bold: true, size: 11, color: { argb: 'FF1E293B' } };
      kpiHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      ws.getRow(10).height = 20;

      ws.mergeCells('A11:B11');
      ws.getCell('A11').value = 'إجمالي الرسوم الصادرة';
      ws.getCell('A11').font = { bold: true, size: 10 };
      ws.getCell('A11').alignment = { horizontal: 'center' };

      ws.mergeCells('C11:D11');
      ws.getCell('C11').value = 'إجمالي المنح والخصومات';
      ws.getCell('C11').font = { bold: true, size: 10 };
      ws.getCell('C11').alignment = { horizontal: 'center' };

      ws.mergeCells('E11:F11');
      ws.getCell('E11').value = 'إجمالي المسدد (التحصيلات)';
      ws.getCell('E11').font = { bold: true, size: 10 };
      ws.getCell('E11').alignment = { horizontal: 'center' };

      ws.mergeCells('G11:H11');
      ws.getCell('G11').value = 'صافي الرصيد المستحق (المديونية)';
      ws.getCell('G11').font = { bold: true, size: 10 };
      ws.getCell('G11').alignment = { horizontal: 'center' };

      ws.mergeCells('A12:B12');
      const k1 = ws.getCell('A12');
      k1.value = `${this.fmt(s.summary?.total_invoiced)} ج.س`;
      k1.font = { bold: true, size: 12, color: { argb: 'FF0F172A' } };
      k1.alignment = { horizontal: 'center', vertical: 'middle' };

      ws.mergeCells('C12:D12');
      const k2 = ws.getCell('C12');
      k2.value = `${this.fmt(s.summary?.total_discounted)} ج.س`;
      k2.font = { bold: true, size: 12, color: { argb: 'FFD97706' } };
      k2.alignment = { horizontal: 'center', vertical: 'middle' };

      ws.mergeCells('E12:F12');
      const k3 = ws.getCell('E12');
      k3.value = `${this.fmt(s.summary?.total_paid)} ج.س`;
      k3.font = { bold: true, size: 12, color: { argb: 'FF16A34A' } };
      k3.alignment = { horizontal: 'center', vertical: 'middle' };

      ws.mergeCells('G12:H12');
      const k4 = ws.getCell('G12');
      k4.value = `${this.fmt(s.summary?.net_outstanding)} ج.س`;
      k4.font = { bold: true, size: 12, color: { argb: 'FFDC2626' } };
      k4.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(12).height = 24;

      // سطر فارغ
      ws.addRow([]);

      // 4. جدول حركات كشف الحساب ودفتر الأستاذ
      ws.mergeCells('A14:H14');
      const txHead = ws.getCell('A14');
      txHead.value = 'سجل القيود والعمليات المالية التفصيلي (Running Balance)';
      txHead.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      txHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_BLUE } };
      ws.getRow(14).height = 22;

      const txHeaders = ['#', 'التاريخ', 'البيان والوصف', 'رقم المرجع', 'مدين (+) ج.س', 'دائن (-) ج.س', 'الرصيد التراكمي ج.س', 'طريقة السداد / الملاحظات'];
      const hRow = ws.addRow(txHeaders);
      hRow.font = { bold: true, size: 10, color: { argb: 'FF1E293B' } };
      hRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      hRow.alignment = { horizontal: 'center', vertical: 'middle' };
      hRow.height = 22;

      let curRowIdx = 16;
      (s.transactions || []).forEach((t: any, idx: number) => {
        const r = ws.addRow([
          idx + 1,
          t.date,
          `${t.type_label} - ${t.description || ''}`,
          t.reference_number,
          t.debit > 0 ? Number(t.debit) : '-',
          t.credit > 0 ? Number(t.credit) : '-',
          Number(t.running_balance || 0),
          t.payment_method || '-'
        ]);
        r.alignment = { vertical: 'middle' };
        r.getCell(1).alignment = { horizontal: 'center' };
        r.getCell(2).alignment = { horizontal: 'center' };
        r.getCell(4).alignment = { horizontal: 'center' };
        r.getCell(5).alignment = { horizontal: 'right' };
        r.getCell(6).alignment = { horizontal: 'right' };
        r.getCell(7).alignment = { horizontal: 'right' };
        r.getCell(8).alignment = { horizontal: 'center' };
        curRowIdx++;
      });

      // صف الإجماليات للحركات
      const txTotalRow = ws.addRow([
        'الإجمالي العام للحركات', '', '', '',
        Number(s.summary?.total_invoiced || 0),
        Number((s.summary?.total_paid || 0) + (s.summary?.total_discounted || 0)),
        Number(s.summary?.net_outstanding || 0),
        ''
      ]);
      ws.mergeCells(`A${curRowIdx}:D${curRowIdx}`);
      txTotalRow.font = { bold: true, size: 10.5 };
      txTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      txTotalRow.height = 22;
      curRowIdx++;

      // سطر فارغ
      ws.addRow([]);
      curRowIdx++;

      // 5. جدول استحقاق الأقساط الدراسية
      if (s.installments?.length) {
        ws.mergeCells(`A${curRowIdx}:H${curRowIdx}`);
        const insHead = ws.getCell(`A${curRowIdx}`);
        insHead.value = 'جدول استحقاق الأقساط الدراسية المعتمدة للعام الدراسي';
        insHead.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        insHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } };
        ws.getRow(curRowIdx).height = 22;
        curRowIdx++;

        const insCols = ['القسط / الخطة', 'تاريخ الاستحقاق', 'مبلغ القسط ج.س', 'المسدد ج.س', 'المتبقي المطلوب ج.س', 'حالة السداد'];
        const insHeaderRow = ws.addRow([insCols[0], '', insCols[1], insCols[2], insCols[3], insCols[4], insCols[5], '']);
        ws.mergeCells(`A${curRowIdx}:B${curRowIdx}`);
        ws.mergeCells(`G${curRowIdx}:H${curRowIdx}`);
        insHeaderRow.font = { bold: true, size: 10 };
        insHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
        insHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };
        curRowIdx++;

        s.installments.forEach((ins: any) => {
          const row = ws.addRow([
            ins.plan_name || 'قسط دراسي',
            '',
            ins.due_date,
            Number(ins.amount || 0),
            Number(ins.paid_amount || 0),
            Number(ins.remaining_amount || 0),
            ins.status_label || 'مجدول',
            ''
          ]);
          ws.mergeCells(`A${curRowIdx}:B${curRowIdx}`);
          ws.mergeCells(`G${curRowIdx}:H${curRowIdx}`);
          row.alignment = { vertical: 'middle' };
          row.getCell(3).alignment = { horizontal: 'center' };
          row.getCell(4).alignment = { horizontal: 'right' };
          row.getCell(5).alignment = { horizontal: 'right' };
          row.getCell(6).alignment = { horizontal: 'right' };
          row.getCell(7).alignment = { horizontal: 'center' };
          curRowIdx++;
        });

        // إجمالي الأقساط
        const insTotalRow = ws.addRow([
          'إجمالي خطة الأقساط المعتمدة للطالب', '', '',
          Number(s.summary?.installments_total || s.summary?.total_invoiced || 0),
          Number(s.summary?.installments_paid || 0),
          Number(s.summary?.installments_remaining || s.summary?.net_outstanding || 0),
          '', ''
        ]);
        ws.mergeCells(`A${curRowIdx}:C${curRowIdx}`);
        ws.mergeCells(`G${curRowIdx}:H${curRowIdx}`);
        insTotalRow.font = { bold: true, size: 10.5 };
        insTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
        curRowIdx++;
      }

      // سطر فارغ وتذييل
      ws.addRow([]);
      curRowIdx++;
      ws.mergeCells(`A${curRowIdx}:H${curRowIdx}`);
      const footerCell = ws.getCell(`A${curRowIdx}`);
      footerCell.value = `• يعتبر هذا الكشف وثيقة مالية رسمية صادرة ومعتمدة لدى إدارة الحسابات في ${s.tenant?.name_ar || s.tenant?.name || 'المدرسة'}.`;
      footerCell.font = { size: 9.5, italic: true, color: { argb: 'FF64748B' } };
      footerCell.alignment = { horizontal: 'right' };

      // كتابة ملف Excel وتنزيله للمستخدم
      const buf = await wb.xlsx.writeBuffer();
      const stName = s.student?.student_name ? s.student.student_name.replace(/\s+/g, '-') : 'طالب';
      const acNum = s.account?.account_number || s.student?.student_number || 'STMT';
      const filename = `كشف-حساب-مالي-${stName}-${acNum}-${new Date().toISOString().slice(0, 10)}.xlsx`;

      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error('فشل تصدير كشف الحساب إلى Excel:', e);
    } finally {
      this.exporting.set(false);
    }
  }

  onLogoError(event: any) {
    event.target.src = '/assets/branding/al_mawadda_logo.jpg';
  }

  goBack() {
    window.history.back();
  }

  fmt(v: any): string {
    return (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
}
