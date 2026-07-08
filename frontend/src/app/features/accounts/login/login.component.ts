import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { TenantService } from '../../../core/services/tenant.service';
import { FormsModule } from '@angular/forms';
import { AuthLayoutComponent } from '../shared/auth-layout.component';

/**
 * تسجيل الدخول — لغة تصميم Nebras OS عبر الغلاف المشترك AuthLayoutComponent.
 * منطق المصادقة والتوجيه والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, AuthLayoutComponent],
  template: `
    <app-auth-layout
      [brand]="true"
      [title]="'تسجيل الدخول إلى ' + (tenantService.currentTenant()?.nameAr || 'نبراس ERP')"
    >
      <form (ngSubmit)="onSubmit()">
        <div class="auth-field">
          <label for="email">البريد الإلكتروني</label>
          <input class="auth-input" type="email" id="email" name="email" [(ngModel)]="email" required />
        </div>

        <div class="auth-field">
          <label for="password">كلمة المرور</label>
          <input class="auth-input" type="password" id="password" name="password" [(ngModel)]="password" required />
        </div>

        <button type="submit" class="nb-btn-primary auth-submit" [disabled]="isLoading()">
          {{ isLoading() ? 'جاري التحقق...' : 'دخول' }}
        </button>
      </form>

      @if (errorMessage()) {
        <p class="auth-error">{{ errorMessage() }}</p>
      }
    </app-auth-layout>
  `
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
