import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { TransportService } from './transport.service';

@Component({
  selector: 'app-transport-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTabsModule
  ],
  template: `
    <div class="dashboard-container" dir="rtl">
      <!-- Header -->
      <div class="dashboard-header">
        <div class="title-section">
          <h1>نظام إدارة النقل والأسطول المدرسي</h1>
          <p>لوحة مراقبة وإدارة مسارات الحافلات، حالة الأسطول، تموين الوقود، وحضور وغياب ركاب الرحلات اليومية</p>
        </div>
        <button mat-flat-button color="primary" (click)="loadDashboard()">
          <mat-icon>refresh</mat-icon> تحديث البيانات
        </button>
      </div>

      <!-- Loading State -->
      <div class="spinner-container" *ngIf="transportService.loading()">
        <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
      </div>

      <!-- Stats Cards Grid -->
      <div class="stats-grid" *ngIf="transportService.stats() as stats">
        <!-- Total Vehicles -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper blue">
              <mat-icon>directions_bus</mat-icon>
            </div>
            <mat-card-title>إجمالي الحافلات</mat-card-title>
            <mat-card-subtitle>حافلات الأسطول المتاحة</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value text-blue">
            {{ stats.total_vehicles }} حافلة
          </mat-card-content>
        </mat-card>

        <!-- Active Trips -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper green">
              <mat-icon>explore</mat-icon>
            </div>
            <mat-card-title>الرحلات النشطة</mat-card-title>
            <mat-card-subtitle>الرحلات الجارية الآن في الميدان</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value text-green">
            {{ stats.active_trips }} رحلة جارية
          </mat-card-content>
        </mat-card>

        <!-- Total Drivers -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper purple">
              <mat-icon>badge</mat-icon>
            </div>
            <mat-card-title>إجمالي السائقين</mat-card-title>
            <mat-card-subtitle>سائقين ومسؤولين مسجلين</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value text-purple">
            {{ stats.total_drivers }} سائق
          </mat-card-content>
        </mat-card>

        <!-- Failed Inspections -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper red">
              <mat-icon>report_problem</mat-icon>
            </div>
            <mat-card-title>فحص السلامة التالف</mat-card-title>
            <mat-card-subtitle>حافلات لم تجتز فحص الأمان اليومي</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value alert-red">
            {{ stats.failed_inspections }} أعطال اليوم
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Main Tabs Section -->
      <mat-tab-group class="dashboard-tabs">
        <mat-tab label="الرحلات والتشغيل الميداني">
          <div class="tab-content">
            <div class="header-row">
              <h3>الرحلات المجدولة والنشطة</h3>
            </div>
            <div class="table-container">
              <table mat-table [dataSource]="trips" class="w-full">
                <ng-container matColumnDef="route">
                  <th mat-header-cell *matHeaderCellDef>المسار</th>
                  <td mat-cell *matCellDef="let row" class="bold text-blue">{{ row.route_name || 'مسار مدرسي افتراضي' }}</td>
                </ng-container>

                <ng-container matColumnDef="vehicle">
                  <th mat-header-cell *matHeaderCellDef>الحافلة</th>
                  <td mat-cell *matCellDef="let row">{{ row.vehicle_plate || 'لوحة حافلة رقم 1234' }}</td>
                </ng-container>

                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>الحالة</th>
                  <td mat-cell *matCellDef="let row">
                    <span class="badge" [ngClass]="getTripStatusClass(row.status)">{{ getTripStatusText(row.status) }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>الإجراءات</th>
                  <td mat-cell *matCellDef="let row">
                    <button mat-flat-button color="primary" *ngIf="row.status === 'scheduled'" (click)="startTrip(row.id)">
                      <mat-icon>play_arrow</mat-icon> انطلاق
                    </button>
                    <button mat-flat-button color="accent" *ngIf="row.status === 'running'" (click)="completeTrip(row.id)">
                      <mat-icon>check_circle</mat-icon> إكمال
                    </button>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="tripColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: tripColumns;"></tr>
              </table>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="الأسطول وفحص الأمان">
          <div class="tab-content">
            <div class="header-row">
              <h3>حالة أسطول المركبات</h3>
            </div>
            <div class="table-container">
              <table mat-table [dataSource]="vehicles" class="w-full">
                <ng-container matColumnDef="number">
                  <th mat-header-cell *matHeaderCellDef>رقم الحافلة</th>
                  <td mat-cell *matCellDef="let row" class="bold">{{ row.vehicle_number }}</td>
                </ng-container>

                <ng-container matColumnDef="plate">
                  <th mat-header-cell *matHeaderCellDef>رقم اللوحة</th>
                  <td mat-cell *matCellDef="let row">{{ row.plate_number }}</td>
                </ng-container>

                <ng-container matColumnDef="capacity">
                  <th mat-header-cell *matHeaderCellDef>السعة المقعدية</th>
                  <td mat-cell *matCellDef="let row">{{ row.capacity }} راكب</td>
                </ng-container>

                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>الحالة</th>
                  <td mat-cell *matCellDef="let row">
                    <span class="badge" [ngClass]="getVehicleStatusClass(row.status)">{{ getVehicleStatusText(row.status) }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>فحص الأمان اليومي</th>
                  <td mat-cell *matCellDef="let row">
                    <button mat-stroked-button color="primary" (click)="inspectVehicle(row.id, 'passed')">
                      <mat-icon>verified</mat-icon> اجتاز
                    </button>
                    &nbsp;
                    <button mat-stroked-button color="warn" (click)="inspectVehicle(row.id, 'failed')">
                      <mat-icon>dangerous</mat-icon> بلاغ عطل
                    </button>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="vehicleColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: vehicleColumns;"></tr>
              </table>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 2rem;
      background: #f8fafc;
      min-height: 100vh;
      font-family: 'Outfit', sans-serif;
    }
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 1rem;
    }
    .dashboard-header h1 {
      margin: 0;
      font-size: 2rem;
      color: #0f172a;
      font-weight: 700;
    }
    .dashboard-header p {
      margin: 0.5rem 0 0 0;
      color: #64748b;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2.5rem;
    }
    .stat-card {
      border: none;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      background: #fff;
    }
    .icon-wrapper {
      padding: 10px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 12px;
    }
    .icon-wrapper.blue { background: #eff6ff; color: #3b82f6; }
    .icon-wrapper.green { background: #f0fdf4; color: #22c55e; }
    .icon-wrapper.purple { background: #faf5ff; color: #a855f7; }
    .icon-wrapper.red { background: #fef2f2; color: #ef4444; }

    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      padding: 1rem;
      text-align: right;
    }
    .text-blue { color: #2563eb; }
    .text-green { color: #16a34a; }
    .text-purple { color: #7c3aed; }
    .alert-red { color: #dc2626; }

    .dashboard-tabs {
      background: #fff;
      border-radius: 12px;
      padding: 1rem;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }
    .tab-content {
      padding: 1.5rem 0;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .table-container {
      overflow-x: auto;
    }
    .w-full {
      width: 100%;
    }
    .bold {
      font-weight: 600;
    }
    .badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: 500;
    }
    .badge.scheduled { background: #f1f5f9; color: #475569; }
    .badge.running { background: #f0fdf4; color: #16a34a; }
    .badge.completed { background: #eff6ff; color: #2563eb; }
    .badge.cancelled { background: #fef2f2; color: #dc2626; }
    .badge.available { background: #ecfdf5; color: #047857; }
    .badge.on_trip { background: #eff6ff; color: #1d4ed8; }
    .badge.maintenance { background: #fffbeb; color: #b45309; }
    .badge.out_of_service { background: #fef2f2; color: #b91c1c; }

    .spinner-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 200px;
    }
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

  getTripStatusClass(status: string): string {
    return status;
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

  getVehicleStatusClass(status: string): string {
    return status;
  }
}
