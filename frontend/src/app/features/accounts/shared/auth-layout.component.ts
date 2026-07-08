import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from '@angular/core';

/**
 * مكوّن الغلاف الموحّد لشاشات الحساب (تسجيل الدخول/الاستعادة/إعادة التعيين) — لغة تصميم Nebras OS.
 * مصدر وحيد لأنماط البطاقة والحقول والرسائل، لمنع تكرار CSS عبر صفحات الحساب.
 * يستخدم رموز التصميم (--nb-*) فقط — بدون ألوان ثابتة، بدون تدرّجات، بدون وضع داكن.
 *
 * ViewEncapsulation.None متعمّد: يتيح لأصناف الحقول المشتركة (auth-field/auth-input/…)
 * أن تُطبَّق على المحتوى المُسقَط (ng-content) من صفحات الحساب دون تكرار الأنماط.
 * كل الأصناف مسبوقة بـ auth- وتقتصر على شاشات الحساب ملء الشاشة.
 */
@Component({
  selector: 'app-auth-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="auth-wrapper" dir="rtl">
      <div class="auth-card">
        <div class="auth-head">
          @if (brand) {
            <div class="auth-brand">ن</div>
          }
          <h2 class="auth-title">{{ title }}</h2>
          @if (subtitle) {
            <p class="auth-subtitle">{{ subtitle }}</p>
          }
        </div>

        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .auth-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 24px;
      background: var(--nb-bg);
      font-family: var(--nb-font-family);
    }
    .auth-card {
      width: 100%;
      max-width: 400px;
      padding: 32px;
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
      box-shadow: var(--nb-shadow-dialog);
    }
    .auth-head { text-align: center; margin-bottom: 24px; }
    .auth-brand {
      width: 48px; height: 48px; margin: 0 auto 14px;
      background: var(--nb-primary-600); color: var(--nb-on-primary);
      border-radius: var(--nb-radius);
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; font-weight: 700;
    }
    .auth-title { font-size: 18px; font-weight: 700; color: var(--nb-text); margin: 0 0 6px; }
    .auth-subtitle { font-size: 13px; color: var(--nb-text-muted); margin: 0; line-height: 1.6; }

    /* ==== أساسيات النماذج المشتركة لشاشات الحساب ==== */
    .auth-field { margin-bottom: 16px; }
    .auth-field label {
      display: block; font-size: 12px; font-weight: 600;
      color: var(--nb-text); margin-bottom: 5px;
    }
    .auth-input {
      width: 100%; height: 34px; padding: 0 12px;
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text);
      font-family: var(--nb-font-family); font-size: 13px; outline: none;
    }
    .auth-input::placeholder { color: var(--nb-text-faint); }
    .auth-input:focus { border-color: var(--nb-primary-400); box-shadow: var(--nb-focus-ring); }
    .auth-submit { width: 100%; }
    .auth-hint { color: var(--nb-danger); font-size: 11px; margin-top: 4px; }
    .auth-error { color: var(--nb-danger); margin-top: 16px; text-align: center; font-size: 13px; }
    .auth-success { color: var(--nb-success); margin-top: 16px; text-align: center; font-size: 13px; }
    .auth-footer { text-align: center; margin-top: 20px; }
    .auth-footer a { color: var(--nb-primary-600); text-decoration: none; font-size: 13px; }
    .auth-footer a:hover { text-decoration: underline; }
  `]
})
export class AuthLayoutComponent {
  /** عنوان البطاقة الرئيسي */
  @Input() title = '';
  /** وصف اختياري أسفل العنوان */
  @Input() subtitle?: string;
  /** إظهار شعار نبراس أعلى البطاقة */
  @Input() brand = false;
}
