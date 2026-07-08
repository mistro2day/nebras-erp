import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ApiClientService } from '../../../core/services/api-client.service';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthLayoutComponent } from '../shared/auth-layout.component';

/**
 * استعادة كلمة المرور — لغة تصميم Nebras OS عبر الغلاف المشترك AuthLayoutComponent.
 * منطق الخدمة والتحقق والتوجيه كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterModule, AuthLayoutComponent],
  template: `
    <app-auth-layout
      title="استعادة كلمة المرور"
      subtitle="أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور."
    >
      <form [formGroup]="forgotForm" (ngSubmit)="onSubmit()">
        <div class="auth-field">
          <label for="email">البريد الإلكتروني</label>
          <input class="auth-input" type="email" id="email" formControlName="email" placeholder="example@school.edu" />
          @if (forgotForm.get('email')?.touched && forgotForm.get('email')?.invalid) {
            <div class="auth-hint">يرجى إدخال بريد إلكتروني صحيح.</div>
          }
        </div>

        <button type="submit" class="nb-btn-primary auth-submit" [disabled]="isLoading() || forgotForm.invalid">
          {{ isLoading() ? 'جاري الإرسال...' : 'إرسال رابط استعادة الحساب' }}
        </button>
      </form>

      @if (successMessage()) {
        <div class="auth-success">{{ successMessage() }}</div>
      }
      @if (errorMessage()) {
        <div class="auth-error">{{ errorMessage() }}</div>
      }

      <div class="auth-footer">
        <a routerLink="/accounts/login">العودة لتسجيل الدخول</a>
      </div>
    </app-auth-layout>
  `
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
