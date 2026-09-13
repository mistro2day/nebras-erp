import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentsService } from '../students.service';
import { NbModalComponent } from '../../../shared/nebras/nb-modal.component';
import { NbStepperComponent } from '../../../shared/nebras/nb-stepper.component';
import { tafqeetArabic } from '../../finance/journals/journal-voucher-print';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-student-cascade-delete-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    NbModalComponent,
    NbStepperComponent,
  ],
  template: `
    <nb-modal
      [open]="open"
      title="معالج الحذف الشامل لملف وسجلات الطالب"
      subtitle="نظام تصفية وحذف كافة السجلات الأكاديمية والمالية والمستندات المرتبطة بالطالب عبر موديولات Nebras ERP."
      maxWidth="780px"
      (closed)="onClose()"
    >
      <nb-stepper [steps]="steps" [current]="currentStep() + 1"></nb-stepper>

      <div class="wizard-body">
        @if (loadingSummary()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>جارٍ فحص قاعدة البيانات وحصر كافة متعلقات الطالب عبر الموديولات…</p>
          </div>
        } @else {
          <!-- ================= الخطوة 1: فحص واستعراض السجلات المرتبطة ================= -->
          @if (currentStep() === 0) {
            <div class="step-pane">
              <div class="student-pill-banner">
                <div class="avatar-circle">🎓</div>
                <div class="student-info">
                  <h4 class="name">{{ student?.profile?.arabic_name || 'ملف طالب' }}</h4>
                  <span class="meta">رقم القيد الأكاديمي: <strong>{{ student?.student_number }}</strong></span>
                </div>
                <div class="total-badge">
                  <span class="lbl">إجمالي السجلات المرتبطة</span>
                  <span class="val">{{ summary()?.total_records_count || 0 }} سجل</span>
                </div>
              </div>

              <div class="section-title">📊 نتائج فحص المتعلقات عبر موديولات المنظومة:</div>

              <div class="modules-grid">
                <!-- بطاقة المالية -->
                <div class="mod-card" [class.has-records]="summary()?.finance?.has_financial_records">
                  <div class="mod-header">
                    <span class="mod-icon">💰</span>
                    <div class="mod-title">
                      <h5>مالية وفوترة الطلاب</h5>
                      <span class="mod-status">{{ summary()?.finance?.has_financial_records ? 'توجد حركات مالية' : 'لا توجد حركات' }}</span>
                    </div>
                  </div>
                  <div class="mod-stats">
                    <div class="stat-row">
                      <span>الحساب المالي:</span>
                      <strong>{{ summary()?.finance?.accounts_count ? 'مسجل ومفعل' : 'غير مسجل' }}</strong>
                    </div>
                    <div class="stat-row">
                      <span>الفواتير الصادرة:</span>
                      <strong>{{ summary()?.finance?.invoices_count || 0 }} فاتورة ({{ (summary()?.finance?.total_invoiced || 0) | number:'1.2-2' }} ج.س)</strong>
                    </div>
                    <div class="stat-row highlight">
                      <span>سندات القبض والدفعات:</span>
                      <strong>{{ summary()?.finance?.receipts_count || 0 }} سند ({{ (summary()?.finance?.total_collected || 0) | number:'1.2-2' }} ج.س)</strong>
                    </div>
                    <div class="stat-row">
                      <span>الأقساط المجدولة:</span>
                      <strong>{{ summary()?.finance?.installments_count || 0 }} قسط</strong>
                    </div>
                  </div>
                </div>

                <!-- بطاقة الأكاديمي والامتحانات -->
                <div class="mod-card" [class.has-records]="summary()?.academic?.enrollments_count > 0 || summary()?.academic?.exam_results_count > 0">
                  <div class="mod-header">
                    <span class="mod-icon">📚</span>
                    <div class="mod-title">
                      <h5>الأكاديمي والامتحانات</h5>
                      <span class="mod-status">سجلات أكاديمية</span>
                    </div>
                  </div>
                  <div class="mod-stats">
                    <div class="stat-row">
                      <span>التسكين السنوي:</span>
                      <strong>{{ summary()?.academic?.enrollments_count || 0 }} سنة دراسية</strong>
                    </div>
                    <div class="stat-row">
                      <span>درجات ونتائج الامتحانات:</span>
                      <strong>{{ summary()?.academic?.exam_results_count || 0 }} نتيجة اختبار</strong>
                    </div>
                  </div>
                </div>

                <!-- بطاقة الوثائق والمستندات -->
                <div class="mod-card" [class.has-records]="summary()?.documents?.attachments_count > 0">
                  <div class="mod-header">
                    <span class="mod-icon">📄</span>
                    <div class="mod-title">
                      <h5>المستندات والشهادات الثبوتية</h5>
                      <span class="mod-status">الملفات المرفوعة</span>
                    </div>
                  </div>
                  <div class="mod-stats">
                    <div class="stat-row">
                      <span>المرفقات والشهادات:</span>
                      <strong>{{ summary()?.documents?.attachments_count || 0 }} وثيقة رسمية</strong>
                    </div>
                    <div class="stat-row">
                      <span>الملفات السحابية:</span>
                      <strong>تخزين المستأجر المعزول</strong>
                    </div>
                  </div>
                </div>

                <!-- بطاقة الخدمات المساندة -->
                <div class="mod-card">
                  <div class="mod-header">
                    <span class="mod-icon">🏥</span>
                    <div class="mod-title">
                      <h5>العيادة والمكتبة المدرسية</h5>
                      <span class="mod-status">الخدمات التراكمية</span>
                    </div>
                  </div>
                  <div class="mod-stats">
                    <div class="stat-row">
                      <span>زيارات العيادة:</span>
                      <strong>{{ summary()?.support_services?.clinic_visits_count || 0 }} زيارة كشف</strong>
                    </div>
                    <div class="stat-row">
                      <span>استعارات الكتب:</span>
                      <strong>{{ summary()?.support_services?.library_borrows_count || 0 }} عملية إعارة</strong>
                    </div>
                  </div>
                </div>
              </div>

              @if (summary()?.finance?.has_financial_records) {
                <div class="alert-warning-banner">
                  <span class="alert-icon">⚠️</span>
                  <div class="alert-text">
                    <strong>تنبيه مالي مهم:</strong>
                    هذا الطالب يملك حركات وسندات مالية وفواتير مسجلة في المنظومة. الحذف الشامل سيقوم بمسح كافة هذه القيود والحساب المالي بشكل نهائي.
                  </div>
                </div>
              }
            </div>
          }

          <!-- ================= الخطوة 2: نطاق وتأكيد الحذف المالي ================= -->
          @if (currentStep() === 1) {
            <div class="step-pane">
              <div class="caution-box">
                <div class="caution-header">
                  <span class="caution-icon">🛑</span>
                  <h4>مراجعة الأثر المالي وشطب السندات والفواتير</h4>
                </div>
                <p class="caution-desc">
                  بموجب قواعد المحاسبة المالية المدرسية، فإن حذف سجل الطالب جذرياً يقتضي تصفية الحساب المالي وفك قيود الحماية (models.PROTECT). يرجى مراجعة إجمالي المبالغ التي سيتم شطبها:
                </p>

                <div class="financial-impact-grid">
                  <div class="fin-box">
                    <span class="f-label">إجمالي الفواتير الصادرة للمسح:</span>
                    <span class="f-val">{{ (summary()?.finance?.total_invoiced || 0) | number:'1.2-2' }} ج.س</span>
                    <span class="f-tafqeet">{{ getInvoicedTafqeet() }}</span>
                  </div>
                  <div class="fin-box highlight">
                    <span class="f-label">إجمالي السندات والمبالغ المحصلة للمسح:</span>
                    <span class="f-val">{{ (summary()?.finance?.total_collected || 0) | number:'1.2-2' }} ج.س</span>
                    <span class="f-tafqeet">{{ getCollectedTafqeet() }}</span>
                  </div>
                </div>
              </div>

              <div class="agreements-list">
                <h5>إقرارات المسؤولية عن الحذف الشامل:</h5>
                <label class="check-item">
                  <input type="checkbox" [(ngModel)]="agreeFinancial" />
                  <span>أقر وأوافق على حذف كافة الفواتير وسندات القبض وتصفية الحساب المالي لهذا الطالب وإلغائه نهائياً.</span>
                </label>
                <label class="check-item">
                  <input type="checkbox" [(ngModel)]="agreeAcademic" />
                  <span>أقر وأوافق على مسح السجلات الأكاديمية والدرجات الامتحانية والمرفقات والوثائق الرسمية.</span>
                </label>
              </div>
            </div>
          }

          <!-- ================= الخطوة 3: المراجعة والمطابقة الأمنية ================= -->
          @if (currentStep() === 2) {
            <div class="step-pane">
              <div class="final-review-card">
                <div class="review-header">
                  <span class="rev-icon">🔒</span>
                  <div class="rev-title">
                    <h4>المراجعة النهائية والتأكيد الأمني</h4>
                    <p>أنت على وشك مسح هذا الطالب وجميع متعلقاته بشكل نهائي لا رجعة فيه.</p>
                  </div>
                </div>

                <div class="review-details">
                  <div class="rev-row">
                    <span class="lbl">اسم الطالب المستهدف:</span>
                    <span class="val bold red">{{ student?.profile?.arabic_name }}</span>
                  </div>
                  <div class="rev-row">
                    <span class="lbl">رقم القيد الأكاديمي:</span>
                    <span class="val mono">{{ student?.student_number }}</span>
                  </div>
                  <div class="rev-row">
                    <span class="lbl">إجمالي السجلات الممسوحة:</span>
                    <span class="val bold">{{ summary()?.total_records_count }} سجل عبر كافة الموديولات</span>
                  </div>
                  <div class="rev-row">
                    <span class="lbl">إجمالي مبالغ السندات المحذوفة:</span>
                    <span class="val bold">{{ (summary()?.finance?.total_collected || 0) | number:'1.2-2' }} ج.س</span>
                  </div>
                </div>

                <div class="security-input-box">
                  <label>
                    <span class="sec-label">
                      لتأكيد العملية، يرجى كتابة اسم الطالب حرفياً «<strong>{{ student?.profile?.arabic_name }}</strong>» أو رقم القيد «<strong>{{ student?.student_number }}</strong>»:
                    </span>
                    <input
                      type="text"
                      [(ngModel)]="confirmText"
                      class="security-input"
                      placeholder="اكتب اسم الطالب أو رقم القيد هنا للمطابقة…"
                      autocomplete="off"
                    />
                  </label>

                  @if (confirmText && !isSecurityMatch()) {
                    <span class="match-error">النص المكتوب غير متطابق مع اسم الطالب أو رقم قيده.</span>
                  } @else if (isSecurityMatch()) {
                    <span class="match-success">✓ تم التحقق والمطابقة الأمنية بنجاح.</span>
                  }
                </div>
              </div>
            </div>
          }
        }
      </div>

      <div class="wizard-footer" slot="footer">
        <div class="left-actions">
          <button type="button" class="btn-cancel" (click)="onClose()" [disabled]="deleting()">
            إلغاء
          </button>
        </div>

        <div class="right-actions">
          @if (currentStep() > 0) {
            <button type="button" class="btn-prev" (click)="prevStep()" [disabled]="deleting()">
              السابق ➡️
            </button>
          }

          @if (currentStep() < 2) {
            <button
              type="button"
              class="btn-next"
              (click)="nextStep()"
              [disabled]="loadingSummary() || (currentStep() === 1 && (!agreeFinancial || !agreeAcademic))"
            >
              التالي ⬅️
            </button>
          } @else {
            <button
              type="button"
              class="btn-danger-confirm"
              [disabled]="!isSecurityMatch() || deleting()"
              (click)="executeDelete()"
            >
              @if (deleting()) {
                <span class="spinner-sm"></span>
                <span>جارٍ الحذف الذري الشامل…</span>
              } @else {
                <span>🗑️ تأكيد الحذف الجذري والشامل نهائياً</span>
              }
            </button>
          }
        </div>
      </div>
    </nb-modal>
  `,
  styles: [`
    .wizard-body {
      padding: 16px 4px;
      min-height: 380px;
      font-family: inherit;
      color: var(--nb-text, #1e293b);
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
      gap: 16px;
      color: var(--nb-text-muted, #64748b);
    }
    .spinner {
      width: 38px;
      height: 38px;
      border: 3px solid rgba(0,0,0,0.1);
      border-top-color: var(--nb-primary-600, #2563eb);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .spinner-sm {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-left: 6px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .step-pane {
      display: flex;
      flex-direction: column;
      gap: 16px;
      animation: fadeIn 0.2s ease-in-out;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

    /* بانر الطالب */
    .student-pill-banner {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 16px;
      background: var(--nb-surface-raised, #f8fafc);
      border: 1px solid var(--nb-border, #e2e8f0);
      border-radius: 12px;
    }
    .avatar-circle {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    .student-info { flex: 1; }
    .student-info .name { margin: 0; font-size: 15px; font-weight: 700; color: var(--nb-text, #1e293b); }
    .student-info .meta { font-size: 12px; color: var(--nb-text-muted, #64748b); }
    .total-badge {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      background: #ffffff;
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid var(--nb-border, #e2e8f0);
    }
    .total-badge .lbl { font-size: 10px; color: var(--nb-text-muted, #64748b); }
    .total-badge .val { font-size: 14px; font-weight: 800; color: #dc2626; }

    .section-title { font-size: 13.5px; font-weight: 700; margin-top: 4px; color: var(--nb-text, #1e293b); }

    /* شبكة الموديولات */
    .modules-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    @media (max-width: 640px) {
      .modules-grid { grid-template-columns: 1fr; }
    }
    .mod-card {
      background: var(--nb-surface, #ffffff);
      border: 1px solid var(--nb-border, #e2e8f0);
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: all 0.2s ease;
    }
    .mod-card.has-records {
      border-color: #fca5a5;
      background: #fffafa;
    }
    .mod-header {
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid var(--nb-border-soft, #f1f5f9);
      padding-bottom: 8px;
    }
    .mod-icon { font-size: 20px; }
    .mod-title h5 { margin: 0; font-size: 13px; font-weight: 700; }
    .mod-status { font-size: 10.5px; color: var(--nb-text-muted, #64748b); }
    .mod-stats {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      color: var(--nb-text-muted, #64748b);
    }
    .stat-row strong { color: var(--nb-text, #1e293b); font-weight: 600; }
    .stat-row.highlight strong { color: #dc2626; font-weight: 700; }

    .alert-warning-banner {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-radius: 10px;
      color: #92400e;
      font-size: 12.5px;
      line-height: 1.5;
    }
    .alert-icon { font-size: 18px; line-height: 1; }

    /* الخطوة 2: الأثر المالي */
    .caution-box {
      background: #fff5f5;
      border: 1px solid #fed7d7;
      border-radius: 12px;
      padding: 16px;
    }
    .caution-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .caution-header h4 { margin: 0; font-size: 15px; font-weight: 700; color: #9b2c2c; }
    .caution-desc { font-size: 13px; color: #742a2a; margin: 0 0 14px; line-height: 1.5; }

    .financial-impact-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .fin-box {
      background: #ffffff;
      border: 1px solid #fed7d7;
      border-radius: 8px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .fin-box.highlight {
      border-color: #feb2b2;
      background: #fffafa;
    }
    .f-label { font-size: 11px; color: #742a2a; font-weight: 600; }
    .f-val { font-size: 18px; font-weight: 800; color: #9b2c2c; }
    .f-tafqeet { font-size: 11px; color: #9b2c2c; font-weight: 600; margin-top: 2px; }

    .agreements-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: var(--nb-surface-raised, #f8fafc);
      padding: 14px;
      border-radius: 10px;
      border: 1px solid var(--nb-border, #e2e8f0);
    }
    .agreements-list h5 { margin: 0 0 4px; font-size: 13px; font-weight: 700; color: var(--nb-text, #1e293b); }
    .check-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      cursor: pointer;
      font-size: 12.5px;
      line-height: 1.4;
      color: var(--nb-text, #1e293b);
    }
    .check-item input[type="checkbox"] {
      margin-top: 2px;
      accent-color: #dc2626;
      width: 16px;
      height: 16px;
      cursor: pointer;
    }

    /* الخطوة 3: المراجعة والمطابقة الأمنية */
    .final-review-card {
      background: #ffffff;
      border: 1px solid var(--nb-border, #e2e8f0);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .review-header {
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid var(--nb-border-soft, #f1f5f9);
      padding-bottom: 12px;
    }
    .rev-icon { font-size: 28px; }
    .rev-title h4 { margin: 0; font-size: 15px; font-weight: 700; color: #dc2626; }
    .rev-title p { margin: 2px 0 0; font-size: 12px; color: var(--nb-text-muted, #64748b); }

    .review-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: #fef2f2;
      border: 1px dashed #fca5a5;
      border-radius: 8px;
      padding: 12px;
      font-size: 13px;
    }
    .rev-row {
      display: flex;
      justify-content: space-between;
    }
    .rev-row .lbl { color: #7f1d1d; }
    .rev-row .val.bold { font-weight: 700; color: #991b1b; }
    .rev-row .val.red { color: #dc2626; }
    .rev-row .val.mono { font-family: monospace; }

    .security-input-box {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .sec-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--nb-text, #1e293b);
      line-height: 1.5;
      display: block;
      margin-bottom: 6px;
    }
    .security-input {
      width: 100%;
      padding: 10px 14px;
      font-size: 14px;
      border: 2px solid var(--nb-border, #e2e8f0);
      border-radius: 8px;
      outline: none;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }
    .security-input:focus {
      border-color: #dc2626;
      box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15);
    }
    .match-error { font-size: 12px; color: #dc2626; font-weight: 600; }
    .match-success { font-size: 12px; color: #16a34a; font-weight: 600; }

    /* شريط أزرار المعالج */
    .wizard-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      padding-top: 14px;
      border-top: 1px solid var(--nb-border, #e2e8f0);
    }
    .right-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn-cancel {
      padding: 8px 16px;
      border: 1px solid var(--nb-border, #e2e8f0);
      background: transparent;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      color: var(--nb-text-muted, #64748b);
      transition: all 0.15s ease;
    }
    .btn-cancel:hover { background: #f1f5f9; color: var(--nb-text, #1e293b); }

    .btn-prev {
      padding: 8px 16px;
      border: 1px solid var(--nb-border, #e2e8f0);
      background: var(--nb-surface, #ffffff);
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      color: var(--nb-text, #1e293b);
      transition: all 0.15s ease;
    }
    .btn-prev:hover { background: #f8fafc; }

    .btn-next {
      padding: 8px 20px;
      border: none;
      background: var(--nb-primary-600, #2563eb);
      color: #ffffff;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 700;
      transition: all 0.15s ease;
    }
    .btn-next:hover:not(:disabled) { background: var(--nb-primary-700, #1d4ed8); }
    .btn-next:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-danger-confirm {
      padding: 9px 22px;
      border: none;
      background: #dc2626;
      color: #ffffff;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.15s ease;
      box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
    }
    .btn-danger-confirm:hover:not(:disabled) { background: #b91c1c; }
    .btn-danger-confirm:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
  `]
})
export class StudentCascadeDeleteModalComponent implements OnChanges {
  private studentsService = inject(StudentsService);
  private snack = inject(MatSnackBar);

