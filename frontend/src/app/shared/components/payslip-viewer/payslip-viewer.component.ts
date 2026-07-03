import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface PayslipInfo {
  id: string;
  employee_name: string;
  employee_number: string;
  basic_salary: number;
  gross_earnings: number;
  total_deductions: number;
  net_salary: number;
  status: string;
  period_code: string;
}

@Component({
  selector: 'app-payslip-viewer',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <mat-card class="payslip-card" dir="rtl">
      <div class="payslip-header">
        <mat-icon class="header-icon">payments</mat-icon>
        <div class="title-meta">
          <h3>قسيمة الراتب التفصيلية</h3>
          <span class="period">الفترة: {{ payslip().period_code }}</span>
        </div>
        <span class="status-badge" [ngClass]="payslip().status">
          {{ payslip().status === 'paid' ? 'تم الدفع' : 'قيد المراجعة' }}
        </span>
      </div>

      <mat-card-content class="payslip-body">
        <div class="emp-summary">
          <p><strong>اسم الموظف:</strong> {{ payslip().employee_name }}</p>
          <p><strong>الرقم الوظيفي:</strong> {{ payslip().employee_number }}</p>
        </div>

        <div class="salary-details">
          <div class="row">
            <span>الراتب الأساسي</span>
            <span class="value">{{ payslip().basic_salary | number:'1.2-2' }} SDG</span>
          </div>
          <div class="row positive">
            <span>إجمالي البدلات والمستحقات</span>
            <span class="value">+{{ payslip().gross_earnings - payslip().basic_salary | number:'1.2-2' }} SDG</span>
          </div>
          <div class="row negative">
            <span>إجمالي الاستقطاعات والخصومات</span>
            <span class="value">-{{ payslip().total_deductions | number:'1.2-2' }} SDG</span>
          </div>
          <hr class="divider" />
          <div class="row net">
            <span>صافي الراتب المستحق</span>
            <span class="value">{{ payslip().net_salary | number:'1.2-2' }} SDG</span>
          </div>
        </div>
      </mat-card-content>

      <mat-card-actions class="payslip-footer">
        <button mat-flat-button color="primary">
          <mat-icon>download</mat-icon> تحميل PDF
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .payslip-card {
      background: #1e293b !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      border-radius: 16px !important;
      color: #f8fafc !important;
      padding: 1.5rem;
      font-family: 'Cairo', sans-serif;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .payslip-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 1.5rem;
      position: relative;
    }
    .header-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #10b981;
    }
    .title-meta h3 {
      font-size: 1rem;
      font-weight: bold;
      margin: 0;
    }
    .title-meta .period {
      font-size: 0.75rem;
      color: #94a3b8;
    }
    .status-badge {
      position: absolute;
      left: 0;
      top: 0;
      font-size: 0.65rem;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: bold;
    }
    .status-badge.paid { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .status-badge.draft { background: rgba(234, 179, 8, 0.2); color: #facc15; }

    .emp-summary {
      background: rgba(15, 23, 42, 0.3);
      padding: 10px 12px;
      border-radius: 8px;
      margin-bottom: 1.25rem;
      font-size: 0.8rem;
    }
    .emp-summary p { margin: 4px 0; }

    .salary-details {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      color: #cbd5e1;
    }
    .row.positive { color: #34d399; }
    .row.negative { color: #f87171; }
    .row.net {
      font-size: 1rem;
      font-weight: 800;
      color: #38bdf8;
    }
    .divider {
      border: 0;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      margin: 8px 0;
    }
    .payslip-footer {
      display: flex;
      justify-content: flex-end;
      padding: 0;
      margin-top: 1.5rem;
    }
    .payslip-footer button {
      width: 100%;
    }
  `]
})
export class PayslipViewerComponent {
  payslip = input.required<PayslipInfo>();
}