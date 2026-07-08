import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdmissionsService } from '../admissions/admissions.service';

/**
 * صفحة الهبوط العامة — أول ما يراه الزائر عند فتح الموقع.
 * ثلاث بوابات: تقديم طلب التحاق، تتبّع طلب سابق، تسجيل دخول الإدارة.
 * تعرض حالة باب التسجيل (مفتوح/مغلق) من إعدادات القبول الحقيقية.
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="landing" dir="rtl">
      <!-- خلفية زخرفية -->
      <div class="bg-orb orb-1" aria-hidden="true"></div>
      <div class="bg-orb orb-2" aria-hidden="true"></div>

      <header class="top">
        <div class="brand">
          <div class="logo-mark">ن</div>
          <span class="brand-name">{{ tenantName() || 'نبراس' }} <b>OS</b></span>
        </div>
        <a routerLink="/accounts/login" class="top-login">دخول الإدارة</a>
      </header>

      <main class="hero">
        <h1 class="hero-title">بوابة {{ tenantName() || 'مدارس النبراس' }}</h1>
        <p class="hero-sub">منصة القبول والتسجيل الإلكتروني — قدّم طلب التحاق أو تابع حالة طلبك بسهولة.</p>

        @if (loaded()) {
          <div class="status-pill" [class.open]="isOpen()">
            <span class="dot"></span>
            {{ isOpen() ? 'باب التسجيل مفتوح الآن' : 'باب التسجيل مغلق حالياً' }}
          </div>
        }

        <div class="cards">
          <a routerLink="/apply" class="card primary" style="--i:0">
            <div class="card-ico">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <div class="card-body">
              <h2>تقديم طلب التحاق</h2>
              <p>سجّل طالبًا جديدًا عبر معالج إلكتروني ميسّر من خمس خطوات.</p>
            </div>
            <span class="card-arrow" aria-hidden="true">←</span>
          </a>

          <a routerLink="/apply/track" class="card" style="--i:1">
            <div class="card-ico">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
              </svg>
            </div>
            <div class="card-body">
              <h2>تتبّع طلب سابق</h2>
              <p>أدخل رقم الطلب لمعرفة حالته الحالية في دورة القبول.</p>
            </div>
            <span class="card-arrow" aria-hidden="true">←</span>
          </a>

          <a routerLink="/accounts/login" class="card" style="--i:2">
            <div class="card-ico">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
            </div>
            <div class="card-body">
              <h2>تسجيل دخول الإدارة</h2>
              <p>نظام إدارة المدرسة المتكامل — للمنسوبين المصرّح لهم.</p>
            </div>
            <span class="card-arrow" aria-hidden="true">←</span>
          </a>
        </div>
      </main>

      <footer class="foot">
        <span>© {{ year }} {{ tenantName() || 'نبراس' }} — نظام نبراس OS لإدارة المدارس</span>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }
    .landing { position: relative; min-height: 100vh; display: flex; flex-direction: column; overflow: hidden;
      background: linear-gradient(160deg, var(--nb-bg) 0%, var(--nb-primary-50) 100%); }
    .bg-orb { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.35; pointer-events: none; }
    .orb-1 { width: 420px; height: 420px; background: var(--nb-primary-100); top: -120px; inset-inline-start: -100px; }
    .orb-2 { width: 360px; height: 360px; background: var(--nb-primary-100); bottom: -140px; inset-inline-end: -80px; }

    .top { position: relative; z-index: 1; height: 64px; display: flex; align-items: center; justify-content: space-between; padding: 0 28px; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .logo-mark { width: 34px; height: 34px; background: var(--nb-primary-600); border-radius: var(--nb-radius); display: flex; align-items: center; justify-content: center; color: var(--nb-on-primary); font-weight: 700; font-size: 16px; }
    .brand-name { font-size: 16px; font-weight: 700; color: var(--nb-text); }
    .brand-name b { color: var(--nb-primary-600); }
    .top-login { font-size: 13px; font-weight: 600; color: var(--nb-primary-600); text-decoration: none; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 8px 18px; background: var(--nb-surface); transition: background 150ms ease, box-shadow 150ms ease; }
    .top-login:hover { background: var(--nb-primary-50); box-shadow: 0 2px 8px rgba(16,24,40,0.06); }

    .hero { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; text-align: center; }
    .hero-title { font-size: clamp(26px, 4.5vw, 40px); font-weight: 800; color: var(--nb-text); margin: 0 0 10px; animation: rise 480ms cubic-bezier(0.2,0,0,1) both; }
    .hero-sub { font-size: clamp(14px, 1.8vw, 16px); color: var(--nb-text-secondary); margin: 0 0 18px; max-width: 560px; line-height: 1.8; animation: rise 480ms cubic-bezier(0.2,0,0,1) 60ms both; }

    .status-pill { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; padding: 7px 16px; border-radius: 999px;
      background: var(--nb-surface); border: 1px solid var(--nb-border); color: var(--nb-text-muted); margin-bottom: 34px; animation: rise 480ms cubic-bezier(0.2,0,0,1) 120ms both; }
    .status-pill .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--nb-text-faint); }
    .status-pill.open { color: var(--nb-success); border-color: var(--nb-success); }
    .status-pill.open .dot { background: var(--nb-success); box-shadow: 0 0 0 4px color-mix(in srgb, var(--nb-success) 18%, transparent); }

    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; width: 100%; max-width: 980px; }
    .card { display: flex; align-items: center; gap: 16px; text-align: start; text-decoration: none;
      background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: 14px; padding: 22px 20px;
      transition: transform 180ms cubic-bezier(0.2,0,0,1), box-shadow 180ms ease, border-color 180ms ease;
      animation: rise 520ms cubic-bezier(0.2,0,0,1) calc(180ms + var(--i) * 70ms) both; }
    .card:hover { transform: translateY(-4px); box-shadow: 0 14px 34px rgba(16,24,40,0.10); border-color: var(--nb-primary-600); }
    .card:hover .card-arrow { transform: translateX(-4px); opacity: 1; }
    .card.primary { border-color: var(--nb-primary-600); background: linear-gradient(135deg, var(--nb-primary-600), var(--nb-primary-700, var(--nb-primary-600))); }
    .card.primary h2, .card.primary p { color: var(--nb-on-primary); }
    .card.primary p { opacity: 0.85; }
    .card.primary .card-ico { background: rgba(255,255,255,0.16); color: var(--nb-on-primary); }
    .card.primary .card-arrow { color: var(--nb-on-primary); }
    .card-ico { width: 52px; height: 52px; border-radius: 12px; background: var(--nb-primary-50); color: var(--nb-primary-600); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .card-body h2 { margin: 0 0 4px; font-size: 16px; font-weight: 700; color: var(--nb-text); }
    .card-body p { margin: 0; font-size: 12.5px; color: var(--nb-text-muted); line-height: 1.7; }
    .card-arrow { margin-inline-start: auto; font-size: 18px; color: var(--nb-primary-600); opacity: 0.4; transition: transform 180ms ease, opacity 180ms ease; }

    .foot { position: relative; z-index: 1; padding: 18px; text-align: center; font-size: 12px; color: var(--nb-text-faint); }

    @keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .hero-title, .hero-sub, .status-pill, .card { animation: none; } .card:hover { transform: none; } }
  `],
})
export class LandingComponent implements OnInit {
  private readonly svc = inject(AdmissionsService);

  readonly year = new Date().getFullYear();
  readonly loaded = signal(false);
  readonly isOpen = signal(false);
  readonly tenantName = signal('');

  ngOnInit(): void {
    this.svc.getPublicConfig().subscribe({
      next: (res) => {
        const d = res?.data ?? {};
        this.isOpen.set(!!d.is_open);
        this.tenantName.set(d.tenant_name ?? '');
        this.loaded.set(true);
      },
      error: () => this.loaded.set(false),
    });
  }
}
