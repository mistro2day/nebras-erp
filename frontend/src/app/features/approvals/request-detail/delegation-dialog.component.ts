import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface DelegationDialogData {
  requestId?: string;
}

export interface DelegationDialogResult {
  delegate_to_id: string;
  start_date: string;
  end_date: string;
  reason: string;
}

@Component({
  selector: 'app-delegation-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="delegation-dialog" dir="rtl">
      <h2 mat-dialog-title>تفويض الاعتماد</h2>
      <mat-dialog-content>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>المستخدم المفوَّض إليه (المعرف)</mat-label>
          <input matInput [(ngModel)]="delegateToId" placeholder="UUID المستخدم">
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>تاريخ البداية</mat-label>
          <input matInput type="datetime-local" [(ngModel)]="startDate">
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>تاريخ النهاية</mat-label>
          <input matInput type="datetime-local" [(ngModel)]="endDate">
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>السبب</mat-label>
          <textarea matInput [(ngModel)]="reason" rows="2"></textarea>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button (click)="dialogRef.close()">إلغاء</button>
        <button mat-flat-button color="primary" [disabled]="!delegateToId || !startDate || !endDate" (click)="submit()">
          تفويض
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .delegation-dialog { min-width: 400px; }
    .full-width { width: 100%; margin-bottom: 0.5rem; }
  `]
})
export class DelegationDialogComponent {
  delegateToId = '';
  startDate = '';
  endDate = '';
  reason = '';

  constructor(
    public dialogRef: MatDialogRef<DelegationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DelegationDialogData,
  ) {}

  submit() {
    const result: DelegationDialogResult = {
      delegate_to_id: this.delegateToId,
      start_date: new Date(this.startDate).toISOString(),
      end_date: new Date(this.endDate).toISOString(),
      reason: this.reason,
    };
    this.dialogRef.close(result);
  }
}
