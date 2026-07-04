import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LibraryService } from './library.service';

@Component({
  selector: 'app-library-dashboard',
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
          <h1>منصة إدارة المكتبات ومصادر التعلم</h1>
          <p>لوحة التحكم الفورية بفهرس الكتب والمصنفات، الاستعارات النشطة، الغرامات المحتسبة، والكتب الرقمية</p>
        </div>
        <button mat-flat-button color="primary" (click)="loadDashboard()">
          <mat-icon>refresh</mat-icon تحديث البيانات
        </button>
      </div>

      <!-- Loading State -->
      <div class="spinner-container" *ngIf="libraryService.loading()">
        <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
      </div>

      <!-- Stats Cards Grid -->
      <div class="stats-grid" *ngIf="libraryService.stats() as stats">
        <!-- Total Titles -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper blue">
              <mat-icon>book</mat-icon>
            </div>
            <mat-card-title>إجمالي العناوين</mat-card-title>
            <mat-card-subtitle>الكتب والمصنفات المسجلة</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value">
            {{ stats.total_books }} عنوان
          </mat-card-content>
        </mat-card>

        <!-- Borrowed Books -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper orange">
              <mat-icon>bookmark_added</mat-icon>
            </div>
            <mat-card-title>الكتب المستعارة حالياً</mat-card-title>
            <mat-card-subtitle>نسخ قيد المطالعة الخارجية</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value alert-orange">
            {{ stats.borrowed_copies }} نسخة
          </mat-card-content>
        </mat-card>

        <!-- Digital Resources -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper green">
              <mat-icon>cloud_download</mat-icon>
            </div>
            <mat-card-title>المصادر والمراجع الرقمية</mat-card-title>
            <mat-card-subtitle>كتب رقمية ومقاطع مرئية</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value text-green">
            {{ stats.digital_resources }} مرجع رقمي
          </mat-card-content>
        </mat-card>

        <!-- Fines -->
        <mat-card class="stat-card">
          <mat-card-header>
            <div class="icon-wrapper red">
              <mat-icon>gavel</mat-icon>
            </div>
            <mat-card-title>الغرامات غير المدفوعة</mat-card-title>
            <mat-card-subtitle>غرامات التأخير المستحقة</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="stat-value alert-red">
            {{ stats.unpaid_fines | currency:'SAR ':'symbol':'1.2-2' }}
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Main Section: Books List -->
      <div class="register-section">
        <div class="table-container">
          <h2>فهرس الكتب والمؤلفات العامة</h2>
          <mat-card class="table-card">
            <table mat-table [dataSource]="books" class="w-full">
              <ng-container matColumnDef="title">
                <th mat-header-cell *matHeaderCellDef>عنوان الكتاب بالعربي</th>
                <td mat-cell *matCellDef="let row" class="bold">{{ row.title_ar }}</td>
              </ng-container>

              <ng-container matColumnDef="title_en">
                <th mat-header-cell *matHeaderCellDef>العنوان بالإنجليزي</th>
                <td mat-cell *matCellDef="let row">{{ row.title_en }}</td>
              </ng-container>

              <ng-container matColumnDef="category">
                <th mat-header-cell *matHeaderCellDef>رقم التصنيف</th>
                <td mat-cell *matCellDef="let row" class="bold text-purple">000 - عامة</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr mat-row *matRowDef="let row; columns: columns;"></tr>
            </table>
          </mat-card>
        </div>
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
    .icon-wrapper {
      padding: 0.75rem;
      border-radius: 8px;
      margin-bottom: 0.5rem;
    }
    .icon-wrapper.blue { background: #eff6ff; color: #3b82f6; }
    .icon-wrapper.orange { background: #fff7ed; color: #f97316; }
    .icon-wrapper.green { background: #f0fdf4; color: #22c55e; }
    .icon-wrapper.red { background: #fef2f2; color: #ef4444; }
    .stat-value {
      font-size: 1.8rem;
      font-weight: 800;
      color: #1e293b;
      margin-top: 1rem;
    }
    .alert-orange { color: #f97316; }
    .text-green { color: #16a34a; }
    .alert-red { color: #ef4444; }
    .text-purple { color: #8b5cf6; }
    .register-section {
      margin-top: 2rem;
    }
    .table-container h2 {
      font-size: 1.5rem;
      color: #0f172a;
      margin-bottom: 1rem;
    }
    .table-card {
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    .w-full { width: 100%; }
    .bold { font-weight: 600; color: #0f172a; }
    .spinner-container {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }
  `]
})
export class LibraryDashboardComponent implements OnInit {
  libraryService = inject(LibraryService);
  books: any[] = [];
  columns: string[] = ['title', 'title_en', 'category'];

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.libraryService.getDashboardStats().subscribe();
    this.libraryService.getBooks().subscribe(data => {
      this.books = data;
    });
  }
}
