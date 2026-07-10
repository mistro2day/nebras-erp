import { ChangeDetectionStrategy, Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { StudentsService } from '../students.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';

interface WorkflowLink { title: string; desc: string; path: string; mark: string; }

/**
 * لوحة تحكم شؤون الطلاب — داشبورد شامل بنمط Nebras OS.
 * مؤشرات دورة حياة الطالب، توزيعات، مسار العمل، وأحدث الطلاب — ببيانات حقيقية.
 */
@Component({
  selector: 'app-students-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, NbPageHeaderComponent, NbPanelComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="لوحة تحكم شؤون الطلاب"
        subtitle="نظرة شاملة على دورة حياة الطلاب — التسجيل، الحالة الأكاديمية، التوزيع والخط الزمني.">
        <button class="nb-btn-secondary" (click)="load()">تحديث</button>
        <a class="nb-btn-primary" routerLink="/students/list">عرض قائمة الطلاب</a>
      </nb-page-header>

      @if (!widgets()) {
        <nb-loading message="جارٍ تحميل بيانات الطلاب…"></nb-loading>
      } @else {
        <!-- Hero: ملخص المجتمع الطلابي -->
        <div class="hero" (click)="go('/students/list')">
          <div class="hero-glow"></div>
          <div class="hero-main">
            <span class="hero-badge">المجتمع الطلابي</span>
            <h2 class="hero-title">{{ total() }} طالب</h2>
            <span class="hero-line">{{ w().activeStudents }} نشط · {{ w().newThisMonth }} انضموا هذا الشهر · {{ enrollActive() }} تسجيل أكاديمي فعّال</span>
          </div>
          <div class="hero-dates">
            <div class="hero-ring" [style.background]="activeRingBg()">
              <div class="hero-ring-in"><span class="hr-pct">{{ activeRate() }}%</span><span class="hr-lbl">نشط</span></div>
            </div>
            <div class="hero-date"><span class="hd-label">متخرجون</span><span class="hd-val">{{ w().graduatedStudents }}</span></div>
            <div class="hero-date"><span class="hd-label">جدد</span><span class="hd-val">{{ w().newStudents }}</span></div>
          </div>
        </div>

        <!-- مؤشرات رئيسية -->
        <div class="stats-grid">
          <div class="metric-card total" (click)="go('/students/list')">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
            <span class="m-body"><span class="label">إجمالي الطلاب</span><span class="value">{{ total() }}</span></span>
          </div>
          <div class="metric-card success" (click)="go('/students/list')">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg></span>
            <span class="m-body"><span class="label">الطلاب النشطون</span><span class="value success">{{ w().activeStudents }}</span></span>
          </div>
          <div class="metric-card warn" (click)="go('/students/list')">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg></span>
            <span class="m-body"><span class="label">الموقوفون</span><span class="value" [class.warn]="w().suspendedStudents">{{ w().suspendedStudents }}</span></span>
          </div>
          <div class="metric-card info" (click)="go('/students/list')">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></span>
            <span class="m-body"><span class="label">الخريجون</span><span class="value info">{{ w().graduatedStudents }}</span></span>
          </div>
          <div class="metric-card purple" (click)="go('/students/list')">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></svg></span>
            <span class="m-body"><span class="label">التسجيلات الأكاديمية</span><span class="value purple">{{ enrollActive() }}<span class="v-sub"> / {{ enrollTotal() }}</span></span></span>
          </div>
          <div class="metric-card neutral" (click)="go('/students/list')">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V10M18 20V4M6 20v-4"/></svg></span>
            <span class="m-body"><span class="label">انضموا هذا الشهر</span><span class="value">{{ w().newThisMonth }}</span></span>
          </div>
        </div>

        <!-- مسار العمل: اختصارات كل ما يتعلق بالطلاب -->
        <div class="wf-strip">
          @for (link of workflow; track link.path) {
            <a class="wf-chip" [routerLink]="link.path" [title]="link.desc">
              <span class="wf-mark">{{ link.mark }}</span>
              <span class="wf-t">{{ link.title }}</span>
            </a>
          }
        </div>

        <!-- مسار دورة حياة الطالب -->
        <nb-panel title="توزيع الطلاب على دورة الحياة" [flush]="true">
          <div class="funnel" role="img" [attr.aria-label]="'دورة حياة الطلاب: ' + total() + ' طالب'">
            @for (st of lifecycle; track st.key) {
              <div class="fseg" [style.--w.%]="segWidth(st.statuses)" [class.empty]="segCount(st.statuses) === 0">
                <span class="fseg-bar" [class]="'fseg-bar ' + st.tone"></span>
                <span class="fseg-count">{{ segCount(st.statuses) }}</span>
                <span class="fseg-label">{{ st.label }}</span>
              </div>
            }
          </div>
        </nb-panel>

        <!-- صف بينتو: النوع + الجنسيات + أحدث الطلاب -->
        <div class="bento">
          <!-- التوزيع بحسب النوع -->
          <nb-panel title="التوزيع بحسب النوع">
            <div class="gender-bar">
              <span class="gb male" [style.flex]="w().genderDistribution.male || 0.001" [title]="'ذكور: ' + w().genderDistribution.male"></span>
              <span class="gb female" [style.flex]="w().genderDistribution.female || 0.001" [title]="'إناث: ' + w().genderDistribution.female"></span>
            </div>
            <div class="gender-rows">
              <div class="gender-row">
                <span class="gr-label"><i class="lg male"></i> ذكور</span>
                <span class="gr-val mono">{{ w().genderDistribution.male }} · {{ genderPct('male') }}%</span>
              </div>
              <div class="gender-row">
                <span class="gr-label"><i class="lg female"></i> إناث</span>
                <span class="gr-val mono">{{ w().genderDistribution.female }} · {{ genderPct('female') }}%</span>
              </div>
            </div>
          </nb-panel>

          <!-- أعلى الجنسيات -->
          <nb-panel title="أعلى الجنسيات">
            @if (!nationalities().length) {
              <p class="hint">لا توجد بيانات جنسيات بعد.</p>
            } @else {
              <div class="hbars">
                @for (n of nationalities(); track n.name) {
                  <div class="hbar-row">
                    <span class="hbar-name" [title]="n.name">{{ n.name }}</span>
                    <span class="hbar-track"><span class="hbar-fill" [style.width.%]="(n.count / maxNat()) * 100"></span></span>
                    <span class="hbar-val mono">{{ n.count }}</span>
                  </div>
                }
              </div>
            }
          </nb-panel>

          <!-- أحدث الطلاب -->
          <nb-panel title="أحدث الطلاب المسجّلين" [flush]="true">
            <div class="list">
              @for (s of recentStudents(); track s.id) {
                <a class="list-item" [routerLink]="['/students/details', s.id]">
                  <span class="avatar" [class.female]="s.gender === 'female'">{{ initial(s.name) }}</span>
                  <span class="li-body">
                    <span class="li-name">{{ s.name }}</span>
                    <span class="li-sub mono">{{ s.student_number }}</span>
                  </span>
                  <span [class]="statusBadge(s.status)">{{ statusText(s.status) }}</span>
                </a>
              }
              @if (!recentStudents().length) { <div class="empty-list">لا يوجد طلاب مسجّلون بعد.</div> }
            </div>
          </nb-panel>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .hint { font-size: 13px; color: var(--nb-text-muted); margin: 0; }
    .mono { font-variant-numeric: tabular-nums; }

    /* Hero */
    .hero { position: relative; overflow: hidden; cursor: pointer; background: linear-gradient(135deg, var(--nb-primary-600), var(--nb-primary-500));
      border-radius: var(--nb-radius-card); padding: 20px 22px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between;
      gap: 20px; flex-wrap: wrap; box-shadow: 0 8px 24px rgba(0,0,0,.10); transition: transform .2s, box-shadow .2s; }
    .hero:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,.16); }
    .hero-glow { position: absolute; inset-inline-start: -60px; top: -60px; width: 200px; height: 200px; background: rgba(255,255,255,.14); border-radius: 50%; filter: blur(8px); }
    .hero-main { position: relative; display: flex; flex-direction: column; gap: 4px; color: #fff; }
    .hero-badge { font-size: 11px; font-weight: 700; background: rgba(255,255,255,.22); padding: 3px 10px; border-radius: 999px; width: fit-content; }
    .hero-title { margin: 4px 0 0; font-size: 26px; font-weight: 800; color: #fff; font-variant-numeric: tabular-nums; }
    .hero-line { font-size: 12.5px; color: rgba(255,255,255,.9); font-variant-numeric: tabular-nums; }
    .hero-dates { position: relative; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
    .hero-ring { width: 76px; height: 76px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .hero-ring-in { width: 58px; height: 58px; border-radius: 50%; background: var(--nb-primary-600); display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .hr-pct { font-size: 17px; font-weight: 800; color: #fff; font-variant-numeric: tabular-nums; }
    .hr-lbl { font-size: 10px; color: rgba(255,255,255,.8); }
    .hero-date { display: flex; flex-direction: column; gap: 3px; background: rgba(255,255,255,.14); padding: 8px 14px; border-radius: 10px; }
    .hd-label { font-size: 10.5px; color: rgba(255,255,255,.82); }
    .hd-val { font-size: 15px; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums; }

    /* KPI cards */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 14px; }
    .metric-card { position: relative; overflow: hidden; cursor: pointer; background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 16px 18px; display: flex; align-items: center; gap: 14px; box-shadow: 0 1px 3px rgba(0,0,0,.04);
      transition: transform .2s cubic-bezier(0.4,0,0.2,1), box-shadow .2s, border-color .2s; }
    .metric-card:hover { transform: translateY(-3px); box-shadow: 0 10px 22px rgba(0,0,0,.08); }
    .metric-card::before { content: ''; position: absolute; inset-block-start: 0; inset-inline: 0; height: 3px; background: var(--nb-text-faint); }
    .metric-card.total::before { background: var(--nb-primary-500); }
    .metric-card.info::before { background: var(--nb-info); }
    .metric-card.purple::before { background: #af52de; }
    .metric-card.success::before { background: var(--nb-success); }
    .metric-card.warn::before { background: var(--nb-warning); }
    .metric-card.neutral::before { background: var(--nb-text-muted); }
    .m-icon { flex-shrink: 0; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: var(--nb-surface-raised); color: var(--nb-text-muted); }
    .m-icon svg { width: 22px; height: 22px; }
    .metric-card.total .m-icon { background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .metric-card.info .m-icon { background: rgba(0,122,255,.12); color: var(--nb-info); }
    .metric-card.purple .m-icon { background: rgba(175,82,222,.12); color: #7d26cd; }
    .metric-card.success .m-icon { background: rgba(52,199,89,.12); color: var(--nb-success); }
    .metric-card.warn .m-icon { background: rgba(255,159,10,.14); color: var(--nb-warning); }
    .m-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .metric-card .label { font-size: 12.5px; color: var(--nb-text-muted); font-weight: 700; }
    .metric-card .value { font-size: 28px; font-weight: 800; line-height: 1.1; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .metric-card .value.info { color: var(--nb-info); } .metric-card .value.success { color: var(--nb-success); }
    .metric-card .value.purple { color: #7d26cd; } .metric-card .value.warn { color: var(--nb-warning); }
    .v-sub { font-size: 15px; font-weight: 700; color: var(--nb-text-muted); }

    /* Workflow chips */
    .wf-strip { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
    .wf-chip { display: inline-flex; align-items: center; gap: 8px; background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: 999px; padding: 8px 14px 8px 10px; text-decoration: none; transition: transform .15s, box-shadow .15s, border-color .15s; }
    .wf-chip:hover { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(0,0,0,.07); border-color: var(--nb-primary-400); }
    .wf-mark { width: 26px; height: 26px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800;
      background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .wf-t { font-size: 13px; font-weight: 700; color: var(--nb-text); }

    /* Lifecycle funnel */
    .funnel { display: flex; gap: 6px; padding: 14px 16px; align-items: flex-end; }
    .fseg { flex: var(--w, 1) 1 0; min-width: 60px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .fseg.empty { flex: 0.4 1 0; opacity: .55; }
    .fseg-bar { width: 100%; height: 42px; border-radius: 8px; }
    .fseg-bar.total { background: linear-gradient(180deg, var(--nb-primary-500), var(--nb-primary-400)); }
    .fseg-bar.success { background: linear-gradient(180deg, var(--nb-success), #5cd679); }
    .fseg-bar.warn { background: linear-gradient(180deg, var(--nb-warning), #ffb340); }
    .fseg-bar.info { background: linear-gradient(180deg, var(--nb-info), #4da3ff); }
    .fseg-bar.neutral { background: linear-gradient(180deg, var(--nb-text-muted), var(--nb-text-faint)); }
    .fseg-count { font-size: 17px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .fseg-label { font-size: 11.5px; color: var(--nb-text-muted); text-align: center; }

    /* Bento */
    .bento { display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 16px; margin-top: 16px; align-items: start; }
    @media (max-width: 960px) { .bento { grid-template-columns: 1fr; } }

    .gender-bar { display: flex; height: 12px; border-radius: 6px; overflow: hidden; gap: 2px; margin-bottom: 14px; }
    .gb { display: block; } .gb.male { background: var(--nb-primary-600); } .gb.female { background: var(--nb-info); }
    .gender-rows { display: flex; flex-direction: column; gap: 10px; }
    .gender-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--nb-text-secondary); }
    .gr-label { display: inline-flex; align-items: center; gap: 8px; }
    .gr-val { font-size: 12.5px; color: var(--nb-text); font-weight: 700; }
    .lg { display: inline-block; width: 10px; height: 10px; border-radius: 3px; }
    .lg.male { background: var(--nb-primary-600); } .lg.female { background: var(--nb-info); }

    .hbars { display: flex; flex-direction: column; gap: 10px; }
    .hbar-row { display: grid; grid-template-columns: 80px 1fr 34px; align-items: center; gap: 8px; }
    .hbar-name { font-size: 12px; color: var(--nb-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .hbar-track { height: 10px; background: var(--nb-surface-raised); border-radius: 5px; overflow: hidden; }
    .hbar-fill { display: block; height: 100%; background: linear-gradient(90deg, var(--nb-primary-600), var(--nb-primary-400)); border-radius: 5px; transition: width .6s cubic-bezier(0.4,0,0.2,1); }
    .hbar-val { font-size: 12px; font-weight: 700; color: var(--nb-text); text-align: end; }

    .list { display: flex; flex-direction: column; }
    .list-item { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-top: 1px solid var(--nb-border-soft); text-decoration: none; transition: background .15s; }
    .list-item:first-child { border-top: none; }
    .list-item:hover { background: var(--nb-surface-raised); }
    .avatar { flex-shrink: 0; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 800; background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .avatar.female { background: rgba(0,122,255,.12); color: var(--nb-info); }
    .li-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
    .li-name { font-size: 13px; font-weight: 700; color: var(--nb-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .li-sub { font-size: 11px; color: var(--nb-text-muted); }
    .empty-list { padding: 20px 16px; text-align: center; font-size: 12.5px; color: var(--nb-text-muted); }
  `]
})
export class StudentsDashboardComponent implements OnInit {
  private studentsService = inject(StudentsService);
  private router = inject(Router);

  widgets = this.studentsService.dashboardWidgets;
  readonly w = computed(() => this.widgets() ?? {});

  readonly total = computed(() => this.w().totalStudents ?? 0);
  readonly enrollActive = computed(() => this.w().enrollments?.active ?? 0);
  readonly enrollTotal = computed(() => this.w().enrollments?.total ?? 0);
  readonly nationalities = computed<{ name: string; count: number }[]>(() => this.w().nationalities ?? []);
  readonly recentStudents = computed<any[]>(() => this.w().recentStudents ?? []);
  readonly maxNat = computed(() => Math.max(1, ...this.nationalities().map((n) => n.count)));
  readonly activeRate = computed(() => {
    const t = this.total();
    return t ? Math.round(((this.w().activeStudents ?? 0) / t) * 100) : 0;
  });

  readonly workflow: WorkflowLink[] = [
    { title: 'قائمة الطلاب', desc: 'استعراض وبحث وفلترة كل الطلاب', path: '/students/list', mark: 'ط' },
    { title: 'تسجيل طالب', desc: 'إضافة طالب جديد يدوياً', path: '/students/create', mark: '+' },
    { title: 'القبول والتسجيل', desc: 'الطلبات وتحويل المتقدمين إلى طلاب', path: '/admissions/dashboard', mark: 'ق' },
    { title: 'توزيع الطلاب', desc: 'توزيع الطلاب على الشعب والمقاعد', path: '/academics/distribution', mark: 'ت' },
    { title: 'الشؤون الأكاديمية', desc: 'المراحل والصفوف والشعب', path: '/academics/dashboard', mark: 'أ' },
  ];

  readonly lifecycle = [
    { key: 'new', label: 'جدد', tone: 'info', statuses: ['applicant', 'accepted', 'registered', 'enrolled'] },
    { key: 'active', label: 'نشطون', tone: 'success', statuses: ['active'] },
    { key: 'suspended', label: 'موقوفون', tone: 'warn', statuses: ['suspended'] },
    { key: 'transferred', label: 'منقولون', tone: 'total', statuses: ['transferred'] },
    { key: 'graduated', label: 'متخرجون', tone: 'total', statuses: ['graduated', 'alumni'] },
    { key: 'left', label: 'منسحبون', tone: 'neutral', statuses: ['withdrawn', 'dismissed'] },
    { key: 'archived', label: 'مؤرشفون', tone: 'neutral', statuses: ['archived'] },
  ];

  ngOnInit() {
    this.load();
  }

  load(): void {
    this.studentsService.getDashboardWidgets().subscribe();
  }

  go(path: string): void { this.router.navigateByUrl(path); }

  genderPct(gender: 'male' | 'female'): number {
    const t = this.total();
    if (!t) return 0;
    return Math.round(((this.w().genderDistribution?.[gender] ?? 0) / t) * 100);
  }

  segCount(statuses: string[]): number {
    const b = this.w().statusBreakdown ?? {};
    return statuses.reduce((n, s) => n + (b[s] ?? 0), 0);
  }
  segWidth(statuses: string[]): number {
    const max = Math.max(1, ...this.lifecycle.map((l) => this.segCount(l.statuses)));
    return Math.max(8, Math.round((this.segCount(statuses) / max) * 100));
  }

  activeRingBg(): string {
    const pct = Math.min(100, this.activeRate());
    return `conic-gradient(#fff ${pct * 3.6}deg, rgba(255,255,255,.25) ${pct * 3.6}deg)`;
  }

  initial(name: string): string { return (name || '؟').trim().charAt(0); }

  statusBadge(status: string): string {
    const map: Record<string, string> = {
      active: 'nb-badge-success', registered: 'nb-badge-info', enrolled: 'nb-badge-info',
      suspended: 'nb-badge-danger', graduated: 'nb-badge-ai', alumni: 'nb-badge-ai',
      withdrawn: 'nb-badge-neutral', dismissed: 'nb-badge-neutral', archived: 'nb-badge-neutral',
      transferred: 'nb-badge-info',
    };
    return map[status] || 'nb-badge-neutral';
  }
  statusText(status: string): string {
    const map: Record<string, string> = {
      applicant: 'متقدم', accepted: 'مقبول', registered: 'مسجل', enrolled: 'ملتحق',
      active: 'نشط', suspended: 'موقوف', transferred: 'منقول', graduated: 'متخرج',
      alumni: 'خريج', withdrawn: 'منسحب', dismissed: 'مفصول', archived: 'مؤرشف',
    };
    return map[status] || status;
  }
}
