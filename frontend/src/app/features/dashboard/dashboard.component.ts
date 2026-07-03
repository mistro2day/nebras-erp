import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TenantService } from '../../core/services/tenant.service';
import { PlatformService } from '../platform/platform.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="dashboard-shell" dir="rtl">
      <!-- Header -->
      <header class="dashboard-header">
        <div class="header-info">
          <h1>لوحة تحكم إدارة المؤسسة التعليمية</h1>
          <p>أهلاً بك في بوابة {{ tenantService.currentTenant()?.nameAr || 'نبراس ERP' }} | متابعة المؤشرات والأرقام الحية اليومية</p>
        </div>
      </header>

      <!-- Stats Grid -->
      <div class="stats-grid" *ngIf="data()">
        <div class="stat-card">
          <div class="card-icon students">
            <mat-icon>school</mat-icon>
          </div>
          <div class="card-info">
            <h3>إجمالي الطلاب المسجلين</h3>
            <p class="stat-value">{{ data().students.total }}</p>
            <span class="active-badge">{{ data().students.active }} طالب نشط حالياً</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="card-icon applicants">
            <mat-icon>person_add</mat-icon>
          </div>
          <div class="card-info">
            <h3>طلبات التقديم والقبول</h3>
            <p class="stat-value">{{ data().applicants.total }}</p>
            <span class="pending-badge">{{ data().applicants.pending }} قيد الدراسة والفرز</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="card-icon branches">
            <mat-icon>business</mat-icon>
          </div>
          <div class="card-info">
            <h3>الفروع والمجمعات النشطة</h3>
            <p class="stat-value">{{ data().branches.total }}</p>
            <span class="sub-text">المنطقة الوسطى والشرقية</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="card-icon notifications">
            <mat-icon>notifications_active</mat-icon>
          </div>
          <div class="card-info">
            <h3>التنبيهات والإشعارات</h3>
            <p class="stat-value">{{ data().notifications.unread }}</p>
            <span class="danger-badge">قيد المعالجة والإرسال</span>
          </div>
        </div>
      </div>

      <!-- Quick Actions and Latest Activities -->
      <div class="dashboard-grid">
        <!-- Quick Actions Panel -->
        <mat-card class="grid-card">
          <mat-card-header>
            <mat-card-title>الإجراءات السريعة والمباشرة</mat-card-title>
          </mat-card-header>
          <mat-card-content class="quick-actions-container">
            <button mat-flat-button color="primary" routerLink="/students/create">
              <mat-icon>person_add</mat-icon>
              <span>تسجيل طالب جديد</span>
            </button>
            <button mat-flat-button color="accent" routerLink="/admissions/applicants">
              <mat-icon>how_to_reg</mat-icon>
              <span>إدارة طلبات القبول</span>
            </button>
            <button mat-flat-button class="btn-warn" routerLink="/platform/settings">
              <mat-icon>settings</mat-icon>
              <span>إعدادات النظام</span>
            </button>
            <button mat-flat-button class="btn-info" routerLink="/platform/logs">
              <mat-icon>security</mat-icon>
              <span>سجلات التدقيق الأمني</span>
            </button>
          </mat-card-content>
        </mat-card>

        <!-- Latest Activities Timeline -->
        <mat-card class="grid-card">
          <mat-card-header>
            <mat-card-title>آخر الحركات والنشاطات الأمنية</mat-card-title>
          </mat-card-header>
          <mat-card-content class="timeline-container">
            <div class="timeline-item" *ngFor="let act of data()?.latestActivities">
              <mat-icon class="timeline-icon">history</mat-icon>
              <div class="timeline-details">
                <strong>{{ act.action }}</strong>
                <p>الكيان: {{ act.entity_name }} | {{ act.created_at | date:'medium' }}</p>
              </div>
            </div>
            <div class="no-data" *ngIf="!data()?.latestActivities?.length">
              <p>لا يوجد نشاطات مسجلة في الـ 24 ساعة الماضية.</p>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-shell {
      padding: 1.5rem;
      font-family: 'Cairo', sans-serif;
      background-color: #0f172a;
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
      background: linear-gradient(to left, #6366f1, #a855f7);
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
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
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
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .card-icon {
      width: 54px;
      height: 54px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card-icon.students { background: rgba(99, 102, 241, 0.15); color: #818cf8; }
    .card-icon.applicants { background: rgba(234, 179, 8, 0.15); color: #facc15; }
    .card-icon.branches { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .card-icon.notifications { background: rgba(239, 68, 68, 0.15); color: #f87171; }
    
    .card-info h3 {
      font-size: 0.8rem;
      color: #94a3b8;
      margin: 0;
    }
    .stat-value {
      font-size: 1.85rem;
      font-weight: 800;
      margin: 4px 0;
    }
    .active-badge { font-size: 0.7rem; color: #34d399; }
    .pending-badge { font-size: 0.7rem; color: #facc15; }
    .danger-badge { font-size: 0.7rem; color: #f87171; }
    .sub-text { font-size: 0.7rem; color: #94a3b8; }

    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      gap: 2rem;
    }
    .grid-card {
      background: #1e293b !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      border-radius: 16px !important;
      color: #f8fafc !important;
      padding: 1.5rem;
    }
    .quick-actions-container {
      margin-top: 1.5rem;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .quick-actions-container button {
      padding: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-weight: bold;
    }
    .btn-warn { background-color: #f97316 !important; color: white !important; }
    .btn-info { background-color: #06b6d4 !important; color: white !important; }

    .timeline-container {
      margin-top: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .timeline-item {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 10px;
    }
    .timeline-icon {
      color: #6366f1;
    }
    .timeline-details strong {
      font-size: 0.9rem;
    }
    .timeline-details p {
      font-size: 0.75rem;
      color: #94a3b8;
      margin: 2px 0 0;
    }

    @media (max-width: 768px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  tenantService = inject(TenantService);
  platformService = inject(PlatformService);

  data = this.platformService.erpDashboardData;

  ngOnInit() {
    this.platformService.getERPDashboard().subscribe();
  }
}