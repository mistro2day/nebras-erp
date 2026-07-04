import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProcurementService } from './procurement.service';

@Component({
  selector: 'app-procurement-dashboard',
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
          <h1>منصة إدارة المشتريات والتعاقدات (Source-to-Pay)</h1>
          <p>لوحة التحكم بالطلبات، عروض الأسعار، العقود المعتمدة، وتقييم الموردين</p>
        </div>
        <button mat-flat-button color="primary" (click)="loadDashboard()">
          <mat-icon>refresh</mat-icon> تحديث البيانات
        </button>
      </div>

      <!-- Loading State -->
      <div class="spinner-container" *ngIf="procurementService.loading()">
        <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
      </div>

      <!-- Stats Cards Grid -->
      <div class="stats-grid" *ngIf="procurementService.stats() as stats">
        <!-- Open Requests -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper blue">
              <mat-icon>shopping_cart</mat-icon>
            </div>
            <mat-card-title>طلبات الشراء المفتوحة</mat-card-title>
            <mat-card-subtitle>الطلبات قيد المراجعة</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value">
            {{ stats.open_requests }}
          </mat-card-content>
        </mat-card>

        <!-- Pending Approvals -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper orange">
              <mat-icon>rate_review</mat-icon>
            </div>
            <mat-card-title>الموافقات المعلقة</mat-card-title>
            <mat-card-subtitle>طلبات تتطلب الموافقة</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value alert-orange">
            {{ stats.pending_approvals }}
          </mat-card-content>
        </mat-card>

        <!-- Total Spent -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper green">
              <mat-icon>payments</mat-icon>
            </div>
            <mat-card-title>إجمالي الإنفاق</mat-card-title>
            <mat-card-subtitle>المبالغ المصروفة عبر أوامر الشراء</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value">
            {{ stats.total_spent | currency:'SAR ':'symbol':'1.2-2' }}
          </mat-card-content>
        </mat-card>

        <!-- Savings -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper purple">
              <mat-icon>savings</mat-icon>
            </div>
            <mat-card-title>الوفورات المحققة</mat-card-title>
            <mat-card-subtitle>الفرق بين السعر التقديري والترسية</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value text-green">
            {{ stats.savings | currency:'SAR ':'symbol':'1.2-2' }}
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Main Section: PRs & Vendors -->
      <div class="tables-section">
        <!-- PR Table -->
        <div class="table-container">
          <h2>طلبات الشراء الأخيرة</h2>
          <mat-card class="table-card">
            <table mat-table [dataSource]="requests" class="w-full">
              <ng-container matColumnDef="reqNumber">
                <th mat-header-cell *matHeaderCellDef>رقم الطلب</th>
                <td mat-cell *matCellDef="let row">{{ row.request_number }}</td>
              </ng-container>

              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>التاريخ</th>
                <td mat-cell *matCellDef="let row">{{ row.date }}</td>
              </ng-container>

              <ng-container matColumnDef="amount">
                <th mat-header-cell *matHeaderCellDef>إجمالي تقديري</th>
                <td mat-cell *matCellDef="let row" class="bold">{{ row.total_estimated_amount | currency:'SAR ' }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>الحالة</th>
                <td mat-cell *matCellDef="let row">
                  <span class="badge" [ngClass]="getBadgeClass(row.status)">
                    {{ getStatusText(row.status) }}
                  </span>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="prColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: prColumns;"></tr>
            </table>
          </mat-card>
        </div>

        <!-- Vendor Table -->
        <div class="table-container">
          <h2>الموردين المعتمدين</h2>
          <mat-card class="table-card">
            <table mat-table [dataSource]="vendors" class="w-full">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>اسم المورد</th>
                <td mat-cell *matCellDef="let row">{{ row.name_ar }}</td>
              </ng-container>

              <ng-container matColumnDef="rating">
                <th mat-header-cell *matHeaderCellDef>التقييم</th>
                <td mat-cell *matCellDef="let row">
                  <span class="rating-badge">
                    <mat-icon class="star-icon">star</mat-icon> {{ row.rating }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>الحالة</th>
                <td mat-cell *matCellDef="let row">
                  <span class="badge badge-success" *ngIf="row.status === 'approved'">معتمد ونشط</span>
                  <span class="badge badge-danger" *ngIf="row.status === 'blacklisted'">قائمة سوداء</span>
                  <span class="badge badge-warning" *ngIf="row.status === 'pending'">تحت الاعتماد</span>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="vendorColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: vendorColumns;"></tr>
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
    .alert-orange { color: #f97316; }
    .text-green { color: #16a34a; }
    .tables-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin-top: 2rem;
    }
    @media (max-width: 960px) {
      .tables-section {
        grid-template-columns: 1fr;
      }
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
    .badge-success { background: #dcfce7; color: #15803d; }
    .badge-danger { background: #fee2e2; color: #b91c1c; }
    .badge-warning { background: #fef3c7; color: #d97706; }
    .badge-info { background: #e0f2fe; color: #0369a1; }
    .rating-badge {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-weight: 600;
      color: #eab308;
    }
    .star-icon {
      font-size: 1.2rem;
      width: 1.2rem;
      height: 1.2rem;
    }
    .spinner-container {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }
  `]
})
export class ProcurementDashboardComponent implements OnInit {
  procurementService = inject(ProcurementService);
  requests: any[] = [];
  vendors: any[] = [];
  prColumns: string[] = ['reqNumber', 'date', 'amount', 'status'];
  vendorColumns: string[] = ['name', 'rating', 'status'];

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.procurementService.getDashboardStats().subscribe();
    this.procurementService.getPurchaseRequests().subscribe(data => {
      this.requests = data;
    });
    this.procurementService.getVendors().subscribe(data => {
      this.vendors = data;
    });
  }

  getBadgeClass(status: string): string {
    switch (status) {
      case 'completed': return 'badge-success';
      case 'rejected': return 'badge-danger';
      case 'pending_approval': return 'badge-warning';
      case 'approved': return 'badge-info';
      default: return 'badge-warning';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'draft': return 'مسودة';
      case 'pending_approval': return 'تحت المراجعة';
      case 'approved': return 'معتمد للشراء';
      case 'rejected': return 'مرفوض';
      case 'rfq_created': return 'تم إنشاء RFQ';
      case 'completed': return 'مكتمل';
      default: return status;
    }
  }
}
