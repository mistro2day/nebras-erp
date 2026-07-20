import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ClinicService } from '../clinic.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';

/**
 * الإجازات المرضية.
 *
 * الاعتماد هنا ليس إجراءً ورقياً: يُبرّر غياب المريض تلقائياً في موديول
 * الحضور طوال مدة الإجازة. لذلك يُعرض أثره صراحةً قبل التنفيذ.
 */
@Component({
  selector: 'app-clinic-leaves',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="الإجازات المرضية" subtitle="طلبات الإجازة الطبية واعتمادها وأثرها على الحضور.">
        <button class="btn ghost" (click)="back()">رجوع للوحة</button>
        <button class="btn ghost" (click)="load()">تحديث</button>
        <button class="btn primary" (click)="openNew()">＋ إجازة مرضية</button>
      </nb-page-header>

      @if (showNew()) {
        <section class="form-card">
          <header class="fc-head">
            <h3>إجازة مرضية جديدة</h3>
            <button class="x" (click)="showNew.set(false)" aria-label="إغلاق">✕</button>
          </header>
          <div class="fc-body">
            <div class="fields">
              <label class="wide">
                <span>المريض <i>*</i></span>
                <select [(ngModel)]="form.person">
                  <option value="">اختر…</option>
                  <optgroup label="الطلاب">
                    @for (p of students(); track p.id) {
                      <option [value]="p.type + ':' + p.id">{{ p.name }} — {{ p.reference }}</option>
                    }
                  </optgroup>
                  <optgroup label="الموظفون والمعلمون">
                    @for (p of employees(); track p.id) {
                      <option [value]="p.type + ':' + p.id">{{ p.name }} — {{ p.reference }}</option>
                    }
                  </optgroup>
                </select>
              </label>
              <label>
                <span>من تاريخ <i>*</i></span>
                <input type="date" [(ngModel)]="form.start" />
              </label>
              <label>
                <span>إلى تاريخ <i>*</i></span>
                <input type="date" [(ngModel)]="form.end" />
              </label>
              <label class="wide">
                <span>السبب الطبي <i>*</i></span>
                <input [(ngModel)]="form.reason" placeholder="التشخيص أو سبب الراحة" />
              </label>
            </div>
            @if (error()) { <p class="err">{{ error() }}</p> }
          </div>
          <footer class="fc-acts">
            <button class="btn ghost" (click)="showNew.set(false)">إلغاء</button>
            <button class="btn primary" [disabled]="saving()" (click)="save()">
              {{ saving() ? 'جارٍ الحفظ…' : 'رفع الطلب' }}
            </button>
          </footer>
        </section>
      }

      <div class="chips">
        <button [class.on]="filter()===''" (click)="filter.set('')">الكل ({{ all().length }})</button>
        <button [class.on]="filter()==='pending'" (click)="filter.set('pending')">بانتظار الاعتماد ({{ countPending() }})</button>
        <button [class.on]="filter()==='approved'" (click)="filter.set('approved')">معتمدة ({{ countApproved() }})</button>
      </div>

      @if (loading()) {
        <nb-loading message="جارٍ تحميل الإجازات…"></nb-loading>
      } @else if (!filtered().length) {
        <div class="empty-card">لا توجد إجازات مطابقة.</div>
      } @else {
        <section class="list">
          @for (l of filtered(); track l.id) {
            <article class="leave" [class.approved]="l.status === 'approved'">
              <div class="l-main">
                <div class="l-who">
                  <strong>{{ l.patient_name }}</strong>
                  <span class="l-kind">{{ l.patient_type_label }}</span>
                </div>
                <span class="l-period">
                  {{ l.start_date }} ← {{ l.end_date }}
                  <b class="l-days">{{ l.days }} يوم</b>
                </span>
                @if (l.reason) { <span class="l-reason">{{ l.reason }}</span> }
              </div>
              <div class="l-side">
                <span class="badge" [class]="l.status">{{ statusText(l.status) }}</span>
                @if (l.status !== 'approved' && l.status !== 'rejected') {
                  <button class="act" (click)="approve(l)">اعتماد الإجازة</button>
                  <span class="a-hint">يُبرّر الغياب تلقائياً</span>
                } @else if (l.status === 'approved') {
                  <button class="link" (click)="go('/attendance/dashboard')">أثرها في الحضور ‹</button>
                }
              </div>
            </article>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 22px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .btn { font-family: inherit; font-size: 13px; font-weight: 700; padding: 8px 14px;
      border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn:disabled { opacity: .55; cursor: default; }

    .chips { display: flex; gap: 6px; margin-bottom: 13px; flex-wrap: wrap; }
    .chips button { font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer;
      background: var(--nb-surface); border: 1px solid var(--nb-border); color: var(--nb-text-muted);
      border-radius: 20px; padding: 6px 14px; }
    .chips button.on { background: var(--nb-primary-600); border-color: var(--nb-primary-600); color: #fff; }

    .list { display: flex; flex-direction: column; gap: 10px; }
    .leave { display: flex; gap: 16px; justify-content: space-between; flex-wrap: wrap;
      background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 14px 16px; }
    .leave.approved { border-inline-start: 4px solid #16A34A; }
    .l-main { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 220px; }
    .l-who { display: flex; align-items: baseline; gap: 9px; flex-wrap: wrap; }
    .l-who strong { font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .l-kind { font-size: 11px; color: var(--nb-text-muted); }
    .l-period { font-size: 12.5px; color: var(--nb-text-muted); font-family: ui-monospace, monospace; }
    .l-days { color: var(--nb-text); font-weight: 700; margin-inline-start: 8px;
      font-family: var(--nb-font-family); }
    .l-reason { font-size: 12px; color: var(--nb-text-muted); }

    .l-side { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
    .badge { font-size: 11px; font-weight: 700; border-radius: 20px; padding: 3px 11px; }
    .badge.draft, .badge.submitted, .badge.pending { background: #fffaf0; color: #B45309; }
    .badge.approved { background: #f0fdf4; color: #15803D; }
    .badge.rejected { background: #fef2f2; color: #B91C1C; }

    .act { border: 1px solid var(--nb-border); background: var(--nb-surface); border-radius: 8px;
      font-family: inherit; font-size: 11.5px; font-weight: 700; color: var(--nb-text);
      cursor: pointer; padding: 5px 12px; }
    .act:hover { border-color: var(--nb-primary-400); color: var(--nb-primary-700); }
    .a-hint { font-size: 10.5px; color: var(--nb-text-muted); }
    .link { border: none; background: none; font-family: inherit; font-size: 12px;
      font-weight: 700; color: var(--nb-primary-600); cursor: pointer; padding: 0; }

    .form-card { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); overflow: hidden; margin-bottom: 14px; }
    .fc-head { display: flex; align-items: center; justify-content: space-between; padding: 13px 18px;
      background: var(--nb-primary-50, #f5f6ff); border-bottom: 1px solid var(--nb-primary-100, #e3e6fb); }
    .fc-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--nb-primary-800, #2a3178); }
    .x { border: none; background: none; font-size: 15px; color: var(--nb-text-muted); cursor: pointer; padding: 4px; }
    .fc-body { padding: 16px 18px; }
    .fc-acts { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px;
      background: var(--nb-surface-raised); border-top: 1px solid var(--nb-border); }

    .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 640px) { .fields { grid-template-columns: 1fr; } }
    .fields .wide { grid-column: 1 / -1; }
    .fields label { display: grid; grid-template-rows: 18px auto; gap: 4px; }
    .fields label > span { font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .fields label i { color: #DC2626; font-style: normal; }
    .fields input, .fields select { height: 38px; padding: 0 11px; font-family: inherit; font-size: 13px;
      border: 1px solid var(--nb-border); border-radius: 8px; background: var(--nb-surface);
      color: var(--nb-text); width: 100%; box-sizing: border-box; }

    .err { margin: 12px 0 0; font-size: 12.5px; color: #B91C1C; background: #fef2f2;
      border: 1px solid #fecaca; border-radius: 8px; padding: 9px 12px; }
    .empty-card { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 30px; text-align: center;
      font-size: 13px; color: var(--nb-text-muted); }
  `],
})
export class ClinicLeavesComponent implements OnInit {
  private svc = inject(ClinicService);
  private router = inject(Router);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly showNew = signal(false);
  readonly filter = signal('');

  private leaves = signal<any[]>([]);
  private people = signal<any[]>([]);

  form: any = { person: '', start: '', end: '', reason: '' };

  readonly students = computed(() => this.people().filter((p) => p.type === 'student'));
  readonly employees = computed(() => this.people().filter((p) => p.type === 'employee'));

  private daysBetween(a: string, b: string): number {
    if (!a || !b) return 0;
    const d1 = new Date(a + 'T00:00:00').getTime();
    const d2 = new Date(b + 'T00:00:00').getTime();
    return Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
  }

  readonly all = computed(() =>
    this.leaves().map((l) => ({ ...l, days: this.daysBetween(l.start_date, l.end_date) })),
  );

  readonly filtered = computed(() => {
    const f = this.filter();
    return this.all()
      .filter((l) => {
        if (f === 'pending') return !['approved', 'rejected'].includes(l.status);
        if (f === 'approved') return l.status === 'approved';
        return true;
      })
      .sort((a, b) => (a.status === 'approved' ? 1 : 0) - (b.status === 'approved' ? 1 : 0));
  });

  countPending(): number { return this.all().filter((l) => !['approved', 'rejected'].includes(l.status)).length; }
  countApproved(): number { return this.all().filter((l) => l.status === 'approved').length; }

  statusText(s: string): string {
    return ({ draft: 'مسودة', submitted: 'بانتظار الاعتماد', pending: 'بانتظار الاعتماد',
      approved: 'معتمدة', rejected: 'مرفوضة' } as any)[s] || s;
  }

  openNew() {
    const today = new Date().toISOString().slice(0, 10);
    this.form = { person: '', start: today, end: today, reason: '' };
    this.error.set('');
    this.showNew.set(true);
  }

  save() {
    const f = this.form;
    if (!f.person || !f.start || !f.end || !f.reason?.trim()) {
      this.error.set('المريض وتاريخا البدء والانتهاء والسبب الطبي حقول مطلوبة.');
      return;
    }
    if (f.end < f.start) { this.error.set('تاريخ الانتهاء يجب ألّا يسبق تاريخ البدء.'); return; }

    const [type, id] = f.person.split(':');
    this.saving.set(true);
    this.error.set('');
    this.svc.createLeave({
      patient_user_id: id,
      patient_type: type,
      start_date: f.start,
      end_date: f.end,
      reason: f.reason.trim(),
      status: 'submitted',
    }).subscribe({
      next: () => { this.saving.set(false); this.showNew.set(false); this.load(); },
      error: (e: any) => {
        this.saving.set(false);
        const d = e?.details?.error ?? e?.details;
        this.error.set(typeof d === 'string' ? d : (e?.message || 'تعذّر حفظ الإجازة.'));
      },
    });
  }

  approve(l: any) {
    this.svc.approveLeave(l.id).subscribe({ next: () => this.load(), error: () => {} });
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const rows = (d: any) => (Array.isArray(d) ? d : (d?.data ?? d?.results ?? []));
    this.svc.getLeaves().subscribe({
      next: (d) => { this.leaves.set(rows(d)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.svc.getPeople().subscribe({ next: (d) => this.people.set(rows(d)), error: () => {} });
  }

  go(route: string) { this.router.navigateByUrl(route); }
  back() { this.router.navigateByUrl('/clinic/dashboard'); }
}
