import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

/**
 * قشرة بوابة ولي الأمر — تجربة هاتف أولاً مستقلة عن واجهة الإدارة.
 *
 * التوقيع البصري: شريط علوي نيلي متدرّج يحمل تحية دافئة، ومحتوى موسّط
 * ضمن عمود واحد، وشريط تنقّل سفلي ثابت بأربع وجهات — يشبه تطبيق الجوال.
 */
@Component({
  selector: 'app-parent-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="pp" dir="rtl">
      <header class="pp-bar">
        <div class="pp-bar-inner">
          <div class="greet">
            <span class="hi">أهلاً بك 👋</span>
            <span class="name">{{ displayName() }}</span>
          </div>
          <button class="logout" (click)="logout()" title="تسجيل الخروج">تسجيل الخروج</button>
        </div>
      </header>

      <main class="pp-main">
        <router-outlet></router-outlet>
      </main>

      <nav class="pp-nav">
        <a routerLink="/parent/home" routerLinkActive="on" class="tab">
          <span class="ic">🏠</span><span>الرئيسية</span>
        </a>
        <a routerLink="/parent/payments" routerLinkActive="on" class="tab">
          <span class="ic">💳</span><span>المدفوعات</span>
        </a>
        <a routerLink="/parent/messages" routerLinkActive="on" class="tab">
          <span class="ic">💬</span><span>الرسائل</span>
        </a>
        <a routerLink="/parent/profile" routerLinkActive="on" class="tab">
          <span class="ic">👤</span><span>حسابي</span>
        </a>
      </nav>
    </div>
  `,
  styles: [`
    :host {
      --pp-primary: #3F51B5;
      --pp-primary-dark: #303F9F;
      --pp-accent: #F59E0B;
      --pp-bg: #f4f5fb;
      --pp-card: #ffffff;
      --pp-text: #1f2937;
      --pp-muted: #6b7280;
      --pp-line: #eceef5;
      font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
    }
    .pp {
      min-height: 100vh;
      background: var(--pp-bg);
      display: flex;
      flex-direction: column;
      color: var(--pp-text);
    }
    .pp-bar {
      background: linear-gradient(135deg, var(--pp-primary) 0%, var(--pp-primary-dark) 100%);
      color: #fff;
      padding: 18px 0 20px;
      border-radius: 0 0 22px 22px;
      box-shadow: 0 6px 20px rgba(48,63,159,0.22);
      position: sticky; top: 0; z-index: 20;
    }
    .pp-bar-inner {
      max-width: 640px; margin: 0 auto; padding: 0 18px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .greet { display: flex; flex-direction: column; }
    .greet .hi { font-size: 13px; opacity: .85; }
    .greet .name { font-size: 18px; font-weight: 800; }
    .logout {
      background: rgba(255,255,255,0.16); color: #fff; border: none;
      padding: 8px 14px; border-radius: 10px; font-family: inherit;
      font-size: 12.5px; font-weight: 600; cursor: pointer;
    }
    .logout:hover { background: rgba(255,255,255,0.26); }
    .pp-main {
      flex: 1; width: 100%; max-width: 640px; margin: 0 auto;
      padding: 16px 16px 96px; box-sizing: border-box;
    }
    .pp-nav {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 30;
      background: var(--pp-card); border-top: 1px solid var(--pp-line);
      display: flex; justify-content: space-around;
      padding: 8px 6px calc(8px + env(safe-area-inset-bottom));
      box-shadow: 0 -4px 20px rgba(15,23,42,0.06);
    }
    .tab {
      flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px;
      text-decoration: none; color: var(--pp-muted); font-size: 11px; font-weight: 600;
      padding: 4px 0; border-radius: 12px; transition: color .15s;
    }
    .tab .ic { font-size: 20px; filter: grayscale(0.3); }
    .tab.on { color: var(--pp-primary); }
    .tab.on .ic { filter: none; transform: translateY(-1px); }
  `]
})
export class ParentShellComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  displayName(): string {
    const u: any = this.auth.currentUser();
    return u?.first_name || u?.full_name || u?.name || 'ولي الأمر';
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/accounts/login']),
      error: () => this.router.navigate(['/accounts/login']),
    });
  }
}
