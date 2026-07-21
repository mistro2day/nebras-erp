import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExaminationsService } from '../examinations.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { Exam, ExamSchedule, ExamRoom, Section, Grade, Student, RosterRow } from '../examinations.types';

/**
 * رصد الدرجات (Mark Entry) — يربط الامتحان بجدوله ولجنته وطلاب الشعبة،
 * ويرصد درجات الطلاب فرديًا عبر المسار الآمن (enter-mark) مع التدقيق.
 */
@Component({
  selector: 'app-mark-entry',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="رصد الدرجات" subtitle="اختر الامتحان ولجنته، ثم كوّن الكشف من طلاب الشعبة وارصد الدرجات بالمسار الآمن.">
        <button class="btn ghost" (click)="back()">رجوع للمركز</button>
      </nb-page-header>

      <!-- منتقي اللجنة -->
      <nb-panel title="تحديد اللجنة" subtitle="الامتحان ← الجلسة/الموعد ← القاعة ← الشعبة." class="mb">
        <div class="grid">
          <label>الامتحان
            <select class="fld" [(ngModel)]="examId" (ngModelChange)="onExamChange()">
              <option value="">اختر الامتحان…</option>
              @for (e of publishedExams(); track e.id) { <option [value]="e.id">{{ e.name }} ({{ e.code }})</option> }
            </select>
          </label>
          <label>موعد اللجنة (الجدول)
            <select class="fld" [(ngModel)]="scheduleId" (ngModelChange)="loadRoster()">
              <option value="">اختر الموعد…</option>
              @for (s of examSchedules(); track s.id) { <option [value]="s.id">{{ s.exam_date }} — {{ s.start_time }}</option> }
            </select>
          </label>
          <label>القاعة
            <select class="fld" [(ngModel)]="roomId">
              <option value="">اختر القاعة…</option>
              @for (r of rooms(); track r.id) { <option [value]="r.id">{{ r.name }} (سعة {{ r.capacity }})</option> }
            </select>
          </label>
          <label>الشعبة (لتوليد الكشف)
            <select class="fld" [(ngModel)]="sectionId">
              <option value="">اختر الشعبة…</option>
              @for (s of sections(); track s.id) { <option [value]="s.id">{{ gradeName(s.grade) }} — {{ s.name }}</option> }
            </select>
          </label>
        </div>
        <div class="form-actions">
          <button class="btn primary" [disabled]="!canGenerate() || generating()" (click)="generateRoster()">
            {{ generating() ? 'جارٍ التوليد…' : 'توليد كشف اللجنة من الشعبة' }}
          </button>
          <span class="hint">يُنشئ سجل لجنة لكل طالب في الشعبة على الموعد والقاعة المحددين.</span>
        </div>
      </nb-panel>

      <!-- كشف الرصد -->
      <nb-panel title="كشف رصد الدرجات" [subtitle]="rosterSubtitle()" [flush]="true">
        <div class="table-wrap">
          <table class="nb-table">
            <thead><tr><th>#</th><th>الطالب</th><th>المقعد</th><th>القاعة</th><th>الدرجة المرصودة</th><th>حاضر؟</th><th>حفظ</th></tr></thead>
            <tbody>
              @if (loadingRoster()) {
                <tr><td colspan="7"><nb-loading message="جارٍ تحميل كشف اللجنة…"></nb-loading></td></tr>
              } @else {
                @for (row of roster(); track row.id; let i = $index) {
                  <tr>
                    <td class="mono">{{ i + 1 }}</td>
                    <td><strong>{{ studentName(row.student_id) }}</strong></td>
                    <td class="mono">{{ row.seat_number || '—' }}</td>
                    <td>{{ roomName(row.room) }}</td>
                    <td><input type="number" class="mark" [(ngModel)]="row.tempMark" placeholder="—" [disabled]="!row.present" /></td>
                    <td><input type="checkbox" [(ngModel)]="row.present" /></td>
                    <td><button class="mini ok" [disabled]="row.saving" (click)="saveMark(row)">{{ row.saving ? '…' : 'حفظ' }}</button></td>
                  </tr>
                }
                @if (!roster().length) { <tr><td colspan="7" class="empty">لا يوجد طلاب في الكشف — اختر لجنة وولّد الكشف من شعبة.</td></tr> }
              }
            </tbody>
          </table>
        </div>
        @if (roster().length) {
          <div class="foot">
            <span>عدد الطلاب: <b>{{ roster().length }}</b></span>
            <button class="btn primary sm" [disabled]="bulkSaving()" (click)="saveAll()">{{ bulkSaving() ? 'جارٍ الحفظ…' : 'حفظ كل الدرجات المدخلة' }}</button>
          </div>
        }
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .mb { margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }
    label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--nb-text-muted); }
    .fld { height: 34px; padding: 0 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; width: 100%; box-sizing: border-box; }
    .form-actions { display: flex; align-items: center; gap: 12px; margin-top: 14px; flex-wrap: wrap; }
    .hint { font-size: 11.5px; color: var(--nb-text-muted); }
    .table-wrap { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .nb-table th { text-align: start; font-weight: 700; font-size: 11px; color: var(--nb-text-muted);
      background: var(--nb-surface-raised); padding: 9px 12px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table td { padding: 8px 12px; border-bottom: 1px solid var(--nb-border-row); color: var(--nb-text); }
    .nb-table tr:last-child td { border-bottom: none; }
    .nb-table tbody tr:hover td { background: var(--nb-surface-raised); }
    .mono { font-variant-numeric: tabular-nums; }
    .empty { text-align: center; padding: 26px; color: var(--nb-text-muted); }
    .mark { height: 30px; width: 110px; padding: 0 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; }
    .mark:disabled { opacity: .5; }
    .mini { height: 26px; padding: 0 12px; font-size: 11.5px; font-weight: 700; border-radius: var(--nb-radius-sm); border: none; cursor: pointer; }
    .mini.ok { background: var(--nb-success-bg); color: var(--nb-success); }
    .mini:disabled { opacity: .6; cursor: not-allowed; }
    .foot { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid var(--nb-border-soft); font-size: 13px; }
    .foot b { font-variant-numeric: tabular-nums; }
    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.sm { height: 30px; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.primary:hover:not(:disabled) { background: var(--nb-primary-700); }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn:disabled { opacity: .6; cursor: not-allowed; }
  `],
})
export class MarkEntryComponent implements OnInit {
  private service = inject(ExaminationsService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  exams = signal<Exam[]>([]);
  schedules = signal<ExamSchedule[]>([]);
  rooms = signal<ExamRoom[]>([]);
  sections = signal<Section[]>([]);
  grades = signal<Grade[]>([]);
  students = signal<Student[]>([]);
  roster = signal<RosterRow[]>([]);

  loadingRoster = signal(false);
  generating = signal(false);
  bulkSaving = signal(false);

  examId = '';
  scheduleId = '';
  roomId = '';
  sectionId = '';

  publishedExams = computed(() => this.exams().filter((e) => e.status === 'published' || e.status === 'locked'));
  // دوال (لا computed) لأنها تعتمد على حقول ngModel عادية (examId…) وليست signals،
  // فالـ computed لن يُعاد حسابه عند تغيّرها. الدالة تُقيَّم في كل دورة كشف تغيّر.
  examSchedules(): ExamSchedule[] { return this.schedules().filter((s) => s.exam === this.examId); }
  canGenerate(): boolean { return !!this.scheduleId && !!this.roomId && !!this.sectionId; }

  ngOnInit() {
    this.service.getExams().subscribe((r) => { if (r?.success) this.exams.set(r.data); });
    this.service.getSchedules().subscribe((r) => { if (r?.success) this.schedules.set(r.data); });
    this.service.getRooms().subscribe((r) => { if (r?.success) this.rooms.set(r.data); });
    this.service.getSections().subscribe((r) => { if (r?.success) this.sections.set(r.data); });
    this.service.getGrades().subscribe((r) => { if (r?.success) this.grades.set(r.data); });
    this.service.getStudents().subscribe((r) => { if (r?.success) this.students.set(r.data); });
  }

  onExamChange() { this.scheduleId = ''; this.roster.set([]); }

  rosterSubtitle(): string {
    const ex = this.exams().find((e) => e.id === this.examId);
    return ex ? `${ex.name} — الكبرى ${ex.max_marks} / النجاح ${ex.pass_marks}` : 'اختر امتحانًا ولجنة لعرض الكشف.';
  }

  loadRoster() {
    if (!this.scheduleId) { this.roster.set([]); return; }
    this.loadingRoster.set(true);
    this.service.getStudentExams().subscribe({
      next: (r) => {
        const list: RosterRow[] = (r?.data ?? []).filter((se) => se.schedule === this.scheduleId)
          .map((se) => ({ ...se, tempMark: null, present: true, saving: false }));
        this.roster.set(list);
        this.loadingRoster.set(false);
      },
      error: () => this.loadingRoster.set(false),
    });
  }

  generateRoster() {
    const secStudents = this.students().filter((s) => this.studentSection(s) === this.sectionId);
    if (!secStudents.length) { this.notify.error('لا يوجد طلاب في هذه الشعبة.'); return; }
    this.generating.set(true);
    let done = 0; let ok = 0;
    secStudents.forEach((st, i) => {
      this.service.createStudentExam({
        schedule: this.scheduleId, student_id: st.id, room: this.roomId, seat_number: String(i + 1),
      }).subscribe({
        next: (r) => { if (r?.success) ok++; if (++done === secStudents.length) this.finishGenerate(ok); },
        error: () => { if (++done === secStudents.length) this.finishGenerate(ok); },
      });
    });
  }
  private finishGenerate(ok: number) {
    this.generating.set(false);
    this.notify.success(`تم توليد كشف اللجنة (${ok} طالب).`);
    this.loadRoster();
  }

  saveMark(row: RosterRow) {
    if (row.tempMark === null || row.tempMark === undefined || (row.tempMark as unknown) === '') { this.notify.error('أدخل الدرجة أولًا.'); return; }
    row.saving = true;
    this.service.enterMark(row.id, Number(row.tempMark), 'رصد درجة من كشف اللجنة').subscribe({
      next: (r) => { row.saving = false; if (r?.success) this.notify.success(`تم رصد درجة ${this.studentName(row.student_id)}.`); },
      error: () => { row.saving = false; this.notify.error('تعذر رصد الدرجة.'); },
    });
  }

  saveAll() {
    const pending = this.roster().filter((r) => r.tempMark !== null && (r.tempMark as unknown) !== '' && r.present);
    if (!pending.length) { this.notify.error('لا توجد درجات مدخلة للحفظ.'); return; }
    this.bulkSaving.set(true);
    let done = 0; let ok = 0;
    pending.forEach((row) => {
      this.service.enterMark(row.id, Number(row.tempMark), 'رصد جماعي من كشف اللجنة').subscribe({
        next: (r) => { if (r?.success) ok++; if (++done === pending.length) this.finishBulk(ok, pending.length); },
        error: () => { if (++done === pending.length) this.finishBulk(ok, pending.length); },
      });
    });
  }
  private finishBulk(ok: number, total: number) {
    this.bulkSaving.set(false);
    this.notify.success(`تم حفظ ${ok} من ${total} درجة بنجاح.`);
  }

  // ---- مساعدات العرض والربط ----
  /** اسم الطالب من ملفه الشخصي (students → profile.arabic_name). */
  studentName(id: string): string {
    const s = this.students().find((x) => x.id === id);
    return s?.profile?.arabic_name || s?.student_number || (id || '').slice(0, 8) + '…';
  }
  /** شعبة الطالب من تسجيله النشط (enrollments[].section_id). */
  studentSection(s: Student): string {
    const enrollments = s.enrollments ?? [];
    const active = enrollments.find((e) => e.status === 'active') ?? enrollments[0];
    return active?.section_id ?? '';
  }
  roomName(id: string): string { return this.rooms().find((r) => r.id === id)?.name || '—'; }
  gradeName(id: string): string { return this.grades().find((g) => g.id === id)?.name || ''; }

  back() { this.router.navigateByUrl('/examinations/dashboard'); }
}
