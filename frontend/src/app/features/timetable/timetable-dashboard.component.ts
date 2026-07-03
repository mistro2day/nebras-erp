import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TenantService } from '../../core/services/tenant.service';

@Component({
  selector: 'app-timetable-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="timetable-dashboard" dir="rtl">
      <!-- Header -->
      <header class="dashboard-header">
        <div class="header-info">
          <h1>إدارة الجدول الأكاديمي والجدولة الذكية</h1>
          <p>بوابة إدارة وتوزيع الفصول الدراسية وحصص المعلمين لـ {{ ($any(tenantService).currentTenant())?.nameAr || 'نبراس ERP' }}</p>
        </div>
      </header>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <mat-icon class="icon timetable">calendar_today</mat-icon>
          <div class="meta">
            <h3>الجداول المفعلة</h3>
            <p class="value">{{ timetablesCount() }}</p>
          </div>
        </div>
        <div class="stat-card">
          <mat-icon class="icon assignments">assignment_ind</mat-icon>
          <div class="meta">
            <h3>توزيع الحصص الأسبوعية</h3>
            <p class="value">{{ entriesCount() }}</p>
          </div>
        </div>
        <div class="stat-card">
          <mat-icon class="icon utilization">insights</mat-icon>
          <div class="meta">
            <h3>نسبة إشغال القاعات</h3>
            <p class="value">82%</p>
          </div>
        </div>
        <div class="stat-card">
          <mat-icon class="icon conflict">warning</mat-icon>
          <div class="meta">
            <h3>التعارضات النشطة</h3>
            <p class="value">0</p>
          </div>
        </div>
      </div>

      <!-- Class Schedules Grid -->
      <div class="section-title">
        <h2>الجداول الدراسية النشطة</h2>
      </div>

      <div class="timetable-grid">
        <div class="timetable-card" *ngFor="let tt of timetables()">
          <div class="card-header">
            <span class="status-badge" [ngClass]="tt.status">
              {{ tt.status === 'published' ? 'منشور' : 'مسودة' }}
            </span>
            <h3>{{ tt.name }}</h3>
          </div>
          <p class="meta-info">السنة الدراسية: {{ tt.academic_year }} | الفصل الدراسي: {{ tt.term }}</p>
          <div class="card-footer">
            <button mat-flat-button color="primary">عرض جدول الحصص</button>
          </div>
        </div>
        <div class="no-data" *ngIf="timetables().length === 0">
          لا توجد جداول أكاديمية نشطة حالياً.
        </div>
      </div>
    </div>
  `,
  styles: [`
    .timetable-dashboard {
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
    .stat-card .icon.timetable { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
    .stat-card .icon.assignments { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .stat-card .icon.utilization { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .stat-card .icon.conflict { background: rgba(239, 68, 68, 0.15); color: #f87171; }
    .stat-card h3 { font-size: 0.75rem; color: #94a3b8; margin: 0; }
    .stat-card .value { font-size: 1.6rem; font-weight: bold; margin: 2px 0 0 0; }

    .section-title h2 { font-size: 1.25rem; font-weight: bold; margin-bottom: 1.5rem; color: #cbd5e1; }
    
    .timetable-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem;
    }
    .timetable-card {
      background: #1e293b; border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px; padding: 1.25rem; display: flex; flexDirection: column; gap: 10px;
    }
    .card-header { display: flex; justify-content: space-between; align-items: center; }
    .card-header h3 { margin: 0; font-size: 1.15rem; font-weight: bold; color: #f8fafc; }
    .meta-info { font-size: 0.8rem; color: #94a3b8; margin: 0; }
    .status-badge {
      font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; font-weight: bold;
    }
    .status-badge.published { background: rgba(16,185,129,0.2); color: #34d399; }
    .status-badge.draft { background: rgba(245,158,11,0.2); color: #fbbf24; }
    .no-data { grid-column: span 3; text-align: center; padding: 3rem; color: #64748b; }
  `]
})
export class TimetableDashboardComponent implements OnInit {
  tenantService = inject(TenantService);
  http = inject(HttpClient);

  timetables = signal<any[]>([]);
  timetablesCount = signal(0);
  entriesCount = signal(0);

  ngOnInit() {
    this.loadTimetableData();
  }

  loadTimetableData() {
    this.http.get<any>('/api/v1/timetable/timetables/').subscribe({
      next: (res) => {
        if (res && res.success) {
          this.timetables.set(res.data);
          this.timetablesCount.set(res.data.length);
        }
      }
    });

    this.http.get<any>('/api/v1/timetable/entries/').subscribe({
      next: (res) => {
        if (res && res.success) {
          this.entriesCount.set(res.data.length);
        }
      }
    });
  }
}
