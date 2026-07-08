import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdmissionsService } from '../admissions.service';
import { NbStepperComponent } from '../../../shared/nebras/nb-stepper.component';

interface Option { id: string; name: string; }

/** حقول نموذج التقديم العام (كلها نصية) — مع فهرس نصي لدعم الوصول عبر مفتاح متغيّر. */
interface PublicApplicantForm {
  [key: string]: string;
  arabic_full_name: string; english_full_name: string; gender: string; date_of_birth: string;
  nationality: string; national_id: string; passport_number: string; religion: string; blood_group: string;
  special_needs: string; previous_school: string; previous_grade: string;
  academic_year_id: string; applying_grade_id: string;
}
interface PublicGuardianForm {
  [key: string]: string;
  relationship: string; full_name: string; phone: string; email: string;
  national_id: string; occupation: string; address: string;
}

/**
 * بوابة التسجيل الإلكتروني العامة (الرابط العام لتسجيل الطلاب).
 * صفحة عامة بلا مصادقة ولا شريط جانبي — معالج متعدد الخطوات بمؤشر تقدّم علوي:
 *   البيانات الشخصية ← ولي الأمر ← الدراسة السابقة ← الشروط ← المراجعة والإرسال.
 * السياق سوداني: الهوية عبر الرقم الوطني أو رقم الجواز.
 * مربوطة بنقاط النهاية العامة الحقيقية، وتحترم فتح/إغلاق باب التسجيل من إعدادات القبول.
 */
