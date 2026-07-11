import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SchedulingService } from './scheduling.service';
import { TenantService } from '../../core/services/tenant.service';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbLoadingComponent } from '../../shared/nebras/nb-loading.component';
import { NbDatepickerComponent } from '../../shared/nebras/nb-datepicker.component';

function pickList<T = any>(res: any): T[] {
  const d = res?.data ?? res;
  if (Array.isArray(d)) return d as T[];
  if (Array.isArray(d?.results)) return d.results as T[];
  if (Array.isArray(d?.data)) return d.data as T[];
  return [];
}

const SCHEDULE_TYPES: Record<string, string> = {
  academic: 'أكاديمي', teacher: 'معلمون', exam: 'اختبارات', room: 'قاعات وورش', vehicle: 'نقل وحافلات',
  meeting: 'اجتماعات', clinic: 'عيادة', maintenance: 'صيانة', event: 'فعاليات', custom: 'مخصص',
};
const RESOURCE_TYPES: Record<string, string> = {
  teacher: 'معلم', employee: 'موظف', room: 'قاعة', laboratory: 'مختبر', bus: 'حافلة',
  hall: 'صالة', projector: 'جهاز عرض', clinic_room: 'غرفة عيادة', other: 'آخر',
};
const RES_STATUS: Record<string, string> = {
  draft: 'مسودة', reserved: 'محجوز', approved: 'مؤكّد', rejected: 'مرفوض', cancelled: 'ملغى', completed: 'مكتمل', expired: 'منتهٍ',
};
const WEEKDAY_FULL = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

interface WorkflowLink { title: string; desc: string; path: string; mark: string; }

/**
 * محرك الجدولة الموحد للمؤسسة — لوحة قيادة زمنية بنمط Nebras OS.
 * الثيسيس: نبض اليوم التشغيلي (هل يسير بسلاسة أم يوجد تعارض؟).
 * عنصر التوقيع: شريط الموارد الزمني (يومي/أسبوعي/شهري) مع كشف التعارض المتوهّج.
 * مربوط بموديول scheduling وتغذية من timetable/faculty.
 */
