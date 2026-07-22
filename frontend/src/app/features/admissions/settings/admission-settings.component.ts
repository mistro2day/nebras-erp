import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdmissionsService } from '../admissions.service';
import { TenantService } from '../../../core/services/tenant.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbDatepickerComponent } from '../../../shared/nebras/nb-datepicker.component';
import { pickList, DEFAULT_ADMISSION_FEES } from '../shared/admissions.shared';

interface Option { id: string; name: string; }

interface SettingsForm {
  [key: string]: any;
  is_open: boolean;
  academic_year_id: string | null;
  registration_start: string | null;
  registration_end: string | null;
  allowed_grade_ids: string[];
  grade_seats: Record<string, number>;
  auto_close_when_full: boolean;
  terms: string;
  required_documents: string[];
  min_age: number | null;
  max_age: number | null;
  application_fee: number;
  registration_fee: number;
  annual_tuition: number;
  fee_currency: string;
  fee_installments: Array<{ title: string; amount: number; note?: string }>;
  fee_notes: string[];
  closed_message: string;
  contact_phone: string;
  contact_email: string;
}

const SUDAN_DEFAULT_DOCS = [
  'شهادة الميلاد (الأصل + صورة)',
  'الرقم الوطني للطالب وولي الأمر',
  'صورة من جواز السفر والإقامة (لغير السودانيين)',
  'شهادة نقل / إخلاء طرف من المدرسة السابقة',
  'كشف الدرجات أو آخر شهادة دراسية معتمدة',
  'عدد (4) صور شخصية حديثة بخلفية بيضاء',
  'شهادة التطعيمات / البطاقة الصحية',
  'إيصال سداد رسوم التقديم',
];

const SUDAN_DEFAULT_TERMS = `شروط وأحكام القبول والتسجيل:
١. أن يكون عمر الطالب مناسبًا للصف المتقدَّم له وفق لائحة وزارة التربية والتعليم.
٢. اجتياز مقابلة القبول و/أو اختبار تحديد المستوى بنجاح.
٣. استكمال جميع المستندات المطلوبة قبل اعتماد التسجيل.
٤. سداد رسوم التسجيل خلال المدة المحددة، وإلا يُلغى الحجز.
٥. القبول مشروط بتوفّر المقاعد الشاغرة، والأولوية حسب تاريخ التقديم واستيفاء الشروط.
٦. الالتزام بلائحة المدرسة والزيّ المدرسي الرسمي وأنظمة الحضور والانضباط.
٧. صحة جميع البيانات والمستندات المقدَّمة مسؤولية ولي الأمر، وأي بيانات غير صحيحة تُلغي القبول.`;

/**
 * إعدادات القبول والتسجيل المخصصة لكل فرع من فروع المدرسة (بنين / بنات / عام).
 * تتيح تحديد فتح/إغلاق باب التسجيل، والمقاعد المتاحة، وشروط ورسوم التقديم لكل مدرسة بشكل مستقل.
 */
