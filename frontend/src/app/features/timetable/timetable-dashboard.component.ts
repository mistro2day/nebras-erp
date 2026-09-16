import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TimetableService } from './timetable.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbLoadingComponent } from '../../shared/nebras/nb-loading.component';
import { NbModalComponent } from '../../shared/nebras/nb-modal.component';
import { NbStepperComponent } from '../../shared/nebras/nb-stepper.component';
import { NbDrawerComponent } from '../../shared/nebras/nb-drawer.component';

/** تطبيع استجابة القوائم إلى مصفوفة */
function pickList<T = any>(res: any): T[] {
  const d = res?.data ?? res;
  if (Array.isArray(d)) return d as T[];
  if (Array.isArray(d?.results)) return d.results as T[];
  if (Array.isArray(d?.data)) return d.data as T[];
  return [];
}

export const SUDAN_BRAND = {
  republic: 'جمهورية السودان',
  ministry: 'وزارة التعليم والتربية الوطنية',
  schoolName: 'مدارس المورد الجديدة للتعليم الخاص',
  currency: 'ج.س',
  location: 'الخرطوم — أركويت — مربع 54',
};

interface DayOption {
  idx: number;
  label: string;
  en: string;
}

@Component({
  selector: 'app-timetable-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    NbPageHeaderComponent,
    NbPanelComponent,
    NbLoadingComponent,
    NbModalComponent,
    NbStepperComponent,
    NbDrawerComponent,
  ],
  template: `
    <div class="page" dir="rtl">
      <!-- ترويسة الصفحة مع أزرار الإجراءات الكبرى -->
      <nb-page-header
        title="إدارة الجدول الأكاديمي والجدولة الذكية"
        subtitle="منظومة الجدولة الأكاديمية الشاملة للمدرسة بالكامل — توزيع الحصص، كشف التضارب، حصص الاحتياط، والتوليد الآلي الذكي."
      >
        <button class="nb-btn-secondary" (click)="load()" [disabled]="loading()">
          <span class="btn-icon">↻</span> تحديث
        </button>
        <button class="nb-btn-secondary" (click)="openPrintDrawer('master')">
          <span class="btn-icon">🖨️</span> طباعة الجداول (A4/A3)
        </button>
        <button class="nb-btn-secondary warn-btn" (click)="openSubstitutionModal()">
          <span class="btn-icon">📋</span> حصص الاحتياط
        </button>
        <button class="nb-btn-primary auto-btn" (click)="openAutoGenModal()">
          <span class="btn-icon">⚡</span> التوليد الذكي لكامل المدرسة
        </button>
        <button class="nb-btn-primary" (click)="openWizard()">
          <span class="btn-icon">+</span> إنشاء جدول جديد
        </button>
      </nb-page-header>

      @if (loading()) {
        <nb-loading message="جارٍ استدعاء بيانات المدرسة والجدول الدراسي الشامل…"></nb-loading>
      } @else {
        <!-- البطاقة التوجيهية للجدول الأكاديمي النشط -->
        <div class="hero">
          <div class="hero-glow"></div>
          <div class="hero-main">
            <div class="hero-tags">
              <span class="hero-badge">الجدول المعتمد للمدرسة</span>
              <span class="hero-badge-sec">{{ activeTimetable()?.academic_year || '2026/2027' }} · {{ activeTimetable()?.term || 'الفصل الأول' }}</span>
              <span class="hero-badge-status" [class.published]="activeTimetable()?.status === 'published'">
                {{ activeTimetable()?.status === 'published' ? 'منشور ومعتمد' : 'مسودة قيد المراجعة' }}
              </span>
            </div>
            <h2 class="hero-title">{{ activeTimetable()?.name || 'الجدول الأكاديمي الموحد لمراحل المدرسة' }}</h2>
            <div class="hero-meta">
              <span><strong>{{ sections().length }}</strong> شعبة دراسية</span>
              <span class="sep">·</span>
              <span><strong>{{ faculty().length }}</strong> معلماً</span>
              <span class="sep">·</span>
              <span><strong>{{ entriesForTimetable(selectedTimetableId()).length }}</strong> حصة أسبوعية مسجلة</span>
            </div>
          </div>
          <div class="hero-stats">
            <div class="hero-ring" [style.background]="conflictRingBg()">
              <div class="hero-ring-in">
                <span class="hr-pct">{{ totalConflicts() }}</span>
                <span class="hr-lbl">تعارض</span>
              </div>
            </div>
            <div class="hero-kpi">
              <span class="hk-label">نسبة الإنجاز المدرسي</span>
              <span class="hk-val mono">{{ schoolCompletionPct() }}%</span>
              <div class="hk-bar"><div class="hk-fill" [style.width.%]="schoolCompletionPct()"></div></div>
            </div>
          </div>
        </div>

        <!-- المؤشرات التشغيلية للمدرسة -->
        <div class="stats-grid">
          <div class="metric-card total">
            <span class="m-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            </span>
            <span class="m-body">
              <span class="label">إجمالي حصص المدرسة</span>
              <span class="value">{{ entries().length }}</span>
            </span>
          </div>
          <div class="metric-card success">
            <span class="m-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </span>
            <span class="m-body">
              <span class="label">المعلمون المكلفون</span>
              <span class="value success">{{ activeTeachers() }} <span class="v-sub">/ {{ faculty().length }}</span></span>
            </span>
          </div>
          <div class="metric-card occ" [class.hot]="avgTeacherLoad() >= 90" [class.mid]="avgTeacherLoad() >= 70 && avgTeacherLoad() < 90">
            <span class="m-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
            </span>
            <span class="m-body">
              <span class="label">متوسط العبء التدريسي</span>
              <span class="value">{{ avgTeacherLoad() }}<span class="v-suffix">%</span></span>
              <span class="occ-bar"><span class="occ-fill" [style.width.%]="avgTeacherLoad()"></span></span>
            </span>
          </div>
          <div class="metric-card info">
            <span class="m-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </span>
            <span class="m-body">
              <span class="label">الشعب الدراسية المغطاة</span>
              <span class="value info">{{ coveredSectionsCount() }} <span class="v-sub">/ {{ sections().length }}</span></span>
            </span>
          </div>
          <div class="metric-card warn">
            <span class="m-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
            </span>
            <span class="m-body">
              <span class="label">حصص الاحتياط النشطة</span>
              <span class="value warn">{{ substitutions().length }}</span>
            </span>
          </div>
        </div>

        <!-- شريط أوضاع العرض الذكية الأربعة (School View Switcher) -->
        <div class="view-switcher-bar">
          <div class="switch-tabs" role="tablist">
            <button
              class="tab-btn"
              [class.active]="viewMode() === 'section'"
              (click)="viewMode.set('section')"
              role="tab"
            >
              <span class="t-icon">📖</span>
              <span class="t-txt">الجدول المدرسي المعتاد (جدول الفصل الأسبوعي)</span>
            </button>
            <button
              class="tab-btn"
              [class.active]="viewMode() === 'master'"
              (click)="viewMode.set('master')"
              role="tab"
            >
              <span class="t-icon">🏛️</span>
              <span class="t-txt">مصفوفة المدرسة بالكامل (Master Grid)</span>
            </button>
            <button
              class="tab-btn"
              [class.active]="viewMode() === 'teachers'"
              (click)="viewMode.set('teachers')"
              role="tab"
            >
              <span class="t-icon">👨‍🏫</span>
              <span class="t-txt">شبكة المعلمين وساعات الفراغ</span>
            </button>
            <button
              class="tab-btn"
              [class.active]="viewMode() === 'rooms'"
              (click)="viewMode.set('rooms')"
              role="tab"
            >
              <span class="t-icon">🧪</span>
              <span class="t-txt">إشغال المعامل والقاعات التخصصية</span>
            </button>
          </div>

          <!-- فلاتر التحكم اللحظية -->
          <div class="quick-filters">
            <div class="f-group">
              <label>الجدول الأكاديمي</label>
              <select [ngModel]="selectedTimetableId()" (ngModelChange)="onSelectTimetable($event)">
                @for (tt of timetables(); track tt.id) {
                  <option [value]="tt.id">{{ tt.name }} ({{ tt.academic_year }})</option>
                }
              </select>
            </div>

            @if (viewMode() === 'master' || viewMode() === 'teachers' || viewMode() === 'rooms') {
              <div class="f-group day-picker">
                <label>اليوم الدراسي</label>
                <div class="day-chips">
                  @for (d of days; track d.idx) {
                    <button
                      class="day-chip"
                      [class.active]="selectedDay() === d.idx"
                      (click)="selectedDay.set(d.idx)"
                    >
                      {{ d.label }}
                    </button>
                  }
                </div>
              </div>
            }

            <div class="f-group">
              <label>تصفية المرحلة</label>
              <select [ngModel]="selectedStageId()" (ngModelChange)="selectedStageId.set($event)">
                <option value="all">كافة المراحل المدرسية</option>
                @for (st of stages(); track st.id) {
                  <option [value]="st.id">{{ st.name }}</option>
                }
              </select>
            </div>

            @if (viewMode() === 'section') {
              <div class="f-group">
                <label>الشعبة / الفصل</label>
                <select [ngModel]="selectedSectionId()" (ngModelChange)="selectedSectionId.set($event)">
                  @for (s of filteredSections(); track s.id) {
                    <option [value]="s.id">{{ s.name }} ({{ gradeName(s.grade) }})</option>
                  }
                </select>
              </div>
            }

            <div class="filters-actions">
              <button class="nb-btn-primary xs-btn auto-action-btn" (click)="openAutoGenModal()">
                ⚡ توليد وتوزيع الحصص آلياً
              </button>
            </div>
          </div>
        </div>


        <!-- ======================================================== -->
        <!-- نمط 1: مصفوفة المدرسة بالكامل (Master School-Wide Grid) -->
        <!-- ======================================================== -->
        @if (viewMode() === 'master') {
          <nb-panel [title]="'مصفوفة المدرسة الكاملة ليوم ' + dayLabel(selectedDay())">
            <div class="matrix-header-info">
              <div class="hint-text">
                💡 اسحب أي حصة وضعها في خانة أخرى لنقلها، أو أسقطها فوق حصة أخرى لتبديل الحصتين فورياً (Smart Swap).
              </div>
              <div class="matrix-actions">
                <button class="nb-btn-secondary xs-btn" (click)="openPrintDrawer('master')">🖨️ طباعة مصفوفة اليوم (A3/A4)</button>
              </div>
            </div>

            <div class="table-container matrix-scroll">
              <table class="matrix-table" dir="rtl">
                <thead>
                  <tr>
                    <th class="col-section">الشعبة / الصف</th>
                    @for (p of teachingPeriods(); track p.id) {
                      <th class="col-period">
                        <div class="p-head">
                          <span class="p-num">الحصة {{ p.period_number }}</span>
                          <span class="p-time mono">{{ fmt(p.start_time) }} - {{ fmt(p.end_time) }}</span>
                        </div>
                      </th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (sec of filteredSections(); track sec.id) {
                    <tr>
                      <td class="sec-cell">
                        <div class="sec-badge">
                          <strong class="sec-name">{{ sec.name }}</strong>
                          <span class="sec-grade">{{ gradeName(sec.grade) }}</span>
                        </div>
                      </td>
                      @for (p of teachingPeriods(); track p.id) {
                        <td
                          class="slot-cell"
                          [class.drag-over]="isDragOver(sec.id, p.id)"
                          (dragover)="onDragOver($event, sec.id, p.id)"
                          (dragleave)="onDragLeave()"
                          (drop)="onDrop(sec.id, p.id)"
                        >
                          @if (cellEntryFor(selectedDay(), sec.id, p.id); as entry) {
                            <div
                              class="lesson-card"
                              draggable="true"
                              (dragstart)="onDragStart(entry)"
                              [style.--tone]="toneFor(entry.subject_id)"
                            >
                              <div class="l-top">
                                <span class="l-sub-name" [title]="subjectName(entry.subject_id)">
                                  {{ subjectName(entry.subject_id) }}
                                </span>
                                <div class="l-actions">
                                  <button class="act-btn sub-btn" title="تكليف معلم بديل (احتياط)" (click)="openSubstituteForEntry(entry)">⚡</button>
                                  <button class="act-btn del-btn" title="حذف الحصة" (click)="removeEntry(entry)">×</button>
                                </div>
                              </div>
                              <div class="l-meta">
                                <span class="l-teach" [title]="teacherName(entry.teacher)">
                                  👤 {{ teacherName(entry.teacher) }}
                                </span>
                                @if (entry.room_id && entry.room_id !== '00000000-0000-0000-0000-000000000000') {
                                  <span class="l-room">📍 قاعة/معمل</span>
                                }
                              </div>
                            </div>
                          } @else {
                            <div class="empty-slot" (click)="openAdd(selectedDay(), p.id, sec.id)" title="إضافة حصة للشعبة">
                              <span class="plus-sign">+</span>
                            </div>
                          }
                        </td>
                      }
                    </tr>
                  }
                  @if (!filteredSections().length) {
                    <tr>
                      <td [attr.colspan]="teachingPeriods().length + 1" class="text-center py-6 text-muted">
                        لا توجد شعب دراسية مسجلة في هذا التصنيف.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </nb-panel>
        }

        <!-- ======================================================== -->
        <!-- نمط 2: شبكة المعلمين وساعات الفراغ (Faculty Master Grid)  -->
        <!-- ======================================================== -->
        @if (viewMode() === 'teachers') {
          <nb-panel [title]="'شبكة تفرغ وجداول المعلمين ليوم ' + dayLabel(selectedDay())">
            <div class="matrix-header-info">
              <div class="hint-text">
                💡 تظهر الخانات الخضراء أوقات تفرغ المعلم (ساعات فراغ) المتاحة لتكليفه بحصص الاحتياط أو الاجتماعات الأكاديمية.
              </div>
              <button class="nb-btn-secondary xs-btn" (click)="openPrintDrawer('teacher')">🖨️ طباعة جدول المعلمين</button>

            </div>

            <div class="table-container matrix-scroll">
              <table class="matrix-table" dir="rtl">
                <thead>
                  <tr>
                    <th class="col-teacher">المعلم / التخصص</th>
                    <th class="col-load">النصاب</th>
                    @for (p of teachingPeriods(); track p.id) {
                      <th class="col-period">
                        <div class="p-head">
                          <span class="p-num">الحصة {{ p.period_number }}</span>
                          <span class="p-time mono">{{ fmt(p.start_time) }}</span>
                        </div>
                      </th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (t of faculty(); track t.id) {
                    <tr>
                      <td class="teacher-cell">
                        <div class="t-badge">
                          <strong class="t-name">{{ t.full_name_ar }}</strong>
                          <span class="t-dept">{{ t.department || 'القسم الأكاديمي' }}</span>
                        </div>
                      </td>
                      <td class="load-cell mono">
                        <div class="t-load-pill" [class.warn]="teacherLoadPct(t.id) >= 90">
                          {{ teacherAssignedHours(t.id) }}/{{ teacherMaxHours(t.id) }}
                        </div>
                      </td>
                      @for (p of teachingPeriods(); track p.id) {
                        <td class="slot-cell">
                          @if (teacherEntryFor(t.id, selectedDay(), p.id); as te) {
                            <div class="lesson-card teacher-view" [style.--tone]="toneFor(te.subject_id)">
                              <span class="l-sub-name">{{ subjectName(te.subject_id) }}</span>
                              <span class="l-sec-name">فصل: {{ sectionName(te.grade_section_id) }}</span>
                            </div>
                          } @else {
                            <div class="free-slot" (click)="assignSubstituteQuick(t, selectedDay(), p.id)" title="المعلم متفرغ — انقر للتكليف باحتياط">
                              <span class="free-label">✓ تفرغ</span>
                              <span class="sub-assign-tag">+ احتياط</span>
                            </div>
                          }
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </nb-panel>
        }

        <!-- ======================================================== -->
        <!-- نمط 3: جدول القاعات والمعامل التخصصية (Rooms & Facilities)-->
        <!-- ======================================================== -->
        @if (viewMode() === 'rooms') {
          <nb-panel [title]="'إشغال القاعات والمعامل التخصصية ليوم ' + dayLabel(selectedDay())">
            <div class="table-container matrix-scroll">
              <table class="matrix-table" dir="rtl">
                <thead>
                  <tr>
                    <th class="col-section">المعمل / القاعة التخصصية</th>
                    @for (p of teachingPeriods(); track p.id) {
                      <th class="col-period">
                        <div class="p-head">
                          <span class="p-num">الحصة {{ p.period_number }}</span>
                          <span class="p-time mono">{{ fmt(p.start_time) }}</span>
                        </div>
                      </th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (facility of facilitiesList; track facility.id) {
                    <tr>
                      <td class="sec-cell">
                        <div class="sec-badge">
                          <strong class="sec-name">{{ facility.icon }} {{ facility.name }}</strong>
                          <span class="sec-grade">سعة: {{ facility.capacity }} طالب</span>
                        </div>
                      </td>
                      @for (p of teachingPeriods(); track p.id) {
                        <td class="slot-cell">
                          @if (roomEntryFor(facility.id, selectedDay(), p.id); as re) {
                            <div class="lesson-card room-view" [style.--tone]="toneFor(re.subject_id)">
                              <span class="l-sub-name">{{ subjectName(re.subject_id) }}</span>
                              <span class="l-meta">الشعبة: {{ sectionName(re.grade_section_id) }}</span>
                            </div>
                          } @else {
                            <div class="free-facility-slot">
                              <span class="f-avail">متاح للحجز</span>
                            </div>
                          }
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </nb-panel>
        }

        <!-- ======================================================== -->
        <!-- نمط 4: الجدول الأسبوعي للشعبة (الجدول المدرسي المعتاد)     -->
        <!-- ======================================================== -->
        @if (viewMode() === 'section') {
          <nb-panel [title]="'الجدول الأسبوعي المعتاد: ' + activeSectionName()">
            <!-- شريط الشرائح السريعة لكافة الشعب الدراسية -->
            <div class="sections-quick-pills">
              <span class="pills-title">الفصول والشعب:</span>
              <div class="pills-scroll">
                @for (s of filteredSections(); track s.id) {
                  <button
                    class="sec-pill-btn"
                    [class.active]="selectedSectionId() === s.id"
                    (click)="selectedSectionId.set(s.id)"
                  >
                    <span class="sp-name">{{ s.name }}</span>
                    <span class="sp-grade">{{ gradeName(s.grade) }}</span>
                    <span class="sp-count mono" [class.full]="sectionEntriesCount(s.id) >= 30">
                      {{ sectionEntriesCount(s.id) }} حصة
                    </span>
                  </button>
                }
              </div>
            </div>

            <!-- رأس الجدول مع التلميحات والأزرار -->
            <div class="matrix-header-info">
              <div class="hint-text">
                💡 اسحب أي حصة لنقلها أو إسقاطها فوق حصة أخرى للتبديل الفوري (Smart Swap)، أو انقر فوق أي خانة فارغة لحجز حصة جديدة.
              </div>
              <div class="sec-actions-top">
                <button class="nb-btn-secondary xs-btn" (click)="openPrintDrawer('section')">
                  🖨️ طباعة جدول الفصل الرسمي (A4)
                </button>
                <button class="nb-btn-primary xs-btn auto-action-btn" (click)="openAutoGenModal()">
                  ⚡ توليد وتوزيع الحصص آلياً
                </button>
              </div>
            </div>

            <!-- بانر التنبيه إذا كان الفصل فارغاً من الحصص -->
            @if (sectionEntriesCount(selectedSectionId()) === 0) {
              <div class="empty-schedule-banner">
                <div class="esb-icon">📅</div>
                <div class="esb-content">
                  <h4>جدول هذا الفصل الدراسي فارغ حالياً</h4>
                  <p>لم يتم تسجيل حصص لهذا الفصل بعد في الجدول المختار. يمكنك إضافة الحصص يدوياً بالنقر على الخانات، أو الاستفادة من محرك الجدولة الذكي لتوزيع الحصص والمواد والمعلمين فورياً.</p>
                </div>
                <div class="esb-actions">
                  <button class="nb-btn-primary" (click)="openAutoGenModal()">
                    ⚡ توليد وتوزيع الحصص آلياً الآن
                  </button>
                </div>
              </div>
            }

            <!-- جدول الحصص الأسبوعي الكلاسيكي المعتاد -->
            <div class="table-container matrix-scroll">
              <table class="matrix-table weekly-classic-table" dir="rtl">
                <thead>
                  <tr>
                    <th class="col-day">اليوم الدراسي</th>
                    <!-- الحصص الصباحية 1 و 2 و 3 -->
                    @for (p of teachingPeriods(); track p.id) {
                      @if (p.period_number <= 3) {
                        <th class="col-period">
                          <div class="p-head">
                            <span class="p-num">الحصة {{ p.period_number }}</span>
                            <span class="p-time mono">{{ fmt(p.start_time) }} - {{ fmt(p.end_time) }}</span>
                          </div>
                        </th>
                      }
                    }

                    <!-- عمود الفسحة والاستراحة المدرسية الرسمية -->
                    <th class="col-break">
                      <div class="p-head break-head">
                        <span class="p-num">🥪 الفسحة المدرسية</span>
                        <span class="p-time mono">{{ fmt(breakPeriod().start_time) }} - {{ fmt(breakPeriod().end_time) }}</span>
                      </div>
                    </th>

                    <!-- الحصص التالية 4 و 5 و 6 و 7 -->
                    @for (p of teachingPeriods(); track p.id) {
                      @if (p.period_number > 3) {
                        <th class="col-period">
                          <div class="p-head">
                            <span class="p-num">الحصة {{ p.period_number }}</span>
                            <span class="p-time mono">{{ fmt(p.start_time) }} - {{ fmt(p.end_time) }}</span>
                          </div>
                        </th>
                      }
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (d of days; track d.idx) {
                    <tr>
                      <td class="day-cell">
                        <strong class="day-ar">{{ d.label }}</strong>
                        <span class="day-sub mono">{{ d.en }}</span>
                      </td>

                      <!-- الحصص الصباحية 1 و 2 و 3 -->
                      @for (p of teachingPeriods(); track p.id) {
                        @if (p.period_number <= 3) {
                          <td
                            class="slot-cell"
                            [class.drag-over]="isDragOver(selectedSectionId(), p.id)"
                            (dragover)="onDragOver($event, selectedSectionId(), p.id)"
                            (dragleave)="onDragLeave()"
                            (drop)="onDrop(selectedSectionId(), p.id)"
                          >
                            @if (cellEntryFor(d.idx, selectedSectionId(), p.id); as entry) {
                              <div
                                class="lesson-card"
                                draggable="true"
                                (dragstart)="onDragStart(entry)"
                                [style.--tone]="toneFor(entry.subject_id)"
                              >
                                <div class="l-top">
                                  <span class="l-sub-name" [title]="subjectName(entry.subject_id)">
                                    {{ subjectName(entry.subject_id) }}
                                  </span>
                                  <div class="l-actions">
                                    <button class="act-btn sub-btn" title="تكليف معلم بديل (احتياط)" (click)="openSubstituteForEntry(entry)">⚡</button>
                                    <button class="act-btn del-btn" title="حذف الحصة" (click)="removeEntry(entry)">×</button>
                                  </div>
                                </div>
                                <div class="l-meta">
                                  <span class="l-teach" [title]="teacherName(entry.teacher)">
                                    👨‍🏫 {{ teacherName(entry.teacher) }}
                                  </span>
                                  @if (entry.room_id && entry.room_id !== '00000000-0000-0000-0000-000000000000') {
                                    <span class="l-room">📍 {{ roomName(entry.room_id) }}</span>
                                  }
                                </div>
                              </div>
                            } @else {
                              <div class="empty-slot" (click)="openAdd(d.idx, p.id, selectedSectionId())">
                                <span class="plus-sign">+</span>
                                <span class="add-hint">حجز حصة</span>
                              </div>
                            }
                          </td>
                        }
                      }

                      <!-- خانة عمود الفسحة والاستراحة المدرسية -->
                      <td class="break-cell">
                        <div class="break-box">
                          <span class="break-icon">🥪</span>
                          <span class="break-title">إفطار واستراحة</span>
                        </div>
                      </td>

                      <!-- الحصص التالية 4 و 5 و 6 و 7 -->
                      @for (p of teachingPeriods(); track p.id) {
                        @if (p.period_number > 3) {
                          <td
                            class="slot-cell"
                            [class.drag-over]="isDragOver(selectedSectionId(), p.id)"
                            (dragover)="onDragOver($event, selectedSectionId(), p.id)"
                            (dragleave)="onDragLeave()"
                            (drop)="onDrop(selectedSectionId(), p.id)"
                          >
                            @if (cellEntryFor(d.idx, selectedSectionId(), p.id); as entry) {
                              <div
                                class="lesson-card"
                                draggable="true"
                                (dragstart)="onDragStart(entry)"
                                [style.--tone]="toneFor(entry.subject_id)"
                              >
                                <div class="l-top">
                                  <span class="l-sub-name" [title]="subjectName(entry.subject_id)">
                                    {{ subjectName(entry.subject_id) }}
                                  </span>
                                  <div class="l-actions">
                                    <button class="act-btn sub-btn" title="تكليف معلم بديل (احتياط)" (click)="openSubstituteForEntry(entry)">⚡</button>
                                    <button class="act-btn del-btn" title="حذف الحصة" (click)="removeEntry(entry)">×</button>
                                  </div>
                                </div>
                                <div class="l-meta">
                                  <span class="l-teach" [title]="teacherName(entry.teacher)">
                                    👨‍🏫 {{ teacherName(entry.teacher) }}
                                  </span>
                                  @if (entry.room_id && entry.room_id !== '00000000-0000-0000-0000-000000000000') {
                                    <span class="l-room">📍 {{ roomName(entry.room_id) }}</span>
                                  }
                                </div>
                              </div>
                            } @else {
                              <div class="empty-slot" (click)="openAdd(d.idx, p.id, selectedSectionId())">
                                <span class="plus-sign">+</span>
                                <span class="add-hint">حجز حصة</span>
                              </div>
                            }
                          </td>
                        }
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </nb-panel>
        }


        <!-- صف التحليلات والأنصبة السفلية -->
        <div class="bento-grid">
          <nb-panel title="العبء التدريسي وتوزيع الحصص للمعلمين">
            <div class="loads-container">
              @for (r of loadRows(); track r.id) {
                <div class="load-row">
                  <div class="lr-info">
                    <span class="lr-name" [title]="r.name">{{ r.name }}</span>
                    <span class="lr-val mono">{{ r.assigned }} / {{ r.max }} حصة</span>
                  </div>
                  <div class="lr-bar">
                    <div class="lr-fill" [class.hot]="r.pct >= 90" [class.mid]="r.pct >= 70 && r.pct < 90" [style.width.%]="r.pct"></div>
                  </div>
                </div>
              }
            </div>
          </nb-panel>

          <nb-panel title="تغطية أنصبة المواد على الشعب">
            <div class="dists-container">
              @for (d of distributions(); track d.id) {
                <div class="dist-row">
                  <div class="dr-info">
                    <span class="dr-name">{{ subjectName(d.subject_id) }}</span>
                    <span class="dr-val mono">{{ d.distributed_periods || 0 }} / {{ d.total_required_periods || 0 }}</span>
                  </div>
                  <div class="dr-bar">
                    <div class="dr-fill" [style.width.%]="distPct(d)"></div>
                  </div>
                </div>
              }
              @if (!distributions().length) {
                <p class="empty-hint">لا توجد خطط توزيع أنصبة مضافة حالياً.</p>
              }
            </div>
          </nb-panel>
        </div>
      }

      <!-- ======================================================== -->
      <!-- مودال التوليد الذكي لكامل المدرسة (AI Auto-Scheduler)    -->
      <!-- ======================================================== -->
      <nb-modal
        [open]="autoGenOpen()"
        title="التوليد الآلي الذكي لجدول المدرسة الكامل"
        subtitle="محرك الجدولة الذكي لتوزيع الحصص الأسبوعية تلقائياً لكافة فصول المدرسة مع فحص القيود والتعارضات."
        maxWidth="580px"
        (closed)="autoGenOpen.set(false)"
      >
        <div class="gen-modal-body">
          <div class="callout-info">
            <div class="co-icon">⚡</div>
            <div class="co-txt">
              <strong>قواعد الجدولة المعتمدة للمدرسة:</strong>
              <ul>
                <li>أيام الأسبوع السودانية: <strong>الأحد إلى الخميس</strong> (الجمعة والسبت عطلة).</li>
                <li>توزيع المواد الأساسية (الرياضيات، اللغة العربية، العلوم) في الفترات الصباحية (الحصص 1 إلى 4).</li>
                <li>منع التعارض الصارم: لا يمكن للمعلم أو الفصل أو المعمل التواجد في مكانين بنفس الحصة.</li>
                <li>المحافظة على الحد الأقصى لساعات المعلم اليومية (لا تزيد عن 5 إلى 6 حصص).</li>
              </ul>
            </div>
          </div>

          <div class="form-check-card">
            <label class="check-lbl">
              <input type="checkbox" [(ngModel)]="autoGenClearExisting" />
              <span><strong>مسح الحصص الحالية والبدء من الصفر</strong> (إعادة جدولة نظيفة لكامل المدرسة).</span>
            </label>
          </div>

          @if (autoGenResult()) {
            <div class="gen-result" [class.success]="autoGenResult().success">
              <span class="gr-icon">{{ autoGenResult().success ? '✓' : '⚠️' }}</span>
              <div class="gr-body">
                <strong>{{ autoGenResult().message }}</strong>
                @if (autoGenResult().unplaced && autoGenResult().unplaced.length) {
                  <p class="gr-sub">تنبيه: تعذّر تسكين {{ autoGenResult().unplaced.length }} حصة بسبب اكتمال نصاب المعلمين.</p>
                }
              </div>
            </div>
          }
        </div>

        <div modal-actions>
          <button class="nb-btn-secondary" (click)="autoGenOpen.set(false)">إغلاق</button>
          <button class="nb-btn-primary" (click)="runAutoGenerate()" [disabled]="autoGenRunning()">
            {{ autoGenRunning() ? 'جارٍ الجدولة الذكية…' : 'بدء التوليد الآلي الشامل 🚀' }}
          </button>
        </div>
      </nb-modal>

      <!-- ======================================================== -->
      <!-- مودال التبديل الذكي بين الحصص (Smart Swap Confirmation) -->
      <!-- ======================================================== -->
      <nb-modal
        [open]="swapModalOpen()"
        title="تأكيد التبديل التبادلي الذكي بين الحصتين (Smart Swap)"
        subtitle="تم إسقاط الحصة فوق موضع مشغول — هل ترغب بتبادل الخانتين بين المعلمين والفصلين؟"
        maxWidth="540px"
        (closed)="swapModalOpen.set(false)"
      >
        @if (swapCandidate(); as swap) {
          <div class="swap-body">
            <div class="swap-cards-grid">
              <div class="swap-item from">
                <span class="si-title">الحصة الأولى المنقولة</span>
                <strong class="si-sub">{{ subjectName(swap.e1.subject_id) }}</strong>
                <span class="si-meta">المعلم: {{ teacherName(swap.e1.teacher) }}</span>
                <span class="si-loc">فصل: {{ sectionName(swap.e1.grade_section_id) }}</span>
              </div>
              <div class="swap-arrow">⇄</div>
              <div class="swap-item to">
                <span class="si-title">الحصة الثانية الحالية</span>
                <strong class="si-sub">{{ subjectName(swap.e2.subject_id) }}</strong>
                <span class="si-meta">المعلم: {{ teacherName(swap.e2.teacher) }}</span>
                <span class="si-loc">فصل: {{ sectionName(swap.e2.grade_section_id) }}</span>
              </div>
            </div>

            @if (swapErrors().length) {
              <div class="conflicts-alert" role="alert">
                <strong>تعذّر التبديل لوجود تعارضات:</strong>
                <ul>
                  @for (err of swapErrors(); track $index) { <li>{{ err }}</li> }
                </ul>
              </div>
            }
          </div>
        }
        <div modal-actions>
          <button class="nb-btn-secondary" (click)="swapModalOpen.set(false)">إلغاء</button>
          <button class="nb-btn-primary" (click)="confirmSwap()" [disabled]="swapSubmitting()">
            {{ swapSubmitting() ? 'جارٍ الفحص والتنفيذ…' : 'تأكيد التبديل التبادلي ✓' }}
          </button>
        </div>
      </nb-modal>

      <!-- ======================================================== -->
      <!-- مودال إدارة حصص الاحتياط والانتظار (Daily Substitution)   -->
      <!-- ======================================================== -->
      <nb-modal
        [open]="substitutionModalOpen()"
        title="إدارة حصص الاحتياط والانتظار اليومي"
        subtitle="البحث الفوري عن المعلمين المتفرغين في المدرسة لتغطية غياب أو اعتذار المعلمين."
        maxWidth="640px"
        (closed)="substitutionModalOpen.set(false)"
      >
        <div class="sub-modal-body">
          <div class="sub-filter-row">
            <div class="sf-item">
              <label>اليوم</label>
              <select [(ngModel)]="subForm.day_of_week" (ngModelChange)="fetchSubstitutes()">
                @for (d of days; track d.idx) { <option [value]="d.idx">{{ d.label }}</option> }
              </select>
            </div>
            <div class="sf-item">
              <label>الحصة</label>
              <select [(ngModel)]="subForm.period_id" (ngModelChange)="fetchSubstitutes()">
                @for (p of teachingPeriods(); track p.id) { <option [value]="p.id">الحصة {{ p.period_number }}</option> }
              </select>
            </div>
            <div class="sf-item">
              <label>المعلم الغائب / المستأذن</label>
              <select [(ngModel)]="subForm.original_teacher_id" (ngModelChange)="fetchSubstitutes()">
                <option value="">— اختر المعلم —</option>
                @for (t of faculty(); track t.id) { <option [value]="t.id">{{ t.full_name_ar }}</option> }
              </select>
            </div>
          </div>

          <div class="candidates-section">
            <h4>قائمة المعلمين المتاحين للاحتياط في هذه الحصة (مرتبين بالأقل نصاباً):</h4>
            @if (loadingSubstitutes()) {
              <div class="sub-loading">جارٍ البحث في شبكة التفرغ…</div>
            } @else if (!availableSubstitutes().length) {
              <div class="sub-empty">لا يوجد معلمون متفرغون تماماً في هذه الحصة.</div>
            } @else {
              <div class="candidates-list">
                @for (sub of availableSubstitutes(); track sub.id) {
                  <div class="candidate-card">
                    <div class="c-info">
                      <strong class="c-name">{{ sub.name }}</strong>
                      <span class="c-dept">{{ sub.department || 'معلم' }}</span>
                      <span class="c-load mono">النصاب: {{ sub.assigned_hours }}/{{ sub.max_hours }} حصة</span>
                    </div>
                    <button class="nb-btn-primary xs-btn" (click)="assignSubstitute(sub)">
                      تكليف كبديل ✓
                    </button>
                  </div>
                }
              </div>
            }
          </div>

          <!-- قائمة الاحتياط المكلفة لليوم -->
          @if (substitutions().length) {
            <div class="today-subs">
              <h4>سجل تكليفات الاحتياط المعتمدة لليوم:</h4>
              <div class="sub-records">
                @for (s of substitutions(); track s.id) {
                  <div class="sub-record-card">
                    <span class="sr-badge">حصة معتمدة</span>
                    <span class="sr-txt">المعلم البديل: <strong>{{ s.substitute_teacher_name || 'بديل' }}</strong></span>
                    <span class="sr-orig">عن الأستاذ: {{ s.original_teacher_name || 'المعلم الأصلي' }}</span>
                    <button class="act-btn del-btn" title="إلغاء التكليف" (click)="removeSubstitution(s.id)">×</button>
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <div modal-actions>
          <button class="nb-btn-secondary" (click)="substitutionModalOpen.set(false)">إغلاق</button>
        </div>
      </nb-modal>

      <!-- ======================================================== -->
      <!-- معالج إنشاء الجدول الأكاديمي الإلزامي (Nebras Multi-Step Wizard)-->
      <!-- ======================================================== -->
      <nb-modal
        [open]="wizardOpen()"
        title="معالج إعداد الجدول الأكاديمي الموحد للمدرسة"
        subtitle="إنشاء وهيكلة جدول الحصص الأسبوعي وضبط مواقيت الفترات والاعتماد الرسمي."
        maxWidth="680px"
        (closed)="wizardOpen.set(false)"
      >
        <div class="wizard-wrap">
          <nb-stepper [steps]="wizardSteps" [current]="wizardCurrentStep() + 1"></nb-stepper>

          <div class="wizard-body-step">
            <!-- الخطوة 1: الهوية والعام الدراسي -->
            @if (wizardCurrentStep() === 0) {
              <div class="step-form">
                <h3>1. البيانات الأساسية للجدول المدرسي</h3>
                <div class="form-grid">
                  <div class="form-field full">
                    <label>مسمى الجدول الأكاديمي</label>
                    <input [(ngModel)]="wizardForm.name" placeholder="مثال: الجدول العام للفصل الأول 2026/2027" />
                  </div>
                  <div class="form-field">
                    <label>العام الدراسي</label>
                    <input [(ngModel)]="wizardForm.academic_year" placeholder="مثال: 2026/2027" />
                  </div>
                  <div class="form-field">
                    <label>الفصل الدراسي (الترم)</label>
                    <select [(ngModel)]="wizardForm.term">
                      <option value="الفصل الدراسي الأول">الفصل الدراسي الأول</option>
                      <option value="الفصل الدراسي الثاني">الفصل الدراسي الثاني</option>
                      <option value="الفترة الصيفية">الفترة الصيفية</option>
                    </select>
                  </div>
                </div>
              </div>
            }

            <!-- الخطوة 2: هيكل اليوم المدرسي والحصص -->
            @if (wizardCurrentStep() === 1) {
              <div class="step-form">
                <h3>2. هيكل اليوم المدرسي والحصص الزمنية</h3>
                <div class="form-grid">
                  <div class="form-field">
                    <label>عدد الحصص اليومية</label>
                    <select [(ngModel)]="wizardForm.periods_count">
                      <option [value]="6">6 حصص يومياً</option>
                      <option [value]="7">7 حصص يومياً (المعيار المعتمد)</option>
                      <option [value]="8">8 حصص يومياً</option>
                    </select>
                  </div>
                  <div class="form-field">
                    <label>وقت طابور الصباح / بداية الحصة الأولى</label>
                    <input type="time" [(ngModel)]="wizardForm.start_time" />
                  </div>
                  <div class="form-field">
                    <label>مدة الحصة الدراسية (دقيقة)</label>
                    <select [(ngModel)]="wizardForm.period_duration">
                      <option [value]="40">40 دقيقة</option>
                      <option [value]="45">45 دقيقة (المعيار المعتمد)</option>
                      <option [value]="50">50 دقيقة</option>
                    </select>
                  </div>
                  <div class="form-field">
                    <label>مدة الفسحة الكبرى (دقيقة)</label>
                    <select [(ngModel)]="wizardForm.break_duration">
                      <option [value]="25">25 دقيقة</option>
                      <option [value]="30">30 دقيقة</option>
                      <option [value]="40">40 دقيقة</option>
                    </select>
                  </div>
                </div>
              </div>
            }

            <!-- الخطوة 3: المراحل والشعب والأنصبة -->
            @if (wizardCurrentStep() === 2) {
              <div class="step-form">
                <h3>3. تحديد المراحل والشعب الدراسية</h3>
                <div class="stages-summary">
                  <p class="text-sm">سيتم تفعيل الجدولة لكافة الشعب المسجلة في النظام تلقائياً:</p>
                  <div class="stages-pills">
                    @for (st of stages(); track st.id) {
                      <div class="stage-pill">
                        <strong>{{ st.name }}</strong>
                        <span class="sp-count">{{ sectionsForStage(st.id).length }} شعبة</span>
                      </div>
                    }
                  </div>
                  <div class="note-box">
                    عدد الشعب الدراسية الإجمالي: <strong>{{ sections().length }} شعبة</strong> · عدد المعلمين الجاهزين: <strong>{{ faculty().length }} معلم</strong>
                  </div>
                </div>
              </div>
            }

            <!-- الخطوة 4: المراجعة والتأكيد الشاملة -->
            @if (wizardCurrentStep() === 3) {
              <div class="step-form">
                <h3>4. المراجعة والتأكيد الأكاديمي الشامل</h3>
                <div class="review-card">
                  <div class="rc-item"><span class="rc-k">اسم الجدول:</span><span class="rc-v">{{ wizardForm.name }}</span></div>
                  <div class="rc-item"><span class="rc-k">العام الدراسي:</span><span class="rc-v">{{ wizardForm.academic_year }} · {{ wizardForm.term }}</span></div>
                  <div class="rc-item"><span class="rc-k">نظام الحصص:</span><span class="rc-v">{{ wizardForm.periods_count }} حصص يومياً (مدة الحصة {{ wizardForm.period_duration }} دقيقة)</span></div>
                  <div class="rc-item"><span class="rc-k">الشعب المشمولة:</span><span class="rc-v">{{ sections().length }} شعبة دراسية</span></div>
                  <div class="rc-item"><span class="rc-k">الهيئة التدريسية:</span><span class="rc-v">{{ faculty().length }} معلماً معتمداً</span></div>
                  <div class="rc-item"><span class="rc-k">جهة الاعتماد:</span><span class="rc-v">{{ sudanBrand.ministry }}</span></div>
                </div>
              </div>
            }

            <!-- الخطوة 5: الاكتمال والاعتماد والطباعة الرسمية داخل المودال نفسه -->
            @if (wizardCurrentStep() === 4) {
              <div class="step-form success-step">
                <div class="success-badge-anim">✓</div>
                <h3 class="success-title">اكتمال اعتماد ونشر الجدول الأكاديمي بنجاح!</h3>
                <p class="success-sub">تم حفظ وتثبيت الجدول المدرسي في السجل المركزي، وجاهز للطباعة والتعميم الرسمي.</p>

                <div class="official-doc-card">
                  <div class="odc-head">
                    <span>{{ sudanBrand.republic }}</span>
                    <span>{{ sudanBrand.ministry }}</span>
                  </div>
                  <div class="odc-body">
                    <div class="odc-title">{{ wizardCreatedData()?.name || wizardForm.name }}</div>
                    <div class="odc-grid">
                      <div><span class="odc-k">رقم الاعتماد:</span> <strong class="mono">TT-{{ activeTimetable()?.id?.slice(0, 8) || '2026-001' }}</strong></div>
                      <div><span class="odc-k">العام الدراسي:</span> <strong>{{ wizardForm.academic_year }}</strong></div>
                      <div><span class="odc-k">الحالة:</span> <span class="badge-active">معتمد ومنشور</span></div>
                      <div><span class="odc-k">تاريخ النفاذ:</span> <strong>{{ todayFormatted }}</strong></div>
                    </div>
                  </div>
                </div>

                <div class="success-print-action">
                  <button class="nb-btn-secondary" (click)="openPrintDrawer('master')">
                    🖨️ طباعة المستند الرسمي للجدول (A4/A3)
                  </button>
                </div>
              </div>
            }
          </div>
        </div>

        <div modal-actions>
          @if (wizardCurrentStep() > 0 && wizardCurrentStep() < 4) {
            <button class="nb-btn-secondary" (click)="wizardPrev()">السابق</button>
          }
          @if (wizardCurrentStep() < 3) {
            <button class="nb-btn-primary" (click)="wizardNext()">التالي ←</button>
          } @else if (wizardCurrentStep() === 3) {
            <button class="nb-btn-primary" (click)="wizardSubmit()" [disabled]="wizardSubmitting()">
              {{ wizardSubmitting() ? 'جارٍ الاعتماد والتثبيت…' : 'تأكيد واعتماد الجدول الأكاديمي ✓' }}
            </button>
          } @else {
            <button class="nb-btn-primary" (click)="wizardFinish()">✓ إنهاء وإغلاق</button>
          }
        </div>
      </nb-modal>

      <!-- ======================================================== -->
      <!-- درج الطباعة المدرسية الرسمية (Official Document Drawer)    -->
      <!-- ======================================================== -->
      <nb-drawer
        [open]="printDrawerOpen()"
        [width]="840"
        title="طباعة وتصدير الجداول المدرسية الرسمية"
        subtitle="مستندات معتمدة وفق اشتراطات وزارة التعليم والتربية الوطنية — جمهورية السودان."
        (closed)="printDrawerOpen.set(false)"
      >
        <div class="print-drawer-content">
          <div class="print-actions-bar">
            <div class="pt-selector">
              <label>نوع المستند المراد طباعته:</label>
              <select [(ngModel)]="printDocumentType">
                <option value="master">الجدول العام للمدرسة (Master Timetable)</option>
                <option value="section">جدول الفصل لحائط الصف (Classroom Wall)</option>
                <option value="teacher">جدول المعلم الأسبوعي (Teacher Pocket)</option>
              </select>
            </div>
            <button class="nb-btn-primary" (click)="triggerBrowserPrint()">
              🖨️ طباعة الآن (A4 / A3)
            </button>
          </div>

          <!-- ورقة المستند الرسمي للطباعة -->
          <div class="official-sheet-preview" id="official-print-area">
            <div class="sheet-header">
              <div class="sh-right">
                <span>{{ sudanBrand.republic }}</span>
                <span>{{ sudanBrand.ministry }}</span>
                <span>إدارة التعليم الخاص والأهلي</span>
              </div>
              <div class="sh-center">
                <div class="sh-logo-box">🏛️</div>
                <h2 class="sh-school">{{ sudanBrand.schoolName }}</h2>
                <div class="sh-sheet-title">
                  {{ printDocumentType === 'master' ? 'الجدول الأكاديمي العام للمدرسة' : (printDocumentType === 'section' ? ('جدول الفصل الدراسي: ' + activeSectionName()) : 'الجدول التدريسي الأسبوعي للمعلم') }}
                </div>
              </div>
              <div class="sh-left">
                <span>العام: {{ activeTimetable()?.academic_year || '2026/2027' }}</span>
                <span>الفصل: {{ activeTimetable()?.term || 'الأول' }}</span>
                <span>التاريخ: {{ todayFormatted }}</span>
              </div>
            </div>

            <!-- جدول المعاينة المطبوع -->
            <div class="sheet-table-wrap">
              <table class="sheet-table" dir="rtl">
                <thead>
                  <tr>
                    <th>اليوم / الحصة</th>
                    @for (p of teachingPeriods(); track p.id) {
                      <th>الحصة {{ p.period_number }}<br><small class="mono">{{ fmt(p.start_time) }}</small></th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (d of days; track d.idx) {
                    <tr>
                      <td class="st-day"><strong>{{ d.label }}</strong></td>
                      @for (p of teachingPeriods(); track p.id) {
                        <td class="st-cell">
                          @if (cellEntryFor(d.idx, selectedSectionId(), p.id); as e) {
                            <div class="st-lesson">
                              <strong>{{ subjectName(e.subject_id) }}</strong>
                              <small>{{ teacherName(e.teacher) }}</small>
                            </div>
                          } @else {
                            <span class="st-dash">—</span>
                          }
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- تذييل التوقيعات الرسمية والاعتماد -->
            <div class="sheet-footer">
              <div class="sf-sig">
                <span>المشرف الأكاديمي</span>
                <span class="sig-line">............................</span>
              </div>
              <div class="sf-sig">
                <span>ختم المدرسة الرسمي</span>
                <div class="seal-box">[ الختم المعتمد ]</div>
              </div>
              <div class="sf-sig">
                <span>مدير المدرسة</span>
                <span class="sig-line">............................</span>
              </div>
            </div>
          </div>
        </div>

        <div drawer-actions>
          <button class="nb-btn-secondary" (click)="printDrawerOpen.set(false)">إغلاق المعاينة</button>
          <button class="nb-btn-primary" (click)="triggerBrowserPrint()">🖨️ طباعة المستند الرسمي</button>
        </div>
      </nb-drawer>

      <!-- ======================================================== -->
      <!-- نافذة الإضافة اليدوية السريعة لحصة مفردة                 -->
      <!-- ======================================================== -->
      @if (addOpen()) {
        <div class="modal-scrim" (click)="closeAdd()">
          <div class="modal" dir="rtl" (click)="$event.stopPropagation()">
            <div class="modal-head">
              <h3>إضافة حصة دراسية ذكية</h3>
              <button class="modal-x" (click)="closeAdd()">×</button>
            </div>
            <div class="modal-body">
              <div class="m-grid">
                <div class="fld">
                  <label>الشعبة / الفصل</label>
                  <select [(ngModel)]="addForm.section_id">
                    @for (s of sections(); track s.id) { <option [value]="s.id">{{ s.name }} ({{ gradeName(s.grade) }})</option> }
                  </select>
                </div>
                <div class="fld">
                  <label>اليوم الدراسي</label>
                  <select [(ngModel)]="addForm.day_of_week">
                    @for (d of days; track d.idx) { <option [value]="d.idx">{{ d.label }}</option> }
                  </select>
                </div>
                <div class="fld">
                  <label>الحصة</label>
                  <select [(ngModel)]="addForm.period_id">
                    @for (p of teachingPeriods(); track p.id) { <option [value]="p.id">الحصة {{ p.period_number }} ({{ fmt(p.start_time) }})</option> }
                  </select>
                </div>
                <div class="fld">
                  <label>المادة الدراسية</label>
                  <select [(ngModel)]="addForm.subject_id">
                    <option value="">— اختر المادة —</option>
                    @for (s of subjects(); track s.id) { <option [value]="s.id">{{ s.arabic_name || s.name || s.english_name }}</option> }
                  </select>
                </div>
                <div class="fld full">
                  <label>المعلم المسند</label>
                  <select [(ngModel)]="addForm.teacher_id">
                    <option value="">— اختر المعلم —</option>
                    @for (t of faculty(); track t.id) { <option [value]="t.id">{{ t.full_name_ar }} ({{ t.department || 'معلم' }})</option> }
                  </select>
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
              <button class="nb-btn-primary" (click)="submitAdd()" [disabled]="submitting() || !addForm.teacher_id || !addForm.subject_id || !addForm.period_id">
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
    .mono { font-variant-numeric: tabular-nums; }
    .text-center { text-align: center; }
    .py-6 { padding-top: 24px; padding-bottom: 24px; }
    .text-muted { color: var(--nb-text-muted); }
    .btn-icon { font-size: 15px; margin-inline-end: 4px; }

    /* Hero Banner */
    .hero {
      position: relative; overflow: hidden;
      background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%);
      border-radius: var(--nb-radius-card, 16px); padding: 22px 26px; margin-bottom: 16px;
      display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap;
      box-shadow: 0 10px 28px rgba(30, 58, 138, 0.18);
    }
    .hero-glow { position: absolute; inset-inline-start: -60px; top: -60px; width: 220px; height: 220px; background: rgba(255,255,255,0.12); border-radius: 50%; filter: blur(12px); }
    .hero-main { position: relative; display: flex; flex-direction: column; gap: 6px; color: #fff; }
    .hero-tags { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .hero-badge { font-size: 11px; font-weight: 700; background: rgba(255,255,255,0.22); padding: 3px 10px; border-radius: 999px; }
    .hero-badge-sec { font-size: 11px; background: rgba(0,0,0,0.18); padding: 3px 10px; border-radius: 999px; }
    .hero-badge-status { font-size: 11px; font-weight: 700; background: rgba(245, 158, 11, 0.3); border: 1px solid rgba(245, 158, 11, 0.5); padding: 3px 10px; border-radius: 999px; }
    .hero-badge-status.published { background: rgba(16, 185, 129, 0.28); border-color: rgba(16, 185, 129, 0.6); }
    .hero-title { margin: 2px 0 0; font-size: 24px; font-weight: 800; color: #fff; letter-spacing: -0.3px; }
    .hero-meta { font-size: 13px; color: rgba(255,255,255,0.88); display: flex; align-items: center; gap: 8px; }
    .sep { opacity: 0.6; }
    .hero-stats { position: relative; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .hero-ring { width: 78px; height: 78px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .hero-ring-in { width: 60px; height: 60px; border-radius: 50%; background: #1e3a8a; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .hr-pct { font-size: 19px; font-weight: 800; color: #fff; }
    .hr-lbl { font-size: 10px; color: rgba(255,255,255,0.8); }
    .hero-kpi { background: rgba(255,255,255,0.12); padding: 10px 16px; border-radius: 12px; display: flex; flex-direction: column; gap: 4px; min-width: 140px; }
    .hk-label { font-size: 11px; color: rgba(255,255,255,0.85); font-weight: 600; }
    .hk-val { font-size: 18px; font-weight: 800; color: #fff; }
    .hk-bar { height: 5px; background: rgba(255,255,255,0.25); border-radius: 3px; overflow: hidden; margin-top: 2px; }
    .hk-fill { height: 100%; background: #34d399; border-radius: 3px; transition: width 0.4s; }

    /* KPI Cards */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 16px; }
    .metric-card { position: relative; overflow: hidden; background: var(--nb-surface, #fff); border: 1px solid var(--nb-border, #e5e7eb); border-radius: 14px; padding: 16px 18px; display: flex; align-items: center; gap: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: transform 0.2s, box-shadow 0.2s; }
    .metric-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.06); }
    .metric-card::before { content: ''; position: absolute; inset-block-start: 0; inset-inline: 0; height: 3px; }
    .metric-card.total::before { background: #2563eb; }
    .metric-card.success::before { background: #10b981; }
    .metric-card.occ::before { background: #6366f1; }
    .metric-card.info::before { background: #0ea5e9; }
    .metric-card.warn::before { background: #f59e0b; }
    .m-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .m-icon svg { width: 22px; height: 22px; }
    .metric-card.total .m-icon { background: #eff6ff; color: #2563eb; }
    .metric-card.success .m-icon { background: #ecfdf5; color: #10b981; }
    .metric-card.occ .m-icon { background: #eef2ff; color: #6366f1; }
    .metric-card.info .m-icon { background: #f0f9ff; color: #0ea5e9; }
    .metric-card.warn .m-icon { background: #fffbeb; color: #f59e0b; }
    .m-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
    .metric-card .label { font-size: 12px; font-weight: 700; color: var(--nb-text-muted, #64748b); }
    .metric-card .value { font-size: 26px; font-weight: 800; color: var(--nb-text, #0f172a); line-height: 1.1; }
    .metric-card .value.success { color: #10b981; }
    .metric-card .value.info { color: #0ea5e9; }
    .metric-card .value.warn { color: #f59e0b; }
    .v-sub { font-size: 14px; font-weight: 600; color: var(--nb-text-muted); }
    .v-suffix { font-size: 14px; font-weight: 700; color: var(--nb-text-muted); }
    .occ-bar { height: 5px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin-top: 5px; }
    .occ-fill { height: 100%; background: #6366f1; border-radius: 3px; transition: width 0.4s; }
    .metric-card.occ.mid .occ-fill { background: #f59e0b; }
    .metric-card.occ.hot .occ-fill { background: #ef4444; }

    /* View Switcher Bar */
    .view-switcher-bar { background: var(--nb-surface, #fff); border: 1px solid var(--nb-border, #e5e7eb); border-radius: 14px; padding: 12px 16px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 12px; }
    .switch-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
    .tab-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border: 1px solid var(--nb-border, #e5e7eb); border-radius: 10px; background: #f8fafc; font-size: 13.5px; font-weight: 700; color: var(--nb-text-secondary, #334155); cursor: pointer; transition: all 0.2s; }
    .tab-btn:hover { background: #f1f5f9; border-color: #cbd5e1; }
    .tab-btn.active { background: #1e40af; color: #fff; border-color: #1e40af; box-shadow: 0 4px 12px rgba(30, 64, 175, 0.2); }
    .t-icon { font-size: 16px; }

    /* Filters */
    .quick-filters { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; padding-top: 8px; border-top: 1px solid var(--nb-border-soft, #f1f5f9); }
    .f-group { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--nb-text); }
    .f-group select { height: 36px; border: 1px solid var(--nb-border, #cbd5e1); border-radius: 8px; padding: 0 10px; font-size: 13px; font-family: inherit; background: #fff; outline: none; }
    .day-chips { display: flex; gap: 6px; }
    .day-chip { padding: 6px 12px; border: 1px solid var(--nb-border); border-radius: 8px; background: #fff; font-size: 12.5px; font-weight: 700; color: var(--nb-text-secondary); cursor: pointer; }
    .day-chip.active { background: #2563eb; color: #fff; border-color: #2563eb; }

    /* Matrix Table Layout */
    .matrix-header-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 10px; flex-wrap: wrap; }
    .hint-text { font-size: 12.5px; color: var(--nb-text-muted, #64748b); font-weight: 600; }
    .matrix-scroll { overflow-x: auto; border: 1px solid var(--nb-border, #e5e7eb); border-radius: 12px; background: #fff; }
    .matrix-table { width: 100%; border-collapse: collapse; min-width: 900px; }
    .matrix-table th { background: #f8fafc; padding: 12px 10px; border-bottom: 1px solid var(--nb-border, #e5e7eb); border-inline-end: 1px solid var(--nb-border-soft, #f1f5f9); font-size: 12.5px; font-weight: 700; color: var(--nb-text); text-align: center; }
    .matrix-table td { padding: 8px; border-bottom: 1px solid var(--nb-border, #e5e7eb); border-inline-end: 1px solid var(--nb-border-soft, #f1f5f9); vertical-align: top; }
    .col-section { width: 160px; text-align: start !important; background: #f1f5f9 !important; }
    .col-teacher { width: 180px; text-align: start !important; background: #f1f5f9 !important; }
    .col-load { width: 80px; }
    .col-period { min-width: 120px; }
    .col-day { width: 130px; text-align: start !important; background: #f1f5f9 !important; }
    .p-head { display: flex; flex-direction: column; gap: 2px; }
    .p-num { font-size: 13px; font-weight: 800; color: #0f172a; }
    .p-time { font-size: 11px; color: var(--nb-text-muted); }

    .sec-cell { background: #fafafa; }
    .sec-badge { display: flex; flex-direction: column; gap: 2px; }
    .sec-name { font-size: 13.5px; font-weight: 800; color: #1e3a8a; }
    .sec-grade { font-size: 11px; color: var(--nb-text-muted); }

    .teacher-cell { background: #fafafa; }
    .t-badge { display: flex; flex-direction: column; gap: 2px; }
    .t-name { font-size: 13.5px; font-weight: 800; color: #0f172a; }
    .t-dept { font-size: 11px; color: var(--nb-text-muted); }
    .t-load-pill { font-size: 11.5px; font-weight: 700; background: #f1f5f9; padding: 4px 8px; border-radius: 6px; text-align: center; }
    .t-load-pill.warn { background: #fee2e2; color: #dc2626; }

    .day-cell { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; }
    .day-ar { font-size: 14px; font-weight: 800; color: #1e3a8a; }
    .day-sub { font-size: 11px; color: var(--nb-text-muted); text-transform: uppercase; }

    /* Sections Quick Pills Bar */
    .sections-quick-pills { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; }
    .pills-title { font-size: 12.5px; font-weight: 800; color: #1e3a8a; white-space: nowrap; }
    .pills-scroll { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; flex: 1; }
    .sec-pill-btn { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border: 1px solid #cbd5e1; border-radius: 999px; background: #fff; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
    .sec-pill-btn:hover { background: #eff6ff; border-color: #93c5fd; }
    .sec-pill-btn.active { background: #1e40af; border-color: #1e40af; color: #fff; box-shadow: 0 4px 12px rgba(30, 64, 175, 0.25); }
    .sp-name { font-size: 13px; font-weight: 800; }
    .sp-grade { font-size: 11px; opacity: 0.8; }
    .sp-count { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 999px; background: #f1f5f9; color: #475569; }
    .sec-pill-btn.active .sp-count { background: rgba(255,255,255,0.22); color: #fff; }
    .sp-count.full { background: #dcfce7; color: #166534; }

    /* Break & Recess Column (عمود الفسحة والاستراحة المدرسية) */
    .col-break { width: 90px; background: #fefce8 !important; border-inline: 2px solid #fef08a !important; }
    .break-head { align-items: center; color: #854d0e; }
    .break-cell { background: #fefce8; border-inline: 2px solid #fef08a; vertical-align: middle !important; text-align: center; }
    .break-box { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 12px 2px; }
    .break-icon { font-size: 20px; }
    .break-title { font-size: 11px; font-weight: 800; color: #854d0e; writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); }

    /* Empty Schedule Banner */
    .empty-schedule-banner { display: flex; align-items: center; gap: 16px; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px; }
    .esb-icon { font-size: 36px; }
    .esb-content { flex: 1; }
    .esb-content h4 { margin: 0 0 4px; font-size: 15px; font-weight: 800; color: #1e3a8a; }
    .esb-content p { margin: 0; font-size: 13px; color: #334155; line-height: 1.4; }
    .esb-actions { display: flex; gap: 10px; }
    .auto-action-btn { background: linear-gradient(135deg, #2563eb, #1d4ed8); font-weight: 800; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25); }

    /* Lesson Card on Grid */
    .slot-cell { position: relative; min-height: 68px; background: #fff; transition: background 0.15s; }
    .slot-cell.drag-over { background: #eff6ff !important; outline: 2px dashed #2563eb; }

    .lesson-card {
      border-radius: 8px; padding: 8px 10px; display: flex; flex-direction: column; gap: 4px;
      background: color-mix(in srgb, var(--tone, #2563eb) 12%, #fff);
      border-inline-start: 4px solid var(--tone, #2563eb);
      box-shadow: 0 1px 2px rgba(0,0,0,0.05); cursor: grab; transition: transform 0.15s, box-shadow 0.15s;
    }
    .lesson-card:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0,0,0,0.08); }
    .l-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 4px; }
    .l-sub-name { font-size: 12.5px; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .l-actions { display: flex; gap: 2px; }
    .act-btn { width: 20px; height: 20px; border-radius: 4px; border: none; background: rgba(0,0,0,0.06); color: #475569; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .act-btn.del-btn:hover { background: #fee2e2; color: #dc2626; }
    .act-btn.sub-btn:hover { background: #fef3c7; color: #d97706; }
    .l-meta { display: flex; flex-direction: column; gap: 1px; font-size: 11px; color: #475569; }
    .l-teach { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .l-room { font-size: 10px; color: var(--nb-text-muted); }
    .l-sec-name { font-size: 11.5px; font-weight: 700; color: #1e3a8a; }

    /* Empty & Free Slots */
    .empty-slot { min-height: 54px; border: 1px dashed #e2e8f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 18px; cursor: pointer; transition: all 0.15s; }
    .empty-slot:hover { background: #f8fafc; border-color: #2563eb; color: #2563eb; }
    .free-slot { min-height: 54px; background: #f0fdf4; border: 1px dashed #86efac; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; cursor: pointer; transition: all 0.15s; }
    .free-slot:hover { background: #dcfce7; border-color: #22c55e; }
    .free-label { font-size: 11px; font-weight: 700; color: #16a34a; }
    .sub-assign-tag { font-size: 10px; font-weight: 600; color: #047857; background: rgba(22, 163, 74, 0.12); padding: 1px 6px; border-radius: 4px; }
    .free-facility-slot { min-height: 54px; background: #fafafa; border: 1px solid #f1f5f9; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #94a3b8; }

    /* Bento Analytics */
    .bento-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
    @media (max-width: 860px) { .bento-grid { grid-template-columns: 1fr; } }
    .loads-container, .dists-container { display: flex; flex-direction: column; gap: 10px; }
    .load-row, .dist-row { display: flex; flex-direction: column; gap: 4px; }
    .lr-info, .dr-info { display: flex; justify-content: space-between; font-size: 12.5px; }
    .lr-name, .dr-name { font-weight: 600; color: #334155; }
    .lr-val, .dr-val { font-weight: 700; color: #0f172a; }
    .lr-bar, .dr-bar { height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
    .lr-fill { height: 100%; background: #2563eb; border-radius: 4px; transition: width 0.4s; }
    .lr-fill.mid { background: #f59e0b; } .lr-fill.hot { background: #ef4444; }
    .dr-fill { height: 100%; background: #10b981; border-radius: 4px; transition: width 0.4s; }
    .empty-hint { font-size: 12.5px; color: var(--nb-text-muted); }

    /* Buttons */
    .xs-btn { height: 32px; padding: 0 12px; font-size: 12px; }
    .warn-btn { border-color: #f59e0b; color: #b45309; }
    .auto-btn { background: linear-gradient(135deg, #7c3aed, #6d28d9); border-color: #6d28d9; }

    /* Modals & Forms */
    .gen-modal-body, .sub-modal-body, .wizard-wrap { display: flex; flex-direction: column; gap: 14px; }
    .callout-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; display: flex; gap: 12px; font-size: 13px; line-height: 1.5; color: #334155; }
    .callout-info ul { margin: 6px 0 0; padding-inline-start: 18px; }
    .co-icon { font-size: 24px; }
    .form-check-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; font-size: 13px; color: #166534; }
    .check-lbl { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .gen-result { padding: 12px; border-radius: 8px; display: flex; gap: 10px; align-items: center; font-size: 13px; background: #ecfdf5; border: 1px solid #10b981; color: #065f46; }

    .swap-cards-grid { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; }
    .swap-item { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 4px; }
    .swap-item.from { border-inline-start: 4px solid #2563eb; }
    .swap-item.to { border-inline-start: 4px solid #10b981; }
    .si-title { font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .si-sub { font-size: 14px; color: #0f172a; }
    .si-meta, .si-loc { font-size: 12px; color: #475569; }
    .swap-arrow { font-size: 24px; color: #64748b; text-align: center; }
    .conflicts-alert { background: #fee2e2; border: 1px solid #f87171; border-radius: 8px; padding: 10px 14px; color: #991b1b; font-size: 12.5px; margin-top: 12px; }
    .conflicts-alert ul { margin: 4px 0 0; padding-inline-start: 18px; }

    /* Substitution Modal */
    .sub-filter-row { display: grid; grid-template-columns: 1fr 1fr 1.5fr; gap: 12px; }
    .sf-item { display: flex; flex-direction: column; gap: 4px; }
    .sf-item label { font-size: 12px; font-weight: 700; color: #334155; }
    .sf-item select { height: 36px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 8px; font-size: 13px; }
    .candidates-section h4, .today-subs h4 { margin: 0 0 8px; font-size: 13.5px; font-weight: 800; color: #1e3a8a; }
    .candidates-list { display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto; }
    .candidate-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; }
    .c-info { display: flex; flex-direction: column; gap: 2px; }
    .c-name { font-size: 13px; color: #0f172a; }
    .c-dept { font-size: 11px; color: #64748b; }
    .c-load { font-size: 11px; color: #16a34a; font-weight: 700; }
    .today-subs { border-top: 1px solid #e2e8f0; padding-top: 12px; }
    .sub-records { display: flex; flex-direction: column; gap: 6px; }
    .sub-record-card { display: flex; align-items: center; gap: 10px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 8px 12px; font-size: 12.5px; }
    .sr-badge { font-size: 10px; font-weight: 800; background: #10b981; color: #fff; padding: 2px 6px; border-radius: 4px; }

    /* Multi-Step Wizard */
    .wizard-body-step { min-height: 260px; padding: 10px 0; }
    .step-form h3 { margin: 0 0 14px; font-size: 16px; font-weight: 800; color: #1e3a8a; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-field { display: flex; flex-direction: column; gap: 4px; }
    .form-field.full { grid-column: 1 / -1; }
    .form-field label { font-size: 12px; font-weight: 700; color: #334155; }
    .form-field input, .form-field select { height: 38px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 10px; font-size: 13px; font-family: inherit; }
    .stages-pills { display: flex; gap: 10px; flex-wrap: wrap; margin: 10px 0; }
    .stage-pill { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px 14px; display: flex; flex-direction: column; gap: 2px; }
    .sp-count { font-size: 11px; color: #1e40af; font-weight: 700; }
    .note-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; font-size: 12.5px; color: #334155; }
    .review-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .rc-item { display: flex; justify-content: space-between; font-size: 13px; }
    .rc-k { color: #64748b; font-weight: 600; }
    .rc-v { color: #0f172a; font-weight: 700; }

    /* Step 5: Success */
    .success-step { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 10px; }
    .success-badge-anim { width: 56px; height: 56px; border-radius: 50%; background: #10b981; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3); }
    .success-title { font-size: 18px; font-weight: 800; color: #065f46; margin: 4px 0 0; }
    .success-sub { font-size: 13px; color: #64748b; margin: 0; }
    .official-doc-card { width: 100%; max-width: 480px; background: #fff; border: 2px solid #1e3a8a; border-radius: 12px; margin: 12px 0; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
    .odc-head { background: #1e3a8a; color: #fff; padding: 10px 14px; font-size: 12px; font-weight: 700; display: flex; justify-content: space-between; }
    .odc-body { padding: 14px 16px; text-align: start; }
    .odc-title { font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 10px; }
    .odc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; }
    .odc-k { color: #64748b; }
    .badge-active { background: #dcfce7; color: #166534; font-weight: 700; padding: 2px 8px; border-radius: 4px; font-size: 11px; }

    /* Print Drawer & Official Sheet */
    .print-drawer-content { display: flex; flex-direction: column; gap: 14px; }
    .print-actions-bar { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 12px 16px; border-radius: 10px; border: 1px solid #e2e8f0; }
    .pt-selector { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; }
    .pt-selector select { height: 36px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 10px; font-size: 13px; }
    .official-sheet-preview { background: #fff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 28px; box-shadow: 0 6px 18px rgba(0,0,0,0.06); }
    .sheet-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
    .sh-right, .sh-left { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 600; color: #334155; }
    .sh-center { display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; }
    .sh-logo-box { font-size: 28px; }
    .sh-school { margin: 0; font-size: 18px; font-weight: 900; color: #1e3a8a; }
    .sh-sheet-title { font-size: 14px; font-weight: 800; background: #f1f5f9; padding: 3px 14px; border-radius: 999px; }
    .sheet-table-wrap { overflow-x: auto; margin-bottom: 24px; }
    .sheet-table { width: 100%; border-collapse: collapse; text-align: center; font-size: 12px; }
    .sheet-table th, .sheet-table td { border: 1px solid #334155; padding: 8px; }
    .sheet-table th { background: #f8fafc; font-weight: 800; }
    .st-day { background: #f8fafc; font-size: 13px; width: 110px; }
    .st-lesson { display: flex; flex-direction: column; gap: 2px; }
    .st-dash { color: #94a3b8; }
    .sheet-footer { display: flex; justify-content: space-between; align-items: flex-end; padding-top: 24px; }
    .sf-sig { display: flex; flex-direction: column; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: #334155; }
    .sig-line { color: #94a3b8; }
    .seal-box { width: 100px; height: 50px; border: 1px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 11px; }

    /* Single Lesson Add Scrim */
    .modal-scrim { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; }
    .modal { width: min(580px, 100%); background: #fff; border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.3); overflow: hidden; animation: mIn .2s ease-out; }
    @keyframes mIn { from { opacity: 0; transform: scale(.96) translateY(8px); } to { opacity: 1; transform: none; } }
    .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; }
    .modal-head h3 { margin: 0; font-size: 16px; font-weight: 800; color: #0f172a; }
    .modal-x { border: none; background: transparent; font-size: 22px; color: #64748b; cursor: pointer; }
    .modal-body { padding: 20px; }
    .m-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .fld { display: flex; flex-direction: column; gap: 4px; }
    .fld.full { grid-column: 1 / -1; }
    .fld label { font-size: 12px; font-weight: 700; color: #334155; }
    .fld select, .fld input { height: 36px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 10px; font-size: 13px; }
    .modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid #f1f5f9; background: #f8fafc; }
    .conflicts { margin-top: 12px; background: #fee2e2; border: 1px solid #f87171; border-radius: 8px; padding: 10px 14px; font-size: 12.5px; color: #991b1b; }
    .conflicts ul { margin: 4px 0 0; padding-inline-start: 18px; }
  `]
})
export class TimetableDashboardComponent implements OnInit {
  private svc = inject(TimetableService);

