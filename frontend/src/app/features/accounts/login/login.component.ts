import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { TenantService } from '../../../core/services/tenant.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="login-wrapper" dir="rtl">
      <div class="login-card">
        <div class="header">
          <div class="brand-mark">ن</div>
          <h2>تسجيل الدخول إلى {{ tenantService.currentTenant()?.nameAr || 'نبراس ERP' }}</h2>
        </div>

        <form (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">البريد الإلكتروني</label>
            <input type="email" id="email" [(ngModel)]="email" name="email" required class="form-control" />
          </div>

          <div class="form-group">
            <label for="password">كلمة المرور</label>
            <input type="password" id="password" [(ngModel)]="password" name="password" required class="form-control" />
          </div>

          <button type="submit" class="nb-btn-primary w-100" [disabled]="isLoading()">
            {{ isLoading() ? 'جاري التحقق...' : 'دخول' }}
          </button>
        </form>

        @if (errorMessage()) { <p class="error-msg">{{ errorMessage() }}</p> }
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: var(--nb-bg);
      font-family: var(--nb-font-family);
    }
    .login-card {
      width: 100%;
      max-width: 400px;
      padding: 32px;
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
      box-shadow: var(--nb-shadow-dialog);
    }
    .header { text-align: center; margin-bottom: 24px; }
    .brand-mark {
      width: 48px; height: 48px; margin: 0 auto 12px;
      background: var(--nb-primary-600); color: var(--nb-on-primary);
      border-radius: var(--nb-radius); display: flex; align-items: center; justify-content: center;
      font-size: 24px; font-weight: 700;
    }
    .header h2 { font-size: 16px; font-weight: 700; color: var(--nb-text); margin: 0; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 12px; font-weight: 600; color: var(--nb-text); margin-bottom: 5px; }
    .form-control {
      width: 100%;
      height: 34px;
      padding: 0 12px;
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius);
      background: var(--nb-surface);
      color: var(--nb-text);
      font-family: var(--nb-font-family);
      font-size: 13px;
      outline: none;
    }
    .form-control:focus { border-color: var(--nb-primary-400); box-shadow: var(--nb-focus-ring); }
    .w-100 { width: 100%; }
    .error-msg { color: var(--nb-danger); margin-top: 16px; text-align: center; font-size: 13px; }
  `]
})
export class LoginComponent {
  authService = inject(AuthService);
  tenantService = inject(TenantService);
  router = inject(Router);

  email = '';
  password = '';
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  onSubmit() {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error?.message || 'فشل تسجيل الدخول. يرجى التحقق من الاتصال.');
      }
    });
  }
}