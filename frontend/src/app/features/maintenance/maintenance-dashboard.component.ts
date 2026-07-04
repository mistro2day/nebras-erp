import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MaintenanceService } from './maintenance.service';

@Component({
  selector: 'app-maintenance-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="dashboard-container" dir="rtl">
      <!-- Header -->
      <div class="dashboard-header">
        <div class="title-section">
          <h1>منصة إدارة الصيانة وأوامر العمل (CMMS)</h1>
          <p>لوحة التحكم الفورية بطلبات الصيانة، الصيانة الوقائية للأصول، استهلاك المواد، والتكاليف المالية المترتبة</p>
        </div>
        <button mat-flat-button color="primary" (click)="loadDashboard()">
          <mat-icon>refresh</mat-icon> تحديث البيانات
        </button>
      </div>

      <!-- Loading State -->
      <div class="spinner-container" *ngIf="maintenanceService.loading()">
        <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
      </div>

      <!-- Stats Cards Grid -->
      <div class="stats-grid" *ngIf="maintenanceService.stats() as stats">
        <!-- Open Requests -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper blue">
              <mat-icon>report_problem</mat-icon>
            </div>
            <mat-card-title>البلاغات المفتوحة</mat-card-title>
            <mat-card-subtitle>بانتظار الإسناد والمعالجة</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value text-blue">
            {{ stats.open_requests }} بلاغ
          </mat-card-content>
        </mat-card>

        <!-- Active Work Orders -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper orange">
              <mat-icon>engineering</mat-icon>
            </div>
            <mat-card-title>أوامر العمل النشطة</mat-card-title>
            <mat-card-subtitle>قيد التنفيذ والمتابعة ميدانيّاً</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value alert-orange">
            {{ stats.active_work_orders }} أمر عمل
          </mat-card-content>
        </mat-card>

        <!-- Total Cost -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper green">
              <mat-icon>attach_money</mat-icon>
            </div>
            <mat-card-title>تكاليف الصيانة الإجمالية</mat-card-title>
            <mat-card-subtitle>العمالة والمواد والمقاولين</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value text-green">
            {{ stats.total_costs | currency:'SAR ':'symbol':'1.2-2' }}
          </mat-card-content>
        </mat-card>

        <!-- Preventive Due -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper purple">
              <mat-icon>schedule</mat-icon>
            </div>
            <mat-card-title>صيانة وقائية مستحقة</mat-card-title>
            <mat-card-subtitle>تتطلب التوليد الفوري للمهندسين</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value text-purple">
            {{ stats.preventive_due }} أصل مستحق
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Main Section: Work Orders List -->
      <div class="register-section">
        <div class="table-container">
          <h2>أوامر العمل الجارية والمعالجة</h2>
          <mat-card class="table-card">
            <table mat-table [dataSource]="workOrders" class="w-full">
              <ng-container matColumnDef="wo_number">
                <th mat-header-cell *matHeaderCellDef>رقم أمر العمل</th>
                <td mat-cell *matCellDef="let row">{{ row.wo_number }}</td>
              </ng-container>

              <ng-container matColumnDef="asset">
                <th mat-header-cell *matHeaderCellDef>الأصل المستهدف</th>
                <td mat-cell *matCellDef="let row" class="bold">شيلر Carrier الرئيسي</td>
              </ng-container>

              <ng-container matColumnDef="hours">
                <th mat-header-cell *matHeaderCellDef>ساعات العمل المقدرة</th>
                <td mat-cell *matCellDef="let row">{{ row.estimated_labor_hours }} ساعة</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>الحالة</th>
                <td mat-cell *matCellDef="let row">
                  <span class="badge" [ngClass]="getStatusClass(row.status)">{{ getStatusText(row.status) }}</span>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr mat-row *matRowDef="let row; columns: columns;"></tr>
            </table>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 2rem;
      background: #f8fafc;
      min-height: 100vh;
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
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      border: 1px solid #e2e8f0;
      background: #ffffff;
      padding: 1rem;
    }
    .icon-wrapper {
      padding: 0.75rem;
      border-radius: 8px;
      margin-bottom: 0.5rem;
    }
    .icon-wrapper.blue { background: #eff6ff; color: #3b82f6; }
    .icon-wrapper.orange { background: #fff7ed; color: #f97316; }
    .icon-wrapper.green { background: #f0fdf4; color: #22c55e; }
    .icon-wrapper.purple { background: #faf5ff; color: #a855f7; }
    .stat-value {
      font-size: 1.8rem;
      font-weight: 800;
      color: #1e293b;
      margin-top: 1rem;
    }
    .text-blue { color: #2563eb; }
    .alert-orange { color: #f97316; }
    .text-green { color: #16a34a; }
    .text-purple { color: #8b5cf6; }
    .register-section {
      margin-top: 2rem;
    }
    .table-container h2 {
      font-size: 1.5rem;
      color: #0f172a;
      margin-bottom: 1rem;
    }
    .table-card {
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    .w-full { width: 100%; }
    .bold { font-weight: 600; color: #0f172a; }
    .badge {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .badge-info { background: #e0f2fe; color: #0369a1; }
    .badge-success { background: #dcfce7; color: #15803d; }
    .badge-warning { background: #fef3c7; color: #d97706; }
    .badge-danger { background: #fef2f2; color: #b91c1c; }
    .spinner-container {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }
  `]
})
export class MaintenanceDashboardComponent implements OnInit {
  maintenanceService = inject(MaintenanceService);
  workOrders: any[] = [];
  columns: string[] = ['wo_number', 'asset', 'hours', 'status'];

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.maintenanceService.getDashboardStats().subscribe();
    this.maintenanceService.getWorkOrders().subscribe(data => {
      this.workOrders = data;
    });
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'draft': return 'مسودة';
      case 'assigned': return 'مسند للفني';
      case 'in_progress': return 'قيد التنفيذ';
      case 'on_hold': return 'معلق';
      case 'completed': return 'مكتمل فنيّاً';
      case 'closed': return 'مغلق ومقفل';
      case 'cancelled': return 'ملغى';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'draft': return 'badge-info';
      case 'assigned': return 'badge-info';
      case 'in_progress': return 'badge-warning';
      case 'on_hold': return 'badge-danger';
      case 'completed': return 'badge-success';
      case 'closed': return 'badge-success';
      case 'cancelled': return 'badge-danger';
      default: return 'badge-info';
    }
  }
}