  readonly sudanBrand = SUDAN_BRAND;
  readonly todayFormatted = new Date().toLocaleDateString('ar-SD', { year: 'numeric', month: 'long', day: 'numeric' });

  // State Signals
  readonly loading = signal(true);
  readonly timetables = signal<any[]>([]);
  readonly entries = signal<any[]>([]);
  readonly periods = signal<any[]>([]);
  readonly loads = signal<any[]>([]);
  readonly distributions = signal<any[]>([]);
  readonly faculty = signal<any[]>([]);
  readonly subjects = signal<any[]>([]);
  readonly sections = signal<any[]>([]);
  readonly grades = signal<any[]>([]);
  readonly stages = signal<any[]>([]);
  readonly substitutions = signal<any[]>([]);

  // View Mode: 'section' | 'master' | 'teachers' | 'rooms' (الوضع الافتراضي: الجدول المدرسي المعتاد)
  readonly viewMode = signal<'section' | 'master' | 'teachers' | 'rooms'>('section');
  readonly selectedTimetableId = signal<string>('');
  readonly selectedDay = signal<number>(6); // الأحد
  readonly selectedStageId = signal<string>('all');
  readonly selectedSectionId = signal<string>('');

  // Drag and drop state
  private draggingEntry = signal<any | null>(null);
  readonly dragOverSlot = signal<{ sectionId: string; periodId: string } | null>(null);

