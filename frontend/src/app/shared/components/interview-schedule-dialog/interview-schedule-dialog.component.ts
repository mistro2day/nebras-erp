import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NbDatepickerComponent } from '../../../shared/nebras/nb-datepicker.component';

export interface InterviewScheduleData {
  applicantName: string;
}

export interface InterviewScheduleResult {
  scheduled_at: string;
  evaluation_score?: number;
  recommendation?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

@Component({
  selector: 'app-interview-schedule-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, NbDatepickerComponent],
  template: `
    <div class="dialog" dir="rtl">
      <h2 mat-dialog-title>جدولة مقابلة</h2>
      <mat-dialog-content>
        <p class="sub">جدولة مقابلة مع <strong>{{ data.applicantName }}</strong></p>

        <div class="field">
          <mat-label>تاريخ المقابلة</mat-label>
          <nb-datepicker [(value)]="date" ariaLabel="تاريخ المقابلة"></nb-datepicker>
        </div>

        <div class="time-row">
          <div class="field">
            <mat-label>الساعة</mat-label>
            <select [(ngModel)]="hour">
              @for (h of hours; track h) { <option [value]="h">{{ h }}</option> }
            </select>
          </div>
          <div class="field">
            <mat-label>الدقيقة</mat-label>
            <select [(ngModel)]="minute">
              @for (m of minutes; track m) { <option [value]="m">{{ m }}</option> }
            </select>
          </div>
        </div>

        <div class="field">
          <mat-label>الدرجة المتوقعة (اختياري)</mat-label>
          <input matInput type="number" [(ngModel)]="model.evaluation_score" placeholder="0 - 100" min="0" max="100" />
        </div>

        <div class="field">
          <mat-label>ملاحظات (اختياري)</mat-label>
          <textarea matInput rows="3" [(ngModel)]="model.recommendation" placeholder="ملاحظات حول المقابلة…"></textarea>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">إلغاء</button>
        <button mat-flat-button color="primary" (click)="onConfirm()" [disabled]="!canConfirm()">جدولة</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog { font-family: 'Cairo', sans-serif; min-width: 460px; }
    .sub { color: #64748b; margin: 0 0 14px; line-height: 1.7; }
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    .field mat-label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
    .field input, .field textarea, .field select { width: 100%; }
    .field select { height: 36px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); background: var(--nb-surface); }
    .time-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
  `]
})
export class InterviewScheduleDialogComponent {
  hours = HOURS;
  minutes = MINUTES;
  date = '';
  hour = '09';
  minute = '00';
  model: InterviewScheduleResult = { scheduled_at: '', evaluation_score: undefined, recommendation: '' };

  constructor(
    public dialogRef: MatDialogRef<InterviewScheduleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: InterviewScheduleData
  ) {}

  canConfirm(): boolean {
    return !!this.date;
  }

  onConfirm() {
    this.model.scheduled_at = `${this.date}T${this.hour}:${this.minute}:00`;
    this.dialogRef.close(this.model);
  }
  onCancel() { this.dialogRef.close(null); }
}
