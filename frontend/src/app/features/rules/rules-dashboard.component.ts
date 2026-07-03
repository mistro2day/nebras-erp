import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TenantService } from '../../core/services/tenant.service';

@Component({
  selector: 'app-rules-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="rules-dashboard" dir="rtl">
      <!-- Header -->
      <header class="dashboard-header">
        <div class="header-info">
          <h1>منصة ومحرك قواعد الأعمال الموحد</h1>
          <p>لوحة تحكم وإدارة شروط الحضور والرواتب والقبول لـ {{ ($any(tenantService).currentTenant())?.nameAr || 'نبراس ERP' }}</p>
        </div>
      </header>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <mat-icon class="icon rules">rule</mat-icon>
          <div class="meta">
            <h3>إجمالي القواعد</h3>
            <p class="value">{{ rulesCount() }}</p>
          </div>
        </div>
        <div class="stat-card">
          <mat-icon class="icon active">check_circle</mat-icon>
          <div class="meta">
            <h3>القواعد النشطة</h3>
            <p class="value">{{ activeCount() }}</p>
          </div>
        </div>
        <div class="stat-card">
          <mat-icon class="icon executions">history</mat-icon>
          <div class="meta">
            <h3>مرات التنفيذ اليوم</h3>
            <p class="value">{{ executionCount() }}</p>
          </div>
        </div>
        <div class="stat-card">
          <mat-icon class="icon failed">gpp_bad</mat-icon>
          <div class="meta">
            <h3>حالات الفشل</h3>
            <p class="value">0</p>
          </div>
        </div>
      </div>

      <!-- Main Rules Table -->
      <div class="section-title">
        <h2>سجل وقوانين العمل الحالية</h2>
      </div>

      <div class="rules-table-container">
        <table class="rules-table">
          <thead>
            <tr>
              <th>رمز القاعدة</th>
              <th>الاسم والوصف</th>
              <th>التصنيف</th>
              <th>الأولوية</th>
              <th>الحالة</th>
              <th>التحكم</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let rule of rules()">
              <td><code>{{ rule.code }}</code></td>
              <td>
                <strong>{{ rule.name }}</strong>
                <p class="desc-text">{{ rule.description || 'لا يوجد وصف حالياً.' }}</p>
              </td>
              <td><span class="category-badge">قاعدة عامة</span></td>
              <td>{{ rule.priority }}</td>
              <td>
                <span class="status-badge" [ngClass]="rule.status">
                  {{ rule.status === 'published' ? 'نشطة ومفعلة' : 'مسودة' }}
                </span>
              </td>
              <td>
                <button mat-icon-button color="primary">
                  <mat-icon>science</mat-icon>
                </button>
              </td>
            </tr>
            <tr *ngIf="rules().length === 0">
              <td colspan="6" class="no-data">لا توجد قواعد مسجلة حالياً في النظام.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .rules-dashboard {
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
      background: linear-gradient(to left, #ec4899, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
    }
    .dashboard-header p { color: #94a3b8; margin: 4px 0 0; }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
      margin-bottom: 2.5rem;
    }
    .stat-card {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .stat-card .icon {
      font-size: 32px; width: 32px; height: 32px;
      padding: 8px; border-radius: 12px;
    }
    .stat-card .icon.rules { background: rgba(236, 72, 153, 0.15); color: #f472b6; }
    .stat-card .icon.active { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .stat-card .icon.executions { background: rgba(139, 92, 246, 0.15); color: #a78bfa; }
    .stat-card .icon.failed { background: rgba(239, 68, 68, 0.15); color: #f87171; }
    .stat-card h3 { font-size: 0.75rem; color: #94a3b8; margin: 0; }
    .stat-card .value { font-size: 1.6rem; font-weight: bold; margin: 2px 0 0 0; }

    .section-title h2 { font-size: 1.25rem; font-weight: bold; margin-bottom: 1.5rem; color: #cbd5e1; }
    
    .rules-table-container {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      overflow: hidden;
    }
    .rules-table { width: 100%; border-collapse: collapse; text-align: right; }
    .rules-table th {
      background: rgba(15, 23, 42, 0.4); padding: 14px 16px;
      font-size: 0.85rem; color: #94a3b8;
    }
    .rules-table td {
      padding: 14px 16px; font-size: 0.85rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
    .desc-text { margin: 4px 0 0 0; font-size: 0.75rem; color: #64748b; }
    .category-badge {
      font-size: 0.75rem; background: rgba(139, 92, 246, 0.15); color: #a78bfa; padding: 2px 8px; border-radius: 9999px;
    }
    .status-badge {
      font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; font-weight: bold;
    }
    .status-badge.published { background: rgba(16,185,129,0.2); color: #34d399; }
    .status-badge.draft { background: rgba(245,158,11,0.2); color: #fbbf24; }
    .no-data { text-align: center; padding: 3rem !important; color: #94a3b8; }
  `]
})
export class RulesDashboardComponent implements OnInit {
  tenantService = inject(TenantService);
  http = inject(HttpClient);

  rules = signal<any[]>([]);
  rulesCount = signal(0);
  activeCount = signal(0);
  executionCount = signal(0);

  ngOnInit() {
    this.loadRules();
  }

  loadRules() {
    this.http.get<any>('/api/v1/rules/rules/').subscribe({
      next: (res) => {
        if (res && res.success) {
          this.rules.set(res.data);
          this.rulesCount.set(res.data.length);
          this.activeCount.set(res.data.filter((r: any) => r.status === 'published').length);
        }
      }
    });

    this.http.get<any>('/api/v1/rules/executions/').subscribe({
      next: (res) => {
        if (res && res.success) {
          this.executionCount.set(res.data.length);
        }
      }
    });
  }
}