  // Smart Swap State
  readonly swapModalOpen = signal(false);
  readonly swapCandidate = signal<{ e1: any; e2: any } | null>(null);
  readonly swapSubmitting = signal(false);
  readonly swapErrors = signal<string[]>([]);

  // AI Auto-Scheduler State
  readonly autoGenOpen = signal(false);
  readonly autoGenRunning = signal(false);
  autoGenClearExisting = false;
  readonly autoGenResult = signal<any | null>(null);

  // Daily Substitution State
  readonly substitutionModalOpen = signal(false);
  readonly loadingSubstitutes = signal(false);
  readonly availableSubstitutes = signal<any[]>([]);
  subForm = { day_of_week: 6, period_id: '', original_teacher_id: '' };

  // Official Print Drawer State
  readonly printDrawerOpen = signal(false);
  printDocumentType: 'master' | 'section' | 'teacher' = 'master';

  // Nebras Multi-Step Wizard Modal State
  readonly wizardOpen = signal(false);
  readonly wizardCurrentStep = signal(0);
  readonly wizardSubmitting = signal(false);
  readonly wizardCreatedData = signal<any | null>(null);
  readonly wizardSteps = [
    'البيانات الأساسية',
    'هيكل الحصص واليوم',
    'المراحل والشعب',
    'المراجعة والتأكيد',
    'الاعتماد والطباعة'
  ];
  wizardForm: any = {
    name: 'الجدول الأكاديمي العام للمدرسة — 2026/2027',
    academic_year: '2026/2027',
    term: 'الفصل الدراسي الأول',
    periods_count: 7,
    start_time: '07:30',
    period_duration: 45,
    break_duration: 30,
    auto_generate: true, // تفعيل التوليد الآلي الذكي افتراضياً
  };

