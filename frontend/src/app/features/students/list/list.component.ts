import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { StudentsService, Student } from '../students.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-students-list',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, FormsModule
  ],
  template: `
    <div class="list-container" dir="rtl">
      <header class="list-header animate-fade-in">
        <div class="header-info">
          <h1>قائمة الطلاب</h1>
          <p>عرض تفصيلي وسجل البحث المتقدم والفرز والتوزيع الأكاديمي للطلاب</p>
        </div>
        <div class="header-actions">
          <button mat-flat-button color="primary" (click)="navigateToCreate()">
            <mat-icon>person_add</mat-icon> إضافة طالب جديد
          </button>
        </div>
      </header>

      <!-- Advanced Filtering & Search -->
      <div class="filter-card animate-slide-up">
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input type="text" [(ngModel)]="searchQuery" (input)="onFilterChange()" placeholder="البحث برقم الطالب، الاسم، رقم الهوية أو الهاتف...">
        </div>
        
        <div class="select-filters">
          <mat-form-field appearance="outline">
            <mat-label>حالة الطالب</mat-label>
            <mat-select [(ngModel)]="statusFilter" (selectionChange)="onFilterChange()">
              <mat-option value="">الكل</mat-option>
              <mat-option value="registered">مسجل</mat-option>
              <mat-option value="active">نشط</mat-option>
              <mat-option value="suspended">موقوف</mat-option>
              <mat-option value="graduated">متخرج</mat-option>
              <mat-option value="withdrawn">منسحب</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      <!-- Table View -->
      <div class="table-card animate-slide-up">
        <table mat-table [dataSource]="students()" class="mat-elevation-z8">
          
          <ng-container matColumnDef="student_number">
            <th mat-header-cell *matHeaderCellDef> الرقم الأكاديمي </th>
            <td mat-cell *matCellDef="let element"> {{element.student_number}} </td>
          </ng-container>

          <ng-container matColumnDef="arabic_name">
            <th mat-header-cell *matHeaderCellDef> الاسم العربي </th>
            <td mat-cell *matCellDef="let element"> {{element.profile?.arabic_name}} </td>
          </ng-container>

          <ng-container matColumnDef="gender">
            <th mat-header-cell *matHeaderCellDef> الجنس </th>
            <td mat-cell *matCellDef="let element"> {{element.profile?.gender === 'male' ? 'ذكر' : 'أنثى'}} </td>
          </ng-container>

          <ng-container matColumnDef="nationality">
            <th mat-header-cell *matHeaderCellDef> الجنسية </th>
            <td mat-cell *matCellDef="let element"> {{element.profile?.nationality}} </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef> الحالة </th>
            <td mat-cell *matCellDef="let element">
              <span class="badge" [ngClass]="element.status">{{element.status}}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef> إجراءات </th>
            <td mat-cell *matCellDef="let element">
              <button mat-icon-button color="accent" (click)="viewDetails(element.id)">
                <mat-icon>visibility</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <div class="no-data" *ngIf="students().length === 0">
          <p>لا يوجد طلاب يطابقون خيارات البحث.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .list-container {
      padding: 2rem;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      color: #f8fafc;
      min-height: 100vh;
      font-family: 'Outfit', 'Cairo', sans-serif;
    }

    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 1.5rem;
    }

    .list-header h1 {
      font-size: 2.25rem;
      font-weight: 800;
      background: linear-gradient(to left, #818cf8, #c084fc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
    }

    .list-header p {
      color: #94a3b8;
      margin: 0.5rem 0 0 0;
    }

    .filter-card {
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 1.25rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .search-box {
      flex: 1;
      display: flex;
      align-items: center;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 0.75rem 1rem;
      color: white;
    }

    .search-box input {
      background: transparent;
      border: none;
      color: white;
      width: 100%;
      outline: none;
      margin-right: 8px;
      font-size: 1rem;
    }

    .search-box mat-icon {
      color: #94a3b8;
    }

    .select-filters {
      display: flex;
      gap: 1rem;
    }

    ::ng-deep .mat-mdc-form-field-parent {
      background: rgba(30, 41, 59, 0.5) !important;
      border-radius: 12px;
    }

    .table-card {
      background: rgba(30, 41, 59, 0.5);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 1rem;
      overflow-x: auto;
    }

    table {
      width: 100%;
      background: transparent !important;
      color: #f8fafc !important;
    }

    th {
      color: #94a3b8 !important;
      font-weight: 700 !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
    }

    td {
      color: #e2e8f0 !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
    }

    tr:hover td {
      background-color: rgba(255, 255, 255, 0.03) !important;
    }

    .badge {
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: capitalize;
    }

    .badge.active { background: rgba(16, 185, 129, 0.15); color: #10b981; }
    .badge.registered { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
    .badge.suspended { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
    .badge.graduated { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }

    .no-data {
      text-align: center;
      padding: 3rem;
      color: #94a3b8;
    }

    /* Micro-animations */
    .animate-fade-in { animation: fadeIn 0.8s ease-out; }
    .animate-slide-up { animation: slideUp 0.8s ease-out; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `]
})
export class StudentsListComponent implements OnInit {
  private studentsService = inject(StudentsService);
  private router = inject(Router);

  students = this.studentsService.students;
  displayedColumns: string[] = ['student_number', 'arabic_name', 'gender', 'nationality', 'status', 'actions'];

  searchQuery = '';
  statusFilter = '';

  ngOnInit() {
    this.loadStudents();
  }

  loadStudents() {
    const params: any = {};
    if (this.searchQuery) params.search = this.searchQuery;
    if (this.statusFilter) params.status = this.statusFilter;

    this.studentsService.getStudents(params).subscribe();
  }

  onFilterChange() {
    this.loadStudents();
  }

  viewDetails(id: string) {
    this.router.navigate([`/features/students/details/${id}`]);
  }

  navigateToCreate() {
    this.router.navigate(['/features/students/create']);
  }
}