@Component({
  selector: 'app-scheduling-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, NbPanelComponent, NbLoadingComponent, NbDatepickerComponent],
  template: `
    <div class="page" dir="rtl">
      @if (loading()) {
        <nb-loading message="جارٍ تحميل حالة الجدولة…"></nb-loading>
      } @else {
        <!-- ◆ لوحة القيادة: نبض اليوم -->
        <header class="cmd" [class.alert]="!statusOk()">
          <span class="cmd-glow g1"></span><span class="cmd-glow g2"></span>
          <div class="cmd-main">
            <span class="eyebrow">مركز الجدولة الموحّد · {{ tenantName() }}</span>
            <h1 class="cmd-day">{{ focusDateLabel() }}</h1>
            <div class="status" [class.ok]="statusOk()">
              <span class="status-dot"></span>
              @if (statusOk()) { <span>كل الموارد متسقة — لا تعارضات مفتوحة.</span> }
              @else { <span>{{ openConflicts() }} تعارض مفتوح يحتاج إلى حلّ.</span> }
            </div>
            <div class="pills">
              <span class="pill"><b>{{ focusBookings() }}</b> حجز اليوم</span>
              <span class="pill"><b>{{ resources().length }}</b> مورد</span>
              <span class="pill"><b>{{ schedules().length }}</b> جدول</span>
              <span class="pill"><b>{{ activeReservations() }}</b> حجز نشط</span>
            </div>
          </div>

          <div class="cmd-side">
            <div class="ring" [style.background]="ringBg()">
              <div class="ring-in">
                <span class="ring-pct">{{ utilization() }}<i>%</i></span>
                <span class="ring-lbl">إشغال اليوم</span>
              </div>
            </div>
            <div class="cmd-actions">
              <button class="btn-ghost" (click)="load()">تحديث</button>
              @if (resources().length === 0) {
                <button class="btn-ghost" (click)="syncResources()" [disabled]="syncing()">{{ syncing() ? 'جارٍ المزامنة…' : 'مزامنة الموارد' }}</button>
              }
              <button class="btn-solid" (click)="openBook()" [disabled]="resources().length === 0">احجز مورداً</button>
            </div>
          </div>
        </header>

        <!-- مؤشرات مضغوطة -->
        <div class="stats">
          <div class="stat">
            <span class="s-ic total"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></span>
            <div><span class="s-lbl">الجداول المُدارة</span><span class="s-val">{{ schedules().length }}</span></div>
          </div>
          <div class="stat">
            <span class="s-ic info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h18M3 12h18M3 17h18"/></svg></span>
            <div><span class="s-lbl">الموارد المجدولة</span><span class="s-val">{{ resources().length }}</span></div>
          </div>
          <div class="stat">
            <span class="s-ic success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></span>
            <div><span class="s-lbl">الحجوزات النشطة</span><span class="s-val">{{ activeReservations() }}</span></div>
          </div>
          <div class="stat" [class.danger]="openConflicts() > 0">
            <span class="s-ic warn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg></span>
            <div><span class="s-lbl">التعارضات المفتوحة</span><span class="s-val">{{ openConflicts() }}</span></div>
          </div>
        </div>

        <!-- ◆ عنصر التوقيع: شريط الموارد الزمني -->
        <nb-panel>
          <div class="ribbon-head">
            <div class="rh-title">
              <span class="rh-dot"></span>
              <h3>شريط الموارد الزمني</h3>
              <span class="rh-sub">{{ rangeLabel() }}</span>
            </div>
            <div class="rh-tools">
              <div class="seg" role="tablist">
                <button role="tab" [class.on]="viewMode()==='day'" (click)="setMode('day')">يومي</button>
                <button role="tab" [class.on]="viewMode()==='week'" (click)="setMode('week')">أسبوعي</button>
                <button role="tab" [class.on]="viewMode()==='month'" (click)="setMode('month')">شهري</button>
              </div>
              <select class="filter" [ngModel]="resFilter()" (ngModelChange)="resFilter.set($event)" aria-label="تصفية الموارد">
                <option value="all">كل الموارد</option>
                <option value="booked">المحجوزة فقط</option>
                @for (t of availableTypes(); track t) { <option [value]="'type:' + t">{{ resourceType(t) }} فقط</option> }
              </select>
              <div class="nav">
                <button class="day-nav" (click)="prev()" aria-label="السابق">‹</button>
                <button class="today-btn" (click)="goToday()">اليوم</button>
                <nb-datepicker [value]="cursor()" (valueChange)="setCursor($event)" ariaLabel="التاريخ"></nb-datepicker>
                <button class="day-nav" (click)="next()" aria-label="التالي">›</button>
              </div>
            </div>
          </div>

          <!-- ===== عرض يومي ===== -->
          @if (viewMode() === 'day') {
            @if (!dayRows().length) {
              <div class="ribbon-empty">لا موارد مطابقة لهذا اليوم والتصفية. غيّر التصفية أو أضِف حجوزات.</div>
            } @else {
              <div class="ribbon-scroll">
                <div class="axis">
                  <span class="axis-label">المورد</span>
                  <div class="axis-hours">
                    @for (h of hourSlots; track h) { <span class="hcol">{{ h }}:00</span> }
                  </div>
                </div>
                @for (row of dayRows(); track row.id) {
                  <div class="lane" [class.has-conflict]="row.hasConflict">
                    <span class="lane-label" [title]="row.name">
                      <span class="lane-type" [attr.data-t]="row.type">{{ resourceType(row.type) }}</span>
                      <span class="lane-name">{{ row.name }}</span>
                    </span>
                    <div class="lane-track gridded">
                      @for (b of row.blocks; track b.id) {
                        <button class="block" [class.conflict]="b.conflict"
                          [style.inset-inline-start.%]="b.left" [style.width.%]="b.width"
                          [style.--tone]="b.tone" (click)="pickBlock(b)"
                          (mouseenter)="showTip($event, b)" (mousemove)="showTip($event, b)" (mouseleave)="hovered.set(null)">
                          <span class="blk-t">{{ b.title }}</span>
                          <span class="blk-time mono">{{ b.from }} – {{ b.to }}</span>
                        </button>
                      }
                      @if (!row.blocks.length) { <span class="lane-idle">لا حجوزات</span> }
                    </div>
                  </div>
                }
              </div>
            }
          }

          <!-- ===== عرض أسبوعي ===== -->
          @else if (viewMode() === 'week') {
            @if (!weekRows().length) {
              <div class="ribbon-empty">لا موارد مطابقة لهذا الأسبوع والتصفية.</div>
            } @else {
              <div class="ribbon-scroll">
                <div class="wk-grid" [style.grid-template-columns]="'150px repeat(7, 1fr)'">
                  <span class="wk-corner">المورد</span>
                  @for (d of weekDays(); track d.date) {
                    <span class="wk-dhead" [class.today]="d.isToday"><b>{{ d.dow }}</b><span class="mono">{{ d.dm }}</span></span>
                  }
                  @for (row of weekRows(); track row.id) {
                    <span class="wk-res" [title]="row.name"><span class="lane-type" [attr.data-t]="row.type">{{ resourceType(row.type) }}</span><span class="lane-name">{{ row.name }}</span></span>
                    @for (c of row.cells; track c.date) {
                      <button class="wk-cell" [class.empty]="!c.count" [class.conflict]="c.conflict" (click)="openDay(c.date)" [attr.aria-label]="c.count + ' حجز'">
                        @if (c.count) { <span class="wk-count">{{ c.count }}</span><span class="wk-lbl">حجز</span> }
                      </button>
                    }
                  }
                </div>
              </div>
            }
          }

          <!-- ===== عرض شهري ===== -->
          @else {
            <div class="mo-grid">
              @for (w of weekdayShort; track w) { <span class="mo-dow">{{ w }}</span> }
              @for (cell of monthCells(); track cell.date) {
                <button class="mo-cell" [class.out]="!cell.inMonth" [class.today]="cell.isToday" [class.has]="cell.count" (click)="openDay(cell.date)">
                  <span class="mo-num">{{ cell.day }}</span>
                  @if (cell.count) { <span class="mo-badge" [class.conflict]="cell.conflict">{{ cell.count }} حجز</span> }
                </button>
              }
            </div>
          }

          @if (picked(); as p) {
            <div class="picked">
              <span class="picked-dot" [style.background]="p.tone"></span>
              <strong>{{ p.title }}</strong>
              <span class="mono">{{ p.resourceName }} · {{ p.from }}–{{ p.to }}</span>
              @if (p.conflict) { <span class="nb-badge-danger">تعارض</span> }
              <button class="picked-x" (click)="picked.set(null)">×</button>
            </div>
          }
        </nb-panel>

        <!-- صف: مركز التعارضات + الموارد حسب النوع -->
        <div class="bento">
          <nb-panel [flush]="true" [class.conf-panel]="openConflicts() > 0">
            <div class="panel-cap">
              <h3>مركز التعارضات</h3>
              @if (openConflicts() > 0) { <span class="cap-badge danger">{{ openConflicts() }} مفتوح</span> }
              @else { <span class="cap-badge ok">لا شيء</span> }
            </div>
            @if (!openConflictList().length) {
              <div class="clear-state">
                <span class="clear-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg></span>
                <p>كل الموارد متسقة الآن. سيظهر أي تعارض هنا فور اكتشافه.</p>
              </div>
            } @else {
              <div class="conf-list">
                @for (c of openConflictList(); track c.id) {
                  <div class="conf-item" [attr.data-sev]="c.severity">
                    <span class="sev">{{ sevLabel(c.severity) }}</span>
                    <div class="conf-body">
                      <span class="conf-type">{{ c.conflict_type }}</span>
                      <span class="conf-desc">{{ c.description }}</span>
                    </div>
                    <button class="btn-line" (click)="resolve(c)">حلّ</button>
                  </div>
                }
              </div>
            }
          </nb-panel>

          <nb-panel title="الموارد حسب النوع">
            @if (!resourceTypeRows().length) {
              <div class="clear-state"><p>لا موارد بعد. اضغط «مزامنة الموارد» لتوليدها من المعلمين والمرافق.</p></div>
            } @else {
              <div class="res-chips">
                @for (r of resourceTypeRows(); track r.key) {
                  <button class="res-chip" [attr.data-t]="r.key" (click)="filterByType(r.key)">
                    <span class="rc-val">{{ r.count }}</span>
                    <span class="rc-lbl">{{ resourceType(r.key) }}</span>
                  </button>
                }
              </div>
              <div class="type-bars">
                @for (r of scheduleTypeRows(); track r.key) {
                  <div class="tb-row">
                    <span class="tb-name">{{ scheduleType(r.key) }}</span>
                    <span class="tb-track"><span class="tb-fill" [style.width.%]="(r.count / maxScheduleType()) * 100"></span></span>
                    <span class="tb-val mono">{{ r.count }}</span>
                  </div>
                }
              </div>
            }
          </nb-panel>
        </div>

        <!-- الحجوزات -->
        <nb-panel [flush]="true">
          <div class="panel-cap"><h3>أحدث الحجوزات</h3><span class="cap-sub">{{ reservations().length }} إجمالاً</span></div>
          @if (!reservations().length) {
            <div class="clear-state"><p>لا حجوزات بعد. اضغط «احجز مورداً» لإنشاء أول حجز.</p></div>
          } @else {
            <div class="tbl">
              <div class="tbl-head"><span>العنوان</span><span>المورد</span><span>التاريخ</span><span>الوقت</span><span>الحالة</span><span>إجراءات</span></div>
              @for (r of reservations().slice(0, 12); track r.id) {
                <div class="tbl-row">
                  <span class="strong link" (click)="openDay(r.date)">{{ r.title }}</span>
                  <span>{{ resourceName(r.resource) }}</span>
                  <span class="mono">{{ r.date }}</span>
                  <span class="mono">{{ hm(r.start_time) }}–{{ hm(r.end_time) }}</span>
                  <span><span [class]="resStatusBadge(r.status)">{{ resStatus(r.status) }}</span></span>
                  <span class="row-actions">
                    <button class="btn-line xs" (click)="openEdit(r)">تعديل</button>
                    <button class="btn-line xs danger" (click)="removeReservation(r)">حذف</button>
                  </span>
                </div>
              }
            </div>
          }
        </nb-panel>

        <!-- روابط الموديولات -->
        <div class="wf-strip">
          @for (link of workflow; track link.path) {
            <a class="wf-chip" [routerLink]="link.path" [title]="link.desc"><span class="wf-mark">{{ link.mark }}</span><span class="wf-t">{{ link.title }}</span></a>
          }
        </div>
      }

      <!-- نافذة الحجز الذكي -->
      @if (bookOpen()) {
        <div class="modal-scrim" (click)="closeBook()">
          <div class="modal" dir="rtl" (click)="$event.stopPropagation()">
            <div class="modal-head"><h3>{{ editingId() ? 'تعديل الحجز' : 'احجز مورداً' }}</h3><button class="modal-x" (click)="closeBook()">×</button></div>
            <div class="modal-body">
              <div class="m-grid">
                <div class="fld wide"><label>عنوان الحجز</label><input [(ngModel)]="bf.title" placeholder="مثال: اجتماع أولياء الأمور" /></div>
                <div class="fld wide"><label>المورد</label>
                  <select [(ngModel)]="bf.resource_id">
                    <option value="">— اختر المورد —</option>
                    @for (r of resources(); track r.id) { <option [value]="r.id">{{ resourceType(r.resource_type) }} · {{ r.name }}</option> }
                  </select>
                </div>
                <div class="fld"><label>التاريخ</label><nb-datepicker [value]="bf.date" (valueChange)="bf.date = $event" ariaLabel="تاريخ الحجز"></nb-datepicker></div>
                <div class="fld"><label>من</label><input type="time" [(ngModel)]="bf.start" /></div>
                <div class="fld"><label>إلى</label><input type="time" [(ngModel)]="bf.end" /></div>
              </div>
              @if (bookConflicts().length) {
                <div class="conflicts" role="alert">
                  <strong>المورد مشغول في هذا الوقت:</strong>
                  <ul>@for (c of bookConflicts(); track $index) { <li>{{ c.description || c.conflict_type || 'تعارض' }}</li> }</ul>
                </div>
              }
              @if (bookOk()) { <div class="ok-note">الوقت متاح — يمكنك تأكيد الحجز.</div> }
              @if (bookError()) { <div class="conflicts" role="alert">{{ bookError() }}</div> }
            </div>
            <div class="modal-foot">
              <button class="btn-line" (click)="closeBook()">إلغاء</button>
              <button class="btn-line" (click)="checkBook()" [disabled]="booking() || !bookValid()">فحص التوفّر</button>
              <button class="btn-solid dark" (click)="confirmBook()" [disabled]="booking() || !bookValid()">{{ booking() ? 'جارٍ…' : (editingId() ? 'حفظ التعديل' : 'تأكيد الحجز') }}</button>
            </div>
          </div>
        </div>
      }

      <!-- تلميح الحجز (عائم، غير مقصوص) -->
      @if (hovered(); as t) {
        <div class="tip" [style.left.px]="t.x" [style.top.px]="t.y" [class.conf]="t.d.conflict">
          <span class="tip-title">{{ t.d.title }}</span>
          <span class="tip-row"><b>المورد</b> {{ t.d.resourceName }}</span>
          <span class="tip-row"><b>الوقت</b> <span class="mono">{{ t.d.from }} – {{ t.d.to }}</span></span>
          @if (t.d.conflict) { <span class="tip-conf">⚠ تعارض مع حجز آخر على المورد</span> }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .mono { font-variant-numeric: tabular-nums; }

    /* ◆ لوحة القيادة */
    .cmd { position: relative; overflow: hidden; display: grid; grid-template-columns: 1fr auto; gap: 24px; align-items: center;
      background: linear-gradient(135deg, var(--nb-primary-700), var(--nb-primary-500)); border-radius: 22px; padding: 26px 28px; margin-bottom: 16px;
      box-shadow: 0 18px 44px rgba(63,81,181,.28); }
    .cmd.alert { background: linear-gradient(135deg, #7a1f2b, var(--nb-primary-600)); box-shadow: 0 18px 44px rgba(122,31,43,.3); }
    .cmd-glow { position: absolute; border-radius: 50%; filter: blur(10px); pointer-events: none; }
    .cmd-glow.g1 { width: 240px; height: 240px; background: rgba(255,255,255,.10); top: -90px; inset-inline-start: -40px; }
    .cmd-glow.g2 { width: 180px; height: 180px; background: rgba(255,255,255,.07); bottom: -80px; inset-inline-end: 20%; }
    .cmd-main { position: relative; color: #fff; min-width: 0; }
    .eyebrow { font-size: 11.5px; font-weight: 700; letter-spacing: .12em; color: rgba(255,255,255,.72); }
    .cmd-day { margin: 6px 0 10px; font-size: 30px; font-weight: 800; letter-spacing: -.01em; color: #fff; }
    .status { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; padding: 6px 14px; border-radius: 999px; background: rgba(255,59,48,.22); color: #fff; margin-bottom: 14px; }
    .status.ok { background: rgba(52,199,89,.24); }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 4px rgba(255,255,255,.18); animation: beat 2s ease-in-out infinite; }
    @keyframes beat { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.35); opacity: .7; } }
    @media (prefers-reduced-motion: reduce) { .status-dot { animation: none; } }
    .pills { display: flex; flex-wrap: wrap; gap: 8px; }
    .pill { font-size: 12px; color: rgba(255,255,255,.82); background: rgba(255,255,255,.10); border: 1px solid rgba(255,255,255,.16); padding: 6px 12px; border-radius: 10px; }
    .pill b { color: #fff; font-weight: 800; font-variant-numeric: tabular-nums; margin-inline-end: 3px; }
    .cmd-side { position: relative; display: flex; flex-direction: column; align-items: center; gap: 14px; }
    .ring { width: 116px; height: 116px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .ring-in { width: 90px; height: 90px; border-radius: 50%; background: rgba(255,255,255,.10); backdrop-filter: blur(2px); display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,.2); }
    .ring-pct { font-size: 27px; font-weight: 800; color: #fff; font-variant-numeric: tabular-nums; line-height: 1; } .ring-pct i { font-size: 14px; font-style: normal; opacity: .8; }
    .ring-lbl { font-size: 10.5px; color: rgba(255,255,255,.75); margin-top: 3px; }
    .cmd-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
    .btn-solid, .btn-ghost { height: 36px; padding: 0 16px; border-radius: 10px; font-family: var(--nb-font-family); font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; border: none; transition: transform .15s, box-shadow .15s, background .15s; }
    .btn-solid { background: #fff; color: var(--nb-primary-700); box-shadow: 0 6px 16px rgba(0,0,0,.18); }
    .btn-solid:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 22px rgba(0,0,0,.24); }
    .btn-solid:disabled { opacity: .55; cursor: default; }
    .btn-ghost { background: rgba(255,255,255,.12); color: #fff; border: 1px solid rgba(255,255,255,.24); }
    .btn-ghost:hover:not(:disabled) { background: rgba(255,255,255,.2); }
    @media (max-width: 820px) { .cmd { grid-template-columns: 1fr; } .cmd-side { flex-direction: row; justify-content: space-between; } .cmd-day { font-size: 24px; } }

    /* مؤشرات */
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; margin-bottom: 16px; }
    .stat { display: flex; align-items: center; gap: 14px; background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 14px 18px; box-shadow: 0 1px 3px rgba(0,0,0,.04); transition: transform .18s, box-shadow .18s; }
    .stat:hover { transform: translateY(-2px); box-shadow: 0 10px 22px rgba(0,0,0,.07); }
    .stat.danger { border-color: rgba(255,59,48,.3); }
    .s-ic { flex-shrink: 0; width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
    .s-ic svg { width: 21px; height: 21px; }
    .s-ic.total { background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .s-ic.info { background: rgba(0,122,255,.12); color: var(--nb-info); }
    .s-ic.success { background: rgba(52,199,89,.12); color: var(--nb-success); }
    .s-ic.warn { background: rgba(255,159,10,.14); color: var(--nb-warning); }
    .stat.danger .s-ic.warn { background: rgba(255,59,48,.12); color: var(--nb-danger); }
    .s-lbl { display: block; font-size: 12px; color: var(--nb-text-muted); font-weight: 700; }
    .s-val { display: block; font-size: 26px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; line-height: 1.15; }
    .stat.danger .s-val { color: var(--nb-danger); }

    /* عناوين اللوحات */
    .panel-cap { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--nb-border-soft); }
    .panel-cap h3 { margin: 0; font-size: 14px; font-weight: 800; color: var(--nb-text); }
    .cap-badge { font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 999px; }
    .cap-badge.danger { background: rgba(255,59,48,.12); color: var(--nb-danger); } .cap-badge.ok { background: rgba(52,199,89,.12); color: var(--nb-success); }
    .cap-sub { margin-inline-start: auto; font-size: 11.5px; color: var(--nb-text-muted); font-variant-numeric: tabular-nums; }

    /* ◆ الشريط الزمني */
    .ribbon-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
    .rh-title { display: flex; align-items: center; gap: 10px; }
    .rh-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--nb-primary-600); box-shadow: 0 0 0 4px var(--nb-primary-50); }
    .rh-title h3 { margin: 0; font-size: 15px; font-weight: 800; color: var(--nb-text); }
    .rh-sub { font-size: 11.5px; color: var(--nb-text-muted); font-variant-numeric: tabular-nums; }
    .rh-tools { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .seg { display: inline-flex; background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); border-radius: 10px; padding: 3px; }
    .seg button { border: none; background: transparent; padding: 6px 14px; font-family: var(--nb-font-family); font-size: 12.5px; font-weight: 700; color: var(--nb-text-muted); cursor: pointer; border-radius: 8px; transition: background .15s, color .15s; }
    .seg button.on { background: var(--nb-surface); color: var(--nb-primary-700); box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    .filter { height: 34px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 10px; font-family: var(--nb-font-family); font-size: 12.5px; color: var(--nb-text); background: var(--nb-surface); outline: none; }
    .nav { display: flex; align-items: center; gap: 6px; }
    .day-nav { width: 34px; height: 34px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); background: var(--nb-surface); cursor: pointer; font-size: 18px; color: var(--nb-text-secondary); }
    .day-nav:hover { background: var(--nb-surface-raised); border-color: var(--nb-primary-400); }
    .today-btn { height: 34px; padding: 0 12px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); background: var(--nb-surface); cursor: pointer; font-family: var(--nb-font-family); font-size: 12.5px; font-weight: 700; color: var(--nb-primary-700); }
    .today-btn:hover { background: var(--nb-primary-50); }
    .ribbon-empty { padding: 30px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
    .ribbon-scroll { overflow-x: auto; }
    .axis { display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin-bottom: 8px; min-width: 620px; }
    .axis-label { font-size: 11px; font-weight: 700; color: var(--nb-text-muted); display: flex; align-items: flex-end; }
    .axis-hours { display: flex; border-bottom: 1px solid var(--nb-border); }
    .hcol { flex: 1; font-size: 10.5px; color: var(--nb-text-muted); font-variant-numeric: tabular-nums; padding: 0 0 4px 4px; border-inline-start: 1px solid var(--nb-border-soft); }
    .hcol:first-child { border-inline-start: none; }
    .lane { display: grid; grid-template-columns: 150px 1fr; gap: 10px; align-items: center; padding: 6px 0; min-width: 620px; }
    .lane-label { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .lane-type { font-size: 10px; font-weight: 700; color: var(--nb-primary-700); }
    .lane-name { font-size: 12.5px; font-weight: 600; color: var(--nb-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .lane-track { position: relative; height: 54px; background: var(--nb-surface-raised); border-radius: 8px; overflow: hidden; }
    .lane-track.gridded { background-color: var(--nb-surface-raised); background-image: repeating-linear-gradient(to left, transparent, transparent calc(100% / 8 - 1px), var(--nb-border) calc(100% / 8 - 1px), var(--nb-border) calc(100% / 8)); }
    .lane.has-conflict .lane-track { box-shadow: inset 0 0 0 1px rgba(255,59,48,.4); }
    .lane-idle { position: absolute; inset-inline-start: 12px; top: 50%; transform: translateY(-50%); font-size: 11px; color: var(--nb-text-faint); }
    .block { position: absolute; top: 5px; bottom: 5px; min-width: 44px; border: none; border-radius: 7px; cursor: pointer; padding: 6px 9px; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 3px; overflow: hidden;
      font-family: var(--nb-font-family); direction: rtl; text-align: start;
      background: color-mix(in srgb, var(--tone, var(--nb-primary-500)) 90%, #fff); color: #fff; transition: transform .12s, box-shadow .12s; }
    .block:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0,0,0,.18); z-index: 2; }
    .block.conflict { background: var(--nb-danger); box-shadow: 0 0 0 2px rgba(255,59,48,.35), 0 0 14px rgba(255,59,48,.5); animation: pulse 1.8s ease-in-out infinite; }
    @keyframes pulse { 0%,100% { box-shadow: 0 0 0 2px rgba(255,59,48,.35), 0 0 12px rgba(255,59,48,.4); } 50% { box-shadow: 0 0 0 2px rgba(255,59,48,.5), 0 0 20px rgba(255,59,48,.7); } }
    @media (prefers-reduced-motion: reduce) { .block.conflict { animation: none; } }
    .blk-t { font-size: 11.5px; font-weight: 700; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; align-self: stretch; }
    .blk-time { font-size: 10px; opacity: .85; line-height: 1; }
    .picked { display: flex; align-items: center; gap: 10px; margin-top: 12px; padding: 10px 12px; background: var(--nb-surface-raised); border-radius: var(--nb-radius); font-size: 12.5px; }
    .picked-dot { width: 10px; height: 10px; border-radius: 3px; } .picked strong { color: var(--nb-text); }
    .picked .mono { color: var(--nb-text-muted); } .picked-x { margin-inline-start: auto; border: none; background: transparent; font-size: 18px; color: var(--nb-text-muted); cursor: pointer; }

    /* أسبوعي/شهري */
    .wk-grid { display: grid; gap: 6px; min-width: 720px; }
    .wk-corner { font-size: 11px; font-weight: 700; color: var(--nb-text-muted); display: flex; align-items: center; }
    .wk-dhead { display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 6px; background: var(--nb-surface-raised); border-radius: 8px; }
    .wk-dhead b { font-size: 12px; color: var(--nb-text); } .wk-dhead .mono { font-size: 10px; color: var(--nb-text-muted); }
    .wk-dhead.today { background: var(--nb-primary-50); box-shadow: inset 0 0 0 1px var(--nb-primary-200); }
    .wk-res { display: flex; flex-direction: column; gap: 1px; justify-content: center; min-width: 0; }
    .wk-cell { min-height: 46px; border: 1px dashed var(--nb-border); border-radius: 8px; background: var(--nb-surface); cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; transition: background .15s, border-color .15s; }
    .wk-cell:hover { background: var(--nb-surface-raised); border-color: var(--nb-primary-400); }
    .wk-cell.empty { cursor: default; } .wk-cell.empty:hover { background: var(--nb-surface); border-color: var(--nb-border); }
    .wk-cell.conflict { border-style: solid; border-color: rgba(255,59,48,.4); background: rgba(255,59,48,.06); }
    .wk-count { font-size: 16px; font-weight: 800; color: var(--nb-primary-700); font-variant-numeric: tabular-nums; }
    .wk-cell.conflict .wk-count { color: var(--nb-danger); }
    .wk-lbl { font-size: 9.5px; color: var(--nb-text-muted); }
    .mo-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
    .mo-dow { text-align: center; font-size: 11px; font-weight: 700; color: var(--nb-text-muted); padding: 4px; }
    .mo-cell { position: relative; min-height: 64px; border: 1px solid var(--nb-border-soft); border-radius: 10px; background: var(--nb-surface); cursor: pointer; padding: 6px; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; transition: background .15s, border-color .15s, transform .12s; }
    .mo-cell:hover { border-color: var(--nb-primary-400); transform: translateY(-1px); }
    .mo-cell.out { background: var(--nb-surface-raised); opacity: .55; }
    .mo-cell.today { box-shadow: inset 0 0 0 2px var(--nb-primary-200); }
    .mo-num { font-size: 12.5px; font-weight: 700; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .mo-badge { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 999px; background: var(--nb-primary-50); color: var(--nb-primary-700); }
    .mo-badge.conflict { background: rgba(255,59,48,.12); color: var(--nb-danger); }

    /* bento */
    .bento { display: grid; grid-template-columns: 1.3fr 1fr; gap: 16px; margin-top: 16px; align-items: start; }
    @media (max-width: 860px) { .bento { grid-template-columns: 1fr; } }
    .conf-panel { box-shadow: 0 0 0 1px rgba(255,59,48,.18), 0 1px 3px rgba(0,0,0,.04); }

    .clear-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 26px 16px; text-align: center; color: var(--nb-text-muted); font-size: 13px; }
    .clear-ico { color: var(--nb-success); } .clear-ico svg { width: 32px; height: 32px; }
    .conf-list { display: flex; flex-direction: column; }
    .conf-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-top: 1px solid var(--nb-border-soft); }
    .conf-item:first-child { border-top: none; }
    .sev { flex-shrink: 0; font-size: 10.5px; font-weight: 800; padding: 3px 9px; border-radius: 999px; }
    .conf-item[data-sev="high"] .sev { background: rgba(255,59,48,.12); color: var(--nb-danger); }
    .conf-item[data-sev="medium"] .sev { background: rgba(255,159,10,.14); color: var(--nb-warning); }
    .conf-item[data-sev="low"] .sev { background: var(--nb-surface-raised); color: var(--nb-text-muted); }
    .conf-body { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
    .conf-type { font-size: 12.5px; font-weight: 700; color: var(--nb-text); }
    .conf-desc { font-size: 12px; color: var(--nb-text-muted); }

    .res-chips { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 10px; margin-bottom: 14px; }
    .res-chip { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 12px; border-radius: 12px; background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); cursor: pointer; transition: transform .15s, border-color .15s; }
    .res-chip:hover { transform: translateY(-2px); border-color: var(--nb-primary-400); }
    .rc-val { font-size: 20px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .rc-lbl { font-size: 11px; color: var(--nb-text-muted); }
    .type-bars { display: flex; flex-direction: column; gap: 8px; border-top: 1px dashed var(--nb-border-soft); padding-top: 12px; }
    .tb-row { display: grid; grid-template-columns: 90px 1fr 28px; align-items: center; gap: 8px; }
    .tb-name { font-size: 12px; color: var(--nb-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tb-track { height: 8px; background: var(--nb-surface-raised); border-radius: 4px; overflow: hidden; }
    .tb-fill { display: block; height: 100%; background: linear-gradient(90deg, var(--nb-primary-600), var(--nb-primary-400)); border-radius: 4px; }
    .tb-val { font-size: 12px; font-weight: 700; color: var(--nb-text); text-align: end; }

    /* table */
    .tbl { display: flex; flex-direction: column; }
    .tbl-head, .tbl-row { display: grid; grid-template-columns: 1.5fr 1.1fr .85fr .9fr .7fr 118px; gap: 8px; padding: 11px 16px; align-items: center; }
    .tbl-head { background: var(--nb-surface-raised); border-bottom: 1px solid var(--nb-border-soft); font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .tbl-row { border-bottom: 1px solid var(--nb-border-row); font-size: 12.5px; color: var(--nb-text); }
    .tbl-row:last-child { border-bottom: none; } .tbl-row:hover { background: var(--nb-surface-raised); }
    .strong { font-weight: 700; }
    .link { cursor: pointer; } .link:hover { color: var(--nb-primary-700); text-decoration: underline; }
    .row-actions { display: flex; gap: 6px; justify-content: flex-end; }
    .btn-line.xs { height: 26px; padding: 0 10px; font-size: 11.5px; }
    .btn-line.danger { color: var(--nb-danger); }
    .btn-line.danger:hover:not(:disabled) { background: rgba(255,59,48,.08); border-color: rgba(255,59,48,.35); }

    /* workflow */
    .wf-strip { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
    .wf-chip { display: inline-flex; align-items: center; gap: 8px; background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: 999px; padding: 8px 14px 8px 10px; text-decoration: none; transition: transform .15s, box-shadow .15s, border-color .15s; }
    .wf-chip:hover { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(0,0,0,.07); border-color: var(--nb-primary-400); }
    .wf-mark { width: 26px; height: 26px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .wf-t { font-size: 13px; font-weight: 700; color: var(--nb-text); }

    /* buttons */
    .btn-line { height: 32px; padding: 0 14px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); background: var(--nb-surface); cursor: pointer; font-family: var(--nb-font-family); font-size: 12.5px; font-weight: 700; color: var(--nb-text); }
    .btn-line:hover:not(:disabled) { background: var(--nb-surface-raised); border-color: var(--nb-primary-400); }
    .btn-line:disabled { opacity: .5; cursor: default; }

    /* modal */
    .modal-scrim { position: fixed; inset: 0; background: rgba(26,29,46,.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
    .modal { width: min(560px, 100%); background: var(--nb-surface); border-radius: var(--nb-radius-card); box-shadow: 0 20px 50px rgba(0,0,0,.3); overflow: hidden; animation: mIn .2s ease-out; }
    @keyframes mIn { from { opacity: 0; transform: scale(.96) translateY(8px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .modal { animation: none; } }
    .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--nb-border-soft); }
    .modal-head h3 { margin: 0; font-size: 15px; font-weight: 800; color: var(--nb-text); }
    .modal-x { border: none; background: transparent; font-size: 22px; color: var(--nb-text-muted); cursor: pointer; }
    .modal-body { padding: 20px; }
    .m-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
    .fld { display: flex; flex-direction: column; gap: 5px; } .fld.wide { grid-column: 1 / -1; }
    .fld label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
    .fld input, .fld select { height: 36px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); background: var(--nb-surface); outline: none; }
    .fld input:focus, .fld select:focus { border-color: var(--nb-primary-600); box-shadow: var(--nb-focus-ring); }
    .conflicts { margin-top: 14px; background: rgba(255,59,48,.08); border: 1px solid rgba(255,59,48,.25); border-radius: var(--nb-radius); padding: 10px 12px; font-size: 12.5px; color: var(--nb-danger); }
    .conflicts ul { margin: 6px 0 0; padding-inline-start: 18px; }
    .ok-note { margin-top: 14px; background: rgba(52,199,89,.1); border: 1px solid rgba(52,199,89,.3); border-radius: var(--nb-radius); padding: 10px 12px; font-size: 12.5px; color: var(--nb-success); font-weight: 600; }
    .modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--nb-border-soft); }
    .btn-solid.dark { height: 32px; background: var(--nb-primary-600); color: #fff; box-shadow: none; }
    .btn-solid.dark:hover:not(:disabled) { background: var(--nb-primary-700); transform: none; }

    /* تلميح عائم */
    .tip { position: fixed; z-index: 1200; pointer-events: none; transform: translate(-50%, calc(-100% - 14px));
      background: #1A1D2E; color: #fff; border-radius: 10px; padding: 10px 12px; min-width: 180px; max-width: 260px;
      box-shadow: 0 10px 28px rgba(0,0,0,.34); display: flex; flex-direction: column; gap: 4px; }
    .tip::after { content: ''; position: absolute; bottom: -6px; inset-inline-start: 50%; transform: translateX(50%); width: 12px; height: 12px; background: #1A1D2E; rotate: 45deg; }
    .tip.conf { background: #5a1620; } .tip.conf::after { background: #5a1620; }
    .tip-title { font-size: 12.5px; font-weight: 800; }
    .tip-row { font-size: 11.5px; color: rgba(255,255,255,.82); display: flex; gap: 6px; }
    .tip-row b { color: rgba(255,255,255,.6); font-weight: 700; min-width: 40px; }
    .tip-conf { font-size: 11px; font-weight: 700; color: #ffb3ba; margin-top: 2px; }
  `],
})
export class SchedulingDashboardComponent implements OnInit {
  private svc = inject(SchedulingService);
  private tenant = inject(TenantService);

