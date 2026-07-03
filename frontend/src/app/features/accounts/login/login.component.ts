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
          <img [src]="tenantService.currentTenant()?.logoUrl || 'assets/logo.png'" alt="Logo" class="logo" />
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

          <button type="submit" class="btn-primary w-100" [disabled]="isLoading()">
            {{ isLoading() ? 'جاري التحقق...' : 'دخول' }}
          </button>
        </form>

        <p *ngIf="errorMessage()" class="error-msg">{{ errorMessage() }}</p>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background-color: var(--background-color);
    }
    .login-card {
      width: 100%;
      max-width: 400px;
      padding: 32px;
      background-color: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-base);
      box-shadow: var(--shadow-md);
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
    }
    .logo {
      height: 64px;
      margin-bottom: 12px;
    }
    .form-group {
      margin-bottom: 16px;
    }
    .form-control {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-base);
      background-color: var(--background-color);
      color: var(--text-color);
    }
    .w-100 {
      width: 100%;
    }
    .error-msg {
      color: #ef4444;
      margin-top: 16px;
      text-align: center;
    }
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