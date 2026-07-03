import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReportingService } from './reporting.service';

@Component({
  selector: 'app-reporting-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatIconModule,
    MatButtonModule, MatTableModule, MatTabsModule, MatFormFieldModule, MatInputModule
  ],
  template: `
    <div class="reporting-dashboard" dir="rtl">
      <!-- Header -->
      <header class="dashboard-header">
        <div class="header-info">
          <h1>منصة ذكاء الأعمال والتقارير والتحليلات (BIRAP)</h1>
          <p>لوحة التحكم المركزية لتوليد تقارير الموديولات وتتبع مؤشرات الأداء والتحليل الذكي</p>
        </div>
      </header>

      <!-- AI Natural Language Query Box -->
      <mat-card class="ai-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon class="ai-icon">psychology</mat-icon>
            الاستعلام الذكي باللغة الطبيعية (AI NLQ)
          </mat-card-title>
        </mat-card-header>
        <mat-card-content class="ai-content">
          <mat-form-field appearance="outline" class="query-field">
            <mat-label>اسأل نبراس عن أي تقارير أو مؤشرات باللغة العربية...</mat-label>
            <input matInput [(ngModel)]="aiQuestion" placeholder="مثال: ما هي نسبة حضور الطلاب هذا الشهر؟" (keyup.enter)="askAI()" />
          </mat-form-field>
          <button mat-flat-button color="primary" class="ask-btn" (click)="askAI()">اسأل نبراس</button>
        </mat-card-content>
        <div class="ai-response" *ngIf="aiResponse()">
          <p><strong>استعلام SQL المقترح:</strong> <code>{{ aiResponse().interpreted_query }}</code></p>
          <p><strong>الملخص الفوري:</strong> {{ aiResponse().summary }}</p>
        </div>
      </mat-card>

      <!-- Stats Grid / KPIs -->
      <div class="kpi-grid">
        <div class="kpi-card" *ngFor="let k of kpis()">
          <div class="kpi-header">
            <h3>{{ k.name }}</h3>
            <span class="trend-badge" [ngClass]="k.trend">
              <mat-icon>{{ k.trend === 'up' ? 'trending_up' : k.trend === 'down' ? 'trending_down' : 'trending_flat' }}</mat-icon>
            </span>
          </div>
          <div class="kpi-body">
            <span class="kpi-value">{{ k.current_value }}%</span>
            <span class="kpi-target">المستهدف: {{ k.target_value }}%</span>
          </div>
        </div>
      </div>

      <!-- Main Tabs -->
      <mat-tab-group class="dashboard-tabs">
        <!-- Tab 1: Available Reports -->
        <mat-tab label="التقارير المتوفرة">
          <div class="tab-content">
            <table mat-table [dataSource]="reports()" class="mat-elevation-z8 reporting-table">
              <ng-container matColumnDef="code">
                <th mat-header-cell *matHeaderCellDef>رمز التقرير</th>
                <td mat-cell *matCellDef="let element">{{ element.code }}</td>
              </ng-container>

              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>اسم التقرير</th>
                <td mat-cell *matCellDef="let element"><strong>{{ element.name }}</strong></td>
              </ng-container>

              <ng-container matColumnDef="category">
                <th mat-header-cell *matHeaderCellDef>التصنيف</th>
                <td mat-cell *matCellDef="let element">{{ element.category_name }}</td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>إجراءات</th>
                <td mat-cell *matCellDef="let element">
                  <button mat-flat-button color="primary" class="action-btn" (click)="runReport(element.id)">تشغيل</button>
                  <button mat-stroked-button color="accent" class="action-btn" (click)="exportReport(element.id)">تصدير CSV</button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>
        </mat-tab>

        <!-- Tab 2: Dashboard Preview -->
        <mat-tab label="لوحات القيادة">
          <div class="tab-content dashboard-grid-preview">
            <div class="dashboard-preview-card" *ngFor="let d of dashboards()">
              <mat-icon class="dash-icon">dashboard</mat-icon>
              <h3>{{ d.name }}</h3>
              <p>{{ d.description || 'لوحة تحكم تفاعلية للمستويات التنفيذية والأقسام.' }}</p>
              <button mat-flat-button color="accent">عرض اللوحة</button>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>

      <!-- Executed Report Data Viewer -->
      <mat-card class="data-viewer-card" *ngIf="executedData().length > 0">
        <mat-card-header>
          <mat-card-title>بيانات التقرير الحالي</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <table mat-table [dataSource]="executedData()" class="mat-elevation-z8 viewer-table">
            <ng-container *ngFor="let key of dataColumns()" [matColumnDef]="key">
              <th mat-header-cell *matHeaderCellDef>{{ key }}</th>
              <td mat-cell *matCellDef="let row">{{ row[key] }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="dataColumns()"></tr>
            <tr mat-row *matRowDef="let row; columns: dataColumns();"></tr>
          </table>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .reporting-dashboard {
      padding: 1.5rem;
      font-family: 'Cairo', sans-serif;
      background: #0f172a;
      color: #f8fafc;
      min-height: 100vh;
    }
    .dashboard-header {
      margin-bottom: 2rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 1rem;
    }
    .dashboard-header h1 {
      font-size: 2rem;
      font-weight: 800;
      background: linear-gradient(to left, #3b82f6, #10b981);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
    }
    .dashboard-header p { color: #94a3b8; margin: 4px 0 0; }

    .ai-card {
      background: linear-gradient(135deg, #1e1b4b, #311042);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    .ai-icon { color: #c084fc; font-size: 28px; width: 28px; height: 28px; margin-left: 8px; vertical-align: middle; }
    .ai-content { display: flex; gap: 1rem; align-items: center; margin-top: 1rem; }
    .query-field { flex: 1; }
    .ask-btn { height: 56px; margin-bottom: 22px; }
    .ai-response {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 1rem;
      margin-top: 1rem;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
      margin-bottom: 2.5rem;
    }
    .kpi-card {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 1.25rem;
    }
    .kpi-header { display: flex; justify-content: space-between; align-items: center; }
    .kpi-header h3 { font-size: 0.85rem; color: #94a3b8; margin: 0; }
    .trend-badge { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; }
    .trend-badge.up { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .trend-badge.down { background: rgba(239, 68, 68, 0.15); color: #f87171; }
    .trend-badge.stable { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .kpi-body { display: flex; flex-direction: column; margin-top: 8px; }
    .kpi-value { font-size: 1.8rem; font-weight: bold; }
    .kpi-target { font-size: 0.75rem; color: #64748b; margin-top: 4px; }

    .dashboard-tabs {
      background: #1e293b;
      border-radius: 16px;
      padding: 1rem;
      border: 1px solid rgba(255, 255, 255, 0.08);
      margin-bottom: 2rem;
    }
    .tab-content { padding: 1.5rem 0; }

    .reporting-table, .viewer-table {
      width: 100%;
      background: #1e293b;
      color: #f8fafc;
    }
    .mat-mdc-header-cell {
      color: #94a3b8 !important;
      font-weight: bold;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    }
    .mat-mdc-cell {
      border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
      color: #cbd5e1 !important;
    }
    .action-btn { margin-left: 8px; }

    .dashboard-grid-preview {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
    }
    .dashboard-preview-card {
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: center;
      text-align: center;
    }
    .dash-icon { font-size: 40px; width: 40px; height: 40px; color: #3b82f6; }
    .dashboard-preview-card h3 { margin: 0; }
    .dashboard-preview-card p { color: #94a3b8; font-size: 0.8rem; margin: 0; }

    .data-viewer-card {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 1.5rem;
    }
  `]
})
export class ReportingDashboardComponent implements OnInit {
  repService = inject(ReportingService);

