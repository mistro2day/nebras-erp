import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

/**
 * صفحة حساب ولي الأمر — بياناته الأساسية وتسجيل الخروج.
 */
@Component({
  selector: 'app-parent-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
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
  `]
})
export class ParentProfileComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  user() { return this.auth.currentUser(); }
  initial(u: any): string { return (u?.first_name || u?.email || '؟').charAt(0).toUpperCase(); }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/accounts/login']),
      error: () => this.router.navigate(['/accounts/login']),
    });
  }
}
