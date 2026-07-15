import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ParentService } from './parent.service';

/**
 * صفحة حساب ولي الأمر — بياناته الأساسية وتسجيل الخروج.
 */
@Component({
  selector: 'app-parent-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="wrap" dir="rtl">
      <h1>حسابي</h1>
      @if (user(); as u) {
        <div class="card">
          <div class="ava">{{ initial(u) }}</div>
          <strong>{{ u.first_name || u.full_name || u.name || 'ولي الأمر' }}</strong>
          <span class="email">{{ u.email }}</span>
        </div>
        <div class="card list">
          <div class="kv"><span>الجوال</span><b>{{ u.phone || '—' }}</b></div>
          <div class="kv"><span>الرقم الوطني</span><b>{{ u.national_id || '—' }}</b></div>
        </div>
      }

      <!-- تغيير كلمة المرور -->
      <button class="section-toggle" (click)="togglePw()">
        🔒 تغيير كلمة المرور <span class="chev">{{ showPw() ? '▲' : '▼' }}</span>
      </button>
      @if (showPw()) {
        <form class="card pw-form" (ngSubmit)="changePassword()">
          <label>كلمة المرور الحالية
            <input type="password" [(ngModel)]="oldPassword" name="old" required />
          </label>
          <label>كلمة المرور الجديدة
            <input type="password" [(ngModel)]="newPassword" name="new" required placeholder="8 أحرف على الأقل" />
          </label>
          <label>تأكيد كلمة المرور الجديدة
            <input type="password" [(ngModel)]="confirmPassword" name="confirm" required />
          </label>
          @if (pwError()) { <div class="err">{{ pwError() }}</div> }
          @if (pwSuccess()) { <div class="ok">✓ تم تغيير كلمة المرور بنجاح.</div> }
          <button class="save" type="submit" [disabled]="pwSaving()">
            {{ pwSaving() ? 'جارٍ الحفظ…' : 'حفظ كلمة المرور' }}
          </button>
        </form>
      }

      <button class="logout" (click)="logout()">تسجيل الخروج</button>
    </section>
  `,
  styles: [`
    :host { --p:#3F51B5; --danger:#dc2626; --muted:#6b7280; --line:#eceef5; font-family:'Cairo','Segoe UI',sans-serif; }
    h1 { margin:6px 0 16px; font-size:22px; font-weight:800; color:#1f2937; }
    .card { background:#fff; border:1px solid var(--line); border-radius:18px; padding:20px; margin-bottom:14px; text-align:center; }
    .ava { width:66px; height:66px; border-radius:20px; margin:0 auto 12px;
      background:linear-gradient(135deg,#3F51B5,#5C6BC0); color:#fff; display:flex;
      align-items:center; justify-content:center; font-size:28px; font-weight:800; }
    .card strong { display:block; font-size:17px; color:#1f2937; font-weight:800; }
    .card .email { font-size:13px; color:var(--muted); direction:ltr; display:inline-block; }
    .list { padding:6px 18px; text-align:right; }
    .kv { display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid var(--line); font-size:14px; }
    .kv:last-child { border-bottom:none; } .kv span { color:var(--muted); } .kv b { color:#1f2937; font-weight:700; }
    .logout { width:100%; background:#fff; border:1px solid #fecaca; color:var(--danger);
      padding:14px; border-radius:14px; font-family:inherit; font-size:15px; font-weight:800; cursor:pointer; }
    .section-toggle { width:100%; background:#fff; border:1px solid var(--line); border-radius:14px;
      padding:14px 16px; margin-bottom:14px; font-family:inherit; font-size:14px; font-weight:700;
      color:#1f2937; cursor:pointer; display:flex; justify-content:space-between; align-items:center; }
    .section-toggle .chev { color:var(--muted); font-size:11px; }
    .pw-form { display:flex; flex-direction:column; gap:12px; padding:16px; }
    .pw-form label { display:flex; flex-direction:column; gap:6px; font-size:13px; font-weight:700; color:#374151; text-align:right; }
    .pw-form input { font-family:inherit; font-size:14px; padding:11px 12px; border:1px solid var(--line);
      border-radius:12px; background:#fff; color:#1f2937; }
    .pw-form input:focus { outline:none; border-color:var(--p); box-shadow:0 0 0 3px rgba(63,81,181,0.12); }
    .err { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; border-radius:10px; padding:9px 12px; font-size:13px; }
    .ok { background:#f0fdf4; border:1px solid #bbf7d0; color:#166534; border-radius:10px; padding:9px 12px; font-size:13px; font-weight:700; }
    .save { background:linear-gradient(135deg,#3F51B5,#303F9F); color:#fff; border:none; padding:13px;
      border-radius:12px; font-family:inherit; font-size:14.5px; font-weight:800; cursor:pointer; }
    .save:disabled { opacity:.6; }
  `]
})
export class ParentProfileComponent {
  private auth = inject(AuthService);
  private parent = inject(ParentService);
  private router = inject(Router);

  readonly showPw = signal(false);
  readonly pwSaving = signal(false);
  readonly pwError = signal('');
  readonly pwSuccess = signal(false);
  oldPassword = '';
  newPassword = '';
  confirmPassword = '';

  user() { return this.auth.currentUser(); }
  initial(u: any): string { return (u?.first_name || u?.email || '؟').charAt(0).toUpperCase(); }

  togglePw(): void { this.showPw.update(v => !v); }

  changePassword(): void {
    this.pwError.set('');
    this.pwSuccess.set(false);
    if (!this.oldPassword || !this.newPassword) { this.pwError.set('أدخل كلمة المرور الحالية والجديدة.'); return; }
    if (this.newPassword.length < 8) { this.pwError.set('يجب أن تكون كلمة المرور الجديدة 8 أحرف على الأقل.'); return; }
    if (this.newPassword !== this.confirmPassword) { this.pwError.set('تأكيد كلمة المرور لا يطابق.'); return; }

    this.pwSaving.set(true);
    this.parent.changePassword(this.oldPassword, this.newPassword).subscribe({
      next: () => {
        this.pwSaving.set(false);
        this.pwSuccess.set(true);
        this.oldPassword = this.newPassword = this.confirmPassword = '';
      },
      error: (err) => {
        this.pwSaving.set(false);
        this.pwError.set(err?.error?.error || err?.error?.message || 'تعذّر تغيير كلمة المرور.');
      },
    });
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/accounts/login']),
      error: () => this.router.navigate(['/accounts/login']),
    });
  }
}
