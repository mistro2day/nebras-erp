import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExaminationsService } from '../examinations.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { ExamResult, Transcript, AcademicStanding, Subject, Student } from '../examinations.types';

/** النتائج والكشوف — النتائج النهائية المجمّعة، كشوف الدرجات، والحالة الأكاديمية. */
@Component({
  selector: 'app-results',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="النتائج والكشوف الأكاديمية" subtitle="النتائج النهائية المجمّعة، كشوف الدرجات الرسمية، والحالات الأكاديمية للطلاب.">
        <button class="btn ghost" (click)="back()">رجوع للمركز</button>
      </nb-page-header>

      <div class="tabs">
        <button class="tab" [class.on]="tab()==='results'" (click)="tab.set('results')">النتائج النهائية</button>
        <button class="tab" [class.on]="tab()==='transcripts'" (click)="tab.set('transcripts')">كشوف الدرجات</button>
        <button class="tab" [class.on]="tab()==='standings'" (click)="tab.set('standings')">الحالات الأكاديمية</button>
      </div>

      <!-- مؤشرات -->
      @if (tab()==='results') {
        <div class="kpis">
          <div class="kpi"><span class="kl">إجمالي النتائج</span><span class="kv">{{ results().length }}</span></div>
          <div class="kpi"><span class="kl">ناجحون</span><span class="kv ok">{{ passed() }}</span></div>
          <div class="kpi"><span class="kl">راسبون</span><span class="kv bad">{{ failed() }}</span></div>
          <div class="kpi"><span class="kl">نسبة النجاح</span><span class="kv info">{{ passRate() | number:'1.0-0' }}%</span></div>
        </div>
      }

      <nb-panel [flush]="true">
        <div class="table-wrap">
          @if (tab()==='results') {
            <table class="nb-table">
              <thead><tr><th>الطالب</th><th>المادة</th><th>العام / الفصل</th><th>امتحان</th><th>أعمال</th><th>المجموع</th><th>النسبة المئوية</th><th>النتيجة</th></tr></thead>
              <tbody>
                @if (loading()) { <tr><td colspan="8"><nb-loading message="جارٍ التحميل…"></nb-loading></td></tr> }
                @else {
                  @for (r of results(); track r.id) {
                    <tr>
                      <td><strong>{{ studentName(r.student_id) }}</strong></td>
                      <td>{{ subjectName(r.subject_id) }}</td>
                      <td>{{ r.academic_year }} — {{ r.term }}</td>
                      <td class="mono">{{ r.exam_marks }}</td>
                      <td class="mono">{{ r.assessment_marks }}</td>
                      <td class="mono"><strong>{{ r.total_marks }}</strong></td>
                      <td class="mono"><span class="pct">{{ percent(r) | number:'1.0-1' }}%</span></td>
                      <td><span class="badge" [class.ok]="r.is_passed" [class.bad]="!r.is_passed">{{ r.is_passed ? 'ناجح' : 'راسب' }}</span></td>
                    </tr>
                  }
                  @if (!results().length) { <tr><td colspan="8" class="empty">لا توجد نتائج مرصودة بعد.</td></tr> }
                }
              </tbody>
            </table>
          }
          @if (tab()==='transcripts') {
            <table class="nb-table">
              <thead><tr><th>الطالب</th><th>العام الدراسي</th><th>المعدل التراكمي</th><th>الساعات</th><th>الحالة</th></tr></thead>
              <tbody>
                @for (t of transcripts(); track t.id) {
                  <tr>
                    <td><strong>{{ studentName(t.student_id) }}</strong></td>
                    <td>{{ t.academic_year }}</td>
                    <td class="mono"><strong>{{ t.cgpa }}</strong></td>
                    <td class="mono">{{ t.total_credits }}</td>
                    <td><span class="badge" [class.warn]="t.is_locked">{{ t.is_locked ? 'مقفل ومعتمد' : 'مسودة' }}</span></td>
                  </tr>
                }
                @if (!transcripts().length) { <tr><td colspan="5" class="empty">لا كشوف صادرة بعد.</td></tr> }
              </tbody>
            </table>
          }
          @if (tab()==='standings') {
            <table class="nb-table">
              <thead><tr><th>الطالب</th><th>العام / الفصل</th><th>الحالة الأكاديمية</th><th>ملاحظات</th></tr></thead>
              <tbody>
                @for (s of standings(); track s.id) {
                  <tr>
                    <td><strong>{{ studentName(s.student_id) }}</strong></td>
                    <td>{{ s.academic_year }} — {{ s.term }}</td>
                    <td><span class="badge" [class]="standingClass(s.standing)">{{ standingLabel(s.standing) }}</span></td>
                    <td class="muted">{{ s.remarks || '—' }}</td>
                  </tr>
                }
                @if (!standings().length) { <tr><td colspan="4" class="empty">لا حالات مسجّلة.</td></tr> }
              </tbody>
            </table>
          }
        </div>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .tabs { display: flex; gap: 6px; margin-bottom: 14px; }
    .tab { height: 34px; padding: 0 16px; border: 1px solid var(--nb-border); background: var(--nb-surface); color: var(--nb-text-secondary);
      border-radius: var(--nb-radius); font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
    .tab.on { background: var(--nb-primary-600); border-color: var(--nb-primary-600); color: #fff; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; }
    @media (max-width: 800px) { .kpis { grid-template-columns: repeat(2, 1fr); } }
    .kpi { display: flex; flex-direction: column; gap: 3px; padding: 12px 16px; background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); }
    .kl { font-size: 12px; color: var(--nb-text-muted); }
    .kv { font-size: 22px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .kv.ok { color: var(--nb-success); } .kv.bad { color: var(--nb-danger); } .kv.info { color: var(--nb-info); }
    .table-wrap { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .nb-table th { text-align: start; font-weight: 700; font-size: 11px; color: var(--nb-text-muted);
      background: var(--nb-surface-raised); padding: 9px 12px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table td { padding: 9px 12px; border-bottom: 1px solid var(--nb-border-row); color: var(--nb-text); }
    .mono { font-variant-numeric: tabular-nums; }
    .muted { color: var(--nb-text-muted); }
    .pct { font-weight: 800; color: var(--nb-primary-600); }
    .empty { text-align: center; padding: 26px; color: var(--nb-text-muted); }
    .badge { display: inline-flex; padding: 2px 8px; font-size: 11px; font-weight: 700; border-radius: var(--nb-radius-sm); background: var(--nb-border-soft); color: var(--nb-text-secondary); }
    .badge.ok { background: var(--nb-success-bg); color: var(--nb-success); }
    .badge.bad { background: var(--nb-danger-bg); color: var(--nb-danger); }
    .badge.warn { background: var(--nb-warning-bg); color: var(--nb-warning); }
    .badge.good { background: var(--nb-success-bg); color: var(--nb-success); }
    .badge.dist { background: var(--nb-info-bg); color: var(--nb-info); }
    .badge.warning { background: var(--nb-warning-bg); color: var(--nb-warning); }
    .badge.danger { background: var(--nb-danger-bg); color: var(--nb-danger); }
    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
  `],
})
export class ResultsComponent implements OnInit {
  private service = inject(ExaminationsService);
  private router = inject(Router);

  tab = signal<'results' | 'transcripts' | 'standings'>('results');
  loading = signal(true);
  results = signal<ExamResult[]>([]);
  transcripts = signal<Transcript[]>([]);
  standings = signal<AcademicStanding[]>([]);
  subjects = signal<Subject[]>([]);
  students = signal<Student[]>([]);

  passed = computed(() => this.results().filter((r) => r.is_passed).length);
  failed = computed(() => this.results().filter((r) => !r.is_passed).length);
  passRate = computed(() => (this.results().length ? (this.passed() / this.results().length) * 100 : 0));

  ngOnInit() {
    this.service.getSubjects().subscribe((r) => { if (r?.success) this.subjects.set(r.data); });
    this.service.getStudents().subscribe((r) => { if (r?.success) this.students.set(r.data); });
    this.service.getResults().subscribe({ next: (r) => { if (r?.success) this.results.set(r.data); this.loading.set(false); }, error: () => this.loading.set(false) });
    this.service.getTranscripts().subscribe((r) => { if (r?.success) this.transcripts.set(r.data); });
    this.service.getStandings().subscribe((r) => { if (r?.success) this.standings.set(r.data); });
  }

  /** النسبة المئوية للنتيجة (المجموع من 100). */
  percent(r: ExamResult): number { return Number(r.total_marks) || 0; }
  subjectName(id: string): string { return this.subjects().find((s) => s.id === id)?.arabic_name || '—'; }
  studentName(id: string): string {
    const s = this.students().find((x) => x.id === id);
    return s?.profile?.arabic_name || s?.student_number || (id || '').slice(0, 8) + '…';
  }
  standingLabel(v: string): string { const m: Record<string, string> = { good: 'مستمر', distinction: 'تميّز أكاديمي', warning: 'إنذار', probation: 'تحت المراقبة', suspended: 'موقوف' }; return m[v] || v; }
  standingClass(v: string): string { const m: Record<string, string> = { good: 'good', distinction: 'dist', warning: 'warning', probation: 'warning', suspended: 'danger' }; return m[v] || ''; }
  back() { this.router.navigateByUrl('/examinations/dashboard'); }
}
