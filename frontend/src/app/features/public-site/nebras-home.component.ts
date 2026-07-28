import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

interface PublicPlan {
  id: string; code: string; name_ar: string; description?: string;
  billing_cycle_display?: string; price: number; currency: string;
  max_students: number; max_staff: number; max_branches: number; modules: string[];
}

/** الموقع العام لمنصّة نبراس — يظهر على النطاق الجذر (nebras.com). تسويقي بلا مصادقة. */
@Component({
  selector: 'app-nebras-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="site" dir="rtl">
      <!-- شريط علوي -->
      <header class="nav">
        <div class="wrap">
          <div class="brand"><span class="logo">📚</span> نبراس</div>
          <nav class="links">
            <a (click)="scrollTo('features')">المزايا</a>
            <a (click)="scrollTo('pricing')">الباقات</a>
            <a (click)="scrollTo('contact')">تواصل</a>
            <button class="btn ghost sm" (click)="login()">تسجيل الدخول</button>
          </nav>
        </div>
      </header>

      <!-- البطل -->
      <section class="hero">
        <div class="wrap hero-in">
          <div class="hero-txt">
            <span class="pill">منصّة إدارة مدرسية متكاملة</span>
            <h1>أدِر مدرستك بالكامل من مكان واحد</h1>
            <p>نبراس نظام ERP مدرسي عربيّ حديث: القبول، الطلاب، الأكاديميات، الامتحانات،
               المالية، شؤون الموظفين، والتقارير — بتصميم أنيق ودعم كامل للّغة العربية.</p>
            <div class="hero-cta">
              <button class="btn primary" (click)="scrollTo('pricing')">اطّلع على الباقات</button>
              <button class="btn ghost" (click)="scrollTo('contact')">اطلب عرضاً</button>
            </div>
          </div>
          <div class="hero-art">
            <div class="art-card"><b>١٦+</b><span>وحدة تشغيلية</span></div>
            <div class="art-card"><b>عربي</b><span>RTL كامل</span></div>
            <div class="art-card"><b>سحابي</b><span>بلا تنصيب</span></div>
          </div>
        </div>
      </section>

      <!-- المزايا -->
      <section id="features" class="features">
        <div class="wrap">
          <h2>كل ما تحتاجه مدرستك</h2>
          <div class="grid">
            @for (f of featureList; track f.t) {
              <article class="feat"><span class="fi">{{ f.i }}</span><b>{{ f.t }}</b><p>{{ f.d }}</p></article>
            }
          </div>
        </div>
      </section>

      <!-- الباقات -->
      <section id="pricing" class="pricing">
        <div class="wrap">
          <h2>باقات تناسب كل مدرسة</h2>
          <p class="sub">أسعار سنوية بالجنيه السوداني — رقِّ في أي وقت مع نمو مدرستك.</p>
          @if (loading()) {
            <div class="muted center">جارٍ تحميل الباقات…</div>
          } @else if (plans().length === 0) {
            <div class="muted center">سيتم الإعلان عن الباقات قريباً.</div>
          } @else {
            <div class="plans">
              @for (p of plans(); track p.id; let i = $index) {
                <article class="plan" [class.featured]="i === 1">
                  @if (i === 1) { <span class="badge">الأكثر شيوعاً</span> }
                  <b class="p-name">{{ p.name_ar }}</b>
                  <div class="p-price">{{ p.price | number:'1.0-0' }} <small>{{ p.currency }} / سنوياً</small></div>
                  <p class="p-desc">{{ p.description }}</p>
                  <ul>
                    <li>حتى {{ p.max_students ? (p.max_students | number) : '∞' }} طالب</li>
                    <li>حتى {{ p.max_staff ? (p.max_staff | number) : '∞' }} موظف</li>
                    <li>{{ p.max_branches ? p.max_branches : '∞' }} فرع/فروع</li>
                    <li>{{ p.modules.length }} وحدة مفعّلة</li>
                  </ul>
                  <button class="btn" [class.primary]="i === 1" [class.ghost]="i !== 1" (click)="scrollTo('contact')">اطلب هذه الباقة</button>
                </article>
              }
            </div>
          }
        </div>
      </section>

      <!-- تواصل -->
      <section id="contact" class="contact">
        <div class="wrap contact-in">
          <h2>جاهز لتبدأ؟</h2>
          <p>راسلنا لتفعيل نطاق مدرستك الخاص (مثال: <span class="mono">madrasati.nebras.com</span>) والحصول على فترة تجريبية.</p>
          <a class="btn primary" href="mailto:sales@nebras.edu">sales&#64;nebras.edu</a>
        </div>
      </section>

      <footer class="foot">
        <div class="wrap">© {{ year }} نبراس — منصّة إدارة المدارس. جميع الحقوق محفوظة.</div>
      </footer>
    </div>
  `,
  styles: [`
    :host { --ink:#0f172a; --teal:#0f766e; --teal2:#14b8a6; --bg:#f8fafc; --line:#e2e8f0; }
    .site { background: var(--bg); color: var(--ink); font-family: 'Tajawal','Segoe UI',sans-serif; }
    .wrap { max-width: 1120px; margin: 0 auto; padding: 0 20px; }
    .btn { height: 42px; padding: 0 20px; border-radius: 10px; border: none; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 700; }
    .btn.sm { height: 36px; padding: 0 14px; font-size: 13px; }
    .btn.primary { background: var(--teal); color: #fff; }
    .btn.ghost { background: #fff; border: 1px solid var(--line); color: var(--ink); }

    .nav { position: sticky; top: 0; z-index: 20; background: rgba(255,255,255,.9); backdrop-filter: blur(8px); border-bottom: 1px solid var(--line); }
    .nav .wrap { display: flex; align-items: center; justify-content: space-between; height: 64px; }
    .brand { font-size: 20px; font-weight: 800; display: flex; align-items: center; gap: 8px; }
    .links { display: flex; align-items: center; gap: 22px; }
    .links a { cursor: pointer; font-weight: 600; font-size: 14px; color: #475569; }
    .links a:hover { color: var(--teal); }

    .hero { background: linear-gradient(135deg, #ecfeff, #f8fafc 60%); padding: 64px 0; }
    .hero-in { display: grid; grid-template-columns: 1.2fr .8fr; gap: 40px; align-items: center; }
    .pill { display: inline-block; background: color-mix(in srgb, var(--teal) 12%, #fff); color: var(--teal); font-weight: 700; font-size: 12.5px; padding: 6px 14px; border-radius: 99px; }
    .hero-txt h1 { font-size: 42px; line-height: 1.2; margin: 16px 0; font-weight: 800; }
    .hero-txt p { font-size: 16px; color: #475569; line-height: 1.9; max-width: 560px; }
    .hero-cta { display: flex; gap: 12px; margin-top: 26px; }
    .hero-art { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .art-card { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 22px; text-align: center; box-shadow: 0 10px 30px rgba(2,6,23,.05); }
    .art-card b { display: block; font-size: 26px; font-weight: 800; color: var(--teal); }
    .art-card span { font-size: 13px; color: #64748b; }
    .art-card:first-child { grid-column: 1 / -1; }

    section h2 { font-size: 30px; font-weight: 800; text-align: center; margin: 0 0 8px; }
    .sub, .center { text-align: center; }
    .muted { color: #64748b; }
    .features { padding: 64px 0; }
    .features .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 18px; margin-top: 36px; }
    .feat { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 22px; }
    .feat .fi { font-size: 28px; }
    .feat b { display: block; margin: 10px 0 6px; font-size: 16px; font-weight: 800; }
    .feat p { color: #64748b; font-size: 13.5px; line-height: 1.8; margin: 0; }

    .pricing { padding: 64px 0; background: #fff; border-block: 1px solid var(--line); }
    .plans { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 36px; }
    .plan { position: relative; background: var(--bg); border: 1px solid var(--line); border-radius: 18px; padding: 26px; display: flex; flex-direction: column; gap: 12px; }
    .plan.featured { border-color: var(--teal); box-shadow: 0 16px 40px rgba(15,118,110,.14); transform: translateY(-6px); }
    .badge { position: absolute; top: -12px; inset-inline-start: 24px; background: var(--teal); color: #fff; font-size: 11.5px; font-weight: 700; padding: 4px 12px; border-radius: 99px; }
    .p-name { font-size: 18px; font-weight: 800; }
    .p-price { font-size: 30px; font-weight: 800; color: var(--teal); }
    .p-price small { font-size: 13px; color: #64748b; font-weight: 600; }
    .p-desc { color: #64748b; font-size: 13px; min-height: 38px; margin: 0; }
    .plan ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .plan li { font-size: 13.5px; padding-inline-start: 22px; position: relative; }
    .plan li::before { content: '✓'; position: absolute; inset-inline-start: 0; color: var(--teal); font-weight: 800; }
    .plan .btn { margin-top: 6px; width: 100%; }

    .contact { padding: 64px 0; }
    .contact-in { text-align: center; }
    .contact p { color: #475569; font-size: 15px; margin: 10px 0 22px; }
    .mono { font-family: ui-monospace, monospace; direction: ltr; color: var(--teal); }

    .foot { padding: 26px 0; border-top: 1px solid var(--line); text-align: center; color: #94a3b8; font-size: 13px; }

    @media (max-width: 820px) {
      .hero-in { grid-template-columns: 1fr; }
      .hero-txt h1 { font-size: 32px; }
      .links a { display: none; }
    }
  `]
})
export class NebrasHomeComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly plans = signal<PublicPlan[]>([]);
  readonly loading = signal(true);
  readonly year = new Date().getFullYear();

  readonly featureList = [
    { i: '🎓', t: 'القبول والتسجيل', d: 'سير قبول كامل من الطلب حتى تسجيل الطالب، مع رسوم قابلة للضبط.' },
    { i: '📊', t: 'الأكاديميات والامتحانات', d: 'الصفوف والفصول والمواد ورصد الدرجات والكشوف التفصيلية.' },
    { i: '💰', t: 'المالية ورسوم الطلاب', d: 'فوترة الطلاب، الأقساط، المنح، وحسابات القبض متكاملة.' },
    { i: '🧑‍🏫', t: 'شؤون الموظفين والرواتب', d: 'الموظفون والعقود والحضور والرواتب في نظام واحد.' },
    { i: '📈', t: 'تقارير وتحليلات', d: 'مركز تقارير حيّة عبر كل الوحدات مع تصدير PDF وExcel.' },
    { i: '📱', t: 'بوابات وتواصل', d: 'بوابة أولياء الأمور، إشعارات، وتكامل واتساب وبريد.' },
  ];

  ngOnInit(): void {
    const base = (environment.apiUrl || '/api/v1/').replace(/\/?$/, '/');
    this.http.get<any>(`${base}saas-billing/plans/public/`).subscribe({
      next: (r) => { this.plans.set(r?.data ?? r ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  scrollTo(id: string): void { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }
  login(): void { this.router.navigate(['/accounts/login']); }
}
