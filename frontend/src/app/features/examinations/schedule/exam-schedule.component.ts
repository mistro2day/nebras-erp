import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExaminationsService } from '../examinations.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { NbDatepickerComponent } from '../../../shared/nebras/nb-datepicker.component';
import { Exam, ExamSession, ExamSchedule } from '../examinations.types';

/** الجدول واللجان — الدورات الامتحانية ومواعيد الامتحانات المرتبطة بها. */
@Component({
  selector: 'app-exam-schedule',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent, NbLoadingComponent, NbDatepickerComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="الجدول والدورات الامتحانية" subtitle="إدارة الدورات الامتحانية ومواعيد اللجان المرتبطة بالامتحانات والقاعات.">
        <button class="btn ghost" (click)="back()">رجوع للمركز</button>
      </nb-page-header>

      <div class="cols">
        <!-- الدورات -->
        <nb-panel title="الدورات الامتحانية" subtitle="فترات زمنية تُجمَع تحتها مواعيد اللجان.">
          <div class="mini-form">
            <input class="fld" placeholder="اسم الدورة" [(ngModel)]="sForm.name" />
            <input class="fld sm" placeholder="الرمز" [(ngModel)]="sForm.code" />
            <nb-datepicker class="dp" [(value)]="sForm.start_date" placeholder="من تاريخ"></nb-datepicker>
            <nb-datepicker class="dp" [(value)]="sForm.end_date" placeholder="إلى تاريخ"></nb-datepicker>
            <button class="btn primary sm" (click)="addSession()">إضافة</button>
          </div>
          <div class="list">
            @for (s of sessions(); track s.id) {
              <div class="item"><span class="dot" [class.on]="s.is_active"></span>
                <div class="grow"><strong>{{ s.name }}</strong><small>{{ s.start_date }} ← {{ s.end_date }}</small></div>
                <span class="chip" [class.on]="s.is_active">{{ s.is_active ? 'نشطة' : 'منتهية' }}</span>
              </div>
            }
            @if (!sessions().length) { <div class="empty">لا توجد دورات بعد.</div> }
          </div>
        </nb-panel>

        <!-- إضافة موعد -->
        <nb-panel title="جدولة موعد لجنة" subtitle="ربط امتحان بدورة وتحديد التاريخ والوقت والمدة.">
          <div class="grid">
            <label>الامتحان
              <select class="fld" [(ngModel)]="cForm.exam">
                <option value="">اختر الامتحان…</option>
                @for (e of exams(); track e.id) { <option [value]="e.id">{{ e.name }}</option> }
              </select>
            </label>
            <label>الدورة
              <select class="fld" [(ngModel)]="cForm.session">
                <option value="">اختر الدورة…</option>
                @for (s of sessions(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }
              </select>
            </label>
            <div class="fld-wrap"><span class="fld-lbl">التاريخ</span><nb-datepicker [(value)]="cForm.exam_date" placeholder="تاريخ الامتحان"></nb-datepicker></div>
            <label>المدة (دقيقة)<input class="fld" type="number" [(ngModel)]="cForm.duration_minutes" placeholder="120" /></label>
            <label>وقت البدء<input class="fld" type="time" [(ngModel)]="cForm.start_time" /></label>
            <label>وقت الانتهاء<input class="fld" type="time" [(ngModel)]="cForm.end_time" /></label>
          </div>
          <div class="form-actions">
            <button class="btn primary" [disabled]="saving()" (click)="addSchedule()">{{ saving() ? 'جارٍ…' : 'جدولة الموعد' }}</button>
          </div>
        </nb-panel>
      </div>

      <!-- مواعيد اللجان -->
      <nb-panel title="مواعيد اللجان المجدولة" subtitle="الجدول الزمني الكامل للامتحانات." [flush]="true" class="mt">
        <div class="table-wrap">
          <table class="nb-table">
            <thead><tr><th>الامتحان</th><th>الدورة</th><th>التاريخ</th><th>من — إلى</th><th>المدة</th></tr></thead>
            <tbody>
              @if (loading()) { <tr><td colspan="5"><nb-loading message="جارٍ التحميل…"></nb-loading></td></tr> }
              @else {
                @for (s of schedules(); track s.id) {
                  <tr>
                    <td><strong>{{ examName(s.exam) }}</strong></td>
                    <td>{{ sessionName(s.session) }}</td>
                    <td class="mono">{{ s.exam_date }}</td>
                    <td class="mono">{{ s.start_time }} — {{ s.end_time }}</td>
                    <td class="mono">{{ s.duration_minutes }} د</td>
                  </tr>
                }
                @if (!schedules().length) { <tr><td colspan="5" class="empty">لا توجد مواعيد مجدولة.</td></tr> }
              }
            </tbody>
          </table>
        </div>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 900px) { .cols { grid-template-columns: 1fr; } }
    .mt { margin-top: 12px; }
    .mini-form { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    label, .fld-wrap { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--nb-text-muted); }
    .fld-lbl { font-size: 12px; color: var(--nb-text-muted); }
    .fld { height: 34px; padding: 0 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; width: 100%; box-sizing: border-box; }
    .fld.sm { max-width: 100px; }
    .dp { min-width: 150px; }
    .form-actions { margin-top: 12px; }
    .list { display: flex; flex-direction: column; gap: 6px; }
    .item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius); }
    .item .grow { flex: 1; display: flex; flex-direction: column; }
    .item small { font-size: 11px; color: var(--nb-text-muted); }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--nb-text-faint); }
    .dot.on { background: var(--nb-success); }
    .chip { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: var(--nb-radius-pill); background: var(--nb-border-soft); color: var(--nb-text-secondary); }
    .chip.on { background: var(--nb-success-bg); color: var(--nb-success); }
    .empty { text-align: center; padding: 18px; color: var(--nb-text-muted); font-size: 13px; }
    .table-wrap { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .nb-table th { text-align: start; font-weight: 700; font-size: 11px; color: var(--nb-text-muted);
      background: var(--nb-surface-raised); padding: 9px 12px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table td { padding: 9px 12px; border-bottom: 1px solid var(--nb-border-row); color: var(--nb-text); }
    .nb-table tr:last-child td { border-bottom: none; }
    .mono { font-variant-numeric: tabular-nums; }
    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.sm { height: 34px; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn:disabled { opacity: .6; cursor: not-allowed; }
  `],
})
export class ExamScheduleComponent implements OnInit {
  private service = inject(ExaminationsService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  loading = signal(true);
  saving = signal(false);
  exams = signal<Exam[]>([]);
  sessions = signal<ExamSession[]>([]);
  schedules = signal<ExamSchedule[]>([]);

  sForm: { name: string; code: string; start_date: string; end_date: string; is_active: boolean } =
    { name: '', code: '', start_date: '', end_date: '', is_active: true };
  cForm: { exam: string; session: string; exam_date: string; start_time: string; end_time: string; duration_minutes: number } =
    { exam: '', session: '', exam_date: '', start_time: '', end_time: '', duration_minutes: 120 };

  ngOnInit() {
    this.service.getExams().subscribe((r) => { if (r?.success) this.exams.set(r.data); });
    this.service.getSessions().subscribe((r) => { if (r?.success) this.sessions.set(r.data); });
    this.loadSchedules();
  }
  loadSchedules() {
    this.loading.set(true);
    this.service.getSchedules().subscribe({
      next: (r) => { if (r?.success) this.schedules.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  addSession() {
    if (!this.sForm.name || !this.sForm.code) { this.notify.error('أدخل اسم الدورة ورمزها.'); return; }
    this.service.createSession(this.sForm).subscribe({
      next: (r) => { if (r?.success) { this.notify.success('تمت إضافة الدورة.'); this.sForm = { name: '', code: '', start_date: '', end_date: '', is_active: true };
        this.service.getSessions().subscribe((x) => { if (x?.success) this.sessions.set(x.data); }); } },
      error: () => this.notify.error('تعذر حفظ الدورة.'),
    });
  }

  addSchedule() {
    if (!this.cForm.exam || !this.cForm.session || !this.cForm.exam_date) { this.notify.error('اختر الامتحان والدورة والتاريخ.'); return; }
    this.saving.set(true);
    this.service.createSchedule(this.cForm).subscribe({
      next: (r) => { this.saving.set(false); if (r?.success) { this.notify.success('تمت جدولة الموعد.'); this.cForm = { exam: '', session: '', exam_date: '', start_time: '', end_time: '', duration_minutes: 120 }; this.loadSchedules(); } else { this.notify.error(r?.message || 'تعذر الجدولة.'); } },
      error: () => { this.saving.set(false); this.notify.error('حدث خطأ بالخادم.'); },
    });
  }

  examName(id: string): string { return this.exams().find((e) => e.id === id)?.name || '—'; }
  sessionName(id: string): string { return this.sessions().find((s) => s.id === id)?.name || '—'; }
  back() { this.router.navigateByUrl('/examinations/dashboard'); }
}
