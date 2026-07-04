import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ClinicService } from './clinic.service';

@Component({
  selector: 'app-clinic-dashboard',
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
          <h1>نظام العيادة المدرسية والسجلات الصحية (SHIS)</h1>
          <p>لوحة المراقبة الحية لزيارات العيادة اليومية، الحالات الطارئة، طلبات الإجازات المرضية، وحالات العزل</p>
        </div>
        <button mat-flat-button color="primary" (click)="loadDashboard()">
          <mat-icon>refresh</mat-icon> تحديث البيانات
        </button>
      </div>

      <!-- Loading State -->
      <div class="spinner-container" *ngIf="clinicService.loading()">
        <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
      </div>

      <!-- Stats Cards Grid -->
      <div class="stats-grid" *ngIf="clinicService.stats() as stats">
        <!-- Today's Visits -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper blue">
              <mat-icon>medical_services</mat-icon>
            </div>
            <mat-card-title>زيارات اليوم</mat-card-title>
            <mat-card-subtitle>مراجعي العيادة المدرسية</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value text-blue">
            {{ stats.today_visits }} زيارة
          </mat-card-content>
        </mat-card>

        <!-- Emergency Cases -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper red">
              <mat-icon>warning</mat-icon>
            </div>
            <mat-card-title>الحالات الإسعافية</mat-card-title>
            <mat-card-subtitle>حالات حرجة تتطلب متابعة</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value alert-red">
            {{ stats.emergency_cases }} حالة
          </mat-card-content>
        </mat-card>

        <!-- Active Isolations -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper orange">
              <mat-icon>accessible_forward</mat-icon>
            </div>
            <mat-card-title>حالات العزل الوقائي</mat-card-title>
            <mat-card-subtitle>للحد من انتشار الأوبئة</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value alert-orange">
            {{ stats.active_isolations }} حالة نشطة
          </mat-card-content>
        </mat-card>

        <!-- Pending Leaves -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper purple">
              <mat-icon>pending_actions</mat-icon>
            </div>
            <mat-card-title>تقارير وإجازات معلقة</mat-card-title>
            <mat-card-subtitle>تنتظر التدقيق وتبرير الغياب</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value text-purple">
            {{ stats.pending_leaves }} إجازة
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Main Section: Recent Visits -->
      <div class="register-section">
        <div class="table-container">
          <h2>سجل مراجعات وزيارات العيادة الحديثة</h2>
          <mat-card class="table-card">
            <table mat-table [dataSource]="visits" class="w-full">
              <ng-container matColumnDef="patient">
                <th mat-header-cell *matHeaderCellDef>المريض (معرف الطالب/الموظف)</th>
                <td mat-cell *matCellDef="let row" class="bold text-blue">{{ row.patient_user_id }}</td>
              </ng-container>

              <ng-container matColumnDef="type">
                <th mat-header-cell *matHeaderCellDef>نوع الزيارة</th>
                <td mat-cell *matCellDef="let row">
                  <span class="badge" [ngClass]="getVisitTypeClass(row.visit_type)">{{ getVisitTypeText(row.visit_type) }}</span>
                </td>
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
    .icon-wrapper.red { background: #fef2f2; color: #ef4444; }
    .icon-wrapper.purple { background: #faf5ff; color: #a855f7; }
    .stat-value {
      font-size: 1.8rem;
      font-weight: 800;
      color: #1e293b;
      margin-top: 1rem;
    }
    .text-blue { color: #2563eb; }
    .alert-orange { color: #f97316; }
    .alert-red { color: #ef4444; }
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
export class ClinicDashboardComponent implements OnInit {
  clinicService = inject(ClinicService);
  visits: any[] = [];
  columns: string[] = ['patient', 'type', 'status'];

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.clinicService.getDashboardStats().subscribe();
    this.clinicService.getVisits().subscribe(data => {
      this.visits = data;
    });
  }

  getVisitTypeText(type: string): string {
    switch (type) {
      case 'walk_in': return 'حالة عابرة';
      case 'scheduled': return 'موعد دوري';
      case 'emergency': return 'حالة طارئة';
      case 'follow_up': return 'متابعة';
      default: return type;
    }
  }

  getVisitTypeClass(type: string): string {
    switch (type) {
      case 'emergency': return 'badge-danger';
      case 'walk_in': return 'badge-info';
      default: return 'badge-success';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'checked_in': return 'دخل العيادة';
      case 'diagnosed': return 'تم التشخيص';
      case 'discharged': return 'غادر العيادة';
      case 'referred': return 'تمت الإحالة';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'discharged': return 'badge-success';
      case 'referred': return 'badge-warning';
      default: return 'badge-info';
    }
  }
}
