import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AcademicsService } from '../academics.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { pickList } from '../shared/academics.shared';

/**
 * اللوحة الأكاديمية — داشبورد شامل لكل بيانات الشؤون الأكاديمية:
 * السنوات، الفصول (الأتْرام)، المراحل، الصفوف، الشعب، المواد. (Nebras OS)
 */
@Component({
  selector: 'app-academic-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NbPageHeaderComponent, NbPanelComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="اللوحة الأكاديمية"
        subtitle="نظرة شاملة على السنوات الدراسية، الفصول، المراحل، الصفوف، الشعب والمواد.">
        <button class="nb-btn-secondary" (click)="load()">تحديث</button>
        <button class="nb-btn-primary" (click)="go('/academics/distribution')">توزيع الطلاب</button>
      </nb-page-header>

      @if (loading()) {
        <nb-loading message="جارٍ تحميل البيانات الأكاديمية…"></nb-loading>
      } @else {
        <!-- بطاقة السنة النشطة -->
        @if (currentYear(); as cy) {
          <div class="hero" (click)="go('/academics/years')">
            <div class="hero-glow"></div>
            <div class="hero-main">
              <span class="hero-badge">السنة الدراسية الحالية</span>
              <h2 class="hero-title">{{ cy.name }}</h2>
              <span class="hero-code">الرمز: {{ cy.code }}</span>
            </div>
            <div class="hero-dates">
              <div class="hero-date"><span class="hd-label">البدء</span><span class="hd-val">{{ cy.start_date }}</span></div>
              <span class="hero-arrow">←</span>
              <div class="hero-date"><span class="hd-label">الانتهاء</span><span class="hd-val">{{ cy.end_date }}</span></div>
              <div class="hero-date reg"><span class="hd-label">فصول السنة</span><span class="hd-val">{{ currentTerms().length }} فصل</span></div>
            </div>
          </div>
        } @else {
          <nb-panel style="margin-bottom:16px"><p class="hint">لا توجد سنة دراسية نشطة. عيّن السنة الحالية من صفحة «السنوات الدراسية».</p></nb-panel>
        }

        <!-- مؤشرات رئيسية -->
        <div class="stats-grid">
          <div class="metric-card total" (click)="go('/academics/years')">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></span>
            <span class="m-body"><span class="label">السنوات الدراسية</span><span class="value">{{ years().length }}</span></span>
          </div>
          <div class="metric-card info" (click)="go('/academics/terms')">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 14h.01M12 14h.01M16 14h.01"/></svg></span>
            <span class="m-body"><span class="label">الفصول الدراسية</span><span class="value info">{{ terms().length }}</span></span>
          </div>
          <div class="metric-card purple" (click)="go('/academics/stages')">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></span>
            <span class="m-body"><span class="label">المراحل التعليمية</span><span class="value purple">{{ stages().length }}</span></span>
          </div>
          <div class="metric-card success" (click)="go('/academics/grades')">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></span>
            <span class="m-body"><span class="label">الصفوف التعليمية</span><span class="value success">{{ grades().length }}</span></span>
          </div>
          <div class="metric-card warn" (click)="go('/academics/sections')">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
            <span class="m-body"><span class="label">الشعب الدراسية</span><span class="value warn">{{ sections().length }}</span></span>
          </div>
          <div class="metric-card neutral" (click)="go('/academics/subjects')">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></span>
            <span class="m-body"><span class="label">المواد الدراسية</span><span class="value">{{ subjects().length }}</span></span>
          </div>
        </div>

        <!-- مؤشرات الطلاب والمقاعد (نفس نمط البطاقات المعتمد) -->
        <div class="stats-grid">
          <div class="metric-card total" (click)="go('/academics/distribution')">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
            <span class="m-body"><span class="label">الطلاب المسجّلون</span><span class="value">{{ studentsTotal() }}</span></span>
          </div>
          <div class="metric-card success" (click)="go('/academics/distribution')">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg></span>
            <span class="m-body"><span class="label">الموزّعون على شعب</span><span class="value success">{{ studentsAssigned() }}</span></span>
          </div>
          <div class="metric-card warn" (click)="go('/academics/distribution')">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></span>
            <span class="m-body"><span class="label">بانتظار التوزيع</span><span class="value warn">{{ studentsUnassigned() }}</span></span>
          </div>
          <div class="metric-card info" (click)="go('/academics/sections')">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h18M3 10a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2M3 10v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8M7 20v-4M17 20v-4"/></svg></span>
            <span class="m-body"><span class="label">المقاعد المتاحة</span><span class="value info">{{ seatAvailable() }}</span></span>
          </div>
          <div class="metric-card occ" [class.hot]="occupancyRate() >= 90" [class.mid]="occupancyRate() >= 70 && occupancyRate() < 90">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg></span>
            <span class="m-body">
              <span class="label">نسبة إشغال المقاعد</span>
              <span class="value">{{ occupancyRate() }}<span class="v-suffix">%</span></span>
              <span class="occ-bar"><span class="occ-fill" [style.width.%]="occupancyRate()"></span></span>
              <span class="occ-note">{{ seatOccupied() }} / {{ seatCapacity() }} مقعد</span>
            </span>
          </div>
        </div>

        <!-- صف تحليلي: توزيع الطلاب على المراحل + توزيع الشعب حسب النوع -->
        <div class="mini-grid">
          <div class="mini-card chart-card">
            <span class="mc-label">توزيع الطلاب على المراحل</span>
            @if (studentsTotal() === 0) {
              <span class="chart-empty">لا يوجد طلاب موزّعون بعد.</span>
            } @else {
              <div class="hbars">
                @for (s of stages(); track s.id) {
                  <div class="hbar-row">
                    <span class="hbar-name">{{ s.name }}</span>
                    <span class="hbar-track"><span class="hbar-fill" [style.width.%]="(studentsInStage(s.id) / maxStageStudents()) * 100"></span></span>
                    <span class="hbar-val mono">{{ studentsInStage(s.id) }}</span>
                  </div>
                }
              </div>
            }
          </div>
          <div class="mini-card gender">
            <span class="mc-label">توزيع الشعب حسب النوع</span>
            <div class="gender-bar">
              <span class="gb male" [style.flex]="genderCount('male') || 0.001" [title]="'بنين: ' + genderCount('male')"></span>
              <span class="gb female" [style.flex]="genderCount('female') || 0.001" [title]="'بنات: ' + genderCount('female')"></span>
              <span class="gb mixed" [style.flex]="genderCount('mixed') || 0.001" [title]="'مختلط: ' + genderCount('mixed')"></span>
            </div>
            <div class="gender-legend">
              <span><i class="lg male"></i>بنين {{ genderCount('male') }}</span>
              <span><i class="lg female"></i>بنات {{ genderCount('female') }}</span>
              <span><i class="lg mixed"></i>مختلط {{ genderCount('mixed') }}</span>
            </div>
            <div class="cap-line">
              <span class="mc-label">إجمالي السعة</span>
              <span class="mono">{{ seatCapacity() }} مقعد · متوسط {{ avgSectionsPerGrade() }} شعبة/صف</span>
            </div>
          </div>
        </div>

        <div class="main-sections">
          <!-- الهيكل التعليمي مع رسم توزيع الصفوف/الشعب حسب المرحلة -->
          <nb-panel title="الهيكل التعليمي (المراحل والصفوف والشعب)">
            @if (stages().length === 0) {
              <p class="hint">لا توجد مراحل تعليمية بعد.</p>
            } @else {
              <div class="stages-list">
                @for (stage of stages(); track stage.id) {
                  <div class="stage-block">
                    <div class="sb-head">
                      <h3>{{ stage.name }}</h3>
                      <span class="sb-age">عمر {{ stage.minimum_age }}–{{ stage.maximum_age }}</span>
                      <span class="sb-counts">{{ gradesForStage(stage.id).length }} صف · {{ sectionsForStage(stage.id) }} شعبة · {{ studentsInStage(stage.id) }} طالب</span>
                    </div>
                    <div class="dist-bar">
                      <span class="dist-fill" [style.width.%]="stageBarPct(stage.id)"></span>
                    </div>
                    <div class="grades-tags">
                      @for (grade of gradesForStage(stage.id); track grade.id) {
                        <span class="grade-tag" [title]="'الشعب: ' + sectionsOf(grade.id) + ' · الطلاب: ' + studentsInGrade(grade.id)">
                          {{ grade.name }}
                          <span class="gt-badge sections">{{ sectionsOf(grade.id) }} ش</span>
                          <span class="gt-badge students">{{ studentsInGrade(grade.id) }} ط</span>
                        </span>
                      }
                      @if (gradesForStage(stage.id).length === 0) { <span class="hint">لا صفوف</span> }
                    </div>
                  </div>
                }
              </div>
            }
          </nb-panel>

          <div class="side-col">
            <!-- فصول السنة الحالية -->
            <nb-panel title="فصول السنة الحالية" [flush]="true">
              <div class="list">
                @for (t of currentTerms(); track t.id) {
                  <div class="list-item">
                    <div class="item-header">
                      <strong>{{ t.name }}</strong>
                      <span [class]="termBadge(t.status)">{{ termStatus(t.status) }}</span>
                    </div>
                    <div class="item-dates"><span>{{ t.start_date }}</span> ← <span>{{ t.end_date }}</span></div>
                  </div>
                }
                @if (currentTerms().length === 0) { <div class="empty-list">لا توجد فصول للسنة الحالية.</div> }
              </div>
            </nb-panel>

            <!-- السنوات المسجلة -->
            <nb-panel title="السنوات الدراسية المسجلة" [flush]="true">
              <div class="list">
                @for (year of years(); track year.id) {
                  <div class="list-item" [class.current]="year.current_flag">
                    <div class="item-header">
                      <strong>{{ year.name }}</strong>
                      @if (year.current_flag) { <span class="nb-badge-info">الحالية</span> }
                      @else { <span [class]="yearBadge(year.status)">{{ yearStatus(year.status) }}</span> }
                    </div>
                    <div class="item-dates"><span>{{ year.start_date }}</span> ← <span>{{ year.end_date }}</span></div>
                  </div>
                }
                @if (years().length === 0) { <div class="empty-list">لا توجد سنوات مسجلة.</div> }
              </div>
            </nb-panel>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .hint { font-size: 13px; color: var(--nb-text-muted); margin: 0; }

    /* Hero السنة الحالية */
    .hero { position: relative; overflow: hidden; cursor: pointer; background: linear-gradient(135deg, var(--nb-primary-600), var(--nb-primary-500));
      border-radius: var(--nb-radius-card); padding: 20px 22px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between;
      gap: 20px; flex-wrap: wrap; box-shadow: 0 8px 24px rgba(0,0,0,.10); transition: transform .2s, box-shadow .2s; }
    .hero:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,.16); }
    .hero-glow { position: absolute; inset-inline-start: -60px; top: -60px; width: 200px; height: 200px; background: rgba(255,255,255,.14); border-radius: 50%; filter: blur(8px); }
    .hero-main { position: relative; display: flex; flex-direction: column; gap: 4px; color: #fff; }
    .hero-badge { font-size: 11px; font-weight: 700; background: rgba(255,255,255,.22); padding: 3px 10px; border-radius: 999px; width: fit-content; }
    .hero-title { margin: 4px 0 0; font-size: 24px; font-weight: 800; color: #fff; }
    .hero-code { font-size: 12px; color: rgba(255,255,255,.85); font-variant-numeric: tabular-nums; }
    .hero-dates { position: relative; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
    .hero-date { display: flex; flex-direction: column; gap: 3px; background: rgba(255,255,255,.14); padding: 8px 14px; border-radius: 10px; }
    .hero-date.reg { background: rgba(255,255,255,.22); }
    .hd-label { font-size: 10.5px; color: rgba(255,255,255,.82); }
    .hd-val { font-size: 13px; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums; }
    .hero-arrow { color: rgba(255,255,255,.7); font-size: 18px; }

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
    .v-suffix { font-size: 15px; font-weight: 700; color: var(--nb-text-muted); margin-inline-start: 2px; }
    /* بطاقة نسبة الإشغال */
    .metric-card.occ::before { background: var(--nb-primary-500); }
    .metric-card.occ.mid::before { background: var(--nb-warning); }
    .metric-card.occ.hot::before { background: var(--nb-danger); }
    .metric-card.occ .m-icon { background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .metric-card.occ.mid .m-icon { background: rgba(255,159,10,.14); color: var(--nb-warning); }
    .metric-card.occ.hot .m-icon { background: rgba(255,59,48,.12); color: var(--nb-danger); }
    .metric-card.occ .m-body { flex: 1; }
    .occ-bar { height: 6px; background: var(--nb-surface-raised); border-radius: 3px; overflow: hidden; margin-top: 6px; }
    .occ-fill { display: block; height: 100%; background: var(--nb-primary-500); border-radius: 3px; transition: width .6s cubic-bezier(0.4,0,0.2,1); }
    .metric-card.occ.mid .occ-fill { background: var(--nb-warning); }
    .metric-card.occ.hot .occ-fill { background: var(--nb-danger); }
    .occ-note { font-size: 10.5px; color: var(--nb-text-muted); margin-top: 3px; font-variant-numeric: tabular-nums; }

    /* الطلاب والمقاعد */
    .seats-band { display: grid; grid-template-columns: minmax(240px, 0.9fr) 2fr; gap: 14px; margin-bottom: 14px; }
    @media (max-width: 760px) { .seats-band { grid-template-columns: 1fr; } }
    .occ-card { display: flex; align-items: center; gap: 16px; cursor: pointer; background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 16px 18px; transition: transform .2s, box-shadow .2s; }
    .occ-card:hover { transform: translateY(-2px); box-shadow: 0 10px 22px rgba(0,0,0,.08); }
    .occ-ring { width: 84px; height: 84px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: background .6s ease; }
    .occ-inner { width: 64px; height: 64px; border-radius: 50%; background: var(--nb-surface); display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .occ-pct { font-size: 19px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .occ-cap { font-size: 10px; color: var(--nb-text-muted); }
    .occ-text { display: flex; flex-direction: column; gap: 3px; }
    .occ-title { font-size: 13px; font-weight: 700; color: var(--nb-text); }
    .occ-sub { font-size: 11.5px; color: var(--nb-text-muted); font-variant-numeric: tabular-nums; }
    .seat-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 14px; }

    /* mini cards */
    .mini-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin-bottom: 16px; }
    .mini-card { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
    .mc-label { font-size: 12px; color: var(--nb-text-muted); }
    .mc-value { font-size: 22px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .mc-suffix { font-size: 12px; font-weight: 500; color: var(--nb-text-muted); }
    .gender-bar { display: flex; height: 10px; border-radius: 5px; overflow: hidden; gap: 2px; }
    .gb { display: block; } .gb.male { background: #007aff; } .gb.female { background: #af52de; } .gb.mixed { background: var(--nb-success); }
    .gender-legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 11px; color: var(--nb-text-secondary); }
    .gender-legend i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-inline-end: 5px; }
    .lg.male { background: #007aff; } .lg.female { background: #af52de; } .lg.mixed { background: var(--nb-success); }
    .cap-line { display: flex; justify-content: space-between; align-items: center; gap: 8px; border-top: 1px dashed var(--nb-border-soft); padding-top: 8px; font-size: 11px; color: var(--nb-text-muted); }

    /* شريط أفقي لتوزيع الطلاب على المراحل */
    .chart-card { gap: 10px; }
    .chart-empty { font-size: 12.5px; color: var(--nb-text-muted); padding: 8px 0; }
    .hbars { display: flex; flex-direction: column; gap: 8px; }
    .hbar-row { display: grid; grid-template-columns: 90px 1fr 34px; align-items: center; gap: 8px; }
    .hbar-name { font-size: 12px; color: var(--nb-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .hbar-track { height: 10px; background: var(--nb-surface-raised); border-radius: 5px; overflow: hidden; }
    .hbar-fill { display: block; height: 100%; background: linear-gradient(90deg, var(--nb-primary-600), var(--nb-primary-400)); border-radius: 5px; transition: width .6s cubic-bezier(0.4,0,0.2,1); }
    .hbar-val { font-size: 12px; font-weight: 700; color: var(--nb-text); text-align: end; }

    .main-sections { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; align-items: start; }
    @media (max-width: 860px) { .main-sections { grid-template-columns: 1fr; } }
    .side-col { display: flex; flex-direction: column; gap: 16px; }

    .stages-list { display: flex; flex-direction: column; gap: 16px; }
    .stage-block { }
    .sb-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
    .sb-head h3 { font-size: 13.5px; font-weight: 700; color: var(--nb-text); margin: 0; }
    .sb-age { font-size: 11px; color: var(--nb-text-muted); background: var(--nb-surface-raised); padding: 2px 8px; border-radius: 6px; }
    .sb-counts { margin-inline-start: auto; font-size: 11.5px; color: var(--nb-text-muted); font-variant-numeric: tabular-nums; }
    .dist-bar { height: 6px; background: var(--nb-surface-raised); border-radius: 3px; overflow: hidden; margin-bottom: 10px; }
    .dist-fill { display: block; height: 100%; background: linear-gradient(90deg, var(--nb-primary-500), var(--nb-primary-400)); border-radius: 3px; transition: width .6s cubic-bezier(0.4,0,0.2,1); }
    .grades-tags { display: flex; flex-wrap: wrap; gap: 8px; }
    .grade-tag { display: inline-flex; align-items: center; gap: 5px; background: var(--nb-surface-raised); color: var(--nb-text-secondary);
      border: 1px solid var(--nb-border); padding: 4px 6px 4px 12px; border-radius: 999px; font-size: 12px; }
    .gt-badge { border-radius: 999px; height: 18px; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; padding: 0 7px; }
    .gt-badge.sections { background: rgba(0,122,255,.14); color: var(--nb-info); }
    .gt-badge.students { background: var(--nb-primary-500); color: #fff; }

    .list { display: flex; flex-direction: column; }
    .list-item { padding: 10px 16px; border-top: 1px solid var(--nb-border-soft); }
    .list-item:first-child { border-top: none; }
    .list-item.current { background: var(--nb-primary-50); }
    .item-header { display: flex; justify-content: space-between; align-items: center; color: var(--nb-text); font-size: 13px; }
    .item-dates { font-size: 11px; color: var(--nb-text-muted); margin-top: 4px; font-variant-numeric: tabular-nums; }
    .empty-list { padding: 20px 16px; text-align: center; font-size: 12.5px; color: var(--nb-text-muted); }
  `]
})
export class AcademicDashboardComponent implements OnInit {
  private svc = inject(AcademicsService);
  private router = inject(Router);

  readonly years = signal<any[]>([]);
  readonly terms = signal<any[]>([]);
  readonly stages = signal<any[]>([]);
  readonly grades = signal<any[]>([]);
  readonly sections = signal<any[]>([]);
  readonly subjects = signal<any[]>([]);
  readonly stats = signal<any>(null);
  readonly loading = signal(false);

  readonly currentYear = computed(() => this.years().find((y) => y.current_flag) ?? null);
  readonly currentTerms = computed(() => {
    const cy = this.currentYear();
    return cy ? this.terms().filter((t) => t.academic_year === cy.id) : [];
  });
  readonly totalCapacity = computed(() => this.grades().reduce((n, g) => n + (g.max_capacity || 0), 0));
  readonly avgSectionsPerGrade = computed(() => {
    const g = this.grades().length;
    return g ? (this.sections().length / g).toFixed(1) : '0';
  });

  // ---------- مؤشرات الطلاب والمقاعد (من نقطة dashboard-stats) ----------
  readonly studentsTotal = computed(() => this.stats()?.students?.total ?? 0);
  readonly studentsAssigned = computed(() => this.stats()?.students?.assigned ?? 0);
  readonly studentsUnassigned = computed(() => this.stats()?.students?.unassigned ?? 0);
  readonly seatCapacity = computed(() => this.stats()?.seats?.capacity ?? this.totalCapacity());
  readonly seatOccupied = computed(() => this.stats()?.seats?.occupied ?? 0);
  readonly seatAvailable = computed(() => this.stats()?.seats?.available ?? this.seatCapacity());
  readonly occupancyRate = computed(() => this.stats()?.seats?.occupancy_rate ?? 0);

  studentsInStage(stageId: string): number { return this.stats()?.per_stage?.[stageId] ?? 0; }
  studentsInGrade(gradeId: string): number { return this.stats()?.per_grade?.[gradeId] ?? 0; }
  readonly maxStageStudents = computed(() => Math.max(1, ...this.stages().map((s) => this.studentsInStage(s.id))));

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    forkJoin({
      years: this.svc.getAcademicYears(),
      terms: this.svc.getTerms(),
      stages: this.svc.getStages(),
      grades: this.svc.getGrades(),
      sections: this.svc.getSections(),
      subjects: this.svc.getSubjects(),
      stats: this.svc.getDashboardStats(),
    }).subscribe({
      next: (r) => {
        this.years.set(pickList(r.years));
        this.terms.set(pickList(r.terms));
        this.stages.set(pickList(r.stages));
        this.grades.set(pickList(r.grades));
        this.sections.set(pickList(r.sections));
        this.subjects.set(pickList(r.subjects));
        this.stats.set((r.stats as any)?.data ?? null);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  go(path: string): void { this.router.navigateByUrl(path); }

  gradesForStage(stageId: string): any[] { return this.grades().filter((g) => g.stage === stageId); }
  sectionsOf(gradeId: string): number { return this.sections().filter((s) => s.grade === gradeId).length; }
  sectionsForStage(stageId: string): number {
    const gradeIds = new Set(this.gradesForStage(stageId).map((g) => g.id));
    return this.sections().filter((s) => gradeIds.has(s.grade)).length;
  }
  stageBarPct(stageId: string): number {
    const max = Math.max(1, ...this.stages().map((s) => this.gradesForStage(s.id).length));
    return Math.round((this.gradesForStage(stageId).length / max) * 100);
  }
  genderCount(g: string): number { return this.sections().filter((s) => s.gender === g).length; }

  /** خلفية حلقة الإشغال (conic-gradient) بحسب النسبة. */
  occRingBg(): string {
    const pct = Math.min(100, Number(this.occupancyRate()) || 0);
    const color = pct >= 90 ? 'var(--nb-danger)' : pct >= 70 ? 'var(--nb-warning)' : 'var(--nb-primary-500)';
    return `conic-gradient(${color} ${pct * 3.6}deg, var(--nb-surface-raised) ${pct * 3.6}deg)`;
  }

  termStatus(s: string): string { return ({ upcoming: 'قادم', active: 'نشط', completed: 'مكتمل' } as any)[s] || s; }
  termBadge(s: string): string { return ({ active: 'nb-badge-success', upcoming: 'nb-badge-info', completed: 'nb-badge-neutral' } as any)[s] || 'nb-badge-neutral'; }
  yearStatus(s: string): string { return ({ draft: 'مسودة', active: 'نشط', completed: 'مكتمل', archived: 'مؤرشف' } as any)[s] || s; }
  yearBadge(s: string): string { return ({ active: 'nb-badge-success', draft: 'nb-badge-neutral', completed: 'nb-badge-info', archived: 'nb-badge-neutral' } as any)[s] || 'nb-badge-neutral'; }
}
