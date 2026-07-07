import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TenantService } from '../../core/services/tenant.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../shared/nebras/nb-stat-card.component';

/**
 * محرك الجدولة الموحد للمؤسسة — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-scheduling-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="محرك الجدولة الموحد للمؤسسة"
        [subtitle]="'تعقب الموارد والتعارضات والحجوزات لـ ' + (($any(tenantService).currentTenant())?.nameAr || 'نبراس ERP')"
      ></nb-page-header>

      <div class="stats-grid">
        <nb-stat-card label="إجمالي الجداول" [value]="schedulesCount()"></nb-stat-card>
        <nb-stat-card label="الموارد المجدولة" [value]="resourcesCount()" valueKind="info"></nb-stat-card>
        <nb-stat-card label="الحجوزات النشطة" [value]="reservationsCount()" valueKind="success"></nb-stat-card>
        <nb-stat-card label="التعارضات المكتشفة" [value]="conflictsCount()" [valueKind]="conflictsCount() ? 'danger' : 'default'"></nb-stat-card>
      </div>

      @if (conflictsCount() > 0) {
        <nb-panel title="مركز حل التعارضات والتحذيرات">
          <div class="conflict-list">
            @for (conf of conflicts(); track $index) {
              <div class="conflict-item">
                <span [class]="conf.severity === 'high' ? 'nb-badge-danger' : 'nb-badge-warning'">{{ conf.severity === 'high' ? 'حرج' : 'متوسط' }}</span>
                <p class="desc">{{ conf.description }}</p>
                <span class="time">{{ conf.detected_at | date:'shortTime' }}</span>
              </div>
            }
          </div>
        </nb-panel>
      }

      <h2 class="section-title">قائمة الجداول النشطة</h2>
      <div class="cards-grid">
        @for (sch of schedules(); track sch.id) {
          <div class="nb-card sc-card">
            <div class="card-header">
              <span class="nb-badge-info">{{ sch.schedule_type }}</span>
              <h3>{{ sch.name }}</h3>
            </div>
            <p class="code">الرمز المرجعي: {{ sch.code }}</p>
            <p class="desc">{{ sch.description || 'لا يوجد وصف.' }}</p>
            <div class="card-footer">
              <span [class]="sch.status === 'published' ? 'nb-badge-success' : 'nb-badge-warning'">{{ sch.status === 'published' ? 'منشور' : 'مسودة' }}</span>
              <button class="nb-btn-secondary sm">إدارة الجدول</button>
            </div>
          </div>
        }
        @if (schedules().length === 0) {
          <div class="no-data">لا توجد جداول نشطة حالياً.</div>
        }
      </div>
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
    .conflict-list { display: flex; flex-direction: column; gap: 8px; }
    .conflict-item {
      background: var(--nb-surface-raised);
      border: 1px solid var(--nb-border-soft);
      padding: 10px 14px;
      border-radius: var(--nb-radius);
      display: flex; align-items: center; gap: 12px;
    }
    .conflict-item .desc { flex: 1; margin: 0; font-size: 13px; color: var(--nb-text-secondary); }
    .conflict-item .time { font-size: 11px; color: var(--nb-text-muted); }
    .section-title { font-size: 14px; font-weight: 700; color: var(--nb-text); margin: 16px 0 12px; }
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .sc-card { display: flex; flex-direction: column; gap: 10px; }
    .card-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .card-header h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .code { font-size: 11px; color: var(--nb-text-muted); margin: 0; }
    .desc { font-size: 12px; color: var(--nb-text-secondary); flex: 1; margin: 0; }
    .card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
    .nb-btn-secondary.sm { height: 26px; padding: 0 12px; font-size: 12px; }
    .no-data { grid-column: 1 / -1; text-align: center; padding: 28px; color: var(--nb-text-muted); font-size: 13px; }
  `]
})
export class SchedulingDashboardComponent implements OnInit {
  tenantService = inject(TenantService);
  http = inject(HttpClient);

  schedules = signal<any[]>([]);
  conflicts = signal<any[]>([]);

  schedulesCount = signal(0);
  resourcesCount = signal(0);
  reservationsCount = signal(0);
  conflictsCount = signal(0);

  ngOnInit() {
    this.loadSchedulingData();
  }

  loadSchedulingData() {
    this.http.get<any>('/api/v1/scheduling/schedules/').subscribe({
      next: (res) => {
        if (res && res.success) {
          this.schedules.set(res.data);
          this.schedulesCount.set(res.data.length);
        }
      }
    });

    this.http.get<any>('/api/v1/scheduling/resources/').subscribe({
      next: (res) => {
        if (res && res.success) this.resourcesCount.set(res.data.length);
      }
    });

    this.http.get<any>('/api/v1/scheduling/reservations/').subscribe({
      next: (res) => {
        if (res && res.success) this.reservationsCount.set(res.data.length);
      }
    });

    this.http.get<any>('/api/v1/scheduling/conflicts/').subscribe({
      next: (res) => {
        if (res && res.success) {
          this.conflicts.set(res.data);
          this.conflictsCount.set(res.data.length);
        }
      }
    });
  }
}