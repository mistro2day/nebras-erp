import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AcademicsService } from '../academics.service';
import { TimetableService } from '../../timetable/timetable.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { pickList } from '../shared/academics.shared';

const TRACK_LABEL: Record<string, string> = { scientific: 'علمي', literary: 'أدبي', '': 'مشترك' };
const DAYS = [
  { idx: 6, label: 'الأحد' }, { idx: 0, label: 'الاثنين' }, { idx: 1, label: 'الثلاثاء' },
  { idx: 2, label: 'الأربعاء' }, { idx: 3, label: 'الخميس' },
];

/**
 * المواد الدراسية — لغة تصميم Nebras OS.
 * عرض مجمّع (مرحلة → صف)، ودرج تفاصيل يربط كل مادة بجدولها ومعلميها واختباراتها.
 * مربوطة بـ academics (المواد/الصفوف/المراحل)، timetable (الحصص/المعلمون)، examinations (الاختبارات).
 */
@Component({
  selector: 'app-academic-subjects',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, MatDialogModule, NbPageHeaderComponent, NbPanelComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="المواد الدراسية"
        subtitle="خطة المواد موزّعة على المراحل والصفوف مع الحصص الأسبوعية والمسارات — اضغط أي مادة لعرض جدولها ومعلميها واختباراتها.">
        <button class="nb-btn-secondary" (click)="load()">تحديث</button>
        <button class="nb-btn-secondary" (click)="adding.set(!adding())">{{ adding() ? 'إغلاق' : '+ مادة' }}</button>
        @if (rows().length === 0 && !loading()) {
          <button class="nb-btn-primary" (click)="seed()" [disabled]="seeding()">{{ seeding() ? 'جارٍ الإدراج…' : 'إدراج المنهج الافتراضي' }}</button>
        }
      </nb-page-header>

      @if (seedMsg()) { <div class="banner success">{{ seedMsg() }}</div> }

      <!-- مؤشرات موجزة -->
      <div class="stats-grid">
        <div class="metric-card total">
          <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></span>
          <span class="m-body"><span class="label">إجمالي المواد</span><span class="value">{{ rows().length }}</span></span>
        </div>
        <div class="metric-card purple">
          <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></span>
          <span class="m-body"><span class="label">المراحل التعليمية</span><span class="value purple">{{ stages().length }}</span></span>
        </div>
        <div class="metric-card success">
          <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></span>
          <span class="m-body"><span class="label">الصفوف الدراسية</span><span class="value success">{{ grades().length }}</span></span>
        </div>
        <div class="metric-card info">
          <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/></svg></span>
          <span class="m-body"><span class="label">الحصص الأسبوعية</span><span class="value info">{{ totalWeekly() }}</span></span>
        </div>
      </div>

      @if (adding()) {
        <nb-panel title="مادة جديدة" style="margin-bottom:16px">
          <div class="add-form">
            <div class="fld req"><label>الصف</label>
              <select [(ngModel)]="f.grade">
                <option value="">— اختر الصف —</option>
                @for (g of grades(); track g.id) { <option [value]="g.id">{{ g.name }}</option> }
              </select>
            </div>
            <div class="fld req"><label>الاسم بالعربية</label><input [(ngModel)]="f.arabic_name" placeholder="مثال: الرياضيات" /></div>
            <div class="fld"><label>الاسم بالإنجليزية</label><input [(ngModel)]="f.english_name" placeholder="Mathematics" /></div>
            <div class="fld"><label>المسار</label>
              <select [(ngModel)]="f.track"><option value="">مشترك</option><option value="scientific">علمي</option><option value="literary">أدبي</option></select>
            </div>
            <div class="fld"><label>الحصص الأسبوعية</label><input type="number" min="0" [(ngModel)]="f.weekly_periods" /></div>
            <div class="fld"><label>الرمز (اختياري)</label><input [(ngModel)]="f.code" placeholder="يُولّد تلقائياً" /></div>
            <div class="form-actions"><button class="nb-btn-primary" (click)="save()" [disabled]="saving() || !valid()">{{ saving() ? 'جارٍ الحفظ…' : 'حفظ' }}</button></div>
          </div>
          @if (error()) { <p class="hint" style="color:var(--nb-danger)">{{ error() }}</p> }
        </nb-panel>
      }

      <!-- شريط الفلاتر -->
      <div class="toolbar">
        <div class="search"><input [(ngModel)]="q" (ngModelChange)="q$.set($event)" placeholder="بحث بالاسم أو الرمز…" /></div>
        <select class="filter" [ngModel]="stageFilter()" (ngModelChange)="stageFilter.set($event)">
          <option value="">كل المراحل</option>
          @for (s of stages(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }
        </select>
        <select class="filter" [ngModel]="trackFilter()" (ngModelChange)="trackFilter.set($event)">
          <option value="">كل المسارات</option><option value="scientific">علمي</option><option value="literary">أدبي</option>
        </select>
      </div>

      @if (loading()) {
        <nb-loading message="جارٍ تحميل المواد…"></nb-loading>
      } @else if (groupedStages().length === 0 && ungrouped().length === 0) {
        <nb-panel><p class="empty">لا توجد مواد مطابقة. استخدم «إدراج المنهج الافتراضي» لتهيئة الخطة الدراسية كاملة.</p></nb-panel>
      } @else {
        @for (st of groupedStages(); track st.id) {
          <section class="band">
            <div class="band-head">
              <h2>{{ st.name }}</h2>
              <span class="band-meta">{{ st.grades.length }} صف · {{ st.count }} مادة</span>
            </div>
            @for (g of st.grades; track g.id) {
              <nb-panel [title]="g.name" [flush]="true" style="margin-bottom:12px">
                <div class="tiles">
                  @for (s of g.subjects; track s.id) {
                    <button class="tile" [style.--tone]="toneFor(s.arabic_name)" (click)="openSubject(s)">
                      <span class="tile-name">{{ s.arabic_name }}</span>
                      <span class="tile-foot">
                        <span class="wk">{{ s.weekly_periods }} حصة/أسبوع</span>
                        @if (s.track) { <span class="trk" [class.sci]="s.track==='scientific'">{{ trackLabel(s.track) }}</span> }
                      </span>
                    </button>
                  }
                </div>
              </nb-panel>
            }
          </section>
        }

        @if (ungrouped().length) {
          <section class="band">
            <div class="band-head"><h2>مواد غير مرتبطة بصف</h2><span class="band-meta">{{ ungrouped().length }} مادة</span></div>
            <nb-panel [flush]="true">
              <div class="tiles" style="padding:12px 16px">
                @for (s of ungrouped(); track s.id) {
                  <button class="tile" [style.--tone]="toneFor(s.arabic_name)" (click)="openSubject(s)">
                    <span class="tile-name">{{ s.arabic_name }}</span>
                    <span class="tile-foot"><span class="wk">{{ s.weekly_periods }} حصة/أسبوع</span></span>
                  </button>
                }
              </div>
            </nb-panel>
          </section>
        }
      }
    </div>

    <!-- درج تفاصيل المادة -->
    @if (selected(); as s) {
      <div class="drawer-scrim" (click)="closeSubject()"></div>
      <aside class="drawer" dir="rtl" role="dialog" [attr.aria-label]="'تفاصيل مادة ' + s.arabic_name">
        <header class="dh">
          <button class="dh-x" (click)="closeSubject()" aria-label="إغلاق">×</button>
          <span class="dh-badge">مادة دراسية</span>
          <h2>{{ s.arabic_name }}</h2>
          <p class="dh-en">{{ s.english_name || '—' }}</p>
          <div class="dh-tags">
            @if (s.stage_name) { <span class="dtag">{{ s.stage_name }}</span> }
            @if (s.grade_name) { <span class="dtag">{{ s.grade_name }}</span> }
            @if (s.track) { <span class="dtag accent">{{ trackLabel(s.track) }}</span> }
            <span class="dtag ghost mono">{{ s.code }}</span>
          </div>
        </header>

        <nav class="dtabs">
          <button [class.on]="tab()==='overview'" (click)="tab.set('overview')">نظرة عامة</button>
          <button [class.on]="tab()==='schedule'" (click)="tab.set('schedule')">جدول الحصص <span class="cnt">{{ subjectSchedule().length }}</span></button>
          <button [class.on]="tab()==='teachers'" (click)="tab.set('teachers')">المعلمون <span class="cnt">{{ subjectTeachers().length }}</span></button>
          <button [class.on]="tab()==='exams'" (click)="tab.set('exams')">الاختبارات <span class="cnt">{{ subjectExams().length }}</span></button>
        </nav>

        <div class="dbody">
          @if (detailsLoading()) { <div class="d-empty">جارٍ جلب الموديولات المرتبطة…</div> }

          @else if (tab()==='overview') {
            <div class="ov-grid">
              <div class="ov-cell"><span class="ov-l">الحصص الأسبوعية</span><span class="ov-v">{{ s.weekly_periods }}</span></div>
              <div class="ov-cell"><span class="ov-l">درجة النجاح</span><span class="ov-v">{{ s.passing_mark }}</span></div>
              <div class="ov-cell"><span class="ov-l">النهاية العظمى</span><span class="ov-v">{{ s.maximum_mark }}</span></div>
              <div class="ov-cell"><span class="ov-l">الحصص المجدولة</span><span class="ov-v">{{ subjectSchedule().length }}</span></div>
              <div class="ov-cell"><span class="ov-l">المعلمون</span><span class="ov-v">{{ subjectTeachers().length }}</span></div>
              <div class="ov-cell"><span class="ov-l">الاختبارات</span><span class="ov-v">{{ subjectExams().length }}</span></div>
            </div>
            <div class="ov-links">
              <a routerLink="/timetable" (click)="closeSubject()">فتح الجدول الأكاديمي ←</a>
              <a routerLink="/examinations" (click)="closeSubject()">فتح الاختبارات ←</a>
              <a routerLink="/teachers" (click)="closeSubject()">شؤون المعلمين ←</a>
            </div>
          }

          @else if (tab()==='schedule') {
            @if (!subjectSchedule().length) {
              <div class="d-empty">لا حصص مجدولة لهذه المادة بعد. أضِفها من <a routerLink="/timetable" (click)="closeSubject()">الجدول الأكاديمي</a>.</div>
            } @else {
              <div class="sched">
                @for (e of subjectSchedule(); track e.id) {
                  <div class="sched-row">
                    <span class="sr-day">{{ dayLabel(e.day_of_week) }}</span>
                    <span class="sr-time mono">{{ periodTime(e.period) }}</span>
                    <span class="sr-teacher">{{ teacherName(e.teacher) }}</span>
                    <span class="sr-sec">{{ sectionName(e.grade_section_id) }}</span>
                  </div>
                }
              </div>
            }
          }

          @else if (tab()==='teachers') {
            @if (!subjectTeachers().length) {
              <div class="d-empty">لم يُسنَد معلمون لهذه المادة بعد. أسنِدهم من <a routerLink="/timetable" (click)="closeSubject()">الجدولة الذكية</a>.</div>
            } @else {
              <div class="tch-list">
                @for (t of subjectTeachers(); track t.id) {
                  <div class="tch">
                    <span class="tch-av">{{ initial(t.name) }}</span>
                    <span class="tch-body"><span class="tch-name">{{ t.name }}</span><span class="tch-sub">{{ t.periods }} حصة أسبوعياً</span></span>
                  </div>
                }
              </div>
            }
          }

          @else if (tab()==='exams') {
            @if (!subjectExams().length) {
              <div class="d-empty">لا اختبارات مرتبطة بهذه المادة بعد. أنشئها من <a routerLink="/examinations" (click)="closeSubject()">وحدة الاختبارات</a>.</div>
            } @else {
              <div class="exam-list">
                @for (x of subjectExams(); track x.id) {
                  <div class="exam">
                    <div class="ex-top"><span class="ex-name">{{ x.name }}</span><span class="ex-badge" [attr.data-st]="x.status">{{ examStatus(x.status) }}</span></div>
                    <div class="ex-meta mono">{{ x.term || '—' }} · النهاية {{ x.max_marks }} · النجاح {{ x.pass_marks }} · الوزن {{ x.weight_percentage }}%</div>
                  </div>
                }
              </div>
            }
          }
        </div>
      </aside>
    }
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .hint { font-size: 12px; color: var(--nb-text-muted); margin: 8px 0 0; }
    .empty { font-size: 13px; color: var(--nb-text-muted); margin: 0; padding: 8px; }
    .mono { font-variant-numeric: tabular-nums; }
    .banner { padding: 10px 14px; border-radius: var(--nb-radius); font-size: 13px; font-weight: 600; margin-bottom: 14px; }
    .banner.success { background: rgba(52,199,89,.12); color: var(--nb-success); border: 1px solid rgba(52,199,89,.3); }

    /* بطاقات مؤشرات — نمط Nebras المعتمد */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 16px; }
    .metric-card { position: relative; overflow: hidden; background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      padding: 16px 18px; display: flex; align-items: center; gap: 14px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
    .metric-card::before { content: ''; position: absolute; inset-block-start: 0; inset-inline: 0; height: 3px; background: var(--nb-text-faint); }
    .metric-card.total::before { background: var(--nb-primary-500); }
    .metric-card.info::before { background: var(--nb-info); }
    .metric-card.purple::before { background: #af52de; }
    .metric-card.success::before { background: var(--nb-success); }
    .m-icon { flex-shrink: 0; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: var(--nb-surface-raised); color: var(--nb-text-muted); }
    .m-icon svg { width: 22px; height: 22px; }
    .metric-card.total .m-icon { background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .metric-card.info .m-icon { background: rgba(0,122,255,.12); color: var(--nb-info); }
    .metric-card.purple .m-icon { background: rgba(175,82,222,.12); color: #7d26cd; }
    .metric-card.success .m-icon { background: rgba(52,199,89,.12); color: var(--nb-success); }
    .m-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .metric-card .label { font-size: 12.5px; color: var(--nb-text-muted); font-weight: 700; }
    .metric-card .value { font-size: 28px; font-weight: 800; line-height: 1.1; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .metric-card .value.info { color: var(--nb-info); } .metric-card .value.success { color: var(--nb-success); } .metric-card .value.purple { color: #7d26cd; }

    /* add form */
    .add-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; align-items: end; }
    .fld { display: flex; flex-direction: column; gap: 5px; }
    .fld.req label::after { content: ' *'; color: var(--nb-danger); }
    .fld label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
    .fld input, .fld select { height: 36px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); background: var(--nb-surface); outline: none; transition: border-color 150ms ease, box-shadow 150ms ease; }
    .fld input:focus, .fld select:focus { border-color: var(--nb-primary-600); box-shadow: var(--nb-focus-ring); }
    .form-actions { display: flex; gap: 8px; }

    /* شريط الفلاتر */
    .toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
    .search { flex: 1; min-width: 220px; height: 36px; background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius); display: flex; align-items: center; padding: 0 12px; }
    .search input { flex: 1; border: none; background: transparent; outline: none; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); }
    .filter { height: 36px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); background: var(--nb-surface); outline: none; min-width: 150px; }

    /* أشرطة المراحل */
    .band { margin-bottom: 22px; }
    .band-head { display: flex; align-items: baseline; gap: 12px; margin: 0 2px 12px; padding-bottom: 8px; border-bottom: 2px solid var(--nb-primary-100); }
    .band-head h2 { margin: 0; font-size: 16px; font-weight: 800; color: var(--nb-primary-700); }
    .band-meta { font-size: 12px; color: var(--nb-text-muted); font-variant-numeric: tabular-nums; }

    /* بطاقة المادة */
    .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; padding: 12px 16px; }
    .tile { position: relative; overflow: hidden; text-align: start; cursor: pointer; border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 12px; display: flex; flex-direction: column; gap: 10px;
      background: color-mix(in srgb, var(--tone, var(--nb-primary-500)) 6%, var(--nb-surface)); border-inline-start: 3px solid var(--tone, var(--nb-primary-500)); font-family: var(--nb-font-family);
      transition: transform .15s cubic-bezier(.4,0,.2,1), box-shadow .15s, border-color .15s; }
    .tile:hover { transform: translateY(-2px); box-shadow: 0 8px 18px rgba(0,0,0,.08); }
    .tile:focus-visible { outline: 2px solid var(--tone); outline-offset: 2px; }
    .tile-name { font-size: 13.5px; font-weight: 700; color: var(--nb-text); line-height: 1.35; }
    .tile-foot { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
    .wk { font-size: 11px; font-weight: 600; color: var(--nb-text-muted); font-variant-numeric: tabular-nums; }
    .trk { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 999px; background: rgba(175,82,222,.14); color: #7d26cd; }
    .trk.sci { background: rgba(0,122,255,.14); color: var(--nb-info); }

    /* ===== الدرج — نمط Nebras (هيرو إندِيغو) ===== */
    .drawer-scrim { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 999; animation: fade .2s ease; }
    @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
    .drawer { position: fixed; inset-block: 0; inset-inline-start: 0; width: min(480px, 94vw); background: var(--nb-surface); z-index: 1000;
      display: flex; flex-direction: column; box-shadow: -20px 0 50px rgba(0,0,0,.28); animation: slideIn .28s cubic-bezier(.2,0,0,1); }
    @keyframes slideIn { from { transform: translateX(-24px); opacity: .4; } to { transform: none; opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .drawer, .drawer-scrim { animation: none; } }
    .dh { position: relative; padding: 22px 22px 18px; color: #fff; background: linear-gradient(135deg, var(--nb-primary-600), var(--nb-primary-500)); }
    .dh-x { position: absolute; top: 14px; inset-inline-start: 16px; width: 30px; height: 30px; border: none; border-radius: 50%; background: rgba(255,255,255,.16); color: #fff; font-size: 20px; cursor: pointer; line-height: 1; }
    .dh-badge { font-size: 11px; font-weight: 700; background: rgba(255,255,255,.22); padding: 3px 10px; border-radius: 999px; }
    .dh h2 { margin: 10px 0 2px; font-size: 22px; font-weight: 800; color: #fff; }
    .dh-en { margin: 0 0 12px; font-size: 12.5px; color: rgba(255,255,255,.7); }
    .dh-tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .dtag { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; background: rgba(255,255,255,.16); color: #fff; }
    .dtag.accent { background: #fff; color: var(--nb-primary-700); } .dtag.ghost { background: transparent; border: 1px solid rgba(255,255,255,.35); }
    .dtabs { display: flex; gap: 2px; padding: 0 12px; border-bottom: 1px solid var(--nb-border-soft); background: var(--nb-surface-raised); }
    .dtabs button { position: relative; border: none; background: transparent; padding: 12px 10px; font-family: var(--nb-font-family); font-size: 12.5px; font-weight: 700; color: var(--nb-text-muted); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .dtabs button.on { color: var(--nb-primary-700); }
    .dtabs button.on::after { content: ''; position: absolute; bottom: -1px; inset-inline: 8px; height: 2px; background: var(--nb-primary-600); border-radius: 2px; }
    .cnt { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; background: var(--nb-surface); border: 1px solid var(--nb-border); font-size: 10px; display: inline-flex; align-items: center; justify-content: center; font-variant-numeric: tabular-nums; }
    .dbody { flex: 1; overflow-y: auto; padding: 18px 20px; }
    .d-empty { text-align: center; padding: 34px 16px; font-size: 13px; color: var(--nb-text-muted); }
    .d-empty a { color: var(--nb-primary-600); font-weight: 700; }

    .ov-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 18px; }
    .ov-cell { background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 4px; }
    .ov-l { font-size: 11px; color: var(--nb-text-muted); font-weight: 600; }
    .ov-v { font-size: 20px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .ov-links { display: flex; flex-direction: column; gap: 8px; }
    .ov-links a { font-size: 13px; font-weight: 700; color: var(--nb-primary-700); text-decoration: none; padding: 10px 12px; border: 1px solid var(--nb-border); border-radius: 10px; transition: background .15s; }
    .ov-links a:hover { background: var(--nb-primary-50); }

    .sched { display: flex; flex-direction: column; }
    .sched-row { display: grid; grid-template-columns: 68px 84px 1fr auto; gap: 8px; align-items: center; padding: 11px 4px; border-bottom: 1px solid var(--nb-border-soft); font-size: 12.5px; }
    .sr-day { font-weight: 700; color: var(--nb-text); } .sr-time { color: var(--nb-text-muted); } .sr-teacher { color: var(--nb-text-secondary); }
    .sr-sec { font-size: 11px; color: var(--nb-text-muted); background: var(--nb-surface-raised); padding: 2px 8px; border-radius: 999px; }

    .tch-list { display: flex; flex-direction: column; gap: 8px; }
    .tch { display: flex; align-items: center; gap: 12px; padding: 8px; border: 1px solid var(--nb-border-soft); border-radius: 12px; }
    .tch-av { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 800; background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .tch-body { display: flex; flex-direction: column; gap: 1px; } .tch-name { font-size: 13px; font-weight: 700; color: var(--nb-text); } .tch-sub { font-size: 11px; color: var(--nb-text-muted); }

    .exam-list { display: flex; flex-direction: column; gap: 10px; }
    .exam { border: 1px solid var(--nb-border-soft); border-radius: 12px; padding: 12px 14px; }
    .ex-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
    .ex-name { font-size: 13.5px; font-weight: 700; color: var(--nb-text); }
    .ex-badge { font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: var(--nb-surface-raised); color: var(--nb-text-muted); }
    .ex-badge[data-st="published"] { background: rgba(52,199,89,.14); color: var(--nb-success); }
    .ex-badge[data-st="approved"] { background: rgba(0,122,255,.14); color: var(--nb-info); }
    .ex-meta { font-size: 11.5px; color: var(--nb-text-muted); }
  `],
})
export class AcademicSubjectsComponent implements OnInit {
  private readonly svc = inject(AcademicsService);
  private readonly tt = inject(TimetableService);
  private readonly dialog = inject(MatDialog);

  readonly rows = signal<any[]>([]);
  readonly grades = signal<any[]>([]);
  readonly stages = signal<any[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly adding = signal(false);
  readonly seeding = signal(false);
  readonly seedMsg = signal('');
  readonly error = signal('');

  q = '';
  readonly q$ = signal('');
  readonly stageFilter = signal('');
  readonly trackFilter = signal('');

  f: any = { grade: '', arabic_name: '', english_name: '', track: '', weekly_periods: 5, code: '' };

  // ----- الدرج -----
  readonly selected = signal<any | null>(null);
  readonly tab = signal<'overview' | 'schedule' | 'teachers' | 'exams'>('overview');
  readonly detailsLoading = signal(false);
  private detailsLoaded = false;
  readonly entries = signal<any[]>([]);
  readonly periods = signal<any[]>([]);
  readonly faculty = signal<any[]>([]);
  readonly sections = signal<any[]>([]);
  readonly exams = signal<any[]>([]);

  readonly days = DAYS;

  readonly totalWeekly = computed(() => this.rows().reduce((n, s) => n + (Number(s.weekly_periods) || 0), 0));

  private readonly filtered = computed(() => {
    const q = this.q$().trim().toLowerCase();
    const sf = this.stageFilter();
    const tf = this.trackFilter();
    return this.rows().filter((x) => {
      if (q && !`${x.arabic_name} ${x.english_name ?? ''} ${x.code}`.toLowerCase().includes(q)) return false;
      if (sf && String(x.stage_id) !== sf) return false;
      if (tf && (x.track || '') !== tf) return false;
      return true;
    });
  });

  readonly ungrouped = computed(() => this.filtered().filter((s) => !s.grade));

  readonly groupedStages = computed(() => {
    const byGrade = new Map<string, any[]>();
    for (const s of this.filtered()) {
      if (!s.grade) continue;
      const k = String(s.grade);
      if (!byGrade.has(k)) byGrade.set(k, []);
      byGrade.get(k)!.push(s);
    }
    const gradeById = new Map(this.grades().map((g) => [String(g.id), g]));
    const stageById = new Map(this.stages().map((st) => [String(st.id), st]));
    const stageMap = new Map<string, any>();

    for (const [gid, subs] of byGrade) {
      const g = gradeById.get(gid);
      const stId = String(g?.stage ?? subs[0]?.stage_id ?? 'x');
      const st = stageById.get(stId);
      if (!stageMap.has(stId)) {
        stageMap.set(stId, { id: stId, name: st?.name ?? subs[0]?.stage_name ?? 'مرحلة', order: st?.order ?? subs[0]?.stage_order ?? 99, grades: [], count: 0 });
      }
      const bucket = stageMap.get(stId);
      subs.sort((a, b) => (a.track || '').localeCompare(b.track || '') || a.arabic_name.localeCompare(b.arabic_name));
      bucket.grades.push({ id: gid, name: g?.name ?? subs[0]?.grade_name ?? 'صف', order: g?.order ?? subs[0]?.grade_order ?? 99, subjects: subs });
      bucket.count += subs.length;
    }
    const arr = [...stageMap.values()];
    arr.forEach((st) => st.grades.sort((a: any, b: any) => a.order - b.order));
    return arr.sort((a, b) => a.order - b.order);
  });

  // ----- مشتقات الدرج -----
  private teacherMap = computed(() => new Map(this.faculty().map((t) => [String(t.id), t])));
  private periodMap = computed(() => new Map(this.periods().map((p) => [String(p.id), p])));
  private sectionMap = computed(() => new Map(this.sections().map((s) => [String(s.id), s])));

  readonly subjectSchedule = computed(() => {
    const s = this.selected(); if (!s) return [];
    return this.entries()
      .filter((e) => String(e.subject_id) === String(s.id))
      .sort((a, b) => this.dayOrder(a.day_of_week) - this.dayOrder(b.day_of_week));
  });
  readonly subjectTeachers = computed(() => {
    const counts = new Map<string, number>();
    for (const e of this.subjectSchedule()) counts.set(String(e.teacher), (counts.get(String(e.teacher)) ?? 0) + 1);
    return [...counts.entries()].map(([id, periods]) => ({ id, name: this.teacherName(id), periods })).sort((a, b) => b.periods - a.periods);
  });
  readonly subjectExams = computed(() => {
    const s = this.selected(); if (!s) return [];
    return this.exams().filter((x) => String(x.subject_id) === String(s.id));
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    forkJoin({
      subjects: this.svc.getSubjects({ all: 1 }),
      grades: this.svc.getGrades({ page_size: 200 }),
      stages: this.svc.getStages({ page_size: 100 }),
    }).subscribe({
      next: (r) => {
        this.rows.set(pickList(r.subjects));
        this.grades.set(pickList(r.grades));
        this.stages.set(pickList(r.stages));
        this.loading.set(false);
      },
      error: () => { this.rows.set([]); this.loading.set(false); },
    });
  }

  /** تحميل الموديولات المرتبطة عند أول فتح للدرج فقط. */
  private ensureDetails(): void {
    if (this.detailsLoaded) return;
    this.detailsLoaded = true;
    this.detailsLoading.set(true);
    forkJoin({
      entries: this.tt.getEntries(),
      periods: this.tt.getPeriods(),
      faculty: this.tt.getFacultyMembers(),
      sections: this.svc.getSections(),
      exams: this.svc.getExams(),
    }).subscribe({
      next: (r) => {
        this.entries.set(pickList(r.entries));
        this.periods.set(pickList(r.periods));
        this.faculty.set(pickList(r.faculty));
        this.sections.set(pickList(r.sections));
        this.exams.set(pickList(r.exams));
        this.detailsLoading.set(false);
      },
      error: () => this.detailsLoading.set(false),
    });
  }

  openSubject(s: any): void { this.selected.set(s); this.tab.set('overview'); this.ensureDetails(); }
  closeSubject(): void { this.selected.set(null); }

  seed(): void {
    if (this.seeding()) return;
    this.seeding.set(true); this.seedMsg.set('');
    this.svc.seedCurriculum().subscribe({
      next: (res) => { this.seeding.set(false); this.seedMsg.set(res?.message || 'تم إدراج المنهج بنجاح.'); this.load(); },
      error: (e) => { this.seeding.set(false); this.error.set(e?.error?.message || 'تعذّر إدراج المنهج.'); },
    });
  }

  valid(): boolean { return !!this.f.arabic_name && !!this.f.grade; }

  save(): void {
    if (!this.valid() || this.saving()) return;
    this.saving.set(true); this.error.set('');
    const g = this.grades().find((x) => String(x.id) === String(this.f.grade));
    const code = this.f.code?.trim() || `${g?.code || 'SUBJ'}-${Date.now().toString(36)}`;
    const body = {
      grade: this.f.grade, arabic_name: this.f.arabic_name, english_name: this.f.english_name,
      track: this.f.track, weekly_periods: Number(this.f.weekly_periods) || 0, code,
      passing_mark: 50, maximum_mark: 100, status: true,
    };
    this.svc.createSubject(body).subscribe({
      next: () => { this.saving.set(false); this.adding.set(false); this.f = { grade: '', arabic_name: '', english_name: '', track: '', weekly_periods: 5, code: '' }; this.load(); },
      error: (e) => { this.saving.set(false); this.error.set(e?.error?.message || 'تعذّر الحفظ.'); },
    });
  }

  remove(s: any): void {
    const data: ConfirmDialogData = { title: 'حذف المادة', message: `حذف «${s.arabic_name}»؟`, color: 'warn' };
    this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe((ok) => {
      if (ok) this.svc.deleteSubject(s.id).subscribe({ next: () => { this.closeSubject(); this.load(); } });
    });
  }

  // ----- عرض -----
  trackLabel(t: string): string { return TRACK_LABEL[t] ?? t; }
  teacherName(id: string): string { const t = this.teacherMap().get(String(id)); return t?.full_name_ar ?? t?.full_name_en ?? 'معلم'; }
  sectionName(id: string): string { return this.sectionMap().get(String(id))?.name ?? '—'; }
  periodTime(id: string): string { const p = this.periodMap().get(String(id)); return p ? String(p.start_time).slice(0, 5) : '—'; }
  dayLabel(idx: number): string { return DAYS.find((d) => d.idx === idx)?.label ?? '—'; }
  dayOrder(idx: number): number { const i = DAYS.findIndex((d) => d.idx === idx); return i < 0 ? 99 : i; }
  initial(name: string): string { return (name || '؟').trim().charAt(0); }
  examStatus(s: string): string {
    return ({ draft: 'مسودة', review: 'مراجعة', approved: 'معتمد', published: 'منشور', locked: 'مغلق', archived: 'مؤرشف', closed: 'مغلق' } as any)[s] || s;
  }

  private palette = ['#3F51B5', '#007aff', '#2E9E7B', '#af52de', '#5856d6', '#00c7be', '#30b0c7', '#a2845e'];
  toneFor(name: string): string {
    let h = 0;
    for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return this.palette[h % this.palette.length];
  }
}
