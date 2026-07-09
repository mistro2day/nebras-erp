import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdmissionsService } from '../admissions.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbDatepickerComponent } from '../../../shared/nebras/nb-datepicker.component';
import { pickList } from '../shared/admissions.shared';

interface Option { id: string; name: string; }

/** نموذج إعدادات القبول — خصائص صريحة (لوصول القوالب) + فهرس عام. */
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
  closed_message: string;
  contact_phone: string;
  contact_email: string;
}

/** قالب افتراضي لشروط ومستندات القبول في المدارس السودانية (قابل للتعديل). */
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
 * إعدادات القبول — فتح/إغلاق باب التسجيل (لمدير النظام).
 * يتحكم بحالة التسجيل، السنة الدراسية، الفترة، الشروط، والمستندات المطلوبة
 * (بما يوافق ممارسات المدارس السودانية). مربوط بـ admissions/settings/.
 */
@Component({
  selector: 'app-admission-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NbPageHeaderComponent, NbPanelComponent, NbDatepickerComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="إعدادات القبول والتسجيل"
        subtitle="تحكّم بفتح وإغلاق باب التسجيل الإلكتروني وتحديد السنة الدراسية وشروط التقديم."
      >
        <button class="nb-btn-primary" (click)="save()" [disabled]="saving() || loading()">
          {{ saving() ? 'جارٍ الحفظ…' : 'حفظ الإعدادات' }}
        </button>
      </nb-page-header>

      @if (saved()) { <div class="alert ok" role="status">تم حفظ إعدادات القبول بنجاح.</div> }
      @if (error()) { <div class="alert err" role="alert">{{ error() }}</div> }

      @if (loading()) {
        <nb-panel><div class="loading">جارٍ التحميل…</div></nb-panel>
      } @else {
        <!-- مفتاح فتح/إغلاق -->
        <nb-panel>
          <div class="toggle-row">
            <div>
              <div class="toggle-title">حالة باب التسجيل</div>
              <div class="toggle-sub">عند الفتح، يصبح الرابط العام <code>/apply</code> متاحًا للمتقدمين.</div>
            </div>
            <button type="button" class="switch" [class.on]="s.is_open" (click)="s.is_open = !s.is_open"
                    [attr.aria-pressed]="s.is_open" aria-label="فتح أو إغلاق التسجيل">
              <span class="knob"></span>
            </button>
            <span class="state" [class.open]="s.is_open">{{ s.is_open ? 'مفتوح' : 'مغلق' }}</span>
          </div>
        </nb-panel>

        <!-- إعدادات الفتح -->
        <nb-panel title="إعدادات فترة التقديم" style="margin-top:16px">
          <div class="grid">
            <div class="fld"><label>السنة الدراسية</label>
              <select [(ngModel)]="s.academic_year_id">
                <option [ngValue]="null">— غير محددة —</option>
                @for (y of years(); track y.id) { <option [ngValue]="y.id">{{ y.name }}</option> }
              </select>
            </div>
            <div class="fld"><label>بداية التقديم</label><nb-datepicker [(value)]="s.registration_start" ariaLabel="بداية التقديم"></nb-datepicker></div>
            <div class="fld"><label>نهاية التقديم</label><nb-datepicker [(value)]="s.registration_end" ariaLabel="نهاية التقديم"></nb-datepicker></div>
            <div class="fld"><label>رسوم التقديم</label><input type="number" min="0" [(ngModel)]="s.application_fee" /></div>
            <div class="fld"><label>أدنى عمر (سنوات)</label><input type="number" min="0" [(ngModel)]="s.min_age" /></div>
            <div class="fld"><label>أقصى عمر (سنوات)</label><input type="number" min="0" [(ngModel)]="s.max_age" /></div>
          </div>

        </nb-panel>

        <!-- المقاعد لكل صف + الإغلاق التلقائي -->
        <nb-panel title="المقاعد المتاحة لكل صف" subtitle="حدّد الصفوف المتاحة للتقديم وعدد المقاعد لكل صف. عند اكتمال العدد يُغلق قبول الصف تلقائيًا." style="margin-top:16px">
          <div class="toggle-row" style="margin-bottom:14px">
            <div>
              <div class="toggle-title">الإغلاق التلقائي عند اكتمال المقاعد</div>
              <div class="toggle-sub">عند التفعيل، يتوقف استقبال الطلبات للصف فور بلوغ عدد المقاعد المحدّد.</div>
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
                <span>متاح للتقديم</span><span>الصف</span><span>عدد المقاعد</span>
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
            <p class="hint">اترك خانة المقاعد فارغة أو صفرًا لجعل التقديم بلا حدّ لذلك الصف.</p>
          }
        </nb-panel>

        <!-- الشروط والمستندات -->
        <nb-panel title="الشروط والمستندات المطلوبة" subtitle="تُعرض هذه الشروط والمستندات للمتقدم أثناء التقديم." style="margin-top:16px">
          <div class="defaults-bar">
            <button type="button" class="nb-btn-secondary sm" (click)="applySudanDefaults()">تحميل القالب  الافتراضي</button>
            <span class="muted">يملأ الشروط والمستندات بقيم افتراضية شائعة في المدارس السودانية — قابلة للتعديل.</span>
          </div>
          <div class="fld"><label>شروط وأحكام التقديم</label>
            <textarea rows="6" [(ngModel)]="s.terms" placeholder="اكتب شروط القبول والتسجيل التي ستظهر للمتقدم…"></textarea>
          </div>
          <div class="fld" style="margin-top:14px"><label>المستندات المطلوبة <span class="lbl-note">(مستند في كل سطر)</span></label>
            <textarea rows="6" [(ngModel)]="documentsText"
              placeholder="شهادة الميلاد&#10;الرقم الوطني للطالب وولي الأمر&#10;صورة من الجواز (لغير السودانيين)&#10;آخر شهادة/كشف درجات&#10;شهادة نقل من المدرسة السابقة&#10;صور شخصية حديثة&#10;البطاقة الصحية / شهادة التطعيمات"></textarea>
          </div>
        </nb-panel>

        <!-- الإغلاق والتواصل -->
        <nb-panel title="رسالة الإغلاق وبيانات التواصل" style="margin-top:16px">
          <div class="fld"><label>رسالة تُعرض عند إغلاق التسجيل</label>
            <textarea rows="2" [(ngModel)]="s.closed_message" placeholder="مثال: سيُفتح باب القبول للعام القادم في شهر…"></textarea>
          </div>
          <div class="grid" style="margin-top:14px">
            <div class="fld"><label>هاتف التواصل</label><input [(ngModel)]="s.contact_phone" /></div>
            <div class="fld"><label>بريد التواصل</label><input type="email" [(ngModel)]="s.contact_email" /></div>
          </div>
        </nb-panel>

        <div class="footer-actions">
          <a class="nb-btn-secondary" href="/apply" target="_blank" rel="noopener">فتح الرابط العام ↗</a>
          <button class="nb-btn-primary" (click)="save()" [disabled]="saving()">{{ saving() ? 'جارٍ الحفظ…' : 'حفظ الإعدادات' }}</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .loading { text-align: center; padding: 30px; color: var(--nb-text-muted); font-size: 13px; }
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
    .lbl-note, .sub-label span { font-weight: 400; color: var(--nb-text-muted); font-size: 11px; }
    .fld input, .fld select, .fld textarea { border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 8px 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); background: var(--nb-surface); outline: none; }
    .fld input, .fld select { height: 38px; }
    .fld textarea { resize: vertical; line-height: 1.7; }
    .fld input:focus, .fld select:focus, .fld textarea:focus { border-color: var(--nb-primary-600); box-shadow: var(--nb-focus-ring); }
    .sub-label { font-size: 12px; font-weight: 600; color: var(--nb-text); margin: 18px 0 8px; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; padding: 6px 12px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius-pill); cursor: pointer; color: var(--nb-text-secondary); }
    .chip.sel { background: var(--nb-primary-50); border-color: var(--nb-primary-600); color: var(--nb-primary-600); font-weight: 600; }
    .chip input { display: none; }
    .muted { font-size: 12px; color: var(--nb-text-muted); }
    /* جدول المقاعد لكل صف */
    .seats-tbl { border: 1px solid var(--nb-border); border-radius: var(--nb-radius); overflow: hidden; }
    .st-head, .st-row { display: grid; grid-template-columns: 120px 1fr 140px; align-items: center; gap: 10px; padding: 10px 14px; }
    .st-head { background: var(--nb-surface-raised); border-bottom: 1px solid var(--nb-border-soft); font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .st-row { border-bottom: 1px solid var(--nb-border-row); }
    .st-row:last-child { border-bottom: none; }
    .st-row.on { background: var(--nb-primary-50); }
    .st-name { font-size: 13px; font-weight: 600; color: var(--nb-text); }
    .seats-input { width: 120px; height: 34px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); background: var(--nb-surface); outline: none; text-align: center; }
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

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly error = signal('');
  readonly years = signal<Option[]>([]);
  readonly grades = signal<Option[]>([]);

  s: SettingsForm = {
    is_open: false, academic_year_id: null, registration_start: null, registration_end: null,
    allowed_grade_ids: [], grade_seats: {}, auto_close_when_full: true,
    terms: '', required_documents: [], min_age: null, max_age: null,
    application_fee: 0, closed_message: '', contact_phone: '', contact_email: '',
  };
  documentsText = '';

  ngOnInit(): void {
    this.svc.getAcademicYears().subscribe((res) =>
      this.years.set(pickList<Option>(res).map((y: any) => ({ id: y.id, name: y.name }))));
    this.svc.getGrades().subscribe((res) =>
      this.grades.set(pickList<Option>(res).map((g: any) => ({ id: g.id, name: g.name }))));

    this.svc.getAdmissionSettings().subscribe({
      next: (res) => {
        const d = res?.data ?? res;
        if (d) {
          this.s = {
            ...this.s, ...d,
            allowed_grade_ids: d.allowed_grade_ids ?? [],
            grade_seats: d.grade_seats ?? {},
            auto_close_when_full: d.auto_close_when_full ?? true,
          };
          this.documentsText = (d.required_documents ?? []).join('\n');
        }
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.error.set('تعذّر تحميل الإعدادات.'); },
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
    if (!this.s.terms?.trim()) this.s.terms = SUDAN_DEFAULT_TERMS;
    else this.s.terms = SUDAN_DEFAULT_TERMS;
    this.documentsText = SUDAN_DEFAULT_DOCS.join('\n');
  }

  save(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.saved.set(false);
    this.error.set('');
    const payload = {
      ...this.s,
      required_documents: this.documentsText.split('\n').map((l) => l.trim()).filter(Boolean),
      application_fee: this.s['application_fee'] || 0,
    };
    this.svc.saveAdmissionSettings(payload).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.saved.set(true);
        const d = res?.data ?? res;
        if (d) this.s = { ...this.s, ...d, allowed_grade_ids: d.allowed_grade_ids ?? this.s['allowed_grade_ids'] };
        setTimeout(() => this.saved.set(false), 3000);
      },
      error: (e) => { this.saving.set(false); this.error.set(e?.message || 'تعذّر حفظ الإعدادات.'); },
    });
  }
}
