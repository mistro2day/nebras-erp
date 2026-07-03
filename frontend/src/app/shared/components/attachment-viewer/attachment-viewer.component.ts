import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface AttachmentItem {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  category?: string;
  uploaded_at?: string;
}

@Component({
  selector: 'app-attachment-viewer',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="attachment-viewer" dir="rtl">
      <div class="viewer-header">
        <h3>مرفقات الكيان والملفات ({{ items().length }})</h3>
      </div>
      
      <div class="items-list">
        <div class="attachment-card" *ngFor="let item of items()">
          <mat-icon class="file-icon">description</mat-icon>
          <div class="file-info">
            <span class="file-name">{{ item.file_name }}</span>
            <span class="file-meta">{{ (item.file_size / 1024) | number:'1.0-1' }} KB | {{ item.mime_type }}</span>
          </div>
          <div class="card-actions">
            <button mat-icon-button (click)="onDownload.emit(item)" title="تنزيل الملف">
              <mat-icon>download</mat-icon>
            </button>
            <button mat-icon-button color="warn" (click)="onDelete.emit(item)" title="حذف الملف">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </div>
        
        <div class="no-data" *ngIf="items().length === 0">
          <mat-icon>cloud_queue</mat-icon>
          <p>لا توجد ملفات مرفوعة حالياً لهذا الكيان.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .attachment-viewer {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 1rem;
      color: #f8fafc;
    }
    .viewer-header h3 {
      font-size: 0.95rem;
      font-weight: 700;
      margin: 0 0 1rem;
      color: #6366f1;
    }
    .items-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .attachment-card {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(15, 23, 42, 0.4);
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.04);
    }
    .file-icon {
      color: #6366f1;
    }
    .file-info {
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .file-name {
      font-size: 0.85rem;
      font-weight: bold;
    }
    .file-meta {
      font-size: 0.7rem;
      color: #94a3b8;
    }
    .no-data {
      text-align: center;
      padding: 2rem;
      color: #94a3b8;
    }
  `]
})
export class AttachmentViewerComponent {
  items = input<AttachmentItem[]>([]);
  onDownload = output<AttachmentItem>();
  onDelete = output<AttachmentItem>();
}