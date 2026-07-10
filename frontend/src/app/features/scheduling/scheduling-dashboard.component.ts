import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SchedulingService } from './scheduling.service';
import { TenantService } from '../../core/services/tenant.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
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

interface WorkflowLink { title: string; desc: string; path: string; mark: string; }

/**
 * محرك الجدولة الموحد للمؤسسة — نمط Nebras OS.
 * عنصر التوقيع: «شريط الموارد الزمني» ليوم مختار، يُظهر تراكب الحجوزات كتعارض متوهّج.
 * مربوط بموديول scheduling (الجداول/الموارد/الأحداث/الحجوزات/التعارضات) وتغذية من timetable/faculty.
 */
@Component({
  selector: 'app-scheduling-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, NbPageHeaderComponent, NbPanelComponent, NbLoadingComponent, NbDatepickerComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="محرك الجدولة الموحد للمؤسسة"
        [subtitle]="'تعقّب الموارد والتعارضات والحجوزات لـ ' + tenantName()">
        <button class="nb-btn-secondary" (click)="load()">تحديث</button>
        @if (!loading() && resources().length === 0) {
          <button class="nb-btn-secondary" (click)="syncResources()" [disabled]="syncing()">{{ syncing() ? 'جارٍ المزامنة…' : 'مزامنة الموارد' }}</button>
        }
        <button class="nb-btn-primary" (click)="openBook()" [disabled]="!loading() && resources().length === 0">احجز مورداً</button>
      </nb-page-header>

      @if (loading()) {
        <nb-loading message="جارٍ تحميل حالة الجدولة…"></nb-loading>
      } @else {
        <!-- مؤشرات -->
        <div class="stats-grid">
          <div class="metric-card total">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></span>
            <span class="m-body"><span class="label">الجداول المُدارة</span><span class="value">{{ schedules().length }}</span></span>
          </div>
          <div class="metric-card info">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h18M3 12h18M3 17h18"/></svg></span>
            <span class="m-body"><span class="label">الموارد المجدولة</span><span class="value info">{{ resources().length }}</span></span>
          </div>
          <div class="metric-card success">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></span>
            <span class="m-body"><span class="label">الحجوزات النشطة</span><span class="value success">{{ activeReservations() }}</span></span>
          </div>
          <div class="metric-card" [class.warn]="openConflicts() > 0" [class.neutral]="openConflicts() === 0">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg></span>
            <span class="m-body"><span class="label">التعارضات المفتوحة</span><span class="value" [class.warn]="openConflicts() > 0">{{ openConflicts() }}</span></span>
          </div>
          <div class="metric-card occ" [class.hot]="utilization() >= 90" [class.mid]="utilization() >= 70 && utilization() < 90">
            <span class="m-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg></span>
            <span class="m-body">
              <span class="label">إشغال موارد اليوم</span>
              <span class="value">{{ utilization() }}<span class="v-suffix">%</span></span>
              <span class="occ-bar"><span class="occ-fill" [style.width.%]="utilization()"></span></span>
            </span>
          </div>
        </div>

        <!-- ◆ عنصر التوقيع: شريط الموارد الزمني -->
        <nb-panel>
          <div class="ribbon-head">
            <div class="rh-title">
              <span class="rh-dot"></span>
              <h3>شريط الموارد الزمني</h3>
              <span class="rh-sub">تراكب الحجوزات على المورد نفسه يظهر متوهّجاً بالأحمر</span>
            </div>
            <div class="rh-ctrl">
              <button class="day-nav" (click)="shiftDay(-1)" aria-label="اليوم السابق">‹</button>
              <nb-datepicker [value]="day" (valueChange)="onDayChange($event)" ariaLabel="يوم الشريط الزمني"></nb-datepicker>
              <button class="day-nav" (click)="shiftDay(1)" aria-label="اليوم التالي">›</button>
            </div>
          </div>

          @if (!ribbonRows().length) {
            <div class="ribbon-empty">لا موارد مجدولة بعد. أضِف موارد وحجوزات لتظهر على الخط الزمني.</div>
          } @else {
            <div class="ribbon-scroll">
              <!-- محور الساعات -->
              <div class="axis">
                <span class="axis-label"></span>
                <div class="axis-hours">
                  @for (h of hours; track h) { <span class="hx" [style.inset-inline-start.%]="hourPct(h)">{{ h }}</span> }
                </div>
              </div>
              @for (row of ribbonRows(); track row.id) {
                <div class="lane" [class.has-conflict]="row.hasConflict">
                  <span class="lane-label" [title]="row.name">
                    <span class="lane-type" [attr.data-t]="row.type">{{ resourceType(row.type) }}</span>
                    <span class="lane-name">{{ row.name }}</span>
                  </span>
                  <div class="lane-track">
                    @for (b of row.blocks; track b.id) {
                      <button class="block" [class.conflict]="b.conflict"
                        [style.inset-inline-start.%]="b.left" [style.width.%]="b.width"
                        [style.--tone]="b.tone" (click)="pickBlock(b)"
                        [title]="b.title + ' · ' + b.from + '–' + b.to">
                        <span class="blk-t">{{ b.title }}</span>
                        <span class="blk-time mono">{{ b.from }}</span>
                      </button>
                    }
                    @if (!row.blocks.length) { <span class="lane-idle">لا حجوزات</span> }
                  </div>
                </div>
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

        <!-- توزّع الجداول + الموارد -->
        <div class="bento">
          <nb-panel title="الجداول حسب المجال">
            @if (!scheduleTypeRows().length) { <p class="hint">لا جداول بعد.</p> }
            @else {
              <div class="hbars">
                @for (r of scheduleTypeRows(); track r.key) {
                  <div class="hbar-row">
                    <span class="hbar-name">{{ scheduleType(r.key) }}</span>
                    <span class="hbar-track"><span class="hbar-fill" [style.width.%]="(r.count / maxScheduleType()) * 100"></span></span>
                    <span class="hbar-val mono">{{ r.count }}</span>
                  </div>
                }
              </div>
            }
          </nb-panel>

          <nb-panel title="الموارد حسب النوع">
            @if (!resourceTypeRows().length) { <p class="hint">لا موارد بعد.</p> }
            @else {
              <div class="res-chips">
                @for (r of resourceTypeRows(); track r.key) {
                  <div class="res-chip" [attr.data-t]="r.key">
                    <span class="rc-val">{{ r.count }}</span>
                    <span class="rc-lbl">{{ resourceType(r.key) }}</span>
                  </div>
                }
              </div>
            }
          </nb-panel>
        </div>

        <!-- مركز التعارضات -->
        <nb-panel [title]="'مركز التعارضات' + (openConflicts() ? ' · ' + openConflicts() + ' مفتوح' : '')" [flush]="true">
          @if (!openConflictList().length) {
            <div class="clear-state">
              <span class="clear-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg></span>
              <p>لا تعارضات مفتوحة. كل الموارد متسقة الآن.</p>
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
                  <button class="nb-btn-secondary sm" (click)="resolve(c)">وضع كمحلول</button>
                </div>
              }
            </div>
          }
        </nb-panel>

        <!-- الحجوزات -->
        <nb-panel title="أحدث الحجوزات" [flush]="true">
          @if (!reservations().length) {
            <div class="clear-state"><p>لا حجوزات بعد. اضغط «احجز مورداً» لإنشاء أول حجز.</p></div>
          } @else {
            <div class="tbl">
              <div class="tbl-head"><span>العنوان</span><span>المورد</span><span>التاريخ</span><span>الوقت</span><span>الحالة</span></div>
              @for (r of reservations().slice(0, 12); track r.id) {
                <div class="tbl-row">
                  <span class="strong">{{ r.title }}</span>
                  <span>{{ resourceName(r.resource) }}</span>
                  <span class="mono">{{ r.date }}</span>
                  <span class="mono">{{ hm(r.start_time) }}–{{ hm(r.end_time) }}</span>
                  <span><span [class]="resStatusBadge(r.status)">{{ resStatus(r.status) }}</span></span>
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
            <div class="modal-head"><h3>احجز مورداً</h3><button class="modal-x" (click)="closeBook()">×</button></div>
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
              <button class="nb-btn-secondary" (click)="closeBook()">إلغاء</button>
              <button class="nb-btn-secondary" (click)="checkBook()" [disabled]="booking() || !bookValid()">فحص التوفّر</button>
              <button class="nb-btn-primary" (click)="confirmBook()" [disabled]="booking() || !bookValid()">{{ booking() ? 'جارٍ…' : 'تأكيد الحجز' }}</button>
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

    /* KPIs */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; margin-bottom: 16px; }
    .metric-card { position: relative; overflow: hidden; background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 16px 18px; display: flex; align-items: center; gap: 14px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
    .metric-card::before { content: ''; position: absolute; inset-block-start: 0; inset-inline: 0; height: 3px; background: var(--nb-text-faint); }
    .metric-card.total::before { background: var(--nb-primary-500); } .metric-card.info::before { background: var(--nb-info); }
    .metric-card.success::before { background: var(--nb-success); } .metric-card.warn::before { background: var(--nb-warning); } .metric-card.neutral::before { background: var(--nb-text-muted); }
    .m-icon { flex-shrink: 0; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: var(--nb-surface-raised); color: var(--nb-text-muted); }
    .m-icon svg { width: 22px; height: 22px; }
    .metric-card.total .m-icon { background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .metric-card.info .m-icon { background: rgba(0,122,255,.12); color: var(--nb-info); }
    .metric-card.success .m-icon { background: rgba(52,199,89,.12); color: var(--nb-success); }
    .metric-card.warn .m-icon { background: rgba(255,159,10,.14); color: var(--nb-warning); }
    .m-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
    .metric-card .label { font-size: 12.5px; color: var(--nb-text-muted); font-weight: 700; }
    .metric-card .value { font-size: 28px; font-weight: 800; line-height: 1.1; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .metric-card .value.info { color: var(--nb-info); } .metric-card .value.success { color: var(--nb-success); } .metric-card .value.warn { color: var(--nb-warning); }
    .v-suffix { font-size: 15px; font-weight: 700; color: var(--nb-text-muted); margin-inline-start: 2px; }
    .metric-card.occ::before { background: var(--nb-primary-500); } .metric-card.occ.mid::before { background: var(--nb-warning); } .metric-card.occ.hot::before { background: var(--nb-danger); }
    .metric-card.occ .m-icon { background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .occ-bar { height: 6px; background: var(--nb-surface-raised); border-radius: 3px; overflow: hidden; margin-top: 6px; }
    .occ-fill { display: block; height: 100%; background: var(--nb-primary-500); border-radius: 3px; transition: width .6s cubic-bezier(.4,0,.2,1); }
    .metric-card.occ.mid .occ-fill { background: var(--nb-warning); } .metric-card.occ.hot .occ-fill { background: var(--nb-danger); }

    /* ◆ الشريط الزمني (التوقيع) */
    .ribbon-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
    .rh-title { display: flex; align-items: center; gap: 10px; }
    .rh-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--nb-primary-600); box-shadow: 0 0 0 4px var(--nb-primary-50); }
    .rh-title h3 { margin: 0; font-size: 15px; font-weight: 800; color: var(--nb-text); }
    .rh-sub { font-size: 11.5px; color: var(--nb-text-muted); }
    .rh-ctrl { display: flex; align-items: center; gap: 6px; }
    .rh-ctrl input { height: 34px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); background: var(--nb-surface); }
    .day-nav { width: 34px; height: 34px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); background: var(--nb-surface); cursor: pointer; font-size: 18px; color: var(--nb-text-secondary); }
    .day-nav:hover { background: var(--nb-surface-raised); }
    .ribbon-empty { padding: 30px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
    .ribbon-scroll { overflow-x: auto; }
    .axis { display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin-bottom: 6px; min-width: 620px; }
    .axis-hours { position: relative; height: 16px; }
    .hx { position: absolute; top: 0; transform: translateX(50%); font-size: 10px; color: var(--nb-text-faint); font-variant-numeric: tabular-nums; }
    .lane { display: grid; grid-template-columns: 150px 1fr; gap: 10px; align-items: center; padding: 5px 0; min-width: 620px; }
    .lane-label { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .lane-type { font-size: 10px; font-weight: 700; color: var(--nb-primary-700); }
    .lane-name { font-size: 12.5px; font-weight: 600; color: var(--nb-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .lane-track { position: relative; height: 40px; background: var(--nb-surface-raised); border-radius: 8px; overflow: hidden; }
    .lane.has-conflict .lane-track { box-shadow: inset 0 0 0 1px rgba(255,59,48,.4); }
    .lane-idle { position: absolute; inset-inline-start: 12px; top: 50%; transform: translateY(-50%); font-size: 11px; color: var(--nb-text-faint); }
    .block { position: absolute; top: 4px; bottom: 4px; min-width: 40px; border: none; border-radius: 6px; cursor: pointer; padding: 4px 8px; display: flex; flex-direction: column; justify-content: center; gap: 1px; overflow: hidden;
      background: color-mix(in srgb, var(--tone, var(--nb-primary-500)) 90%, #fff); color: #fff; transition: transform .12s, box-shadow .12s; }
    .block:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0,0,0,.18); z-index: 2; }
    .block.conflict { background: var(--nb-danger); box-shadow: 0 0 0 2px rgba(255,59,48,.35), 0 0 14px rgba(255,59,48,.5); animation: pulse 1.8s ease-in-out infinite; }
    @keyframes pulse { 0%,100% { box-shadow: 0 0 0 2px rgba(255,59,48,.35), 0 0 12px rgba(255,59,48,.4); } 50% { box-shadow: 0 0 0 2px rgba(255,59,48,.5), 0 0 20px rgba(255,59,48,.7); } }
    @media (prefers-reduced-motion: reduce) { .block.conflict { animation: none; } }
    .blk-t { font-size: 11px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .blk-time { font-size: 9.5px; opacity: .85; }
    .picked { display: flex; align-items: center; gap: 10px; margin-top: 12px; padding: 10px 12px; background: var(--nb-surface-raised); border-radius: var(--nb-radius); font-size: 12.5px; }
    .picked-dot { width: 10px; height: 10px; border-radius: 3px; } .picked strong { color: var(--nb-text); }
    .picked .mono { color: var(--nb-text-muted); } .picked-x { margin-inline-start: auto; border: none; background: transparent; font-size: 18px; color: var(--nb-text-muted); cursor: pointer; }

    /* bento */
    .bento { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; align-items: start; }
    @media (max-width: 860px) { .bento { grid-template-columns: 1fr; } }
    .hbars { display: flex; flex-direction: column; gap: 10px; }
    .hbar-row { display: grid; grid-template-columns: 96px 1fr 34px; align-items: center; gap: 8px; }
    .hbar-name { font-size: 12px; color: var(--nb-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .hbar-track { height: 10px; background: var(--nb-surface-raised); border-radius: 5px; overflow: hidden; }
    .hbar-fill { display: block; height: 100%; background: linear-gradient(90deg, var(--nb-primary-600), var(--nb-primary-400)); border-radius: 5px; transition: width .6s cubic-bezier(.4,0,.2,1); }
    .hbar-val { font-size: 12px; font-weight: 700; color: var(--nb-text); text-align: end; }
    .res-chips { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 10px; }
    .res-chip { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 12px; border-radius: 12px; background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); }
    .rc-val { font-size: 20px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .rc-lbl { font-size: 11px; color: var(--nb-text-muted); }

    /* conflicts */
    .clear-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 28px 16px; text-align: center; color: var(--nb-text-muted); font-size: 13px; }
    .clear-ico { color: var(--nb-success); } .clear-ico svg { width: 34px; height: 34px; }
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
    .nb-btn-secondary.sm { height: 30px; padding: 0 12px; font-size: 12px; }

    /* table */
    .tbl { display: flex; flex-direction: column; }
    .tbl-head, .tbl-row { display: grid; grid-template-columns: 1.6fr 1.2fr .9fr .9fr .8fr; gap: 8px; padding: 10px 16px; align-items: center; }
    .tbl-head { background: var(--nb-surface-raised); border-bottom: 1px solid var(--nb-border-soft); font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .tbl-row { border-bottom: 1px solid var(--nb-border-row); font-size: 12.5px; color: var(--nb-text); }
    .tbl-row:last-child { border-bottom: none; } .tbl-row:hover { background: var(--nb-surface-raised); }
    .strong { font-weight: 700; }

    /* workflow */
    .wf-strip { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
    .wf-chip { display: inline-flex; align-items: center; gap: 8px; background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: 999px; padding: 8px 14px 8px 10px; text-decoration: none; transition: transform .15s, box-shadow .15s, border-color .15s; }
    .wf-chip:hover { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(0,0,0,.07); border-color: var(--nb-primary-400); }
    .wf-mark { width: 26px; height: 26px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .wf-t { font-size: 13px; font-weight: 700; color: var(--nb-text); }

    /* modal */
    .modal-scrim { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
    .modal { width: min(560px, 100%); background: var(--nb-surface); border-radius: var(--nb-radius-card); box-shadow: 0 20px 50px rgba(0,0,0,.3); overflow: hidden; animation: mIn .2s ease-out; }
    @keyframes mIn { from { opacity: 0; transform: scale(.96) translateY(8px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .modal { animation: none; } }
    .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--nb-border-soft); }
    .modal-head h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--nb-text); }
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

  day = this.today();
  readonly daySig = signal(this.today());
  readonly picked = signal<any | null>(null);

  // الحجز
  readonly bookOpen = signal(false);
  readonly booking = signal(false);
  readonly bookConflicts = signal<any[]>([]);
  readonly bookOk = signal(false);
  readonly bookError = signal('');
  bf: any = { title: '', resource_id: '', date: this.today(), start: '08:00', end: '09:00' };

  readonly hours = [7, 8, 9, 10, 11, 12, 13, 14, 15];
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

  // ----- مشتقات -----
  readonly activeReservations = computed(() => this.reservations().filter((r) => ['reserved', 'approved'].includes(r.status)).length);
  readonly openConflictList = computed(() => this.conflicts().filter((c) => !c.resolved));
  readonly openConflicts = computed(() => this.openConflictList().length);

  private resourceMap = computed(() => new Map(this.resources().map((r) => [String(r.id), r])));

  readonly scheduleTypeRows = computed(() => this.countBy(this.schedules(), 'schedule_type'));
  readonly maxScheduleType = computed(() => Math.max(1, ...this.scheduleTypeRows().map((r) => r.count)));
  readonly resourceTypeRows = computed(() => this.countBy(this.resources(), 'resource_type'));

  /** صفوف الشريط الزمني: مورد لكل مسار، مع كتل حجوزات/أحداث اليوم المختار وكشف التراكب. */
  readonly ribbonRows = computed(() => {
    const d = this.daySig();
    const palette = ['#3F51B5', '#007aff', '#2E9E7B', '#af52de', '#5856d6', '#00c7be', '#ff9f0a'];
    const items: any[] = [];
    for (const r of this.reservations()) {
      if (r.date === d && r.resource) items.push({ id: 'rv-' + r.id, resource: String(r.resource), title: r.title, start: r.start_time, end: r.end_time });
    }
    for (const e of this.events()) {
      if (e.start_date === d && e.resource) items.push({ id: 'ev-' + e.id, resource: String(e.resource), title: e.title, start: e.start_time, end: e.end_time });
    }
    const byRes = new Map<string, any[]>();
    for (const it of items) { if (!byRes.has(it.resource)) byRes.set(it.resource, []); byRes.get(it.resource)!.push(it); }

    const withItems = [...byRes.keys()];
    const others = this.resources().map((r) => String(r.id)).filter((id) => !byRes.has(id));
    const order = [...withItems, ...others].slice(0, 12);

    return order.map((rid, ri) => {
      const res = this.resourceMap().get(rid);
      const blocks = (byRes.get(rid) ?? [])
        .map((b) => ({ ...b, s: this.toMin(b.start), e: this.toMin(b.end) }))
        .sort((a, b) => a.s - b.s);
      let hasConflict = false;
      for (let i = 0; i < blocks.length; i++) {
        for (let j = i + 1; j < blocks.length; j++) {
          if (blocks[i].s < blocks[j].e && blocks[j].s < blocks[i].e) { blocks[i].conflict = true; blocks[j].conflict = true; hasConflict = true; }
        }
      }
      return {
        id: rid, name: res?.name ?? 'مورد', type: res?.resource_type ?? 'other', hasConflict,
        blocks: blocks.map((b) => ({
          id: b.id, title: b.title, conflict: !!b.conflict, tone: palette[ri % palette.length],
          from: this.hm(b.start), to: this.hm(b.end),
          left: this.clampPct(b.s), width: Math.max(4, this.clampPct(b.e) - this.clampPct(b.s)),
          resourceName: res?.name ?? 'مورد',
        })),
      };
    });
  });

  /** إشغال موارد اليوم = نسبة الموارد التي لها حجز اليوم. */
  readonly utilization = computed(() => {
    const total = this.resources().length;
    if (!total) return 0;
    const busy = this.ribbonRows().filter((r) => r.blocks.length).length;
    return Math.round((busy / total) * 100);
  });

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

  onDayChange(value?: string): void { if (value !== undefined) this.day = value; this.daySig.set(this.day); this.picked.set(null); }
  shiftDay(delta: number): void {
    const dt = new Date(this.day + 'T00:00:00'); dt.setDate(dt.getDate() + delta);
    this.day = dt.toISOString().slice(0, 10); this.onDayChange();
  }

  readonly syncing = signal(false);
  syncResources(): void {
    if (this.syncing()) return;
    this.syncing.set(true);
    this.svc.syncResources().subscribe({
      next: () => { this.syncing.set(false); this.load(); },
      error: () => this.syncing.set(false),
    });
  }
  pickBlock(b: any): void { this.picked.set(b); }

  // ----- الحجز الذكي -----
  openBook(): void { this.bookConflicts.set([]); this.bookOk.set(false); this.bookError.set(''); this.bf = { title: '', resource_id: '', date: this.day, start: '08:00', end: '09:00' }; this.bookOpen.set(true); }
  closeBook(): void { this.bookOpen.set(false); }
  bookValid(): boolean { return !!this.bf.resource_id && !!this.bf.date && !!this.bf.start && !!this.bf.end; }

  private bookBody() {
    return { resource_id: this.bf.resource_id, date: this.bf.date, start_time: this.bf.start + ':00', end_time: this.bf.end + ':00' };
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
    this.svc.checkConflicts(this.bookBody()).subscribe({
      next: (res) => {
        const c = res?.data?.conflicts ?? [];
        if (c.length) { this.booking.set(false); this.bookConflicts.set(c); this.bookOk.set(false); return; }
        const body = { resource: this.bf.resource_id, title: this.bf.title || 'حجز مورد', date: this.bf.date, start_time: this.bf.start + ':00', end_time: this.bf.end + ':00', status: 'reserved' };
        this.svc.createReservation(body).subscribe({
          next: () => { this.booking.set(false); this.closeBook(); this.load(); },
          error: (e) => { this.booking.set(false); this.bookError.set(e?.error?.message || 'تعذّر إنشاء الحجز.'); },
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
  private today(): string { return new Date().toISOString().slice(0, 10); }

  scheduleType(k: string): string { return SCHEDULE_TYPES[k] ?? k; }
  resourceType(k: string): string { return RESOURCE_TYPES[k] ?? k; }
  resourceName(id: string): string { return this.resourceMap().get(String(id))?.name ?? '—'; }
  resStatus(s: string): string { return RES_STATUS[s] ?? s; }
  resStatusBadge(s: string): string {
    return ({ approved: 'nb-badge-success', reserved: 'nb-badge-info', completed: 'nb-badge-neutral', rejected: 'nb-badge-danger', cancelled: 'nb-badge-neutral', expired: 'nb-badge-neutral', draft: 'nb-badge-neutral' } as any)[s] || 'nb-badge-neutral';
  }
  sevLabel(s: string): string { return ({ high: 'حرج', medium: 'متوسط', low: 'منخفض' } as any)[s] || s; }
}