  readonly loading = signal(true);
  readonly schedules = signal<any[]>([]);
  readonly resources = signal<any[]>([]);
  readonly events = signal<any[]>([]);
  readonly reservations = signal<any[]>([]);
  readonly conflicts = signal<any[]>([]);

  readonly cursor = signal(this.today());
  readonly viewMode = signal<'day' | 'week' | 'month'>('day');
  readonly resFilter = signal<string>('booked');
  readonly picked = signal<any | null>(null);
  readonly weekdayShort = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

  // الحجز
  readonly bookOpen = signal(false);
  readonly booking = signal(false);
  readonly bookConflicts = signal<any[]>([]);
  readonly bookOk = signal(false);
  readonly bookError = signal('');
  readonly syncing = signal(false);
  readonly editingId = signal<string | null>(null);
  bf: any = { title: '', resource_id: '', date: this.today(), start: '08:00', end: '09:00' };

  readonly hours = [7, 8, 9, 10, 11, 12, 13, 14, 15];
  readonly hourSlots = [7, 8, 9, 10, 11, 12, 13, 14];
  readonly hovered = signal<{ x: number; y: number; d: any } | null>(null);
  private readonly START = 7 * 60;
  private readonly END = 15 * 60;

  readonly workflow: WorkflowLink[] = [
    { title: 'الجداول الدراسية', desc: 'إدارة الجدول الأكاديمي والجدولة الذكية', path: '/timetable', mark: 'ج' },
    { title: 'شؤون المعلمين', desc: 'الموارد البشرية للمعلمين', path: '/teachers', mark: 'م' },
    { title: 'الشؤون الأكاديمية', desc: 'المراحل والصفوف والشعب', path: '/academics/dashboard', mark: 'أ' },
    { title: 'النقل والحافلات', desc: 'جدولة المركبات', path: '/transport', mark: 'ن' },
    { title: 'العيادة', desc: 'مواعيد العيادة المدرسية', path: '/clinic', mark: 'ع' },
  ];

