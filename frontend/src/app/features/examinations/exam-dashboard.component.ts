import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ExaminationsService } from './examinations.service';

@Component({
  selector: 'app-exam-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatIconModule, MatButtonModule,
    MatTableModule, MatTabsModule, MatFormFieldModule, MatInputModule, MatDialogModule
  ],
  template: `
    <div class="exam-dashboard" dir="rtl">
      <!-- Header -->
      <header class="dashboard-header">
        <div class="header-info">
          <h1>إدارة الامتحانات والتقييم الأكاديمي</h1>
          <p>بوابة إدارة الامتحانات المدرسية، بنك الأسئلة، كشوف رصد الدرجات، ومعالجة التظلمات</p>
        </div>
      </header>

      <!-- Stats Grid / KPI Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <mat-icon class="icon exams">assignment</mat-icon>
          <div class="meta">
            <h3>الامتحانات المجدولة</h3>
            <p class="value">{{ exams().length }}</p>
          </div>
        </div>
        <div class="stat-card">
          <mat-icon class="icon sessions">schedule</mat-icon>
          <div class="meta">
            <h3>الدورات النشطة</h3>
            <p class="value">{{ sessions().length }}</p>
          </div>
        </div>
        <div class="stat-card">
          <mat-icon class="icon rooms">room</mat-icon>
          <div class="meta">
            <h3>قاعات اللجان</h3>
            <p class="value">{{ rooms().length }}</p>
          </div>
        </div>
        <div class="stat-card">
          <mat-icon class="icon appeals">gavel</mat-icon>
          <div class="meta">
            <h3>تظلمات معلقة</h3>
            <p class="value">{{ pendingAppealsCount() }}</p>
          </div>
        </div>
      </div>

      <!-- Main Tabs -->
      <mat-tab-group class="dashboard-tabs">
        <!-- Tab 1: Scheduled Exams -->
        <mat-tab label="جدول الامتحانات">
          <div class="tab-content">
            <table mat-table [dataSource]="exams()" class="mat-elevation-z8 exam-table">
              <ng-container matColumnDef="code">
                <th mat-header-cell *matHeaderCellDef>رمز الامتحان</th>
                <td mat-cell *matCellDef="let element">{{ element.code }}</td>
              </ng-container>

              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>الامتحان</th>
                <td mat-cell *matCellDef="let element"><strong>{{ element.name }}</strong></td>
              </ng-container>

              <ng-container matColumnDef="year">
                <th mat-header-cell *matHeaderCellDef>العام الدراسي / الفصل</th>
                <td mat-cell *matCellDef="let element">{{ element.academic_year }} - {{ element.term }}</td>
              </ng-container>

              <ng-container matColumnDef="marks">
                <th mat-header-cell *matHeaderCellDef>الدرجة الكبرى / النجاح</th>
                <td mat-cell *matCellDef="let element">{{ element.max_marks }} / {{ element.pass_marks }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>الحالة</th>
                <td mat-cell *matCellDef="let element">
                  <span class="status-badge" [ngClass]="element.status">
                    {{ getStatusLabel(element.status) }}
                  </span>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>
        </mat-tab>

        <!-- Tab 2: Mark Entry Grid -->
        <mat-tab label="كشف رصد الدرجات">
          <div class="tab-content">
            <table mat-table [dataSource]="studentExams()" class="mat-elevation-z8 exam-table">
              <ng-container matColumnDef="student">
                <th mat-header-cell *matHeaderCellDef>رقم الطالب / المقعد</th>
                <td mat-cell *matCellDef="let element">{{ element.student_id | slice:0:8 }}... / {{ element.seat_number }}</td>
              </ng-container>

              <ng-container matColumnDef="room">
                <th mat-header-cell *matHeaderCellDef>اللجنة / القاعة</th>
                <td mat-cell *matCellDef="let element">{{ element.room_id | slice:0:8 }}...</td>
              </ng-container>

              <ng-container matColumnDef="marks">
                <th mat-header-cell *matHeaderCellDef>الدرجة المرصودة</th>
                <td mat-cell *matCellDef="let element">
                  <input type="number" [(ngModel)]="element.tempMark" class="mark-input" placeholder="رصد الدرجة" />
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>إجراءات</th>
                <td mat-cell *matCellDef="let element">
                  <button mat-flat-button color="primary" (click)="saveMark(element)">حفظ الدرجة</button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="markColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: markColumns;"></tr>
            </table>
          </div>
        </mat-tab>

        <!-- Tab 3: Appeals / Re-marking -->
        <mat-tab label="طلبات التظلم والاستئناف">
          <div class="tab-content">
            <table mat-table [dataSource]="appeals()" class="mat-elevation-z8 exam-table">
              <ng-container matColumnDef="student">
                <th mat-header-cell *matHeaderCellDef>اللجنة / الطالب</th>
                <td mat-cell *matCellDef="let element">{{ element.student_exam | slice:0:8 }}...</td>
              </ng-container>

              <ng-container matColumnDef="reason">
                <th mat-header-cell *matHeaderCellDef>سبب التظلم</th>
                <td mat-cell *matCellDef="let element">{{ element.reason }}</td>
              </ng-container>

              <ng-container matColumnDef="oldMark">
                <th mat-header-cell *matHeaderCellDef>الدرجة السابقة</th>
                <td mat-cell *matCellDef="let element">{{ element.old_marks }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>حالة الطلب</th>
                <td mat-cell *matCellDef="let element">
                  <span class="status-badge" [ngClass]="element.status">
                    {{ getAppealStatusLabel(element.status) }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>إجراءات</th>
                <td mat-cell *matCellDef="let element">
                  <div *ngIf="element.status === 'submitted'">
                    <button mat-flat-button color="accent" class="action-btn" (click)="resolveAppeal(element.id, 85.0)">تعديل لـ 85</button>
                    <button mat-stroked-button color="warn" class="action-btn" (click)="resolveAppeal(element.id, null)">رفض</button>
                  </div>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="appealColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: appealColumns;"></tr>
            </table>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .exam-dashboard {
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
      background: linear-gradient(to left, #ec4899, #8b5cf6);
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
    .stat-card .icon.exams { background: rgba(236, 72, 153, 0.15); color: #f472b6; }
    .stat-card .icon.sessions { background: rgba(139, 92, 246, 0.15); color: #a78bfa; }
    .stat-card .icon.rooms { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
    .stat-card .icon.appeals { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .stat-card h3 { font-size: 0.75rem; color: #94a3b8; margin: 0; }
    .stat-card .value { font-size: 1.6rem; font-weight: bold; margin: 2px 0 0 0; }

    .dashboard-tabs {
      background: #1e293b;
      border-radius: 16px;
      padding: 1rem;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .tab-content { padding: 1.5rem 0; }

    .exam-table {
      width: 100%;
      background: #1e293b;
      color: #f8fafc;
    }
    .mat-mdc-header-cell {
      color: #94a3b8 !important;
      font-weight: bold;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    }
    .mat-mdc-cell {
      border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
      color: #cbd5e1 !important;
    }

    .status-badge {
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: bold;
    }
    .status-badge.published, .status-badge.approved, .status-badge.resolved_changed {
      background: rgba(16, 185, 129, 0.15); color: #34d399;
    }
    .status-badge.draft, .status-badge.submitted {
      background: rgba(245, 158, 11, 0.15); color: #fbbf24;
    }
    .status-badge.locked, .status-badge.under_review {
      background: rgba(59, 130, 246, 0.15); color: #60a5fa;
    }

    .mark-input {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      color: white;
      padding: 6px 12px;
      width: 120px;
      outline: none;
    }
    .action-btn { margin-left: 8px; }
  `]
})
export class ExamDashboardComponent implements OnInit {
  examService = inject(ExaminationsService);

