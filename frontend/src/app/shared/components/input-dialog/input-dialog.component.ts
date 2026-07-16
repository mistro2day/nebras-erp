import { ChangeDetectionStrategy, Component, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface InputDialogData {
  title: string;
  /** نص توضيحي أعلى الحقل (اختياري). */
  message?: string;
  label: string;
  /** تلميح داخل الحقل. */
  placeholder?: string;
  /** قيمة مقترحة مبدئية. */
  value?: string;
  hint?: string;
  confirmText?: string;
  cancelText?: string;
  required?: boolean;
  type?: 'text' | 'number' | 'date';
}

/**
 * مربع إدخال نصي بهوية نبراس — بديل window.prompt الذي يعرض نافذة المتصفح
 * الخام (بنمط النظام، بلا هوية ولا RTL ولا تحقق).
 */
@Component({
  selector: 'app-input-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="in-dlg" dir="rtl">
      <h2 class="t">{{ data.title }}</h2>
      @if (data.message) { <p class="m">{{ data.message }}</p> }

      <label class="fld">
        <span class="lbl">{{ data.label }} @if (data.required !== false) { <b>*</b> }</span>
        <input [type]="data.type || 'text'" [(ngModel)]="value" [placeholder]="data.placeholder || ''"
               (keyup.enter)="confirm()" autofocus />
        @if (data.hint) { <small class="hint">{{ data.hint }}</small> }
      </label>

      @if (error()) { <div class="err">{{ error() }}</div> }

      <div class="acts">
        <button mat-button (click)="cancel()">{{ data.cancelText || 'إلغاء' }}</button>
        <button mat-flat-button color="primary" (click)="confirm()">{{ data.confirmText || 'تأكيد' }}</button>
      </div>
    </div>
  `,
  styles: [`
    .in-dlg { font-family: var(--nb-font-family, 'Cairo', sans-serif); min-width: 380px; padding: 4px 2px; }
    .t { margin: 0 0 6px; font-size: 17px; font-weight: 800; color: var(--nb-text, #1f2937); }
    .m { margin: 0 0 16px; font-size: 13px; color: var(--nb-text-muted, #64748b); line-height: 1.7; }
    .fld { display: flex; flex-direction: column; gap: 6px; }
    .lbl { font-size: 12.5px; font-weight: 700; color: var(--nb-text, #1f2937); }
    .lbl b { color: var(--nb-danger, #dc2626); }
    input { font-family: inherit; font-size: 14px; padding: 10px 12px; border-radius: var(--nb-radius, 8px);
      border: 1px solid var(--nb-border, #e5e7eb); background: var(--nb-surface, #fff); color: var(--nb-text, #1f2937); }
    input:focus { outline: none; border-color: var(--nb-primary-400, #7986CB); box-shadow: 0 0 0 3px rgba(63,81,181,0.12); }
    .hint { font-size: 11px; color: var(--nb-text-muted, #64748b); }
    .err { margin-top: 10px; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b;
      border-radius: 8px; padding: 8px 10px; font-size: 12.5px; }
    .acts { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
  `]
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
