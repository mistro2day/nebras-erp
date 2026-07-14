import { ChangeDetectionStrategy, Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Observable } from 'rxjs';

export interface AccountActionDialogData {
  /** عنوان مربع الحوار، مثل "تفعيل حساب الطالب". */
  title: string;
  /** اسم الهدف (طالب/معلم/ولي أمر) لإظهاره أثناء التنفيذ. */
  targetName?: string;
  /** نص السطر التوضيحي أثناء التنفيذ. */
  processingHint?: string;
  /** الإجراء المُنفَّذ في الخادم؛ يُشغَّل تلقائياً عند فتح الحوار. */
  action$: Observable<any>;
}

type Phase = 'processing' | 'success' | 'info' | 'error';

/**
 * بوب-أب نبراس الموحّد لإجراءات الحسابات (تفعيل / إعادة تعيين كلمة المرور).
 * يُظهر للمدير أن العملية جارية في الخادم (سبينر متحرك) ثم نتيجة واضحة:
 *   - نجاح: تم التفعيل وإرسال بيانات الدخول.
 *   - معلومة: الحساب مفعّل مسبقاً (already_active).
 *   - خطأ: رسالة الفشل من الخادم.
 */
@Component({
  selector: 'app-account-action-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="aad" dir="rtl" [attr.data-phase]="phase()">
      <div class="aad-icon">
        @switch (phase()) {
          @case ('processing') { <div class="spinner"></div> }
          @case ('success') { <div class="badge ok">✓</div> }
          @case ('info') { <div class="badge info">ℹ</div> }
          @case ('error') { <div class="badge err">✕</div> }
        }
      </div>

      <h2 class="aad-title">{{ data.title }}</h2>

      @if (phase() === 'processing') {
        <p class="aad-msg">
          {{ data.processingHint || 'جارٍ تنفيذ الإجراء في النظام…' }}
          @if (data.targetName) { <br /><strong>{{ data.targetName }}</strong> }
        </p>
        <div class="progress-track"><div class="progress-bar"></div></div>
      } @else {
        <p class="aad-msg">{{ resultMessage() }}</p>
        @if (resultEmail()) {
          <div class="chip">📧 {{ resultEmail() }}</div>
        }
      }

      <div class="aad-actions">
        @if (phase() !== 'processing') {
          <button mat-flat-button
            [color]="phase() === 'error' ? 'warn' : 'primary'"
            (click)="close()">تم</button>
        }
      </div>
    </div>
  `,
  styles: [`
    .aad {
      font-family: var(--nb-font-family, 'Cairo', sans-serif);
      min-width: 380px; max-width: 440px; text-align: center;
      padding: 26px 24px 18px;
    }
    .aad-icon { display: flex; justify-content: center; margin-bottom: 14px; }
    .spinner {
      width: 56px; height: 56px; border-radius: 50%;
      border: 5px solid var(--nb-primary-50, #e0e7ff);
      border-top-color: var(--nb-primary-600, #4f46e5);
      animation: aad-spin 0.8s linear infinite;
    }
    @keyframes aad-spin { to { transform: rotate(360deg); } }
    .badge {
      width: 56px; height: 56px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 30px; font-weight: 700; color: #fff;
      animation: aad-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .badge.ok { background: #16a34a; }
    .badge.info { background: #2563eb; }
    .badge.err { background: #dc2626; }
    @keyframes aad-pop { from { transform: scale(0); } to { transform: scale(1); } }
    .aad-title { font-size: 19px; font-weight: 700; color: var(--nb-text, #0f172a); margin: 0 0 8px; }
    .aad-msg { color: #64748b; line-height: 1.75; font-size: 14.5px; margin: 0 0 6px; }
    .chip {
      display: inline-block; margin-top: 10px; padding: 6px 14px;
      background: var(--nb-primary-50, #eef2ff); color: var(--nb-primary-700, #4338ca);
      border-radius: 999px; font-size: 13px; font-weight: 600; direction: ltr;
    }
    .progress-track {
      margin: 16px auto 4px; width: 80%; height: 5px;
      background: var(--nb-primary-50, #e0e7ff); border-radius: 999px; overflow: hidden;
    }
    .progress-bar {
      height: 100%; width: 40%; border-radius: 999px;
      background: var(--nb-primary-600, #4f46e5);
      animation: aad-slide 1.1s ease-in-out infinite;
    }
    @keyframes aad-slide {
      0% { margin-inline-start: -40%; }
      100% { margin-inline-start: 100%; }
    }
    .aad-actions { margin-top: 18px; display: flex; justify-content: center; }
    .aad-actions button { min-width: 120px; }
  `]
})
export class AccountActionDialogComponent implements OnInit {
  readonly phase = signal<Phase>('processing');
  readonly resultMessage = signal('');
  readonly resultEmail = signal<string | null>(null);

  constructor(
    public dialogRef: MatDialogRef<AccountActionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AccountActionDialogData
  ) {
    // منع الإغلاق أثناء التنفيذ (بالنقر خارج الحوار أو ESC)
    this.dialogRef.disableClose = true;
  }

  ngOnInit(): void {
    this.data.action$.subscribe({
      next: (res) => {
        const payload = res?.data ?? res ?? {};
        const alreadyActive = payload.already_active === true || payload.created === false;
        this.resultEmail.set(payload.email || null);
        this.resultMessage.set(
          res?.message || (alreadyActive
            ? 'هذا الحساب مفعّل مسبقاً.'
            : 'تمت العملية بنجاح وإرسال بيانات الدخول.')
        );
        this.phase.set(alreadyActive ? 'info' : 'success');
        this.dialogRef.disableClose = false;
      },
      error: (err) => {
        this.resultMessage.set(
          err?.error?.error?.message || err?.error?.message ||
          err?.error?.detail || 'تعذّر إتمام العملية. حاول مرة أخرى.'
        );
        this.phase.set('error');
        this.dialogRef.disableClose = false;
      }
    });
  }

  close(): void {
    this.dialogRef.close(this.phase());
  }
}
