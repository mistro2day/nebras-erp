import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface EscalationDialogResult {
  escalated_to_id: string;
  reason: string;
}

@Component({
  selector: 'app-escalation-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="escalation-dialog" dir="rtl">
      <h2 mat-dialog-title>تصعيد طلب الاعتماد</h2>
      <mat-dialog-content>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>تصعيد إلى (معرف المستخدم)</mat-label>
          <input matInput [(ngModel)]="escalatedToId" placeholder="UUID المستخدم">
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>سبب التصعيد</mat-label>
          <textarea matInput [(ngModel)]="reason" rows="3"></textarea>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button (click)="dialogRef.close()">إلغاء</button>
        <button mat-flat-button color="warn" [disabled]="!escalatedToId" (click)="submit()">تصعيد</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .escalation-dialog { min-width: 400px; }
    .full-width { width: 100%; margin-bottom: 0.5rem; }
  `]
})
export class EscalationDialogComponent {
  escalatedToId = '';
  reason = '';

  constructor(public dialogRef: MatDialogRef<EscalationDialogComponent>) {}

  submit() {
    const result: EscalationDialogResult = { escalated_to_id: this.escalatedToId, reason: this.reason };
    this.dialogRef.close(result);
  }
}