  aiQuestion = '';
  aiResponse = signal<any>(null);
  kpis = signal<any[]>([]);
  reports = signal<any[]>([]);
  dashboards = signal<any[]>([]);
  
  executedData = signal<any[]>([]);
  dataColumns = signal<string[]>([]);
  displayedColumns: string[] = ['code', 'name', 'category', 'actions'];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.repService.getKPIs().subscribe({
      next: (res) => {
        if (res && res.success) this.kpis.set(res.data);
      }
    });

    this.repService.getReports().subscribe({
      next: (res) => {
        if (res && res.success) this.reports.set(res.data);
      }
    });

    this.repService.getDashboards().subscribe({
      next: (res) => {
        if (res && res.success) this.dashboards.set(res.data);
      }
    });
  }

  askAI() {
    if (!this.aiQuestion.trim()) return;
    this.repService.askAI(this.aiQuestion).subscribe({
      next: (res) => {
        if (res && res.success) this.aiResponse.set(res.data);
      }
    });
  }

  runReport(id: string) {
    this.repService.executeReport(id, {}).subscribe({
      next: (res) => {
        if (res && res.success && res.data.data) {
          const list = res.data.data;
          this.executedData.set(list);
          if (list.length > 0) {
            this.dataColumns.set(Object.keys(list[0]));
          }
        }
      }
    });
  }

  exportReport(id: string) {
    this.repService.exportReportCsv(id, {}).subscribe({
      next: (blob: any) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${id}.csv`;
        a.click();
      }
    });
  }
}
