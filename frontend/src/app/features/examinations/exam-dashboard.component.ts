import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ExaminationsService } from './examinations.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbLoadingComponent } from '../../shared/nebras/nb-loading.component';
import { ExamDashboardData } from './examinations.service';
import { Exam, ExamResult } from './examinations.types';

interface ExamTile { key: string; title: string; desc: string; icon: string; route: string; }

/**
 * مساحة عمل الامتحانات والتقييم الأكاديمي (Examinations Workspace)
 * العنصر المميّز: «منحنى توزيع الدرجات» — التمثيل الأصيل في عالم القياس والتقويم،
 * يُظهر تركّز درجات الطلاب حول المتوسط وموقع خط النجاح بصريًا فوق مدرّج تكراري حقيقي.
 * البقية هادئة ومنضبطة على غرار مساحات العمل في الأنظمة المؤسسية.
 */
@Component({
  selector: 'app-exam-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NbPageHeaderComponent, NbPanelComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="مركز الامتحانات والتقويم الأكاديمي"
        subtitle="مساحة عمل موحّدة للامتحانات، بنك الأسئلة، رصد الدرجات، النتائج، والتظلمات — مربوطة بالمواد والصفوف والطلاب.">
        <span class="term-chip"><span class="dot"></span>الدورة الحالية: <strong>{{ activeSessionName() }}</strong></span>
      </nb-page-header>

      @if (loading()) {
        <nb-loading message="جارٍ تحميل مؤشرات مركز الامتحانات…"></nb-loading>
      } @else {

      <!-- العنصر المميّز: منحنى توزيع الدرجات -->
      <section class="curve-card">
        <div class="curve-head">
          <div>
            <h2 class="curve-title">منحنى توزيع درجات الطلاب</h2>
            <p class="curve-sub">تركّز الأداء حول المتوسط عبر جميع النتائج المرصودة — مع موقع خط النجاح.</p>
          </div>
          <div class="curve-badges">
            <span class="cb"><em>المتوسط</em><b>{{ mean() | number:'1.0-1' }}%</b></span>
            <span class="cb pass"><em>نسبة النجاح</em><b>{{ passRate() | number:'1.0-0' }}%</b></span>
            <span class="cb total"><em>نتائج مرصودة</em><b>{{ results().length }}</b></span>
          </div>
        </div>

        <div class="chart">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" class="hist">
            <!-- منطقة الرسوب -->
            <rect x="0" y="0" [attr.width]="passX()" height="40" class="fail-zone"></rect>
            <!-- المدرّج التكراري -->
            @for (b of bars(); track $index) {
              <rect [attr.x]="b.x" [attr.y]="40 - b.h" [attr.width]="b.w" [attr.height]="b.h"
                    [class]="b.pass ? 'bar pass' : 'bar fail'"></rect>
            }
            <!-- خط النجاح -->
            <line [attr.x1]="passX()" y1="0" [attr.x2]="passX()" y2="40" class="pass-line"></line>
          </svg>
          <div class="axis"><span>0%</span><span>خط النجاح {{ passThreshold() }}%</span><span>100%</span></div>
        </div>

        <div class="curve-legend">
          <span><i class="sw pass"></i> ناجحون: <b>{{ passedCount() }}</b></span>
          <span><i class="sw fail"></i> راسبون: <b>{{ failedCount() }}</b></span>
          <span><i class="sw line"></i> أعلى درجة: <b>{{ maxScore() | number:'1.0-1' }}%</b></span>
          <span><i class="sw line"></i> أدنى درجة: <b>{{ minScore() | number:'1.0-1' }}%</b></span>
        </div>
      </section>

      <!-- صف المؤشرات -->
      <div class="kpis">
        <div class="kpi"><span class="kl">الامتحانات</span><span class="kv">{{ data().exams.length }}</span><span class="kf">مسجّلة في النظام</span></div>
        <div class="kpi"><span class="kl">المنشورة</span><span class="kv info">{{ publishedCount() }}</span><span class="kf">متاحة للطلاب</span></div>
        <div class="kpi"><span class="kl">قاعات اللجان</span><span class="kv">{{ data().rooms.length }}</span><span class="kf">بسعة {{ totalCapacity() }} مقعد</span></div>
        <div class="kpi"><span class="kl">تظلمات معلّقة</span><span class="kv" [class.warning]="pendingAppeals()">{{ pendingAppeals() }}</span><span class="kf">بانتظار البتّ</span></div>
        <div class="kpi"><span class="kl">محاضر مخالفات</span><span class="kv" [class.danger]="data().incidents.length">{{ data().incidents.length }}</span><span class="kf">غش وإخلال</span></div>
      </div>

      <!-- تنبيهات + أقرب الامتحانات -->
      <div class="insight-row">
        <nb-panel title="أقرب الامتحانات المنشورة" subtitle="الامتحانات المعتمدة والمتاحة للطلاب." [flush]="true" class="span2">
          <div class="table-wrap">
            <table class="nb-table">
              <thead><tr><th>الرمز</th><th>الامتحان</th><th>العام / الفصل</th><th>الكبرى / النجاح</th><th>الحالة</th></tr></thead>
              <tbody>
                @for (e of upcomingExams(); track e.id) {
                  <tr (click)="go('/examinations/exams')">
                    <td class="mono">{{ e.code }}</td>
                    <td><strong>{{ e.name }}</strong></td>
                    <td>{{ e.academic_year }} — {{ e.term }}</td>
                    <td class="mono">{{ e.max_marks }} / {{ e.pass_marks }}</td>
                    <td><span class="badge" [class]="e.status">{{ statusLabel(e.status) }}</span></td>
                  </tr>
                }
                @if (!upcomingExams().length) { <tr><td colspan="5" class="empty">لا توجد امتحانات — ابدأ بإنشاء امتحان جديد.</td></tr> }
              </tbody>
            </table>
          </div>
        </nb-panel>

        <nb-panel title="لوحة المتابعة" subtitle="إجراءات تحتاج انتباهك.">
          <div class="alerts">
            @if (pendingAppeals()) { <button type="button" class="alert warn" (click)="go('/examinations/appeals')"><span class="dot"></span>{{ pendingAppeals() }} تظلم بانتظار البتّ</button> }
            @if (data().incidents.length) { <button type="button" class="alert danger" (click)="go('/examinations/appeals')"><span class="dot"></span>{{ data().incidents.length }} محضر مخالفة مسجّل</button> }
            @if (draftCount()) { <button type="button" class="alert info" (click)="go('/examinations/exams')"><span class="dot"></span>{{ draftCount() }} امتحان في وضع المسودة</button> }
            @if (!pendingAppeals() && !data().incidents.length && !draftCount()) { <div class="alert ok"><span class="dot"></span>لا توجد إجراءات معلّقة — كل شيء منضبط.</div> }
          </div>
        </nb-panel>
      </div>

      <!-- بطاقات التنقل -->
      <h3 class="section-title">دورة حياة الامتحان</h3>
      <div class="tiles">
        @for (m of lifecycle; track m.key) {
          <button class="tile" (click)="go(m.route)">
            <span class="tile-icon">{{ m.icon }}</span>
            <span class="tile-body"><span class="tile-title">{{ m.title }}</span><span class="tile-desc">{{ m.desc }}</span></span>
            <span class="tile-arrow">←</span>
          </button>
        }
      </div>

      <h3 class="section-title">الإعداد والمرجعيات</h3>
      <div class="tiles">
        @for (m of setup; track m.key) {
          <button class="tile" (click)="go(m.route)">
            <span class="tile-icon">{{ m.icon }}</span>
            <span class="tile-body"><span class="tile-title">{{ m.title }}</span><span class="tile-desc">{{ m.desc }}</span></span>
            <span class="tile-arrow">←</span>
          </button>
        }
      </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .term-chip { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: var(--nb-text-secondary);
      background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 7px 12px; }
    .term-chip .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--nb-success); }

    /* ===== العنصر المميّز: منحنى التوزيع ===== */
    .curve-card {
      background:
        radial-gradient(130% 150% at 0% 0%, color-mix(in srgb, var(--nb-primary-600) 8%, transparent), transparent 55%),
        var(--nb-surface);
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      padding: 20px 22px; margin-bottom: 14px;
    }
    .curve-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 18px; flex-wrap: wrap; }
    .curve-title { margin: 0; font-size: 16px; font-weight: 800; color: var(--nb-text); letter-spacing: -0.2px; }
    .curve-sub { margin: 3px 0 0; font-size: 12px; color: var(--nb-text-muted); }
    .curve-badges { display: flex; gap: 8px; }
    .cb { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 14px;
      background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius); }
    .cb em { font-size: 10.5px; font-style: normal; color: var(--nb-text-muted); }
    .cb b { font-size: 17px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .cb.pass b { color: var(--nb-success); }
    .cb.total b { color: var(--nb-info); }

    .chart { margin-top: 4px; }
    .hist { width: 100%; height: 150px; display: block; overflow: visible; }
    .fail-zone { fill: color-mix(in srgb, var(--nb-danger) 6%, transparent); }
    .bar { transition: height .5s ease; }
    .bar.pass { fill: color-mix(in srgb, var(--nb-success) 78%, white); }
    .bar.fail { fill: color-mix(in srgb, var(--nb-danger) 62%, white); }
    .pass-line { stroke: var(--nb-warning); stroke-width: 0.5; stroke-dasharray: 1.5 1; }
    .axis { display: flex; justify-content: space-between; font-size: 11px; color: var(--nb-text-muted); margin-top: 6px; }
    .axis span:nth-child(2) { color: var(--nb-warning); font-weight: 700; }

    .curve-legend { display: flex; gap: 18px; flex-wrap: wrap; margin-top: 14px; padding-top: 12px;
      border-top: 1px solid var(--nb-border-soft); font-size: 12px; color: var(--nb-text-muted); }
    .curve-legend b { color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .sw { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-inline-end: 4px; vertical-align: middle; }
    .sw.pass { background: color-mix(in srgb, var(--nb-success) 78%, white); }
    .sw.fail { background: color-mix(in srgb, var(--nb-danger) 62%, white); }
    .sw.line { background: var(--nb-warning); border-radius: 2px; width: 10px; height: 3px; }

    /* ===== المؤشرات ===== */
    .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 14px; }
    @media (max-width: 1000px) { .kpis { grid-template-columns: repeat(2, 1fr); } }
    .kpi { display: flex; flex-direction: column; gap: 2px; padding: 12px 16px;
      background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); }
    .kl { font-size: 12px; color: var(--nb-text-muted); }
    .kv { font-size: 22px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .kv.info { color: var(--nb-info); } .kv.warning { color: var(--nb-warning); } .kv.danger { color: var(--nb-danger); }
    .kf { font-size: 11px; color: var(--nb-text-faint); }

    /* ===== الرؤى ===== */
    .insight-row { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-bottom: 14px; }
    @media (max-width: 1000px) { .insight-row { grid-template-columns: 1fr; } }
    .span2 { min-width: 0; }
    .table-wrap { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .nb-table th { text-align: start; font-weight: 700; font-size: 11px; color: var(--nb-text-muted);
      background: var(--nb-surface-raised); padding: 9px 14px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table td { padding: 9px 14px; border-bottom: 1px solid var(--nb-border-row); color: var(--nb-text); }
    .nb-table tbody tr { cursor: pointer; }
    .nb-table tbody tr:hover td { background: var(--nb-surface-raised); }
    .nb-table tr:last-child td { border-bottom: none; }
    .mono { font-variant-numeric: tabular-nums; }
    .empty { text-align: center; padding: 22px; color: var(--nb-text-muted); }
    .badge { display: inline-flex; padding: 2px 8px; font-size: 11px; font-weight: 700; border-radius: var(--nb-radius-sm); background: var(--nb-border-soft); color: var(--nb-text-secondary); }
    .badge.published { background: var(--nb-success-bg); color: var(--nb-success); }
    .badge.approved { background: var(--nb-info-bg); color: var(--nb-info); }
    .badge.locked { background: var(--nb-warning-bg); color: var(--nb-warning); }
    .alerts { display: flex; flex-direction: column; gap: 8px; }
    .alert { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--nb-text-secondary);
      padding: 9px 12px; border-radius: var(--nb-radius); cursor: pointer; border: 1px solid var(--nb-border-soft);
      width: 100%; text-align: start; font-family: inherit; background: var(--nb-surface); }
    .alert .dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
    .alert.warn .dot { background: var(--nb-warning); } .alert.warn { background: var(--nb-warning-bg); }
    .alert.danger .dot { background: var(--nb-danger); } .alert.danger { background: var(--nb-danger-bg); }
    .alert.info .dot { background: var(--nb-info); }
    .alert.ok { cursor: default; } .alert.ok .dot { background: var(--nb-success); }

    /* ===== بطاقات التنقل ===== */
    .section-title { font-size: 14px; font-weight: 700; color: var(--nb-text); margin: 4px 0 12px; }
    .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    @media (max-width: 720px) { .tiles { grid-template-columns: 1fr; } }
    .tile { display: flex; align-items: center; gap: 14px; text-align: start; cursor: pointer;
      background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      padding: 16px; transition: all 0.15s ease; font-family: inherit; }
    .tile:hover { border-color: var(--nb-primary-400); background: var(--nb-surface-raised); transform: translateY(-1px); }
    .tile:hover .tile-arrow { opacity: 1; transform: translateX(-3px); }
    .tile-icon { font-size: 22px; width: 44px; height: 44px; display: grid; place-items: center; flex: none;
      background: var(--nb-primary-50); border-radius: var(--nb-radius); }
    .tile-body { display: flex; flex-direction: column; gap: 3px; flex: 1; }
    .tile-title { font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .tile-desc { font-size: 12px; color: var(--nb-text-muted); }
    .tile-arrow { color: var(--nb-primary-600); font-size: 18px; opacity: 0; transition: all 0.15s ease; }
  `],
})
export class ExamDashboardComponent implements OnInit {
  private service = inject(ExaminationsService);
  private router = inject(Router);

  loading = signal(true);
  data = signal<ExamDashboardData>({ exams: [], sessions: [], rooms: [], appeals: [], results: [], incidents: [] });

  results = computed<ExamResult[]>(() => this.data().results);
  scores = computed<number[]>(() =>
    this.results().map((r) => Number(r.total_marks) || 0).filter((n) => n > 0),
  );

  passThreshold = signal(50);
  passRate = computed(() => {
    const rs = this.results();
    if (!rs.length) return 0;
    return (rs.filter((r) => r.is_passed).length / rs.length) * 100;
  });
  passedCount = computed(() => this.results().filter((r) => r.is_passed).length);
  failedCount = computed(() => this.results().filter((r) => !r.is_passed).length);
  mean = computed(() => {
    const s = this.scores();
    return s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0;
  });
  maxScore = computed(() => (this.scores().length ? Math.max(...this.scores()) : 0));
  minScore = computed(() => (this.scores().length ? Math.min(...this.scores()) : 0));

  passX = computed(() => this.passThreshold());
  bars = computed(() => {
    // مدرّج تكراري من 10 فئات (0-100%). عند غياب البيانات، منحنى جرسي توضيحي.
    const buckets = new Array(10).fill(0);
    const s = this.scores();
    if (s.length) {
      s.forEach((v) => {
        const idx = Math.min(9, Math.max(0, Math.floor(v / 10)));
        buckets[idx]++;
      });
    } else {
      // شكل جرسي توضيحي عند عدم وجود نتائج بعد
      [1, 2, 4, 7, 11, 13, 10, 6, 3, 1].forEach((v, i) => (buckets[i] = v));
    }
    const maxB = Math.max(...buckets, 1);
    const w = 9.6;
    return buckets.map((c, i) => ({
      x: i * 10 + 0.2,
      w,
      h: (c / maxB) * 38,
      pass: i * 10 + 5 >= this.passThreshold(),
    }));
  });

  publishedCount = computed(() => this.data().exams.filter((e) => e.status === 'published').length);
  draftCount = computed(() => this.data().exams.filter((e) => e.status === 'draft').length);
  pendingAppeals = computed(() => this.data().appeals.filter((a) => a.status === 'submitted' || a.status === 'under_review').length);
  totalCapacity = computed(() => this.data().rooms.reduce((s, r) => s + (Number(r.capacity) || 0), 0));
  upcomingExams = computed<Exam[]>(() => this.data().exams.filter((e) => e.status === 'published' || e.status === 'approved').slice(0, 6));
  activeSessionName = computed(() => this.data().sessions.find((s) => s.is_active)?.name || 'لا توجد دورة نشطة');

  readonly lifecycle: ExamTile[] = [
    { key: 'exams', title: 'الامتحانات', desc: 'إنشاء واعتماد ونشر الامتحانات المرتبطة بالمواد.', icon: '📝', route: '/examinations/exams' },
    { key: 'schedule', title: 'الجدول واللجان', desc: 'الدورات، جداول المواعيد، القاعات، والمراقبون.', icon: '🗓️', route: '/examinations/schedule' },
    { key: 'question-bank', title: 'بنك الأسئلة', desc: 'بنوك أسئلة المواد والأسئلة وتحليل الصعوبة.', icon: '🏦', route: '/examinations/question-bank' },
    { key: 'marks', title: 'رصد الدرجات', desc: 'إدخال درجات الطلاب حسب الشعبة بالمسار الآمن.', icon: '✍️', route: '/examinations/marks' },
    { key: 'results', title: 'النتائج والكشوف', desc: 'النتائج المجمّعة، كشوف الدرجات، والحالة الأكاديمية.', icon: '🎓', route: '/examinations/results' },
    { key: 'appeals', title: 'التظلمات والمخالفات', desc: 'طلبات إعادة التصحيح ومحاضر الغش.', icon: '⚖️', route: '/examinations/appeals' },
  ];
  readonly setup: ExamTile[] = [
    { key: 'assessments', title: 'أعمال السنة', desc: 'التقييم المستمر وبنوده وأوزان الدرجات.', icon: '📚', route: '/examinations/assessments' },
    { key: 'grading', title: 'سلالم التقديرات', desc: 'مخططات التقديرات (A/B/C) وقيم الـ GPA.', icon: '📊', route: '/examinations/grading' },
    { key: 'setup', title: 'الإعداد والمرجعيات', desc: 'فئات وأنواع الامتحانات وقاعات اللجان.', icon: '⚙️', route: '/examinations/setup' },
  ];

  ngOnInit() {
    this.service.getDashboardData().subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  go(route: string) { this.router.navigateByUrl(route); }
  statusLabel(s: string): string {
    const map: Record<string, string> = { draft: 'مسودة', review: 'مراجعة', approved: 'معتمد', published: 'منشور', locked: 'مغلق', archived: 'مؤرشف', closed: 'مغلق نهائياً' };
    return map[s] || s;
  }
}
