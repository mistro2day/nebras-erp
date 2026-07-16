import { ChangeDetectionStrategy, Component, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface InputDialogData {
  title: string;
  /** نص توضيحي يشرح أثر العملية (اختياري). */
  message?: string;
  label: string;
  placeholder?: string;
  value?: string;
  hint?: string;
  confirmText?: string;
  cancelText?: string;
  required?: boolean;
  type?: 'text' | 'number' | 'date';
  /** أيقونة الترويسة. */
  icon?: string;
  /** نبرة الأيقونة. */
  tone?: 'default' | 'warn' | 'danger';
}

/**
 * مربع إدخال نصي — بلغة نوافذ نبراس الموحّدة (nb-dialog.scss).
 * بديل window.prompt الذي يعرض نافذة المتصفح الخام بلا هوية ولا RTL ولا تحقق.
 */
@Component({
  selector: 'app-input-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatDialogModule],
  template: `
    <div class="nb-dlg" dir="rtl">
      <div class="nb-dlg-head">
        <span class="nb-dlg-ic" [class.warn]="data.tone === 'warn'" [class.danger]="data.tone === 'danger'">
          {{ data.icon || '✎' }}
        </span>
        <div>
          <h2>{{ data.title }}</h2>
          @if (data.message) { <p>{{ data.message }}</p> }
        </div>
      </div>

      <label>
        <span class="lbl">{{ data.label }} @if (data.required !== false) { <b class="req">*</b> }</span>
        <input [type]="data.type || 'text'" [(ngModel)]="value"
               [placeholder]="data.placeholder || ''" (keyup.enter)="confirm()" autofocus />
      </label>
      @if (data.hint) { <div class="hint">{{ data.hint }}</div> }

      @if (error()) { <div class="nb-dlg-err">{{ error() }}</div> }

      <div class="nb-dlg-acts">
        <button class="nb-dlg-btn ghost" (click)="cancel()">{{ data.cancelText || 'إلغاء' }}</button>
        <button class="nb-dlg-btn primary" (click)="confirm()">{{ data.confirmText || 'تأكيد' }}</button>
      </div>
    </div>
  `,
  styleUrl: '../nb-dialog.scss',
})
export class InputDialogComponent {
  value = '';
  readonly error = signal('');

  constructor(
    public dialogRef: MatDialogRef<InputDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: InputDialogData
  ) {
    this.value = data.value ?? '';
  }

  confirm(): void {
    const v = (this.value ?? '').trim();
    if (this.data.required !== false && !v) {
      this.error.set(`${this.data.label} مطلوب.`);
      return;
    }
    this.dialogRef.close(v);
  }

  cancel(): void { this.dialogRef.close(null); }
}