  tenantName(): string { return (this.tenant as any).currentTenant()?.nameAr || 'مجموعة مدارس النبراس الأهلية'; }

  // ----- مشتقات عامة -----
  readonly activeReservations = computed(() => this.reservations().filter((r) => ['reserved', 'approved'].includes(r.status)).length);
  readonly openConflictList = computed(() => this.conflicts().filter((c) => !c.resolved));
  readonly openConflicts = computed(() => this.openConflictList().length);
  readonly statusOk = computed(() => this.openConflicts() === 0);

  readonly focusDateLabel = computed(() => {
    const dt = new Date(this.cursor() + 'T00:00:00');
    return `${WEEKDAY_FULL[dt.getDay()]} ${dt.getDate()} ${MONTHS[dt.getMonth()]}`;
  });
  readonly focusBookings = computed(() => (this.itemsByDate().get(this.cursor()) ?? []).length);

  private resourceMap = computed(() => new Map(this.resources().map((r) => [String(r.id), r])));
  readonly scheduleTypeRows = computed(() => this.countBy(this.schedules(), 'schedule_type'));
  readonly maxScheduleType = computed(() => Math.max(1, ...this.scheduleTypeRows().map((r) => r.count)));
  readonly resourceTypeRows = computed(() => this.countBy(this.resources(), 'resource_type'));