@Component({
  selector: 'app-admission-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NbPageHeaderComponent, NbPanelComponent, NbDatepickerComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="إعدادات القبول والتسجيل حسب فروع المدرسة"
        subtitle="تخصيص فتح وإغلاق باب التسجيل، المقاعد الشاغرة لكل صف، والشروط لمدرسة البنين ومدرسة البنات."
      >
        <button class="nb-btn-primary" (click)="save()" [disabled]="saving() || loading()">
          {{ saving() ? 'جارٍ الحفظ…' : 'حفظ إعدادات الفرع' }}
        </button>
      </nb-page-header>

      <!-- شريط اختيار الفرع المراد ضبط إعداداته -->
      <div class="branch-switch-tabs">
        <button type="button" [class.active]="activeTab() === 'boys'" (click)="selectBranchTab('boys')">
          👦 إعدادات مدرسة البنين
        </button>
        <button type="button" [class.active]="activeTab() === 'girls'" (click)="selectBranchTab('girls')">
          👧 إعدادات مدرسة البنات
        </button>
        <button type="button" [class.active]="activeTab() === 'global'" (click)="selectBranchTab('global')">
          🏫 الإعدادات الموحدة العامة
        </button>
      </div>

      @if (saved()) { <div class="alert ok" role="status">تم حفظ إعدادات القبول والتسجيل لـ ({{ tabTitle() }}) بنجاح.</div> }
      @if (error()) { <div class="alert err" role="alert">{{ error() }}</div> }

      @if (loading()) {
        <nb-panel><div class="loading">جارٍ تحميل إعدادات القبول…</div></nb-panel>
      } @else {
        <!-- مفتاح فتح/إغلاق خاص بالفرع -->
        <nb-panel>
          <div class="toggle-row">
            <div>
              <div class="toggle-title">حالة باب التسجيل لـ ({{ tabTitle() }})</div>
              <div class="toggle-sub">عند التفعيل، يستطيع أولياء الأمور والطلاب التقديم الإلكتروني لـ {{ tabTitle() }}.</div>
            </div>
            <button type="button" class="switch" [class.on]="s.is_open" (click)="s.is_open = !s.is_open"
                    [attr.aria-pressed]="s.is_open" aria-label="فتح أو إغلاق التسجيل">
              <span class="knob"></span>
            </button>
            <span class="state" [class.open]="s.is_open">{{ s.is_open ? 'مفتوح' : 'مغلق' }}</span>
          </div>
        </nb-panel>

        <!-- إعدادات فترة التقديم -->
        <nb-panel [title]="'إعدادات فترة التقديم - ' + tabTitle()" style="margin-top:16px">
          <div class="grid">
            <div class="fld"><label>السنة الدراسية</label>
              <select [(ngModel)]="s.academic_year_id">
                <option [ngValue]="null">— غير محددة —</option>
                @for (y of years(); track y.id) { <option [ngValue]="y.id">{{ y.name }}</option> }
              </select>
            </div>
            <div class="fld"><label>بداية التقديم</label><nb-datepicker [(value)]="s.registration_start" ariaLabel="بداية التقديم"></nb-datepicker></div>
            <div class="fld"><label>نهاية التقديم</label><nb-datepicker [(value)]="s.registration_end" ariaLabel="نهاية التقديم"></nb-datepicker></div>
            <div class="fld"><label>رسوم التقديم (جنيه)</label><input type="number" min="0" [(ngModel)]="s.application_fee" /></div>
            <div class="fld"><label>أدنى عمر (سنوات)</label><input type="number" min="0" [(ngModel)]="s.min_age" /></div>
            <div class="fld"><label>أقصى عمر (سنوات)</label><input type="number" min="0" [(ngModel)]="s.max_age" /></div>
          </div>
        </nb-panel>

        <!-- الرسوم الدراسية المعروضة في استمارة التقديم -->
        <nb-panel [title]="'الرسوم الدراسية المعروضة في استمارة التقديم — ' + tabTitle()"
                  subtitle="هذه القيم تظهر للطالب في استمارة التقديم العامة. اتركها صفراً لإخفاء قسم الرسوم." style="margin-top:16px">
          <div class="grid">
            <div class="fld"><label>رسوم التسجيل</label><input type="number" min="0" [(ngModel)]="s.registration_fee" /></div>
            <div class="fld"><label>الرسوم الدراسية السنوية</label><input type="number" min="0" [(ngModel)]="s.annual_tuition" /></div>
            <div class="fld"><label>العملة</label><input [(ngModel)]="s.fee_currency" placeholder="جنيه" /></div>
          </div>
          <div class="fld" style="margin-top:12px">
            <label>جدول الأقساط (سطر لكل قسط: العنوان | المبلغ | ملاحظة)</label>
            <textarea rows="4" [(ngModel)]="feeInstallmentsText"
                      placeholder="القسط الأول (عند التسجيل) | 500000 | رسوم التسجيل + القسط الأول&#10;القسط الثاني | 200000 | بعد شهرين من بداية العام"></textarea>
          </div>
          <div class="fld" style="margin-top:12px">
            <label>ملاحظات وشروط الرسوم (سطر لكل ملاحظة)</label>
            <textarea rows="4" [(ngModel)]="feeNotesText"
                      placeholder="لا ترد رسوم التسجيل بعد سدادها إطلاقاً.&#10;لا ترد الرسوم الدراسية بعد إكمال الأسبوع الأول من الدراسة."></textarea>
          </div>
        </nb-panel>

        <!-- المقاعد لكل صف في هذا الفرع -->
        <nb-panel [title]="'المقاعد الشاغرة لكل صف في ' + tabTitle()" subtitle="حدّد الصفوف المتاحة والمقاعد المخصصة لهذا الفرع. عند اكتمال مقاعد صف البنين أو البنات يُغلق التقديم لذلك الصف تلقائيًا." style="margin-top:16px">
          <div class="toggle-row" style="margin-bottom:14px">
            <div>
              <div class="toggle-title">الإغلاق التلقائي عند اكتمال مقاعد الفرع</div>
              <div class="toggle-sub">إيقاف استقبال طلبات صف البنين أو البنات فور اكتمال السعة المحددة.</div>
            </div>
            <button type="button" class="switch" [class.on]="s.auto_close_when_full" (click)="s.auto_close_when_full = !s.auto_close_when_full"
                    [attr.aria-pressed]="s.auto_close_when_full" aria-label="الإغلاق التلقائي عند الاكتمال">
              <span class="knob"></span>
            </button>
            <span class="state" [class.open]="s.auto_close_when_full">{{ s.auto_close_when_full ? 'مُفعّل' : 'مُعطّل' }}</span>
          </div>

          @if (grades().length === 0) {
            <span class="muted">لا توجد صفوف معرّفة في الشؤون الأكاديمية.</span>
          } @else {
            <div class="seats-tbl">
              <div class="st-head">
                <span>متاح للتقديم</span><span>الصف الدراسي</span><span>عدد مقاعد ({{ tabTitle() }})</span>
              </div>
              @for (g of grades(); track g.id) {
                <div class="st-row" [class.on]="isGradeSelected(g.id)">
                  <span>
                    <button type="button" class="mini-switch" [class.on]="isGradeSelected(g.id)" (click)="toggleGrade(g.id)"
                            [attr.aria-pressed]="isGradeSelected(g.id)" [attr.aria-label]="'إتاحة ' + g.name">
                      <span class="knob"></span>
                    </button>
                  </span>
                  <span class="st-name">{{ g.name }}</span>
                  <span>
                    <input type="number" min="0" class="seats-input" [disabled]="!isGradeSelected(g.id)"
                           [ngModel]="seatsOf(g.id)" (ngModelChange)="setSeats(g.id, $event)"
                           placeholder="بلا حد" [attr.aria-label]="'مقاعد ' + g.name" />
                  </span>
                </div>
              }
            </div>
            <p class="hint">اترك خانة المقاعد فارغة أو صفرًا لجعل التقديم بلا حدّ لذلك الصف في {{ tabTitle() }}.</p>
          }
        </nb-panel>

        <!-- الشروط والمستندات -->
        <nb-panel [title]="'الشروط والمستندات المطلوبة - ' + tabTitle()" subtitle="تُعرض للمتقدم أثناء تعبئة استمارة التقديم." style="margin-top:16px">
          <div class="defaults-bar">
            <button type="button" class="nb-btn-secondary sm" (click)="applySudanDefaults()">تحميل القالب الافتراضي</button>
            <span class="muted">يملأ الشروط والمستندات بقيم افتراضية شائعة الممارسات — قابلة للتعديل.</span>
          </div>
          <div class="fld"><label>شروط وأحكام التقديم لـ {{ tabTitle() }}</label>
            <textarea rows="6" [(ngModel)]="s.terms" placeholder="اكتب شروط القبول والتسجيل الخاصة بـ {{ tabTitle() }}…"></textarea>
          </div>
          <div class="fld" style="margin-top:14px"><label>المستندات المطلوبة <span class="lbl-note">(مستند في كل سطر)</span></label>
            <textarea rows="6" [(ngModel)]="documentsText" placeholder="المستندات المطلوبة..."></textarea>
          </div>
        </nb-panel>

        <!-- الإغلاق والتواصل -->
        <nb-panel [title]="'رسالة الإغلاق وبيانات التواصل - ' + tabTitle()" style="margin-top:16px">
          <div class="fld"><label>رسالة يُعرض لولي الأمر عند إغلاق التقديم لـ {{ tabTitle() }}</label>
            <textarea rows="2" [(ngModel)]="s.closed_message" placeholder="مثال: اكتمل التقديم لمدرسة البنين / البنات للعام الحالى..."></textarea>
          </div>
          <div class="grid" style="margin-top:14px">
            <div class="fld"><label>هاتف التواصل مع إدارة الفرع</label><input [(ngModel)]="s.contact_phone" /></div>
            <div class="fld"><label>البريد الإلكتروني للفرع</label><input type="email" [(ngModel)]="s.contact_email" /></div>
          </div>
        </nb-panel>

        <div class="footer-actions">
          <a class="nb-btn-secondary" href="/apply" target="_blank" rel="noopener">فتح رابط القبول العام ↗</a>
          <button class="nb-btn-primary" (click)="save()" [disabled]="saving()">{{ saving() ? 'جارٍ الحفظ…' : 'حفظ الإعدادات' }}</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .loading { text-align: center; padding: 30px; color: var(--nb-text-muted); font-size: 13px; }
    
    .branch-switch-tabs { display: flex; gap: 8px; margin-bottom: 16px; background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: 10px; padding: 4px; }
    .branch-switch-tabs button { flex: 1; height: 38px; border: none; border-radius: 8px; background: transparent; font-size: 13px; font-weight: 700; color: var(--nb-text-muted); cursor: pointer; transition: all 150ms ease; }
    .branch-switch-tabs button.active { background: var(--nb-primary-600, #2563eb); color: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    
    .toggle-row { display: flex; align-items: center; gap: 16px; }
    .toggle-row > div:first-child { flex: 1; }
    .toggle-title { font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .toggle-sub { font-size: 12px; color: var(--nb-text-muted); margin-top: 3px; }
    .toggle-sub code { background: var(--nb-surface-raised); padding: 1px 6px; border-radius: var(--nb-radius-sm); }
    .switch { width: 52px; height: 30px; border-radius: 999px; background: var(--nb-border); border: none; position: relative; cursor: pointer; transition: background 200ms ease; flex-shrink: 0; padding: 0; }
    .switch.on { background: var(--nb-success); }
    .knob { position: absolute; top: 3px; inset-inline-start: 3px; width: 24px; height: 24px; border-radius: 50%; background: #fff; transition: inset-inline-start 200ms ease; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
    .switch.on .knob { inset-inline-start: 25px; }
    .state { font-size: 13px; font-weight: 700; color: var(--nb-text-muted); min-width: 44px; }
    .state.open { color: var(--nb-success); }
    
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
    .fld { display: flex; flex-direction: column; gap: 5px; }
    .fld label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
    .lbl-note { font-weight: 400; color: var(--nb-text-muted); font-size: 11px; }
    .fld input, .fld select, .fld textarea { border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 8px 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); background: var(--nb-surface); outline: none; }
    .fld input, .fld select { height: 38px; }
    .fld textarea { resize: vertical; line-height: 1.7; }
    .fld input:focus, .fld select:focus, .fld textarea:focus { border-color: var(--nb-primary-600); box-shadow: var(--nb-focus-ring); }
    
    .seats-tbl { border: 1px solid var(--nb-border); border-radius: var(--nb-radius); overflow: hidden; }
    .st-head, .st-row { display: grid; grid-template-columns: 120px 1fr 160px; align-items: center; gap: 10px; padding: 10px 14px; }
    .st-head { background: var(--nb-surface-raised); border-bottom: 1px solid var(--nb-border-soft); font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .st-row { border-bottom: 1px solid var(--nb-border-row); }
    .st-row:last-child { border-bottom: none; }
    .st-row.on { background: var(--nb-primary-50); }
    .st-name { font-size: 13px; font-weight: 600; color: var(--nb-text); }
    .seats-input { width: 140px; height: 34px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); background: var(--nb-surface); outline: none; text-align: center; }
    .seats-input:disabled { background: var(--nb-surface-raised); color: var(--nb-text-faint); cursor: not-allowed; }
    .seats-input:focus { border-color: var(--nb-primary-600); box-shadow: var(--nb-focus-ring); }
    .mini-switch { width: 42px; height: 24px; border-radius: 999px; background: var(--nb-border); border: none; position: relative; cursor: pointer; transition: background 200ms ease; padding: 0; }
    .mini-switch.on { background: var(--nb-primary-600); }
    .mini-switch .knob { position: absolute; top: 3px; inset-inline-start: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: inset-inline-start 200ms ease; box-shadow: 0 1px 2px rgba(0,0,0,0.2); }
    .mini-switch.on .knob { inset-inline-start: 21px; }
    .defaults-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; padding: 10px 12px; background: var(--nb-surface-raised); border: 1px dashed var(--nb-border); border-radius: var(--nb-radius); }
    .nb-btn-secondary.sm { height: 30px; padding: 0 14px; font-size: 12px; }
    .footer-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
    .alert { font-size: 12px; border-radius: var(--nb-radius); padding: 10px 14px; margin-bottom: 14px; }
    .alert.ok { background: var(--nb-success-bg, var(--nb-primary-50)); color: var(--nb-success); border: 1px solid var(--nb-success); }
    .alert.err { background: var(--nb-danger-bg); color: var(--nb-danger); border: 1px solid var(--nb-danger); }
  `],
})
export class AdmissionSettingsComponent implements OnInit {
  private readonly svc = inject(AdmissionsService);
  private readonly tenantService = inject(TenantService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly error = signal('');
  readonly years = signal<Option[]>([]);
  readonly grades = signal<Option[]>([]);

  readonly activeTab = signal<'boys' | 'girls' | 'global'>('boys');

  branchSettingsStore: Record<string, SettingsForm> = {
    boys: {
      is_open: true, academic_year_id: null, registration_start: null, registration_end: null,
      allowed_grade_ids: [], grade_seats: {}, auto_close_when_full: true,
      terms: SUDAN_DEFAULT_TERMS, required_documents: SUDAN_DEFAULT_DOCS, min_age: null, max_age: null,
      application_fee: 0,
      registration_fee: DEFAULT_ADMISSION_FEES.registration_fee,
      annual_tuition: DEFAULT_ADMISSION_FEES.annual_tuition,
      fee_currency: DEFAULT_ADMISSION_FEES.fee_currency,
      fee_installments: DEFAULT_ADMISSION_FEES.fee_installments.map((i) => ({ ...i })),
      fee_notes: [...DEFAULT_ADMISSION_FEES.fee_notes],
      closed_message: 'تم إغلاق التقديم لمدرسة البنين لعام 2026-2025.',
      contact_phone: '', contact_email: '',
    },
    girls: {
      is_open: true, academic_year_id: null, registration_start: null, registration_end: null,
      allowed_grade_ids: [], grade_seats: {}, auto_close_when_full: true,
      terms: SUDAN_DEFAULT_TERMS, required_documents: SUDAN_DEFAULT_DOCS, min_age: null, max_age: null,
      application_fee: 0,
      registration_fee: DEFAULT_ADMISSION_FEES.registration_fee,
      annual_tuition: DEFAULT_ADMISSION_FEES.annual_tuition,
      fee_currency: DEFAULT_ADMISSION_FEES.fee_currency,
      fee_installments: DEFAULT_ADMISSION_FEES.fee_installments.map((i) => ({ ...i })),
      fee_notes: [...DEFAULT_ADMISSION_FEES.fee_notes],
      closed_message: 'تم إغلاق التقديم لمدرسة البنات لعام 2026-2025.',
      contact_phone: '', contact_email: '',
    },
    global: {
      is_open: true, academic_year_id: null, registration_start: null, registration_end: null,
      allowed_grade_ids: [], grade_seats: {}, auto_close_when_full: true,
      terms: SUDAN_DEFAULT_TERMS, required_documents: SUDAN_DEFAULT_DOCS, min_age: null, max_age: null,
      application_fee: 0,
      registration_fee: DEFAULT_ADMISSION_FEES.registration_fee,
      annual_tuition: DEFAULT_ADMISSION_FEES.annual_tuition,
      fee_currency: DEFAULT_ADMISSION_FEES.fee_currency,
      fee_installments: DEFAULT_ADMISSION_FEES.fee_installments.map((i) => ({ ...i })),
      fee_notes: [...DEFAULT_ADMISSION_FEES.fee_notes],
      closed_message: 'تم إغلاق باب التقديم العام بالمؤسسة.',
      contact_phone: '', contact_email: '',
    },
  };

  s: SettingsForm = this.branchSettingsStore['boys'];
  documentsText = SUDAN_DEFAULT_DOCS.join('\n');
  feeNotesText = '';
  feeInstallmentsText = '';

  /** يحوّل نص الأقساط (سطر: العنوان | المبلغ | ملاحظة) إلى قائمة كائنات. */
  private parseInstallments(text: string): Array<{ title: string; amount: number; note?: string }> {
    return text.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
      const [title, amount, note] = line.split('|').map((p) => p.trim());
      return { title: title || '', amount: Number(amount) || 0, ...(note ? { note } : {}) };
    }).filter((x) => x.title);
  }

  private installmentsToText(list: Array<{ title: string; amount: number; note?: string }>): string {
    return (list ?? []).map((i) => `${i.title} | ${i.amount}${i.note ? ' | ' + i.note : ''}`).join('\n');
  }

  tabTitle(): string {
    const t = this.activeTab();
    if (t === 'boys') return 'مدرسة البنين';
    if (t === 'girls') return 'مدرسة البنات';
    return 'المؤسسة التعليمية (عام)';
  }

  selectBranchTab(tab: 'boys' | 'girls' | 'global'): void {
    // حفظ الحالة الحالية للفرع السابق في الذاكرة المحلية قبل التبديل
    this.s.required_documents = this.documentsText.split('\n').map((l) => l.trim()).filter(Boolean);
    this.s.fee_notes = this.feeNotesText.split('\n').map((l) => l.trim()).filter(Boolean);
    this.s.fee_installments = this.parseInstallments(this.feeInstallmentsText);
    this.branchSettingsStore[this.activeTab()] = { ...this.s };

    this.activeTab.set(tab);
    this.s = this.branchSettingsStore[tab];
    this.documentsText = (this.s.required_documents ?? []).join('\n');
    this.feeNotesText = (this.s.fee_notes ?? []).join('\n');
    this.feeInstallmentsText = this.installmentsToText(this.s.fee_installments ?? []);
  }

  ngOnInit(): void {
    this.svc.getAcademicYears().subscribe((res) =>
      this.years.set(pickList<Option>(res).map((y: any) => ({ id: y.id, name: y.name }))));
    this.svc.getGrades().subscribe((res) =>
      this.grades.set(pickList<Option>(res).map((g: any) => ({ id: g.id, name: g.name }))));

    this.svc.getAdmissionSettings().subscribe({
      next: (res) => {
        const d = res?.data ?? res;
        if (d) {
          // إعدادات رسوم لم تُضبط بعد → استخدم الافتراضيات (المنقولة من الاستمارة الرسمية) قابلةً للتعديل
          const hasSavedFees = Number(d.registration_fee) > 0 || Number(d.annual_tuition) > 0
            || (d.fee_installments?.length ?? 0) > 0 || (d.fee_notes?.length ?? 0) > 0;
          const feeDefaults = hasSavedFees ? {} : {
            registration_fee: DEFAULT_ADMISSION_FEES.registration_fee,
            annual_tuition: DEFAULT_ADMISSION_FEES.annual_tuition,
            fee_currency: DEFAULT_ADMISSION_FEES.fee_currency,
            fee_installments: DEFAULT_ADMISSION_FEES.fee_installments.map((i) => ({ ...i })),
            fee_notes: [...DEFAULT_ADMISSION_FEES.fee_notes],
          };
          this.s = {
            ...this.s, ...d, ...feeDefaults,
            allowed_grade_ids: d.allowed_grade_ids ?? [],
            grade_seats: d.grade_seats ?? {},
            auto_close_when_full: d.auto_close_when_full ?? true,
          };
          this.branchSettingsStore['boys'] = { ...this.s };
          this.branchSettingsStore['girls'] = { ...this.s };
          this.branchSettingsStore['global'] = { ...this.s };
          this.documentsText = (d.required_documents ?? []).join('\n');
          this.feeNotesText = (this.s.fee_notes ?? []).join('\n');
          this.feeInstallmentsText = this.installmentsToText(this.s.fee_installments ?? []);
        }
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.error.set('تعذّر تحميل إعدادات القبول.'); },
    });
  }

  isGradeSelected(id: string): boolean { return (this.s['allowed_grade_ids'] ?? []).includes(id); }
  toggleGrade(id: string): void {
    const list: string[] = this.s['allowed_grade_ids'] ?? [];
    this.s['allowed_grade_ids'] = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  seatsOf(id: string): number | null {
    const v = this.s['grade_seats']?.[id];
    return v ? Number(v) : null;
  }
  setSeats(id: string, value: any): void {
    const n = Number(value);
    this.s['grade_seats'] = { ...(this.s['grade_seats'] ?? {}), [id]: isNaN(n) || n <= 0 ? 0 : n };
  }

  applySudanDefaults(): void {
    this.s.terms = SUDAN_DEFAULT_TERMS;
    this.documentsText = SUDAN_DEFAULT_DOCS.join('\n');
  }

  save(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.saved.set(false);
    this.error.set('');
    
    this.s.required_documents = this.documentsText.split('\n').map((l) => l.trim()).filter(Boolean);
    this.s.fee_notes = this.feeNotesText.split('\n').map((l) => l.trim()).filter(Boolean);
    this.s.fee_installments = this.parseInstallments(this.feeInstallmentsText);
    this.branchSettingsStore[this.activeTab()] = { ...this.s };

    const payload = {
      ...this.s,
      branch_type: this.activeTab(),
      required_documents: this.s.required_documents,
      application_fee: this.s['application_fee'] || 0,
      registration_fee: this.s['registration_fee'] || 0,
      annual_tuition: this.s['annual_tuition'] || 0,
      fee_notes: this.s.fee_notes,
      fee_installments: this.s.fee_installments,
    };
    
    this.svc.saveAdmissionSettings(payload).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.saved.set(true);
        const d = res?.data ?? res;
        if (d) {
          this.s = { ...this.s, ...d, allowed_grade_ids: d.allowed_grade_ids ?? this.s['allowed_grade_ids'] };
          this.branchSettingsStore[this.activeTab()] = { ...this.s };
        }
        setTimeout(() => this.saved.set(false), 3000);
      },
      error: (e) => { this.saving.set(false); this.error.set(e?.message || 'تعذّر حفظ الإعدادات.'); },
    });
  }
}
