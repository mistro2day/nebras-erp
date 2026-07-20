import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LibraryService } from '../library.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';

/**
 * الكتالوج والنسخ.
 *
 * الكتاب عنوان، والنسخة هي ما يُعار. لذلك يُعرض كل كتاب بعدد نسخه
 * وكم منها متاح الآن — فالرقم الذي يهمّ أمين المكتبة هو المتاح لا الإجمالي.
 */
@Component({
  selector: 'app-library-catalog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="الكتالوج والنسخ" subtitle="الكتب المسجّلة ونسخها وحالة كل نسخة.">
        <button class="btn ghost" (click)="back()">رجوع للوحة</button>
        <button class="btn ghost" (click)="load()">تحديث</button>
        <button class="btn primary" (click)="openBook()">＋ كتاب جديد</button>
      </nb-page-header>

      @if (showBook()) {
        <section class="form-card">
          <header class="fc-head">
            <h3>كتاب جديد</h3>
            <button class="x" (click)="showBook.set(false)" aria-label="إغلاق">✕</button>
          </header>
          <div class="fc-body">
            <div class="fields">
              <label class="wide">
                <span>عنوان الكتاب <i>*</i></span>
                <input [(ngModel)]="book.title_ar" placeholder="المدخل الشامل للبرمجة" />
              </label>
              <label>
                <span>التصنيف <i>*</i></span>
                <select [(ngModel)]="book.category">
                  <option value="">اختر…</option>
                  @for (c of categories(); track c.id) { <option [value]="c.id">{{ c.name_ar }}</option> }
                </select>
              </label>
              <label>
                <span>اللغة <i>*</i></span>
                <select [(ngModel)]="book.language">
                  <option value="">اختر…</option>
                  @for (l of languages(); track l.id) { <option [value]="l.id">{{ l.name_ar }}</option> }
                </select>
              </label>
              <label>
                <span>دار النشر <i>*</i></span>
                <select [(ngModel)]="book.publisher">
                  <option value="">اختر…</option>
                  @for (p of publishers(); track p.id) { <option [value]="p.id">{{ p.name_ar }}</option> }
                </select>
              </label>
              <label class="wide">
                <span>ملخّص</span>
                <input [(ngModel)]="book.summary" placeholder="نبذة موجزة عن محتوى الكتاب" />
              </label>
            </div>
            @if (error()) { <p class="err">{{ error() }}</p> }
          </div>
          <footer class="fc-acts">
            <button class="btn ghost" (click)="showBook.set(false)">إلغاء</button>
            <button class="btn primary" [disabled]="saving()" (click)="saveBook()">
              {{ saving() ? 'جارٍ الحفظ…' : 'إضافة الكتاب' }}
            </button>
          </footer>
        </section>
      }

      <div class="toolbar">
        <input class="search" [ngModel]="q()" (ngModelChange)="q.set($event)" placeholder="بحث بعنوان الكتاب…" />
      </div>

      @if (loading()) {
        <nb-loading message="جارٍ تحميل الكتالوج…"></nb-loading>
      } @else if (!filtered().length) {
        <div class="empty-card">لا توجد كتب مطابقة.</div>
      } @else {
        <section class="grid">
          @for (b of filtered(); track b.id) {
            <article class="bk">
              <header class="bk-head">
                <strong>{{ b.title }}</strong>
                <span class="bk-cat">{{ b.category }}</span>
              </header>
              @if (b.summary) { <p class="bk-sum">{{ b.summary }}</p> }
              <div class="bk-copies">
                <div class="cp">
                  <span class="cp-val">{{ b.total }}</span>
                  <span class="cp-lbl">نسخة</span>
                </div>
                <div class="cp" [class.zero]="b.available === 0">
                  <span class="cp-val">{{ b.available }}</span>
                  <span class="cp-lbl">متاحة الآن</span>
                </div>
                <div class="cp">
                  <span class="cp-val">{{ b.borrowed }}</span>
                  <span class="cp-lbl">معارة</span>
                </div>
              </div>
              @if (b.barcodes.length) {
                <div class="bars">
                  @for (bc of b.barcodes; track bc.code) {
                    <span class="bar" [class.out]="bc.status !== 'available'" [title]="statusText(bc.status)">
                      {{ bc.code }}
                    </span>
                  }
                </div>
              }
            </article>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 22px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .btn { font-family: inherit; font-size: 13px; font-weight: 700; padding: 8px 14px;
      border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn:disabled { opacity: .55; cursor: default; }

    .toolbar { margin-bottom: 14px; }
    .search { width: 100%; max-width: 380px; height: 38px; padding: 0 12px; font-family: inherit;
      font-size: 13px; border: 1px solid var(--nb-border); border-radius: 8px;
      background: var(--nb-surface); color: var(--nb-text); }

    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 1000px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }

    .bk { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 15px 16px;
      display: flex; flex-direction: column; gap: 9px; }
    .bk-head { display: flex; flex-direction: column; gap: 2px; }
    .bk-head strong { font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .bk-cat { font-size: 11px; color: var(--nb-text-muted); }
    .bk-sum { margin: 0; font-size: 12px; color: var(--nb-text-muted);
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

    .bk-copies { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
      padding: 10px 0; border-block: 1px solid var(--nb-border-soft, #f0f1f5); }
    .cp { display: flex; flex-direction: column; gap: 1px; }
    .cp-val { font-size: 19px; font-weight: 800; color: var(--nb-text); line-height: 1.1;
      font-variant-numeric: tabular-nums; }
    .cp.zero .cp-val { color: #B91C1C; }
    .cp-lbl { font-size: 10.5px; color: var(--nb-text-muted); }

    .bars { display: flex; flex-wrap: wrap; gap: 5px; }
    .bar { font-family: ui-monospace, monospace; font-size: 10.5px;
      background: #f0fdf4; color: #15803D; border: 1px solid #bbf7d0;
      border-radius: 5px; padding: 2px 7px; }
    .bar.out { background: var(--nb-surface-raised); color: var(--nb-text-muted);
      border-color: var(--nb-border); text-decoration: line-through; }

    .form-card { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); overflow: hidden; margin-bottom: 14px; }
    .fc-head { display: flex; align-items: center; justify-content: space-between; padding: 13px 18px;
      background: var(--nb-primary-50, #f5f6ff); border-bottom: 1px solid var(--nb-primary-100, #e3e6fb); }
    .fc-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--nb-primary-800, #2a3178); }
    .x { border: none; background: none; font-size: 15px; color: var(--nb-text-muted); cursor: pointer; padding: 4px; }
    .fc-body { padding: 16px 18px; }
    .fc-acts { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px;
      background: var(--nb-surface-raised); border-top: 1px solid var(--nb-border); }

    .fields { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 800px) { .fields { grid-template-columns: 1fr; } }
    .fields .wide { grid-column: 1 / -1; }
    .fields label { display: grid; grid-template-rows: 18px auto; gap: 4px; }
    .fields label > span { font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .fields label i { color: #DC2626; font-style: normal; }
    .fields input, .fields select { height: 38px; padding: 0 11px; font-family: inherit; font-size: 13px;
      border: 1px solid var(--nb-border); border-radius: 8px; background: var(--nb-surface);
      color: var(--nb-text); width: 100%; box-sizing: border-box; }

    .err { margin: 12px 0 0; font-size: 12.5px; color: #B91C1C; background: #fef2f2;
      border: 1px solid #fecaca; border-radius: 8px; padding: 9px 12px; }
    .empty-card { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 30px; text-align: center;
      font-size: 13px; color: var(--nb-text-muted); }
  `],
})
export class LibraryCatalogComponent implements OnInit {
  private svc = inject(LibraryService);
  private router = inject(Router);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly showBook = signal(false);
  readonly q = signal('');

  private books = signal<any[]>([]);
  private copies = signal<any[]>([]);
  readonly categories = signal<any[]>([]);
  readonly languages = signal<any[]>([]);
  readonly publishers = signal<any[]>([]);

  book: any = { title_ar: '', category: '', language: '', publisher: '', summary: '' };

  readonly all = computed(() => {
    const catName = (id: string) => this.categories().find((c) => c.id === id)?.name_ar || '—';
    return this.books().map((b) => {
      const mine = this.copies().filter((c) => c.book === b.id);
      return {
        id: b.id,
        title: b.title_ar || b.title_en || 'كتاب',
        category: catName(b.category),
        summary: b.summary,
        total: mine.length,
        available: mine.filter((c) => c.status === 'available').length,
        borrowed: mine.filter((c) => c.status === 'borrowed').length,
        barcodes: mine.map((c) => ({ code: c.barcode, status: c.status })),
      };
    });
  });

  readonly filtered = computed(() => {
    const term = this.q().trim();
    return this.all().filter((b) => !term || b.title.includes(term));
  });

  statusText(s: string): string {
    return ({ available: 'متاحة', borrowed: 'معارة', lost: 'مفقودة', damaged: 'تالفة',
      reserved: 'محجوزة' } as any)[s] || s;
  }

  openBook() {
    this.book = { title_ar: '', category: '', language: '', publisher: '', summary: '' };
    this.error.set('');
    this.showBook.set(true);
  }

  saveBook() {
    const b = this.book;
    if (!b.title_ar?.trim() || !b.category || !b.language || !b.publisher) {
      this.error.set('العنوان والتصنيف واللغة ودار النشر حقول مطلوبة.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.svc.createBook({
      title_ar: b.title_ar.trim(),
      title_en: b.title_ar.trim(),
      category: b.category,
      language: b.language,
      publisher: b.publisher,
      summary: b.summary?.trim() || null,
    }).subscribe({
      next: () => { this.saving.set(false); this.showBook.set(false); this.load(); },
      error: (e: any) => {
        this.saving.set(false);
        const d = e?.details?.error ?? e?.details;
        this.error.set(typeof d === 'string' ? d : (e?.message || 'تعذّر حفظ الكتاب.'));
      },
    });
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const rows = (d: any) => (Array.isArray(d) ? d : (d?.data ?? d?.results ?? []));
    this.svc.getBooks().subscribe({
      next: (d) => { this.books.set(rows(d)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.svc.getCopies().subscribe({ next: (d) => this.copies.set(rows(d)), error: () => {} });
    this.svc.getCategories().subscribe({ next: (d) => this.categories.set(rows(d)), error: () => {} });
    this.svc.getLanguages().subscribe({ next: (d) => this.languages.set(rows(d)), error: () => {} });
    this.svc.getPublishers().subscribe({ next: (d) => this.publishers.set(rows(d)), error: () => {} });
  }

  back() { this.router.navigateByUrl('/library/dashboard'); }
}
