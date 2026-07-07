import { Component, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ApiClientService } from '../../../core/services/api-client.service';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule, RouterModule],
  template: `
    <div class="auth-wrapper" dir="rtl">
      <div class="auth-card">
        <div class="header">
          <h2>استعادة كلمة المرور</h2>
          <p>أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.</p>
        </div>

        <form [formGroup]="forgotForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">البريد الإلكتروني</label>
            <input 
              type="email" 
              id="email" 
              formControlName="email" 
              class="form-control" 
              placeholder="example@school.edu" 
            />
            <div *ngIf="forgotForm.get('email')?.touched && forgotForm.get('email')?.invalid" class="validation-msg">
              يرجى إدخال بريد إلكتروني صحيح.
            </div>
          </div>

          <button type="submit" class="nb-btn-primary w-100" [disabled]="isLoading() || forgotForm.invalid">
            {{ isLoading() ? 'جاري الإرسال...' : 'إرسال رابط استعادة الحساب' }}
          </button>
        </form>

        <div *ngIf="successMessage()" class="success-msg">{{ successMessage() }}</div>
        <div *ngIf="errorMessage()" class="error-msg">{{ errorMessage() }}</div>

        <div class="footer">
          <a routerLink="/accounts/login">العودة لتسجيل الدخول</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: var(--nb-bg);
      font-family: var(--nb-font-family);
    }
    .auth-card {
      width: 100%;
      max-width: 420px;
      padding: 32px;
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
      box-shadow: var(--nb-shadow-dialog);
    }
    .header { text-align: center; margin-bottom: 24px; }
    .header h2 { font-size: 18px; font-weight: 700; color: var(--nb-text); margin: 0 0 8px; }
    .header p { font-size: 13px; color: var(--nb-text-muted); margin: 0; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 5px; color: var(--nb-text); font-size: 12px; font-weight: 600; }
    .form-control {
      width: 100%; height: 34px; padding: 0 12px;
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text);
      font-family: var(--nb-font-family); font-size: 13px; outline: none;
    }
    .form-control:focus { border-color: var(--nb-primary-400); box-shadow: var(--nb-focus-ring); }
    .w-100 { width: 100%; }
    .success-msg { color: var(--nb-success); margin-top: 16px; text-align: center; font-size: 13px; }
    .error-msg { color: var(--nb-danger); margin-top: 16px; text-align: center; font-size: 13px; }
    .validation-msg { color: var(--nb-danger); font-size: 11px; margin-top: 4px; }
    .footer { text-align: center; margin-top: 20px; }
    .footer a { color: var(--nb-primary-600); text-decoration: none; font-size: 13px; }
  `]
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private apiClient = inject(ApiClientService);

  forgotForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  isLoading = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  onSubmit() {
    if (this.forgotForm.invalid) return;

    this.isLoading.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    this.apiClient.post('identity/users/reset-password-email/', this.forgotForm.value).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage.set('تم إرسال تعليمات استعادة الحساب بنجاح إلى بريدك الإلكتروني.');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error?.message || 'فشل إرسال البريد الإلكتروني. يرجى المحاولة لاحقاً.');
      }
    });
  }
}