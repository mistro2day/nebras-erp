import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ApiClientService } from '../../../core/services/api-client.service';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthLayoutComponent } from '../shared/auth-layout.component';

/**
 * تعيين كلمة مرور جديدة — لغة تصميم Nebras OS عبر الغلاف المشترك AuthLayoutComponent.
 * منطق الخدمة والتحقق (تطابق كلمتي المرور) والتوجيه كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterModule, AuthLayoutComponent],
  template: `
    <app-auth-layout
      title="تعيين كلمة مرور جديدة"
      subtitle="أدخل كلمة المرور الجديدة لحسابك."
    >
      <form [formGroup]="resetForm" (ngSubmit)="onSubmit()">
        <div class="auth-field">
          <label for="password">كلمة المرور الجديدة</label>
          <input class="auth-input" type="password" id="password" formControlName="password" placeholder="••••••••" />
        </div>

        <div class="auth-field">
          <label for="confirmPassword">تأكيد كلمة المرور</label>
          <input class="auth-input" type="password" id="confirmPassword" formControlName="confirmPassword" placeholder="••••••••" />
          @if (resetForm.errors?.['mismatch'] && resetForm.get('confirmPassword')?.touched) {
            <div class="auth-hint">كلمات المرور غير متطابقة.</div>
          }
        </div>

        <button type="submit" class="nb-btn-primary auth-submit" [disabled]="isLoading() || resetForm.invalid">
          {{ isLoading() ? 'جاري التحديث...' : 'حفظ كلمة المرور الجديدة' }}
        </button>
      </form>

      @if (successMessage()) {
        <div class="auth-success">{{ successMessage() }}</div>
      }
      @if (errorMessage()) {
        <div class="auth-error">{{ errorMessage() }}</div>
      }
    </app-auth-layout>
  `
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