  // Add Single Lesson Modal State
  readonly addOpen = signal(false);
  readonly submitting = signal(false);
  readonly conflicts = signal<any[]>([]);
  readonly addError = signal<string>('');
  addForm: any = { day_of_week: 6, period_id: '', teacher_id: '', subject_id: '', section_id: '' };

  // الحصص الدراسية الافتراضية المعتمدة في حال عدم ورودها من الخادم
  private readonly defaultPeriods = [
    { id: 'dp-1', period_number: 1, start_time: '07:30:00', end_time: '08:15:00', is_break: false },
    { id: 'dp-2', period_number: 2, start_time: '08:15:00', end_time: '09:00:00', is_break: false },
    { id: 'dp-3', period_number: 3, start_time: '09:00:00', end_time: '09:45:00', is_break: false },
    { id: 'dp-0', period_number: 0, start_time: '09:45:00', end_time: '10:15:00', is_break: true },
    { id: 'dp-4', period_number: 4, start_time: '10:15:00', end_time: '11:00:00', is_break: false },
    { id: 'dp-5', period_number: 5, start_time: '11:00:00', end_time: '11:45:00', is_break: false },
    { id: 'dp-6', period_number: 6, start_time: '11:45:00', end_time: '12:30:00', is_break: false },
    { id: 'dp-7', period_number: 7, start_time: '12:30:00', end_time: '13:15:00', is_break: false },
  ];

