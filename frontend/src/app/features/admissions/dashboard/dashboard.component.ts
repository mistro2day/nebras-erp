import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdmissionsService, Applicant } from '../admissions.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../../shared/nebras/nb-stat-card.component';
import { applicantStatusKind, applicantStatusText, pickList } from '../shared/admissions.shared';

interface WorkflowLink {
  title: string;
  desc: string;
  path: string;
  mark: string;
}

/**
 * لوحة القبول والتسجيل — لغة تصميم Nebras OS.
 * تعرض المؤشرات، ومسار سير العمل (روابط الشاشات)، وأحدث الطلبات — ببيانات حقيقية.
 */
@Component({
  selector: 'app-admissions-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="لوحة القبول والتسجيل"
        subtitle="إدارة طلبات الالتحاق، المستندات المرفقة، المقابلات الشخصية وتحديد المستوى للمتقدمين الجدد."
      >
        <a class="nb-btn-primary" routerLink="/admissions/applications">عرض كل الطلبات</a>
      </nb-page-header>

      <div class="stats-grid">
        <nb-stat-card label="إجمالي طلبات التقديم" [value]="applicants().length"></nb-stat-card>
        <nb-stat-card label="بانتظار المراجعة" [value]="getCountByStatus('submitted') + getCountByStatus('under_review')" valueKind="warning"></nb-stat-card>
        <nb-stat-card label="المقابلات المجدولة" [value]="getCountByStatus('interview_scheduled')" valueKind="info"></nb-stat-card>
        <nb-stat-card label="المقبولون" [value]="getCountByStatus('accepted') + getCountByStatus('enrolled')" valueKind="success"></nb-stat-card>
      </div>

      <!-- قمع دورة القبول: أعداد حقيقية لكل مرحلة بشرائح متناسبة -->
      <nb-panel title="قمع دورة القبول" subtitle="توزيع الطلبات على مراحل الدورة — من التقديم حتى التسجيل.">
        <div class="funnel" role="img" [attr.aria-label]="'قمع القبول: ' + applicants().length + ' طلب'">
          @for (st of funnelStages; track st.key) {
            <a class="fseg" [routerLink]="st.link"
               [style.--w.%]="segWidth(st.key)"
               [class.empty]="getCountByStatus(st.key) === 0">
              <span class="fseg-bar" [class]="'fseg-bar ' + st.tone"></span>
              <span class="fseg-count">{{ getCountByStatus(st.key) }}</span>
              <span class="fseg-label">{{ st.label }}</span>
            </a>
          }
        </div>
      </nb-panel>

      <nb-panel title="مسار القبول والتسجيل" subtitle="انتقل إلى أي مرحلة من مراحل معالجة الطلبات.">
        <nav class="wf-grid" aria-label="مراحل سير عمل القبول">
          @for (link of workflow; track link.path) {
            <a class="wf-card" [routerLink]="link.path">
              <span class="wf-mark">{{ link.mark }}</span>
              <span class="wf-body">
                <strong>{{ link.title }}</strong>
                <span class="wf-desc">{{ link.desc }}</span>
              </span>
            </a>
          }
        </nav>
      </nb-panel>

      <nb-panel title="أحدث طلبات التقديم" [flush]="true">
        <div class="list">
          @for (applicant of recent(); track applicant.id) {
            <a class="list-item" [routerLink]="['/admissions/applications', applicant.id]">
              <div class="item-header">
                <strong>{{ applicant.arabic_full_name }}</strong>
                <span class="nb-badge-info">{{ applicant.application_number }}</span>
              </div>
              <div class="item-info">
                <span>الجنسية: {{ applicant.nationality }}</span> ·
                <span [class]="'nb-badge-' + statusKind(applicant.status)">{{ statusText(applicant.status) }}</span>
              </div>
            </a>
          }
          @if (applicants().length === 0) {
            <div class="no-data">لا توجد طلبات تقديم حالياً.</div>
          }
        </div>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    nb-panel { margin-bottom: 16px; display: block; }
    .wf-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
      gap: 12px;
    }
    .wf-card {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px;
      border: 1px solid var(--nb-border-soft);
      border-radius: var(--nb-radius);
      background: var(--nb-surface-raised);
      text-decoration: none;
      transition: border-color .15s ease, box-shadow .15s ease;
    }
    .wf-card:hover { border-color: var(--nb-primary-300); box-shadow: var(--nb-shadow-card); }
    .wf-card:focus-visible { outline: none; box-shadow: var(--nb-focus-ring); }
    .wf-mark {
      width: 34px; height: 34px; flex-shrink: 0;
      background: var(--nb-primary-50); color: var(--nb-primary-600);
      border-radius: var(--nb-radius); display: flex; align-items: center; justify-content: center;
      font-size: 15px; font-weight: 700;
    }
    .wf-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .wf-body strong { font-size: 13px; font-weight: 700; color: var(--nb-text); }
    .wf-desc { font-size: 11px; color: var(--nb-text-muted); }
    .list { display: flex; flex-direction: column; }
    .list-item {
      display: block; padding: 10px 16px;
      border-top: 1px solid var(--nb-border-soft);
      text-decoration: none;
    }
    .list-item:first-child { border-top: none; }
    .list-item:hover { background: var(--nb-surface-raised); }
    .list-item:focus-visible { outline: none; box-shadow: var(--nb-focus-ring); }
    .item-header {
      display: flex; justify-content: space-between; align-items: center;
      color: var(--nb-text); font-size: 13px;
    }
    .item-header strong { font-weight: 600; }
    .item-info { font-size: 11px; color: var(--nb-text-muted); margin-top: 4px; display: flex; align-items: center; gap: 8px; }
    .no-data { color: var(--nb-text-muted); text-align: center; padding: 28px; font-size: 13px; }
    /* ---- قمع دورة القبول ---- */
    .funnel { display: flex; gap: 6px; align-items: stretch; }
    .fseg { flex: var(--w, 10) 1 0; min-width: 72px; display: flex; flex-direction: column; gap: 6px; text-decoration: none; padding: 4px 2px; border-radius: var(--nb-radius); transition: background 150ms ease; }
    .fseg:hover { background: var(--nb-surface-raised); }
    .fseg-bar { height: 10px; border-radius: 999px; background: var(--nb-border); transform-origin: right; animation: grow 500ms cubic-bezier(0.2,0,0,1) both; }
    .fseg-bar.info { background: var(--nb-info); }
    .fseg-bar.warning { background: var(--nb-warning); }
    .fseg-bar.primary { background: var(--nb-primary-600); }
    .fseg-bar.success { background: var(--nb-success); }
    .fseg-bar.ai { background: var(--nb-primary-300, var(--nb-primary-600)); }
    .fseg.empty .fseg-bar { background: var(--nb-border-soft); }
    .fseg-count { font-size: 16px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .fseg.empty .fseg-count { color: var(--nb-text-faint); }
    .fseg-label { font-size: 11px; font-weight: 600; color: var(--nb-text-muted); }
    @keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    @media (prefers-reduced-motion: reduce) { .fseg-bar { animation: none; } }
    @media (max-width: 700px) { .funnel { flex-wrap: wrap; } .fseg { min-width: 100px; } }
  `]
})
export class AdmissionsDashboardComponent implements OnInit {
  private admissionsService = inject(AdmissionsService);

  applicants = signal<Applicant[]>([]);

  statusText = applicantStatusText;
  statusKind = applicantStatusKind;

  readonly workflow: WorkflowLink[] = [
    { title: 'قائمة الطلبات', desc: 'كل طلبات الالتحاق والبحث والتصفية', path: '/admissions/applications', mark: '١' },
    { title: 'المراجعة', desc: 'تدقيق الطلبات المُقدّمة', path: '/admissions/review', mark: '٢' },
    { title: 'المقابلات', desc: 'جدولة وتقييم المقابلات', path: '/admissions/interviews', mark: '٣' },
    { title: 'التحقق من المستندات', desc: 'اعتماد أو رفض الوثائق', path: '/admissions/documents', mark: '٤' },
    { title: 'قرارات القبول', desc: 'القبول أو الرفض النهائي', path: '/admissions/acceptance', mark: '٥' },
    { title: 'التسجيل', desc: 'تسجيل المقبولين', path: '/admissions/enrollment', mark: '٦' },
    { title: 'قائمة الانتظار', desc: 'إدارة المتقدمين المنتظرين', path: '/admissions/waiting-list', mark: '٧' },
    { title: 'المنح والإعفاءات', desc: 'المنح المالية للمتقدمين', path: '/admissions/scholarships', mark: '٨' },
  ];

  recent = signal<Applicant[]>([]);

  /** مراحل القمع بترتيب الدورة — كل شريحة تنقل لصفحتها. */
  readonly funnelStages = [
    { key: 'submitted', label: 'مُقدّم', tone: 'info', link: '/admissions/review' },
    { key: 'under_review', label: 'قيد المراجعة', tone: 'warning', link: '/admissions/review' },
    { key: 'interview_scheduled', label: 'مقابلة', tone: 'primary', link: '/admissions/interviews' },
    { key: 'accepted', label: 'مقبول', tone: 'success', link: '/admissions/enrollment' },
    { key: 'waitlist', label: 'انتظار', tone: 'ai', link: '/admissions/waiting-list' },
    { key: 'enrolled', label: 'مُسجّل', tone: 'success', link: '/students/list' },
  ];

  /** عرض الشريحة نسبيًا (حد أدنى 8 كي تبقى قابلة للنقر حتى وهي صفر). */
  segWidth(key: string): number {
    const total = this.applicants().length || 1;
    return Math.max(8, (this.getCountByStatus(key) / total) * 100);
  }

  ngOnInit() {
    this.loadApplicants();
  }

  loadApplicants() {
    this.admissionsService.getApplicants().subscribe(res => {
      const list = pickList<Applicant>(res);
      this.applicants.set(list);
      this.recent.set(list.slice(0, 8));
    });
  }

  getCountByStatus(status: string): number {
    return this.applicants().filter(a => a.status === status).length;
  }
}
