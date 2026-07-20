import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LibraryService } from '../library.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';

/**
 * الإعارة والإرجاع.
 *
 * الإعارة تتم على نسخة بعينها لا على الكتاب — النسخة هي ما يُسلَّم فعلاً
 * ويحمل باركوداً. والمستعير طالب أو موظف، فيُختار من قائمة موحّدة تحمل
 * الأسماء بدل المعرّفات.
 */
@Component({
  selector: 'app-library-borrows',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe, NbPageHeaderComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="الإعارة والإرجاع" subtitle="إعارة النسخ للطلاب والموظفين، وإرجاعها مع احتساب التأخير.">
        <button class="btn ghost" (click)="back()">رجوع للوحة</button>
        <button class="btn ghost" (click)="load()">تحديث</button>
        <button class="btn primary" (click)="openNew()">＋ إعارة جديدة</button>
      </nb-page-header>

      <!-- إعارة جديدة -->
      @if (showNew()) {
        <section class="form-card">
          <header class="fc-head">
            <h3>إعارة نسخة</h3>
            <button class="x" (click)="showNew.set(false)" aria-label="إغلاق">✕</button>
          </header>
          <div class="fc-body">
            <div class="fields">
              <label class="wide">
                <span>المستعير <i>*</i></span>
                <select [(ngModel)]="form.person">
                  <option value="">اختر…</option>
                  <optgroup label="الطلاب">
                    @for (p of students(); track p.id) {
                      <option [value]="p.type + ':' + p.id">{{ p.name }} — {{ p.reference }}</option>
                    }
                  </optgroup>
                  <optgroup label="الموظفون والمعلمون">
                    @for (p of employees(); track p.id) {
                      <option [value]="p.type + ':' + p.id">{{ p.name }} — {{ p.reference }}</option>
                    }
                  </optgroup>
                </select>
              </label>
              <label class="wide">
                <span>النسخة المتاحة <i>*</i></span>
                <select [(ngModel)]="form.copy">
                  <option value="">اختر…</option>
                  @for (c of availableCopies(); track c.id) {
                    <option [value]="c.id">{{ c.title }} — باركود {{ c.barcode }}</option>
                  }
                </select>
              </label>
              <label>
                <span>مدة الإعارة (يوم)</span>
                <input type="number" min="1" max="90" [(ngModel)]="form.days" />
              </label>
            </div>
            @if (!availableCopies().length) {
              <p class="fc-note">لا توجد نسخ متاحة للإعارة — كل النسخ معارة أو غير متاحة.</p>
            }
            @if (error()) { <p class="err">{{ error() }}</p> }
          </div>
          <footer class="fc-acts">
            <button class="btn ghost" (click)="showNew.set(false)">إلغاء</button>
            <button class="btn primary" [disabled]="saving()" (click)="borrow()">
              {{ saving() ? 'جارٍ الإعارة…' : 'تنفيذ الإعارة' }}
            </button>
          </footer>
        </section>
      }

      <div class="chips">
        <button [class.on]="filter()===''" (click)="filter.set('')">الكل ({{ all().length }})</button>
        <button [class.on]="filter()==='active'" (click)="filter.set('active')">قائمة ({{ countActive() }})</button>
        <button [class.on]="filter()==='overdue'" (click)="filter.set('overdue')">متأخرة ({{ countOverdue() }})</button>
        <button [class.on]="filter()==='returned'" (click)="filter.set('returned')">مُرجَعة ({{ countReturned() }})</button>
      </div>

      <section class="card">
        <div class="row head">
          <span>المستعير</span><span>الكتاب</span><span>الاستعارة</span>
          <span>الاستحقاق</span><span class="ta-end">الحالة</span><span class="ta-end">إجراء</span>
        </div>

        @if (loading()) {
          <nb-loading message="جارٍ تحميل الإعارات…"></nb-loading>
        } @else {
          @for (b of filtered(); track b.id) {
            <div class="row" [class.late]="b.isOverdue">
              <span class="cell-name">
                <strong>{{ b.borrower_name }}</strong>
                <span class="muted mono">{{ b.barcode }}</span>
              </span>
              <span class="muted ellipsis">{{ b.book_title }}</span>
              <span class="muted mono">{{ b.borrow_date }}</span>
              <span class="mono" [class.late-txt]="b.isOverdue">{{ b.due_date }}</span>
              <span class="ta-end">
                @if (b.isOverdue) { <span class="badge over">متأخر {{ b.lateDays }} يوماً</span> }
                @else if (b.status === 'returned') { <span class="badge ok">مُرجَع</span> }
                @else { <span class="badge on">قائمة</span> }
              </span>
              <span class="ta-end">
                @if (b.status !== 'returned') {
                  <button class="act" (click)="openReturn(b)">تسجيل الإرجاع</button>
                } @else { <span class="muted mono">{{ b.actual_return_date }}</span> }
              </span>
            </div>
          }
          @if (!filtered().length) { <div class="empty">لا توجد إعارات مطابقة.</div> }
        }
      </section>

      <!-- الإرجاع -->
      @if (returnFor(); as b) {
        <div class="overlay" (click)="returnFor.set(null)">
          <section class="form-card modal" (click)="$event.stopPropagation()">
            <header class="fc-head">
              <h3>تسجيل إرجاع</h3>
              <button class="x" (click)="returnFor.set(null)" aria-label="إغلاق">✕</button>
            </header>
            <div class="fc-body">
              <div class="ret-sum">
                <span class="rs-who">{{ b.borrower_name }}</span>
                <span class="rs-book">{{ b.book_title }}</span>
                <span class="rs-due">استحقاق الإرجاع: <b>{{ b.due_date }}</b></span>
              </div>

              @if (b.isOverdue) {
                <div class="fine-note">
                  متأخر <b>{{ b.lateDays }}</b> يوماً — تُحتسب غرامة تلقائياً وتُرحَّل للمالية
                  كإيراد مستحق عند التسجيل.
                </div>
              } @else {
                <p class="fc-note">ضمن المهلة — لا غرامة.</p>
              }

              <div class="fields">
                <label>
                  <span>تاريخ الإرجاع الفعلي</span>
                  <input type="date" [(ngModel)]="retDate" />
                </label>
              </div>
              @if (error()) { <p class="err">{{ error() }}</p> }
            </div>
            <footer class="fc-acts">
              <button class="btn ghost" (click)="returnFor.set(null)">إلغاء</button>
              <button class="btn primary" [disabled]="saving()" (click)="doReturn(b)">
                {{ saving() ? 'جارٍ التسجيل…' : 'تسجيل الإرجاع' }}
              </button>
            </footer>
          </section>
        </div>
      }
    </div>
  `,
  styleUrl: '../../procurement/shared/procurement-table.scss',
  styles: [`
    .row { grid-template-columns: 1.6fr 1.8fr 1fr 1fr 1.1fr 1.1fr; }
    .row.late { background: #fef8f8; }
    .cell-name { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .cell-name strong { font-weight: 700; }
    .cell-name .muted { font-size: 10.5px; }
    .ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .late-txt { color: #B91C1C; font-weight: 700; }
    .badge.over { background: #fef2f2; color: #B91C1C; }
    .badge.on { background: var(--nb-primary-50); color: var(--nb-primary-700); }
    .badge.ok { background: #f0fdf4; color: #15803D; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn:disabled { opacity: .55; cursor: default; }
    .act { border: 1px solid var(--nb-border); background: var(--nb-surface); border-radius: 7px;
      font-family: inherit; font-size: 11.5px; font-weight: 700; color: var(--nb-text);
      cursor: pointer; padding: 5px 11px; }
    .act:hover { border-color: var(--nb-primary-400); color: var(--nb-primary-700); }

    .chips { display: flex; gap: 6px; margin-bottom: 13px; flex-wrap: wrap; }
    .chips button { font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer;
      background: var(--nb-surface); border: 1px solid var(--nb-border); color: var(--nb-text-muted);
      border-radius: 20px; padding: 6px 14px; }
    .chips button.on { background: var(--nb-primary-600); border-color: var(--nb-primary-600); color: #fff; }

    .form-card { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); overflow: hidden; margin-bottom: 14px; }
    .form-card.modal { width: 100%; max-width: 520px; margin: 0;
      box-shadow: 0 18px 50px rgba(16,20,40,.22); }
    .fc-head { display: flex; align-items: center; justify-content: space-between; padding: 13px 18px;
      background: var(--nb-primary-50, #f5f6ff); border-bottom: 1px solid var(--nb-primary-100, #e3e6fb); }
    .fc-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--nb-primary-800, #2a3178); }
    .x { border: none; background: none; font-size: 15px; color: var(--nb-text-muted); cursor: pointer; padding: 4px; }
    .fc-body { padding: 16px 18px; }
    .fc-note { margin: 12px 0 0; font-size: 12px; color: var(--nb-text-muted); }
    .fc-acts { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px;
      background: var(--nb-surface-raised); border-top: 1px solid var(--nb-border); }

    .overlay { position: fixed; inset: 0; background: rgba(16,20,40,.42); backdrop-filter: blur(2px);
      display: grid; place-items: center; z-index: 60; padding: 20px; }

    .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .fields .wide { grid-column: 1 / -1; }
    .fields label { display: grid; grid-template-rows: 18px auto; gap: 4px; }
    .fields label > span { font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .fields label i { color: #DC2626; font-style: normal; }
    .fields input, .fields select { height: 38px; padding: 0 11px; font-family: inherit; font-size: 13px;
      border: 1px solid var(--nb-border); border-radius: 8px; background: var(--nb-surface);
      color: var(--nb-text); width: 100%; box-sizing: border-box; }

    .ret-sum { display: flex; flex-direction: column; gap: 3px; background: var(--nb-surface-raised);
      border: 1px solid var(--nb-border); border-radius: 10px; padding: 12px 14px; margin-bottom: 12px; }
    .rs-who { font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .rs-book { font-size: 12.5px; color: var(--nb-text-muted); }
    .rs-due { font-size: 12px; color: var(--nb-text-muted); }

    .fine-note { font-size: 12.5px; color: #B45309; background: #fffaf0;
      border: 1px solid #fde9c8; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; }

    .err { margin: 12px 0 0; font-size: 12.5px; color: #B91C1C; background: #fef2f2;
      border: 1px solid #fecaca; border-radius: 8px; padding: 9px 12px; }
  `],
})
export class LibraryBorrowsComponent implements OnInit {
  private svc = inject(LibraryService);
  private router = inject(Router);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly showNew = signal(false);
  readonly filter = signal('');
  readonly returnFor = signal<any | null>(null);

  private borrows = signal<any[]>([]);
  private copies = signal<any[]>([]);
  private books = signal<any[]>([]);
  private people = signal<any[]>([]);

  form: any = { person: '', copy: '', days: 14 };
  retDate = new Date().toISOString().slice(0, 10);

  readonly students = computed(() => this.people().filter((p) => p.type === 'student'));
  readonly employees = computed(() => this.people().filter((p) => p.type === 'employee'));

  /** لا تُعرض إلا النسخ المتاحة فعلاً — المعارة لا تُعار مرتين. */
  readonly availableCopies = computed(() => {
    const titleOf = (bookId: string) => {
      const b = this.books().find((x) => x.id === bookId);
      return b?.title_ar || b?.title_en || 'كتاب';
    };
    return this.copies()
      .filter((c) => c.status === 'available')
      .map((c) => ({ id: c.id, barcode: c.barcode, title: titleOf(c.book) }));
  });

  private daysLate(due: string): number {
    if (!due) return 0;
    const d = new Date(due + 'T00:00:00').getTime();
    const today = new Date(new Date().toDateString()).getTime();
    return Math.max(0, Math.round((today - d) / 86400000));
  }

  readonly all = computed(() =>
    this.borrows().map((b) => {
      const late = b.status !== 'returned' ? this.daysLate(b.due_date) : 0;
      return { ...b, lateDays: late, isOverdue: late > 0 };
    }),
  );

  readonly filtered = computed(() => {
    const f = this.filter();
    return this.all()
      .filter((b) => {
        if (f === 'active') return b.status !== 'returned';
        if (f === 'overdue') return b.isOverdue;
        if (f === 'returned') return b.status === 'returned';
        return true;
      })
      .sort((a, b) => (b.isOverdue ? 1 : 0) - (a.isOverdue ? 1 : 0));
  });

  countActive(): number { return this.all().filter((b) => b.status !== 'returned').length; }
  countOverdue(): number { return this.all().filter((b) => b.isOverdue).length; }
  countReturned(): number { return this.all().filter((b) => b.status === 'returned').length; }

  openNew() { this.form = { person: '', copy: '', days: 14 }; this.error.set(''); this.showNew.set(true); }
  openReturn(b: any) {
    this.retDate = new Date().toISOString().slice(0, 10);
    this.error.set('');
    this.returnFor.set(b);
  }

  borrow() {
    const f = this.form;
    if (!f.person || !f.copy) { this.error.set('اختر المستعير والنسخة.'); return; }
    const [type, id] = f.person.split(':');
    this.saving.set(true);
    this.error.set('');
    this.svc.borrowCopy(f.copy, {
      borrower_user_id: id,
      borrower_type: type,
      loan_period_days: Number(f.days) || 14,
    }).subscribe({
      next: () => { this.saving.set(false); this.showNew.set(false); this.load(); },
      error: (e) => this.fail(e, 'تعذّرت الإعارة.'),
    });
  }

  doReturn(b: any) {
    this.saving.set(true);
    this.error.set('');
    this.svc.returnBorrow(b.id, { actual_return_date: this.retDate }).subscribe({
      next: () => { this.saving.set(false); this.returnFor.set(null); this.load(); },
      error: (e) => this.fail(e, 'تعذّر تسجيل الإرجاع.'),
    });
  }

  private fail(e: any, fallback: string) {
    this.saving.set(false);
    const d = e?.details?.error ?? e?.details;
    this.error.set(typeof d === 'string' ? d : (e?.message || fallback));
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const rows = (d: any) => (Array.isArray(d) ? d : (d?.data ?? d?.results ?? []));
    this.svc.getBorrows().subscribe({
      next: (d) => { this.borrows.set(rows(d)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.svc.getCopies().subscribe({ next: (d) => this.copies.set(rows(d)), error: () => {} });
    this.svc.getBooks().subscribe({ next: (d) => this.books.set(rows(d)), error: () => {} });
    this.svc.getPeople().subscribe({ next: (d) => this.people.set(rows(d)), error: () => {} });
  }

  back() { this.router.navigateByUrl('/library/dashboard'); }
}
