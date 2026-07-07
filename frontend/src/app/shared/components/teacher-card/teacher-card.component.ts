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
        <span [class]="statusBadge(teacher().status)">{{ getStatusText(teacher().status) }}</span>
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
        <button class="nb-btn-secondary" style="width:100%">عرض الملف الكامل</button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .teacher-card {
      background: var(--nb-surface) !important;
      border: 1px solid var(--nb-border) !important;
      border-radius: var(--nb-radius-card) !important;
      color: var(--nb-text) !important;
      padding: 16px;
      box-shadow: var(--nb-shadow-card);
      font-family: var(--nb-font-family);
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      position: relative;
    }
    .avatar-placeholder {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: white;
      font-size: 18px;
      flex-shrink: 0;
    }
    .header-meta h3 {
      font-size: 14px;
      font-weight: 700;
      margin: 0;
      color: var(--nb-text);
    }
    .header-meta .position {
      font-size: 12px;
      color: var(--nb-text-muted);
    }
    .card-header > span:last-child {
      position: absolute;
      left: 0;
      top: 0;
    }
    .card-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }
    .detail-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--nb-text-secondary);
    }
    .detail-row mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--nb-primary-600);
    }
    .card-footer {
      display: flex;
      justify-content: flex-end;
      padding: 0;
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

  statusBadge(status: string): string {
    const map: Record<string, string> = {
      approved: 'nb-badge-success',
      active: 'nb-badge-success',
      pending_review: 'nb-badge-warning',
      draft: 'nb-badge-neutral',
      suspended: 'nb-badge-danger',
    };
    return map[status] || 'nb-badge-neutral';
  }
}