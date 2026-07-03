import { Component, inject, signal } from '@angular/core';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ApiClientService } from '../../../core/services/api-client.service';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule, RouterModule],
  template: `
    <div class="auth-wrapper" dir="rtl">
      <div class="auth-card">
        <div class="header">
          <h2>تعيين كلمة مرور جديدة</h2>
          <p>أدخل كلمة المرور الجديدة لحسابك.</p>
        </div>

        <form [formGroup]="resetForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="password">كلمة المرور الجديدة</label>
            <input 
              type="password" 
              id="password" 
              formControlName="password" 
              class="form-control" 
              placeholder="••••••••" 
            />
          </div>

          <div class="form-group">
            <label for="confirmPassword">تأكيد كلمة المرور</label>
            <input 
              type="password" 
              id="confirmPassword" 
              formControlName="confirmPassword" 
              class="form-control" 
              placeholder="••••••••" 
            />
            <div *ngIf="resetForm.errors?.['mismatch'] && resetForm.get('confirmPassword')?.touched" class="validation-msg">
              كلمات المرور غير متطابقة.
            </div>
          </div>

          <button type="submit" class="btn-primary w-100" [disabled]="isLoading() || resetForm.invalid">
            {{ isLoading() ? 'جاري التحديث...' : 'حفظ كلمة المرور الجديدة' }}
          </button>
        </form>

        <div *ngIf="successMessage()" class="success-msg">{{ successMessage() }}</div>
        <div *ngIf="errorMessage()" class="error-msg">{{ errorMessage() }}</div>
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
  `]
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiClient = inject(ApiClientService);

  token = '';
  isLoading = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  resetForm: FormGroup = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  constructor() {
    this.token = this.route.snapshot.queryParams['token'] || '';
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  onSubmit() {
    if (this.resetForm.invalid) return;

    this.isLoading.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    const body = {
      token: this.token,
      new_password: this.resetForm.get('password')?.value
    };

    this.apiClient.post('identity/users/reset-password-confirm/', body).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('تمت إعادة تعيين كلمة المرور بنجاح. سنقوم بتحويلك لتسجيل الدخول...');
        setTimeout(() => this.router.navigate(['/accounts/login']), 2000);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error?.message || 'فشل تحديث كلمة المرور. يرجى التأكد من صلاحية الرابط.');
      }
    });
  }
}