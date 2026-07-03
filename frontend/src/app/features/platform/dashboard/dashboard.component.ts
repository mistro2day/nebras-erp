import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PlatformService } from '../platform.service';

@Component({
  selector: 'app-platform-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="platform-dashboard" dir="rtl">
      <!-- Header -->
      <header class="dashboard-header animate-fade-in">
        <div class="header-info">
          <h1>لوحة تحكم وإدارة النظام المركزي</h1>
          <p>مراقبة مؤشرات صحة النظام، الكاش، طوابير المهام الخلفية، وأداء البنية التحتية</p>
        </div>
      </header>

      <!-- Health Indicators -->
      <div class="health-grid animate-slide-up" *ngIf="health()">
        <div class="health-card" [ngClass]="health().status">
          <div class="card-icon">
            <mat-icon *ngIf="health().status === 'healthy'">check_circle</mat-icon>
            <mat-icon *ngIf="health().status !== 'healthy'">error</mat-icon>
          </div>
          <div class="card-details">
            <h3>الحالة العامة للمنصة</h3>
            <div class="status-text">{{ health().status === 'healthy' ? 'مستقرة ونشطة' : 'تحتاج لصيانة' }}</div>
          </div>
        </div>

        <div class="health-card" [ngClass]="health().services.database === 'up' ? 'healthy' : 'unhealthy'">
          <div class="card-icon">
            <mat-icon>storage</mat-icon>
          </div>
          <div class="card-details">
            <h3>قاعدة البيانات (PostgreSQL)</h3>
            <div class="status-text">{{ health().services.database === 'up' ? 'نشطة ومتصلة' : 'غير متصلة' }}</div>
          </div>
        </div>

        <div class="health-card" [ngClass]="health().services.cache === 'up' ? 'healthy' : 'unhealthy'">
          <div class="card-icon">
            <mat-icon>bolt</mat-icon>
          </div>
          <div class="card-details">
            <h3>الذاكرة المؤقتة (Redis Cache)</h3>
            <div class="status-text">{{ health().services.cache === 'up' ? 'نشطة ومتصلة' : 'غير متصلة' }}</div>
          </div>
        </div>

        <div class="health-card" [ngClass]="health().services.storage === 'up' ? 'healthy' : 'unhealthy'">
          <div class="card-icon">
            <mat-icon>cloud_queue</mat-icon>
          </div>
          <div class="card-details">
            <h3>مخزن الملفات (File Storage)</h3>
            <div class="status-text">{{ health().services.storage === 'up' ? 'نشط ومستقر' : 'غير متصل' }}</div>
          </div>
        </div>
      </div>

      <!-- Celery Jobs & Metrics Section -->
      <div class="dashboard-grid animate-slide-up">
        <!-- Celery Background Workers -->
        <mat-card class="grid-card">
          <mat-card-header>
            <mat-card-title>مراقبة المهام الخلفية (Celery Workers)</mat-card-title>
          </mat-card-header>
          <mat-card-content class="jobs-list">
            <div class="job-item" *ngFor="let job of jobs()">
              <div class="job-header">
                <strong>{{ job.job_name }}</strong>
                <span class="badge" [ngClass]="job.status">{{ job.status }}</span>
              </div>
              <div class="job-body">
                <span class="job-id">ID: {{ job.job_id }}</span>
                <span class="job-priority">أولوية: {{ job.priority }}</span>
              </div>
            </div>
            <div class="no-data" *ngIf="jobs().length === 0">
              <p>لا يوجد مهام خلفية قيد التشغيل حالياً.</p>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- System Performance Metrics -->
        <mat-card class="grid-card">
          <mat-card-header>
            <mat-card-title>مؤشرات الأداء للنظام (Performance Metrics)</mat-card-title>
          </mat-card-header>
          <mat-card-content class="metrics-container" *ngIf="health() && health().metrics">
            <div class="metric-item">
              <span class="label">زمن استجابة الـ API المتوسط</span>
              <span class="val">{{ health().metrics.api_response_time }}</span>
            </div>
            <div class="metric-item">
              <span class="label">معدل استهلاك الذاكرة (RAM)</span>
              <span class="val">{{ health().metrics.memory_usage }}</span>
            </div>
            <div class="metric-item">
              <span class="label">معدل استهلاك المعالج (CPU)</span>
              <span class="val">{{ health().metrics.cpu_usage }}</span>
            </div>
            <div class="metric-item">
              <span class="label">حجم قاعدة البيانات الكلي</span>
              <span class="val">{{ health().metrics.database_size }}</span>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

    </div>
  `,
  styles: [`
    .platform-dashboard {
      padding: 2rem;
      background: linear-gradient(135deg, #0b0f19 0%, #151829 100%);
      color: #f8fafc;
      min-height: 100vh;
      font-family: 'Cairo', 'Outfit', sans-serif;
    }

    .dashboard-header {
      margin-bottom: 2rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 1.5rem;
    }

    .dashboard-header h1 {
      font-size: 2.25rem;
      font-weight: 800;
      background: linear-gradient(to left, #6366f1, #a855f7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
    }

    .dashboard-header p {
      color: #94a3b8;
      margin: 0.5rem 0 0 0;
    }

    .health-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2.5rem;
    }

    .health-card {
      background: rgba(30, 41, 59, 0.4);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1.25rem;
      transition: transform 0.3s ease, border-color 0.3s ease;
    }

    .health-card.healthy {
      border-color: rgba(16, 185, 129, 0.3);
      background: rgba(16, 185, 129, 0.05);
    }
    .health-card.healthy .card-icon {
      color: #10b981;
      background: rgba(16, 185, 129, 0.1);
    }

    .health-card.unhealthy {
      border-color: rgba(239, 68, 68, 0.3);
      background: rgba(239, 68, 68, 0.05);
    }
    .health-card.unhealthy .card-icon {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }

    .card-icon {
      width: 50px;
      height: 50px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6366f1;
      background: rgba(99, 102, 241, 0.1);
    }

    .card-icon mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .card-details h3 {
      font-size: 0.85rem;
      color: #94a3b8;
      margin: 0;
    }

    .status-text {
      font-size: 1.15rem;
      font-weight: 700;
      margin-top: 0.25rem;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }

    .grid-card {
      background: rgba(30, 41, 59, 0.3) !important;
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.05) !important;
      border-radius: 16px !important;
      color: #f8fafc !important;
      padding: 1.5rem;
    }

    .jobs-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .job-item {
      background: rgba(15, 23, 42, 0.4);
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.03);
    }

    .job-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .badge {
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: capitalize;
    }
    .badge.completed { background: rgba(16, 185, 129, 0.15); color: #10b981; }
    .badge.running { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
    .badge.failed { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

    .job-body {
      margin-top: 0.5rem;
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .metrics-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      margin-top: 1.5rem;
    }

    .metric-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(15, 23, 42, 0.3);
      padding: 1rem 1.5rem;
      border-radius: 8px;
    }

    .metric-item .label {
      color: #cbd5e1;
    }

    .metric-item .val {
      font-size: 1.25rem;
      font-weight: 700;
      color: #6366f1;
    }

    .no-data {
      text-align: center;
      padding: 2rem;
      color: #94a3b8;
    }

    /* Animations */
    .animate-fade-in { animation: fadeIn 0.8s ease-out; }
    .animate-slide-up { animation: slideUp 0.8s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    @media (max-width: 768px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PlatformDashboardComponent implements OnInit {
  private platformService = inject(PlatformService);

  health = this.platformService.healthStatus;
  jobs = this.platformService.jobs;

  ngOnInit() {
    this.platformService.getHealth().subscribe();
    this.platformService.getJobs().subscribe();
  }
}