  private readonly palette = ['#3F51B5', '#007aff', '#2E9E7B', '#af52de', '#5856d6', '#00c7be', '#ff9f0a', '#ff375f'];

  private readonly allItems = computed(() => {
    const out: any[] = [];
    for (const r of this.reservations()) if (r.date && r.resource) out.push({ id: 'rv-' + r.id, date: r.date, resource: String(r.resource), title: r.title, start: r.start_time, end: r.end_time });
    for (const e of this.events()) if (e.start_date && e.resource) out.push({ id: 'ev-' + e.id, date: e.start_date, resource: String(e.resource), title: e.title, start: e.start_time, end: e.end_time });
    return out;
  });
  private readonly itemsByDate = computed(() => {
    const m = new Map<string, any[]>();
    for (const it of this.allItems()) { if (!m.has(it.date)) m.set(it.date, []); m.get(it.date)!.push(it); }
    return m;
  });

  readonly availableTypes = computed(() => [...new Set(this.resources().map((r) => r.resource_type))]);

  private readonly rangeDates = computed(() => {
    if (this.viewMode() === 'day') return [this.cursor()];
    if (this.viewMode() === 'week') return this.weekDays().map((d) => d.date);
    return this.monthCells().filter((c) => c.inMonth).map((c) => c.date);
  });

