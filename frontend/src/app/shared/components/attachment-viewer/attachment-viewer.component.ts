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
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
      padding: 16px;
      color: var(--nb-text);
    }
    .viewer-header h3 {
      font-size: 13px;
      font-weight: 700;
      margin: 0 0 14px;
      color: var(--nb-primary-600);
    }
    .items-list { display: flex; flex-direction: column; gap: 8px; }
    .attachment-card {
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--nb-surface-raised);
      padding: 10px 14px;
      border-radius: var(--nb-radius);
      border: 1px solid var(--nb-border-soft);
    }
    .file-icon { color: var(--nb-primary-600); }
    .file-info { display: flex; flex-direction: column; flex: 1; }
    .file-name { font-size: 13px; font-weight: 600; color: var(--nb-text); }
    .file-meta { font-size: 11px; color: var(--nb-text-muted); }
    .no-data { text-align: center; padding: 20px; color: var(--nb-text-muted); font-size: 13px; }
  `]
})
export class AttachmentViewerComponent {
  items = input<AttachmentItem[]>([]);
  onDownload = output<AttachmentItem>();
  onDelete = output<AttachmentItem>();
}