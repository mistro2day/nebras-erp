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
          <h1>منصة ذكاء الأعمال والتقارير والتحليلات</h1>
          <p>لوحة التحكم المركزية لتوليد تقارير الموديولات وتتبع مؤشرات الأداء والتحليل الذكي</p>
        </div>
      </header>

      <!-- AI Natural Language Query Box (شريط الأمر الذكي — نمط لوحة مساعد نبراس) -->
      <div class="ai-bar">
        <span class="ai-mark">✦</span>
        <input
          class="ai-input"
          [(ngModel)]="aiQuestion"
          placeholder="اسأل نبراس عن أي تقارير أو مؤشرات باللغة العربية… مثال: ما هي نسبة حضور الطلاب هذا الشهر؟"
          (keyup.enter)="askAI()"
        />
        <button class="nb-btn-primary" (click)="askAI()">اسأل نبراس</button>
      </div>
      <div class="ai-response" *ngIf="aiResponse()">
        <p><strong>استعلام SQL المقترح:</strong> <code>{{ aiResponse().interpreted_query }}</code></p>
        <p><strong>الملخص الفوري:</strong> {{ aiResponse().summary }}</p>
      </div>

      <!-- Stats Grid / KPIs -->
      <div class="kpi-grid">
        <div class="kpi-card" *ngFor="let k of kpis()">
          <div class="kpi-header">
            <span class="kpi-label">{{ k.name }}</span>
            <span class="trend-badge" [ngClass]="k.trend">
              {{ k.trend === 'up' ? '▲' : k.trend === 'down' ? '▼' : '▬' }}
            </span>
          </div>
          <span class="kpi-value">{{ k.current_value }}%</span>
          <span class="kpi-target">المستهدف: {{ k.target_value }}%</span>
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
      flex: 1;
      padding: 20px;
      min-width: 0;
      overflow-y: auto;
      background: var(--nb-bg);
      color: var(--nb-text);
    }
    .dashboard-header { margin-bottom: 16px; }
    .dashboard-header h1 { font-size: 18px; font-weight: 700; color: var(--nb-text); margin: 0; }
    .dashboard-header p { color: var(--nb-text-muted); font-size: 12px; margin: 4px 0 0; }

    .ai-bar {
      height: 40px;
      background: var(--nb-primary-50);
      border: 1px solid var(--nb-primary-200);
      border-radius: var(--nb-radius-card);
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 14px;
      margin-bottom: 12px;
    }
    .ai-mark {
      width: 20px;
      height: 20px;
      background: var(--nb-primary-600);
      border-radius: var(--nb-radius-compact);
      color: var(--nb-on-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      flex-shrink: 0;
    }
    .ai-input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-family: var(--nb-font-family);
      font-size: 13px;
      color: var(--nb-text);
    }
    .ai-input::placeholder { color: var(--nb-primary-400); }
    .ai-response {
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
      padding: 14px;
      margin-bottom: 16px;
      font-size: 13px;
      color: var(--nb-text-secondary);
    }
    .ai-response code { color: var(--nb-primary-600); background: var(--nb-primary-50); padding: 2px 6px; border-radius: var(--nb-radius-sm); }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }
    .kpi-card {
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .kpi-header { display: flex; justify-content: space-between; align-items: center; }
    .kpi-label { font-size: 12px; color: var(--nb-text-muted); }
    .trend-badge { font-size: 11px; font-weight: 700; }
    .trend-badge.up { color: var(--nb-success); }
    .trend-badge.down { color: var(--nb-danger); }
    .trend-badge.stable { color: var(--nb-warning); }
    .kpi-value { font-size: 20px; font-weight: 700; color: var(--nb-text); }
    .kpi-target { font-size: 11px; color: var(--nb-text-faint); }

    .dashboard-tabs {
      background: var(--nb-surface);
      border-radius: var(--nb-radius-card);
      border: 1px solid var(--nb-border);
      padding: 8px 16px 16px;
      margin-bottom: 16px;
    }
    .tab-content { padding: 16px 0; }

    .reporting-table, .viewer-table { width: 100%; background: var(--nb-surface); }
    ::ng-deep .reporting-table .mat-mdc-header-cell,
    ::ng-deep .viewer-table .mat-mdc-header-cell {
      color: var(--nb-text-muted) !important;
      font-weight: 700;
      font-size: 11px;
      background: var(--nb-surface-raised);
      border-bottom: 1px solid var(--nb-border-soft) !important;
    }
    ::ng-deep .reporting-table .mat-mdc-cell,
    ::ng-deep .viewer-table .mat-mdc-cell {
      border-bottom: 1px solid var(--nb-border-row) !important;
      color: var(--nb-text) !important;
      font-size: 13px;
    }
    .action-btn { margin-left: 8px; }

    .dashboard-grid-preview {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .dashboard-preview-card {
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: center;
      text-align: center;
    }
    .dash-icon { font-size: 32px; width: 32px; height: 32px; color: var(--nb-primary-600); }
    .dashboard-preview-card h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .dashboard-preview-card p { color: var(--nb-text-muted); font-size: 12px; margin: 0; }

    .data-viewer-card {
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
      padding: 16px;
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
