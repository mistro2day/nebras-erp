import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdmissionsService } from '../admissions.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbStepperComponent } from '../../../shared/nebras/nb-stepper.component';
import { pickList } from '../shared/admissions.shared';

interface Option { id: string; name: string; }

/** حقول نموذج المتقدم (كلها نصية) — مع فهرس نصي لدعم الوصول عبر مفتاح متغيّر. */
interface ApplicantForm {
  [key: string]: string;
  arabic_full_name: string; english_full_name: string; gender: string; date_of_birth: string;
  nationality: string; national_id: string; passport_number: string; religion: string; blood_group: string;
  special_needs: string; previous_school: string; previous_grade: string;
  academic_year_id: string; applying_grade_id: string; applying_section_id: string;
}
interface GuardianForm {
  [key: string]: string;
  relationship: string; full_name: string; phone: string; email: string;
  national_id: string; occupation: string; address: string;
}

/**
 * تسجيل / تعديل طلب التحاق يدويًا (معالج بخطوات) — يستخدمه مشرف النظام لتسجيل متقدم
 * حضر إلى مباني المدرسة. السياق سوداني: الهوية عبر الرقم الوطني أو رقم الجواز.
 * مربوط بالخادم الحقيقي: إنشاء POST applicants/ (+ POST guardians/)، تعديل PATCH applicants/:id/.
 */
