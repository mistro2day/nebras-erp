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
        <span [class]="payslip().status === 'paid' ? 'nb-badge-success' : 'nb-badge-warning'">
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
        <button class="nb-btn-secondary" style="width:100%">تحميل PDF</button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .payslip-card {
      background: var(--nb-surface) !important;
      border: 1px solid var(--nb-border) !important;
      border-radius: var(--nb-radius-card) !important;
      color: var(--nb-text) !important;
      padding: 20px;
      font-family: var(--nb-font-family);
      box-shadow: var(--nb-shadow-card);
    }
    .payslip-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      position: relative;
    }
    .header-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: var(--nb-success);
    }
    .title-meta h3 {
      font-size: 14px;
      font-weight: 700;
      margin: 0;
      color: var(--nb-text);
    }
    .title-meta .period {
      font-size: 12px;
      color: var(--nb-text-muted);
    }
    .payslip-header > span:last-child {
      position: absolute;
      left: 0;
      top: 0;
    }
    .emp-summary {
      background: var(--nb-surface-raised);
      border: 1px solid var(--nb-border-soft);
      padding: 10px 12px;
      border-radius: var(--nb-radius);
      margin-bottom: 16px;
      font-size: 12px;
      color: var(--nb-text-secondary);
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
      font-size: 13px;
      color: var(--nb-text-secondary);
    }
    .row .value { font-variant-numeric: tabular-nums; }
    .row.positive { color: var(--nb-success); }
    .row.negative { color: var(--nb-danger); }
    .row.net {
      font-size: 15px;
      font-weight: 800;
      color: var(--nb-primary-600);
    }
    .divider {
      border: 0;
      border-top: 1px solid var(--nb-border);
      margin: 8px 0;
    }
    .payslip-footer {
      display: flex;
      justify-content: flex-end;
      padding: 0;
      margin-top: 16px;
    }
  `]
})
export class PayslipViewerComponent {
  payslip = input.required<PayslipInfo>();
}