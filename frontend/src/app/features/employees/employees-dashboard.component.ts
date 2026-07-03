import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TenantService } from '../../core/services/tenant.service';

export interface EmployeeInfo {
  id: string;
  employee_number: string;
  full_name_ar: string;
  position: string;
  department: string;
  employment_type: string;
  status: string;
}

@Component({
  selector: 'app-employees-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="employees-dashboard" dir="rtl">
      <!-- Header -->
      <header class="dashboard-header">
        <div class="header-info">
          <h1>بوابة الموارد البشرية وإدارة الموظفين</h1>
          <p>لوحة تعقب الموظفين والإداريين الموحدة لـ {{ ($any(tenantService).currentTenant())?.nameAr || 'نبراس ERP' }}</p>
        </div>
      </header>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <mat-icon class="icon active">people</mat-icon>
          <div class="meta">
            <h3>إجمالي الموظفين</h3>
            <p class="value">{{ employees().length }}</p>
          </div>
        </div>
        <div class="stat-card">
          <mat-icon class="icon dept">domain</mat-icon>
          <div class="meta">
            <h3>الأقسام النشطة</h3>
            <p class="value">5</p>
          </div>
        </div>
      </div>

      <!-- Employees List Table -->
      <div class="section-title">
        <h2>سجل الموظفين الموحد</h2>
      </div>

      <div class="employees-list-container">
        <table class="employees-table">
          <thead>
            <tr>
              <th>الرقم الوظيفي</th>
              <th>الاسم الكامل</th>
              <th>القسم</th>
              <th>المسمى الوظيفي</th>
              <th>نوع التوظيف</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let emp of employees()">
              <td>{{ emp.employee_number }}</td>
              <td><strong>{{ emp.full_name_ar }}</strong></td>
              <td>{{ emp.department }}</td>
              <td>{{ emp.position }}</td>
              <td>{{ emp.employment_type }}</td>
              <td>
                <span class="status-badge" [ngClass]="emp.status">{{ emp.status === 'active' ? 'نشط' : emp.status }}</span>
              </td>
            </tr>
            <tr *ngIf="employees().length === 0">
              <td colspan="6" class="no-data">لا يوجد موظفين مسجلين حالياً.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .employees-dashboard {
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
      background: linear-gradient(to left, #10b981, #3b82f6);
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
    .stat-card .icon.active { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .stat-card .icon.dept { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
    .stat-card h3 { font-size: 0.8rem; color: #94a3b8; margin: 0; }
    .stat-card .value { font-size: 1.85rem; font-weight: bold; margin: 4px 0 0 0; }

    .section-title h2 {
      font-size: 1.25rem;
      font-weight: bold;
      margin-bottom: 1.5rem;
      color: #cbd5e1;
    }
    .employees-list-container {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      overflow: hidden;
    }
    .employees-table {
      width: 100%;
      border-collapse: collapse;
      text-align: right;
    }
    .employees-table th {
      background: rgba(15, 23, 42, 0.4);
      padding: 14px 16px;
      font-size: 0.85rem;
      color: #94a3b8;
    }
    .employees-table td {
      padding: 14px 16px;
      font-size: 0.85rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
    .status-badge {
      font-size: 0.7rem;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: bold;
    }
    .status-badge.active { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .no-data {
      text-align: center;
      padding: 3rem !important;
      color: #94a3b8;
    }
  `]
})
export class EmployeesDashboardComponent implements OnInit {
  tenantService = inject(TenantService);
  http = inject(HttpClient);

  employees = signal<EmployeeInfo[]>([]);

  ngOnInit() {
    this.loadEmployees();
  }

  loadEmployees() {
    this.http.get<any>('/api/v1/employees/employees/').subscribe({
      next: (res) => {
        if (res && res.success) {
          this.employees.set(res.data);
        }
      }
    });
  }
}