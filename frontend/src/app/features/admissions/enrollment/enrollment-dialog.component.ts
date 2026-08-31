import { ChangeDetectionStrategy, Component, Inject, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { RegistrationFinanceFormComponent, FinancialConfig } from '../../students/shared/registration-finance-form.component';

export interface EnrollmentDialogData {
  applicant: Record<string, any>;
}

@Component({
  selector: 'app-enrollment-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatDialogModule, RegistrationFinanceFormComponent],
  template: `
    <div class="enrollment-dialog" dir="rtl">
      <div class="dialog-header">
        <div class="header-titles">
          <h3>تأكيد تسجيل المتقدم: {{ data.applicant['arabic_full_name'] }}</h3>
          <p class="subtitle">رقم الطلب: {{ data.applicant['application_number'] }} | اضبط رسوم الطالب والأقساط والإيصال الفوري قبل الحفظ النهائي.</p>
        </div>
        <button type="button" class="close-btn" (click)="cancel()">✕</button>
      </div>

      <div class="dialog-content">
        <app-registration-finance-form (configChange)="onConfigChange($event)"></app-registration-finance-form>
      </div>

      <div class="dialog-footer">
        <button type="button" class="nb-btn-secondary" (click)="cancel()">إلغاء</button>
        <button type="button" class="nb-btn-primary" (click)="confirm()">إتمام التسجيل وإصدار السندات ✓</button>
      </div>
    </div>
  `,
  styles: [
    `
      .enrollment-dialog {
        display: flex;
        flex-direction: column;
        max-height: 90vh;
        background: var(--nb-surface);
        color: var(--nb-text);
        border-radius: var(--nb-radius-card);
        overflow: hidden;
      }
      .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 16px 20px;
        background: var(--nb-surface-raised);
        border-bottom: 1px solid var(--nb-border);
      }
      .header-titles h3 { margin: 0 0 4px; font-size: 16px; font-weight: 700; color: var(--nb-text); }
      .header-titles .subtitle { margin: 0; font-size: 12px; color: var(--nb-text-secondary); }
      .close-btn {
        background: transparent;
        border: none;
        font-size: 18px;
        color: var(--nb-text-muted);
        cursor: pointer;
      }
      .dialog-content {
        padding: 20px;
        overflow-y: auto;
        flex: 1;
      }
      .dialog-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 14px 20px;
        background: var(--nb-surface-raised);
        border-top: 1px solid var(--nb-border);
      }
      .nb-btn-primary, .nb-btn-secondary {
        height: 38px;
        padding: 0 18px;
        font-family: var(--nb-font-family);
        font-size: 13px;
        font-weight: 600;
        border-radius: var(--nb-radius);
        cursor: pointer;
        border: none;
      }
      .nb-btn-primary {
        background: var(--nb-primary-600);
        color: white;
      }
      .nb-btn-primary:hover {
        background: var(--nb-primary-700);
      }
      .nb-btn-secondary {
        background: var(--nb-surface);
        border: 1px solid var(--nb-border);
        color: var(--nb-text);
      }
    `
  ]
})
export class EnrollmentDialogComponent {
  private dialogRef = inject(MatDialogRef<EnrollmentDialogComponent>);
  financialConfig = signal<FinancialConfig | null>(null);

  constructor(@Inject(MAT_DIALOG_DATA) public data: EnrollmentDialogData) {}

  onConfigChange(cfg: FinancialConfig) {
    this.financialConfig.set(cfg);
  }

  confirm() {
    this.dialogRef.close({ confirmed: true, financial_config: this.financialConfig() });
  }

  cancel() {
    this.dialogRef.close({ confirmed: false });
  }
}
