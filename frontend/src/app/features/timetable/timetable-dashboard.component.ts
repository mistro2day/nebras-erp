import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TimetableService } from './timetable.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbLoadingComponent } from '../../shared/nebras/nb-loading.component';

/** تطبيع استجابة القوائم إلى مصفوفة. */
function pickList<T = any>(res: any): T[] {
  const d = res?.data ?? res;
  if (Array.isArray(d)) return d as T[];
  if (Array.isArray(d?.results)) return d.results as T[];
  if (Array.isArray(d?.data)) return d.data as T[];
  return [];
}

interface WorkflowLink { title: string; desc: string; path: string; mark: string; }

/**
 * إدارة الجدول الأكاديمي والجدولة الذكية — لغة تصميم Nebras OS.
 * لوحة شاملة: مؤشرات، لوح أسبوعي تفاعلي، عبء المعلمين، توزيع المواد، والجدولة الذكية بكشف التعارض.
 * مرتبطة بموديولات: timetable, faculty (المعلمون), academics (المواد/الشعب).
 */
@Component({
  selector: 'app-timetable-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, NbPageHeaderComponent, NbPanelComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="إدارة الجدول الأكاديمي والجدولة الذكية"
        subtitle="توزيع حصص المعلمين على الفصول والمواد أسبوعياً مع كشف التعارض والتحقق من العبء التدريسي.">
        <button class="nb-btn-secondary" (click)="load()">تحديث</button>
        <a class="nb-btn-primary" routerLink="/teachers">شؤون المعلمين</a>
      </nb-page-header>

      @if (loading()) {
        <nb-loading message="جارٍ تحميل بيانات الجداول والموارد…"></nb-loading>
      } @else {
        <!-- Hero: الجدول النشط -->
        <div class="hero">
          <div class="hero-glow"></div>
          <div class="hero-main">
            <span class="hero-badge">الجدول النشط</span>
            <h2 class="hero-title">{{ activeTimetable()?.name || 'لا يوجد جدول مُفعّل' }}</h2>
            <span class="hero-line">
              @if (activeTimetable(); as tt) {
                {{ tt.academic_year }} · {{ tt.term }} · {{ entriesForTimetable(tt.id).length }} حصة أسبوعية
              } @else { أنشئ جدولاً من موديول الجداول لبدء الجدولة. }
            </span>
          </div>
          <div class="hero-dates">
            <div class="hero-ring" [style.background]="conflictRingBg()">
              <div class="hero-ring-in"><span class="hr-pct">{{ totalConflicts() }}</span><span class="hr-lbl">تعارض</span></div>
            </div>
            <div class="hero-date"><span class="hd-label">المعلمون</span><span class="hd-val">{{ faculty().length }}</span></div>
            <div class="hero-date"><span class="hd-label">القاعات المشغولة</span><span class="hd-val">{{ roomsUsed() }}</span></div>
          </div>
        </div>

        <!-- مؤشرات رئيسية -->
        <div class="stats-grid">
          <div class="metric-card total">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></span>
            <span class="m-body"><span class="label">الجداول الأكاديمية</span><span class="value">{{ timetables().length }}</span></span>
          </div>
          <div class="metric-card info">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4M16 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg></span>
            <span class="m-body"><span class="label">الحصص الأسبوعية الموزّعة</span><span class="value info">{{ entries().length }}</span></span>
          </div>
          <div class="metric-card success">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
            <span class="m-body"><span class="label">المعلمون النشطون</span><span class="value success">{{ activeTeachers() }}</span></span>
          </div>
          <div class="metric-card occ" [class.hot]="avgTeacherLoad() >= 90" [class.mid]="avgTeacherLoad() >= 70 && avgTeacherLoad() < 90">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg></span>
            <span class="m-body">
              <span class="label">متوسط العبء التدريسي</span>
              <span class="value">{{ avgTeacherLoad() }}<span class="v-suffix">%</span></span>
              <span class="occ-bar"><span class="occ-fill" [style.width.%]="avgTeacherLoad()"></span></span>
            </span>
          </div>
          <div class="metric-card purple">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></span>
            <span class="m-body"><span class="label">خطط توزيع المواد</span><span class="value purple">{{ distributionsDone() }}<span class="v-sub"> / {{ distributions().length }}</span></span></span>
          </div>
          <div class="metric-card" [class.warn]="totalConflicts() > 0" [class.neutral]="totalConflicts() === 0">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg></span>
            <span class="m-body"><span class="label">التعارضات المرصودة</span><span class="value" [class.warn]="totalConflicts() > 0">{{ totalConflicts() }}</span></span>
          </div>
        </div>

        <!-- مسار العمل -->
        <div class="wf-strip">
          @for (link of workflow; track link.path) {
            <a class="wf-chip" [routerLink]="link.path" [title]="link.desc">
              <span class="wf-mark">{{ link.mark }}</span>
              <span class="wf-t">{{ link.title }}</span>
            </a>
          }
        </div>

        <!-- اللوح الأسبوعي التفاعلي -->
        <nb-panel title="اللوح الأسبوعي للحصص">
          <div class="board-toolbar">
            <div class="fld">
              <label>الجدول</label>
              <select [ngModel]="selectedTimetableId()" (ngModelChange)="selectedTimetableId.set($event)">
                @for (tt of timetables(); track tt.id) { <option [value]="tt.id">{{ tt.name }}</option> }
                @if (!timetables().length) { <option value="">لا توجد جداول</option> }
              </select>
            </div>
            <div class="fld">
              <label>الشعبة / الفصل</label>
              <select [ngModel]="selectedSectionId()" (ngModelChange)="selectedSectionId.set($event)">
                @for (s of sections(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }
                @if (!sections().length) { <option value="">لا توجد شعب</option> }
              </select>
            </div>
            <button class="nb-btn-primary" (click)="openAdd()" [disabled]="!selectedTimetableId() || !selectedSectionId()">+ إضافة حصة ذكية</button>
          </div>

          <div class="board-scroll">
            <div class="board" [style.grid-template-columns]="'96px repeat(' + days.length + ', minmax(120px, 1fr))'">
              <!-- رأس الأيام -->
              <div class="b-corner">الحصة</div>
              @for (d of days; track d.idx) { <div class="b-day">{{ d.label }}</div> }

              <!-- صفوف الحصص -->
              @for (p of teachingPeriods(); track p.id) {
                <div class="b-period">
                  <strong>{{ p.period_number }}</strong>
                  <span class="b-time mono">{{ fmt(p.start_time) }}</span>
                </div>
                @for (d of days; track d.idx) {
                  <div class="b-cell" [class.filled]="!!cellEntry(d.idx, p.id)">
                    @if (cellEntry(d.idx, p.id); as e) {
                      <div class="lesson" [style.--tone]="toneFor(e.subject_id)">
                        <span class="l-subject">{{ subjectName(e.subject_id) }}</span>
                        <span class="l-teacher">{{ teacherName(e.teacher) }}</span>
                        <button class="l-del" title="حذف الحصة" (click)="removeEntry(e)">×</button>
                      </div>
                    } @else {
                      <button class="cell-add" (click)="openAdd(d.idx, p.id)" title="إضافة حصة">+</button>
                    }
                  </div>
                }
              }
              @if (!teachingPeriods().length) {
                <div class="board-empty">لا توجد حصص زمنية مُعرّفة. عرّف الحصص من إعدادات الجداول أولاً.</div>
              }
            </div>
          </div>
        </nb-panel>

        <!-- صف تحليلي: عبء المعلمين + توزيع المواد -->
        <div class="bento">
          <nb-panel title="العبء التدريسي للمعلمين">
            @if (!loadRows().length) {
              <p class="hint">لا توجد بيانات عبء تدريسي بعد.</p>
            } @else {
              <div class="load-list">
                @for (r of loadRows(); track r.id) {
                  <div class="load-row">
                    <span class="load-name" [title]="r.name">{{ r.name }}</span>
                    <span class="load-track">
                      <span class="load-fill" [class.hot]="r.pct >= 90" [class.mid]="r.pct >= 70 && r.pct < 90" [style.width.%]="r.pct"></span>
                    </span>
                    <span class="load-val mono">{{ r.assigned }}/{{ r.max }}</span>
                  </div>
                }
              </div>
            }
          </nb-panel>

          <nb-panel title="توزيع المواد على الشعب">
            @if (!distributions().length) {
              <p class="hint">لا توجد خطط توزيع مواد بعد.</p>
            } @else {
              <div class="dist-list">
                @for (d of distributions(); track d.id) {
                  <div class="dist-row">
                    <span class="dist-name">{{ subjectName(d.subject_id) }}</span>
                    <span class="dist-track"><span class="dist-fill" [style.width.%]="distPct(d)"></span></span>
                    <span class="dist-val mono">{{ d.distributed_periods }}/{{ d.total_required_periods }}</span>
                  </div>
                }
              </div>
            }
          </nb-panel>
        </div>
      }

      <!-- نافذة الإضافة الذكية -->
      @if (addOpen()) {
        <div class="modal-scrim" (click)="closeAdd()">
          <div class="modal" dir="rtl" (click)="$event.stopPropagation()">
            <div class="modal-head">
              <h3>إضافة حصة ذكية</h3>
              <button class="modal-x" (click)="closeAdd()">×</button>
            </div>
            <div class="modal-body">
              <div class="m-grid">
                <div class="fld"><label>اليوم</label>
                  <select [(ngModel)]="form.day_of_week">
                    @for (d of days; track d.idx) { <option [value]="d.idx">{{ d.label }}</option> }
                  </select>
                </div>
                <div class="fld"><label>الحصة</label>
                  <select [(ngModel)]="form.period_id">
                    @for (p of teachingPeriods(); track p.id) { <option [value]="p.id">الحصة {{ p.period_number }} · {{ fmt(p.start_time) }}</option> }
                  </select>
                </div>
                <div class="fld"><label>المعلم</label>
                  <select [(ngModel)]="form.teacher_id">
                    <option value="">— اختر المعلم —</option>
                    @for (t of faculty(); track t.id) { <option [value]="t.id">{{ t.full_name_ar }}</option> }
                  </select>
                </div>
                <div class="fld"><label>المادة</label>
                  <select [(ngModel)]="form.subject_id">
                    <option value="">— اختر المادة —</option>
                    @for (s of subjects(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }
                  </select>
                </div>
                <div class="fld"><label>معرّف القاعة (اختياري)</label>
                  <input [(ngModel)]="form.room_id" placeholder="اتركه فارغاً لقاعة افتراضية" />
                </div>
              </div>

              @if (conflicts().length) {
                <div class="conflicts" role="alert">
                  <strong>تعذّر الحجز — تعارضات مرصودة:</strong>
                  <ul>@for (c of conflicts(); track $index) { <li>{{ c.description || c.conflict_type || 'تعارض في الموارد' }}</li> }</ul>
                </div>
              }
              @if (addError()) { <div class="conflicts" role="alert">{{ addError() }}</div> }
            </div>
            <div class="modal-foot">
              <button class="nb-btn-secondary" (click)="closeAdd()">إلغاء</button>
              <button class="nb-btn-primary" (click)="submitAdd()" [disabled]="submitting() || !form.teacher_id || !form.subject_id || !form.period_id">
                {{ submitting() ? 'جارٍ التحقق…' : 'تحقّق واحجز الحصة ✓' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .hint { font-size: 13px; color: var(--nb-text-muted); margin: 0; }
    .mono { font-variant-numeric: tabular-nums; }

    /* Hero */
    .hero { position: relative; overflow: hidden; background: linear-gradient(135deg, var(--nb-primary-600), var(--nb-primary-500));
      border-radius: var(--nb-radius-card); padding: 20px 22px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between;
      gap: 20px; flex-wrap: wrap; box-shadow: 0 8px 24px rgba(0,0,0,.10); }
    .hero-glow { position: absolute; inset-inline-start: -60px; top: -60px; width: 200px; height: 200px; background: rgba(255,255,255,.14); border-radius: 50%; filter: blur(8px); }
    .hero-main { position: relative; display: flex; flex-direction: column; gap: 4px; color: #fff; }
    .hero-badge { font-size: 11px; font-weight: 700; background: rgba(255,255,255,.22); padding: 3px 10px; border-radius: 999px; width: fit-content; }
    .hero-title { margin: 4px 0 0; font-size: 24px; font-weight: 800; color: #fff; }
    .hero-line { font-size: 12.5px; color: rgba(255,255,255,.9); font-variant-numeric: tabular-nums; }
    .hero-dates { position: relative; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
    .hero-ring { width: 76px; height: 76px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .hero-ring-in { width: 58px; height: 58px; border-radius: 50%; background: var(--nb-primary-600); display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .hr-pct { font-size: 18px; font-weight: 800; color: #fff; font-variant-numeric: tabular-nums; }
    .hr-lbl { font-size: 10px; color: rgba(255,255,255,.8); }
    .hero-date { display: flex; flex-direction: column; gap: 3px; background: rgba(255,255,255,.14); padding: 8px 14px; border-radius: 10px; }
    .hd-label { font-size: 10.5px; color: rgba(255,255,255,.82); }
    .hd-val { font-size: 15px; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums; }

    /* KPI cards */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 14px; }
    .metric-card { position: relative; overflow: hidden; background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 16px 18px; display: flex; align-items: center; gap: 14px; box-shadow: 0 1px 3px rgba(0,0,0,.04);
      transition: transform .2s cubic-bezier(0.4,0,0.2,1), box-shadow .2s; }
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
    .m-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
    .metric-card .label { font-size: 12.5px; color: var(--nb-text-muted); font-weight: 700; }
    .metric-card .value { font-size: 28px; font-weight: 800; line-height: 1.1; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .metric-card .value.info { color: var(--nb-info); } .metric-card .value.success { color: var(--nb-success); }
    .metric-card .value.purple { color: #7d26cd; } .metric-card .value.warn { color: var(--nb-warning); }
    .v-suffix { font-size: 15px; font-weight: 700; color: var(--nb-text-muted); margin-inline-start: 2px; }
    .v-sub { font-size: 15px; font-weight: 700; color: var(--nb-text-muted); }
    .metric-card.occ::before { background: var(--nb-primary-500); }
    .metric-card.occ.mid::before { background: var(--nb-warning); } .metric-card.occ.hot::before { background: var(--nb-danger); }
    .metric-card.occ .m-icon { background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .occ-bar { height: 6px; background: var(--nb-surface-raised); border-radius: 3px; overflow: hidden; margin-top: 6px; }
    .occ-fill { display: block; height: 100%; background: var(--nb-primary-500); border-radius: 3px; transition: width .6s cubic-bezier(0.4,0,0.2,1); }
    .metric-card.occ.mid .occ-fill { background: var(--nb-warning); } .metric-card.occ.hot .occ-fill { background: var(--nb-danger); }

    /* Workflow chips */
    .wf-strip { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
    .wf-chip { display: inline-flex; align-items: center; gap: 8px; background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: 999px; padding: 8px 14px 8px 10px; text-decoration: none; transition: transform .15s, box-shadow .15s, border-color .15s; }
    .wf-chip:hover { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(0,0,0,.07); border-color: var(--nb-primary-400); }
    .wf-mark { width: 26px; height: 26px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .wf-t { font-size: 13px; font-weight: 700; color: var(--nb-text); }

    /* Board */
    .board-toolbar { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; padding: 14px 16px; border-bottom: 1px solid var(--nb-border-soft); }
    .fld { display: flex; flex-direction: column; gap: 5px; }
    .fld label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
    .fld select, .fld input { height: 36px; min-width: 180px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); background: var(--nb-surface); outline: none; }
    .board-toolbar .nb-btn-primary { height: 36px; }
    .board-scroll { overflow-x: auto; padding: 14px 16px; }
    .board { display: grid; gap: 6px; min-width: 720px; }
    .b-corner { font-size: 11px; font-weight: 700; color: var(--nb-text-muted); display: flex; align-items: center; justify-content: center; }
    .b-day { background: var(--nb-surface-raised); border-radius: 8px; padding: 8px; text-align: center; font-size: 12.5px; font-weight: 700; color: var(--nb-text); }
    .b-period { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; background: var(--nb-surface-raised); border-radius: 8px; padding: 6px; }
    .b-period strong { font-size: 14px; color: var(--nb-text); }
    .b-time { font-size: 10px; color: var(--nb-text-muted); }
    .b-cell { min-height: 58px; border: 1px dashed var(--nb-border); border-radius: 8px; display: flex; }
    .b-cell.filled { border-style: solid; border-color: transparent; }
    .cell-add { flex: 1; border: none; background: transparent; color: var(--nb-text-faint); font-size: 20px; cursor: pointer; border-radius: 8px; transition: background .15s, color .15s; }
    .cell-add:hover { background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .lesson { position: relative; flex: 1; border-radius: 8px; padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; justify-content: center;
      background: color-mix(in srgb, var(--tone, var(--nb-primary-500)) 12%, var(--nb-surface)); border-inline-start: 3px solid var(--tone, var(--nb-primary-500)); }
    .l-subject { font-size: 12.5px; font-weight: 700; color: var(--nb-text); }
    .l-teacher { font-size: 11px; color: var(--nb-text-muted); }
    .l-del { position: absolute; top: 4px; inset-inline-end: 4px; width: 18px; height: 18px; border: none; border-radius: 50%; background: rgba(0,0,0,.06); color: var(--nb-text-muted); cursor: pointer; font-size: 13px; line-height: 1; display: none; }
    .lesson:hover .l-del { display: block; }
    .board-empty { grid-column: 1 / -1; text-align: center; padding: 24px; font-size: 13px; color: var(--nb-text-muted); }

    /* Bento */
    .bento { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; align-items: start; }
    @media (max-width: 860px) { .bento { grid-template-columns: 1fr; } }
    .load-list, .dist-list { display: flex; flex-direction: column; gap: 10px; }
    .load-row, .dist-row { display: grid; grid-template-columns: 120px 1fr 52px; align-items: center; gap: 10px; }
    .load-name, .dist-name { font-size: 12.5px; color: var(--nb-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .load-track, .dist-track { height: 10px; background: var(--nb-surface-raised); border-radius: 5px; overflow: hidden; }
    .load-fill { display: block; height: 100%; background: var(--nb-primary-500); border-radius: 5px; transition: width .6s cubic-bezier(0.4,0,0.2,1); }
    .load-fill.mid { background: var(--nb-warning); } .load-fill.hot { background: var(--nb-danger); }
    .dist-fill { display: block; height: 100%; background: linear-gradient(90deg, var(--nb-success), #5cd679); border-radius: 5px; transition: width .6s; }
    .load-val, .dist-val { font-size: 12px; font-weight: 700; color: var(--nb-text); text-align: end; }

    /* Modal */
    .modal-scrim { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
    .modal { width: min(560px, 100%); background: var(--nb-surface); border-radius: var(--nb-radius-card); box-shadow: 0 20px 50px rgba(0,0,0,.3); overflow: hidden; animation: mIn .2s ease-out; }
    @keyframes mIn { from { opacity: 0; transform: scale(.96) translateY(8px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .modal { animation: none; } }
    .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--nb-border-soft); }
    .modal-head h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--nb-text); }
    .modal-x { border: none; background: transparent; font-size: 22px; color: var(--nb-text-muted); cursor: pointer; line-height: 1; }
    .modal-body { padding: 20px; }
    .m-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .m-grid .fld select, .m-grid .fld input { min-width: 0; width: 100%; }
    .conflicts { margin-top: 14px; background: rgba(255,59,48,.08); border: 1px solid rgba(255,59,48,.25); border-radius: var(--nb-radius); padding: 10px 12px; font-size: 12.5px; color: var(--nb-danger); }
    .conflicts ul { margin: 6px 0 0; padding-inline-start: 18px; }
    .modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--nb-border-soft); }
  `]
})
export class TimetableDashboardComponent implements OnInit {
  private svc = inject(TimetableService);

  readonly loading = signal(true);
  readonly timetables = signal<any[]>([]);
  readonly entries = signal<any[]>([]);
  readonly periods = signal<any[]>([]);
  readonly loads = signal<any[]>([]);
  readonly distributions = signal<any[]>([]);
  readonly faculty = signal<any[]>([]);
  readonly subjects = signal<any[]>([]);
  readonly sections = signal<any[]>([]);

  readonly selectedTimetableId = signal<string>('');
  readonly selectedSectionId = signal<string>('');

  // نافذة الإضافة
  readonly addOpen = signal(false);
  readonly submitting = signal(false);
  readonly conflicts = signal<any[]>([]);
  readonly addError = signal<string>('');
  form: any = { day_of_week: 6, period_id: '', teacher_id: '', subject_id: '', room_id: '' };

  // أيام الأسبوع الدراسي (0=الاثنين … 6=الأحد حسب الخادم) — نعرض الأحد→الخميس
  readonly days = [
    { idx: 6, label: 'الأحد' },
    { idx: 0, label: 'الاثنين' },
    { idx: 1, label: 'الثلاثاء' },
    { idx: 2, label: 'الأربعاء' },
    { idx: 3, label: 'الخميس' },
  ];

  readonly workflow: WorkflowLink[] = [
    { title: 'شؤون المعلمين', desc: 'ملفات المعلمين والعبء التدريسي', path: '/teachers', mark: 'م' },
    { title: 'المواد الدراسية', desc: 'إدارة المواد المرتبطة بالحصص', path: '/academics/subjects', mark: 'مو' },
    { title: 'الشعب الدراسية', desc: 'الفصول والشعب', path: '/academics/sections', mark: 'ش' },
    { title: 'الجدولة', desc: 'محرك الجدولة وكشف التعارض', path: '/scheduling', mark: 'ج' },
    { title: 'الامتحانات', desc: 'جداول الاختبارات', path: '/examinations', mark: 'ا' },
  ];

  // ---------- مشتقات ----------
  readonly activeTimetable = computed(() =>
    this.timetables().find((t) => t.status === 'published') ?? this.timetables().find((t) => t.is_active) ?? this.timetables()[0] ?? null
  );
  readonly teachingPeriods = computed(() => this.periods().filter((p) => !p.is_break).sort((a, b) => a.period_number - b.period_number));
  readonly activeTeachers = computed(() => this.faculty().filter((t) => t.status === 'active' || t.status === 'approved').length || this.faculty().length);
  readonly roomsUsed = computed(() => new Set(this.entries().map((e) => e.room_id).filter(Boolean)).size);
  readonly distributionsDone = computed(() => this.distributions().filter((d) => (d.distributed_periods ?? 0) >= (d.total_required_periods ?? 0) && d.total_required_periods > 0).length);

  readonly loadRows = computed(() =>
    this.loads().map((l) => {
      const assigned = l.assigned_weekly_hours ?? 0;
      const max = l.max_weekly_hours || 24;
      return { id: l.id, name: this.teacherName(l.teacher), assigned, max, pct: Math.min(100, Math.round((assigned / max) * 100)) };
    }).sort((a, b) => b.pct - a.pct)
  );
  readonly avgTeacherLoad = computed(() => {
    const rows = this.loadRows();
    if (!rows.length) return 0;
    return Math.round(rows.reduce((n, r) => n + r.pct, 0) / rows.length);
  });
  readonly totalConflicts = computed(() => this.detectGridConflicts());

  // خرائط بحث سريعة
  private subjectMap = computed(() => new Map(this.subjects().map((s) => [String(s.id), s])));
  private teacherMap = computed(() => new Map(this.faculty().map((t) => [String(t.id), t])));

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    forkJoin({
      timetables: this.svc.getTimetables(),
      entries: this.svc.getEntries(),
      periods: this.svc.getPeriods(),
      loads: this.svc.getLoads(),
      distributions: this.svc.getDistributions(),
      faculty: this.svc.getFacultyMembers(),
      subjects: this.svc.getSubjects(),
      sections: this.svc.getSections(),
    }).subscribe({
      next: (r) => {
        this.timetables.set(pickList(r.timetables));
        this.entries.set(pickList(r.entries));
        this.periods.set(pickList(r.periods));
        this.loads.set(pickList(r.loads));
        this.distributions.set(pickList(r.distributions));
        this.faculty.set(pickList(r.faculty));
        this.subjects.set(pickList(r.subjects));
        this.sections.set(pickList(r.sections));
        if (!this.selectedTimetableId()) this.selectedTimetableId.set(this.activeTimetable()?.id ?? '');
        if (!this.selectedSectionId()) this.selectedSectionId.set(this.sections()[0]?.id ?? '');
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // ---------- عرض اللوح ----------
  entriesForTimetable(id: string): any[] { return this.entries().filter((e) => String(e.timetable) === String(id)); }
  cellEntry(dayIdx: number, periodId: string): any | null {
    const tt = this.selectedTimetableId(); const sec = this.selectedSectionId();
    return this.entries().find((e) =>
      String(e.timetable) === String(tt) &&
      String(e.grade_section_id) === String(sec) &&
      e.day_of_week === dayIdx &&
      String(e.period) === String(periodId)
    ) ?? null;
  }

  subjectName(id: string): string { return this.subjectMap().get(String(id))?.name ?? 'مادة'; }
  teacherName(id: string): string { const t = this.teacherMap().get(String(id)); return t?.full_name_ar ?? t?.full_name_en ?? 'معلم'; }
  distPct(d: any): number { const req = d.total_required_periods || 0; return req ? Math.min(100, Math.round((d.distributed_periods / req) * 100)) : 0; }

  private palette = ['#3F51B5', '#007aff', '#34c759', '#af52de', '#ff9f0a', '#ff375f', '#00c7be', '#5856d6'];
  toneFor(subjectId: string): string {
    const ids = this.subjects().map((s) => String(s.id));
    const i = Math.max(0, ids.indexOf(String(subjectId)));
    return this.palette[i % this.palette.length];
  }

  fmt(t: string): string { return t ? String(t).slice(0, 5) : ''; }

  /** كشف تعارضات بسيطة داخل اللوح: نفس المعلم أو نفس القاعة في نفس اليوم/الحصة. */
  private detectGridConflicts(): number {
    const seenTeacher = new Set<string>(); const seenRoom = new Set<string>(); let conflicts = 0;
    for (const e of this.entries()) {
      const slot = `${e.timetable}|${e.day_of_week}|${e.period}`;
      const tk = `${slot}|t:${e.teacher}`;
      if (seenTeacher.has(tk)) conflicts++; else seenTeacher.add(tk);
      if (e.room_id) { const rk = `${slot}|r:${e.room_id}`; if (seenRoom.has(rk)) conflicts++; else seenRoom.add(rk); }
    }
    return conflicts;
  }

  conflictRingBg(): string {
    const c = this.totalConflicts();
    const color = c === 0 ? '#34c759' : c <= 3 ? '#ff9f0a' : '#ff3b30';
    const pct = c === 0 ? 100 : Math.min(100, c * 20);
    return `conic-gradient(${color} ${pct * 3.6}deg, rgba(255,255,255,.25) ${pct * 3.6}deg)`;
  }

  // ---------- الإضافة الذكية ----------
  openAdd(dayIdx?: number, periodId?: string): void {
    this.conflicts.set([]); this.addError.set('');
    this.form = {
      day_of_week: dayIdx ?? this.days[0].idx,
      period_id: periodId ?? (this.teachingPeriods()[0]?.id ?? ''),
      teacher_id: '', subject_id: '', room_id: '',
    };
    this.addOpen.set(true);
  }
  closeAdd(): void { this.addOpen.set(false); }

  submitAdd(): void {
    const tt = this.selectedTimetableId(); const sec = this.selectedSectionId();
    if (!tt || !sec) { this.addError.set('اختر الجدول والشعبة أولاً.'); return; }
    this.submitting.set(true); this.conflicts.set([]); this.addError.set('');

    const body = {
      timetable_id: tt,
      day_of_week: Number(this.form.day_of_week),
      period_id: this.form.period_id,
      teacher_id: this.form.teacher_id,
      subject_id: this.form.subject_id,
      room_id: this.form.room_id?.trim() || (crypto as any).randomUUID?.() || '00000000-0000-0000-0000-000000000000',
      grade_section_id: sec,
    };

    this.svc.validateEntry(body).subscribe({
      next: (res) => {
        this.submitting.set(false);
        const data = res?.data ?? {};
        if (data?.conflicts && data.conflicts.length) {
          this.conflicts.set(data.conflicts);
          return;
        }
        // نجح الحجز — أضف الحصة محلياً وأعد تحميل الأعباء
        if (data?.id) this.entries.update((list) => [...list, data]);
        this.closeAdd();
        this.svc.getLoads().subscribe((r) => this.loads.set(pickList(r)));
      },
      error: (err) => {
        this.submitting.set(false);
        this.addError.set(err?.error?.message || 'تعذّر حجز الحصة. تحقق من صحة البيانات وحاول مجدداً.');
      },
    });
  }

  removeEntry(e: any): void {
    if (!e?.id) return;
    this.svc.deleteEntry(e.id).subscribe(() => {
      this.entries.update((list) => list.filter((x) => x.id !== e.id));
      this.svc.getLoads().subscribe((r) => this.loads.set(pickList(r)));
    });
  }
}
