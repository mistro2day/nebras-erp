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

          <button type="submit" class="btn-primary w-100" [disabled]="isLoading() || forgotForm.invalid">
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
      height: 100vh;
      background: radial-gradient(circle, var(--background-color) 0%, #111827 100%);
    }
    .auth-card {
      width: 100%;
      max-width: 420px;
      padding: 36px;
      background-color: var(--surface-color, #1f2937);
      border: 1px solid var(--border-color, #374151);
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
    }
    .header h2 {
      font-size: 24px;
      color: #f3f4f6;
      margin-bottom: 8px;
    }
    .header p {
      font-size: 14px;
      color: #9ca3af;
    }
    .form-group {
      margin-bottom: 20px;
    }
    .form-group label {
      display: block;
      margin-bottom: 8px;
      color: #d1d5db;
      font-size: 14px;
    }
    .form-control {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #4b5563;
      border-radius: 8px;
      background-color: #111827;
      color: #fff;
      font-size: 14px;
    }
    .w-100 {
      width: 100%;
    }
    .btn-primary {
      padding: 12px;
      background-color: var(--primary-color, #2563eb);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-primary:disabled {
      background-color: #4b5563;
      cursor: not-allowed;
    }
    .success-msg {
      color: #10b981;
      margin-top: 16px;
      text-align: center;
      font-size: 14px;
    }
    .error-msg {
      color: #ef4444;
      margin-top: 16px;
      text-align: center;
      font-size: 14px;
    }
    .validation-msg {
      color: #f87171;
      font-size: 12px;
      margin-top: 4px;
    }
    .footer {
      text-align: center;
      margin-top: 24px;
    }
    .footer a {
      color: var(--primary-color, #2563eb);
      text-decoration: none;
      font-size: 14px;
    }
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