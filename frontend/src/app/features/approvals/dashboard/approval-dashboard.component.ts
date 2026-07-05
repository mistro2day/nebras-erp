import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

import { ApprovalAnalyticsService } from '../approval-analytics.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-approval-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatTableModule, LoadingSpinnerComponent],
  template: `
    <div class="dashboard-container" dir="rtl">
      <div class="dashboard-header">
        <div class="title-section">
          <h1>لوحة معلومات مركز الموافقات</h1>
          <p>نظرة عامة على الطلبات المعلقة والمعتمدة والمتجاوزة للمهلة</p>
        </div>
        <div class="header-actions">
          <a mat-stroked-button routerLink="/approvals/inbox"><mat-icon>inbox</mat-icon> صندوق الوارد</a>
          <a mat-stroked-button routerLink="/approvals/analytics"><mat-icon>bar_chart</mat-icon> التحليلات</a>
          <button mat-flat-button color="primary" (click)="load()"><mat-icon>refresh</mat-icon> تحديث</button>
        </div>
      </div>

      <app-loading-spinner [isLoading]="analyticsService.loading()"></app-loading-spinner>

      <div class="stats-grid" *ngIf="analyticsService.stats() as stats">
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper orange"><mat-icon>hourglass_empty</mat-icon></div>
            <mat-card-title>معلّقة</mat-card-title>
            <mat-card-subtitle>بانتظار اتخاذ إجراء</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value">{{ stats.pending }}</mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper green"><mat-icon>check_circle</mat-icon></div>
            <mat-card-title>معتمدة</mat-card-title>
            <mat-card-subtitle>تمت الموافقة عليها</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value">{{ stats.approved }}</mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper red"><mat-icon>cancel</mat-icon></div>
            <mat-card-title>مرفوضة</mat-card-title>
            <mat-card-subtitle>تم رفضها</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value">{{ stats.rejected }}</mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper purple"><mat-icon>schedule</mat-icon></div>
            <mat-card-title>متجاوزة المهلة</mat-card-title>
            <mat-card-subtitle>تجاوزت اتفاقية مستوى الخدمة</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value alert-red">{{ stats.overdue }}</mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper blue"><mat-icon>speed</mat-icon></div>
            <mat-card-title>متوسط وقت القرار</mat-card-title>
            <mat-card-subtitle>بالدقائق</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value">{{ (stats.avg_decision_seconds / 60) | number:'1.0-1' }}</mat-card-content>
        </mat-card>
      </div>

      <div class="tables-section" *ngIf="analyticsService.stats() as stats">
        <div class="table-container">
          <h2>التوزيع حسب الفئة</h2>
          <mat-card class="table-card">
            <table mat-table [dataSource]="stats.by_category" class="w-full">
              <ng-container matColumnDef="category">
                <th mat-header-cell *matHeaderCellDef>الفئة</th>
                <td mat-cell *matCellDef="let row">{{ row.category__code }}</td>
              </ng-container>
              <ng-container matColumnDef="count">
                <th mat-header-cell *matHeaderCellDef>العدد</th>
                <td mat-cell *matCellDef="let row" class="bold">{{ row.count }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="['category', 'count']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['category', 'count'];"></tr>
            </table>
          </mat-card>
        </div>

        <div class="table-container">
          <h2>التوزيع حسب الأولوية</h2>
          <mat-card class="table-card">
            <table mat-table [dataSource]="stats.by_priority" class="w-full">
              <ng-container matColumnDef="priority">
                <th mat-header-cell *matHeaderCellDef>الأولوية</th>
                <td mat-cell *matCellDef="let row">{{ row.priority__code }}</td>
              </ng-container>
              <ng-container matColumnDef="count">
                <th mat-header-cell *matHeaderCellDef>العدد</th>
                <td mat-cell *matCellDef="let row" class="bold">{{ row.count }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="['priority', 'count']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['priority', 'count'];"></tr>
            </table>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container { padding: 2rem; background: #f8fafc; min-height: 100vh; }
    .dashboard-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 2rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem; flex-wrap: wrap; gap: 1rem;
    }
    .dashboard-header h1 { margin: 0; font-size: 1.75rem; color: #0f172a; font-weight: 700; }
    .dashboard-header p { margin: 0.35rem 0 0; color: #64748b; }
    .header-actions { display: flex; gap: 0.5rem; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 2rem; }
    .stat-card { border-radius: 12px; border: 1px solid #e2e8f0; }
    .icon-wrapper { padding: 0.65rem; border-radius: 8px; margin-bottom: 0.5rem; display: inline-flex; }
    .icon-wrapper.blue { background: #eff6ff; color: #3b82f6; }
    .icon-wrapper.orange { background: #fff7ed; color: #f97316; }
    .icon-wrapper.green { background: #f0fdf4; color: #22c55e; }
    .icon-wrapper.red { background: #fef2f2; color: #ef4444; }
    .icon-wrapper.purple { background: #faf5ff; color: #a855f7; }
    .stat-value { font-size: 1.8rem; font-weight: 800; color: #1e293b; margin-top: 0.5rem; }
    .alert-red { color: #dc2626; }
    .tables-section { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
    @media (max-width: 960px) { .tables-section { grid-template-columns: 1fr; } }
    .table-container h2 { font-size: 1.1rem; color: #0f172a; margin-bottom: 0.75rem; }
    .table-card { border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
    .w-full { width: 100%; }
    .bold { font-weight: 700; color: #0f172a; }
  `]
})
export class ApprovalDashboardComponent implements OnInit {
  analyticsService = inject(ApprovalAnalyticsService);

  ngOnInit() { this.load(); }
  load() { this.analyticsService.getDashboardStats().subscribe(); }
}
