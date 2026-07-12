import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StudentFinanceService } from './student-finance.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';

interface Tile { key: string; title: string; desc: string; icon: string; route: string; }

/**
 * مساحة عمل الحسابات المالية للطلاب (Student Finance Workspace).
 * العنصر المميّز: «حلقة أداء التحصيل» — نسبة المُحصّل من إجمالي المطلوب،
 * وهو المؤشر الأصيل لحسابات القبض المدرسية. البقية هادئة على نسق نبراس.
 */
@Component({
  selector: 'app-student-finance-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="المنصة المالية للطلاب وحسابات القبض"
        subtitle="مساحة عمل موحّدة لفوترة الطلاب، التحصيل، المنح، والحظر المالي — مرتبطة بدفتر أستاذ المالية.">
        <button class="btn ghost" (click)="load()">تحديث</button>
      </nb-page-header>

      <!-- العنصر المميّز: أداء التحصيل -->
      <section class="hero">
        <div class="ring-wrap">
          <div class="ring" [style.background]="ringGradient()">
            <div class="ring-hole">
              <span class="ring-pct">{{ collectionRate() | number:'1.0-0' }}%</span>
              <span class="ring-lbl">نسبة التحصيل</span>
            </div>
          </div>
        </div>
        <div class="hero-body">
          <h2 class="hero-title">أداء التحصيل هذا الشهر</h2>
          <p class="hero-sub">نسبة ما تم تحصيله مقابل إجمالي المطلوب (المُحصّل + المستحق المتبقّي).</p>
          <div class="hero-figs">
            <div class="fig"><span class="fl">تحصيلات الشهر</span><span class="fv success">{{ fmt(s().monthly_collections) }} <em>ر.س</em></span></div>
            <div class="fig"><span class="fl">المستحقات المعلّقة</span><span class="fv danger">{{ fmt(s().outstanding_receivables) }} <em>ر.س</em></span></div>
            <div class="fig"><span class="fl">تحصيلات اليوم</span><span class="fv">{{ fmt(s().today_collections) }} <em>ر.س</em></span></div>
          </div>
        </div>
      </section>

      <!-- تنبيهات تشغيلية -->
      <div class="alert-row">
        <div class="al" [class.hot]="s().active_holds > 0"><span class="an">{{ s().active_holds || 0 }}</span><span class="at">حالات حظر مالي نشطة</span></div>
        <div class="al"><span class="an">{{ fmt(s().due_installments) }}</span><span class="at">أقساط مستحقة خلال 7 أيام (ر.س)</span></div>
        <div class="al" [class.hot]="s().pending_refunds > 0"><span class="an">{{ s().pending_refunds || 0 }}</span><span class="at">طلبات استرداد معلّقة</span></div>
      </div>

      <!-- بطاقات التنقل -->
      <h3 class="section-title">العمليات المالية للطلاب</h3>
      <div class="tiles">
        @for (t of tiles; track t.key) {
          <button class="tile" (click)="go(t.route)">
            <span class="tile-icon">{{ t.icon }}</span>
            <span class="tile-body"><span class="tile-title">{{ t.title }}</span><span class="tile-desc">{{ t.desc }}</span></span>
            <span class="tile-arrow">←</span>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }

    .hero { display: flex; align-items: center; gap: 24px; background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 22px; margin-bottom: 14px; }
    @media (max-width: 720px) { .hero { flex-direction: column; text-align: center; } }
    .ring-wrap { flex: none; }
    .ring { width: 132px; height: 132px; border-radius: 50%; display: grid; place-items: center; }
    .ring-hole { width: 98px; height: 98px; border-radius: 50%; background: var(--nb-surface); display: grid; place-items: center; box-shadow: inset 0 0 0 1px var(--nb-border-soft); }
    .ring-pct { font-size: 26px; font-weight: 800; color: var(--nb-text); letter-spacing: -1px; }
    .ring-lbl { font-size: 11px; color: var(--nb-text-muted); }
    .hero-body { flex: 1; }
    .hero-title { margin: 0; font-size: 17px; font-weight: 800; color: var(--nb-text); }
    .hero-sub { margin: 4px 0 14px; font-size: 12.5px; color: var(--nb-text-muted); }
    .hero-figs { display: flex; gap: 22px; flex-wrap: wrap; }
    .fig { display: flex; flex-direction: column; gap: 3px; }
    .fl { font-size: 12px; color: var(--nb-text-muted); }
    .fv { font-size: 20px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .fv em { font-size: 11px; font-weight: 500; font-style: normal; color: var(--nb-text-muted); }
    .fv.success { color: var(--nb-success); } .fv.danger { color: var(--nb-danger); }

    .alert-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    @media (max-width: 720px) { .alert-row { grid-template-columns: 1fr; } }
    .al { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; }
    .al.hot { border-color: var(--nb-warning); background: var(--nb-warning-bg); }
    .an { font-size: 22px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .al.hot .an { color: var(--nb-warning); }
    .at { font-size: 12px; color: var(--nb-text-muted); }

    .section-title { font-size: 14px; font-weight: 700; color: var(--nb-text); margin: 4px 0 12px; }
    .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 720px) { .tiles { grid-template-columns: 1fr; } }
    .tile { display: flex; align-items: center; gap: 14px; text-align: start; cursor: pointer; background: var(--nb-surface);
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 16px; transition: all .15s ease; font-family: inherit; }
    .tile:hover { border-color: var(--nb-primary-400); background: var(--nb-surface-raised); transform: translateY(-1px); }
    .tile:hover .tile-arrow { opacity: 1; transform: translateX(-3px); }
    .tile-icon { font-size: 22px; width: 44px; height: 44px; display: grid; place-items: center; flex: none; background: var(--nb-primary-50); border-radius: var(--nb-radius); }
    .tile-body { display: flex; flex-direction: column; gap: 3px; flex: 1; }
    .tile-title { font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .tile-desc { font-size: 12px; color: var(--nb-text-muted); }
    .tile-arrow { color: var(--nb-primary-600); font-size: 18px; opacity: 0; transition: all .15s ease; }

    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
  `],
})
export class StudentFinanceDashboardComponent implements OnInit {
  private svc = inject(StudentFinanceService);
  private router = inject(Router);

  s = signal<any>({});

  collectionRate = computed(() => {
    const collected = Number(this.s().monthly_collections) || 0;
    const outstanding = Number(this.s().outstanding_receivables) || 0;
    const total = collected + outstanding;
    return total > 0 ? Math.max(0, Math.min(100, (collected / total) * 100)) : 0;
  });
  ringGradient = computed(() => {
    const deg = (this.collectionRate() / 100) * 360;
    return `conic-gradient(var(--nb-success) 0deg ${deg}deg, var(--nb-border-soft) ${deg}deg 360deg)`;
  });

  readonly tiles: Tile[] = [
    { key: 'accounts', title: 'حسابات الطلاب', desc: 'عرض 360° لكل طالب مع إجراءات الفوترة والتحصيل.', icon: '👥', route: '/student-finance/accounts' },
    { key: 'invoices', title: 'الفواتير', desc: 'فواتير الرسوم الصادرة وحالاتها.', icon: '🧾', route: '/student-finance/invoices' },
    { key: 'receipts', title: 'التحصيلات', desc: 'إيصالات السداد وسندات القبض.', icon: '💵', route: '/student-finance/receipts' },
    { key: 'outstanding', title: 'المستحقات والقبض', desc: 'الأرصدة المستحقة غير المدفوعة.', icon: '⏳', route: '/student-finance/outstanding' },
  ];

  ngOnInit() { this.load(); }
  load() { this.svc.getDashboardStats().subscribe({ next: (d) => this.s.set(d), error: () => {} }); }
  go(r: string) { this.router.navigateByUrl(r); }
  fmt(v: any): string { return (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
}
