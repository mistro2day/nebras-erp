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
        <button mat-flat-button color="primary" (click)="submitComment()">
          <mat-icon>send</mat-icon>
          <span>إرسال التعليق</span>
        </button>
      </div>

      <!-- Comments List -->
      <div class="comments-list">
        <div class="comment-card" *ngFor="let item of items()">
          <div class="card-header">
            <mat-icon class="user-avatar-icon">account_circle</mat-icon>
            <div class="user-meta">
              <strong>مستخدم نبراس</strong>
              <span class="date">{{ item.created_at | date:'short' }}</span>
            </div>
            <span class="resolved-badge" *ngIf="item.is_resolved">تم الحل</span>
          </div>
          <div class="card-body">
            <p>{{ item.body }}</p>
          </div>
        </div>

        <div class="no-data" *ngIf="items().length === 0">
          <mat-icon>chat_bubble_outline</mat-icon>
          <p>لا توجد تعليقات بعد. كن أول من يعلق!</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .comment-widget {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 1rem;
      color: #f8fafc;
    }
    .widget-header h3 {
      font-size: 0.95rem;
      font-weight: 700;
      margin: 0 0 1rem;
      color: #6366f1;
    }
    .comment-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 1.5rem;
    }
    .comment-form textarea {
      background: rgba(15, 23, 42, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: white;
      padding: 10px;
      outline: none;
      resize: none;
      font-family: inherit;
      font-size: 0.85rem;
    }
    .comment-form button {
      align-self: flex-end;
    }
    .comments-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .comment-card {
      background: rgba(15, 23, 42, 0.4);
      border-radius: 8px;
      padding: 12px;
      border: 1px solid rgba(255, 255, 255, 0.04);
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    .user-avatar-icon {
      color: #6366f1;
    }
    .user-meta {
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .user-meta strong {
      font-size: 0.8rem;
    }
    .user-meta .date {
      font-size: 0.65rem;
      color: #94a3b8;
    }
    .resolved-badge {
      font-size: 0.65rem;
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .card-body p {
      font-size: 0.85rem;
      margin: 0;
      line-height: 1.6;
    }
    .no-data {
      text-align: center;
      padding: 2rem;
      color: #94a3b8;
    }
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