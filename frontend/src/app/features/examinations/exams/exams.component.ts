import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExaminationsService } from '../examinations.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { Exam, Subject, ExamCategory, ExamType, AcademicYear, Term } from '../examinations.types';

type ExamForm = {
  name: string; subject_id: string; category: string; exam_type: string;
  academic_year: string; term: string; max_marks: number; pass_marks: number; weight_percentage: number; status: string;
};

/**
 * الامتحانات (Exams) — إنشاء ونشر الامتحانات المرتبطة بالمواد والسنوات والفصول.
 */
@Component({
  selector: 'app-exams',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="الامتحانات" subtitle="إنشاء واعتماد ونشر الامتحانات، وربطها بالمواد والسنوات والفصول الدراسية.">
        <button class="btn ghost" (click)="back()">رجوع للمركز</button>
        <button class="btn primary" (click)="toggleForm()">＋ امتحان جديد</button>
      </nb-page-header>

      <div class="filters">
        <input class="fld search" placeholder="بحث بالاسم أو الرمز…" [(ngModel)]="search" />
        <select class="fld" [(ngModel)]="statusFilter">
          <option value="">كل الحالات</option>
          @for (s of statuses; track s.v) { <option [value]="s.v">{{ s.t }}</option> }
        </select>
        <input class="fld" list="subjects-filter-list" [(ngModel)]="filterSubjectQuery" (ngModelChange)="onFilterSubjectPick()"
               placeholder="ابحث بالمادة…" />
        <datalist id="subjects-filter-list">
          @for (s of subjects(); track s.id) { <option [value]="s.arabic_name"></option> }
        </datalist>
        <span class="count">{{ filtered().length }} امتحان</span>
      </div>

      @if (showForm()) {
        <nb-panel title="إنشاء امتحان جديد" class="mb">
          <div class="grid">
            <label>اسم الامتحان<input class="fld" [(ngModel)]="form.name" placeholder="اختبار الرياضيات النهائي" /></label>
            <label>المادة الدراسية
              <input class="fld" list="subjects-form-list" [(ngModel)]="subjectQuery" (ngModelChange)="onSubjectPick()"
                     placeholder="ابحث واختر المادة…" />
              <datalist id="subjects-form-list">
                @for (s of subjects(); track s.id) { <option [value]="s.arabic_name"></option> }
              </datalist>
            </label>
            <label>الفئة
              <select class="fld" [(ngModel)]="form.category">
                <option value="">اختر الفئة…</option>
                @for (c of categories(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
              </select>
            </label>
            <label>النوع
              <select class="fld" [(ngModel)]="form.exam_type">
                <option value="">اختر النوع…</option>
                @for (t of types(); track t.id) { <option [value]="t.id">{{ t.name }}</option> }
              </select>
            </label>
            <label>السنة الدراسية
              <select class="fld" [(ngModel)]="form.academic_year">
                <option value="">اختر السنة…</option>
                @for (y of years(); track y.id) { <option [value]="y.code || y.name">{{ y.name }}</option> }
              </select>
            </label>
            <label>الفصل الدراسي
              <select class="fld" [(ngModel)]="form.term">
                <option value="">اختر الفصل…</option>
                @for (t of terms(); track t.id) { <option [value]="t.code || t.name">{{ t.name }}</option> }
              </select>
            </label>
            <label>الدرجة الكبرى<input class="fld" type="number" [(ngModel)]="form.max_marks" placeholder="100" /></label>
            <label>درجة النجاح<input class="fld" type="number" [(ngModel)]="form.pass_marks" placeholder="50" /></label>
            <label>الوزن (%)<input class="fld" type="number" [(ngModel)]="form.weight_percentage" placeholder="100" /></label>
          </div>
          <div class="form-actions">
            <button class="btn primary" [disabled]="saving()" (click)="save()">{{ saving() ? 'جارٍ الحفظ…' : 'حفظ الامتحان' }}</button>
            <button class="btn ghost" (click)="showForm.set(false)">إلغاء</button>
            <span class="auto-hint">رمز الامتحان يُولَّد تلقائياً عند الحفظ.</span>
          </div>
        </nb-panel>
      }

      <nb-panel [flush]="true">
        <div class="table-wrap">
          <table class="nb-table">
            <thead><tr><th>الرمز</th><th>الامتحان</th><th>المادة</th><th>العام / الفصل</th><th>الكبرى / النجاح</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              @if (loading()) {
                <tr><td colspan="7"><nb-loading message="جارٍ تحميل الامتحانات…"></nb-loading></td></tr>
              } @else {
                @for (e of filtered(); track e.id) {
                  <tr>
                    <td class="mono"><strong>{{ e.code }}</strong></td>
                    <td><strong>{{ e.name }}</strong></td>
                    <td>{{ subjectName(e.subject_id) }}</td>
                    <td>{{ e.academic_year }} — {{ e.term }}</td>
                    <td class="mono">{{ e.max_marks }} / {{ e.pass_marks }}</td>
                    <td><span class="badge" [class]="e.status">{{ statusLabel(e.status) }}</span></td>
                    <td class="actions">
                      @if (e.status === 'draft') { <button class="mini info" (click)="setStatus(e, 'approved')">اعتماد</button> }
                      @if (e.status === 'approved') { <button class="mini ok" (click)="setStatus(e, 'published')">نشر</button> }
                      @if (e.status === 'published') { <button class="mini warn" (click)="setStatus(e, 'locked')">إغلاق</button> }
                    </td>
                  </tr>
                }
                @if (!filtered().length) { <tr><td colspan="7" class="empty">لا توجد امتحانات مطابقة.</td></tr> }
              }
            </tbody>
          </table>
        </div>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .mb { margin-bottom: 16px; }
    .filters { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
    .filters .count { margin-inline-start: auto; font-size: 12px; color: var(--nb-text-muted); }
    .fld { height: 34px; padding: 0 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; }
    .fld.search { min-width: 240px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }
    label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--nb-text-muted); }
    label .fld { width: 100%; box-sizing: border-box; }
    .form-actions { display: flex; gap: 10px; margin-top: 14px; align-items: center; }
    .auto-hint { font-size: 11.5px; color: var(--nb-text-muted); }
    .table-wrap { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .nb-table th { text-align: start; font-weight: 700; font-size: 11px; color: var(--nb-text-muted);
      background: var(--nb-surface-raised); padding: 9px 12px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table td { padding: 9px 12px; border-bottom: 1px solid var(--nb-border-row); color: var(--nb-text); }
    .nb-table tr:last-child td { border-bottom: none; }
    .nb-table tbody tr:hover td { background: var(--nb-surface-raised); }
    .mono { font-variant-numeric: tabular-nums; }
    .empty { text-align: center; padding: 26px; color: var(--nb-text-muted); }
    .badge { display: inline-flex; padding: 2px 8px; font-size: 11px; font-weight: 700; border-radius: var(--nb-radius-sm); background: var(--nb-border-soft); color: var(--nb-text-secondary); }
    .badge.published { background: var(--nb-success-bg); color: var(--nb-success); }
    .badge.approved { background: var(--nb-info-bg); color: var(--nb-info); }
    .badge.locked { background: var(--nb-warning-bg); color: var(--nb-warning); }
    .actions { display: flex; gap: 6px; }
    .mini { height: 26px; padding: 0 10px; font-size: 11.5px; font-weight: 700; border-radius: var(--nb-radius-sm); border: none; cursor: pointer; }
    .mini.ok { background: var(--nb-success-bg); color: var(--nb-success); }
    .mini.info { background: var(--nb-info-bg); color: var(--nb-info); }
    .mini.warn { background: var(--nb-warning-bg); color: var(--nb-warning); }
    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.primary:hover:not(:disabled) { background: var(--nb-primary-700); }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn:disabled { opacity: .6; cursor: not-allowed; }
  `],
})
export class ExamsComponent implements OnInit {
  private service = inject(ExaminationsService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  exams = signal<Exam[]>([]);
  subjects = signal<Subject[]>([]);
  categories = signal<ExamCategory[]>([]);
  types = signal<ExamType[]>([]);
  years = signal<AcademicYear[]>([]);
  terms = signal<Term[]>([]);

  search = '';
  statusFilter = '';
  subjectFilter = '';
  subjectQuery = '';        // نص البحث في حقل المادة بنموذج الإنشاء
  filterSubjectQuery = '';  // نص البحث في مرشّح المادة بالأعلى

  readonly statuses = [
    { v: 'draft', t: 'مسودة' }, { v: 'review', t: 'مراجعة' }, { v: 'approved', t: 'معتمد' },
    { v: 'published', t: 'منشور' }, { v: 'locked', t: 'مغلق' }, { v: 'archived', t: 'مؤرشف' },
  ];

  form: ExamForm = this.blank();
  blank(): ExamForm {
    return { name: '', subject_id: '', category: '', exam_type: '', academic_year: '', term: '',
      max_marks: 100, pass_marks: 50, weight_percentage: 100, status: 'draft' };
  }

  /** ربط اختيار المادة في نموذج الإنشاء (بحث بالاسم → معرّف). */
  onSubjectPick() {
    this.form.subject_id = this.subjects().find((s) => s.arabic_name === this.subjectQuery)?.id ?? '';
  }
  /** ربط مرشّح المادة بالأعلى (بحث بالاسم → معرّف، أو الكل عند الفراغ). */
  onFilterSubjectPick() {
    this.subjectFilter = this.filterSubjectQuery
      ? this.subjects().find((s) => s.arabic_name === this.filterSubjectQuery)?.id ?? ''
      : '';
  }

  // دالة (لا computed) لأن المرشّحات (search/statusFilter/subjectFilter) حقول ngModel
  // عادية وليست signals؛ الدالة تُقيَّم في كل دورة كشف تغيّر فيعمل البحث فورياً.
  filtered(): Exam[] {
    const s = this.search.trim().toLowerCase();
    return this.exams().filter((e) =>
      (!s || (e.name || '').toLowerCase().includes(s) || (e.code || '').toLowerCase().includes(s)) &&
      (!this.statusFilter || e.status === this.statusFilter) &&
      (!this.subjectFilter || e.subject_id === this.subjectFilter));
  }

  ngOnInit() {
    this.load();
    this.service.getSubjects().subscribe((r) => { if (r?.success) this.subjects.set(r.data); });
    this.service.getCategories().subscribe((r) => { if (r?.success) this.categories.set(r.data); });
    this.service.getTypes().subscribe((r) => { if (r?.success) this.types.set(r.data); });
    this.service.getAcademicYears().subscribe((r) => { if (r?.success) this.years.set(r.data); });
    this.service.getTerms().subscribe((r) => { if (r?.success) this.terms.set(r.data); });
  }

  load() {
    this.loading.set(true);
    this.service.getExams().subscribe({
      next: (r) => { if (r?.success) this.exams.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  toggleForm() { this.showForm.update((v) => !v); }
  subjectName(id: string): string { return this.subjects().find((s) => s.id === id)?.arabic_name || '—'; }
  statusLabel(s: string): string { return this.statuses.find((x) => x.v === s)?.t || (s === 'closed' ? 'مغلق نهائياً' : s); }

  save() {
    if (!this.form.name || !this.form.subject_id || !this.form.category || !this.form.exam_type) {
      this.notify.error('يرجى تعبئة الاسم والمادة والفئة والنوع.'); return;
    }
    this.saving.set(true);
    this.service.createExam(this.form).subscribe({
      next: (r) => {
        this.saving.set(false);
        if (r?.success) { this.notify.success(`تم إنشاء الامتحان برمز ${r.data?.code ?? ''} بنجاح.`); this.showForm.set(false); this.form = this.blank(); this.subjectQuery = ''; this.load(); }
        else { this.notify.error(r?.message || 'تعذر حفظ الامتحان.'); }
      },
      error: () => { this.saving.set(false); this.notify.error('حدث خطأ أثناء الاتصال بالخادم.'); },
    });
  }

  setStatus(e: Exam, status: string) {
    this.service.updateExam(e.id, { status }).subscribe({
      next: (r) => { if (r?.success) { this.notify.success('تم تحديث حالة الامتحان.'); this.load(); } },
      error: () => this.notify.error('تعذر تحديث الحالة.'),
    });
  }

  back() { this.router.navigateByUrl('/examinations/dashboard'); }
}
