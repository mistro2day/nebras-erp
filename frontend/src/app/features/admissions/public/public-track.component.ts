import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdmissionsService } from '../admissions.service';
import { applicantStatusText } from '../shared/admissions.shared';

/**
 * تتبّع طلب الالتحاق (عام) — إدخال رقم الطلب لعرض حالته الحالية.
 * مربوط بنقطة النهاية العامة public-track.
 */
@Component({
  selector: 'app-public-track',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="portal" dir="rtl">
      <header class="portal-top">
        <a routerLink="/welcome" class="brand" aria-label="الصفحة الرئيسية للموقع">
          <div class="logo-mark">ن</div>
          <div class="brand-title">بوابة القبول</div>
        </a>
        <a routerLink="/apply" class="track-link">← طلب التحاق جديد</a>
      </header>

      <main class="portal-main">
        <div class="card">
          <h1>تتبّع حالة الطلب</h1>
          <p class="sub">أدخل رقم الطلب الذي حصلت عليه عند التقديم.</p>

          <div class="search-row">
            <input [(ngModel)]="appNum" placeholder="APP-XXXXXX" (keyup.enter)="track()" />
            <button class="btn primary" (click)="track()" [disabled]="loading() || !appNum.trim()">
              {{ loading() ? 'جارٍ البحث…' : 'تتبّع' }}
            </button>
          </div>

          @if (error()) { <div class="alert err">{{ error() }}</div> }

          @if (result(); as r) {
            <div class="result">
              <div class="row"><span>رقم الطلب</span><b>{{ r.application_number }}</b></div>
              <div class="row"><span>اسم المتقدم</span><b>{{ r.arabic_full_name }}</b></div>
              <div class="row"><span>الحالة</span><b class="status">{{ statusText(r.status) }}</b></div>
            </div>
          }
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--nb-bg); }
    .portal { min-height: 100vh; display: flex; flex-direction: column; }
    .portal-top { height: 60px; background: var(--nb-surface); border-bottom: 1px solid var(--nb-border); display: flex; align-items: center; justify-content: space-between; padding: 0 24px; }
    .brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
    .logo-mark { width: 30px; height: 30px; background: var(--nb-primary-600); border-radius: var(--nb-radius); display: flex; align-items: center; justify-content: center; color: var(--nb-on-primary); font-weight: 700; }
    .brand-title { font-size: 15px; font-weight: 700; color: var(--nb-text); }
    .track-link { font-size: 13px; color: var(--nb-primary-600); text-decoration: none; font-weight: 600; }
    .portal-main { flex: 1; display: flex; justify-content: center; align-items: flex-start; padding: 40px 16px; }
    .card { width: 100%; max-width: 520px; background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 28px; }
    h1 { font-size: 20px; font-weight: 700; margin: 0 0 4px; color: var(--nb-text); }
    .sub { font-size: 13px; color: var(--nb-text-muted); margin: 0 0 20px; }
    .search-row { display: flex; gap: 10px; }
    .search-row input { flex: 1; height: 42px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 12px; font-family: var(--nb-font-family); font-size: 14px; color: var(--nb-text); background: var(--nb-surface); outline: none; text-align: center; letter-spacing: 1px; }
    .search-row input:focus { border-color: var(--nb-primary-600); box-shadow: var(--nb-focus-ring); }
    .btn { height: 42px; padding: 0 22px; border-radius: var(--nb-radius); font-family: var(--nb-font-family); font-size: 13px; font-weight: 600; cursor: pointer; border: none; }
    .btn.primary { background: var(--nb-primary-600); color: var(--nb-on-primary); }
    .btn.primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .alert { font-size: 12px; border-radius: var(--nb-radius); padding: 10px 14px; margin-top: 16px; }
    .alert.err { background: var(--nb-danger-bg); color: var(--nb-danger); border: 1px solid var(--nb-danger); }
    .result { margin-top: 20px; border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius); overflow: hidden; }
    .row { display: flex; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--nb-border-row); font-size: 13px; }
    .row:last-child { border-bottom: none; }
    .row span { color: var(--nb-text-muted); }
    .row b { color: var(--nb-text); }
    .row b.status { color: var(--nb-primary-600); }
  `],
})
export class PublicTrackComponent implements OnInit {
  private readonly svc = inject(AdmissionsService);
  private readonly route = inject(ActivatedRoute);

  appNum = '';
  readonly loading = signal(false);
  readonly error = signal('');
  readonly result = signal<{ application_number: string; arabic_full_name: string; status: string } | null>(null);

  statusText = applicantStatusText;

  ngOnInit(): void {
    const n = this.route.snapshot.queryParamMap.get('n');
    if (n) { this.appNum = n; this.track(); }
  }

  track(): void {
    const n = this.appNum.trim();
    if (!n || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.result.set(null);
    this.svc.trackApplication(n).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.result.set(res?.data ?? res);
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(e?.status === 404 ? 'لا يوجد طلب بهذا الرقم.' : 'تعذّر جلب حالة الطلب. حاول لاحقًا.');
      },
    });
  }
}