  // الأيام الدراسية السودانية (الأحد إلى الخميس)
  readonly days: DayOption[] = [
    { idx: 6, label: 'الأحد', en: 'Sunday' },
    { idx: 0, label: 'الاثنين', en: 'Monday' },
    { idx: 1, label: 'الثلاثاء', en: 'Tuesday' },
    { idx: 2, label: 'الأربعاء', en: 'Wednesday' },
    { idx: 3, label: 'الخميس', en: 'Thursday' },
  ];

  // القاعات والمعامل التخصصية للمدرسة
  readonly facilitiesList = [
    { id: 'facility-physics', name: 'معمل العلوم والفيزياء المتطور', capacity: 35, icon: '🔬' },
    { id: 'facility-comp-1', name: 'معمل الحاسوب والذكاء الاصطناعي (1)', capacity: 32, icon: '💻' },
    { id: 'facility-comp-2', name: 'معمل الحاسوب والتقانة (2)', capacity: 30, icon: '🖥️' },
    { id: 'facility-library', name: 'المكتبة المدرسية ومركز مصادر التعلم', capacity: 45, icon: '📚' },
    { id: 'facility-hall', name: 'المسرح المدرسي وقاعة الأنشطة الكبرى', capacity: 150, icon: '🎭' },
    { id: 'facility-sports', name: 'الميدان الرياضي والملاعب المغلقة', capacity: 60, icon: '⚽' },
  ];

