import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { InventoryService } from './inventory.service';

@Component({
  selector: 'app-inventory-dashboard',
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
          <h1>منصة إدارة المستودعات والتحكم في المخزون</h1>
          <p>لوحة التحكم الفورية بالأرصدة، مستويات إعادة الطلب، عمليات الصرف والاستلام، والتقييم المخزني</p>
        </div>
        <button mat-flat-button color="primary" (click)="loadDashboard()">
          <mat-icon>refresh</mat-icon> تحديث البيانات
        </button>
      </div>

      <!-- Loading State -->
      <div class="spinner-container" *ngIf="inventoryService.loading()">
        <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
      </div>

      <!-- Stats Cards Grid -->
      <div class="stats-grid" *ngIf="inventoryService.stats() as stats">
        <!-- Total Items -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper blue">
              <mat-icon>category</mat-icon>
            </div>
            <mat-card-title>إجمالي الأصناف</mat-card-title>
            <mat-card-subtitle>الأصناف المسجلة بالنظام</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value">
            {{ stats.total_items }} صنف
          </mat-card-content>
        </mat-card>

        <!-- Low Stock -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper orange">
              <mat-icon>warning</mat-icon>
            </div>
            <mat-card-title>أصناف تحت حد الطلب</mat-card-title>
            <mat-card-subtitle>تتطلب إعادة تموين عاجلة</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value alert-orange">
            {{ stats.low_stock }} صنف
          </mat-card-content>
        </mat-card>

        <!-- Out of Stock -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper red">
              <mat-icon>dangerous</mat-icon>
            </div>
            <mat-card-title>أصناف منتهية</mat-card-title>
            <mat-card-subtitle>رصيد صفري بالمستودعات</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value alert-red">
            {{ stats.out_of_stock }} صنف
          </mat-card-content>
        </mat-card>

        <!-- Total Value -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper green">
              <mat-icon>monetization_on</mat-icon>
            </div>
            <mat-card-title>إجمالي قيمة المخزون</mat-card-title>
            <mat-card-subtitle>التقييم المخزني بالمتوسط المرجح</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value text-green">
            {{ stats.total_value | currency:'SAR ':'symbol':'1.2-2' }}
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Main Section: Items & Warehouses -->
      <div class="tables-section">
        <!-- Items Table -->
        <div class="table-container">
          <h2>الأصناف والبنود المخزنية</h2>
          <mat-card class="table-card">
            <table mat-table [dataSource]="items" class="w-full">
              <ng-container matColumnDef="sku">
                <th mat-header-cell *matHeaderCellDef>رمز الصنف (SKU)</th>
                <td mat-cell *matCellDef="let row">{{ row.sku }}</td>
              </ng-container>

              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>اسم الصنف</th>
                <td mat-cell *matCellDef="let row" class="bold">{{ row.name_ar }}</td>
              </ng-container>

              <ng-container matColumnDef="type">
                <th mat-header-cell *matHeaderCellDef>النوع</th>
                <td mat-cell *matCellDef="let row">
                  <span class="badge badge-info">{{ getTypeText(row.item_type) }}</span>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="itemColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: itemColumns;"></tr>
            </table>
          </mat-card>
        </div>

        <!-- Warehouses Table -->
        <div class="table-container">
          <h2>المستودعات والمخازن</h2>
          <mat-card class="table-card">
            <table mat-table [dataSource]="warehouses" class="w-full">
              <ng-container matColumnDef="code">
                <th mat-header-cell *matHeaderCellDef>رمز المستودع</th>
                <td mat-cell *matCellDef="let row">{{ row.code }}</td>
              </ng-container>

              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>اسم المستودع</th>
                <td mat-cell *matCellDef="let row" class="bold">{{ row.name_ar }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>النوع</th>
                <td mat-cell *matCellDef="let row">
                  <span class="badge badge-success" *ngIf="!row.is_virtual">مستودع فعلي</span>
                  <span class="badge badge-warning" *ngIf="row.is_virtual">افتراضي/عبور</span>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="whColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: whColumns;"></tr>
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
    .icon-wrapper.red { background: #fef2f2; color: #ef4444; }
    .icon-wrapper.green { background: #f0fdf4; color: #22c55e; }
    .stat-value {
      font-size: 1.8rem;
      font-weight: 800;
      color: #1e293b;
      margin-top: 1rem;
    }
    .alert-orange { color: #f97316; }
    .alert-red { color: #ef4444; }
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
    .badge-warning { background: #fef3c7; color: #d97706; }
    .badge-info { background: #e0f2fe; color: #0369a1; }
    .spinner-container {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }
  `]
})
export class InventoryDashboardComponent implements OnInit {
  inventoryService = inject(InventoryService);
  items: any[] = [];
  warehouses: any[] = [];
  itemColumns: string[] = ['sku', 'name', 'type'];
  whColumns: string[] = ['code', 'name', 'status'];

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.inventoryService.getDashboardStats().subscribe();
    this.inventoryService.getInventoryItems().subscribe(data => {
      this.items = data;
    });
    this.inventoryService.getWarehouses().subscribe(data => {
      this.warehouses = data;
    });
  }

  getTypeText(type: string): string {
    switch (type) {
      case 'stock': return 'مخزني';
      case 'non_stock': return 'خدمي';
      case 'consumable': return 'استهلاكي';
      case 'medical': return 'طبي';
      case 'library': return 'مكتبة';
      case 'laboratory': return 'مختبر';
      case 'fixed_asset': return 'أصل ثابت';
      default: return type;
    }
  }
}
