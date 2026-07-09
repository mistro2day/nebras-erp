import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdmissionsService, Applicant } from '../admissions.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { applicantStatusKind, applicantStatusText, pickList } from '../shared/admissions.shared';

interface WorkflowLink { title: string; desc: string; path: string; mark: string; }

/**
 * لوحة القبول والتسجيل — داشبورد شامل بنمط Nebras OS:
 * مؤشرات، قمع دورة القبول، توزيعات، مسار العمل، وأحدث الطلبات — ببيانات حقيقية.
 */
@Component({
  selector: 'app-admissions-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, NbPageHeaderComponent, NbPanelComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="لوحة القبول والتسجيل"
        subtitle="نظرة شاملة على دورة القبول — الطلبات، المراجعة، المقابلات، المستندات والتسجيل.">
        <button class="nb-btn-secondary" (click)="load()">تحديث</button>
        <a class="nb-btn-primary" routerLink="/admissions/applications">عرض كل الطلبات</a>
      </nb-page-header>

      @if (loading()) {
        <nb-loading message="جارٍ تحميل بيانات القبول…"></nb-loading>
      } @else {
        <!-- Hero: ملخص دورة القبول ونسبة القبول -->
        <div class="hero" (click)="go('/admissions/applications')">
          <div class="hero-glow"></div>
          <div class="hero-main">
            <span class="hero-badge">دورة القبول الحالية</span>
            <h2 class="hero-title">{{ total() }} <span class="hero-unit">طلب التحاق</span></h2>
            <span class="hero-code">{{ pending() }} بانتظار المعالجة · {{ accepted() }} مقبول</span>
          </div>
          <div class="hero-dates">
            <div class="hero-ring" [style.background]="rateRingBg()">
              <div class="hero-ring-in"><span class="hr-pct">{{ acceptanceRate() }}%</span><span class="hr-lbl">قبول</span></div>
            </div>
            <div class="hero-date"><span class="hd-label">تم تسجيلهم</span><span class="hd-val">{{ count('enrolled') }}</span></div>
            <div class="hero-date"><span class="hd-label">مرفوض</span><span class="hd-val">{{ count('rejected') }}</span></div>
          </div>
        </div>

        <!-- مؤشرات رئيسية -->
        <div class="stats-grid">
          <div class="metric-card total" (click)="go('/admissions/applications')">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg></span>
            <span class="m-body"><span class="label">إجمالي الطلبات</span><span class="value">{{ total() }}</span></span>
          </div>
          <div class="metric-card warn" (click)="go('/admissions/review')">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></span>
            <span class="m-body"><span class="label">بانتظار المراجعة</span><span class="value warn">{{ count('submitted') + count('under_review') }}</span></span>
          </div>
          <div class="metric-card info" (click)="go('/admissions/interviews')">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
            <span class="m-body"><span class="label">المقابلات المجدولة</span><span class="value info">{{ count('interview_scheduled') }}</span></span>
          </div>
          <div class="metric-card success" (click)="go('/admissions/acceptance')">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg></span>
            <span class="m-body"><span class="label">المقبولون</span><span class="value success">{{ accepted() }}</span></span>
          </div>
          <div class="metric-card purple" (click)="go('/admissions/waiting-list')">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></span>
            <span class="m-body"><span class="label">قائمة الانتظار</span><span class="value purple">{{ count('waitlist') }}</span></span>
          </div>
          <div class="metric-card neutral" (click)="go('/admissions/documents')">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
            <span class="m-body"><span class="label">مستندات تم التحقق منها</span><span class="value">{{ docsVerified() }}<span class="v-sub"> / {{ documents().length }}</span></span></span>
          </div>
        </div>

        <!-- قمع دورة القبول -->
        <nb-panel title="قمع دورة القبول" subtitle="توزيع الطلبات على مراحل الدورة — من التقديم حتى التسجيل.">
          <div class="funnel" role="img" [attr.aria-label]="'قمع القبول: ' + total() + ' طلب'">
            @for (st of funnelStages; track st.key) {
              <a class="fseg" [routerLink]="st.link" [style.--w.%]="segWidth(st.key)" [class.empty]="count(st.key) === 0">
                <span class="fseg-bar" [class]="'fseg-bar ' + st.tone"></span>
                <span class="fseg-count">{{ count(st.key) }}</span>
                <span class="fseg-label">{{ st.label }}</span>
              </a>
            }
          </div>
        </nb-panel>

        <!-- تحليلات: توزيع الحالات + النوع + الجنسيات -->
        <div class="analytics">
          <nb-panel title="توزيع الطلبات حسب الحالة">
            @if (total() === 0) { <p class="hint">لا توجد طلبات بعد.</p> }
            @else {
              <div class="hbars">
                @for (s of statusOrder; track s) {
                  <div class="hbar-row">
                    <span class="hbar-name">{{ statusText(s) }}</span>
                    <span class="hbar-track"><span class="hbar-fill" [class]="'hbar-fill ' + statusKind(s)" [class.zero]="count(s) === 0" [style.width.%]="statusBarPct(s)"></span></span>
                    <span class="hbar-val mono">{{ count(s) }}</span>
                  </div>
                }
              </div>
            }
          </nb-panel>

          <nb-panel title="النوع والجنسيات">
            <div class="mc-label">توزيع المتقدمين حسب النوع</div>
            <div class="gender-bar">
              <span class="gb male" [style.flex]="genderCount('male') || 0.001"></span>
              <span class="gb female" [style.flex]="genderCount('female') || 0.001"></span>
            </div>
            <div class="gender-legend">
              <span><i class="lg male"></i>بنين {{ genderCount('male') }}</span>
              <span><i class="lg female"></i>بنات {{ genderCount('female') }}</span>
            </div>
            <div class="nat-list">
              <div class="mc-label" style="margin-top:12px">أبرز الجنسيات</div>
              @for (n of topNationalities(); track n.name) {
                <div class="nat-row"><span>{{ n.name }}</span><span class="mono">{{ n.count }}</span></div>
              }
              @if (topNationalities().length === 0) { <span class="hint">لا بيانات.</span> }
            </div>
          </nb-panel>
        </div>

        <!-- مسار العمل -->
        <nb-panel title="مسار القبول والتسجيل" subtitle="انتقل إلى أي مرحلة من مراحل معالجة الطلبات.">
          <nav class="wf-grid" aria-label="مراحل سير عمل القبول">
            @for (link of workflow; track link.path) {
              <a class="wf-card" [routerLink]="link.path">
                <span class="wf-mark">{{ link.mark }}</span>
                <span class="wf-body"><strong>{{ link.title }}</strong><span class="wf-desc">{{ link.desc }}</span></span>
              </a>
            }
          </nav>
        </nb-panel>

        <!-- أحدث الطلبات -->
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
            @if (total() === 0) { <div class="no-data">لا توجد طلبات تقديم حالياً.</div> }
          </div>
        </nb-panel>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .hint { font-size: 13px; color: var(--nb-text-muted); margin: 0; }
    nb-panel { margin-bottom: 16px; display: block; }

    /* Hero */
    .hero { position: relative; overflow: hidden; cursor: pointer; background: linear-gradient(135deg, var(--nb-primary-600), var(--nb-primary-500));
      border-radius: var(--nb-radius-card); padding: 20px 22px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between;
      gap: 20px; flex-wrap: wrap; box-shadow: 0 8px 24px rgba(0,0,0,.10); transition: transform .2s, box-shadow .2s; }
    .hero:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,.16); }
    .hero-glow { position: absolute; inset-inline-start: -60px; top: -60px; width: 200px; height: 200px; background: rgba(255,255,255,.14); border-radius: 50%; filter: blur(8px); }
    .hero-main { position: relative; display: flex; flex-direction: column; gap: 4px; color: #fff; }
    .hero-badge { font-size: 11px; font-weight: 700; background: rgba(255,255,255,.22); padding: 3px 10px; border-radius: 999px; width: fit-content; }
    .hero-title { margin: 4px 0 0; font-size: 30px; font-weight: 800; color: #fff; font-variant-numeric: tabular-nums; }
    .hero-unit { font-size: 15px; font-weight: 600; opacity: .85; }
    .hero-code { font-size: 12px; color: rgba(255,255,255,.85); }
    .hero-dates { position: relative; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
    .hero-ring { width: 78px; height: 78px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .hero-ring-in { width: 60px; height: 60px; border-radius: 50%; background: var(--nb-primary-600); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; }
    .hr-pct { font-size: 17px; font-weight: 800; font-variant-numeric: tabular-nums; }
    .hr-lbl { font-size: 9.5px; opacity: .85; }
    .hero-date { display: flex; flex-direction: column; gap: 3px; background: rgba(255,255,255,.14); padding: 8px 14px; border-radius: 10px; }
    .hd-label { font-size: 10.5px; color: rgba(255,255,255,.82); }
    .hd-val { font-size: 15px; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums; }

    /* KPI cards */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 16px; }
    .metric-card { position: relative; overflow: hidden; cursor: pointer; background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 16px 18px; display: flex; align-items: center; gap: 14px; box-shadow: 0 1px 3px rgba(0,0,0,.04);
      transition: transform .2s cubic-bezier(0.4,0,0.2,1), box-shadow .2s; }
    .metric-card:hover { transform: translateY(-3px); box-shadow: 0 10px 22px rgba(0,0,0,.08); }
    .metric-card::before { content: ''; position: absolute; inset-block-start: 0; inset-inline: 0; height: 3px; background: var(--nb-text-faint); }
    .metric-card.total::before { background: var(--nb-primary-500); }
    .metric-card.warn::before { background: var(--nb-warning); }
    .metric-card.info::before { background: var(--nb-info); }
    .metric-card.success::before { background: var(--nb-success); }
    .metric-card.purple::before { background: #af52de; }
    .metric-card.neutral::before { background: var(--nb-text-muted); }
    .m-icon { flex-shrink: 0; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: var(--nb-surface-raised); color: var(--nb-text-muted); }
    .m-icon svg { width: 22px; height: 22px; }
    .metric-card.total .m-icon { background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .metric-card.warn .m-icon { background: rgba(255,159,10,.14); color: var(--nb-warning); }
    .metric-card.info .m-icon { background: rgba(0,122,255,.12); color: var(--nb-info); }
    .metric-card.success .m-icon { background: rgba(52,199,89,.12); color: var(--nb-success); }
    .metric-card.purple .m-icon { background: rgba(175,82,222,.12); color: #7d26cd; }
    .m-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .metric-card .label { font-size: 12.5px; color: var(--nb-text-muted); font-weight: 500; }
    .metric-card .value { font-size: 28px; font-weight: 800; line-height: 1.1; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .metric-card .value.warn { color: var(--nb-warning); } .metric-card .value.info { color: var(--nb-info); }
    .metric-card .value.success { color: var(--nb-success); } .metric-card .value.purple { color: #7d26cd; }
    .v-sub { font-size: 14px; font-weight: 600; color: var(--nb-text-muted); }

    /* Funnel */
    .funnel { display: flex; gap: 6px; align-items: stretch; }
    .fseg { flex: var(--w, 10) 1 0; min-width: 76px; display: flex; flex-direction: column; gap: 6px; text-decoration: none; padding: 4px 2px; border-radius: var(--nb-radius); transition: background 150ms ease; }
    .fseg:hover { background: var(--nb-surface-raised); }
    .fseg-bar { height: 14px; border-radius: 999px; background: var(--nb-border); transform-origin: right; animation: grow 500ms cubic-bezier(0.2,0,0,1) both;
      position: relative; box-shadow: inset 0 0 0 1px rgba(0,0,0,.03); }
    .fseg-bar::after { content: ''; position: absolute; inset: 0 0 auto 0; height: 45%; border-radius: 999px 999px 0 0; background: linear-gradient(180deg, rgba(255,255,255,.3), transparent); }
    .fseg-bar.info { background: linear-gradient(90deg, #0056b3, var(--nb-info)); }
    .fseg-bar.warning { background: linear-gradient(90deg, #d98413, var(--nb-warning)); }
    .fseg-bar.primary { background: linear-gradient(90deg, var(--nb-primary-700, #0056b3), var(--nb-primary-500)); }
    .fseg-bar.success { background: linear-gradient(90deg, #2a9d54, var(--nb-success)); }
    .fseg-bar.ai { background: linear-gradient(90deg, #7d26cd, #af52de); }
    .fseg.empty .fseg-bar { background: var(--nb-border-soft); box-shadow: none; }
    .fseg.empty .fseg-bar::after { display: none; }
    .fseg-count { font-size: 16px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .fseg.empty .fseg-count { color: var(--nb-text-faint); }
    .fseg-label { font-size: 11px; font-weight: 600; color: var(--nb-text-muted); }
    @keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    @media (prefers-reduced-motion: reduce) { .fseg-bar { animation: none; } }
    @media (max-width: 700px) { .funnel { flex-wrap: wrap; } .fseg { min-width: 100px; } }

    /* Analytics */
    .analytics { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; align-items: start; }
    @media (max-width: 860px) { .analytics { grid-template-columns: 1fr; } }
    .analytics nb-panel { margin-bottom: 0; }
    .mc-label { font-size: 12px; color: var(--nb-text-muted); margin-bottom: 10px; }
    .hbars { display: flex; flex-direction: column; gap: 12px; }
    .hbar-row { display: grid; grid-template-columns: 108px 1fr 30px; align-items: center; gap: 10px; }
    .hbar-name { font-size: 12.5px; color: var(--nb-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .hbar-track { position: relative; height: 14px; background: var(--nb-surface-raised); border-radius: 7px; overflow: hidden; box-shadow: inset 0 0 0 1px var(--nb-border-soft); }
    .hbar-fill { display: block; height: 100%; min-width: 0; border-radius: 7px; background: linear-gradient(90deg, var(--nb-primary-600), var(--nb-primary-400));
      transition: width .7s cubic-bezier(0.34,1.2,0.44,1); position: relative; }
    /* لمعة خفيفة أعلى الشريط لإحساس واقعي */
    .hbar-fill::after { content: ''; position: absolute; inset: 0 0 auto 0; height: 45%; border-radius: 7px 7px 0 0; background: linear-gradient(180deg, rgba(255,255,255,.28), transparent); }
    .hbar-fill.success { background: linear-gradient(90deg, #2a9d54, var(--nb-success)); }
    .hbar-fill.warning { background: linear-gradient(90deg, #d98413, var(--nb-warning)); }
    .hbar-fill.info { background: linear-gradient(90deg, #0056b3, var(--nb-info)); }
    .hbar-fill.danger { background: linear-gradient(90deg, #c02d24, var(--nb-danger)); }
    .hbar-fill.ai { background: linear-gradient(90deg, #7d26cd, #af52de); }
    .hbar-fill.zero { background: transparent; box-shadow: none; }
    .hbar-val { font-size: 12.5px; font-weight: 800; color: var(--nb-text); text-align: end; font-variant-numeric: tabular-nums; }

    .gender-bar { display: flex; height: 14px; border-radius: 7px; overflow: hidden; gap: 3px; margin-bottom: 10px; box-shadow: inset 0 0 0 1px var(--nb-border-soft); }
    .gb { transition: flex .7s cubic-bezier(0.34,1.2,0.44,1); }
    .gb.male { background: linear-gradient(90deg, #0056b3, #007aff); } .gb.female { background: linear-gradient(90deg, #7d26cd, #af52de); }
    .gender-legend { display: flex; gap: 14px; font-size: 11px; color: var(--nb-text-secondary); }
    .gender-legend i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-inline-end: 5px; }
    .lg.male { background: #007aff; } .lg.female { background: #af52de; }
    .nat-list { border-top: 1px dashed var(--nb-border-soft); margin-top: 12px; padding-top: 4px; }
    .nat-row { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--nb-text); padding: 5px 0; border-bottom: 1px solid var(--nb-border-row); }
    .nat-row:last-child { border-bottom: none; }

    /* Workflow */
    .wf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; }
    .wf-card { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius);
      background: var(--nb-surface-raised); text-decoration: none; transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease; }
    .wf-card:hover { border-color: var(--nb-primary-300); box-shadow: var(--nb-shadow-card); transform: translateY(-2px); }
    .wf-card:focus-visible { outline: none; box-shadow: var(--nb-focus-ring); }
    .wf-mark { width: 34px; height: 34px; flex-shrink: 0; background: var(--nb-primary-50); color: var(--nb-primary-600); border-radius: var(--nb-radius); display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; }
    .wf-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .wf-body strong { font-size: 13px; font-weight: 700; color: var(--nb-text); }
    .wf-desc { font-size: 11px; color: var(--nb-text-muted); }

    /* Recent list */
    .list { display: flex; flex-direction: column; }
    .list-item { display: block; padding: 10px 16px; border-top: 1px solid var(--nb-border-soft); text-decoration: none; }
    .list-item:first-child { border-top: none; }
    .list-item:hover { background: var(--nb-surface-raised); }
    .list-item:focus-visible { outline: none; box-shadow: var(--nb-focus-ring); }
    .item-header { display: flex; justify-content: space-between; align-items: center; color: var(--nb-text); font-size: 13px; }
    .item-header strong { font-weight: 600; }
    .item-info { font-size: 11px; color: var(--nb-text-muted); margin-top: 4px; display: flex; align-items: center; gap: 8px; }
    .no-data { color: var(--nb-text-muted); text-align: center; padding: 28px; font-size: 13px; }
  `]
})
export class AdmissionsDashboardComponent implements OnInit {
  private svc = inject(AdmissionsService);
  private router = inject(Router);

  readonly applicants = signal<Applicant[]>([]);
  readonly interviews = signal<any[]>([]);
  readonly documents = signal<any[]>([]);
  readonly loading = signal(false);

  statusText = applicantStatusText;
  statusKind = applicantStatusKind;

  readonly statusOrder = ['submitted', 'under_review', 'interview_scheduled', 'accepted', 'waitlist', 'enrolled', 'rejected'];

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

  readonly funnelStages = [
    { key: 'submitted', label: 'مُقدّم', tone: 'info', link: '/admissions/review' },
    { key: 'under_review', label: 'قيد المراجعة', tone: 'warning', link: '/admissions/review' },
    { key: 'interview_scheduled', label: 'مقابلة', tone: 'primary', link: '/admissions/interviews' },
    { key: 'accepted', label: 'مقبول', tone: 'success', link: '/admissions/enrollment' },
    { key: 'waitlist', label: 'انتظار', tone: 'ai', link: '/admissions/waiting-list' },
    { key: 'enrolled', label: 'مُسجّل', tone: 'success', link: '/students/list' },
  ];

  readonly recent = computed(() => this.applicants().slice(0, 8));
  readonly total = computed(() => this.applicants().length);
  readonly pending = computed(() => this.count('submitted') + this.count('under_review') + this.count('interview_scheduled'));
  readonly accepted = computed(() => this.count('accepted') + this.count('enrolled'));
  readonly acceptanceRate = computed(() => this.total() ? Math.round((this.accepted() / this.total()) * 100) : 0);
  readonly maxStatus = computed(() => Math.max(1, ...this.statusOrder.map((s) => this.count(s))));
  readonly docsVerified = computed(() => this.documents().filter((d) => d.verification_status === 'verified').length);

  readonly topNationalities = computed(() => {
    const m = new Map<string, number>();
    for (const a of this.applicants()) { const n = a.nationality || 'غير محدّد'; m.set(n, (m.get(n) || 0) + 1); }
    return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    forkJoin({
      applicants: this.svc.getApplicants(),
      interviews: this.svc.getInterviews(),
      documents: this.svc.getDocuments(),
    }).subscribe({
      next: (r) => {
        this.applicants.set(pickList<Applicant>(r.applicants));
        this.interviews.set(pickList(r.interviews));
        this.documents.set(pickList(r.documents));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  go(path: string): void { this.router.navigateByUrl(path); }
  count(status: string): number { return this.applicants().filter((a) => a.status === status).length; }
  genderCount(g: string): number { return this.applicants().filter((a) => a.gender === g).length; }

  segWidth(key: string): number {
    const total = this.total() || 1;
    return Math.max(8, (this.count(key) / total) * 100);
  }

  /** عرض شريط الحالة نسبيًا لأكبر قيمة، مع حد أدنى مرئي عند وجود قيمة. */
  statusBarPct(status: string): number {
    const c = this.count(status);
    if (c === 0) return 0;
    return Math.max(6, (c / this.maxStatus()) * 100);
  }

  rateRingBg(): string {
    const pct = Math.min(100, this.acceptanceRate());
    return `conic-gradient(#fff ${pct * 3.6}deg, rgba(255,255,255,.28) ${pct * 3.6}deg)`;
  }
}
