import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import {
  AdmissionsService, Applicant, Guardian, RequiredDocument, Interview, PlacementTest, AptitudeEvaluation,
} from '../admissions.service';
import { CommunicationsService, CommunicationTemplate } from '../../communications/communications.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbDataTableComponent, NbColumn } from '../../../shared/nebras/nb-data-table.component';
import {
  ADM_PAGE_STYLES, DOC_STATUS_TEXT, INTERVIEW_STATUS_TEXT, ADMISSION_STAGES,
  applicantStatusKind, applicantStatusText, docStatusKind, interviewStatusKind, pickList,
  admissionStageIndex, isNegativeDecision, DEFAULT_APTITUDE_SUBJECTS,
  AdmissionFees, DEFAULT_ADMISSION_FEES,
} from '../shared/admissions.shared';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { InterviewScheduleDialogComponent, InterviewScheduleResult } from '../../../shared/components/interview-schedule-dialog/interview-schedule-dialog.component';
import { ApplicantPrintModalComponent } from '../shared/applicant-print-modal.component';

const RELATION_TEXT: Record<string, string> = {
  father: 'أب', mother: 'أم', guardian: 'ولي أمر', sponsor: 'كفيل',
};

const DEFAULT_ADM_TEMPLATES: { code: string; name: string; category: string; body: string }[] = [
  {
    code: 'ADM_ACCEPTED',
    name: 'إشعار قبول التلميذ المعتمد',
    category: 'admissions',
    body: 'السلام عليكم {{guardian_name}}، نبارك لكم قبول التلميذ/ة {{student_name}} بـ {{school_name}} - مدارس المورد النموذجية للعام الدراسي. رقم الطلب: {{application_number}}. نرجو مراجعة قسم التسجيل لاستكمال الإجراءات.',
  },
  {
    code: 'ADM_WAITLIST',
    name: 'إشعار قائمة الانتظار المعتمد',
    category: 'admissions',
    body: 'السلام عليكم {{guardian_name}}، نفيدكم بإدراج طلب القبول رقم {{application_number}} للتلميذ/ة {{student_name}} ضمن قائمة الانتظار بـ {{school_name}}. سيتم التواصل معكم فور توفر مقعد شاغر.',
  },
  {
    code: 'ADM_REJECTED',
    name: 'إشعار نتيجة التنافس ورفض الطلب',
    category: 'admissions',
    body: 'السلام عليكم {{guardian_name}}، نشكركم للتواصل مع مدارس المورد النموذجية. نود إحاطتكم باكتفاء المقاعد المتاحة لطلب القبول رقم {{application_number}} للتلميذ/ة {{student_name}}. نتمنى لكم دوام التوفيق.',
  },
  {
    code: 'ADM_INTERVIEW',
    name: 'إشعار موعد المقابلة الشخصية',
    category: 'admissions',
    body: 'السلام عليكم {{guardian_name}}، تم تحديد موعد المقابلة الشخصية للتلميذ/ة {{student_name}} بـ {{school_name}} (طلب رقم {{application_number}}) بتاريخ {{interview_date}}. نرجو الحضور في الموعد المحدد.',
  },
];

/**
 * قالب تأكيد استلام طلب التسجيل — يُرسل تلقائياً من الاستمارة العامة.
 * يُزرع في الخلفية من صفحة التفاصيل (المصادَقة) ليصبح قابلاً للتحرير من صفحة القوالب،
 * وتقرؤه الاستمارة العامة عبر endpoint عام. راجع ADR-008.
 */
const ADM_SUBMITTED_TEMPLATE = {
  code: 'ADM_SUBMITTED',
  name: 'إشعار استلام طلب الالتحاق',
  body: 'السلام عليكم {{guardian_name}}، تم استلام طلب الالتحاق بنجاح بالرقم: ({{application_number}}) للتلميذ/ة ({{student_name}}) بـ ({{school_name}}) - مدارس المورد النموذجية للعام الدراسي ({{academic_year}}). نرجو الاحتفاظ برقم الطلب لمتابعة حالة القبول وتحديد المقابلة. شكرًا لثقتكم.',
};

/**
 * تفاصيل طلب الالتحاق وإدارته الشاملة — Nebras OS.
 * يعرض كافة حقول الاستمارة الـ 6 ومتصل بموديول الاتصالات لإرسال الإشعارات التلقائية الفورية عبر الواتساب فور اتخاذ قرار القبول/الرفض/الانتظار/جدولة المقابلة.
 */