  // ---------- Computed Properties ----------
  readonly activeTimetable = computed(() =>
    this.timetables().find((t) => t.status === 'published') ??
    this.timetables().find((t) => t.is_active) ??
    this.timetables()[0] ?? null
  );

  readonly effectivePeriods = computed(() => {
    const list = this.periods();
    if (list && list.length > 0) return list;
    return this.defaultPeriods;
  });

  readonly teachingPeriods = computed(() =>
    this.effectivePeriods().filter((p) => !p.is_break).sort((a, b) => a.period_number - b.period_number)
  );

  readonly breakPeriod = computed(() =>
    this.effectivePeriods().find((p) => p.is_break) ?? {
      id: 'dp-0', period_number: 0, start_time: '09:45:00', end_time: '10:15:00', is_break: true
    }
  );


  readonly activeTeachers = computed(() =>
    new Set(this.entries().map((e) => e.teacher).filter(Boolean)).size
  );

  readonly coveredSectionsCount = computed(() =>
    new Set(this.entries().map((e) => e.grade_section_id).filter(Boolean)).size
  );

  readonly schoolCompletionPct = computed(() => {
    const totalNeeded = this.sections().length * (this.teachingPeriods().length || 7) * 5;
    if (!totalNeeded) return 100;
    const current = this.entries().length;
    return Math.min(100, Math.round((current / totalNeeded) * 100));
  });