@Component({
  selector: 'app-applicant-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NbPageHeaderComponent, NbPanelComponent, NbStepperComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        [title]="isEdit() ? 'تعديل طلب الالتحاق' : 'تسجيل طلب التحاق جديد'"
        [subtitle]="isEdit() ? 'تحديث بيانات المتقدم.' : 'تعبئة طلب التحاق يدويًا نيابةً عن متقدم حضر إلى المدرسة.'"
      >
        <button class="nb-btn-ghost" (click)="cancel()">إلغاء</button>
      </nb-page-header>

      <nb-panel>
        <nb-stepper [steps]="stepLabels()" [current]="step()"></nb-stepper>

        @if (error()) { <div class="alert err" role="alert">{{ error() }}</div> }

        <!-- 1) البيانات الشخصية -->
        @if (step() === 1) {
          <div class="step-pane">
            <div class="form-grid">
              <div class="fld req"><label>الاسم الكامل (عربي)</label><input [(ngModel)]="a.arabic_full_name" placeholder="مثال: محمد عبدالله" /></div>
              <div class="fld"><label>الاسم الكامل (إنجليزي)</label><input [(ngModel)]="a.english_full_name" /></div>
              <div class="fld req"><label>الجنس</label>
                <select [(ngModel)]="a.gender"><option value="">اختر…</option><option value="male">ذكر</option><option value="female">أنثى</option></select>
              </div>
              <div class="fld req"><label>تاريخ الميلاد</label><input type="date" [(ngModel)]="a.date_of_birth" /></div>
              <div class="fld req"><label>الجنسية</label><input [(ngModel)]="a.nationality" placeholder="سوداني" /></div>
              <div class="fld req"><label>الرقم الوطني</label><input inputmode="numeric" [(ngModel)]="a.national_id" placeholder="للطلاب السودانيين" /></div>
              <div class="fld"><label>رقم الجواز</label><input [(ngModel)]="a.passport_number" placeholder="لغير السودانيين" /></div>
              <div class="fld"><label>الديانة</label><input [(ngModel)]="a.religion" /></div>
              <div class="fld"><label>فصيلة الدم</label><input [(ngModel)]="a.blood_group" placeholder="O+" /></div>
            </div>
            <p class="hint">يلزم إدخال الرقم الوطني (للسودانيين) أو رقم الجواز (لغير السودانيين).</p>
          </div>
        }

        <!-- 2) التسجيل الأكاديمي -->
        @if (step() === 2) {
          <div class="step-pane">
            <div class="form-grid">
              <div class="fld req"><label>السنة الدراسية</label>
                <select [(ngModel)]="a.academic_year_id"><option value="">اختر…</option>
                  @for (y of years(); track y.id) { <option [value]="y.id">{{ y.name }}</option> }
                </select>
              </div>
              <div class="fld req"><label>الصف المتقدَّم له</label>
                <select [(ngModel)]="a.applying_grade_id" (change)="onGradeChange()"><option value="">اختر…</option>
                  @for (g of grades(); track g.id) { <option [value]="g.id">{{ g.name }}</option> }
                </select>
              </div>
              <div class="fld"><label>الشعبة (اختياري)</label>
                <select [(ngModel)]="a.applying_section_id"><option value="">— بدون —</option>
                  @for (s of sections(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }
                </select>
              </div>
              <div class="fld"><label>المدرسة السابقة</label><input [(ngModel)]="a.previous_school" /></div>
              <div class="fld"><label>الصف السابق</label><input [(ngModel)]="a.previous_grade" /></div>
              <div class="fld wide"><label>احتياجات خاصة / ملاحظات</label><textarea rows="2" [(ngModel)]="a.special_needs"></textarea></div>
            </div>
            @if (years().length === 0 || grades().length === 0) {
              <div class="alert warn">لا تتوفر سنوات دراسية أو صفوف في الشؤون الأكاديمية بعد — يلزم إنشاؤها أولًا لإتمام التسجيل.</div>
            }
          </div>
        }

        <!-- 3) ولي الأمر (إنشاء فقط) -->
        @if (step() === 3 && !isEdit()) {
          <div class="step-pane">
            <div class="form-grid">
              <div class="fld"><label>صلة القرابة</label>
                <select [(ngModel)]="g.relationship">
                  <option value="father">أب</option><option value="mother">أم</option>
                  <option value="guardian">ولي أمر</option><option value="sponsor">كفيل</option>
                </select>
              </div>
              <div class="fld"><label>الاسم الكامل</label><input [(ngModel)]="g.full_name" /></div>
              <div class="fld"><label>الجوال</label><input inputmode="tel" [(ngModel)]="g.phone" /></div>
              <div class="fld"><label>البريد الإلكتروني</label><input type="email" [(ngModel)]="g.email" /></div>
              <div class="fld"><label>الرقم الوطني لولي الأمر</label><input inputmode="numeric" [(ngModel)]="g.national_id" /></div>
              <div class="fld"><label>المهنة</label><input [(ngModel)]="g.occupation" /></div>
              <div class="fld wide"><label>العنوان</label><input [(ngModel)]="g.address" /></div>
            </div>
            <p class="hint">بيانات ولي الأمر اختيارية ويمكن استكمالها لاحقًا من تفاصيل الطلب.</p>
          </div>
        }

        <!-- الأخيرة) المراجعة -->
        @if (step() === lastStep()) {
          <div class="step-pane review">
            <div class="rev-grid">
              <div><span>الاسم</span><b>{{ a.arabic_full_name || '—' }}</b></div>
              <div><span>الجنس</span><b>{{ a.gender === 'male' ? 'ذكر' : a.gender === 'female' ? 'أنثى' : '—' }}</b></div>
              <div><span>تاريخ الميلاد</span><b>{{ a.date_of_birth || '—' }}</b></div>
              <div><span>الجنسية</span><b>{{ a.nationality || '—' }}</b></div>
              <div><span>الرقم الوطني</span><b>{{ a.national_id || '—' }}</b></div>
              <div><span>رقم الجواز</span><b>{{ a.passport_number || '—' }}</b></div>
              <div><span>السنة الدراسية</span><b>{{ yearName(a.academic_year_id) }}</b></div>
              <div><span>الصف</span><b>{{ gradeName(a.applying_grade_id) }}</b></div>
              @if (!isEdit()) { <div><span>ولي الأمر</span><b>{{ g.full_name || '—' }}</b></div> }
            </div>
          </div>
        }

        <div class="nav">
          @if (step() > 1) { <button class="nb-btn-secondary" (click)="back()">السابق</button> }
          <span class="spacer"></span>
          @if (step() < lastStep()) {
            <button class="nb-btn-primary" (click)="next()" [disabled]="!stepValid()">التالي</button>
          } @else {
            <button class="nb-btn-primary" (click)="save()" [disabled]="saving() || !valid()">
              {{ saving() ? 'جارٍ الحفظ…' : (isEdit() ? 'حفظ التعديلات' : 'حفظ الطلب') }}
            </button>
          }
        </div>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .step-pane { animation: stepIn 240ms cubic-bezier(0.2, 0, 0, 1); margin-top: 20px; }
    @keyframes stepIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .step-pane { animation: none; } }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
    .fld { display: flex; flex-direction: column; gap: 5px; }
    .fld.wide { grid-column: 1 / -1; }
    .fld label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
    .fld.req label::after { content: ' *'; color: var(--nb-danger); }
    .fld input, .fld select, .fld textarea { height: 38px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); background: var(--nb-surface); outline: none; transition: border-color 150ms ease, box-shadow 150ms ease; }
    .fld textarea { height: auto; padding: 8px 10px; resize: vertical; }
    .fld input:focus, .fld select:focus, .fld textarea:focus { border-color: var(--nb-primary-600); box-shadow: var(--nb-focus-ring); }
    .hint { font-size: 12px; color: var(--nb-text-muted); margin: 12px 0 0; }
    .review .rev-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
    .rev-grid > div { background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius); padding: 10px 12px; display: flex; flex-direction: column; gap: 3px; }
    .rev-grid span { font-size: 11px; color: var(--nb-text-muted); }
    .rev-grid b { font-size: 13px; color: var(--nb-text); }
    .nav { display: flex; align-items: center; margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--nb-border-soft); }
    .spacer { flex: 1; }
    .alert { font-size: 12px; border-radius: var(--nb-radius); padding: 10px 14px; margin-top: 16px; }
    .alert.err { background: var(--nb-danger-bg); color: var(--nb-danger); border: 1px solid var(--nb-danger); }
    .alert.warn { background: var(--nb-warning-bg); color: var(--nb-warning); border: 1px solid var(--nb-border-soft); }
  `],
})
export class ApplicantFormComponent implements OnInit {
  private readonly svc = inject(AdmissionsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly id = signal<string | null>(null);
  readonly isEdit = computed(() => !!this.id());
  readonly saving = signal(false);
  readonly error = signal('');
  readonly step = signal(1);

  readonly years = signal<Option[]>([]);
  readonly grades = signal<Option[]>([]);
  readonly sections = signal<Option[]>([]);

  readonly stepLabels = computed(() =>
    this.isEdit()
      ? ['البيانات الشخصية', 'التسجيل الأكاديمي', 'المراجعة']
      : ['البيانات الشخصية', 'التسجيل الأكاديمي', 'ولي الأمر', 'المراجعة']);
  readonly lastStep = computed(() => this.stepLabels().length);

  a: ApplicantForm = {
    arabic_full_name: '', english_full_name: '', gender: '', date_of_birth: '',
    nationality: 'سوداني', national_id: '', passport_number: '', religion: '', blood_group: '',
    special_needs: '', previous_school: '', previous_grade: '',
    academic_year_id: '', applying_grade_id: '', applying_section_id: '',
  };
  g: GuardianForm = {
    relationship: 'father', full_name: '', phone: '', email: '', national_id: '', occupation: '', address: '',
  };

  valid(): boolean {
    return ['arabic_full_name', 'gender', 'date_of_birth', 'nationality', 'academic_year_id', 'applying_grade_id']
      .every((k) => !!this.a[k]) && (!!this.a.national_id || !!this.a.passport_number);
  }

  stepValid(): boolean {
    switch (this.step()) {
      case 1:
        return ['arabic_full_name', 'gender', 'date_of_birth', 'nationality'].every((k) => !!this.a[k])
          && (!!this.a.national_id || !!this.a.passport_number);
      case 2:
        return !!this.a.academic_year_id && !!this.a.applying_grade_id;
      default:
        return true;
    }
  }

  next(): void { if (this.stepValid() && this.step() < this.lastStep()) { this.error.set(''); this.step.update((s) => s + 1); } }
  back(): void { if (this.step() > 1) { this.error.set(''); this.step.update((s) => s - 1); } }

  ngOnInit(): void {
    this.svc.getAcademicYears().subscribe((res) =>
      this.years.set(pickList<Option>(res).map((y: any) => ({ id: y.id, name: y.name }))));
    this.svc.getGrades().subscribe((res) =>
      this.grades.set(pickList<Option>(res).map((g: any) => ({ id: g.id, name: g.name }))));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.id.set(id);
      this.svc.getApplicant(id).subscribe((res) => {
        const d = res?.data ?? res;
        if (d) {
          for (const k of Object.keys(this.a)) {
            if (d[k] !== undefined && d[k] !== null) this.a[k] = d[k];
          }
          if (this.a.applying_grade_id) this.onGradeChange();
        }
      });
    }
  }

  onGradeChange(): void {
    const gid = this.a.applying_grade_id;
    if (!gid) { this.sections.set([]); return; }
    this.svc.getSections(gid).subscribe((res) =>
      this.sections.set(pickList<Option>(res).map((s: any) => ({ id: s.id, name: s.name }))));
  }

  yearName(id: string): string { return this.years().find((y) => y.id === id)?.name || '—'; }
  gradeName(id: string): string { return this.grades().find((g) => g.id === id)?.name || '—'; }

  save(): void {
    if (!this.valid() || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    const payload = this.compact(this.a);

    if (this.isEdit()) {
      this.svc.updateApplicant(this.id()!, payload).subscribe({
        next: (res) => { const d = res?.data ?? res; this.done(d?.id ?? this.id()!); },
        error: (e) => this.fail(e),
      });
      return;
    }

    this.svc.createApplicant(payload).subscribe({
      next: (res) => {
        const created = res?.data ?? res;
        const newId = created?.id;
        if (newId && this.g.full_name) {
          this.svc.createGuardian({ applicant: newId, ...this.compact(this.g) }).subscribe({
            next: () => this.done(newId),
            error: () => this.done(newId),
          });
        } else {
          this.done(newId);
        }
      },
      error: (e) => this.fail(e),
    });
  }

  private compact(obj: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== '' && v !== null && v !== undefined) out[k] = v;
    }
    return out;
  }

  private done(id?: string): void {
    this.saving.set(false);
    if (id) this.router.navigate(['/admissions/applications', id]);
    else this.router.navigate(['/admissions/applications']);
  }

  private fail(e: any): void {
    this.saving.set(false);
    this.error.set(e?.error?.message || e?.error?.detail || 'تعذّر حفظ الطلب. تأكد من صحة البيانات وحاول مجددًا.');
  }

  cancel(): void { this.router.navigate(['/admissions/applications']); }
}