@Component({
  selector: 'app-public-apply',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, NbStepperComponent],
  template: `
    <div class="portal" dir="rtl">
      <header class="portal-top">
        <div class="brand">
          <div class="logo-mark">ن</div>
          <div class="brand-title">{{ tenantName() || 'نبراس' }} <span>· بوابة القبول</span></div>
        </div>
        <a routerLink="/apply/track" class="track-link">تتبّع طلب سابق ←</a>
      </header>

      <main class="portal-main">
        @if (loadingConfig()) {
          <div class="card centered"><div class="spinner"></div><p>جارٍ تحميل بوابة التسجيل…</p></div>
        } @else if (!isOpen()) {
          <!-- باب التسجيل مغلق -->
          <div class="card centered closed">
            <div class="lock">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
            </div>
            <h1>باب التسجيل مغلق حاليًا</h1>
            <p>{{ closedMessage() || 'سيُفتح باب القبول والتسجيل في المواعيد التي تعلنها المدرسة. يرجى المتابعة لاحقًا.' }}</p>
            @if (contactPhone() || contactEmail()) {
              <div class="contact">للاستفسار: @if (contactPhone()) { <b>{{ contactPhone() }}</b> } @if (contactEmail()) { <span>{{ contactEmail() }}</span> }</div>
            }
            <a routerLink="/apply/track" class="btn ghost">تتبّع طلب سابق</a>
          </div>
        } @else if (submitted(); as result) {
          <!-- شاشة النجاح -->
          <div class="card success">
            <div class="check-lg">
              <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5" /></svg>
            </div>
            <h1>تم استلام طلبك بنجاح</h1>
            <p>احتفظ برقم الطلب التالي لمتابعة حالته:</p>
            <div class="app-num">{{ result.application_number }}</div>
            <div class="success-actions">
              <a [routerLink]="['/apply/track']" [queryParams]="{ n: result.application_number }" class="btn primary">تتبّع حالة الطلب</a>
              <button class="btn ghost" (click)="reset()">تقديم طلب آخر</button>
            </div>
          </div>
        } @else {
          <div class="card">
            <h1 class="portal-h1">طلب التحاق جديد</h1>
            <p class="portal-sub">أكمل الخطوات التالية لتقديم طلب التحاق طالب.</p>

            <nb-stepper [steps]="stepLabels" [current]="step()"></nb-stepper>

            @if (error()) { <div class="alert err" role="alert">{{ error() }}</div> }

            <!-- 1) البيانات الشخصية -->
            @if (step() === 1) {
              <div class="step-pane">
                <div class="grid">
                  <div class="fld req"><label>الاسم الكامل (عربي)</label><input [(ngModel)]="a.arabic_full_name" /></div>
                  <div class="fld"><label>الاسم الكامل (إنجليزي)</label><input [(ngModel)]="a.english_full_name" /></div>
                  <div class="fld req"><label>الجنس</label>
                    <select [(ngModel)]="a.gender"><option value="">اختر…</option><option value="male">ذكر</option><option value="female">أنثى</option></select>
                  </div>
                  <div class="fld req"><label>تاريخ الميلاد</label><input type="date" [(ngModel)]="a.date_of_birth" /></div>
                  <div class="fld req"><label>الجنسية</label><input [(ngModel)]="a.nationality" placeholder="سوداني" /></div>
                  <div class="fld req"><label>الرقم الوطني</label><input inputmode="numeric" [(ngModel)]="a.national_id" placeholder="للطلاب السودانيين" /></div>
                  <div class="fld"><label>رقم الجواز</label><input [(ngModel)]="a.passport_number" placeholder="لغير السودانيين" /></div>
                  <div class="fld req"><label>السنة الدراسية</label>
                    <select [(ngModel)]="a.academic_year_id"><option value="">اختر…</option>
                      @for (y of years(); track y.id) { <option [value]="y.id">{{ y.name }}</option> }
                    </select>
                  </div>
                  <div class="fld req"><label>الصف المتقدَّم له</label>
                    <select [(ngModel)]="a.applying_grade_id"><option value="">اختر…</option>
                      @for (g of grades(); track g.id) { <option [value]="g.id">{{ g.name }}</option> }
                    </select>
                  </div>
                </div>
                <p class="hint">يكفي إدخال الرقم الوطني للطلاب السودانيين، أو رقم الجواز لغير السودانيين.</p>
              </div>
            }

            <!-- 2) ولي الأمر -->
            @if (step() === 2) {
              <div class="step-pane">
                <div class="grid">
                  <div class="fld req"><label>صلة القرابة</label>
                    <select [(ngModel)]="g.relationship">
                      <option value="father">أب</option><option value="mother">أم</option>
                      <option value="guardian">ولي أمر</option><option value="sponsor">كفيل</option>
                    </select>
                  </div>
                  <div class="fld req"><label>الاسم الكامل</label><input [(ngModel)]="g.full_name" /></div>
                  <div class="fld req"><label>الجوال</label><input inputmode="tel" [(ngModel)]="g.phone" /></div>
                  <div class="fld"><label>البريد الإلكتروني</label><input type="email" [(ngModel)]="g.email" /></div>
                  <div class="fld"><label>الرقم الوطني لولي الأمر</label><input inputmode="numeric" [(ngModel)]="g.national_id" /></div>
                  <div class="fld"><label>المهنة</label><input [(ngModel)]="g.occupation" /></div>
                  <div class="fld wide"><label>العنوان</label><input [(ngModel)]="g.address" /></div>
                </div>
              </div>
            }

            <!-- 3) الدراسة السابقة -->
            @if (step() === 3) {
              <div class="step-pane">
                <div class="grid">
                  <div class="fld"><label>المدرسة السابقة</label><input [(ngModel)]="a.previous_school" /></div>
                  <div class="fld"><label>الصف السابق</label><input [(ngModel)]="a.previous_grade" /></div>
                  <div class="fld"><label>الديانة</label><input [(ngModel)]="a.religion" /></div>
                  <div class="fld"><label>فصيلة الدم</label><input [(ngModel)]="a.blood_group" placeholder="O+" /></div>
                  <div class="fld wide"><label>احتياجات خاصة / ملاحظات</label><textarea rows="2" [(ngModel)]="a.special_needs"></textarea></div>
                </div>
              </div>
            }

            <!-- 4) الشروط والمستندات -->
            @if (step() === 4) {
              <div class="step-pane">
                @if (requiredDocs().length) {
                  <div class="docs">
                    <h3>المستندات المطلوبة</h3>
                    <ul>@for (d of requiredDocs(); track d) { <li>{{ d }}</li> }</ul>
                    <p class="hint">تُقدَّم المستندات ورقيًا في مقر المدرسة أو حسب توجيهات الإدارة.</p>
                  </div>
                }
                <div class="terms">
                  <h3>الشروط والأحكام</h3>
                  <div class="terms-body">{{ terms() || 'بتقديم هذا الطلب فإنك تُقرّ بصحة البيانات المُدخلة وتوافق على شروط القبول والتسجيل المعتمدة في المدرسة.' }}</div>
                </div>
                <label class="agree">
                  <input type="checkbox" [(ngModel)]="agreed" />
                  <span>أوافق على الشروط والأحكام وأُقرّ بصحة البيانات.</span>
                </label>
              </div>
            }

            <!-- 5) المراجعة -->
            @if (step() === 5) {
              <div class="step-pane review">
                <h3>مراجعة الطلب قبل الإرسال</h3>
                <div class="rev-grid">
                  <div><span>الاسم</span><b>{{ a.arabic_full_name || '—' }}</b></div>
                  <div><span>الجنس</span><b>{{ a.gender === 'male' ? 'ذكر' : a.gender === 'female' ? 'أنثى' : '—' }}</b></div>
                  <div><span>تاريخ الميلاد</span><b>{{ a.date_of_birth || '—' }}</b></div>
                  <div><span>الجنسية</span><b>{{ a.nationality || '—' }}</b></div>
                  <div><span>الرقم الوطني</span><b>{{ a.national_id || '—' }}</b></div>
                  <div><span>رقم الجواز</span><b>{{ a.passport_number || '—' }}</b></div>
                  <div><span>السنة الدراسية</span><b>{{ yearName(a.academic_year_id) }}</b></div>
                  <div><span>الصف</span><b>{{ gradeName(a.applying_grade_id) }}</b></div>
                  <div><span>ولي الأمر</span><b>{{ g.full_name || '—' }}</b></div>
                  <div><span>جوال ولي الأمر</span><b>{{ g.phone || '—' }}</b></div>
                  <div><span>المدرسة السابقة</span><b>{{ a.previous_school || '—' }}</b></div>
                </div>
              </div>
            }

            <div class="nav">
              @if (step() > 1) { <button class="btn ghost" (click)="back()">السابق</button> }
              <span class="spacer"></span>
              @if (step() < 5) {
                <button class="btn primary" (click)="next()" [disabled]="!stepValid()">التالي</button>
              } @else {
                <button class="btn primary" (click)="submit()" [disabled]="saving() || !stepValid()">
                  {{ saving() ? 'جارٍ الإرسال…' : 'إرسال الطلب' }}
                </button>
              }
            </div>
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--nb-bg); }
    .portal { min-height: 100vh; display: flex; flex-direction: column; }
    .portal-top { height: 60px; background: var(--nb-surface); border-bottom: 1px solid var(--nb-border); display: flex; align-items: center; justify-content: space-between; padding: 0 24px; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .logo-mark { width: 30px; height: 30px; background: var(--nb-primary-600); border-radius: var(--nb-radius); display: flex; align-items: center; justify-content: center; color: var(--nb-on-primary); font-weight: 700; }
    .brand-title { font-size: 15px; font-weight: 700; color: var(--nb-text); }
    .brand-title span { color: var(--nb-primary-600); font-weight: 600; }
    .track-link { font-size: 13px; color: var(--nb-primary-600); text-decoration: none; font-weight: 600; }
    .portal-main { flex: 1; display: flex; justify-content: center; align-items: flex-start; padding: 32px 16px; }
    .card { width: 100%; max-width: 780px; background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 28px; box-shadow: var(--nb-shadow-sm, 0 1px 2px rgba(16,24,40,0.04)); }
    .card.centered { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 44px 28px; }
    .portal-h1 { font-size: 22px; font-weight: 700; margin: 0 0 4px; color: var(--nb-text); }
    .portal-sub { font-size: 13px; color: var(--nb-text-muted); margin: 0 0 20px; }
    .step-pane { animation: stepIn 260ms cubic-bezier(0.2, 0, 0, 1); margin-top: 20px; }
    @keyframes stepIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .step-pane { animation: none; } }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
    .fld { display: flex; flex-direction: column; gap: 5px; }
    .fld.wide { grid-column: 1 / -1; }
    .fld label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
    .fld.req label::after { content: ' *'; color: var(--nb-danger); }
    .fld input, .fld select, .fld textarea { height: 40px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); background: var(--nb-surface); outline: none; transition: border-color 150ms ease, box-shadow 150ms ease; }
    .fld textarea { height: auto; padding: 8px 10px; resize: vertical; }
    .fld input:focus, .fld select:focus, .fld textarea:focus { border-color: var(--nb-primary-600); box-shadow: var(--nb-focus-ring); }
    .hint { font-size: 12px; color: var(--nb-text-muted); margin: 12px 0 0; }
    .docs, .terms { margin-bottom: 18px; }
    .docs h3, .terms h3, .review h3 { font-size: 15px; color: var(--nb-primary-600); margin: 0 0 10px; }
    .docs ul { margin: 0; padding-inline-start: 20px; display: flex; flex-direction: column; gap: 6px; }
    .docs li { font-size: 13px; color: var(--nb-text); }
    .terms-body { font-size: 13px; line-height: 1.7; color: var(--nb-text-secondary); background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius); padding: 14px; max-height: 220px; overflow-y: auto; white-space: pre-line; }
    .agree { display: flex; align-items: center; gap: 10px; margin-top: 16px; font-size: 13px; font-weight: 600; color: var(--nb-text); cursor: pointer; }
    .agree input { width: 18px; height: 18px; accent-color: var(--nb-primary-600); }
    .rev-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
    .rev-grid > div { background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius); padding: 10px 12px; display: flex; flex-direction: column; gap: 3px; }
    .rev-grid span { font-size: 11px; color: var(--nb-text-muted); }
    .rev-grid b { font-size: 13px; color: var(--nb-text); }
    .nav { display: flex; align-items: center; margin-top: 24px; }
    .spacer { flex: 1; }
    .btn { height: 42px; padding: 0 24px; border-radius: var(--nb-radius); font-family: var(--nb-font-family); font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid transparent; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; transition: background 150ms ease, transform 120ms ease; }
    .btn:active { transform: scale(0.98); }
    .btn.primary { background: var(--nb-primary-600); color: var(--nb-on-primary); }
    .btn.primary:hover { background: var(--nb-primary-700, var(--nb-primary-600)); }
    .btn.primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn.ghost { background: transparent; border-color: var(--nb-border); color: var(--nb-text); }
    .alert { font-size: 12px; border-radius: var(--nb-radius); padding: 10px 14px; margin-top: 16px; }
    .alert.err { background: var(--nb-danger-bg); color: var(--nb-danger); border: 1px solid var(--nb-danger); }
    .success { text-align: center; }
    .check-lg, .lock { width: 68px; height: 68px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 4px; }
    .check-lg { background: var(--nb-success); color: #fff; }
    .lock { background: var(--nb-warning-bg); color: var(--nb-warning); }
    .success h1, .closed h1 { font-size: 22px; margin: 8px 0; color: var(--nb-text); }
    .success p, .closed p { color: var(--nb-text-muted); font-size: 13px; margin: 0; max-width: 460px; }
    .app-num { font-size: 24px; font-weight: 700; letter-spacing: 1px; color: var(--nb-primary-600); background: var(--nb-primary-50); border-radius: var(--nb-radius); padding: 12px 20px; margin: 8px 0 4px; }
    .success-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 12px; }
    .contact { font-size: 13px; color: var(--nb-text-secondary); display: flex; gap: 10px; }
    .contact b { color: var(--nb-text); }
    .spinner { width: 32px; height: 32px; border: 3px solid var(--nb-border); border-top-color: var(--nb-primary-600); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class PublicApplyComponent implements OnInit {
  private readonly svc = inject(AdmissionsService);

  readonly stepLabels = ['البيانات الشخصية', 'ولي الأمر', 'الدراسة السابقة', 'الشروط', 'المراجعة'];
  readonly step = signal(1);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly submitted = signal<{ application_number: string } | null>(null);

  readonly loadingConfig = signal(true);
  readonly isOpen = signal(false);
  readonly tenantName = signal('');
  readonly terms = signal('');
  readonly requiredDocs = signal<string[]>([]);
  readonly closedMessage = signal('');
  readonly contactPhone = signal('');
  readonly contactEmail = signal('');
  readonly years = signal<Option[]>([]);
  readonly grades = signal<Option[]>([]);

  agreed = false;

  a: PublicApplicantForm = {
    arabic_full_name: '', english_full_name: '', gender: '', date_of_birth: '',
    nationality: 'سوداني', national_id: '', passport_number: '', religion: '', blood_group: '', special_needs: '',
    previous_school: '', previous_grade: '', academic_year_id: '', applying_grade_id: '',
  };
  g: PublicGuardianForm = {
    relationship: 'father', full_name: '', phone: '', email: '', national_id: '', occupation: '', address: '',
  };

  ngOnInit(): void {
    this.svc.getPublicConfig().subscribe({
      next: (res) => {
        const d = res?.data ?? res ?? {};
        this.tenantName.set(d.tenant_name ?? '');
        this.isOpen.set(!!d.is_open);
        this.terms.set(d.terms ?? '');
        this.requiredDocs.set(Array.isArray(d.required_documents) ? d.required_documents : []);
        this.closedMessage.set(d.closed_message ?? '');
        this.contactPhone.set(d.contact_phone ?? '');
        this.contactEmail.set(d.contact_email ?? '');
        this.years.set((d.academic_years ?? []).map((y: any) => ({ id: y.id, name: y.name })));
        this.grades.set((d.grades ?? []).map((g: any) => ({ id: g.id, name: g.name })));
        const current = (d.academic_years ?? []).find((y: any) => y.current);
        if (current) this.a.academic_year_id = current.id;
        else if ((d.academic_years ?? []).length === 1) this.a.academic_year_id = d.academic_years[0].id;
        this.loadingConfig.set(false);
      },
      error: () => { this.loadingConfig.set(false); this.isOpen.set(false); this.error.set('تعذّر تحميل إعدادات التسجيل.'); },
    });
  }

  stepValid(): boolean {
    switch (this.step()) {
      case 1:
        return ['arabic_full_name', 'gender', 'date_of_birth', 'nationality', 'academic_year_id', 'applying_grade_id']
          .every((k) => !!this.a[k]) && (!!this.a.national_id || !!this.a.passport_number);
      case 2:
        return !!this.g.relationship && !!this.g.full_name && !!this.g.phone;
      case 4:
        return this.agreed;
      default:
        return true;
    }
  }

  next(): void { if (this.stepValid() && this.step() < 5) { this.error.set(''); this.step.update((s) => s + 1); } }
  back(): void { if (this.step() > 1) { this.error.set(''); this.step.update((s) => s - 1); } }

  yearName(id: string): string { return this.years().find((y) => y.id === id)?.name || '—'; }
  gradeName(id: string): string { return this.grades().find((g) => g.id === id)?.name || '—'; }

  submit(): void {
    if (this.saving() || !this.stepValid()) return;
    this.saving.set(true);
    this.error.set('');
    this.svc.submitPublicApplication({ applicant: this.compact(this.a), guardian: this.compact(this.g) }).subscribe({
      next: (res) => {
        this.saving.set(false);
        const d = res?.data ?? res;
        this.submitted.set({ application_number: d?.application_number ?? '' });
      },
      error: (e) => {
        this.saving.set(false);
        if (e?.status === 403) { this.isOpen.set(false); this.closedMessage.set(e?.error?.message ?? ''); }
        this.error.set(e?.error?.message || 'تعذّر إرسال الطلب. تأكد من البيانات وحاول مجددًا.');
      },
    });
  }

  reset(): void {
    this.submitted.set(null);
    this.step.set(1);
    this.agreed = false;
    for (const k of Object.keys(this.a)) this.a[k] = '';
    this.a.nationality = 'سوداني';
    this.g = { relationship: 'father', full_name: '', phone: '', email: '', national_id: '', occupation: '', address: '' };
  }

  private compact(obj: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) if (v !== '' && v != null) out[k] = v;
    return out;
  }
}
