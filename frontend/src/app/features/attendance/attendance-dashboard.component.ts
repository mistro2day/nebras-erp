import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TenantService } from '../../core/services/tenant.service';

@Component({
  selector: 'app-attendance-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="attendance-dashboard" dir="rtl">
      <!-- Header -->
      <header class="dashboard-header">
        <div class="header-info">
          <h1>إدارة الحضور والغياب وتتبع الوقت</h1>
          <p>لوحة تعقب انضباط الموظفين والمعلمين لـ {{ tenantService.currentTenant()?.nameAr || 'نبراس ERP' }}</p>
        </div>
      </header>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <mat-icon class="icon present">check_circle</mat-icon>
          <div class="meta">
            <h3>الحضور اليوم</h3>
            <p class="value">{{ presentCount() }}</p>
          </div>
        </div>
        <div class="stat-card">
          <mat-icon class="icon absent">cancel</mat-icon>
          <div class="meta">
            <h3>الغياب اليوم</h3>
            <p class="value">{{ absentCount() }}</p>
          </div>
        </div>
        <div class="stat-card">
          <mat-icon class="icon late">schedule</mat-icon>
          <div class="meta">
            <h3>التأخير اليوم</h3>
            <p class="value">{{ lateCount() }}</p>
          </div>
        </div>
        <div class="stat-card">
          <mat-icon class="icon corrections">edit_note</mat-icon>
          <div class="meta">
            <h3>طلبات التعديل المعلقة</h3>
            <p class="value">{{ pendingCorrections() }}</p>
          </div>
        </div>
      </div>

      <!-- Attendance Table -->
      <div class="section-title">
        <h2>سجل الحضور اليومي</h2>
      </div>

      <div class="attendance-table-container">
        <table class="attendance-table">
          <thead>
            <tr>
              <th>اسم الموظف</th>
              <th>التاريخ</th>
              <th>تسجيل الحضور</th>
              <th>تسجيل الانصراف</th>
              <th>التأخير (دقائق)</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let rec of records()">
              <td><strong>{{ rec.employee_name }}</strong></td>
              <td>{{ rec.date }}</td>
              <td>{{ rec.check_in || '—' }}</td>
              <td>{{ rec.check_out || '—' }}</td>
              <td>{{ rec.late_minutes }}</td>
              <td>
                <span class="status-badge" [ngClass]="rec.status">{{ getStatusText(rec.status) }}</span>
              </td>
            </tr>
            <tr *ngIf="records().length === 0">
              <td colspan="6" class="no-data">لا توجد سجلات حضور لهذا اليوم بعد.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .attendance-dashboard {
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
      background: linear-gradient(to left, #f59e0b, #ef4444);
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
    .stat-card .icon.present { background: rgba(16,185,129,0.15); color: #34d399; }
    .stat-card .icon.absent { background: rgba(239,68,68,0.15); color: #f87171; }
    .stat-card .icon.late { background: rgba(245,158,11,0.15); color: #fbbf24; }
    .stat-card .icon.corrections { background: rgba(99,102,241,0.15); color: #818cf8; }
    .stat-card h3 { font-size: 0.75rem; color: #94a3b8; margin: 0; }
    .stat-card .value { font-size: 1.6rem; font-weight: bold; margin: 2px 0 0 0; }

    .section-title h2 { font-size: 1.25rem; font-weight: bold; margin-bottom: 1.5rem; color: #cbd5e1; }
    .attendance-table-container {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      overflow: hidden;
    }
    .attendance-table { width: 100%; border-collapse: collapse; text-align: right; }
    .attendance-table th {
      background: rgba(15,23,42,0.4); padding: 14px 16px;
      font-size: 0.85rem; color: #94a3b8;
    }
    .attendance-table td {
      padding: 14px 16px; font-size: 0.85rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
    .status-badge {
      font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; font-weight: bold;
    }
    .status-badge.present { background: rgba(16,185,129,0.2); color: #34d399; }
    .status-badge.absent { background: rgba(239,68,68,0.2); color: #f87171; }
    .status-badge.late { background: rgba(245,158,11,0.2); color: #fbbf24; }
    .status-badge.leave { background: rgba(99,102,241,0.2); color: #818cf8; }
    .no-data { text-align: center; padding: 3rem !important; color: #94a3b8; }
  `]
})
export class AttendanceDashboardComponent implements OnInit {
  tenantService = inject(TenantService);
  http = inject(HttpClient);

  records = signal<any[]>([]);
  presentCount = signal(0);
  absentCount = signal(0);
  lateCount = signal(0);
  pendingCorrections = signal(0);

  ngOnInit() { this.loadAttendance(); }

  loadAttendance() {
    this.http.get<any>('/api/v1/attendance/records/').subscribe({
      next: (res) => {
        if (res?.success) {
          const data = res.data;
          this.records.set(data);
          this.presentCount.set(data.filter((r: any) => r.status === 'present').length);
          this.absentCount.set(data.filter((r: any) => r.status === 'absent').length);
          this.lateCount.set(data.filter((r: any) => r.status === 'late').length);
        }
      }
    });
  }

  getStatusText(status: string): string {
    const map: Record<string, string> = {
      present: 'حاضر', absent: 'غائب', late: 'متأخر', leave: 'إجازة'
    };
    return map[status] || status;
  }
}