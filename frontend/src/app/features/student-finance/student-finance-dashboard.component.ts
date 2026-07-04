import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StudentFinanceService } from './student-finance.service';

@Component({
  selector: 'app-student-finance-dashboard',
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
          <h1>منصة الحسابات المالية للطلاب والقبض</h1>
          <p>لوحة التحكم بالرسوم، الفواتير، التحصيلات، والمنح الدراسية</p>
        </div>
        <button mat-flat-button color="primary" (click)="loadDashboard()">
          <mat-icon>refresh</mat-icon> تحديث البيانات
        </button>
      </div>

      <!-- Loading State -->
      <div class="spinner-container" *ngIf="financeService.loading()">
        <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
      </div>

      <!-- Stats Cards Grid -->
      <div class="stats-grid" *ngIf="financeService.stats() as stats">
        <!-- Outstanding Receivables -->
        <mat-card class="stat-card outstanding-card">
          <mat-card-header>
            <div class="icon-wrapper">
              <mat-icon>money_off</mat-icon>
            </div>
            <mat-card-title>المستحقات المعلقة</mat-card-title>
            <mat-card-subtitle>حسابات القبض المطلوبة من الطلاب</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value">
            {{ stats.outstanding_receivables | currency:'SAR ':'symbol':'1.2-2' }}
          </mat-card-content>
        </mat-card>

        <!-- Today's Collections -->
        <mat-card class="stat-card today-collections-card">
          <mat-card-header>
            <div class="icon-wrapper">
              <mat-icon>account_balance_wallet</mat-icon>
            </div>
            <mat-card-title>تحصيلات اليوم</mat-card-title>
            <mat-card-subtitle>إجمالي المقبوضات لليوم الحالي</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value">
            {{ stats.today_collections | currency:'SAR ':'symbol':'1.2-2' }}
          </mat-card-content>
        </mat-card>

        <!-- Monthly Collections -->
        <mat-card class="stat-card monthly-collections-card">
          <mat-card-header>
            <div class="icon-wrapper">
              <mat-icon>trending_up</mat-icon>
            </div>
            <mat-card-title>تحصيلات الشهر</mat-card-title>
            <mat-card-subtitle>إجمالي التحصيلات للشهر الحالي</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value">
            {{ stats.monthly_collections | currency:'SAR ':'symbol':'1.2-2' }}
          </mat-card-content>
        </mat-card>

        <!-- Active Financial Holds -->
        <mat-card class="stat-card hold-card">
          <mat-card-header>
            <div class="icon-wrapper">
              <mat-icon>block</mat-icon>
            </div>
            <mat-card-title>الحظر المالي النشط</mat-card-title>
            <mat-card-subtitle>الطلاب المحجوبين بسبب المديونية</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value alert-text">
            {{ stats.active_holds }} <span class="unit">طلاب</span>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Billing Accounts Section -->
      <div class="table-section">
        <h2>حسابات الطلاب المالية</h2>
        <mat-card class="table-card">
          <table mat-table [dataSource]="accounts" class="w-full">
            <ng-container matColumnDef="accountNumber">
              <th mat-header-cell *matHeaderCellDef>رقم الحساب</th>
              <td mat-cell *matCellDef="let row">{{ row.account_number }}</td>
            </ng-container>

            <ng-container matColumnDef="studentId">
              <th mat-header-cell *matHeaderCellDef>معرف الطالب</th>
              <td mat-cell *matCellDef="let row">{{ row.student_id | slice:0:8 }}...</td>
            </ng-container>

            <ng-container matColumnDef="outstandingBalance">
              <th mat-header-cell *matHeaderCellDef>المبلغ المستحق</th>
              <td mat-cell *matCellDef="let row" class="bold">{{ row.outstanding_balance | currency:'SAR ' }}</td>
            </ng-container>

            <ng-container matColumnDef="creditBalance">
              <th mat-header-cell *matHeaderCellDef>الرصيد الدائن الفائض</th>
              <td mat-cell *matCellDef="let row">{{ row.credit_balance | currency:'SAR ' }}</td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>حالة الحساب</th>
              <td mat-cell *matCellDef="let row">
                <span class="badge" [ngClass]="row.financial_hold ? 'badge-danger' : 'badge-success'">
                  {{ row.financial_hold ? 'حظر مالي نشط' : 'نشط وسليم' }}
                </span>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </mat-card>
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
    .stat-card .icon-wrapper {
      background: #f1f5f9;
      padding: 0.75rem;
      border-radius: 8px;
      color: #3b82f6;
      margin-bottom: 0.5rem;
    }
    .stat-value {
      font-size: 1.8rem;
      font-weight: 800;
      color: #1e293b;
      margin-top: 1rem;
    }
    .alert-text {
      color: #ef4444;
    }
    .unit {
      font-size: 1rem;
      font-weight: 500;
      color: #64748b;
    }
    .table-section {
      margin-top: 2rem;
    }
    .table-section h2 {
      font-size: 1.5rem;
      color: #0f172a;
      margin-bottom: 1rem;
    }
    .table-card {
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    .w-full {
      width: 100%;
    }
    .bold {
      font-weight: 600;
      color: #0f172a;
    }
    .badge {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .badge-success {
      background: #dcfce7;
      color: #15803d;
    }
    .badge-danger {
      background: #fee2e2;
      color: #b91c1c;
    }
    .spinner-container {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }
  `]
})
export class StudentFinanceDashboardComponent implements OnInit {
  financeService = inject(StudentFinanceService);
  accounts: any[] = [];
  displayedColumns: string[] = ['accountNumber', 'studentId', 'outstandingBalance', 'creditBalance', 'status'];

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.financeService.getDashboardStats().subscribe();
    this.financeService.getBillingAccounts().subscribe(data => {
      this.accounts = data;
    });
  }
}
