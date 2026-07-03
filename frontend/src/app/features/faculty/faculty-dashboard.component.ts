import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TeacherCardComponent, TeacherInfo } from '../../shared/components/teacher-card/teacher-card.component';
import { TenantService } from '../../core/services/tenant.service';

@Component({
  selector: 'app-faculty-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, TeacherCardComponent],
  template: `
    <div class="faculty-dashboard" dir="rtl">
      <!-- Header -->
      <header class="dashboard-header">
        <div class="header-info">
          <h1>إدارة شؤون المعلمين وأعضاء هيئة التدريس</h1>
          <p>بوابة إدارة وتعيين المعلمين وأعضاء الهيئة الأكاديمية لـ {{ ($any(tenantService).currentTenant())?.nameAr || 'نبراس ERP' }}</p>
        </div>
      </header>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <mat-icon class="icon active">badge</mat-icon>
          <div class="meta">
            <h3>إجمالي الكادر الأكاديمي</h3>
            <p class="value">{{ teachers().length }}</p>
          </div>
        </div>
        <div class="stat-card">
          <mat-icon class="icon pending">pending_actions</mat-icon>
          <div class="meta">
            <h3>طلبات قيد المراجعة</h3>
            <p class="value">{{ getPendingCount() }}</p>
          </div>
        </div>
      </div>

      <!-- Teachers List -->
      <div class="section-title">
        <h2>أعضاء هيئة التدريس النشطين</h2>
      </div>

      <div class="teachers-grid">
        <app-teacher-card *ngFor="let teacher of teachers()" [teacher]="teacher"></app-teacher-card>
        <div class="no-data" *ngIf="teachers().length === 0">
          <mat-icon>people_outline</mat-icon>
          <p>لا يوجد كادر أكاديمي مسجل حالياً في هذا الفرع.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .faculty-dashboard {
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
    .stat-card .icon.active { background: rgba(99, 102, 241, 0.15); color: #818cf8; }
    .stat-card .icon.pending { background: rgba(234, 179, 8, 0.15); color: #facc15; }
    .stat-card h3 { font-size: 0.8rem; color: #94a3b8; margin: 0; }
    .stat-card .value { font-size: 1.85rem; font-weight: bold; margin: 4px 0 0 0; }

    .section-title h2 {
      font-size: 1.25rem;
      font-weight: bold;
      margin-bottom: 1.5rem;
      color: #cbd5e1;
    }
    .teachers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
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
export class FacultyDashboardComponent implements OnInit {
  tenantService = inject(TenantService);
  http = inject(HttpClient);

  teachers = signal<TeacherInfo[]>([]);

  ngOnInit() {
    this.loadTeachers();
  }

  loadTeachers() {
    this.http.get<any>('/api/v1/faculty/members/').subscribe({
      next: (res) => {
        if (res && res.success) {
          this.teachers.set(res.data);
        }
      }
    });
  }

  getPendingCount(): number {
    return this.teachers().filter(t => t.status === 'pending_review' || t.status === 'draft').length;
  }
}