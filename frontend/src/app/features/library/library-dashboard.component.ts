import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { LibraryService } from './library.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../shared/nebras/nb-loading.component';

interface LoanLine {
  id: string;
  borrower: string;
  title: string;
  barcode: string;
  due: string;
  /** موجب = متبقٍ، سالب = متأخر. */
  daysLeft: number;
  state: 'overdue' | 'due-soon' | 'ok';
}

/**
 * مساحة عمل المكتبة.
 *
 * التوقيع البصري: «خط الاستحقاق» — الكتاب على الرف لا يحتاج متابعة،
 * والذي يحتاجها هو المُعار: متى يعود وعند مَن. لذلك تُرتَّب الإعارات
 * بأقربها استحقاقاً لا بتاريخ إعارتها، ويُبرز المتأخر باسم مستعيره.
 */
@Component({
  selector: 'app-library-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DecimalPipe, NbPageHeaderComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="المكتبة ومصادر التعلّم"
        subtitle="الكتالوج والنسخ، الإعارة والإرجاع، والغرامات المستحقة.">
        <button class="btn ghost" (click)="load()">تحديث</button>
        <button class="btn primary" (click)="go('/library/borrows')">الإعارات</button>
      </nb-page-header>

      @if (!loading() && overdue().length > 0) {
        <button class="alert" (click)="go('/library/borrows')">
          <span class="a-ic">⚠︎</span>
          <span class="a-body">
            <strong>{{ overdue().length }}</strong> كتاب تجاوز موعد إرجاعه.
            <span class="a-hint">كل يوم تأخير يزيد الغرامة على المستعير.</span>
          </span>
          <span class="a-go">متابعة المتأخرات ‹</span>
        </button>
      }

      <section class="kpis">
        <button class="kpi" (click)="go('/library/catalog')">
          <span class="k-label">الكتالوج</span>
          <span class="k-val">{{ stat('total_books') }}</span>
          <span class="k-hint">{{ stat('total_copies') }} نسخة مسجّلة</span>
        </button>
        <button class="kpi" (click)="go('/library/borrows')">
          <span class="k-label">معارة الآن</span>
          <span class="k-val">{{ activeLoans().length }}</span>
          <span class="k-hint">خارج المكتبة بعهدة مستعيرين</span>
        </button>
        <button class="kpi" [class.warn]="overdue().length > 0" (click)="go('/library/borrows')">
          <span class="k-label">متأخرة</span>
          <span class="k-val">{{ overdue().length }}</span>
          <span class="k-hint">تجاوزت موعد الإرجاع</span>
        </button>
        <button class="kpi" [class.warn]="stat('unpaid_fines') > 0" (click)="go('/library/fines')">
          <span class="k-label">غرامات غير مسدّدة</span>
          <span class="k-val">{{ stat('unpaid_fines') | number:'1.0-0' }} <small>ر.س</small></span>
          <span class="k-hint">تُرحَّل للمالية عند التسوية</span>
        </button>
      </section>

      <!-- التوقيع: خط الاستحقاق -->
      <section class="panel">
        <div class="p-head">
          <div>
            <h3>خط الاستحقاق</h3>
            <p>الإعارات القائمة مرتّبة بأقربها موعداً — المتأخر أولاً.</p>
          </div>
          <div class="legend">
            <span><i class="sw over"></i>متأخر</span>
            <span><i class="sw soon"></i>يستحق خلال 3 أيام</span>
            <span><i class="sw ok"></i>ضمن المهلة</span>
          </div>
        </div>

        @if (loading()) {
          <nb-loading message="جارٍ تحميل الإعارات…"></nb-loading>
        } @else if (!activeLoans().length) {
          <div class="empty">
            <p>لا توجد إعارات قائمة.</p>
            <p class="hint">كل النسخ على الرفوف. تبدأ الإعارة من صفحة الإعارات.</p>
          </div>
        } @else {
          <div class="loans">
            @for (l of activeLoans(); track l.id) {
              <button class="loan" [class]="l.state" (click)="go('/library/borrows')">
                <span class="l-who">
                  <strong>{{ l.borrower }}</strong>
                  <span class="l-meta">{{ l.title }}</span>
                </span>
                <span class="l-bar">
                  <span class="l-fill" [style.width.%]="barWidth(l)"></span>
                </span>
                <span class="l-due">
                  <strong>{{ l.due }}</strong>
                  <span class="l-code">{{ l.barcode }}</span>
                </span>
                <span class="l-state">
                  @if (l.state === 'overdue') {
                    <span class="tag over">متأخر {{ -l.daysLeft }} يوماً</span>
                  } @else if (l.state === 'due-soon') {
                    <span class="tag soon">{{ l.daysLeft }} أيام</span>
                  } @else {
                    <span class="tag ok">{{ l.daysLeft }} يوماً</span>
                  }
                </span>
              </button>
            }
          </div>
        }
      </section>

      <h3 class="sec-title">إدارة المكتبة</h3>
      <section class="tiles">
        @for (t of tiles; track t.route) {
          <button class="tile" (click)="go(t.route)">
            <span class="t-ic">{{ t.icon }}</span>
            <span class="t-title">{{ t.title }}</span>
            <span class="t-desc">{{ t.desc }}</span>
          </button>
        }
      </section>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 22px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .btn { font-family: inherit; font-size: 13px; font-weight: 700; padding: 8px 14px;
      border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }

    .alert { display: flex; align-items: center; gap: 14px; width: 100%; text-align: start;
      font-family: inherit; cursor: pointer; background: #fffaf0; border: 1px solid #fde9c8;
      border-inline-start: 4px solid #F59E0B; border-radius: var(--nb-radius-card);
      padding: 13px 16px; margin-bottom: 16px; }
    .a-ic { font-size: 18px; color: #B45309; }
    .a-body { flex: 1; font-size: 13px; color: var(--nb-text); }
    .a-body strong { font-weight: 800; }
    .a-hint { color: var(--nb-text-muted); margin-inline-start: 6px; }
    .a-go { font-size: 12px; font-weight: 700; color: #B45309; }

    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
    @media (max-width: 900px) { .kpis { grid-template-columns: repeat(2, 1fr); } }
    .kpi { text-align: start; font-family: inherit; cursor: pointer;
      background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 14px 16px;
      display: flex; flex-direction: column; gap: 3px;
      transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
    .kpi:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(48,63,159,.1);
      border-color: var(--nb-primary-400); }
    .kpi:focus-visible { outline: 2px solid var(--nb-primary-500); outline-offset: 2px; }
    .kpi.warn { border-color: #fde9c8; background: #fffdf8; }
    .k-label { font-size: 12px; font-weight: 700; color: var(--nb-text-muted); }
    .k-val { font-size: 25px; font-weight: 800; color: var(--nb-text); line-height: 1.15;
      font-variant-numeric: tabular-nums; }
    .k-val small { font-size: 13px; font-weight: 700; color: var(--nb-text-muted); }
    .k-hint { font-size: 11px; color: var(--nb-text-muted); }

    .panel { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 16px 18px; margin-bottom: 20px; }
    .p-head { display: flex; align-items: flex-start; justify-content: space-between;
      gap: 16px; flex-wrap: wrap; margin-bottom: 14px; }
    .p-head h3 { margin: 0 0 2px; font-size: 15px; font-weight: 700; color: var(--nb-text); }
    .p-head p { margin: 0; font-size: 12px; color: var(--nb-text-muted); }
    .legend { display: flex; align-items: center; gap: 12px; font-size: 11px; color: var(--nb-text-muted); }
    .legend span { display: inline-flex; align-items: center; gap: 5px; }
    .sw { width: 9px; height: 9px; border-radius: 2px; display: inline-block; }
    .sw.over { background: #DC2626; } .sw.soon { background: #F59E0B; } .sw.ok { background: #16A34A; }

    .loans { display: flex; flex-direction: column; }
    .loan { display: grid; grid-template-columns: 1.8fr 1.6fr 1.1fr 0.9fr; align-items: center; gap: 14px;
      width: 100%; text-align: start; font-family: inherit; cursor: pointer; background: none;
      border: none; border-top: 1px solid var(--nb-border-soft, #f0f1f5); padding: 11px 8px;
      border-radius: 8px; transition: background .15s ease; }
    .loan:first-child { border-top: none; }
    .loan:hover { background: var(--nb-surface-raised); }
    .loan:focus-visible { outline: 2px solid var(--nb-primary-500); outline-offset: -2px; }
    @media (max-width: 820px) { .loan { grid-template-columns: 1fr 1fr; row-gap: 8px; } }

    .l-who { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .l-who strong { font-size: 13px; font-weight: 700; color: var(--nb-text);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .l-meta { font-size: 11px; color: var(--nb-text-muted);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .l-bar { position: relative; height: 8px; border-radius: 5px; background: #eef0f5; }
    .l-fill { position: absolute; inset-block: 0; inset-inline-start: 0; border-radius: 5px;
      background: #16A34A; transition: width .5s cubic-bezier(.4,0,.2,1); }
    .loan.due-soon .l-fill { background: #F59E0B; }
    .loan.overdue .l-fill { background: #DC2626; }

    .l-due { display: flex; flex-direction: column; gap: 1px; }
    .l-due strong { font-size: 12.5px; font-weight: 700; color: var(--nb-text);
      font-family: ui-monospace, monospace; }
    .l-code { font-size: 10.5px; color: var(--nb-text-muted); font-family: ui-monospace, monospace; }
    .l-state { text-align: end; }

    .tag { font-size: 11px; font-weight: 700; border-radius: 20px; padding: 3px 10px; display: inline-block; }
    .tag.over { background: #fef2f2; color: #B91C1C; }
    .tag.soon { background: #fffaf0; color: #B45309; }
    .tag.ok { background: #f0fdf4; color: #15803D; }

    .empty { padding: 26px; text-align: center; }
    .empty p { margin: 0 0 4px; font-size: 13px; color: var(--nb-text); }
    .empty .hint { font-size: 12px; color: var(--nb-text-muted); }

    .sec-title { margin: 0 0 10px; font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 900px) { .tiles { grid-template-columns: repeat(2, 1fr); } }
    .tile { text-align: start; font-family: inherit; cursor: pointer; background: var(--nb-surface);
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 14px;
      display: flex; flex-direction: column; gap: 3px;
      transition: transform .15s ease, box-shadow .15s ease; }
    .tile:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(48,63,159,.1);
      border-color: var(--nb-primary-400); }
    .t-ic { font-size: 19px; }
    .t-title { font-size: 13px; font-weight: 700; color: var(--nb-text); }
    .t-desc { font-size: 11px; color: var(--nb-text-muted); }

    @media (prefers-reduced-motion: reduce) {
      .kpi, .tile, .loan, .l-fill { transition: none; }
      .kpi:hover, .tile:hover { transform: none; }
    }
  `],
})
export class LibraryDashboardComponent implements OnInit {
  private svc = inject(LibraryService);
  private router = inject(Router);

  readonly loading = signal(true);
  readonly stats = signal<any>({});
  private borrows = signal<any[]>([]);

  readonly tiles = [
    { icon: '📚', title: 'الكتالوج والنسخ', desc: 'الكتب ونسخها وحالة كل نسخة.', route: '/library/catalog' },
    { icon: '🔄', title: 'الإعارة والإرجاع', desc: 'إعارة نسخة وإرجاعها واحتساب الغرامة.', route: '/library/borrows' },
    { icon: '💰', title: 'الغرامات', desc: 'غرامات التأخير وتسويتها مالياً.', route: '/library/fines' },
  ];

  stat(k: string): number { return Number(this.stats()?.[k] ?? 0); }

  private daysUntil(dateStr: string): number {
    if (!dateStr) return 0;
    const due = new Date(dateStr + 'T00:00:00').getTime();
    const today = new Date(new Date().toDateString()).getTime();
    return Math.round((due - today) / 86400000);
  }

  /** الإعارات القائمة فقط — المُرجَع لا يحتاج متابعة. */
  readonly activeLoans = computed<LoanLine[]>(() =>
    this.borrows()
      .filter((b) => b.status === 'borrowed' || b.status === 'overdue')
      .map((b) => {
        const daysLeft = this.daysUntil(b.due_date);
        return {
          id: b.id,
          borrower: b.borrower_name || 'غير معروف',
          title: b.book_title || '—',
          barcode: b.barcode || '',
          due: b.due_date || '—',
          daysLeft,
          state: (daysLeft < 0 ? 'overdue' : daysLeft <= 3 ? 'due-soon' : 'ok') as LoanLine['state'],
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft),
  );

  readonly overdue = computed(() => this.activeLoans().filter((l) => l.state === 'overdue'));

  /** الشريط يمثّل ما استُهلك من مهلة الإعارة — الممتلئ متأخر. */
  barWidth(l: LoanLine): number {
    if (l.daysLeft < 0) return 100;
    const window = 14;
    return Math.max(4, Math.min(100, ((window - l.daysLeft) / window) * 100));
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const rows = (d: any) => (Array.isArray(d) ? d : (d?.data ?? d?.results ?? []));
    this.svc.getDashboardStats().subscribe({
      next: (d: any) => this.stats.set(d), error: () => this.stats.set({}),
    });
    this.svc.getBorrows().subscribe({
      next: (d) => { this.borrows.set(rows(d)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  go(route: string) { this.router.navigateByUrl(route); }
}
