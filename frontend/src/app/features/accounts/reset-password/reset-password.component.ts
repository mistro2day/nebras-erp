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

          <button type="submit" class="nb-btn-primary w-100" [disabled]="isLoading() || resetForm.invalid">
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