  readonly visibleResources = computed(() => {
    const f = this.resFilter();
    let list = this.resources();
    if (f.startsWith('type:')) list = list.filter((r) => r.resource_type === f.slice(5));
    else if (f === 'booked') {
      const dates = new Set(this.rangeDates());
      const ids = new Set(this.allItems().filter((it) => dates.has(it.date)).map((it) => it.resource));
      list = list.filter((r) => ids.has(String(r.id)));
    }
    return list;
  });

  private buildBlocks(items: any[], colorIdx: number, resName: string) {
    const blocks = items.map((b) => ({ ...b, s: this.toMin(b.start), e: this.toMin(b.end) })).sort((a, b) => a.s - b.s);
    let hasConflict = false;
    for (let i = 0; i < blocks.length; i++)
      for (let j = i + 1; j < blocks.length; j++)
        if (blocks[i].s < blocks[j].e && blocks[j].s < blocks[i].e) { blocks[i].conflict = true; blocks[j].conflict = true; hasConflict = true; }
    return {
      hasConflict,
      blocks: blocks.map((b) => ({
        id: b.id, title: b.title, conflict: !!b.conflict, tone: this.palette[colorIdx % this.palette.length],
        from: this.hm(b.start), to: this.hm(b.end),
        left: this.clampPct(b.s), width: Math.max(4, this.clampPct(b.e) - this.clampPct(b.s)), resourceName: resName,
      })),
    };
  }