  exams = signal<any[]>([]);
  sessions = signal<any[]>([]);
  rooms = signal<any[]>([]);
  studentExams = signal<any[]>([]);
  appeals = signal<any[]>([]);
  pendingAppealsCount = signal(0);

  displayedColumns = ['code', 'name', 'year', 'marks', 'status'];
  markColumns = ['student', 'room', 'marks', 'actions'];
  appealColumns = ['student', 'reason', 'oldMark', 'status', 'actions'];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.examService.getExams().subscribe({
      next: (res) => { if (res && res.success) this.exams.set(res.data); }
    });

    this.examService.getSessions().subscribe({
      next: (res) => { if (res && res.success) this.sessions.set(res.data); }
    });

    this.examService.getRooms().subscribe({
      next: (res) => { if (res && res.success) this.rooms.set(res.data); }
    });

    this.examService.getStudentExams().subscribe({
      next: (res) => {
        if (res && res.success) {
          const list = res.data.map((se: any) => ({ ...se, tempMark: null }));
          this.studentExams.set(list);
        }
      }
    });

    this.examService.getAppeals().subscribe({
      next: (res) => {
        if (res && res.success) {
          this.appeals.set(res.data);
          const pending = res.data.filter((a: any) => a.status === 'submitted').length;
          this.pendingAppealsCount.set(pending);
        }
      }
    });
  }

  saveMark(element: any) {
    if (element.tempMark === null || element.tempMark === undefined) return;
    this.examService.enterStudentMark(element.id, element.tempMark, 'رصد درجة من لوحة التحكم الأكاديمية').subscribe({
      next: (res) => {
        if (res && res.success) {
          alert('تم حفظ ورصد درجة الطالب بنجاح بالمسار الأمني.');
        }
      }
    });
  }

  resolveAppeal(appealId: string, newMarks: number | null) {
    this.examService.resolveAppeal(appealId, newMarks).subscribe({
      next: (res) => {
        if (res && res.success) {
          alert('تم معالجة التظلم وتحديث حالة الطالب بنجاح.');
          this.loadData();
        }
      }
    });
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'published': return 'منشور';
      case 'draft': return 'مسودة';
      case 'approved': return 'معتمد';
      case 'locked': return 'مغلق ومحمي';
      default: return status;
    }
  }

  getAppealStatusLabel(status: string): string {
    switch (status) {
      case 'submitted': return 'مقدم حديثاً';
      case 'resolved_changed': return 'تم التعديل';
      case 'resolved_unchanged': return 'مرفوض/دون تغيير';
      default: return status;
    }
  }
}
