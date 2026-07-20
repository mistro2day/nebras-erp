import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { LibraryService } from '../library.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';

/**
 * غرامات التأخير.
 *
 * الغرامة ليست رقماً معزولاً: مصدرها إعارة متأخرة، وأثرها قيد في المالية.
 * لذلك يظهر كل سطر بمستعيره وأيام تأخيره وحالة ترحيله المحاسبي.
 */
@Component({
  selector: 'app-library-fines',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DecimalPipe, NbPageHeaderComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="غرامات التأخير" subtitle="الغرامات المحتسبة على الإرجاع المتأخر وحالة تسويتها.">
        <button class="btn ghost" (click)="back()">رجوع للوحة</button>
        <button class="btn ghost" (click)="load()">تحديث</button>
      </nb-page-header>

      <section class="summary">
        <div class="s" [class.warn]="unpaidTotal() > 0">
          <span class="s-lbl">غير مسدّدة</span>
          <span class="s-val">{{ unpaidTotal() | number:'1.2-2' }} <small>ر.س</small></span>
          <span class="s-hint">{{ unpaid().length }} غرامة قائمة</span>
        </div>
        <div class="s">
          <span class="s-lbl">مسدّدة</span>
          <span class="s-val">{{ paidTotal() | number:'1.2-2' }} <small>ر.س</small></span>
          <span class="s-hint">{{ paid().length }} غرامة سُوّيت</span>
        </div>
        <div class="s">
          <span class="s-lbl">إجمالي أيام التأخير</span>
          <span class="s-val">{{ totalDays() }}</span>
          <span class="s-hint">عبر كل الغرامات المسجّلة</span>
        </div>
      </section>

      <section class="card">
        <div class="row head">
          <span>المستعير</span><span>الكتاب</span>
          <span class="ta-end">أيام التأخير</span><span class="ta-end">الغرامة</span>
          <span class="ta-end">القيد</span><span class="ta-end">الحالة</span>
        </div>

        @if (loading()) {
          <nb-loading message="جارٍ تحميل الغرامات…"></nb-loading>
        } @else {
          @for (f of rowsView(); track f.id) {
            <div class="row">
              <span><strong>{{ f.borrower }}</strong></span>
              <span class="muted ellipsis">{{ f.title }}</span>
              <span class="ta-end mono">{{ f.days_overdue }}</span>
              <span class="ta-end mono strong">{{ f.fine_amount | number:'1.2-2' }}</span>
              <span class="ta-end">
                @if (f.journal_entry_id) {
                  <button class="link" (click)="go('/finance/journals')">عرض ‹</button>
                } @else { <span class="muted">—</span> }
              </span>
              <span class="ta-end">
                @if (f.status === 'paid') { <span class="badge ok">مسدّدة</span> }
                @else { <span class="badge due">غير مسدّدة</span> }
              </span>
            </div>
          }
          @if (!rowsView().length) {
            <div class="empty">لا توجد غرامات — كل الإعارات أُرجعت في موعدها.</div>
          }
        }
      </section>
    </div>
  `,
  styleUrl: '../../procurement/shared/procurement-table.scss',
  styles: [`
    .row { grid-template-columns: 1.6fr 1.9fr 0.9fr 1fr 0.8fr 1fr; }
    .strong { font-weight: 800; }
    .ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .badge.ok { background: #f0fdf4; color: #15803D; }
    .badge.due { background: #fffaf0; color: #B45309; }
    .link { border: none; background: none; font-family: inherit; font-size: 12px;
      font-weight: 700; color: var(--nb-primary-600); cursor: pointer; padding: 0; }

    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 14px; }
    @media (max-width: 760px) { .summary { grid-template-columns: 1fr; } }
    .s { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 13px 16px;
      display: flex; flex-direction: column; gap: 2px; }
    .s.warn { border-color: #fde9c8; background: #fffdf8; }
    .s-lbl { font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .s-val { font-size: 21px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .s-val small { font-size: 12px; font-weight: 700; color: var(--nb-text-muted); }
    .s-hint { font-size: 11px; color: var(--nb-text-muted); }
  `],
})
export class LibraryFinesComponent implements OnInit {
  private svc = inject(LibraryService);
  private router = inject(Router);

  readonly loading = signal(true);
  private fines = signal<any[]>([]);
  private borrows = signal<any[]>([]);

  /** الغرامة تُقرأ مع إعارتها — بدونها لا يُعرف على مَن ولا على أي كتاب. */
  readonly rowsView = computed(() => {
    const byId = new Map(this.borrows().map((b) => [b.id, b]));
    return this.fines()
      .map((f) => {
        const b = byId.get(f.borrow_transaction);
        return {
          id: f.id,
          borrower: b?.borrower_name || 'غير معروف',
          title: b?.book_title || '—',
          days_overdue: Number(f.days_overdue) || 0,
          fine_amount: Number(f.fine_amount) || 0,
          status: f.status,
          journal_entry_id: f.journal_entry_id,
        };
      })
      .sort((a, b) => (a.status === 'paid' ? 1 : 0) - (b.status === 'paid' ? 1 : 0));
  });

  readonly unpaid = computed(() => this.rowsView().filter((f) => f.status !== 'paid'));
  readonly paid = computed(() => this.rowsView().filter((f) => f.status === 'paid'));
  readonly unpaidTotal = computed(() => this.unpaid().reduce((s, f) => s + f.fine_amount, 0));
  readonly paidTotal = computed(() => this.paid().reduce((s, f) => s + f.fine_amount, 0));
  readonly totalDays = computed(() => this.rowsView().reduce((s, f) => s + f.days_overdue, 0));

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const rows = (d: any) => (Array.isArray(d) ? d : (d?.data ?? d?.results ?? []));
    this.svc.getFines().subscribe({
      next: (d) => { this.fines.set(rows(d)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.svc.getBorrows().subscribe({ next: (d) => this.borrows.set(rows(d)), error: () => {} });
  }

  go(route: string) { this.router.navigateByUrl(route); }
  back() { this.router.navigateByUrl('/library/dashboard'); }
}
