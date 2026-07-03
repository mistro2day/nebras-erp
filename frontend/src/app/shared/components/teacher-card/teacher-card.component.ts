import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface TeacherInfo {
  id: string;
  employee_number: string;
  teacher_code: string;
  full_name_ar: string;
  current_position: string;
  department: string;
  status: string;
  photo_url?: string;
}

@Component({
  selector: 'app-teacher-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <mat-card class="teacher-card" dir="rtl">
      <div class="card-header">
        <div class="avatar-placeholder" [style.background]="getAvatarBg(teacher().full_name_ar)">
          <span>{{ teacher().full_name_ar.charAt(0) }}</span>
        </div>
        <div class="header-meta">
          <h3>{{ teacher().full_name_ar }}</h3>
          <span class="position">{{ teacher().current_position }}</span>
        </div>
        <span class="status-badge" [ngClass]="teacher().status">{{ getStatusText(teacher().status) }}</span>
      </div>

      <mat-card-content class="card-details">
        <div class="detail-row">
          <mat-icon>badge</mat-icon>
          <span>الرقم الوظيفي: {{ teacher().employee_number }}</span>
        </div>
        <div class="detail-row">
          <mat-icon>account_box</mat-icon>
          <span>كود المعلم: {{ teacher().teacher_code }}</span>
        </div>
        <div class="detail-row">
          <mat-icon>domain</mat-icon>
          <span>القسم: {{ teacher().department }}</span>
        </div>
      </mat-card-content>

      <mat-card-actions class="card-footer">
        <button mat-flat-button color="primary">عرض الملف الكامل</button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .teacher-card {
      background: #1e293b !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      border-radius: 16px !important;
      color: #f8fafc !important;
      padding: 1.25rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      font-family: 'Cairo', sans-serif;
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 1.25rem;
      position: relative;
    }
    .avatar-placeholder {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: white;
      font-size: 1.2rem;
    }
    .header-meta h3 {
      font-size: 0.95rem;
      font-weight: 700;
      margin: 0;
    }
    .header-meta .position {
      font-size: 0.75rem;
      color: #94a3b8;
    }
    .status-badge {
      position: absolute;
      left: 0;
      top: 0;
      font-size: 0.65rem;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: bold;
    }
    .status-badge.approved, .status-badge.active { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .status-badge.pending_review { background: rgba(234, 179, 8, 0.2); color: #facc15; }
    
    .card-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 1.25rem;
    }
    .detail-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8rem;
      color: #cbd5e1;
    }
    .detail-row mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #6366f1;
    }
    .card-footer {
      display: flex;
      justify-content: flex-end;
      padding: 0;
    }
    .card-footer button {
      width: 100%;
    }
  `]
})
export class TeacherCardComponent {
  teacher = input.required<TeacherInfo>();

  getAvatarBg(name: string): string {
    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    return colors[hash % colors.length];
  }

  getStatusText(status: string): string {
    const states: Record<string, string> = {
      approved: 'نشط',
      active: 'نشط',
      pending_review: 'قيد المراجعة',
      draft: 'مسودة',
      suspended: 'موقوف'
    };
    return states[status] || status;
  }
}