import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AssetsService } from './assets.service';

@Component({
  selector: 'app-assets-dashboard',
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
          <h1>منصة إدارة الأصول الثابتة ودورة حياة الأصل</h1>
          <p>لوحة التحكم الفورية بسجل الأصول الموثق، الرسملة الفورية، دورات الإهلاك المحاسبي، والاستبعاد والتصفية</p>
        </div>
        <button mat-flat-button color="primary" (click)="loadDashboard()">
          <mat-icon>refresh</mat-icon> تحديث البيانات
        </button>
      </div>

      <!-- Loading State -->
      <div class="spinner-container" *ngIf="assetsService.loading()">
        <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
      </div>

      <!-- Stats Cards Grid -->
      <div class="stats-grid" *ngIf="assetsService.stats() as stats">
        <!-- Total Assets -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper blue">
              <mat-icon>inventory_2</mat-icon>
            </div>
            <mat-card-title>إجمالي سجل الأصول</mat-card-title>
            <mat-card-subtitle>الأصول المسجلة بالنظام</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value">
            {{ stats.total_assets }} أصل
          </mat-card-content>
        </mat-card>

        <!-- Capitalized/Active Assets -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper green">
              <mat-icon>check_circle</mat-icon>
            </div>
            <mat-card-title>الأصول المرسملة والنشطة</mat-card-title>
            <mat-card-subtitle>أصول قيد الخدمة والاستخدام</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value text-green">
            {{ stats.capitalized_assets }} أصل
          </mat-card-content>
        </mat-card>

        <!-- Net Book Value -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper purple">
              <mat-icon>monetization_on</mat-icon>
            </div>
            <mat-card-title>صافي القيمة الدفترية للأصول</mat-card-title>
            <mat-card-subtitle>إجمالي قيم الأصول بعد الإهلاك</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value text-purple">
            {{ stats.net_book_value | currency:'SAR ':'symbol':'1.2-2' }}
          </mat-card-content>
        </mat-card>

        <!-- Monthly Depreciation -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper orange">
              <mat-icon>trending_down</mat-icon>
            </div>
            <mat-card-title>إهلاك الشهر الجاري</mat-card-title>
            <mat-card-subtitle>مخصص إهلاك الفترة الحالية</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value alert-orange">
            {{ stats.depr_mtd | currency:'SAR ':'symbol':'1.2-2' }}
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Main Section: Asset Register -->
      <div class="register-section">
        <div class="table-container">
          <h2>سجل الأصول الثابتة والممتلكات</h2>
          <mat-card class="table-card">
            <table mat-table [dataSource]="assets" class="w-full">
              <ng-container matColumnDef="asset_number">
                <th mat-header-cell *matHeaderCellDef>رقم الأصل</th>
                <td mat-cell *matCellDef="let row">{{ row.asset_number }}</td>
              </ng-container>

              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>اسم الأصل</th>
                <td mat-cell *matCellDef="let row" class="bold">{{ row.name_ar }}</td>
              </ng-container>

              <ng-container matColumnDef="cost">
                <th mat-header-cell *matHeaderCellDef>تكلفة الاقتناء</th>
                <td mat-cell *matCellDef="let row">{{ row.acquisition_cost | currency:'SAR ' }}</td>
              </ng-container>

              <ng-container matColumnDef="book_value">
                <th mat-header-cell *matHeaderCellDef>القيمة الدفترية الحالية</th>
                <td mat-cell *matCellDef="let row" class="bold text-purple">{{ row.book_value | currency:'SAR ' }}</td>
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
    .icon-wrapper.green { background: #f0fdf4; color: #22c55e; }
    .icon-wrapper.purple { background: #faf5ff; color: #a855f7; }
    .icon-wrapper.orange { background: #fff7ed; color: #f97316; }
    .stat-value {
      font-size: 1.8rem;
      font-weight: 800;
      color: #1e293b;
      margin-top: 1rem;
    }
    .text-green { color: #16a34a; }
    .text-purple { color: #8b5cf6; }
    .alert-orange { color: #f97316; }
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
    .badge-danger { background: #fef2f2; color: #b91c1c; }
    .badge-warning { background: #fef3c7; color: #d97706; }
    .spinner-container {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }
  `]
})
export class AssetsDashboardComponent implements OnInit {
  assetsService = inject(AssetsService);
  assets: any[] = [];
  columns: string[] = ['asset_number', 'name', 'cost', 'book_value', 'status'];

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.assetsService.getDashboardStats().subscribe();
    this.assetsService.getAssets().subscribe(data => {
      this.assets = data;
    });
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'registered': return 'مسجل';
      case 'capitalized': return 'مرسمل ونشط';
      case 'disposed': return 'مستبعد/مباع';
      case 'retired': return 'متقاعد';
      case 'maintenance': return 'صيانة';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'registered': return 'badge-info';
      case 'capitalized': return 'badge-success';
      case 'disposed': return 'badge-danger';
      case 'retired': return 'badge-warning';
      case 'maintenance': return 'badge-warning';
      default: return 'badge-info';
    }
  }
}