  @Input() open = false;
  @Input() student: any = null;
  @Output() closed = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();

  steps = [
    '1. فحص وتدقيق السجلات',
    '2. مراجعة الأثر المالي',
    '3. المطابقة الأمنية والتنفيذ'
  ];

  readonly currentStep = signal<number>(0);
  readonly loadingSummary = signal<boolean>(false);
  readonly deleting = signal<boolean>(false);
  readonly summary = signal<any>(null);

  agreeFinancial = false;
  agreeAcademic = false;
  confirmText = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open && this.student?.id) {
      this.currentStep.set(0);
      this.agreeFinancial = false;
      this.agreeAcademic = false;
      this.confirmText = '';
      this.loadSummary();
    }
  }

  loadSummary(): void {
    if (!this.student?.id) return;
    this.loadingSummary.set(true);
    this.studentsService.getStudentCascadeSummary(this.student.id).subscribe({
      next: (data) => {
        this.summary.set(data);
        this.loadingSummary.set(false);
      },
      error: () => {
        this.loadingSummary.set(false);
        this.snack.open('تعذر فحص متعلقات الطالب. حاول مجدداً.', 'إغلاق', { duration: 4000 });
      }
    });
  }

  nextStep(): void {
    if (this.currentStep() < 2) {
      this.currentStep.update(c => c + 1);
    }
  }

  prevStep(): void {
    if (this.currentStep() > 0) {
      this.currentStep.update(c => c - 1);
    }
  }

  onClose(): void {
    this.closed.emit();
  }

  getInvoicedTafqeet(): string {
    const total = this.summary()?.finance?.total_invoiced || 0;
    if (total <= 0) return 'صفر جنيه سوداني';
    return tafqeetArabic(total, 'جنيه سوداني');
  }

  getCollectedTafqeet(): string {
    const total = this.summary()?.finance?.total_collected || 0;
    if (total <= 0) return 'صفر جنيه سوداني';
    return tafqeetArabic(total, 'جنيه سوداني');
  }

  isSecurityMatch(): boolean {
    const text = (this.confirmText || '').trim().toLowerCase();
    if (!text) return false;

    const arabicName = (this.student?.profile?.arabic_name || '').trim().toLowerCase();
    const studentNumber = (this.student?.student_number || '').trim().toLowerCase();

    return text === arabicName || text === studentNumber;
  }

  executeDelete(): void {
    if (!this.isSecurityMatch() || this.deleting()) return;

    this.deleting.set(true);
    this.studentsService.executeCascadeDelete(this.student.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.snack.open(`تم حذف الطالب «${this.student?.profile?.arabic_name}» وكافة متعلقاته بنجاح.`, 'إغلاق', { duration: 5000 });
        this.deleted.emit();
      },
      error: (err) => {
        this.deleting.set(false);
        const msg = err?.error?.message || err?.error?.detail || 'تعذر استكمال الحذف الشامل. يرجى التحقق وإعادة المحاولة.';
        this.snack.open(msg, 'إغلاق', { duration: 5000 });
      }
    });
  }
}
