import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PayslipViewerComponent, PayslipInfo } from '../../shared/components/payslip-viewer/payslip-viewer.component';
import { TenantService } from '../../core/services/tenant.service';

@Component({
  selector: 'app-payroll-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, PayslipViewerComponent],
  template: `
    <div class="payroll-dashboard" dir="rtl">
      <!-- Header -->
      <header class="dashboard-header">
        <div class="header-info">
          <h1>إدارة الرواتب والتعويضات (Payroll & Compensation)</h1>
          <p>بوابة إدارة كشوف ومسيرات رواتب الموظفين لـ {{ ($any(tenantService).currentTenant())?.nameAr || 'نبراس ERP' }}</p>
        </div>
      </header>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <mat-icon class="icon cost">monetization_on</mat-icon>
          <div class="meta">
            <h3>إجمالي تكلفة الرواتب المعتمدة</h3>
            <p class="value">{{ totalCost() | number:'1.2-2' }} SDG</p>
          </div>
        </div>
        <div class="stat-card">
          <mat-icon class="icon loans">account_balance_wallet</mat-icon>
          <div class="meta">
            <h3>إجمالي القروض القائمة</h3>
            <p class="value">450,000 SDG</p>
          </div>
        </div>
      </div>

      <!-- Payslips Section -->
      <div class="section-title">
        <h2>قسائم رواتب الموظفين الأخيرة</h2>
      </div>

      <div class="payslips-grid">
        <app-payslip-viewer *ngFor="let payslip of payslips()" [payslip]="payslip"></app-payslip-viewer>
        <div class="no-data" *ngIf="payslips().length === 0">
          <mat-icon>receipt_long</mat-icon>
          <p>لا توجد قسائم رواتب مسجلة أو معالجة لهذه الفترة.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .payroll-dashboard {
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
      background: linear-gradient(to left, #10b981, #f59e0b);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
    }
    .dashboard-header p {
      color: #94a3b8;
      margin: 4px 0 0;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 2.5rem;
    }
    .stat-card {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }
    .stat-card .icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      padding: 10px;
      border-radius: 12px;
    }
    .stat-card .icon.cost { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .stat-card .icon.loans { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .stat-card h3 { font-size: 0.8rem; color: #94a3b8; margin: 0; }
    .stat-card .value { font-size: 1.85rem; font-weight: bold; margin: 4px 0 0 0; }

    .section-title h2 {
      font-size: 1.25rem;
      font-weight: bold;
      margin-bottom: 1.5rem;
      color: #cbd5e1;
    }
    .payslips-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
    }
    .no-data {
      grid-column: 1 / -1;
      text-align: center;
      padding: 4rem 2rem;
      color: #94a3b8;
    }
  `]
})
export class PayrollDashboardComponent implements OnInit {
  tenantService = inject(TenantService);
  http = inject(HttpClient);

  payslips = signal<PayslipInfo[]>([]);
  totalCost = signal<number>(0);

  ngOnInit() {
    this.loadPayrollData();
  }

  loadPayrollData() {
    this.http.get<any>('/api/v1/payroll/payslips/').subscribe({
      next: (res) => {
        if (res && res.success) {
          this.payslips.set(res.data);
        }
      }
    });

    this.http.get<any>('/api/v1/payroll/runs/').subscribe({
      next: (res) => {
        if (res && res.success && res.data.length > 0) {
          const sum = res.data.reduce((acc: number, run: any) => acc + parseFloat(run.total_cost), 0);
          this.totalCost.set(sum);
        }
      }
    });
  }
}