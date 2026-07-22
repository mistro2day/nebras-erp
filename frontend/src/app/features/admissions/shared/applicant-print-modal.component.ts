import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AdmissionFees, DEFAULT_ADMISSION_FEES } from './admissions.shared';

@Component({
  selector: 'app-applicant-print-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    <div class="modal-backdrop" (click)="close.emit()" dir="rtl">
      <div class="modal-card print-card" (click)="$event.stopPropagation()">
        <header class="modal-header no-print">
          <div class="header-titles">
            <h2>معاينة استمارة التسجيل والقبول الرسمية</h2>
            <p>نسخة مطابقة للاستمارة الورقية الخاصة بالمدرسة (المورد الجديدة للتعليم الخاص)</p>
          </div>
          <div class="header-actions">
            <button class="btn-print" (click)="triggerPrint()">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              طباعة الاستمارة
            </button>
            <button class="btn-close" (click)="close.emit()">×</button>
          </div>
        </header>

        <div class="print-paper" id="printable-form">
          <!-- ترويسة الاستمارة الرسمية -->
          <div class="paper-header">
            <div class="bismillah">بسم الله الرحمن الرحيم</div>
            <div class="school-brand">
              <h1>المــورد الجديــدة للتعليم الخـاص</h1>
              <h2>المرحـلة الإبتدائيـة – (بنين – بنات)</h2>
            </div>
            <div class="form-title-box">
              <h3>إسـتمـارة التسجـيـل والقـبـول</h3>
            </div>
            <div class="meta-row">
              <div><b>التاريخ:</b> {{ currentDate }}</div>
              <div><b>العام الدراسي:</b> {{ academicYear || '2026 - 2025' }}</div>
              <div><b>الصف:</b> {{ gradeName || '—' }}</div>
            </div>
            <div class="pledge-head">الإلتزام بالضوابط واللوائح في الاستمارة</div>
          </div>

          <!-- أ/ البيانات الشخصية -->
          <section class="paper-section">
            <div class="sec-title">أ / البيانات الشخصية :</div>
            <table class="paper-table">
              <tr>
                <td><b>اسم التلميذ رباعياً:</b> {{ applicant.arabic_full_name || '—' }}</td>
                <td><b>تاريخ الميلاد:</b> {{ applicant.date_of_birth || '—' }}</td>
                <td><b>مكان الميلاد:</b> {{ applicant.birth_place || '—' }}</td>
              </tr>
              <tr>
                <td colspan="2">
                  <b>هل للتلميذ أشقاء بالمورد النموذجية؟</b> {{ applicant.has_siblings ? 'نعم' : 'لا' }}
                  @if (applicant.has_siblings) {
                    <span> | القسم: {{ applicant.siblings_section || 'إبتدائي' }} | عددهم: {{ applicant.siblings_count || '1' }}</span>
                  }
                </td>
                <td><b>الرقم الوطني / الجواز:</b> {{ applicant.national_id || applicant.passport_number || '—' }}</td>
              </tr>
              <tr>
                <td><b>اسم ولي الأمر:</b> {{ guardian.full_name || '—' }}</td>
                <td><b>صلة القرابة:</b> {{ relationshipLabel(guardian.relationship) }}</td>
                <td><b>المهنة:</b> {{ guardian.occupation || '—' }}</td>
              </tr>
              <tr>
                <td><b>السكن:</b> {{ guardian.address || '—' }}</td>
                <td><b>رقم العمارة:</b> {{ guardian.building_number || '—' }}</td>
                <td><b>عنوان عمل ولي الأمر:</b> {{ guardian.work_address || '—' }}</td>
              </tr>
              <tr>
                <td><b>أرقام هواتف ولي الأمر:</b> (1) {{ guardian.phone || '—' }} | (2) {{ guardian.phone2 || '—' }}</td>
                <td colspan="2"><b>رقم واتساب للمتابعة:</b> {{ guardian.whatsapp_phone || guardian.phone || '—' }}</td>
              </tr>
              <tr>
                <td colspan="3">
                  <b>رقم هاتف والدة التلميذ:</b> {{ guardian.mother_phone || '—' }}
                  @if (guardian.mother_proxy_name) { <span> (أو من ينوب عنها: {{ guardian.mother_proxy_name }})</span> }
                </td>
              </tr>
              @if (guardian.emergency_contact_name) {
                <tr class="highlight-row">
                  <td colspan="3">
                    <b>في حالة عدم وجود ولي الأمر يمكن الرجوع لـ:</b> {{ guardian.emergency_contact_name }}
                    | <b>صلة القرابة:</b> {{ guardian.emergency_contact_relation || '—' }}
                    | <b>العنوان:</b> {{ guardian.emergency_contact_address || '—' }}
                    | <b>الهاتف:</b> {{ guardian.emergency_contact_phone || '—' }}
                  </td>
                </tr>
              }
            </table>

            <table class="paper-table mini-margin">
              <tr>
                <td><b>هل يعاني التلميذ من أي مشاكل صحية؟</b> {{ applicant.has_health_issues ? ('نعم: ' + (applicant.health_issues_details || '')) : 'لا' }}</td>
                <td><b>هل يعاني التلميذ من أي مشاكل اجتماعية؟</b> {{ applicant.has_social_issues ? ('نعم: ' + (applicant.social_issues_details || '')) : 'لا' }}</td>
              </tr>
              <tr>
                <td><b>التلميذ يقيم مع:</b> {{ residesWithLabel(applicant.resides_with) }}</td>
                <td><b>وسيلة حضور التلميذ للمدرسة:</b> {{ transportLabel(applicant.transport_mode) }}</td>
              </tr>
              <tr>
                <td colspan="2"><b>يعتمد التلميذ في المذاكرة على:</b> {{ applicant.study_dependence === 'other' ? 'غيره' : 'نفسه' }}</td>
              </tr>
            </table>
          </section>

          <!-- ب/ المؤهل الأكاديمي -->
          <section class="paper-section">
            <div class="sec-title">ب / المؤهل الأكاديمي :</div>
            <table class="paper-table">
              <tr>
                <td><b>المدرسة الابتدائية / الروضة التي درس بها التلميذ:</b> {{ applicant.previous_school || '—' }}</td>
                <td><b>الصف السابق:</b> {{ applicant.previous_grade || '—' }}</td>
                <td><b>النسبة / التقدير:</b> {{ applicant.previous_grade_score || '—' }}</td>
              </tr>
            </table>
          </section>

          <!-- ج/ المستندات المطلوبة -->
          <section class="paper-section">
            <div class="sec-title">ج / المستندات المطلوبة :</div>
            <div class="docs-checklist">
              <span class="chk">[✓] أ/ صورتين فوتوغرافيتين</span>
              <span class="chk">[✓] ب/ الشهادة الأكاديمية السابقة</span>
              <span class="chk">[✓] ج/ صورة من الرقم الوطني</span>
              <span class="chk">[✓] د/ صورة إثبات شخصية ولي الأمر</span>
            </div>
          </section>

          <!-- د/ الرسوم والشروط المالية -->
          <section class="paper-section">
            <div class="sec-title">د / الرسوم الدراسية والشروط المالية :</div>
            <div class="fees-box">
              @if (fees.registration_fee > 0) {
                <p><b>رسوم التسجيل:</b> {{ fees.registration_fee | number }} {{ fees.fee_currency }} (رسوم إدارية وحكومية ولا تشمل الزي والكتب).</p>
              }
              @if (fees.annual_tuition > 0) {
                <p><b>الرسوم الدراسية:</b> {{ fees.annual_tuition | number }} {{ fees.fee_currency }} تسدد كالتالي:</p>
              }
              @if (fees.fee_installments.length) {
                <ol>
                  @for (inst of fees.fee_installments; track $index) {
                    <li>{{ inst.title }}: {{ inst.amount | number }} {{ fees.fee_currency }}{{ inst.note ? ' — ' + inst.note : '' }}</li>
                  }
                </ol>
              }
              @if (fees.fee_notes.length) {
                <ul class="financial-rules">
                  @for (note of fees.fee_notes; track $index) { <li>{{ note }}</li> }
                </ul>
              }
            </div>
          </section>

          <!-- الإقرار والتوقيع -->
          <section class="paper-section pledge-section">
            <p class="final-pledge">ـ يُقر ولي أمر التلميذ بالموافقة على الرسوم الدراسية أعلاه وبصحة البيانات أعلاه.</p>
            <div class="signatures-row">
              <div>توقيع ولي الأمر: ............................</div>
              <div>توقيع التلميذ: ............................</div>
              <div>التاريخ: {{ currentDate }}</div>
            </div>
          </section>

          <footer class="paper-footer">
            <span>نظام نبراس ERP لإدارة المؤسسات التعليمية · استمارة إلكترونية معتمدة</span>
            <span>الصفحة 1 من 1</span>
          </footer>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px; }
    .modal-card { width: 100%; max-width: 840px; max-height: 92vh; background: #fff; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); }
    .modal-header { padding: 16px 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; }
    .header-titles h2 { font-size: 16px; font-weight: 700; margin: 0; color: #0f172a; }
    .header-titles p { font-size: 12px; color: #64748b; margin: 2px 0 0; }
    .header-actions { display: flex; align-items: center; gap: 10px; }
    .btn-print { height: 38px; padding: 0 16px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
    .btn-print:hover { background: #1d4ed8; }
    .btn-close { width: 32px; height: 32px; border-radius: 50%; border: 1px solid #cbd5e1; background: #fff; font-size: 18px; line-height: 1; cursor: pointer; }
    
    .print-paper { flex: 1; overflow-y: auto; padding: 32px 36px; background: #fff; color: #000; font-family: 'Times New Roman', Arial, sans-serif; line-height: 1.5; }
    .paper-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; }
    .bismillah { font-size: 13px; font-weight: bold; margin-bottom: 4px; }
    .school-brand h1 { font-size: 20px; font-weight: bold; margin: 0; }
    .school-brand h2 { font-size: 15px; margin: 2px 0 8px; font-weight: normal; }
    .form-title-box { display: inline-block; border: 2px solid #000; padding: 4px 20px; margin: 6px 0; border-radius: 4px; }
    .form-title-box h3 { font-size: 17px; margin: 0; font-weight: bold; }
    .meta-row { display: flex; justify-content: space-around; font-size: 13px; font-weight: bold; margin-top: 8px; border-top: 1px dashed #666; padding-top: 6px; }
    .pledge-head { font-size: 13px; font-weight: bold; text-decoration: underline; margin-top: 6px; }
    
    .sec-title { font-weight: bold; font-size: 14px; margin: 10px 0 4px; text-decoration: underline; }
    .paper-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 12.5px; }
    .paper-table td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
    .paper-table.mini-margin { margin-top: 4px; }
    .highlight-row { background: #f1f5f9; }
    
    .docs-checklist { display: flex; flex-wrap: wrap; gap: 16px; font-size: 12.5px; border: 1px solid #000; padding: 8px 12px; font-weight: bold; background: #fafafa; }
    .fees-box { border: 1px solid #000; padding: 8px 12px; font-size: 12px; }
    .fees-box p { margin: 2px 0; }
    .fees-box ol { margin: 4px 0 6px 0; padding-inline-start: 20px; }
    .financial-rules { margin: 4px 0 0 0; padding-inline-start: 20px; font-size: 11.5px; }
    
    .pledge-section { margin-top: 14px; font-size: 12.5px; }
    .final-pledge { font-weight: bold; margin-bottom: 14px; }
    .signatures-row { display: flex; justify-content: space-between; font-weight: bold; padding-top: 10px; border-top: 1px solid #000; }
    
    .paper-footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #ccc; display: flex; justify-content: space-between; font-size: 10px; color: #666; }

    @media print {
      @page { size: A4; margin: 12mm; }
      html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
      body * { visibility: hidden; }
      /* تحييد قيود المودال حتى يتدفّق المحتوى كاملاً على صفحات متعددة */
      .modal-backdrop {
        position: static !important; background: none !important; backdrop-filter: none !important;
        padding: 0 !important; display: block !important; z-index: auto !important;
      }
      .modal-card {
        max-height: none !important; max-width: none !important; overflow: visible !important;
        box-shadow: none !important; border-radius: 0 !important; width: 100% !important;
      }
      .print-paper { overflow: visible !important; max-height: none !important; padding: 0 !important; }
      #printable-form, #printable-form * { visibility: visible; }
      #printable-form { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
      .no-print { display: none !important; }
      /* إظهار الحدود والتظليل عند الطباعة */
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  `],
})
export class ApplicantPrintModalComponent {
  @Input() applicant: any = {};
  @Input() guardian: any = {};
  @Input() academicYear = '2026 - 2025';
  @Input() gradeName = '';
  /** الرسوم المعروضة — تأتي من إعدادات القبول، وتعود للافتراضيات عند غيابها. */
  @Input() fees: AdmissionFees = DEFAULT_ADMISSION_FEES;
  @Output() close = new EventEmitter<void>();

  readonly currentDate = new Date().toLocaleDateString('ar-SD');

  triggerPrint(): void {
    window.print();
  }

  relationshipLabel(rel: string): string {
    switch (rel) {
      case 'father': return 'أب';
      case 'mother': return 'أم';
      case 'guardian': return 'ولي أمر';
      case 'sponsor': return 'كفيل';
      default: return rel || 'أب';
    }
  }

  residesWithLabel(val: string): string {
    switch (val) {
      case 'parents': return 'الأم والأب';
      case 'father': return 'الأب';
      case 'mother': return 'الأم';
      case 'other': return 'أخرى';
      default: return 'الأم والأب';
    }
  }

  transportLabel(val: string): string {
    switch (val) {
      case 'private': return 'ترحيل خاص';
      case 'school': return 'ترحيل المدرسة';
      case 'public': return 'المواصلات العامة';
      case 'walking': return 'الأقدام';
      default: return 'ترحيل المدرسة';
    }
  }
}