@Component({
  selector: 'app-application-details',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, FormsModule, MatDialogModule,
    NbPageHeaderComponent, NbPanelComponent, NbDataTableComponent,
    ApplicantPrintModalComponent
  ],
  template: `
    @if (applicant(); as a) {
      <div class="page" dir="rtl">
        <!-- شريط التنبيه التلقائي العلوي لإرسال الواتساب -->
        @if (autoNotificationToast(); as toast) {
          <div class="auto-toast-banner" [class.success]="toast.status === 'success'" [class.error]="toast.status === 'error'">
            <span class="toast-icon">{{ toast.status === 'success' ? '✓' : '⚠️' }}</span>
            <span>{{ toast.message }}</span>
          </div>
        }

        <!-- الهيدر الرئيسي وإجراءات حالة الطلب -->
        <nb-page-header [title]="a.arabic_full_name" [subtitle]="'رقم الطلب الرسمي: ' + a.application_number">
          <button type="button" class="nb-btn-ghost" (click)="back()">← عودة للقائمة</button>
          
          <!-- زر معاينة الاستمارة الرسمية الورقية -->
          <button type="button" class="nb-btn-secondary" (click)="showPrintModal.set(true)">
            📄 المعاينة والطباعة الورقية
          </button>

          <!-- زر إرسال واتساب المباشر عبر موديول الاتصالات -->
          <button type="button" class="nb-btn-whatsapp" (click)="openWhatsappModal(a.status)">
            💬 إرسال إشعار واتساب
          </button>
        </nb-page-header>

        <!-- لوحة مراحل القبول: الخطوات + إجراء المرحلة الحالية (بديل الأزرار المبعثرة) -->
        <div class="adm-flow">
          <div class="adm-stepper" [class.negative]="isNegative()">
            @for (st of stages; track st.key; let i = $index) {
              <div class="adm-step"
                   [class.done]="i < currentStageIndex()"
                   [class.active]="i === currentStageIndex()">
                <span class="adm-step-dot">{{ i < currentStageIndex() ? '✓' : (i + 1) }}</span>
                <span class="adm-step-label">{{ i === 3 && isNegative() ? statusText(a.status) : st.label }}</span>
              </div>
              @if (i < stages.length - 1) { <span class="adm-step-line" [class.done]="i < currentStageIndex()"></span> }
            }
          </div>

          <!-- إجراءات المرحلة الحالية فقط -->
          <div class="adm-flow-actions">
            @switch (currentStageIndex()) {
              @case (0) {
                <span class="adm-flow-hint">الخطوة التالية: مراجعة الطلب ثم قبوله لتأهيله لامتحان القدرات.</span>
                <button type="button" class="nb-btn-ghost sm" (click)="scheduleInterview()">📅 جدولة مقابلة</button>
                <button type="button" class="nb-btn-danger sm" (click)="setStatus('rejected')">✕ رفض</button>
                <button type="button" class="nb-btn-warning sm" (click)="setStatus('waitlist')">⏳ انتظار</button>
                <button type="button" class="nb-btn-primary" (click)="qualifyForExam()">✓ قبول الطلب</button>
              }
              @case (1) {
                <span class="adm-flow-hint">المتقدم مؤهّل — ارصد درجات امتحان القدرات أدناه.</span>
                <button type="button" class="nb-btn-danger sm" (click)="setStatus('rejected')">✕ رفض</button>
                <button type="button" class="nb-btn-primary" (click)="scrollToAptitude()">📝 رصد الدرجات</button>
              }
              @case (2) {
                <span class="adm-flow-hint">رُصدت الدرجات — اعتمد القرار النهائي.</span>
                <button type="button" class="nb-btn-danger sm" (click)="setStatus('rejected')">✕ رفض</button>
                <button type="button" class="nb-btn-warning sm" (click)="setStatus('waitlist')">⏳ انتظار</button>
                <button type="button" class="nb-btn-primary" (click)="finalizeAccept()">✓ القبول النهائي</button>
              }
              @case (3) {
                @if (a.status === 'accepted') {
                  <span class="adm-flow-hint">تم القبول النهائي — حوّله إلى طالب مُسجّل.</span>
                  <button type="button" class="nb-btn-ghost sm" (click)="setStatus('qualified_exam')">↩︎ إعادة للقدرات</button>
                  <button type="button" class="nb-btn-primary" (click)="enrollAsStudent()">🎓 تسجيل كطالب</button>
                } @else {
                  <span class="adm-flow-hint">الطلب في حالة {{ statusText(a.status) }}.</span>
                  <button type="button" class="nb-btn-ghost sm" (click)="setStatus('qualified_exam')">↩︎ إعادة للقدرات</button>
                }
              }
              @case (4) {
                <span class="adm-flow-hint">✓ اكتمل التسجيل — المتقدم الآن طالب مُسجّل.</span>
              }
            }
          </div>
        </div>

        <!-- شريط الوسوم والمعلومات السريعة -->
        <div class="meta-row-bar">
          <span [class]="'nb-badge-' + statusKind(a.status)">{{ statusText(a.status) }}</span>
          
          <span class="school-branch-chip" [class.boys]="targetSchool(a) === 'boys'" [class.girls]="targetSchool(a) === 'girls'">
            {{ targetSchool(a) === 'girls' ? '👧 مدرسة البنات' : '👦 مدرسة البنين' }}
          </span>

          <span class="meta-item"><b>الجنسية:</b> {{ a.nationality || 'سوداني' }}</span>
          <span class="meta-item"><b>الجنس:</b> {{ a.gender === 'female' ? 'أنثى' : 'ذكر' }}</span>
          <span class="meta-item"><b>تاريخ الميلاد:</b> {{ a.date_of_birth }}</span>
          <span class="meta-item"><b>مكان الميلاد:</b> {{ a.birth_place || '—' }}</span>
        </div>

        <!-- لوحة امتحان القدرات: تظهر من مرحلة التأهّل حتى القرار -->
        @if (currentStageIndex() >= 1) {
          <nb-panel title="🎯 امتحان القدرات ونتيجة القبول" style="margin-top:16px" id="aptitude-panel">
            @if (aptitudeScores().length === 0) {
              <div class="empty-box">لم تُعرّف مواد امتحان القدرات في إعدادات القبول بعد. عرّفها من إعدادات القبول ثم أعد «قبول الطلب».</div>
            } @else {
              <div class="apt-grid">
                @for (row of aptitudeScores(); track row.subject; let i = $index) {
                  <div class="apt-cell">
                    <label>{{ row.subject }} <span class="apt-hint">(النجاح ≥ {{ row.pass }} من {{ row.max }})</span></label>
                    <input type="number" min="0" [max]="row.max"
                           [disabled]="a.status !== 'qualified_exam' && a.status !== 'exam_scored'"
                           [(ngModel)]="row.marks"
                           [class.pass]="row.marks !== null && row.marks >= row.pass"
                           [class.fail]="row.marks !== null && row.marks < row.pass"
                           placeholder="—" />
                  </div>
                }
              </div>

              @if (a.status === 'qualified_exam' || a.status === 'exam_scored') {
                <div class="apt-actions">
                  <button type="button" class="nb-btn-primary" [disabled]="savingAptitude()" (click)="saveAptitude()">
                    {{ savingAptitude() ? '⏳ جارٍ الحفظ' : '💾 حفظ درجات القدرات' }}
                  </button>
                </div>
              }

              @if (evaluation(); as ev) {
                <div class="apt-eval" [class.ok]="ev.recommended_decision === 'accepted'" [class.no]="ev.recommended_decision === 'rejected'">
                  <div class="apt-eval-row">
                    <span>المجموع الكلي:</span> <b>{{ ev.total }}</b>
                    @if (ev.total_pass !== null) { <span class="apt-hint">(المطلوب ≥ {{ ev.total_pass }})</span> }
                  </div>
                  <div class="apt-eval-row">
                    <span>اجتياز كل المواد:</span> <b>{{ ev.all_subjects_passed ? 'نعم ✓' : 'لا ✕' }}</b>
                  </div>
                  @if (ev.recommended_decision) {
                    <div class="apt-eval-verdict">
                      القرار المقترح:
                      <b>{{ ev.recommended_decision === 'accepted' ? 'مستوفٍ لشروط القبول ✓' : 'غير مستوفٍ ✕' }}</b>
                    </div>
                  }
                </div>
              }
            }
          </nb-panel>
        }

        <!-- 1) البيانات الشخصية للتلميذ والأكاديمية -->
        <nb-panel title="أ / البيانات الشخصية والأكاديمية للتلميذ">
          <div class="info-grid">
            <div class="info-item"><strong>اسم التلميذ رباعياً:</strong> {{ a.arabic_full_name }}</div>
            <div class="info-item"><strong>الاسم بالإنجليزي:</strong> {{ a.english_full_name || '—' }}</div>
            <div class="info-item"><strong>الرقم الوطني للتلميذ:</strong> {{ a.national_id || '—' }}</div>
            <div class="info-item"><strong>رقم الجواز:</strong> {{ a.passport_number || '—' }}</div>
            <div class="info-item"><strong>الديانة / فصيلة الدم:</strong> {{ a.religion || 'مسلم' }} · {{ a.blood_group || '—' }}</div>
            <div class="info-item"><strong>المدرسة والصف السابقتين:</strong> {{ a.previous_school || '—' }} ({{ a.previous_grade || '—' }})</div>
            <div class="info-item"><strong>المعدل / النسبة السابقة:</strong> {{ a.previous_grade_score || '—' }}</div>
            <div class="info-item"><strong>احتياجات خاصة:</strong> {{ a.special_needs || 'لا يوجد' }}</div>
          </div>
        </nb-panel>

        <!-- 2) أولياء الأمور وحساب بوابة ولي الأمر + البديل للطوارئ -->
        <div class="two-col" style="margin-top:16px">
          <nb-panel title="ب / ولي الأمر الرئيسي وربط البوابة" [flush]="true">
            @if (primaryGuardian(); as g) {
              <div class="g-details-box">
                <div class="g-row"><span>صلة القرابة:</span> <b>{{ relationText(g.relationship) }}</b></div>
                <div class="g-row"><span>اسم ولي الأمر:</span> <b>{{ g.full_name }}</b></div>
                <div class="g-row"><span>الرقم الوطني (ربط البوابة):</span> <b class="highlight-code">{{ g.national_id || '—' }}</b></div>
                <div class="g-row"><span>هاتف ولي الأمر (1):</span> <b>{{ g.phone }}</b></div>
                <div class="g-row"><span>هاتف ولي الأمر (2):</span> <b>{{ g.phone2 || '—' }}</b></div>
                <div class="g-row">
                  <span>رقم الواتساب المعتمد:</span>
                  <b class="wa-num" [class.wa-invalid]="!isValidE164(g.whatsapp_phone)" dir="ltr">{{ g.whatsapp_phone || g.phone }}</b>
                  @if (!isValidE164(g.whatsapp_phone)) {
                    <span class="wa-warn" title="الرقم غير مخزّن بصيغة دولية صحيحة">⚠️ ينقصه رمز الدولة</span>
                  }
                  <button type="button" class="mini-edit-btn" (click)="startEditWa(g)">✏️ تصحيح</button>
                  @if (g.whatsapp_phone || g.phone) {
                    <button type="button" class="mini-wa-btn" (click)="openWhatsappModal(a.status)">
                      📱 مراسلة فوريـة
                    </button>
                  }
                </div>
                @if (editingWaId() === g.id) {
                  <div class="wa-edit-box">
                    <div class="wa-edit-row">
                      <select [(ngModel)]="waCode" (change)="updateComposedWa()" class="wa-edit-select">
                        @for (c of waCountries; track c.code) {
                          <option [value]="c.code">{{ c.name }} ({{ c.code }})</option>
                        }
                      </select>
                      <input inputmode="numeric" [maxlength]="selectedWaCountry().len[1]"
                             [(ngModel)]="waBody" (input)="updateComposedWa()"
                             [placeholder]="'مثال: ' + selectedWaCountry().sample" class="wa-edit-input" dir="ltr" />
                      <button type="button" class="nb-btn-whatsapp" [disabled]="!!waErr() || !composedWa() || savingWa()" (click)="saveWaNumber(g)">
                        {{ savingWa() ? '⏳' : '💾 حفظ' }}
                      </button>
                      <button type="button" class="mini-edit-btn" (click)="editingWaId.set(null)">إلغاء</button>
                    </div>
                    @if (waErr()) {
                      <span class="val-err">{{ waErr() }}</span>
                    } @else if (composedWa()) {
                      <span class="val-ok">✓ سيُحفظ بصيغة دولية: <b dir="ltr">{{ composedWa() }}</b></span>
                    }
                  </div>
                }
                <div class="g-row"><span>المهنة وعنوان العمل:</span> <b>{{ g.occupation || '—' }} · {{ g.work_address || '—' }}</b></div>
                <div class="g-row"><span>السكن / رقم العمارة:</span> <b>{{ g.address || '—' }} (منزل {{ g.building_number || '—' }})</b></div>
                <div class="g-row"><span>هاتف والدة التلميذ:</span> <b>{{ g.mother_phone || '—' }} {{ g.mother_proxy_name ? '(' + g.mother_proxy_name + ')' : '' }}</b></div>
              </div>
            } @else {
              <div class="empty-box">لا يوجد ولي أمر رئيسي مسجل.</div>
            }
          </nb-panel>

          <nb-panel title="ج / الشخص البديل في حالة الغياب (الطوارئ)" [flush]="true">
            @if (primaryGuardian(); as g) {
              @if (g.emergency_contact_name) {
                <div class="g-details-box emergency-box">
                  <div class="g-row"><span>اسم الشخص البديل:</span> <b>{{ g.emergency_contact_name }}</b></div>
                  <div class="g-row"><span>صلة القرابة بالبديل:</span> <b>{{ g.emergency_contact_relation || '—' }}</b></div>
                  <div class="g-row"><span>رقم هاتف البديل:</span> <b>{{ g.emergency_contact_phone || '—' }}</b></div>
                  <div class="g-row"><span>عنوان الشخص البديل:</span> <b>{{ g.emergency_contact_address || '—' }}</b></div>
                  <p class="emerg-hint">يرجع لهذا الشخص تلقائياً في حالة تعذر الوصول لولي الأمر الرئيسي.</p>
                </div>
              } @else {
                <div class="empty-box">لم يتم تسجيل شخص بديل للطوارئ لهذا الطلب.</div>
              }
            }
          </nb-panel>
        </div>

        <!-- 3) البيانات الصحية والاجتماعية والترحيل + الأشقاء -->
        <div class="two-col" style="margin-top:16px">
          <nb-panel title="د / الملف الصحي والاجتماعي والترحيل">
            <div class="info-grid vertical">
              <div class="info-item">
                <strong>الحالة الصحية (تُربط بالعيادة):</strong> 
                <span [class.warn]="a.has_health_issues">{{ a.has_health_issues ? 'يوجد ظروف صحية' : 'سليم والحمد لله' }}</span>
                @if (a.has_health_issues && a.health_issues_details) {
                  <p class="sub-detail">{{ a.health_issues_details }}</p>
                }
              </div>

              <div class="info-item">
                <strong>الحالة الاجتماعية والإقامة:</strong> 
                <span>يقيم مع ({{ residesLabel(a.resides_with) }})</span>
                @if (a.has_social_issues && a.social_issues_details) {
                  <p class="sub-detail">{{ a.social_issues_details }}</p>
                }
              </div>

              <div class="info-item">
                <strong>قطاع النقل والترحيل الرسمي:</strong> 
                <b>{{ transportLabel(a.transport_mode) }}</b>
              </div>

              <div class="info-item">
                <strong>الاعتماد في المذاكرة:</strong> 
                <span>{{ a.study_dependence === 'other' ? 'غيره (دروس / مدرس)' : 'نفسه' }}</span>
              </div>
            </div>
          </nb-panel>

          <nb-panel title="هـ / الأشقاء بالمدرسة واللوائح المعتمدة">
            <div class="info-grid vertical">
              <div class="info-item">
                <strong>الأشقاء بالمورد النموذجية:</strong> 
                <span>{{ a.has_siblings ? 'يوجد أشقاء مسجلين' : 'لا يوجد أشقاء' }}</span>
                @if (a.has_siblings && a.siblings_details) {
                  <p class="sub-detail">تفاصيل: {{ a.siblings_details }} (قسم {{ a.siblings_section || 'إبتدائي' }})</p>
                }
              </div>

              <div class="info-item">
                <strong>موافقة اللوائح المدرسية:</strong>
                <div class="rules-chips">
                  <span class="rule-chip" [class.ok]="a.agreed_to_admin_rules">اللوائح الإدارية (24 بنداً) {{ a.agreed_to_admin_rules ? '✓' : '✕' }}</span>
                  <span class="rule-chip" [class.ok]="a.agreed_to_academic_rules">اللوائح الأكاديمية (13 بنداً) {{ a.agreed_to_academic_rules ? '✓' : '✕' }}</span>
                  <span class="rule-chip" [class.ok]="a.agreed_to_mobile_policy">تعهد حظر الهواتف {{ a.agreed_to_mobile_policy ? '✓' : '✕' }}</span>
                </div>
              </div>
            </div>
          </nb-panel>
        </div>

        <!-- 4) المستندات والمقابلات واختبارات المستوى -->
        <div class="two-col" style="margin-top:16px">
          <nb-panel title="و / المستندات المطلوبة والتحقق" [flush]="true">
            <nb-data-table [columns]="docCols" [rows]="documents()" emptyText="لا توجد مستندات مرفوعة.">
              <ng-template #cell let-row let-col="col" let-value="value">
                @switch (col.key) {
                  @case ('verification_status') { <span [class]="'nb-badge-' + docKind(row.verification_status)">{{ docText(row.verification_status) }}</span> }
                  @default { {{ value }} }
                }
              </ng-template>
            </nb-data-table>
          </nb-panel>

          <nb-panel title="ز / المقابلات واختبارات تحديد المستوى" [flush]="true">
            <nb-data-table [columns]="interviewCols" [rows]="interviews()" emptyText="لا توجد مقابلات مجدولة بعد.">
              <ng-template #cell let-row let-col="col" let-value="value">
                @switch (col.key) {
                  @case ('scheduled_at') { {{ row.scheduled_at | date:'yyyy-MM-dd HH:mm' }} }
                  @case ('status') { <span [class]="'nb-badge-' + interviewKind(row.status)">{{ interviewText(row.status) }}</span> }
                  @default { {{ value }} }
                }
              </ng-template>
            </nb-data-table>
          </nb-panel>
        </div>
      </div>

      <!-- نافذة إشعار الواتساب التفاعلية المربوطة بموديول الاتصالات -->
      @if (showWaModal()) {
        <div class="modal-backdrop" (click)="showWaModal.set(false)">
          <div class="modal-box" (click)="$event.stopPropagation()" dir="rtl">
            <div class="modal-head">
              <span class="wa-icon">💬</span>
              <div>
                <h3>إرسال إشعار الواتساب الفوري لولي الأمر</h3>
                <span class="engine-badge">🟢 خدمة الرسائل الفورية مفعّلة</span>
              </div>
              <button type="button" class="close-btn" (click)="showWaModal.set(false)">✕</button>
            </div>
            
            <div class="modal-body">
              <div class="fld-row">
                <div class="fld"><label>المستلم:</label> <b>{{ primaryGuardian() ? primaryGuardian()!.full_name : a.arabic_full_name }}</b></div>
                <div class="fld"><label>الواتساب الدولي (E.164):</label> <b class="wa-num">{{ waPhone() }}</b></div>
              </div>

              <!-- اختيار نماذج المراسلة من موديول الاتصالات -->
              <div class="fld" style="margin-top:10px">
                <label>نموذج المراسلة المعتمد (Communications Template):</label>
                <select [(ngModel)]="selectedTemplateCode" (change)="onTemplateSelectChange()" class="tmpl-select">
                  @for (t of admTemplates(); track t.code) {
                    <option [value]="t.code">{{ templateOptionIcon(t.code) }} {{ t.name }}</option>
                  }
                  <option value="CUSTOM">✏️ نص مخصص بدون قالب</option>
                </select>
              </div>

              <div class="fld" style="margin-top:10px">
                <label>نص الرسالة المعالج ديناميكياً مع المتغيرات:</label>
                <textarea rows="5" [(ngModel)]="waMessageText" class="wa-textarea"></textarea>
              </div>

              <div class="vars-tags">
                <span>المتغيرات المستبدلة:</span>
                <code>{{ '{{guardian_name}}' }}</code>
                <code>{{ '{{student_name}}' }}</code>
                <code>{{ '{{application_number}}' }}</code>
                <code>{{ '{{school_name}}' }}</code>
              </div>

              @if (waSendFeedback(); as fb) {
                <div [class]="'toast-feedback ' + fb.status">
                  {{ fb.message }}
                </div>
              }
            </div>

            <div class="modal-foot">
              <button type="button" class="nb-btn-ghost" (click)="showWaModal.set(false)">إلغاء</button>
              
              <button type="button" class="nb-btn-secondary" (click)="sendDirectWhatsapp()">
                💬 فتح في تطبيق WhatsApp
              </button>

              <button type="button" class="nb-btn-whatsapp" [disabled]="isSendingWa()" (click)="sendEvolutionWhatsapp()">
                @if (isSendingWa()) {
                  ⏳ جارٍ الإرسال...
                } @else {
                  🚀 إرسال الإشعار الفوري
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- مودال المعايرة والطباعة الورقية -->
      @if (showPrintModal()) {
        <app-applicant-print-modal
          [applicant]="a"
          [guardian]="primaryGuardian() || defaultGuardianObj(a)"
          [academicYear]="academicYearName(a.academic_year_id)"
          [gradeName]="gradeName(a.applying_grade_id)"
          [fees]="printFees()"
          (close)="showPrintModal.set(false)"
        ></app-applicant-print-modal>
      }
    } @else {
      <div class="page" dir="rtl"><div class="loading">جارٍ تحميل تفاصيل طلب التسجيل…</div></div>
    }
  `,
  styles: [
    ADM_PAGE_STYLES,
    `
      .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; position: relative; }

      /* ==== لوحة مراحل القبول ==== */
      .adm-flow {
        margin: 14px 0 4px; padding: 14px 16px; border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius-card); background: var(--nb-surface);
        display: flex; flex-direction: column; gap: 12px;
      }
      .adm-flow-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; border-top: 1px dashed var(--nb-border); padding-top: 12px; }
      .adm-flow-hint { flex: 1; min-width: 200px; font-size: 13px; color: var(--nb-text-faint); font-weight: 600; }

      /* ==== شريط مراحل القبول (stepper) ==== */
      .adm-stepper { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
      .adm-step { display: flex; align-items: center; gap: 7px; padding: 5px 4px; }
      .adm-step-dot {
        width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
        font-size: 12px; font-weight: 700; background: var(--nb-surface); color: var(--nb-text-faint);
        border: 2px solid var(--nb-border); flex-shrink: 0; transition: all 200ms ease;
      }
      .adm-step-label { font-size: 13px; font-weight: 700; color: var(--nb-text-faint); white-space: nowrap; }
      .adm-step.done .adm-step-dot { background: var(--nb-success); color: #fff; border-color: var(--nb-success); }
      .adm-step.done .adm-step-label { color: var(--nb-text); }
      .adm-step.active .adm-step-dot { background: var(--nb-primary); color: #fff; border-color: var(--nb-primary); box-shadow: 0 0 0 4px color-mix(in srgb, var(--nb-primary) 20%, transparent); }
      .adm-step.active .adm-step-label { color: var(--nb-primary); }
      .adm-step-line { flex: 1; height: 2px; min-width: 16px; background: var(--nb-border); }
      .adm-step-line.done { background: var(--nb-success); }
      .adm-stepper.negative .adm-step.active .adm-step-dot { background: var(--nb-danger); border-color: var(--nb-danger); box-shadow: 0 0 0 4px color-mix(in srgb, var(--nb-danger) 20%, transparent); }
      .adm-stepper.negative .adm-step.active .adm-step-label { color: var(--nb-danger); }

      /* ==== لوحة امتحان القدرات ==== */
      .apt-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
      .apt-cell { display: flex; flex-direction: column; gap: 6px; }
      .apt-cell label { font-size: 13px; font-weight: 700; color: var(--nb-text); }
      .apt-hint { font-size: 11px; font-weight: 400; color: var(--nb-text-faint); }
      .apt-cell input {
        height: 40px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 12px;
        font-family: var(--nb-font-family); font-size: 15px; font-weight: 700; color: var(--nb-text);
        background: var(--nb-surface); outline: none; text-align: center;
      }
      .apt-cell input:focus { border-color: var(--nb-primary); }
      .apt-cell input.pass { border-color: var(--nb-success); background: color-mix(in srgb, var(--nb-success) 8%, var(--nb-surface)); }
      .apt-cell input.fail { border-color: var(--nb-danger); background: color-mix(in srgb, var(--nb-danger) 8%, var(--nb-surface)); }
      .apt-cell input:disabled { opacity: 0.7; cursor: not-allowed; }
      .apt-actions { margin-top: 16px; display: flex; justify-content: flex-start; }
      .apt-eval { margin-top: 16px; padding: 14px 16px; border-radius: var(--nb-radius-card); border: 1px solid var(--nb-border); background: var(--nb-surface); display: flex; flex-direction: column; gap: 8px; }
      .apt-eval.ok { border-color: var(--nb-success); background: color-mix(in srgb, var(--nb-success) 6%, var(--nb-surface)); }
      .apt-eval.no { border-color: var(--nb-danger); background: color-mix(in srgb, var(--nb-danger) 6%, var(--nb-surface)); }
      .apt-eval-row { font-size: 13px; display: flex; align-items: center; gap: 8px; }
      .apt-eval-verdict { font-size: 14px; font-weight: 700; margin-top: 4px; }

      .auto-toast-banner {
        position: sticky; top: 0; z-index: 100; margin-bottom: 16px;
        padding: 12px 18px; border-radius: var(--nb-radius-card); font-size: 13px; font-weight: 700;
        display: flex; align-items: center; gap: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        animation: slideDown 300ms ease;
      }
      @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      .auto-toast-banner.success { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
      .auto-toast-banner.error { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
      .toast-icon { font-size: 16px; }

      .meta-row-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; background: var(--nb-surface); border: 1px solid var(--nb-border); padding: 10px 14px; border-radius: var(--nb-radius-card); }
      .meta-item { font-size: 12.5px; color: var(--nb-text-secondary); }
      .meta-item b { color: var(--nb-text); font-weight: 700; }
      
      .school-branch-chip { font-size: 12px; font-weight: 800; padding: 4px 10px; border-radius: 20px; }
      .school-branch-chip.boys { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
      .school-branch-chip.girls { background: #fdf2f8; color: #be185d; border: 1px solid #fbcfe8; }
      
      .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
      .info-grid.vertical { grid-template-columns: 1fr; }
      .info-item { background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); padding: 12px 14px; border-radius: var(--nb-radius); font-size: 13px; color: var(--nb-text); }
      .info-item strong { color: var(--nb-text-muted); font-weight: 600; display: block; margin-bottom: 3px; font-size: 11.5px; }
      .info-item .warn { color: #dc2626; font-weight: 700; }
      .sub-detail { margin: 4px 0 0; font-size: 12px; color: var(--nb-text-secondary); background: var(--nb-bg); padding: 6px 10px; border-radius: 6px; }

      .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .two-col nb-panel { margin: 0; }
      @media (max-width: 900px) { .two-col { grid-template-columns: 1fr; } }
      
      .g-details-box { padding: 14px; display: flex; flex-direction: column; gap: 8px; font-size: 13px; }
      .g-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--nb-border-soft); padding-bottom: 6px; }
      .g-row span { color: var(--nb-text-muted); font-size: 12px; }
      .g-row b { color: var(--nb-text); font-weight: 700; }
      .highlight-code { font-family: monospace; font-size: 14px; color: var(--nb-primary-600); }
      .wa-num { direction: ltr; font-family: monospace; font-size: 13.5px; color: #15803d; }
      .emergency-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; }
      .emerg-hint { font-size: 11.5px; color: #b45309; margin: 6px 0 0; }

      .rules-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
      .rule-chip { font-size: 11.5px; padding: 3px 8px; border-radius: 6px; background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text-muted); }
      .rule-chip.ok { background: #f0fdf4; color: #166534; border-color: #bbf7d0; font-weight: 700; }

      .nb-btn-whatsapp { background: #25d366; color: #fff; border: none; font-weight: 700; padding: 0 14px; height: 34px; border-radius: var(--nb-radius); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; }
      .nb-btn-whatsapp:hover { background: #16a34a; }
      .nb-btn-whatsapp:disabled { opacity: 0.6; cursor: not-allowed; }
      .mini-wa-btn { padding: 2px 8px; background: #25d366; color: #fff; border: none; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer; margin-inline-start: 6px; }
      .mini-edit-btn { padding: 2px 8px; background: var(--nb-surface); color: var(--nb-text-secondary); border: 1px solid var(--nb-border); border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer; margin-inline-start: 6px; }
      .wa-num.wa-invalid { color: #b45309; }
      .wa-warn { font-size: 10.5px; color: #b45309; font-weight: 700; margin-inline-start: 6px; }
      .wa-edit-box { margin: 6px 0 4px; padding: 10px; background: var(--nb-bg); border: 1px dashed var(--nb-border); border-radius: 8px; display: flex; flex-direction: column; gap: 6px; }
      .wa-edit-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; direction: ltr; justify-content: flex-end; }
      .wa-edit-select { height: 34px; border: 1px solid var(--nb-border); border-radius: 6px; padding: 0 6px; font-size: 12px; font-weight: 700; font-family: "Segoe UI Emoji","Noto Color Emoji", system-ui, sans-serif; background: var(--nb-surface); color: var(--nb-text); }
      .wa-edit-input { height: 34px; width: 160px; border: 1px solid var(--nb-border); border-radius: 6px; padding: 0 10px; font-size: 13px; direction: ltr; text-align: left; background: var(--nb-surface); color: var(--nb-text); }
      .val-err { font-size: 11px; color: #dc2626; font-weight: 600; }
      .val-ok { font-size: 11px; color: #166534; font-weight: 600; }
      
      .empty-box { padding: 24px; text-align: center; color: var(--nb-text-muted); font-size: 12.5px; }
      .loading { text-align: center; padding: 40px; color: var(--nb-text-muted); font-size: 13px; }

      /* مودال الواتساب المتطور */
      .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
      .modal-box { width: 100%; max-width: 560px; background: var(--nb-surface, #fff); border-radius: 14px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); overflow: hidden; display: flex; flex-direction: column; }
      .modal-head { background: #15803d; color: #fff; padding: 14px 18px; display: flex; align-items: center; gap: 12px; }
      .modal-head h3 { margin: 0; font-size: 15px; font-weight: 700; }
      .engine-badge { font-size: 11px; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 10px; }
      .close-btn { background: transparent; border: none; color: #fff; font-size: 18px; cursor: pointer; margin-inline-start: auto; }
      .modal-body { padding: 18px; display: flex; flex-direction: column; gap: 10px; }
      .fld-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; background: #f8fafc; padding: 10px; border-radius: 8px; }
      .tmpl-select { width: 100%; height: 38px; border: 1px solid var(--nb-border, #cbd5e1); border-radius: 8px; padding: 0 10px; font-size: 13px; font-weight: 700; background: #fff; color: #0f172a; outline: none; }
      .wa-textarea { width: 100%; border: 1px solid var(--nb-border, #cbd5e1); border-radius: 8px; padding: 10px; font-family: var(--nb-font-family); font-size: 13px; color: #0f172a; resize: vertical; line-height: 1.6; box-sizing: border-box; }
      .vars-tags { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 11.5px; color: #64748b; }
      .vars-tags code { font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; color: #1e293b; }
      
      .toast-feedback { padding: 10px; border-radius: 8px; font-size: 12.5px; font-weight: 700; text-align: center; margin-top: 6px; }
      .toast-feedback.success { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
      .toast-feedback.error { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

      .modal-foot { padding: 12px 18px; background: var(--nb-surface-raised, #f8fafc); border-top: 1px solid var(--nb-border, #e2e8f0); display: flex; justify-content: flex-end; gap: 10px; }
    `,
  ],
})
export class ApplicationDetailsComponent implements OnInit {
  private readonly service = inject(AdmissionsService);
  private readonly commsService = inject(CommunicationsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  readonly applicant = signal<Applicant | null>(null);
  readonly guardians = signal<Guardian[]>([]);
  readonly documents = signal<RequiredDocument[]>([]);
  readonly interviews = signal<Interview[]>([]);
  readonly placements = signal<PlacementTest[]>([]);

  // ---- مراحل القبول (stepper) وامتحان القدرات ----
  readonly stages = ADMISSION_STAGES;
  readonly currentStageIndex = computed(() => admissionStageIndex(this.applicant()?.status || 'submitted'));
  readonly isNegative = computed(() => isNegativeDecision(this.applicant()?.status || ''));
  /** درجات القدرات القابلة للتحرير في نموذج الرصد: [{ subject, marks }]. */
  readonly aptitudeScores = signal<Array<{ subject: string; marks: number | null; max: number; pass: number }>>([]);
  readonly savingAptitude = signal(false);
  readonly evaluation = signal<AptitudeEvaluation | null>(null);

  // مراجع أكاديمية لتحويل UUID → اسم مقروء (العام/الصف) في العرض والطباعة
  readonly grades = signal<any[]>([]);
  readonly academicYears = signal<any[]>([]);
  // الرسوم المعروضة في الاستمارة الورقية — من إعدادات القبول (أو الافتراضيات)
  readonly printFees = signal<AdmissionFees>(DEFAULT_ADMISSION_FEES);

  readonly showPrintModal = signal(false);
  readonly showWaModal = signal(false);
  readonly isSendingWa = signal(false);
  readonly waSendFeedback = signal<{ status: 'success' | 'error'; message: string } | null>(null);

  // شريط التنبيه الفوري التلقائي عند اتخاذ قرار
  readonly autoNotificationToast = signal<{ status: 'success' | 'error'; message: string } | null>(null);

  selectedTemplateCode = 'ADM_ACCEPTED';
  waMessageText = '';

  // القوالب المعتمدة تُجلب من موديول قوالب الرسائل (المصدر الموحّد). أي تعديل هناك ينعكس هنا.
  readonly admTemplates = signal<{ code: string; name: string; body: string }[]>(DEFAULT_ADM_TEMPLATES);

  // ---- تصحيح رقم الواتساب المعتمد (E.164) للأرقام القديمة ----
  readonly waCountries = [
    { code: '+249', name: '🇸🇩 السودان', len: [9, 9], sample: '9XXXXXXXX' },
    { code: '+966', name: '🇸🇦 السعودية', len: [9, 9], sample: '5XXXXXXXX' },
    { code: '+20',  name: '🇪🇬 مصر', len: [10, 10], sample: '1XXXXXXXXX' },
    { code: '+971', name: '🇦🇪 الإمارات', len: [9, 9], sample: '5XXXXXXXX' },
    { code: '+974', name: '🇶🇦 قطر', len: [8, 8], sample: '3XXXXXXX' },
    { code: '+968', name: '🇴🇲 عُمان', len: [8, 8], sample: '9XXXXXXX' },
    { code: '+965', name: '🇰🇼 الكويت', len: [8, 8], sample: '5XXXXXXX' },
    { code: '+973', name: '🇧🇭 البحرين', len: [8, 8], sample: '3XXXXXXX' },
    { code: '+962', name: '🇯🇴 الأردن', len: [9, 9], sample: '7XXXXXXXX' },
    { code: '+90',  name: '🇹🇷 تركيا', len: [10, 10], sample: '5XXXXXXXXX' },
    { code: '+44',  name: '🇬🇧 المملكة المتحدة', len: [10, 10], sample: '7XXXXXXXXX' },
    { code: '+1',   name: '🇺🇸 أمريكا / كندا', len: [10, 10], sample: 'XXXXXXXXXX' },
  ];
  readonly editingWaId = signal<string | null>(null);
  readonly composedWa = signal('');
  readonly waErr = signal('');
  readonly savingWa = signal(false);
  waCode = '+249';
  waBody = '';

  private id = '';

  readonly primaryGuardian = computed(() => this.guardians()[0] || null);

  readonly guardianCols: NbColumn[] = [
    { key: 'relationship', label: 'صلة القرابة', fr: 0.8 },
    { key: 'full_name', label: 'الاسم', fr: 1.4 },
    { key: 'phone', label: 'الهاتف', fr: 1 },
    { key: 'whatsapp_phone', label: 'الواتساب الدولي', fr: 1.2 },
  ];
  readonly docCols: NbColumn[] = [
    { key: 'document_name', label: 'المستند', fr: 2 },
    { key: 'verification_status', label: 'الحالة', fr: 1 },
  ];
  readonly interviewCols: NbColumn[] = [
    { key: 'scheduled_at', label: 'الموعد', fr: 1.4 },
    { key: 'status', label: 'الحالة', fr: 0.9 },
  ];

  statusText = applicantStatusText;
  statusKind = applicantStatusKind;
  docText = (s: string) => DOC_STATUS_TEXT[s] || s;
  docKind = docStatusKind;
  interviewText = (s: string) => INTERVIEW_STATUS_TEXT[s] || s;
  interviewKind = interviewStatusKind;
  relationText = (r: string) => RELATION_TEXT[r] || r;

  targetSchool(a: Applicant): string {
    return (a as any)['target_school_type'] || (a.gender === 'female' ? 'girls' : 'boys');
  }

  residesLabel(val?: string): string {
    switch (val) {
      case 'parents': return 'الأم والأب';
      case 'father': return 'الأب';
      case 'mother': return 'الأم';
      default: return val || 'الأم والأب';
    }
  }

  transportLabel(val?: string): string {
    switch (val) {
      case 'school': return 'ترحيل المدرسة الرسمي';
      case 'private': return 'ترحيل خاص';
      case 'public': return 'المواصلات العامة';
      case 'walking': return 'الأقدام';
      default: return val || 'ترحيل المدرسة';
    }
  }

  ngOnInit(): void {
    this.route.params.subscribe((p) => {
      this.id = p['id'];
      if (this.id) this.loadAll();
    });
    this.loadApprovedTemplates();
  }

  /**
   * جلب القوالب المعتمدة من موديول قوالب الرسائل (المصدر الموحّد لكل المراسلات).
   * القوالب الافتراضية للقبول تُزرع تلقائياً في الخلفية إن لم تكن موجودة، فتظهر في
   * صفحة القوالب وتصبح قابلة للتعديل، وأي تعديل ينعكس على كل الموديولات.
   */
  private loadApprovedTemplates(): void {
    this.commsService.getTemplates().subscribe((list) => {
      const all = Array.isArray(list) ? list : [];
      const adm = all.filter((t) => t.category === 'admission' || (t.code || '').startsWith('ADM_'));
      const byCode = new Map(adm.map((t) => [t.code, t]));

      // زرع أي قالب قبول افتراضي مفقود في الخلفية (idempotent — مرة واحدة لكل مستأجر)
      // يشمل قالب تأكيد الاستلام (ADM_SUBMITTED) الذي تستهلكه الاستمارة العامة.
      const seeds = [...DEFAULT_ADM_TEMPLATES, ADM_SUBMITTED_TEMPLATE];
      for (const def of seeds) {
        if (!byCode.has(def.code)) {
          this.commsService.createTemplate({
            name: def.name, code: def.code, category: 'admission',
            language: 'ar', body: def.body, content_type: 'plain_text', is_active: true,
          }).subscribe((saved) => {
            if (saved) byCode.set(def.code, saved as CommunicationTemplate);
          });
        }
      }

      const merged = DEFAULT_ADM_TEMPLATES.map((def) => {
        const remote = byCode.get(def.code);
        return { code: def.code, name: remote?.name || def.name, body: remote?.body || def.body };
      });
      // إضافة أي قوالب قبول أخرى موجودة في الخلفية وليست ضمن الافتراضية
      // (باستثناء قالب تأكيد الاستلام التلقائي — ليس قرار قبول يدوي)
      for (const t of adm) {
        if (t.code === 'ADM_SUBMITTED') continue;
        if (!merged.some((m) => m.code === t.code)) {
          merged.push({ code: t.code, name: t.name, body: t.body });
        }
      }
      this.admTemplates.set(merged);
    });
  }

  templateOptionIcon(code: string): string {
    const icons: Record<string, string> = {
      ADM_ACCEPTED: '✓', ADM_WAITLIST: '⏳', ADM_REJECTED: '✕', ADM_INTERVIEW: '📅',
    };
    return icons[code] || '📝';
  }

  /** أسماء الصف والعام من المعرّفات (fallback للنص كما هو إن لم يوجد). */
  gradeName(id?: string): string {
    if (!id) return '—';
    const g = this.grades().find((x) => x.id === id);
    return g?.name || g?.arabic_name || id;
  }

  academicYearName(id?: string): string {
    if (!id) return '—';
    const y = this.academicYears().find((x) => x.id === id);
    return y?.name || y?.title || id;
  }

  private loadAll(): void {
    this.service.getApplicant(this.id).subscribe((res) => this.applicant.set(res?.data ?? res ?? null));
    this.service.getGrades().subscribe((res) => this.grades.set(pickList<any>(res)));
    this.service.getAcademicYears().subscribe((res) => this.academicYears.set(pickList<any>(res)));
    // رسوم الطباعة من إعدادات القبول (fallback للافتراضيات عند غياب الضبط)
    this.service.getAdmissionSettings().subscribe((res) => {
      const d = res?.data ?? res ?? {};
      const hasFees = Number(d.registration_fee) > 0 || Number(d.annual_tuition) > 0
        || (d.fee_installments?.length ?? 0) > 0 || (d.fee_notes?.length ?? 0) > 0;
      if (hasFees) {
        this.printFees.set({
          registration_fee: Number(d.registration_fee ?? 0),
          annual_tuition: Number(d.annual_tuition ?? 0),
          fee_currency: d.fee_currency ?? 'جنيه',
          fee_installments: d.fee_installments ?? [],
          fee_notes: d.fee_notes ?? [],
        });
      }
    });
    this.service.getGuardians().subscribe((res) => this.guardians.set(pickList<Guardian>(res).filter((g) => g.applicant === this.id)));
    this.service.getDocuments().subscribe((res) => this.documents.set(pickList<RequiredDocument>(res).filter((d) => d.applicant === this.id)));
    this.service.getInterviews().subscribe((res) => this.interviews.set(pickList<Interview>(res).filter((i) => i.applicant === this.id)));
    this.service.getPlacementTests().subscribe((res) => {
      const tests = pickList<PlacementTest>(res).filter((t) => t.applicant === this.id);
      this.placements.set(tests);
      if (tests.length) {
        this.aptitudeScores.set(tests.map((t) => ({
          subject: t.exam_type,
          marks: t.marks_obtained ?? null,
          max: t.max_marks ?? 100,
          pass: t.passing_marks ?? 50,
        })));
      } else {
        // لا صفوف بعد (لم تُعرّف المواد وقت التأهيل) — اعرض المواد الافتراضية للإدخال؛ يُنشئها الحفظ.
        this.aptitudeScores.set(DEFAULT_APTITUDE_SUBJECTS.map((s) => ({
          subject: s.name, marks: null, max: s.max, pass: s.pass,
        })));
      }
    });
    // تقييم القبول المحسوب يظهر بعد رصد الدرجات
    this.service.getAptitudeEvaluation(this.id).subscribe({
      next: (res) => this.evaluation.set(res?.data ?? null),
      error: () => this.evaluation.set(null),
    });
  }

  // ==== إجراءات مراحل القبول ====

  /** «قبول الطلب» → تأهيل لامتحان القدرات (ينشئ صفوف المواد من الإعدادات). */
  qualifyForExam(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'قبول الطلب',
        message: 'قبول الطلب يؤهّل المتقدم لدخول <strong>امتحان القدرات</strong>. سيتم تجهيز مواد الامتحان. متابعة؟',
        confirmText: 'قبول الطلب', color: 'primary',
      },
    });
    ref.afterClosed().subscribe((ok: boolean) => {
      if (!ok) return;
      this.service.qualifyForExam(this.id).subscribe((res) => {
        this.applicant.set(res?.data ?? { ...(this.applicant() as Applicant), status: 'qualified_exam' });
        this.loadAll();
      });
    });
  }

  /** حفظ درجات القدرات المرصودة → الحالة exam_scored. */
  saveAptitude(): void {
    const rows = this.aptitudeScores().filter((r) => r.marks !== null && r.marks !== undefined);
    if (!rows.length) return;
    this.savingAptitude.set(true);
    const scores = rows.map((r) => ({ subject: r.subject, marks: Number(r.marks) }));
    this.service.recordAptitude(this.id, scores).subscribe({
      next: (res) => {
        this.applicant.set(res?.data ?? { ...(this.applicant() as Applicant), status: 'exam_scored' });
        this.savingAptitude.set(false);
        this.loadAll();
      },
      error: () => this.savingAptitude.set(false),
    });
  }

  /** القبول النهائي بعد رصد الدرجات (يعيد استخدام حالة accepted وقالب واتساب). */
  finalizeAccept(): void {
    const ev = this.evaluation();
    const warn = ev && ev.recommended_decision === 'rejected'
      ? '<br><span style="color:var(--nb-danger)">⚠️ التقييم المحسوب لا يستوفي شروط القبول.</span>' : '';
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      data: {
        title: 'القبول النهائي',
        message: `اعتماد <strong>القبول النهائي</strong> للمتقدم بناءً على درجات القدرات؟${warn}`,
        confirmText: 'قبول نهائي', color: 'primary',
      },
    });
    ref.afterClosed().subscribe((ok: boolean) => {
      if (!ok) return;
      this.service.acceptApplicant(this.id).subscribe((res) => {
        this.applicant.set(res?.data ?? { ...(this.applicant() as Applicant), status: 'accepted' });
        this.autoSendWhatsappNotification('accepted');
      });
    });
  }

  waPhone(): string {
    const g = this.primaryGuardian();
    return g?.whatsapp_phone || g?.phone || '';
  }

  onTemplateSelectChange(): void {
    this.renderSelectedTemplate();
  }

  private renderSelectedTemplate(extraVars?: { interviewDate?: string }): string {
    const a = this.applicant();
    const g = this.primaryGuardian();
    const studentName = a?.arabic_full_name || 'التلميذ/ة';
    const guardianName = g?.full_name || 'ولي الأمر المحترم';
    const appNum = a?.application_number || '';
    const schoolName = this.targetSchool(a!) === 'girls' ? 'مدرسة البنات' : 'مدرسة البنين';

    const tmplObj = this.admTemplates().find((t) => t.code === this.selectedTemplateCode);
    if (!tmplObj || this.selectedTemplateCode === 'CUSTOM') {
      return this.waMessageText;
    }

    let text = tmplObj.body;
    text = text.replace(/\{\{guardian_name\}\}/g, guardianName);
    text = text.replace(/\{\{student_name\}\}/g, studentName);
    text = text.replace(/\{\{application_number\}\}/g, appNum);
    text = text.replace(/\{\{school_name\}\}/g, schoolName);
    text = text.replace(/\{\{interview_date\}\}/g, extraVars?.interviewDate || 'المحدد بالنظام');

    this.waMessageText = text;
    return text;
  }

  openWhatsappModal(status: string): void {
    if (status === 'accepted') this.selectedTemplateCode = 'ADM_ACCEPTED';
    else if (status === 'rejected') this.selectedTemplateCode = 'ADM_REJECTED';
    else if (status === 'waitlist') this.selectedTemplateCode = 'ADM_WAITLIST';
    else if (status === 'interview_scheduled') this.selectedTemplateCode = 'ADM_INTERVIEW';
    else this.selectedTemplateCode = 'ADM_ACCEPTED';

    this.renderSelectedTemplate();
    this.waSendFeedback.set(null);
    this.showWaModal.set(true);
  }

  /**
   * إرسال تلقائي مباشر لإشعار الواتساب عند اتخاذ قرار بدون إيقاف المستخدم
   */
  private autoSendWhatsappNotification(status: string, extraVars?: { interviewDate?: string }): void {
    const phone = this.waPhone();
    if (!phone) return;

    if (status === 'accepted') this.selectedTemplateCode = 'ADM_ACCEPTED';
    else if (status === 'rejected') this.selectedTemplateCode = 'ADM_REJECTED';
    else if (status === 'waitlist') this.selectedTemplateCode = 'ADM_WAITLIST';
    else if (status === 'interview_scheduled') this.selectedTemplateCode = 'ADM_INTERVIEW';

    const text = this.renderSelectedTemplate(extraVars);

    const payload = {
      channel: 'whatsapp',
      channel_type: 'whatsapp',
      recipient_address: phone,
      recipient_name: this.primaryGuardian()?.full_name || 'ولي الأمر',
      subject: `إشعار القبول والنتائج - مدارس نبراس`,
      body: text,
      template_code: this.selectedTemplateCode,
      applicant_id: this.id,
    };

    const actionText = status === 'accepted' ? 'قبول الطلب' : status === 'rejected' ? 'نتيجة المفاضلة' : status === 'waitlist' ? 'قائمة الانتظار' : 'تحديد موعد المقابلة';

    this.commsService.sendMessage(payload).subscribe({
      next: () => {
        this.autoNotificationToast.set({
          status: 'success',
          message: `✓ تم تحديث حالة الطلب (${actionText}) وإرسال إشعار الواتساب التلقائي لولي الأمر بنجاح.`,
        });
        setTimeout(() => this.autoNotificationToast.set(null), 5000);
      },
      error: () => {
        this.autoNotificationToast.set({
          status: 'error',
          message: `⚠️ تم تحديث حالة الطلب (${actionText}) وتعذر إرسال الواتساب التلقائي. يمكنك إعادته من زر الإشعار.`,
        });
        setTimeout(() => this.autoNotificationToast.set(null), 5000);
      },
    });
  }

  sendEvolutionWhatsapp(): void {
    const phone = this.waPhone();
    if (!phone) {
      this.waSendFeedback.set({ status: 'error', message: 'رقم هاتف الواتساب لولي الأمر غير متوفر.' });
      return;
    }

    this.isSendingWa.set(true);
    this.waSendFeedback.set(null);

    const payload = {
      channel: 'whatsapp',
      channel_type: 'whatsapp',
      recipient_address: phone,
      recipient_name: this.primaryGuardian()?.full_name || 'ولي الأمر',
      subject: `إشعار القبول والنتائج - مدارس نبراس`,
      body: this.waMessageText,
      template_code: this.selectedTemplateCode,
      applicant_id: this.id,
    };

    this.commsService.sendMessage(payload).subscribe({
      next: (res) => {
        this.isSendingWa.set(false);
        if (res && res.status === 'error') {
          this.waSendFeedback.set({ status: 'error', message: res.message || 'تعذر إرسال الإشعار حالياً. يرجى التأكد من الرقم والمحاولة لاحقاً.' });
        } else {
          this.waSendFeedback.set({ status: 'success', message: '✓ تم إرسال إشعار الواتساب لولي الأمر وتوثيقه بسجلات النظام بنجاح!' });
          setTimeout(() => {
            this.showWaModal.set(false);
            this.waSendFeedback.set(null);
          }, 2200);
        }
      },
      error: () => {
        this.isSendingWa.set(false);
        this.waSendFeedback.set({ status: 'error', message: 'تعذر الاتصال بخدمة الرسائل الفورية.' });
      },
    });
  }

  sendDirectWhatsapp(): void {
    let rawPhone = this.waPhone().replace(/\D/g, '');
    if (!rawPhone) return;
    if (!rawPhone.startsWith('249') && !rawPhone.startsWith('966') && !rawPhone.startsWith('20') && rawPhone.length === 9) {
      rawPhone = '249' + rawPhone;
    }
    const url = `https://wa.me/${rawPhone}?text=${encodeURIComponent(this.waMessageText)}`;
    window.open(url, '_blank');
    this.showWaModal.set(false);
  }

  // ---- تصحيح رقم الواتساب المعتمد ----
  selectedWaCountry(): { code: string; name: string; len: number[]; sample: string } {
    return this.waCountries.find((c) => c.code === this.waCode) || this.waCountries[0];
  }

  isValidE164(v?: string): boolean {
    return !!v && /^\+\d{10,15}$/.test(v.replace(/\s/g, ''));
  }

  startEditWa(g: Guardian): void {
    // تعبئة الحقول من الرقم الحالي إن كان بصيغة دولية، وإلا محاولة تخمين من الرقم المحلي
    const current = (g.whatsapp_phone || g.phone || '').replace(/\s/g, '');
    this.waCode = '+249';
    this.waBody = '';
    const match = this.waCountries.slice().sort((a, b) => b.code.length - a.code.length).find((c) => current.startsWith(c.code));
    if (match) {
      this.waCode = match.code;
      this.waBody = current.slice(match.code.length);
    } else {
      this.waBody = current.replace(/\D/g, '').replace(/^0+/, '');
    }
    this.editingWaId.set(g.id);
    this.updateComposedWa();
  }

  updateComposedWa(): void {
    const country = this.selectedWaCountry();
    const [min, max] = country.len;
    let cleaned = (this.waBody || '').replace(/\D/g, '');
    const codeDigits = country.code.replace(/\D/g, '');
    if (cleaned.startsWith(codeDigits)) cleaned = cleaned.slice(codeDigits.length);
    cleaned = cleaned.replace(/^0+/, '');
    if (cleaned.length > max) cleaned = cleaned.slice(0, max);
    if (cleaned !== this.waBody) this.waBody = cleaned;

    if (!cleaned) { this.composedWa.set(''); this.waErr.set(''); return; }
    if (cleaned.length < min || cleaned.length > max) {
      const lenText = min === max ? `${min}` : `${min}–${max}`;
      this.waErr.set(`رقم ${country.name} يجب أن يكون ${lenText} خانة (مثال: ${country.sample}).`);
      this.composedWa.set('');
      return;
    }
    this.waErr.set('');
    this.composedWa.set(`${this.waCode}${cleaned}`);
  }

  saveWaNumber(g: Guardian): void {
    const composed = this.composedWa();
    if (!composed || this.waErr()) return;
    this.savingWa.set(true);
    this.service.updateGuardian(g.id, { whatsapp_phone: composed }).subscribe({
      next: () => {
        this.savingWa.set(false);
        this.guardians.update((list) => list.map((x) => x.id === g.id ? { ...x, whatsapp_phone: composed } : x));
        this.editingWaId.set(null);
      },
      error: () => {
        this.savingWa.set(false);
        this.waErr.set('تعذّر حفظ الرقم. حاول مجدداً.');
      },
    });
  }

  openDirectWhatsapp(phone: string): void {
    let rawPhone = phone.replace(/\D/g, '');
    if (!rawPhone.startsWith('249') && !rawPhone.startsWith('966') && rawPhone.length === 9) rawPhone = '249' + rawPhone;
    window.open(`https://wa.me/${rawPhone}`, '_blank');
  }

  setStatus(status: string): void {
    const actionLabel = status === 'accepted' ? 'قبول' : status === 'rejected' ? 'رفض' : status === 'waitlist' ? 'قائمة انتظار' : status;

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'تأكيد الإجراء',
        message: `تغيير حالة الطلب إلى <strong>${actionLabel}</strong>؟`,
        confirmText: actionLabel,
        color: status === 'rejected' ? 'warn' : 'primary',
      },
    });

    ref.afterClosed().subscribe((ok: boolean) => {
      if (!ok) return;

      let obs;
      if (status === 'accepted') obs = this.service.acceptApplicant(this.id);
      else if (status === 'rejected') obs = this.service.rejectApplicant(this.id);
      else if (status === 'waitlist') obs = this.service.setWaitlist(this.id);
      else obs = this.service.setApplicantStatus(this.id, status);

      obs?.subscribe((res) => {
        const d = res?.data ?? { ...(this.applicant() as Applicant), status };
        this.applicant.set(d);

        // إرسال الإشعار تلقائياً في الخلفية فور تأكيد القرار
        this.autoSendWhatsappNotification(status);
      });
    });
  }

  scrollToAptitude(): void {
    document.getElementById('aptitude-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /** تحويل المتقدم المقبول نهائياً إلى طالب مُسجّل (وحدة الطلاب). */
  enrollAsStudent(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'تسجيل كطالب',
        message: 'تحويل المتقدم المقبول إلى <strong>طالب مُسجّل</strong> في وحدة الطلاب؟',
        confirmText: 'تسجيل', color: 'primary',
      },
    });
    ref.afterClosed().subscribe((ok: boolean) => {
      if (!ok) return;
      this.service.enrollApplicantAsStudent(this.id).subscribe((res) => {
        this.applicant.set({ ...(this.applicant() as Applicant), status: 'enrolled' });
        const msg = res?.message || 'تم تسجيل الطالب بنجاح.';
        this.autoNotificationToast.set({ status: 'success', message: msg });
        setTimeout(() => this.autoNotificationToast.set(null), 8000);
      });
    });
  }

  scheduleInterview(): void {
    const name = this.applicant()?.arabic_full_name || '';
    const ref = this.dialog.open(InterviewScheduleDialogComponent, {
      width: '480px',
      data: { applicantName: name },
    });

    ref.afterClosed().subscribe((res: InterviewScheduleResult | null) => {
      if (!res) return;
      this.service.scheduleInterview(this.id, res).subscribe(() => {
        this.loadAll();
        // إرسال إشعار المقابلة تلقائياً لولي الأمر
        const dateStr = res.scheduled_at ? new Date(res.scheduled_at).toLocaleString('ar-SD') : 'المحدد بالنظام';
        this.autoSendWhatsappNotification('interview_scheduled', { interviewDate: dateStr });
      });
    });
  }

  defaultGuardianObj(a: Applicant): Guardian {
    return {
      id: '', applicant: a.id, relationship: 'father', full_name: 'ولي الأمر',
      phone: '', email: '', national_id: a.national_id,
    };
  }

  back(): void {
    this.router.navigate(['/admissions/applications']);
  }
}
