import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  template: `
    <div class="file-upload-zone" dir="rtl"
         (dragover)="onDragOver($event)"
         (dragleave)="onDragLeave($event)"
         (drop)="onDrop($event)"
         [class.dragging]="isDragging">
      <input type="file" #fileInput (change)="onFileSelected($event)"
             [accept]="accept" [multiple]="multiple" style="display: none">
      <mat-icon class="upload-icon">cloud_upload</mat-icon>
      <p class="upload-text">اسحب الملفات هنا أو</p>
      <button mat-stroked-button color="primary" (click)="fileInput.click()">
        اختر ملفاً
      </button>
      <div class="selected-file" *ngIf="selectedFile">
        <mat-icon>description</mat-icon>
        <span>{{ selectedFile.name }} ({{ (selectedFile.size / 1024).toFixed(1) }} KB)</span>
      </div>
      <mat-progress-bar *ngIf="uploading" mode="indeterminate"></mat-progress-bar>
    </div>
  `,
  styles: [`
    .file-upload-zone {
      border: 2px dashed rgba(99, 102, 241, 0.3);
      border-radius: 16px;
      padding: 2.5rem;
      text-align: center;
      background: rgba(15, 23, 42, 0.2);
      transition: all 0.3s ease;
      font-family: 'Cairo', sans-serif;
    }
    .file-upload-zone.dragging {
      border-color: #6366f1;
      background: rgba(99, 102, 241, 0.08);
    }
    .upload-icon { font-size: 48px; width: 48px; height: 48px; color: #6366f1; opacity: 0.5; }
    .upload-text { color: #94a3b8; margin: 1rem 0; }
    .selected-file {
      display: flex; align-items: center; justify-content: center;
      gap: 0.5rem; margin-top: 1rem; color: #10b981; font-size: 0.85rem;
    }
  `]
})
export class FileUploadComponent {
  @Input() accept = '*/*';
  @Input() multiple = false;
  @Output() fileChange = new EventEmitter<File>();

  isDragging = false;
  uploading = false;
  selectedFile: File | null = null;

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.fileChange.emit(file);
    }
  }

  onDragOver(event: DragEvent) { event.preventDefault(); this.isDragging = true; }
  onDragLeave(event: DragEvent) { this.isDragging = false; }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files[0];
    if (file) {
      this.selectedFile = file;
      this.fileChange.emit(file);
    }
  }
}