  readonly dayRows = computed(() => {
    const d = this.cursor();
    const dayItems = this.itemsByDate().get(d) ?? [];
    const byRes = new Map<string, any[]>();
    for (const it of dayItems) { if (!byRes.has(it.resource)) byRes.set(it.resource, []); byRes.get(it.resource)!.push(it); }
    const vis = this.visibleResources();
    const ordered = [...vis].sort((a, b) => (byRes.has(String(b.id)) ? 1 : 0) - (byRes.has(String(a.id)) ? 1 : 0)).slice(0, 14);
    return ordered.map((res, ri) => {
      const built = this.buildBlocks(byRes.get(String(res.id)) ?? [], ri, res.name);
      return { id: String(res.id), name: res.name, type: res.resource_type, hasConflict: built.hasConflict, blocks: built.blocks };
    });
  });

  readonly weekDays = computed(() => {
    const start = this.weekStart(this.cursor());
    const today = this.today();
    return Array.from({ length: 7 }, (_, i) => {
      const ds = this.addDays(start, i);
      const dt = new Date(ds + 'T00:00:00');
      return { date: ds, dow: this.weekdayShort[dt.getDay()], dm: `${dt.getDate()}/${dt.getMonth() + 1}`, isToday: ds === today };
    });
  });

  readonly weekRows = computed(() => {
    const days = this.weekDays().map((d) => d.date);
    return this.visibleResources().slice(0, 14).map((res) => ({
      id: String(res.id), name: res.name, type: res.resource_type,
      cells: days.map((date) => {
        const its = (this.itemsByDate().get(date) ?? []).filter((it) => it.resource === String(res.id));
        return { date, count: its.length, conflict: this.buildBlocks(its, 0, '').hasConflict };
      }),
    }));
  });

  readonly monthCells = computed(() => {
    const [y, m] = this.cursor().split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const gridStart = this.addDays(this.fmt(first), -first.getDay());
    const today = this.today();
    const visIds = new Set(this.visibleResources().map((r) => String(r.id)));
    return Array.from({ length: 42 }, (_, i) => {
      const ds = this.addDays(gridStart, i);
      const dt = new Date(ds + 'T00:00:00');
      const its = (this.itemsByDate().get(ds) ?? []).filter((it) => visIds.has(it.resource));
      let conflict = false;
      const byRes = new Map<string, any[]>();
      for (const it of its) { if (!byRes.has(it.resource)) byRes.set(it.resource, []); byRes.get(it.resource)!.push(it); }
      for (const arr of byRes.values()) if (this.buildBlocks(arr, 0, '').hasConflict) conflict = true;
      return { date: ds, day: dt.getDate(), inMonth: dt.getMonth() === m - 1, isToday: ds === today, count: its.length, conflict };
    });
  });

  readonly rangeLabel = computed(() => {
    if (this.viewMode() === 'day') return this.focusDateLabel();
    if (this.viewMode() === 'week') { const w = this.weekDays(); return `${w[0].date} — ${w[6].date}`; }
    const [y, m] = this.cursor().split('-').map(Number);
    return `${MONTHS[m - 1]} ${y}`;
  });

  readonly utilization = computed(() => {
    const total = this.resources().length;
    if (!total) return 0;
    const dayItems = this.itemsByDate().get(this.cursor()) ?? [];
    const busy = new Set(dayItems.map((it) => it.resource)).size;
    return Math.round((busy / total) * 100);
  });

