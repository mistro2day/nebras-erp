import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { StudentsService } from '../students.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-students-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="dashboard-container" dir="rtl">
      <!-- Header -->
      <header class="dashboard-header animate-fade-in">
        <div class="header-info">
          <h1>لوحة تحكم شؤون الطلاب</h1>
          <p>إحصائيات دورة حياة الطلاب والتسجيل الأكاديمي والخط الزمني العام</p>
        </div>
        <div class="header-actions">
          <button mat-flat-button color="primary" (click)="navigateToList()">
            <mat-icon>list</mat-icon> عرض قائمة الطلاب
          </button>
        </div>
      </header>

      <!-- Grid Cards -->
      <div class="stats-grid animate-slide-up" *ngIf="widgets()">
        <div class="stat-card total-card">
          <div class="stat-icon">
            <mat-icon>people</mat-icon>
          </div>
          <div class="stat-details">
            <h3>إجمالي الطلاب</h3>
            <div class="stat-val">{{ widgets().totalStudents }}</div>
          </div>
        </div>

        <div class="stat-card active-card">
          <div class="stat-icon">
            <mat-icon>check_circle</mat-icon>
          </div>
          <div class="stat-details">
            <h3>الطلاب النشطين</h3>
            <div class="stat-val">{{ widgets().activeStudents }}</div>
          </div>
        </div>

        <div class="stat-card suspended-card">
          <div class="stat-icon">
            <mat-icon>pause_circle</mat-icon>
          </div>
          <div class="stat-details">
            <h3>الموقوفين</h3>
            <div class="stat-val">{{ widgets().suspendedStudents }}</div>
          </div>
        </div>

        <div class="stat-card graduated-card">
          <div class="stat-icon">
            <mat-icon>school</mat-icon>
          </div>
          <div class="stat-details">
            <h3>الخريجين</h3>
            <div class="stat-val">{{ widgets().graduatedStudents }}</div>
          </div>
        </div>
      </div>

      <!-- Quick Analysis Grid -->
      <div class="analysis-grid animate-slide-up" *ngIf="widgets()">
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title>التوزيع بحسب الجنس</mat-card-title>
          </mat-card-header>
          <mat-card-content class="gender-container">
            <div class="gender-bar male" [style.width.%]="getGenderPct('male')">
              <span>ذكور: {{ widgets().genderDistribution.male }} ({{ getGenderPct('male') | number:'1.0-1' }}%)</span>
            </div>
            <div class="gender-bar female" [style.width.%]="getGenderPct('female')">
              <span>إناث: {{ widgets().genderDistribution.female }} ({{ getGenderPct('female') | number:'1.0-1' }}%)</span>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="action-card">
          <mat-card-header>
            <mat-card-title>إجراءات سريعة</mat-card-title>
          </mat-card-header>
          <mat-card-content class="actions-list">
            <button mat-stroked-button (click)="navigateToCreate()">
              <mat-icon>person_add</mat-icon> تسجيل طالب جديد (من Admissions)
            </button>
            <button mat-stroked-button (click)="navigateToList()">
              <mat-icon>settings</mat-icon> ترفيع وترقية جماعية
            </button>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 2rem;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      color: #f8fafc;
      min-height: 100vh;
      font-family: 'Outfit', 'Cairo', sans-serif;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 1.5rem;
    }

    .dashboard-header h1 {
      font-size: 2.25rem;
      font-weight: 800;
      background: linear-gradient(to left, #818cf8, #c084fc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
    }

    .dashboard-header p {
      color: #94a3b8;
      margin: 0.5rem 0 0 0;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1.25rem;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .stat-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
      border-color: rgba(129, 140, 248, 0.3);
    }

    .stat-icon {
      width: 50px;
      height: 50px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(129, 140, 248, 0.15);
      color: #818cf8;
    }

    .stat-icon mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .stat-details h3 {
      font-size: 0.875rem;
      color: #94a3b8;
      margin: 0;
    }

    .stat-val {
      font-size: 1.75rem;
      font-weight: 700;
      color: #f8fafc;
      margin-top: 0.25rem;
    }

    .analysis-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1.5rem;
    }

    mat-card {
      background: rgba(30, 41, 59, 0.5) !important;
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      border-radius: 16px !important;
      color: #f8fafc !important;
      padding: 1.5rem;
    }

    .gender-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .gender-bar {
      height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      padding: 0 1rem;
      font-weight: 600;
      color: white;
      transition: width 1s ease-in-out;
    }

    .gender-bar.male {
      background: linear-gradient(90deg, #2563eb, #3b82f6);
    }

    .gender-bar.female {
      background: linear-gradient(90deg, #db2777, #ec4899);
    }

    .actions-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .actions-list button {
      color: #f8fafc !important;
      border-color: rgba(255, 255, 255, 0.15) !important;
      padding: 0.75rem !important;
      text-align: right;
    }

    .actions-list button mat-icon {
      margin-left: 8px;
    }

    /* Micro-animations */
    .animate-fade-in {
      animation: fadeIn 0.8s ease-out;
    }

    .animate-slide-up {
      animation: slideUp 0.8s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    @media (max-width: 768px) {
      .analysis-grid {
        grid-template-columns: 1fr;
      }
      .dashboard-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
    }
  `]
})
export class StudentsDashboardComponent implements OnInit {
  private studentsService = inject(StudentsService);
  private router = inject(Router);

  widgets = this.studentsService.dashboardWidgets;

  ngOnInit() {
    this.studentsService.getDashboardWidgets().subscribe();
  }

  getGenderPct(gender: 'male' | 'female'): number {
    const w = this.widgets();
    if (!w || w.totalStudents === 0) return 0;
    return (w.genderDistribution[gender] / w.totalStudents) * 100;
  }

  navigateToList() {
    this.router.navigate(['/features/students/list']);
  }

  navigateToCreate() {
    this.router.navigate(['/features/students/create']);
  }
}