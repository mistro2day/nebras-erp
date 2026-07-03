import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TenantService } from '../../core/services/tenant.service';

@Component({
  selector: 'app-scheduling-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="scheduling-dashboard" dir="rtl">
      <!-- Header -->
      <header class="dashboard-header">
        <div class="header-info">
          <h1>محرك الجدولة الموحد للمؤسسة</h1>
          <p>لوحة تعقب الموارد والتعارضات والحجوزات لـ {{ ($any(tenantService).currentTenant())?.nameAr || 'نبراس ERP' }}</p>
        </div>
      </header>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <mat-icon class="icon schedules">event_note</mat-icon>
          <div class="meta">
            <h3>إجمالي الجداول</h3>
            <p class="value">{{ schedulesCount() }}</p>
          </div>
        </div>
        <div class="stat-card">
          <mat-icon class="icon resources">meeting_room</mat-icon>
          <div class="meta">
            <h3>الموارد المجدولة</h3>
            <p class="value">{{ resourcesCount() }}</p>
          </div>
        </div>
        <div class="stat-card">
          <mat-icon class="icon reservations">book_online</mat-icon>
          <div class="meta">
            <h3>الحجوزات النشطة</h3>
            <p class="value">{{ reservationsCount() }}</p>
          </div>
        </div>
        <div class="stat-card">
          <mat-icon class="icon conflicts">warning</mat-icon>
          <div class="meta">
            <h3>التعارضات المكتشفة</h3>
            <p class="value">{{ conflictsCount() }}</p>
          </div>
        </div>
      </div>

      <!-- Conflicts Alert Panel -->
      <div class="conflict-panel" *ngIf="conflictsCount() > 0">
        <div class="panel-header">
          <mat-icon>report_problem</mat-icon>
          <h3>مركز حل التعارضات والتحذيرات</h3>
        </div>
        <div class="conflict-list">
          <div class="conflict-item" *ngFor="let conf of conflicts()">
            <span class="severity-badge" [ngClass]="conf.severity">{{ conf.severity === 'high' ? 'حرج' : 'متوسط' }}</span>
            <p class="desc">{{ conf.description }}</p>
            <span class="time">{{ conf.detected_at | date:'shortTime' }}</span>
          </div>
        </div>
      </div>

      <!-- Main Schedule Grid -->
      <div class="section-title">
        <h2>قائمة الجداول النشطة</h2>
      </div>

      <div class="scheduling-grid">
        <div class="schedule-card" *ngFor="let sch of schedules()">
          <div class="card-header">
            <span class="type-badge">{{ sch.schedule_type }}</span>
            <h3>{{ sch.name }}</h3>
          </div>
          <p class="code">الرمز المرجعي: {{ sch.code }}</p>
          <p class="desc">{{ sch.description || 'لا يوجد وصف.' }}</p>
          <div class="card-footer">
            <span class="status-badge" [ngClass]="sch.status">{{ sch.status === 'published' ? 'منشور' : 'مسودة' }}</span>
            <button mat-flat-button color="primary">إدارة الجدول</button>
          </div>
        </div>
        <div class="no-schedules" *ngIf="schedules().length === 0">
          <mat-icon>calendar_today</mat-icon>
          <p>لا توجد جداول نشطة حالياً.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .scheduling-dashboard {
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
      background: linear-gradient(to left, #8b5cf6, #3b82f6);
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
    .stat-card .icon.schedules { background: rgba(139, 92, 246, 0.15); color: #a78bfa; }
    .stat-card .icon.resources { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
    .stat-card .icon.reservations { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .stat-card .icon.conflicts { background: rgba(239, 68, 68, 0.15); color: #f87171; }
    .stat-card h3 { font-size: 0.75rem; color: #94a3b8; margin: 0; }
    .stat-card .value { font-size: 1.6rem; font-weight: bold; margin: 2px 0 0 0; }

    .conflict-panel {
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 16px;
      padding: 1.25rem;
      margin-bottom: 2rem;
    }
    .conflict-panel .panel-header {
      display: flex; align-items: center; gap: 8px; color: #f87171; margin-bottom: 1rem;
    }
    .conflict-panel .panel-header h3 { margin: 0; font-size: 1.1rem; font-weight: bold; }
    .conflict-list { display: flex; flexDirection: column; gap: 8px; }
    .conflict-item {
      background: rgba(15, 23, 42, 0.6);
      padding: 10px 14px; border-radius: 8px;
      display: flex; align-items: center; gap: 12px;
    }
    .severity-badge {
      font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; font-weight: bold;
    }
    .severity-badge.high { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    .desc { flex: 1; margin: 0; font-size: 0.85rem; color: #cbd5e1; }
    .time { font-size: 0.75rem; color: #64748b; }

    .section-title h2 { font-size: 1.25rem; font-weight: bold; margin-bottom: 1.5rem; color: #cbd5e1; }
    .scheduling-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem;
    }
    .schedule-card {
      background: #1e293b; border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px; padding: 1.25rem; display: flex; flexDirection: column; gap: 10px;
    }
    .card-header { display: flex; justify-content: space-between; align-items: center; }
    .card-header h3 { margin: 0; font-size: 1.15rem; font-weight: bold; color: #f8fafc; }
    .type-badge { font-size: 0.75rem; background: rgba(59,130,246,0.15); color: #60a5fa; padding: 2px 8px; border-radius: 9999px; }
    .code { font-size: 0.8rem; color: #64748b; margin: 0; }
    .desc { font-size: 0.85rem; color: #94a3b8; flex: 1; margin: 0; }
    .card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
    .status-badge { font-size: 0.75rem; padding: 2px 8px; border-radius: 6px; font-weight: bold; }
    .status-badge.published { background: rgba(16,185,129,0.2); color: #34d399; }
    .status-badge.draft { background: rgba(245,158,11,0.2); color: #fbbf24; }
    .no-schedules { grid-column: span 3; text-align: center; padding: 4rem; color: #64748b; }
    .no-schedules mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 10px; }
  `]
})
export class SchedulingDashboardComponent implements OnInit {
  tenantService = inject(TenantService);
  http = inject(HttpClient);

  schedules = signal<any[]>([]);
  conflicts = signal<any[]>([]);

  schedulesCount = signal(0);
  resourcesCount = signal(0);
  reservationsCount = signal(0);
  conflictsCount = signal(0);

  ngOnInit() {
    this.loadSchedulingData();
  }

  loadSchedulingData() {
    this.http.get<any>('/api/v1/scheduling/schedules/').subscribe({
      next: (res) => {
        if (res && res.success) {
          this.schedules.set(res.data);
          this.schedulesCount.set(res.data.length);
        }
      }
    });

    this.http.get<any>('/api/v1/scheduling/resources/').subscribe({
      next: (res) => {
        if (res && res.success) this.resourcesCount.set(res.data.length);
      }
    });

    this.http.get<any>('/api/v1/scheduling/reservations/').subscribe({
      next: (res) => {
        if (res && res.success) this.reservationsCount.set(res.data.length);
      }
    });

    this.http.get<any>('/api/v1/scheduling/conflicts/').subscribe({
      next: (res) => {
        if (res && res.success) {
          this.conflicts.set(res.data);
          this.conflictsCount.set(res.data.length);
        }
      }
    });
  }
}