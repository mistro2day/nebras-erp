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
  styleUrl: './scheduling-dashboard.component.scss',
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