  ringBg(): string {
    const pct = Math.min(100, this.utilization());
    return `conic-gradient(#fff ${pct * 3.6}deg, rgba(255,255,255,.22) ${pct * 3.6}deg)`;
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    forkJoin({
      schedules: this.svc.getSchedules(),
      resources: this.svc.getResources(),
      events: this.svc.getEvents(),
      reservations: this.svc.getReservations(),
      conflicts: this.svc.getConflicts(),
    }).subscribe({
      next: (r) => {
        this.schedules.set(pickList(r.schedules));
        this.resources.set(pickList(r.resources));
        this.events.set(pickList(r.events));
        this.reservations.set(pickList(r.reservations));
        this.conflicts.set(pickList(r.conflicts));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // ----- التنقّل -----
  setMode(m: 'day' | 'week' | 'month'): void { this.viewMode.set(m); this.picked.set(null); }
  setCursor(v: string): void { if (v) { this.cursor.set(v); this.picked.set(null); } }
  goToday(): void { this.setCursor(this.today()); }
  openDay(date: string): void { if (!date) return; this.cursor.set(date); this.viewMode.set('day'); this.picked.set(null); }
  prev(): void { this.step(-1); }
  next(): void { this.step(1); }
  filterByType(t: string): void { this.resFilter.set('type:' + t); }
  private step(dir: number): void {
    const mode = this.viewMode();
    if (mode === 'day') this.cursor.set(this.addDays(this.cursor(), dir));
    else if (mode === 'week') this.cursor.set(this.addDays(this.cursor(), dir * 7));
    else { const [y, m] = this.cursor().split('-').map(Number); this.cursor.set(this.fmt(new Date(y, m - 1 + dir, 1))); }
    this.picked.set(null);
  }
  pickBlock(b: any): void { this.picked.set(b); }
  showTip(ev: MouseEvent, b: any): void { this.hovered.set({ x: ev.clientX, y: ev.clientY, d: b }); }

  syncResources(): void {
    if (this.syncing()) return;
    this.syncing.set(true);
    this.svc.syncResources().subscribe({
      next: () => { this.syncing.set(false); this.load(); },
      error: () => this.syncing.set(false),
    });
  }

  // ----- الحجز الذكي -----
  openBook(): void { this.editingId.set(null); this.bookConflicts.set([]); this.bookOk.set(false); this.bookError.set(''); this.bf = { title: '', resource_id: '', date: this.cursor(), start: '08:00', end: '09:00' }; this.bookOpen.set(true); }
  openEdit(r: any): void {
    this.editingId.set(r.id);
    this.bookConflicts.set([]); this.bookOk.set(false); this.bookError.set('');
    this.bf = { title: r.title || '', resource_id: String(r.resource), date: r.date, start: this.hm(r.start_time), end: this.hm(r.end_time) };
    this.bookOpen.set(true);
  }
  closeBook(): void { this.bookOpen.set(false); this.editingId.set(null); }

  removeReservation(r: any): void {
    if (!r?.id || !confirm(`حذف الحجز «${r.title}»؟`)) return;
    this.svc.deleteReservation(r.id).subscribe({
      next: () => this.reservations.update((list) => list.filter((x) => x.id !== r.id)),
    });
  }
  bookValid(): boolean { return !!this.bf.resource_id && !!this.bf.date && !!this.bf.start && !!this.bf.end; }
  private bookBody() {
    const body: any = { resource_id: this.bf.resource_id, date: this.bf.date, start_time: this.bf.start + ':00', end_time: this.bf.end + ':00' };
    if (this.editingId()) body.exclude_reservation_id = this.editingId();
    return body;
  }
  checkBook(): void {
    if (!this.bookValid()) return;
    this.booking.set(true); this.bookConflicts.set([]); this.bookOk.set(false); this.bookError.set('');
    this.svc.checkConflicts(this.bookBody()).subscribe({
      next: (res) => { this.booking.set(false); const c = res?.data?.conflicts ?? []; this.bookConflicts.set(c); this.bookOk.set(!c.length); },
      error: (e) => { this.booking.set(false); this.bookError.set(e?.error?.message || 'تعذّر فحص التوفّر.'); },
    });
  }
  confirmBook(): void {
    if (!this.bookValid()) return;
    this.booking.set(true); this.bookError.set('');
    const id = this.editingId();
    this.svc.checkConflicts(this.bookBody()).subscribe({
      next: (res) => {
        // عند التعديل نتجاهل تعارض الحجز مع نفسه.
        const c = (res?.data?.conflicts ?? []).filter((x: any) => !id || String(x.reservation_id ?? x.id) !== String(id));
        if (c.length) { this.booking.set(false); this.bookConflicts.set(c); this.bookOk.set(false); return; }
        const body = { resource: this.bf.resource_id, title: this.bf.title || 'حجز مورد', date: this.bf.date, start_time: this.bf.start + ':00', end_time: this.bf.end + ':00' };
        const req = id ? this.svc.updateReservation(id, body) : this.svc.createReservation({ ...body, status: 'reserved' });
        req.subscribe({
          next: () => { this.booking.set(false); this.closeBook(); this.load(); },
          error: (e) => { this.booking.set(false); this.bookError.set(e?.error?.message || (id ? 'تعذّر حفظ التعديل.' : 'تعذّر إنشاء الحجز.')); },
        });
      },
      error: (e) => { this.booking.set(false); this.bookError.set(e?.error?.message || 'تعذّر التحقق.'); },
    });
  }

  resolve(c: any): void {
    this.svc.resolveConflict(c.id, 'تمت المعالجة يدوياً من مركز التعارضات').subscribe({
      next: () => this.conflicts.update((list) => list.map((x) => (x.id === c.id ? { ...x, resolved: true } : x))),
    });
  }

  // ----- أدوات -----
  private countBy(list: any[], key: string): { key: string; count: number }[] {
    const m = new Map<string, number>();
    for (const it of list) { const k = it[key] || 'other'; m.set(k, (m.get(k) ?? 0) + 1); }
    return [...m.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
  }
  private toMin(t: string): number { if (!t) return this.START; const [h, m] = String(t).split(':').map(Number); return (h || 0) * 60 + (m || 0); }
  private clampPct(min: number): number { const v = ((min - this.START) / (this.END - this.START)) * 100; return Math.max(0, Math.min(100, v)); }
  hourPct(h: number): number { return this.clampPct(h * 60); }
  hm(t: string): string { return t ? String(t).slice(0, 5) : '—'; }
  private today(): string { return this.fmt(new Date()); }
  private fmt(dt: Date): string { return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`; }
  private addDays(dateStr: string, n: number): string { const dt = new Date(dateStr + 'T00:00:00'); dt.setDate(dt.getDate() + n); return this.fmt(dt); }
  private weekStart(dateStr: string): string { const dt = new Date(dateStr + 'T00:00:00'); return this.addDays(dateStr, -dt.getDay()); }

  scheduleType(k: string): string { return SCHEDULE_TYPES[k] ?? k; }
  resourceType(k: string): string { return RESOURCE_TYPES[k] ?? k; }
  resourceName(id: string): string { return this.resourceMap().get(String(id))?.name ?? '—'; }
  resStatus(s: string): string { return RES_STATUS[s] ?? s; }
  resStatusBadge(s: string): string {
    return ({ approved: 'nb-badge-success', reserved: 'nb-badge-info', completed: 'nb-badge-neutral', rejected: 'nb-badge-danger', cancelled: 'nb-badge-neutral', expired: 'nb-badge-neutral', draft: 'nb-badge-neutral' } as any)[s] || 'nb-badge-neutral';
  }
  sevLabel(s: string): string { return ({ high: 'حرج', medium: 'متوسط', low: 'منخفض' } as any)[s] || s; }
}
