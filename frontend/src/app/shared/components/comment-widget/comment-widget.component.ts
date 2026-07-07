import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface CommentItem {
  id: string;
  body: string;
  created_at: string;
  is_resolved?: boolean;
}

@Component({
  selector: 'app-comment-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  template: `
    <div class="comment-widget" dir="rtl">
      <div class="widget-header">
        <h3>التعليقات والمناقشات ({{ items().length }})</h3>
      </div>

      <!-- Add Comment Form -->
      <div class="comment-form">
        <textarea placeholder="اكتب تعليقاً أو استفساراً..." [(ngModel)]="newCommentText" rows="2"></textarea>
        <button class="nb-btn-primary sm" (click)="submitComment()">إرسال التعليق</button>
      </div>

      <!-- Comments List -->
      <div class="comments-list">
        <div class="comment-card" *ngFor="let item of items()">
          <div class="card-header">
            <span class="user-avatar">م</span>
            <div class="user-meta">
              <strong>مستخدم نبراس</strong>
              <span class="date">{{ item.created_at | date:'short' }}</span>
            </div>
            <span class="nb-badge-success" *ngIf="item.is_resolved">تم الحل</span>
          </div>
          <div class="card-body">
            <p>{{ item.body }}</p>
          </div>
        </div>

        <div class="no-data" *ngIf="items().length === 0">
          <p>لا توجد تعليقات بعد. كن أول من يعلق!</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .comment-widget {
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
      padding: 16px;
      color: var(--nb-text);
    }
    .widget-header h3 {
      font-size: 13px;
      font-weight: 700;
      margin: 0 0 14px;
      color: var(--nb-primary-600);
    }
    .comment-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }
    .comment-form textarea {
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius);
      color: var(--nb-text);
      padding: 10px;
      outline: none;
      resize: none;
      font-family: var(--nb-font-family);
      font-size: 13px;
    }
    .comment-form textarea:focus { border-color: var(--nb-primary-400); box-shadow: var(--nb-focus-ring); }
    .comment-form button { align-self: flex-end; }
    .nb-btn-primary.sm { height: 30px; padding: 0 14px; font-size: 12px; }
    .comments-list { display: flex; flex-direction: column; gap: 10px; }
    .comment-card {
      background: var(--nb-surface-raised);
      border-radius: var(--nb-radius);
      padding: 12px;
      border: 1px solid var(--nb-border-soft);
    }
    .card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .user-avatar {
      width: 28px; height: 28px; border-radius: 50%;
      background: var(--nb-primary-50); color: var(--nb-primary-600);
      display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px;
    }
    .user-meta { display: flex; flex-direction: column; flex: 1; }
    .user-meta strong { font-size: 12px; color: var(--nb-text); }
    .user-meta .date { font-size: 11px; color: var(--nb-text-muted); }
    .card-body p { font-size: 13px; margin: 0; line-height: 1.6; color: var(--nb-text-secondary); }
    .no-data { text-align: center; padding: 20px; color: var(--nb-text-muted); font-size: 13px; }
  `]
})
export class CommentWidgetComponent {
  items = input<CommentItem[]>([]);
  onAddComment = output<string>();

  newCommentText = '';

  submitComment() {
    if (!this.newCommentText.trim()) return;
    this.onAddComment.emit(this.newCommentText);
    this.newCommentText = '';
  }
}