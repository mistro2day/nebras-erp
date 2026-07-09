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
        <!-- Hero نحيف: ملخص الدورة ونسبة القبول -->
        <div class="hero" (click)="go('/admissions/applications')">
          <div class="hero-glow"></div>
          <div class="hero-main">
            <span class="hero-badge">دورة القبول الحالية</span>
            <span class="hero-line"><b>{{ total() }}</b> طلب التحاق · {{ pending() }} بانتظار المعالجة · {{ accepted() }} مقبول</span>
          </div>
          <div class="hero-dates">
            <div class="hero-ring" [style.background]="rateRingBg()">
              <div class="hero-ring-in"><span class="hr-pct">{{ acceptanceRate() }}%</span><span class="hr-lbl">قبول</span></div>
            </div>
            <div class="hero-date"><span class="hd-label">مُسجّل</span><span class="hd-val">{{ count('enrolled') }}</span></div>
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

        <!-- مسار العمل: صف مضغوط من الاختصارات -->
        <div class="wf-strip">
          @for (link of workflow; track link.path) {
            <a class="wf-chip" [routerLink]="link.path" [title]="link.desc">
              <span class="wf-mark">{{ link.mark }}</span>
              <span class="wf-t">{{ link.title }}</span>
            </a>
          }
        </div>

        <!-- مسار الطلبات عبر المراحل -->
        <nb-panel title="مسار الطلبات عبر المراحل" [flush]="true">
          <div class="funnel" role="img" [attr.aria-label]="'مسار الطلبات: ' + total() + ' طلب'">
            @for (st of funnelStages; track st.key) {
              <a class="fseg" [routerLink]="st.link" [style.--w.%]="segWidth(st.statuses)" [class.empty]="segCount(st.statuses) === 0">
                <span class="fseg-bar" [class]="'fseg-bar ' + st.tone"></span>
                <span class="fseg-count">{{ segCount(st.statuses) }}</span>
                <span class="fseg-label">{{ st.label }}</span>
              </a>
            }
          </div>
        </nb-panel>

        <!-- صف بينتو: مؤشرات التحويل + النوع + أحدث الطلبات -->
        <div class="bento">
          <!-- بطاقة أكثر فائدة: مؤشرات التحويل عبر مراحل القبول -->
          <nb-panel title="مؤشرات التحويل" [flush]="true">
            <div class="conv">
              @for (c of conversion(); track c.label) {
                <a class="conv-row" [routerLink]="c.link">
                  <span class="conv-top">
                    <span class="conv-label">{{ c.label }}</span>
                    <span class="conv-pct" [class]="c.tone">{{ c.pct }}%</span>
                  </span>
                  <span class="conv-track"><span class="conv-fill" [class]="c.tone" [style.width.%]="c.pct"></span></span>
                  <span class="conv-sub">{{ c.num }} من {{ c.den }}</span>
                </a>
              }
            </div>
          </nb-panel>

          <!-- النوع والجنسيات -->
          <nb-panel title="النوع والجنسيات">
            <div class="gender-bar">
              <span class="gb male" [style.flex]="genderCount('male') || 0.001"></span>
              <span class="gb female" [style.flex]="genderCount('female') || 0.001"></span>
            </div>
            <div class="gender-legend">
              <span><i class="lg male"></i>بنين {{ genderCount('male') }}</span>
              <span><i class="lg female"></i>بنات {{ genderCount('female') }}</span>
            </div>
            <div class="nat-list">
              <div class="mc-label">أبرز الجنسيات</div>
              @for (n of topNationalities(); track n.name) {
                <div class="nat-row"><span>{{ n.name }}</span><span class="mono">{{ n.count }}</span></div>
              }
              @if (topNationalities().length === 0) { <span class="hint">لا بيانات.</span> }
            </div>
          </nb-panel>

          <!-- أحدث الطلبات -->
          <nb-panel title="أحدث الطلبات" [flush]="true">
            <div class="list">
              @for (applicant of recent5(); track applicant.id) {
                <a class="list-item" [routerLink]="['/admissions/applications', applicant.id]">
                  <span class="li-name">{{ applicant.arabic_full_name }}</span>
                  <span [class]="'nb-badge-' + statusKind(applicant.status)">{{ statusText(applicant.status) }}</span>
                </a>
              }
              @if (total() === 0) { <div class="no-data">لا توجد طلبات حالياً.</div> }
            </div>
          </nb-panel>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 14px 16px; overflow-y: auto; min-width: 0; }
    .hint { font-size: 12.5px; color: var(--nb-text-muted); margin: 0; }
    nb-panel { margin-bottom: 12px; display: block; }

    /* Hero نحيف */
    .hero { position: relative; overflow: hidden; cursor: pointer; background: linear-gradient(135deg, var(--nb-primary-600), var(--nb-primary-500));
      border-radius: var(--nb-radius-card); padding: 12px 18px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;
      gap: 16px; flex-wrap: wrap; box-shadow: 0 4px 14px rgba(0,0,0,.10); transition: transform .2s, box-shadow .2s; }
    .hero:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(0,0,0,.14); }
    .hero-glow { position: absolute; inset-inline-start: -60px; top: -80px; width: 180px; height: 180px; background: rgba(255,255,255,.13); border-radius: 50%; filter: blur(8px); }
    .hero-main { position: relative; display: flex; align-items: center; gap: 12px; color: #fff; flex-wrap: wrap; }
    .hero-badge { font-size: 11px; font-weight: 700; background: rgba(255,255,255,.22); padding: 3px 10px; border-radius: 999px; }
    .hero-line { font-size: 13px; color: rgba(255,255,255,.92); }
    .hero-line b { font-size: 18px; font-weight: 800; font-variant-numeric: tabular-nums; }
    .hero-dates { position: relative; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .hero-ring { width: 54px; height: 54px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .hero-ring-in { width: 42px; height: 42px; border-radius: 50%; background: var(--nb-primary-600); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; }
    .hr-pct { font-size: 13px; font-weight: 800; font-variant-numeric: tabular-nums; }
    .hr-lbl { font-size: 8px; opacity: .85; }
    .hero-date { display: flex; flex-direction: column; gap: 1px; background: rgba(255,255,255,.14); padding: 5px 12px; border-radius: 8px; }
    .hd-label { font-size: 10px; color: rgba(255,255,255,.82); }
    .hd-val { font-size: 14px; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums; }

    /* KPI cards مضغوطة */
    .stats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 12px; }
    @media (max-width: 1100px) { .stats-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 620px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
    .metric-card { position: relative; overflow: hidden; cursor: pointer; background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 11px 12px; display: flex; align-items: center; gap: 10px; box-shadow: 0 1px 3px rgba(0,0,0,.04);
      transition: transform .2s cubic-bezier(0.4,0,0.2,1), box-shadow .2s; }
    .metric-card:hover { transform: translateY(-2px); box-shadow: 0 8px 18px rgba(0,0,0,.08); }
    .metric-card::before { content: ''; position: absolute; inset-block-start: 0; inset-inline: 0; height: 3px; background: var(--nb-text-faint); }
    .metric-card.total::before { background: var(--nb-primary-500); }
    .metric-card.warn::before { background: var(--nb-warning); }
    .metric-card.info::before { background: var(--nb-info); }
    .metric-card.success::before { background: var(--nb-success); }
    .metric-card.purple::before { background: #af52de; }
    .metric-card.neutral::before { background: var(--nb-text-muted); }
    .m-icon { flex-shrink: 0; width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center; background: var(--nb-surface-raised); color: var(--nb-text-muted); }
    .m-icon svg { width: 18px; height: 18px; }
    .metric-card.total .m-icon { background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .metric-card.warn .m-icon { background: rgba(255,159,10,.14); color: var(--nb-warning); }
    .metric-card.info .m-icon { background: rgba(0,122,255,.12); color: var(--nb-info); }
    .metric-card.success .m-icon { background: rgba(52,199,89,.12); color: var(--nb-success); }
    .metric-card.purple .m-icon { background: rgba(175,82,222,.12); color: #7d26cd; }
    .m-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .metric-card .label { font-size: 11px; color: var(--nb-text-muted); font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .metric-card .value { font-size: 20px; font-weight: 800; line-height: 1.15; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .metric-card .value.warn { color: var(--nb-warning); } .metric-card .value.info { color: var(--nb-info); }
    .metric-card .value.success { color: var(--nb-success); } .metric-card .value.purple { color: #7d26cd; }
    .v-sub { font-size: 12px; font-weight: 600; color: var(--nb-text-muted); }

    /* Funnel */
    .funnel { display: flex; gap: 6px; align-items: stretch; padding: 12px 14px; }
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
    .fseg-bar.danger { background: linear-gradient(90deg, #c02d24, var(--nb-danger)); }
    .fseg.empty .fseg-bar { background: var(--nb-border-soft); box-shadow: none; }
    .fseg.empty .fseg-bar::after { display: none; }
    .fseg-count { font-size: 16px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .fseg.empty .fseg-count { color: var(--nb-text-faint); }
    .fseg-label { font-size: 11px; font-weight: 600; color: var(--nb-text-muted); }
    @keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    @media (prefers-reduced-motion: reduce) { .fseg-bar { animation: none; } }
    @media (max-width: 700px) { .funnel { flex-wrap: wrap; } .fseg { min-width: 100px; } }

    /* بينتو: 3 أعمدة مضغوطة */
    .bento { display: grid; grid-template-columns: 1.25fr 1fr 1fr; gap: 12px; align-items: stretch; margin-bottom: 12px; }
    @media (max-width: 960px) { .bento { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 620px) { .bento { grid-template-columns: 1fr; } }
    .bento nb-panel { margin-bottom: 0; }
    .mc-label { font-size: 11.5px; color: var(--nb-text-muted); margin-bottom: 8px; font-weight: 600; }

    /* مؤشرات التحويل */
    .conv { display: flex; flex-direction: column; }
    .conv-row { display: grid; grid-template-columns: 1fr auto; gap: 3px 8px; padding: 9px 14px; border-top: 1px solid var(--nb-border-soft); text-decoration: none; transition: background .15s; }
    .conv-row:first-child { border-top: none; }
    .conv-row:hover { background: var(--nb-surface-raised); }
    .conv-top { grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: baseline; }
    .conv-label { font-size: 12px; color: var(--nb-text-secondary); }
    .conv-pct { font-size: 15px; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--nb-text); }
    .conv-pct.success { color: var(--nb-success); } .conv-pct.info { color: var(--nb-info); }
    .conv-pct.primary { color: var(--nb-primary-600); } .conv-pct.warn { color: var(--nb-warning); }
    .conv-track { grid-column: 1 / -1; height: 7px; background: var(--nb-surface-raised); border-radius: 4px; overflow: hidden; box-shadow: inset 0 0 0 1px var(--nb-border-soft); }
    .conv-fill { display: block; height: 100%; border-radius: 4px; background: var(--nb-primary-500); transition: width .7s cubic-bezier(0.34,1.2,0.44,1); }
    .conv-fill.success { background: linear-gradient(90deg, #2a9d54, var(--nb-success)); }
    .conv-fill.info { background: linear-gradient(90deg, #0056b3, var(--nb-info)); }
    .conv-fill.primary { background: linear-gradient(90deg, var(--nb-primary-700, #0056b3), var(--nb-primary-500)); }
    .conv-fill.warn { background: linear-gradient(90deg, #d98413, var(--nb-warning)); }
    .conv-sub { grid-column: 1 / -1; font-size: 10.5px; color: var(--nb-text-muted); font-variant-numeric: tabular-nums; }

    .gender-bar { display: flex; height: 14px; border-radius: 7px; overflow: hidden; gap: 3px; margin-bottom: 10px; box-shadow: inset 0 0 0 1px var(--nb-border-soft); }
    .gb { transition: flex .7s cubic-bezier(0.34,1.2,0.44,1); }
    .gb.male { background: linear-gradient(90deg, #0056b3, #007aff); } .gb.female { background: linear-gradient(90deg, #7d26cd, #af52de); }
    .gender-legend { display: flex; gap: 14px; font-size: 11px; color: var(--nb-text-secondary); }
    .gender-legend i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-inline-end: 5px; }
    .lg.male { background: #007aff; } .lg.female { background: #af52de; }
    .nat-list { border-top: 1px dashed var(--nb-border-soft); margin-top: 10px; padding-top: 6px; }
    .nat-row { display: flex; justify-content: space-between; font-size: 12px; color: var(--nb-text); padding: 4px 0; border-bottom: 1px solid var(--nb-border-row); }
    .nat-row:last-child { border-bottom: none; }

    /* شريط مسار العمل — مسار مترابط أنيق ومضغوط */
    .wf-strip { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 12px;
      background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 8px 10px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
    .wf-chip { position: relative; display: inline-flex; align-items: center; gap: 7px; padding: 5px 11px 5px 6px; border-radius: 999px;
      background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); text-decoration: none;
      transition: transform .15s ease, background .15s ease, border-color .15s ease, box-shadow .15s ease; }
    .wf-chip::after { content: ''; width: 10px; height: 1.5px; background: var(--nb-border); margin-inline-start: 1px; border-radius: 2px; opacity: .8; }
    .wf-chip:last-child::after { display: none; }
    .wf-chip:hover { background: var(--nb-primary-50); border-color: var(--nb-primary-300); transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0,0,0,.06); }
    .wf-chip:focus-visible { outline: none; box-shadow: var(--nb-focus-ring); }
    .wf-mark { width: 22px; height: 22px; flex-shrink: 0; background: linear-gradient(135deg, var(--nb-primary-600), var(--nb-primary-400)); color: #fff;
      border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11.5px; font-weight: 800; box-shadow: 0 1px 3px rgba(0,0,0,.15); }
    .wf-chip:hover .wf-mark { transform: scale(1.06); }
    .wf-t { font-size: 12px; font-weight: 600; color: var(--nb-text-secondary); white-space: nowrap; transition: color .15s ease; }
    .wf-chip:hover .wf-t { color: var(--nb-primary-700, var(--nb-primary-600)); }

    /* قائمة أحدث الطلبات المضغوطة */
    .list { display: flex; flex-direction: column; }
    .list-item { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 14px; border-top: 1px solid var(--nb-border-soft); text-decoration: none; }
    .list-item:first-child { border-top: none; }
    .list-item:hover { background: var(--nb-surface-raised); }
    .list-item:focus-visible { outline: none; box-shadow: var(--nb-focus-ring); }
    .li-name { font-size: 12.5px; font-weight: 600; color: var(--nb-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .no-data { color: var(--nb-text-muted); text-align: center; padding: 22px; font-size: 12.5px; }
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

  /** مراحل القمع مطابقة لطوابير الصفحات الفعلية (كل شريحة قد تجمع أكثر من حالة). */
  readonly funnelStages = [
    { key: 'review', statuses: ['submitted', 'under_review'], label: 'قيد المراجعة', tone: 'warning', link: '/admissions/review' },
    { key: 'interview', statuses: ['interview_scheduled'], label: 'مقابلة', tone: 'primary', link: '/admissions/interviews' },
    { key: 'accepted', statuses: ['accepted'], label: 'مقبول', tone: 'success', link: '/admissions/acceptance' },
    { key: 'waitlist', statuses: ['waitlist'], label: 'قائمة الانتظار', tone: 'ai', link: '/admissions/waiting-list' },
    { key: 'enrolled', statuses: ['enrolled'], label: 'مُسجّل', tone: 'success', link: '/admissions/enrollment' },
    { key: 'rejected', statuses: ['rejected'], label: 'مرفوض', tone: 'danger', link: '/admissions/applications' },
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

  readonly recent5 = computed(() => this.applicants().slice(0, 5));

  /** مؤشرات التحويل عبر مراحل القبول (أكثر فائدة من مجرد عدّ الحالات). */
  readonly conversion = computed(() => {
    const t = this.total();
    const reachedInterview = this.count('interview_scheduled') + this.count('accepted') + this.count('enrolled');
    const docsTotal = this.documents().length;
    const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
    return [
      { label: 'نسبة القبول', num: this.accepted(), den: t, pct: pct(this.accepted(), t), tone: 'success', link: '/admissions/acceptance' },
      { label: 'وصلوا لمرحلة المقابلة', num: reachedInterview, den: t, pct: pct(reachedInterview, t), tone: 'info', link: '/admissions/interviews' },
      { label: 'اكتمال التسجيل النهائي', num: this.count('enrolled'), den: this.accepted(), pct: pct(this.count('enrolled'), this.accepted()), tone: 'primary', link: '/admissions/enrollment' },
      { label: 'مستندات مُتحقّق منها', num: this.docsVerified(), den: docsTotal, pct: pct(this.docsVerified(), docsTotal), tone: 'warn', link: '/admissions/documents' },
    ];
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

  /** مجموع عدد الطلبات في حالات شريحة القمع. */
  segCount(statuses: string[]): number {
    return this.applicants().filter((a) => statuses.includes(a.status)).length;
  }

  segWidth(statuses: string[]): number {
    const total = this.total() || 1;
    return Math.max(8, (this.segCount(statuses) / total) * 100);
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
