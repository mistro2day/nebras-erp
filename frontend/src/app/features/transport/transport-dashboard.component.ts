import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { TransportService } from './transport.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../shared/nebras/nb-stat-card.component';

/**
 * نظام النقل والأسطول المدرسي — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-transport-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTabsModule, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="نظام إدارة النقل والأسطول المدرسي"
        subtitle="مراقبة مسارات الحافلات، حالة الأسطول، تموين الوقود، وحضور ركاب الرحلات اليومية"
      >
        <button class="nb-btn-secondary" (click)="loadDashboard()">تحديث البيانات</button>
      </nb-page-header>

      @if (transportService.stats(); as stats) {
        <div class="stats-grid">
          <nb-stat-card label="إجمالي الحافلات" [value]="stats.total_vehicles" suffix="حافلة"></nb-stat-card>
          <nb-stat-card label="الرحلات النشطة" [value]="stats.active_trips" suffix="جارية" valueKind="success"></nb-stat-card>
          <nb-stat-card label="إجمالي السائقين" [value]="stats.total_drivers" suffix="سائق"></nb-stat-card>
          <nb-stat-card label="فحص السلامة التالف" [value]="stats.failed_inspections" suffix="اليوم" [valueKind]="stats.failed_inspections ? 'danger' : 'default'"></nb-stat-card>
        </div>
      }

      <nb-panel [flush]="true">
        <mat-tab-group class="nb-tabs">
          <mat-tab label="الرحلات والتشغيل الميداني">
            <div class="tbl">
              <div class="tbl-head tr"><span>المسار</span><span>الحافلة</span><span>الحالة</span><span>الإجراءات</span></div>
              @for (row of trips; track row.id) {
                <div class="tbl-row tr">
                  <span class="strong">{{ row.route_name || 'مسار مدرسي افتراضي' }}</span>
                  <span>{{ row.vehicle_plate || 'لوحة حافلة رقم 1234' }}</span>
                  <span><span [class]="tripBadge(row.status)">{{ getTripStatusText(row.status) }}</span></span>
                  <span>
                    @if (row.status === 'scheduled') { <button class="nb-btn-primary sm" (click)="startTrip(row.id)">انطلاق</button> }
                    @if (row.status === 'running') { <button class="nb-btn-secondary sm" (click)="completeTrip(row.id)">إكمال</button> }
                  </span>
                </div>
              }
              @if (trips.length === 0) { <div class="tbl-empty">لا توجد رحلات مجدولة.</div> }
            </div>
          </mat-tab>

          <mat-tab label="الأسطول وفحص الأمان">
            <div class="tbl">
              <div class="tbl-head vh"><span>رقم الحافلة</span><span>رقم اللوحة</span><span>السعة</span><span>الحالة</span><span>فحص الأمان اليومي</span></div>
              @for (row of vehicles; track row.id) {
                <div class="tbl-row vh">
                  <span class="strong">{{ row.vehicle_number }}</span>
                  <span>{{ row.plate_number }}</span>
                  <span>{{ row.capacity }} راكب</span>
                  <span><span [class]="vehicleBadge(row.status)">{{ getVehicleStatusText(row.status) }}</span></span>
                  <span class="actions">
                    <button class="nb-btn-ghost sm" (click)="inspectVehicle(row.id, 'passed')">اجتاز</button>
                    <button class="nb-btn-danger sm" (click)="inspectVehicle(row.id, 'failed')">بلاغ عطل</button>
                  </span>
                </div>
              }
              @if (vehicles.length === 0) { <div class="tbl-empty">لا توجد مركبات.</div> }
            </div>
          </mat-tab>
        </mat-tab-group>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .nb-tabs { padding: 4px 8px 8px; }
    .tbl { display: flex; flex-direction: column; padding-top: 8px; }
    .tbl-head, .tbl-row {
      display: grid;
      gap: 8px;
      padding: 9px 16px;
      align-items: center;
    }
    .tbl-head.tr, .tbl-row.tr { grid-template-columns: 1.4fr 1.2fr 1.2fr 1fr; }
    .tbl-head.vh, .tbl-row.vh { grid-template-columns: 1fr 1fr 1fr 1.3fr 1.4fr; }
    .tbl-head {
      background: var(--nb-surface-raised);
      border-bottom: 1px solid var(--nb-border-soft);
      padding: 8px 16px;
      font-size: 11px;
      font-weight: 700;
      color: var(--nb-text-muted);
    }
    .tbl-row {
      border-bottom: 1px solid var(--nb-border-row);
      font-size: 13px;
      color: var(--nb-text);
    }
    .tbl-row:last-child { border-bottom: none; }
    .tbl-row:hover { background: var(--nb-surface-raised); }
    .strong { font-weight: 600; }
    .actions { display: flex; gap: 6px; }
    .nb-btn-primary.sm, .nb-btn-secondary.sm, .nb-btn-ghost.sm, .nb-btn-danger.sm {
      height: 26px; padding: 0 12px; font-size: 12px;
    }
    .tbl-empty { padding: 28px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
  `]
})
export class TransportDashboardComponent implements OnInit {
  transportService = inject(TransportService);

  trips: any[] = [];
  vehicles: any[] = [];

  tripColumns: string[] = ['route', 'vehicle', 'status', 'actions'];
  vehicleColumns: string[] = ['number', 'plate', 'capacity', 'status', 'actions'];

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.transportService.getDashboardStats().subscribe();
    this.transportService.getTrips().subscribe(data => this.trips = data);
    this.transportService.getVehicles().subscribe(data => this.vehicles = data);
  }

  startTrip(tripId: string) {
    this.transportService.startTrip(tripId).subscribe(() => {
      this.loadDashboard();
    });
  }

  completeTrip(tripId: string) {
    this.transportService.completeTrip(tripId).subscribe(() => {
      this.loadDashboard();
    });
  }

  inspectVehicle(vehicleId: string, status: string) {
    const notes = status === 'failed' ? 'فشل فحص الفرامل وأنوار الإشارة الخلفية' : 'تم فحص الأمان اليومي بنجاح.';
    this.transportService.recordInspection(vehicleId, status, notes).subscribe(() => {
      this.loadDashboard();
    });
  }

  getTripStatusText(status: string): string {
    switch (status) {
      case 'scheduled': return 'مجدولة بانتظار الانطلاق';
      case 'running': return 'في رحلة حالياً';
      case 'completed': return 'اكتملت الرحلة';
      case 'cancelled': return 'ملغاة';
      default: return status;
    }
  }

  tripBadge(status: string): string {
    const map: Record<string, string> = {
      scheduled: 'nb-badge-neutral',
      running: 'nb-badge-success',
      completed: 'nb-badge-info',
      cancelled: 'nb-badge-danger',
    };
    return map[status] || 'nb-badge-neutral';
  }

  getVehicleStatusText(status: string): string {
    switch (status) {
      case 'available': return 'جاهزة ومتاحة للتشغيل';
      case 'on_trip': return 'في رحلة حالياً';
      case 'maintenance': return 'في مركز الصيانة';
      case 'out_of_service': return 'خارج الخدمة';
      default: return status;
    }
  }

  vehicleBadge(status: string): string {
    const map: Record<string, string> = {
      available: 'nb-badge-success',
      on_trip: 'nb-badge-info',
      maintenance: 'nb-badge-warning',
      out_of_service: 'nb-badge-danger',
    };
    return map[status] || 'nb-badge-neutral';
  }
}
