import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

import { ApprovalAnalyticsService } from '../approval-analytics.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-approval-analytics',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule, LoadingSpinnerComponent],
  template: `
    <div class="analytics-container" dir="rtl">
      <div class="header">
        <div class="title-section">
          <h1>تحليلات مركز الموافقات</h1>
          <p>مؤشرات الأداء الرئيسية لأداء الاعتماد على مستوى المؤسسة</p>
        </div>
        <button mat-flat-button color="primary" (click)="recalculate()">
          <mat-icon>calculate</mat-icon> إعادة احتساب الإحصاءات
        </button>
      </div>

      <app-loading-spinner [isLoading]="analyticsService.loading()"></app-loading-spinner>

      <div class="kpi-row" *ngIf="analyticsService.stats() as stats">
        <mat-card class="kpi-card">
          <span class="kpi-label">إجمالي الطلبات</span>
          <span class="kpi-value">{{ stats.pending + stats.approved + stats.rejected }}</span>
        </mat-card>
        <mat-card class="kpi-card">
          <span class="kpi-label">نسبة الاعتماد</span>
          <span class="kpi-value">{{ approvalRate(stats) }}%</span>
        </mat-card>
        <mat-card class="kpi-card">
          <span class="kpi-label">متوسط زمن القرار</span>
          <span class="kpi-value">{{ (stats.avg_decision_seconds / 3600) | number:'1.1-1' }} س</span>
        </mat-card>
        <mat-card class="kpi-card">
          <span class="kpi-label">مخالفات SLA</span>
          <span class="kpi-value alert">{{ stats.overdue }}</span>
        </mat-card>
      </div>

      <div class="tables-section" *ngIf="analyticsService.stats() as stats">
        <div class="table-container">
          <h2>الأداء حسب الفئة</h2>
          <mat-card class="table-card">
            <table mat-table [dataSource]="stats.by_category" class="w-full">
              <ng-container matColumnDef="category">
                <th mat-header-cell *matHeaderCellDef>الفئة</th>
                <td mat-cell *matCellDef="let row">{{ row.category__code }}</td>
              </ng-container>
              <ng-container matColumnDef="count">
                <th mat-header-cell *matHeaderCellDef>عدد الطلبات</th>
                <td mat-cell *matCellDef="let row" class="bold">{{ row.count }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="['category', 'count']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['category', 'count'];"></tr>
            </table>
          </mat-card>
        </div>

        <div class="table-container">
          <h2>الأداء حسب الأولوية</h2>
          <mat-card class="table-card">
            <table mat-table [dataSource]="stats.by_priority" class="w-full">
              <ng-container matColumnDef="priority">
                <th mat-header-cell *matHeaderCellDef>الأولوية</th>
                <td mat-cell *matCellDef="let row">{{ row.priority__code }}</td>
              </ng-container>
              <ng-container matColumnDef="count">
                <th mat-header-cell *matHeaderCellDef>عدد الطلبات</th>
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
    .analytics-container { padding: 2rem; background: #f8fafc; min-height: 100vh; }
    .header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 1.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem; flex-wrap: wrap; gap: 1rem;
    }
    .header h1 { margin: 0; font-size: 1.75rem; color: #0f172a; font-weight: 700; }
    .header p { margin: 0.35rem 0 0; color: #64748b; }
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem; margin-bottom: 2rem; }
    .kpi-card { padding: 1.25rem; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 0.5rem; }
    .kpi-label { font-size: 0.8rem; color: #64748b; }
    .kpi-value { font-size: 1.75rem; font-weight: 800; color: #0f172a; }
    .kpi-value.alert { color: #dc2626; }
    .tables-section { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
    @media (max-width: 960px) { .tables-section { grid-template-columns: 1fr; } }
    .table-container h2 { font-size: 1.1rem; color: #0f172a; margin-bottom: 0.75rem; }
    .table-card { border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
    .w-full { width: 100%; }
    .bold { font-weight: 700; color: #0f172a; }
  `]
})
export class ApprovalAnalyticsComponent implements OnInit {
  analyticsService = inject(ApprovalAnalyticsService);

  ngOnInit() { this.load(); }
  load() { this.analyticsService.getDashboardStats().subscribe(); }

  approvalRate(stats: { pending: number; approved: number; rejected: number }): string {
    const total = stats.pending + stats.approved + stats.rejected;
    if (total === 0) return '0';
    return ((stats.approved / total) * 100).toFixed(1);
  }

  recalculate() {
    this.analyticsService.recalculateStatistics().subscribe(() => this.load());
  }
}
