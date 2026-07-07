import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { LibraryService } from './library.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../shared/nebras/nb-stat-card.component';

/**
 * منصة المكتبات ومصادر التعلم — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-library-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="منصة إدارة المكتبات ومصادر التعلم"
        subtitle="فهرس الكتب والمصنفات، الاستعارات النشطة، الغرامات المحتسبة، والكتب الرقمية"
      >
        <button class="nb-btn-secondary" (click)="loadDashboard()">تحديث البيانات</button>
      </nb-page-header>

      @if (libraryService.stats(); as stats) {
        <div class="stats-grid">
          <nb-stat-card label="إجمالي العناوين" [value]="stats.total_books" suffix="عنوان"></nb-stat-card>
          <nb-stat-card label="الكتب المستعارة حالياً" [value]="stats.borrowed_copies" suffix="نسخة" valueKind="warning"></nb-stat-card>
          <nb-stat-card label="المصادر والمراجع الرقمية" [value]="stats.digital_resources" suffix="رقمي" valueKind="success"></nb-stat-card>
          <nb-stat-card label="الغرامات غير المدفوعة" [value]="(stats.unpaid_fines | currency:'SAR ':'symbol':'1.2-2') || '—'" [valueKind]="stats.unpaid_fines ? 'danger' : 'default'"></nb-stat-card>
        </div>
      }

      <nb-panel title="فهرس الكتب والمؤلفات العامة" [flush]="true">
        <div class="tbl">
          <div class="tbl-head">
            <span>عنوان الكتاب بالعربي</span><span>العنوان بالإنجليزي</span><span>رقم التصنيف</span>
          </div>
          @for (row of books; track row.id) {
            <div class="tbl-row">
              <span class="strong">{{ row.title_ar }}</span>
              <span>{{ row.title_en }}</span>
              <span class="strong">000 - عامة</span>
            </div>
          }
          @if (books.length === 0) { <div class="tbl-empty">لا توجد كتب مسجلة.</div> }
        </div>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .tbl { display: flex; flex-direction: column; }
    .tbl-head, .tbl-row {
      display: grid;
      grid-template-columns: 1.6fr 1.6fr 1fr;
      gap: 8px;
      padding: 9px 16px;
      align-items: center;
    }
    .tbl-head {
      background: var(--nb-surface-raised);
      border-bottom: 1px solid var(--nb-border-soft);
      padding: 8px 16px;
      font-size: 11px;
      font-weight: 700;
      color: var(--nb-text-muted);
    }
    .tbl-row {
      border-bottom: 1px solid var(--nb-border-row);
      font-size: 13px;
      color: var(--nb-text);
    }
    .tbl-row:last-child { border-bottom: none; }
    .tbl-row:hover { background: var(--nb-surface-raised); }
    .strong { font-weight: 600; }
    .tbl-empty { padding: 28px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
  `]
})
export class LibraryDashboardComponent implements OnInit {
  libraryService = inject(LibraryService);
  books: any[] = [];
  columns: string[] = ['title', 'title_en', 'category'];

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.libraryService.getDashboardStats().subscribe();
    this.libraryService.getBooks().subscribe(data => {
      this.books = data;
    });
  }
}
