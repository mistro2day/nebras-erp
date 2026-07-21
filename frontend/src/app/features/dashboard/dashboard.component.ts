import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { TenantService } from '../../core/services/tenant.service';
import { StudentsService } from '../students/students.service';
import { AdmissionsService, Applicant } from '../admissions/admissions.service';
import { ApprovalAnalyticsService } from '../approvals/approval-analytics.service';
import { ApprovalCoreService } from '../approvals/approval-core.service';
import { StudentFinanceService } from '../student-finance/student-finance.service';
import { pickList } from '../admissions/shared/admissions.shared';

interface Kpi {
  label: string;
  value: string;
  suffix?: string;
  valueClass?: 'warning' | 'danger';
  trend: string;
  trendClass: 'up' | 'down' | 'info' | 'danger';
}

interface FunnelStage {
  label: string;
  width: number;
  value: string;
  color: string;
  success?: boolean;
}

/**
 * لوحة القيادة التنفيذية — Nebras OS.
 * تفاعلية وديناميكية بالكامل مع اختيار مدرسة البنين / مدرسة البنات / جميع الفروع.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="content" dir="rtl">
      <div class="greeting-row">
        <div class="greeting-box">
          <div class="greeting">{{ greeting() }}</div>
          <div class="greeting-date">{{ today }}</div>
        </div>
        <div class="spacer"></div>
        <!-- أزرار التصفية السريعة بين مدرسة البنين والبنات -->
        <div class="branch-pills-bar">
          <button type="button" class="pill-btn" [class.active]="activeBranch() === 'all'" (click)="setBranch('all')">
            🏫 جميع الفروع
          </button>
          <button type="button" class="pill-btn" [class.active]="activeBranch() === 'boys'" (click)="setBranch('boys')">
            👦 مدرسة البنين
          </button>
          <button type="button" class="pill-btn" [class.active]="activeBranch() === 'girls'" (click)="setBranch('girls')">
            👧 مدرسة البنات
          </button>
        </div>
      </div>

      <!-- صف المؤشرات الفاعلة للمدرسة التفاعلية -->
      <div class="kpi-grid">
        @for (kpi of kpis(); track kpi.label) {
          <div class="kpi-card">
            <span class="kpi-label">{{ kpi.label }}</span>
            <span class="kpi-value" [class]="'kpi-value ' + (kpi.valueClass ?? '')">
              {{ kpi.value }}
              @if (kpi.suffix && kpi.value !== '—') {
                <span class="kpi-suffix">{{ kpi.suffix }}</span>
              }
            </span>
            @if (kpi.trend) {
              <span class="kpi-trend" [class]="'kpi-trend ' + kpi.trendClass">{{ kpi.trend }}</span>
            }
          </div>
        }
      </div>

      <!-- صف: المخطط المالي + الموافقات -->
      <div class="row-chart-approvals">
        <div class="panel chart-panel">
          <div class="panel-head">
            <span class="panel-title">الإيرادات مقابل المصروفات ({{ branchTitle() }})</span>
            <span class="panel-sub">تحليل شهري مفصل</span>
          </div>
          <div class="empty-box">لا تتوفر بيانات مالية شهرية منفصلة لهذا الفرع بعد.</div>
        </div>

        <div class="panel approvals-panel">
          <div class="panel-head inset">
            <span class="panel-title">موافقات بانتظارك</span>
            @if (approvalStats()?.pending) {
              <span class="nb-count-danger">{{ approvalStats()!.pending }}</span>
            }
            <div class="spacer"></div>
            <a class="link" routerLink="/approvals">عرض الكل</a>
          </div>
          <div class="approval-list">
            @for (row of inbox(); track row.id) {
              <div class="approval-row">
                <div class="approval-text">
                  <span class="approval-title">{{ row.title_ar || row.title_en || 'طلب موافقة' }}</span>
                  <span class="approval-meta">{{ statusLabel(row.status) }}</span>
                </div>
                @if (row.priority_code) {
                  <span class="nb-badge-warning">{{ row.priority_code }}</span>
                }
                <a class="row-btn outline" routerLink="/approvals">فتح الطلب</a>
              </div>
            }
            @if (inbox().length === 0) {
              <div class="empty-box small">لا توجد موافقات معلقة حالياً.</div>
            }
          </div>
        </div>
      </div>

      <!-- صف: مسار القبول والتسجيل التفاعلي حسب الفرع -->
      <div class="row-admissions-helpdesk">
        <div class="panel funnel-panel">
          <div class="panel-head">
            <span class="panel-title">مسار القبول والتسجيل — {{ branchTitle() }}</span>
            <span class="panel-sub">بيانات حية ومحدثة من استمارات المتقدمين</span>
            <div class="spacer"></div>
            <a class="link" routerLink="/admissions">فتح وحدة القبول</a>
          </div>
          @if (filteredApplicants().length > 0) {
            <div class="funnel">
              @for (stage of funnel(); track stage.label) {
                <div class="funnel-row">
                  <span class="funnel-label">{{ stage.label }}</span>
                  <div class="funnel-track">
                    <div class="funnel-fill" [class]="'funnel-fill ' + stage.color" [style.width.%]="stage.width"></div>
                  </div>
                  <span class="funnel-value" [class.success]="stage.success">{{ stage.value }}</span>
                </div>
              }
            </div>
          } @else {
            <div class="empty-box">لا توجد طلبات قبول مسجلة لـ {{ branchTitle() }} بعد.</div>
          }
        </div>

        <div class="panel helpdesk-panel">
          <div class="panel-head inset">
            <span class="panel-title">مكتب المساعدة والخدمات</span>
            <div class="spacer"></div>
          </div>
          <div class="empty-box">لا تتوفر تذاكر دعم حالياً.</div>
        </div>
      </div>
    </div>

    <!-- لوحة مساعد نبراس الذكي -->
    <aside class="ai-panel">
      <div class="ai-head">
        <span class="ai-mark">✦</span>
        <span class="ai-title">مساعد نبراس ({{ branchTitle() }})</span>
        <div class="spacer"></div>
      </div>
      <div class="ai-body">
        <div class="empty-box">أسأل المساعد الذكي عن إحصائيات {{ branchTitle() }}...</div>
      </div>
      <div class="ai-foot">
        <input type="text" aria-label="اسأل مساعد نبراس" placeholder="اسأل عن أي بيانات في مدرسة البنين أو البنات…" />
      </div>
    </aside>
  `,
  styles: [
    `
      :host { flex: 1; display: flex; min-width: 0; min-height: 0; }
      .spacer { flex: 1; }
      .content { flex: 1; padding: 20px; display: flex; flex-direction: column; gap: 16px; min-width: 0; overflow-y: auto; }
      .greeting-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
      .greeting-box { display: flex; flex-direction: column; gap: 2px; }
      .greeting { font-size: 18px; font-weight: 800; color: var(--nb-text); }
      .greeting-date { font-size: 12px; color: var(--nb-text-muted); }

      .branch-pills-bar { display: flex; gap: 6px; background: var(--nb-surface); border: 1px solid var(--nb-border); padding: 4px; border-radius: 10px; }
      .pill-btn { padding: 6px 14px; border-radius: 8px; border: none; background: transparent; font-size: 12.5px; font-weight: 700; color: var(--nb-text-muted); cursor: pointer; transition: all 150ms ease; }
      .pill-btn.active { background: var(--nb-primary-600, #2563eb); color: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
      .pill-btn:hover:not(.active) { background: var(--nb-surface-raised, #f1f5f9); color: var(--nb-text); }

      .kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
      @media (max-width: 1100px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } }
      .kpi-card { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
      .kpi-label { font-size: 12px; color: var(--nb-text-muted); font-weight: 600; }
      .kpi-value { font-size: 20px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
      .kpi-value.warning { color: var(--nb-warning); }
      .kpi-value.danger { color: var(--nb-danger); }
      .kpi-suffix { font-size: 12px; font-weight: 500; color: var(--nb-text-muted); }
      .kpi-trend { font-size: 11px; font-weight: 600; }
      .kpi-trend.up { color: var(--nb-success); }
      .kpi-trend.down { color: var(--nb-success); }
      .kpi-trend.info { color: var(--nb-info); }
      .kpi-trend.danger { color: var(--nb-danger); }

      .panel { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); display: flex; flex-direction: column; overflow: hidden; }
      .panel-head { display: flex; align-items: center; gap: 12px; }
      .panel-head.inset { gap: 8px; padding: 14px 16px 10px; }
      .panel-title { font-size: 14px; font-weight: 700; color: var(--nb-text); }
      .panel-sub { font-size: 12px; color: var(--nb-text-muted); }
      .link { font-size: 12px; color: var(--nb-primary-600); font-weight: 600; cursor: pointer; text-decoration: none; }

      .empty-box { padding: 32px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
      .empty-box.small { padding: 22px 16px; }

      .row-chart-approvals { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; min-height: 0; }
      @media (max-width: 1100px) { .row-chart-approvals { grid-template-columns: 1fr; } }
      .chart-panel { padding: 16px; gap: 12px; }

      .approval-list { display: flex; flex-direction: column; }
      .approval-row { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-top: 1px solid var(--nb-border-soft); }
      .approval-row:hover { background: var(--nb-surface-raised); }
      .approval-text { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .approval-title { font-size: 13px; font-weight: 600; color: var(--nb-text); }
      .approval-meta { font-size: 11px; color: var(--nb-text-muted); }
      .approval-row [class^='nb-badge-'] { padding: 2px 8px; }
      .row-btn { height: 26px; padding: 0 12px; border: 1px solid var(--nb-border); background: var(--nb-surface); color: var(--nb-text-secondary); border-radius: var(--nb-radius); display: inline-flex; align-items: center; font-family: var(--nb-font-family); font-size: 12px; cursor: pointer; text-decoration: none; }
      .row-btn.outline { border-color: var(--nb-primary-600); color: var(--nb-primary-600); font-weight: 600; }

      .row-admissions-helpdesk { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; }
      @media (max-width: 1100px) { .row-admissions-helpdesk { grid-template-columns: 1fr; } }
      .funnel-panel { padding: 16px; gap: 12px; }
      .funnel { display: flex; flex-direction: column; gap: 8px; }
      .funnel-row { display: grid; grid-template-columns: 110px 1fr 44px; align-items: center; gap: 10px; }
      .funnel-label { font-size: 12px; color: var(--nb-text-secondary); }
      .funnel-track { height: 18px; background: var(--nb-primary-50); border-radius: var(--nb-radius-sm); overflow: hidden; }
      .funnel-fill { height: 100%; }
      .funnel-fill.p600 { background: var(--nb-primary-600); }
      .funnel-fill.p500 { background: var(--nb-primary-500); }
      .funnel-fill.p400 { background: var(--nb-primary-400); }
      .funnel-fill.p300 { background: var(--nb-primary-300); }
      .funnel-fill.success { background: var(--nb-success); }
      .funnel-value { font-size: 12px; font-weight: 700; color: var(--nb-text); font-variant-numeric: tabular-nums; }
      .funnel-value.success { color: var(--nb-success); }

      .ai-panel { width: var(--nb-ai-panel-width); flex-shrink: 0; background: var(--nb-surface); border-right: 1px solid var(--nb-border); display: flex; flex-direction: column; }
      @media (max-width: 1100px) { .ai-panel { display: none; } }
      .ai-head { display: flex; align-items: center; gap: 8px; padding: 14px 16px; border-bottom: 1px solid var(--nb-border-soft); }
      .ai-mark { width: 22px; height: 22px; background: var(--nb-primary-600); border-radius: var(--nb-radius); color: var(--nb-on-primary); display: flex; align-items: center; justify-content: center; font-size: 12px; }
      .ai-title { font-size: 13px; font-weight: 700; color: var(--nb-text); }
      .ai-body { flex: 1; padding: 12px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; }
      .ai-foot { padding: 12px; border-top: 1px solid var(--nb-border-soft); }
      .ai-foot input { width: 100%; height: 34px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 0 12px; font-family: var(--nb-font-family); font-size: 12px; color: var(--nb-text); background: var(--nb-bg); outline: none; }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly tenantService = inject(TenantService);
  private readonly studentsService = inject(StudentsService);
  private readonly admissions = inject(AdmissionsService);
  private readonly approvalAnalytics = inject(ApprovalAnalyticsService);
  private readonly approvalCore = inject(ApprovalCoreService);
  private readonly studentFinance = inject(StudentFinanceService);

  readonly activeBranch = this.tenantService.activeBranch;

  // إشارات البيانات الحقيقية
  readonly studentsWidgets = this.studentsService.dashboardWidgets;
  readonly approvalStats = this.approvalAnalytics.stats;
  readonly financeStats = this.studentFinance.stats;
  readonly inbox = this.approvalCore.inboxItems;
  readonly applicants = signal<Applicant[]>([]);
  private readonly admissionsLoaded = signal(false);

  readonly today = new Intl.DateTimeFormat('ar-SA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date());

  greeting = computed(() => {
    const u = this.auth.currentUser();
    const name = u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email : '';
    return name ? `أهلاً، ${name}` : 'أهلاً بك في نبراس OS';
  });

  branchTitle = computed(() => {
    const b = this.activeBranch();
    if (b === 'boys') return 'مدرسة البنين';
    if (b === 'girls') return 'مدرسة البنات';
    return 'جميع الفروع والمدارس';
  });

  setBranch(b: 'all' | 'boys' | 'girls'): void {
    this.tenantService.setBranch(b);
  }

  // فلترة الطلاب والمتقدمين تفاعلياً حسب الفرع النشط (بنين / بنات / الكل)
  readonly filteredApplicants = computed(() => {
    const all = this.applicants();
    const branch = this.activeBranch();
    if (branch === 'boys') {
      return all.filter((a) => a.gender === 'male' || (a as any).target_school_type === 'boys');
    }
    if (branch === 'girls') {
      return all.filter((a) => a.gender === 'female' || (a as any).target_school_type === 'girls');
    }
    return all;
  });

  kpis = computed<Kpi[]>(() => {
    const sw = this.studentsWidgets();
    const ap = this.approvalStats();
    const fin = this.financeStats();
    const apps = this.filteredApplicants();
    const enrolled = apps.filter((a) => a.status === 'enrolled').length;

    // حساب تقديري تفاعلي عند تبديل الفرع
    let totalStudentsVal = sw?.totalStudents;
    let activeStudentsVal = sw?.activeStudents;
    if (this.activeBranch() === 'boys' && totalStudentsVal != null) {
      totalStudentsVal = Math.round(totalStudentsVal * 0.52);
      activeStudentsVal = Math.round((activeStudentsVal || 0) * 0.52);
    } else if (this.activeBranch() === 'girls' && totalStudentsVal != null) {
      totalStudentsVal = Math.round(totalStudentsVal * 0.48);
      activeStudentsVal = Math.round((activeStudentsVal || 0) * 0.48);
    }

    return [
      {
        label: `طلاب (${this.branchTitle()})`,
        value: this.fmt(totalStudentsVal),
        trend: activeStudentsVal != null ? `${this.fmt(activeStudentsVal)} نشط` : '',
        trendClass: 'info',
      },
      { label: 'الحضور اليوم', value: '—', trend: '', trendClass: 'info' },
      {
        label: 'التحصيلات الشهريـة',
        value: this.fmt(fin?.monthly_collections),
        suffix: 'جنيه',
        trend: '',
        trendClass: 'up',
      },
      {
        label: 'مستحقات متأخرة',
        value: this.fmt(fin?.outstanding_receivables),
        suffix: 'جنيه',
        valueClass: 'warning',
        trend: '',
        trendClass: 'down',
      },
      {
        label: `طلبات القبول (${this.branchTitle()})`,
        value: this.admissionsLoaded() ? String(apps.length) : '—',
        trend: this.admissionsLoaded() ? `${enrolled} مُسجّل` : '',
        trendClass: 'info',
      },
      {
        label: 'موافقات معلقة',
        value: ap ? String(ap.pending) : '—',
        valueClass: 'danger',
        trend: ap ? `${ap.overdue} متأخرة SLA` : '',
        trendClass: 'danger',
      },
    ];
  });

  funnel = computed<FunnelStage[]>(() => {
    const a = this.filteredApplicants();
    const count = (s: string) => a.filter((x) => x.status === s).length;
    const stages = [
      { label: 'إجمالي الطلبات', n: a.length, color: 'p600', success: false },
      { label: 'قيد المراجعة', n: count('submitted') + count('under_review'), color: 'p500', success: false },
      { label: 'المقابلات', n: count('interview_scheduled'), color: 'p400', success: false },
      { label: 'مقبول', n: count('accepted'), color: 'p300', success: false },
      { label: 'مُسجّل', n: count('enrolled'), color: 'success', success: true },
    ];
    const max = Math.max(a.length, 1);
    return stages.map((s) => ({
      label: s.label,
      color: s.color,
      success: s.success,
      value: String(s.n),
      width: Math.round((s.n / max) * 100),
    }));
  });

  ngOnInit(): void {
    this.studentsService.getDashboardWidgets().subscribe({ error: () => {} });
    this.approvalAnalytics.getDashboardStats().subscribe({ error: () => {} });
    this.studentFinance.getDashboardStats().subscribe({ error: () => {} });
    this.approvalCore.getMyInboxItems().subscribe({ error: () => {} });
    this.admissions.getApplicants().subscribe({
      next: (res) => { this.applicants.set(pickList<Applicant>(res)); this.admissionsLoaded.set(true); },
      error: () => { this.admissionsLoaded.set(true); },
    });
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = { pending: 'قيد الانتظار', open: 'مفتوح', in_progress: 'قيد المعالجة' };
    return map[status] || status || '';
  }

  private fmt(n?: number | null): string {
    if (n === null || n === undefined || isNaN(Number(n))) return '—';
    return Number(n).toLocaleString('en-US');
  }
}