  readonly filteredSections = computed(() => {
    const stId = this.selectedStageId();
    if (stId === 'all') return this.sections();
    return this.sectionsForStage(stId);
  });

  readonly loadRows = computed(() =>
    this.loads().map((l) => {
      const assigned = l.assigned_weekly_hours ?? 0;
      const max = l.max_weekly_hours || 24;
      return {
        id: l.id,
        name: this.teacherName(l.teacher),
        assigned,
        max,
        pct: Math.min(100, Math.round((assigned / max) * 100))
      };
    }).sort((a, b) => b.pct - a.pct)
  );

  readonly avgTeacherLoad = computed(() => {
    const rows = this.loadRows();
    if (!rows.length) return 0;
    return Math.round(rows.reduce((n, r) => n + r.pct, 0) / rows.length);
  });

  readonly totalConflicts = computed(() => this.detectAllConflicts());

  // Fast Mappings
  private subjectMap = computed(() => new Map(this.subjects().map((s) => [String(s.id), s])));
  private teacherMap = computed(() => new Map(this.faculty().map((t) => [String(t.id), t])));
  private sectionMap = computed(() => new Map(this.sections().map((s) => [String(s.id), s])));
  private gradeMap = computed(() => new Map(this.grades().map((g) => [String(g.id), g])));

  ngOnInit(): void {
    this.load();
  }

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
      grades: this.svc.getGrades(),
      stages: this.svc.getStages(),
      substitutions: this.svc.getSubstitutions(),
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
        this.grades.set(pickList(r.grades));
        this.stages.set(pickList(r.stages));
        this.substitutions.set(pickList(r.substitutions));

        if (!this.selectedTimetableId()) {
          this.selectedTimetableId.set(this.activeTimetable()?.id ?? '');
        }
        if (!this.selectedSectionId() && this.sections().length) {
          this.selectedSectionId.set(this.sections()[0].id);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSelectTimetable(id: string): void {
    this.selectedTimetableId.set(id);
  }

  sectionEntriesCount(sectionId: string): number {
    const tt = this.selectedTimetableId();
    return this.entries().filter((e) =>
      (!tt || String(e.timetable) === String(tt) || String(e.timetable_id) === String(tt)) &&
      (String(e.grade_section_id) === String(sectionId) || String(e.section_id) === String(sectionId))
    ).length;
  }

  // ---------- Helpers & Lookups ----------
  entriesForTimetable(id: string): any[] {
    return this.entries().filter((e) => String(e.timetable) === String(id));
  }

  cellEntryFor(dayIdx: number, sectionId: string, periodId: string): any | null {
    const tt = this.selectedTimetableId();
    return this.entries().find((e) => {
      const matchTt = !tt || String(e.timetable) === String(tt) || String(e.timetable_id) === String(tt);
      const matchSec = String(e.grade_section_id) === String(sectionId) || String(e.section_id) === String(sectionId);
      const matchDay = Number(e.day_of_week) === Number(dayIdx);
      const matchPeriod = String(e.period) === String(periodId) || String(e.period_id) === String(periodId);
      return matchTt && matchSec && matchDay && matchPeriod;
    }) ?? null;
  }


  teacherEntryFor(teacherId: string, dayIdx: number, periodId: string): any | null {
    const tt = this.selectedTimetableId();
    return this.entries().find((e) =>
      String(e.timetable) === String(tt) &&
      String(e.teacher) === String(teacherId) &&
      e.day_of_week === dayIdx &&
      String(e.period) === String(periodId)
    ) ?? null;
  }

  roomEntryFor(roomId: string, dayIdx: number, periodId: string): any | null {
    const tt = this.selectedTimetableId();
    return this.entries().find((e) =>
      String(e.timetable) === String(tt) &&
      String(e.room_id) === String(roomId) &&
      e.day_of_week === dayIdx &&
      String(e.period) === String(periodId)
    ) ?? null;
  }

  subjectName(id: string): string {
    const s = this.subjectMap().get(String(id));
    return s?.arabic_name || s?.name || s?.name_ar || s?.english_name || 'مادة دراسية';
  }

  teacherName(id: string): string {
    const t = this.teacherMap().get(String(id));
    return t?.full_name_ar ?? t?.full_name_en ?? 'معلم';
  }

  roomName(id: string): string {
    const f = this.facilitiesList.find((x) => x.id === String(id));
    return f ? f.name : 'قاعة دراسية';
  }


  sectionName(id: string): string {
    return this.sectionMap().get(String(id))?.name ?? 'شعبة';
  }

  gradeName(idOrObj: any): string {
    const id = typeof idOrObj === 'object' ? idOrObj?.id : idOrObj;
    return this.gradeMap().get(String(id))?.name ?? 'الصف';
  }

  sectionsForStage(stageId: string): any[] {
    return this.sections().filter((s) => {
      const g = this.gradeMap().get(String(s.grade));
      return g && String(g.stage) === String(stageId);
    });
  }

  activeSectionName(): string {
    return this.sectionName(this.selectedSectionId());
  }

  dayLabel(dayIdx: number): string {
    return this.days.find((d) => d.idx === dayIdx)?.label ?? 'اليوم';
  }

  teacherAssignedHours(tId: string): number {
    const l = this.loads().find((x) => String(x.teacher) === String(tId));
    return l?.assigned_weekly_hours ?? 0;
  }

  teacherMaxHours(tId: string): number {
    const l = this.loads().find((x) => String(x.teacher) === String(tId));
    return l?.max_weekly_hours || 24;
  }

  teacherLoadPct(tId: string): number {
    const max = this.teacherMaxHours(tId);
    return max ? Math.round((this.teacherAssignedHours(tId) / max) * 100) : 0;
  }

  distPct(d: any): number {
    const req = d.total_required_periods || 0;
    return req ? Math.min(100, Math.round(((d.distributed_periods || 0) / req) * 100)) : 0;
  }

  fmt(t: string): string {
    return t ? String(t).slice(0, 5) : '';
  }

  private palette = ['#1e40af', '#0284c7', '#059669', '#7c3aed', '#d97706', '#dc2626', '#0891b2', '#4f46e5'];
  toneFor(subjectId: string): string {
    const ids = this.subjects().map((s) => String(s.id));
    const i = Math.max(0, ids.indexOf(String(subjectId)));
    return this.palette[i % this.palette.length];
  }

  conflictRingBg(): string {
    const c = this.totalConflicts();
    const color = c === 0 ? '#10b981' : c <= 3 ? '#f59e0b' : '#ef4444';
    const pct = c === 0 ? 100 : Math.min(100, c * 20);
    return `conic-gradient(${color} ${pct * 3.6}deg, rgba(255,255,255,.25) ${pct * 3.6}deg)`;
  }

  private detectAllConflicts(): number {
    const seenTeacher = new Set<string>();
    const seenRoom = new Set<string>();
    let conflicts = 0;
    for (const e of this.entries()) {
      const slot = `${e.timetable}|${e.day_of_week}|${e.period}`;
      const tk = `${slot}|t:${e.teacher}`;
      if (seenTeacher.has(tk)) conflicts++; else seenTeacher.add(tk);
      if (e.room_id && e.room_id !== '00000000-0000-0000-0000-000000000000') {
        const rk = `${slot}|r:${e.room_id}`;
        if (seenRoom.has(rk)) conflicts++; else seenRoom.add(rk);
      }
    }
    return conflicts;
  }

  // ---------- Drag and Drop & Smart Swap ----------
  onDragStart(entry: any): void {
    this.draggingEntry.set(entry);
  }

  onDragOver(event: DragEvent, sectionId: string, periodId: string): void {
    event.preventDefault();
    this.dragOverSlot.set({ sectionId, periodId });
  }

  onDragLeave(): void {
    this.dragOverSlot.set(null);
  }

  isDragOver(sectionId: string, periodId: string): boolean {
    const s = this.dragOverSlot();
    return !!s && s.sectionId === sectionId && s.periodId === periodId;
  }

  onDrop(sectionId: string, periodId: string): void {
    const entry = this.draggingEntry();
    this.dragOverSlot.set(null);
    this.draggingEntry.set(null);
    if (!entry) return;

    const targetOccupied = this.cellEntryFor(this.selectedDay(), sectionId, periodId);
    if (targetOccupied) {
      if (targetOccupied.id === entry.id) return;
      // فتح مودال التبديل الذكي التبادلي (Smart Swap)
      this.swapCandidate.set({ e1: entry, e2: targetOccupied });
      this.swapErrors.set([]);
      this.swapModalOpen.set(true);
      return;
    }

    // نقل الحصة إلى الخانة الفارغة
    this.svc.deleteEntry(entry.id).subscribe(() => {
      this.entries.update((list) => list.filter((x) => x.id !== entry.id));
      const body = {
        timetable_id: this.selectedTimetableId(),
        day_of_week: this.selectedDay(),
        period_id: periodId,
        teacher_id: entry.teacher,
        subject_id: entry.subject_id,
        room_id: entry.room_id || '00000000-0000-0000-0000-000000000000',
        grade_section_id: sectionId,
      };
      this.svc.validateEntry(body).subscribe((res) => {
        const created = res?.data;
        if (created?.id) this.entries.update((l) => [...l, created]);
        this.svc.getLoads().subscribe((r) => this.loads.set(pickList(r)));
      });
    });
  }

  confirmSwap(): void {
    const candidate = this.swapCandidate();
    if (!candidate) return;
    this.swapSubmitting.set(true);
    this.swapErrors.set([]);

    this.svc.swapEntries(candidate.e1.id, candidate.e2.id).subscribe({
      next: () => {
        this.swapSubmitting.set(false);
        this.swapModalOpen.set(false);
        // تبادل المواضع محلياً وإعادة تحميل القوائم
        this.load();
      },
      error: (err) => {
        this.swapSubmitting.set(false);
        const conflicts = err?.error?.data?.conflicts;
        if (Array.isArray(conflicts)) {
          this.swapErrors.set(conflicts);
        } else {
          this.swapErrors.set([err?.error?.message || 'تعذّر التبديل لوجود تعارض.']);
        }
      }
    });
  }

  // ---------- AI Auto-Scheduler Modal ----------
  openAutoGenModal(): void {
    this.autoGenResult.set(null);
    this.autoGenOpen.set(true);
  }

  runAutoGenerate(): void {
    const ttId = this.selectedTimetableId();
    if (!ttId) return;
    this.autoGenRunning.set(true);
    this.autoGenResult.set(null);

    this.svc.autoGenerate(ttId, this.autoGenClearExisting).subscribe({
      next: (res) => {
        this.autoGenRunning.set(false);
        this.autoGenResult.set(res?.data || { success: true, message: 'تمت الجدولة بنجاح.' });
        this.load();
      },
      error: (err) => {
        this.autoGenRunning.set(false);
        this.autoGenResult.set({ success: false, message: err?.error?.message || 'تعذّر التوليد الآلي.' });
      }
    });
  }

  // ---------- Daily Substitution Modal ----------
  openSubstitutionModal(): void {
    this.subForm = {
      day_of_week: this.selectedDay(),
      period_id: this.teachingPeriods()[0]?.id ?? '',
      original_teacher_id: '',
    };
    this.availableSubstitutes.set([]);
    this.substitutionModalOpen.set(true);
    this.fetchSubstitutes();
  }

  openSubstituteForEntry(entry: any): void {
    this.subForm = {
      day_of_week: entry.day_of_week,
      period_id: String(entry.period),
      original_teacher_id: String(entry.teacher),
    };
    this.substitutionModalOpen.set(true);
    this.fetchSubstitutes();
  }

  assignSubstituteQuick(teacher: any, dayIdx: number, periodId: string): void {
    this.subForm = {
      day_of_week: dayIdx,
      period_id: periodId,
      original_teacher_id: '',
    };
    this.substitutionModalOpen.set(true);
    this.fetchSubstitutes();
  }

  fetchSubstitutes(): void {
    const { day_of_week, period_id, original_teacher_id } = this.subForm;
    if (!period_id) return;
    this.loadingSubstitutes.set(true);
    this.svc.getAvailableSubstitutes({
      day_of_week,
      period_id,
      timetable_id: this.selectedTimetableId(),
      teacher_id: original_teacher_id || undefined
    }).subscribe({
      next: (res) => {
        this.availableSubstitutes.set(pickList(res));
        this.loadingSubstitutes.set(false);
      },
      error: () => this.loadingSubstitutes.set(false),
    });
  }

  assignSubstitute(subTeacher: any): void {
    const entry = this.entries().find((e) =>
      e.day_of_week === this.subForm.day_of_week &&
      String(e.period) === String(this.subForm.period_id) &&
      (!this.subForm.original_teacher_id || String(e.teacher) === String(this.subForm.original_teacher_id))
    );

    const body = {
      entry: entry?.id || this.entries()[0]?.id,
      original_teacher: this.subForm.original_teacher_id || (entry ? entry.teacher : this.faculty()[0]?.id),
      substitute_teacher: subTeacher.id,
      substitution_date: new Date().toISOString().slice(0, 10),
      reason: 'تغطية احتياطية لاعتذار أو غياب المعلم الأصلي',
      status: 'confirmed'
    };

    this.svc.createSubstitution(body).subscribe({
      next: (created) => {
        this.substitutions.update((list) => [created?.data || created, ...list]);
        this.fetchSubstitutes();
      }
    });
  }

  removeSubstitution(id: string): void {
    this.svc.deleteSubstitution(id).subscribe(() => {
      this.substitutions.update((list) => list.filter((s) => s.id !== id));
    });
  }

  // ---------- Nebras Multi-Step Wizard Modal ----------
  openWizard(): void {
    this.wizardCurrentStep.set(0);
    this.wizardCreatedData.set(null);
    this.wizardOpen.set(true);
  }

  wizardNext(): void {
    if (this.wizardCurrentStep() < this.wizardSteps.length - 1) {
      this.wizardCurrentStep.update((s) => s + 1);
    }
  }

  wizardPrev(): void {
    if (this.wizardCurrentStep() > 0) {
      this.wizardCurrentStep.update((s) => s - 1);
    }
  }

  wizardSubmit(): void {
    this.wizardSubmitting.set(true);
    const body = {
      name: this.wizardForm.name,
      academic_year: this.wizardForm.academic_year,
      term: this.wizardForm.term,
      status: 'approved',
      is_active: true,
      version: 1,
    };

    this.svc.createTimetable(body).subscribe({
      next: (res) => {
        const data = res?.data || res;
        this.wizardCreatedData.set(data);
        this.timetables.update((list) => [data, ...list]);
        this.selectedTimetableId.set(data.id);

        if (this.wizardForm.auto_generate) {
          this.svc.autoGenerate(data.id, true).subscribe({
            next: () => {
              this.wizardSubmitting.set(false);
              this.load();
              this.wizardCurrentStep.set(4);
            },
            error: () => {
              this.wizardSubmitting.set(false);
              this.load();
              this.wizardCurrentStep.set(4);
            }
          });
        } else {
          this.wizardSubmitting.set(false);
          this.load();
          this.wizardCurrentStep.set(4);
        }
      },
      error: () => {
        this.wizardSubmitting.set(false);
        this.wizardCurrentStep.set(4);
      }
    });
  }


  wizardFinish(): void {
    this.wizardOpen.set(false);
    this.load();
  }

  // ---------- Official Print Drawer ----------
  openPrintDrawer(type: 'master' | 'section' | 'teacher'): void {
    this.printDocumentType = type;
    this.printDrawerOpen.set(true);
  }

  triggerBrowserPrint(): void {
    window.print();
  }

  // ---------- Add Single Lesson Modal ----------
  openAdd(dayIdx?: number, periodId?: string, sectionId?: string): void {
    this.conflicts.set([]);
    this.addError.set('');
    this.addForm = {
      day_of_week: dayIdx ?? this.selectedDay(),
      period_id: periodId ?? (this.teachingPeriods()[0]?.id ?? ''),
      section_id: sectionId ?? (this.selectedSectionId() || this.sections()[0]?.id),
      teacher_id: '',
      subject_id: '',
    };
    this.addOpen.set(true);
  }

  closeAdd(): void {
    this.addOpen.set(false);
  }

  submitAdd(): void {
    const tt = this.selectedTimetableId();
    const sec = this.addForm.section_id;
    if (!tt || !sec) {
      this.addError.set('اختر الجدول والشعبة أولاً.');
      return;
    }
    this.submitting.set(true);
    this.conflicts.set([]);
    this.addError.set('');

    const body = {
      timetable_id: tt,
      day_of_week: Number(this.addForm.day_of_week),
      period_id: this.addForm.period_id,
      teacher_id: this.addForm.teacher_id,
      subject_id: this.addForm.subject_id,
      room_id: '00000000-0000-0000-0000-000000000000',
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
        if (data?.id) this.entries.update((list) => [...list, data]);
        this.closeAdd();
        this.svc.getLoads().subscribe((r) => this.loads.set(pickList(r)));
      },
      error: (err) => {
        this.submitting.set(false);
        this.addError.set(err?.error?.message || 'تعذّر حجز الحصة لوجود تعارض في البيانات.');
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

