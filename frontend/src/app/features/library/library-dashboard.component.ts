import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LibraryService } from './library.service';
import { StudentsService } from '../students/students.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../shared/nebras/nb-stat-card.component';
import { NbModalComponent } from '../../shared/nebras/nb-modal.component';

@Component({
  selector: 'app-library-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    NbPageHeaderComponent,
    NbPanelComponent,
    NbStatCardComponent,
    NbModalComponent
  ],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="منصة إدارة المكتبات ومصادر التعلم"
        subtitle="فهرس الكتب والمصنفات، الاستعارات النشطة، الغرامات المحتسبة، والكتب الرقمية"
      >
        <div class="actions-group">
          <button class="nb-btn-primary" (click)="openBorrowModal()">📖 استعارة كتاب</button>
          <button class="nb-btn-secondary" (click)="loadDashboard()">🔄 تحديث البيانات</button>
        </div>
      </nb-page-header>

      @if (libraryService.stats(); as stats) {
        <div class="stats-grid">
          <nb-stat-card label="إجمالي العناوين" [value]="stats.total_books" suffix="عنوان"></nb-stat-card>
          <nb-stat-card label="الكتب المستعارة حالياً" [value]="stats.borrowed_copies" suffix="نسخة" valueKind="warning"></nb-stat-card>
          <nb-stat-card label="المصادر والمراجع الرقمية" [value]="stats.digital_resources" suffix="رقمي" valueKind="success"></nb-stat-card>
          <nb-stat-card label="الغرامات غير المدفوعة" [value]="(stats.unpaid_fines | currency:'SAR ':'symbol':'1.2-2') || '0.00'" [valueKind]="stats.unpaid_fines ? 'danger' : 'default'"></nb-stat-card>
        </div>
      }

      <!-- ألسنة التبويب التفاعلية -->
      <div class="tabs-container">
        <div class="tabs-header">
          <button class="tab-btn" [class.active]="activeTab() === 'catalog'" (click)="activeTab.set('catalog')">📚 فهرس الكتب والمؤلفات</button>
          <button class="tab-btn" [class.active]="activeTab() === 'borrows'" (click)="activeTab.set('borrows')">🔄 الاستعارات النشطة</button>
          <button class="tab-btn" [class.active]="activeTab() === 'fines'" (click)="activeTab.set('fines')">⚠️ الغرامات والرسوم</button>
        </div>

        <div class="tab-content">
          <!-- ألسنة التبويب: الفهرس -->
          @if (activeTab() === 'catalog') {
            <nb-panel title="فهرس الكتب والمؤلفات العامة" [flush]="true">
              <div class="tbl tbl-catalog">
                <div class="tbl-head">
                  <span>عنوان الكتاب بالعربي</span>
                  <span>العنوان بالإنجليزي</span>
                  <span>حالة النسخ</span>
                </div>
                @for (row of books(); track row.id) {
                  <div class="tbl-row">
                    <span class="strong">{{ row.title_ar }}</span>
                    <span>{{ row.title_en }}</span>
                    <span><span class="nb-badge-success">متاح</span></span>
                  </div>
                }
                @if (books().length === 0) { <div class="tbl-empty">لا توجد كتب مسجلة.</div> }
              </div>
            </nb-panel>
          }

          <!-- ألسنة التبويب: الاستعارات النشطة -->
          @if (activeTab() === 'borrows') {
            <nb-panel title="سجل الاستعارات النشطة والمعلقة" [flush]="true">
              <div class="tbl tbl-borrows">
                <div class="tbl-head">
                  <span>المستعير</span>
                  <span>نسخة الكتاب (Barcode)</span>
                  <span>تاريخ الاستحقاق</span>
                  <span>الإجراءات</span>
                </div>
                @for (row of borrows(); track row.id) {
                  <div class="tbl-row">
                    <span class="strong">{{ getStudentName(row.borrower_user_id) }}</span>
                    <span>{{ getCopyBarcode(row.copy) }}</span>
                    <span class="text-danger">{{ row.due_date }}</span>
                    <span>
                      @if (!row.actual_return_date) {
                        <button class="nb-btn-secondary nb-btn-compact" (click)="openReturnModal(row)">🔄 إرجاع</button>
                      } @else {
                        <span class="nb-badge-success">تم الإرجاع</span>
                      }
                    </span>
                  </div>
                }
                @if (borrows().length === 0) { <div class="tbl-empty">لا توجد استعارات معلقة.</div> }
              </div>
            </nb-panel>
          }

          <!-- ألسنة التبويب: الغرامات -->
          @if (activeTab() === 'fines') {
            <nb-panel title="سجل الغرامات المالية لمتأخرات الكتب" [flush]="true">
              <div class="tbl tbl-fines">
                <div class="tbl-head">
                  <span>المستعير</span>
                  <span>قيمة الغرامة</span>
                  <span>الحالة</span>
                </div>
                @for (row of fines(); track row.id) {
                  <div class="tbl-row">
                    <span class="strong">{{ getStudentName(getBorrowerFromTx(row.borrow_transaction)) }}</span>
                    <span class="text-danger strong">{{ row.fine_amount | currency:'SAR ':'symbol':'1.2-2' }}</span>
                    <span>
                      <span [class]="row.status === 'paid' ? 'nb-badge-success' : 'nb-badge-danger'">
                        {{ row.status === 'paid' ? 'مدفوعة' : 'غير مدفوعة' }}
                      </span>
                    </span>
                  </div>
                }
                @if (fines().length === 0) { <div class="tbl-empty">لا توجد غرامات مسجلة.</div> }
              </div>
            </nb-panel>
          }
        </div>
      </div>
    </div>

    <!-- نافذة استعارة كتاب جديدة -->
    <nb-modal [open]="isBorrowModalOpen()" title="📖 طلب استعارة نسخة كتاب فزيائية" subtitle="تسجيل المعاملة وتخصيص المدة الزمنية" (closed)="isBorrowModalOpen.set(false)">
      <div class="form-container">
        <div class="form-group" style="position: relative;">
          <label>البحث واختيار الطالب المستعير</label>
          <input type="text" [(ngModel)]="borrowerSearchQuery" (focus)="showBorrowerDropdown.set(true)" placeholder="اكتب اسم الطالب للبحث..." class="nb-input" />
          @if (showBorrowerDropdown()) {
            <div class="search-dropdown">
              @for (s of filteredStudents(borrowerSearchQuery); track s.id) {
                <div class="dropdown-item" (click)="selectBorrower(s)">
                  {{ s.profile.arabic_name }} ({{ s.student_number }})
                </div>
              }
              @if (filteredStudents(borrowerSearchQuery).length === 0) {
                <div class="dropdown-empty">لا توجد نتائج مطابقة</div>
              }
            </div>
          }
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>اختر نسخة الكتاب</label>
            <select [(ngModel)]="borrowData.copy_id" class="nb-input">
              <option value="">-- اختر نسخة كتاب --</option>
              @for (c of copies(); track c.id) {
                <option [value]="c.id">{{ c.barcode }} ({{ c.status === 'available' ? 'متاح' : 'مستعار' }})</option>
              }
            </select>
          </div>
          <div class="form-group">
            <label>مدة الاستعارة (أيام)</label>
            <input type="number" [(ngModel)]="borrowData.loan_period_days" min="1" max="60" class="nb-input" />
          </div>
        </div>
      </div>
      <div modal-actions>
        <button class="nb-btn-secondary" (click)="isBorrowModalOpen.set(false)">إلغاء</button>
        <button class="nb-btn-primary" (click)="submitBorrow()">تأكيد الاستعارة</button>
      </div>
    </nb-modal>

    <!-- نافذة إرجاع كتاب -->
    <nb-modal [open]="isReturnModalOpen()" title="🔄 إرجاع كتاب مستعار" subtitle="توثيق تاريخ الإرجاع واحتساب الغرامات التلقائي" (closed)="isReturnModalOpen.set(false)">
      <div class="form-container">
        <p class="summary-text">تأكيد إرجاع المعاملة الخاصة بالمستعير: <strong class="text-indigo">{{ getStudentName(selectedBorrowForReturn()?.borrower_user_id) }}</strong></p>
        <div class="form-group">
          <label>تاريخ الإرجاع الفعلي</label>
          <input type="date" [(ngModel)]="returnData.actual_return_date" class="nb-input" />
        </div>
      </div>
      <div modal-actions>
        <button class="nb-btn-secondary" (click)="isReturnModalOpen.set(false)">إلغاء</button>
        <button class="nb-btn-primary" (click)="submitReturn()">إرجاع الكتاب</button>
      </div>
    </nb-modal>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
    .actions-group { display: flex; gap: 8px; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .tabs-container { display: flex; flex-direction: column; gap: 12px; }
    .tabs-header { display: flex; gap: 8px; border-bottom: 1px solid var(--nb-border); padding-bottom: 4px; }
    .tab-btn {
      background: none;
      border: none;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      color: var(--nb-text-secondary);
      cursor: pointer;
      border-radius: var(--nb-radius) var(--nb-radius) 0 0;
      transition: all 0.15s ease;
      position: relative;
    }
    .tab-btn:hover { color: var(--nb-primary-600); background: var(--nb-primary-50); }
    .tab-btn.active {
      color: var(--nb-primary-600);
      background: var(--nb-surface);
      border-bottom: 2px solid var(--nb-primary-600);
    }
    
    .tbl { display: flex; flex-direction: column; }
    .tbl-head, .tbl-row {
      display: grid;
      gap: 8px;
      padding: 9px 16px;
      align-items: center;
    }
    .tbl-catalog .tbl-head, .tbl-catalog .tbl-row {
      grid-template-columns: 1.6fr 1.6fr 1fr;
    }
    .tbl-borrows .tbl-head, .tbl-borrows .tbl-row {
      grid-template-columns: 1.5fr 1.5fr 1fr 1fr;
    }
    .tbl-fines .tbl-head, .tbl-fines .tbl-row {
      grid-template-columns: 2fr 1fr 1fr;
    }
    .tbl-head {
      background: var(--nb-surface-raised);
      border-bottom: 1px solid var(--nb-border-soft);
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
    .text-danger { color: var(--nb-danger); }
    .text-indigo { color: var(--nb-primary-600); }
    .tbl-empty { padding: 28px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
    
    .nb-input {
      width: 100%;
      height: var(--nb-input-height);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius);
      padding: 0 10px;
      font-size: 13px;
      outline: none;
      background: var(--nb-surface);
      color: var(--nb-text);
      font-family: var(--nb-font-family);
    }
    .nb-input:focus { border-color: var(--nb-primary-600); box-shadow: var(--nb-focus-ring); }
    
    .form-container { display: flex; flex-direction: column; gap: 14px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group label { font-size: 11.5px; font-weight: 600; color: var(--nb-text-secondary); }
    
    .summary-text { font-size: 13px; color: var(--nb-text-secondary); margin-bottom: 8px; }
    
    .search-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius);
      box-shadow: var(--nb-shadow-dialog);
      z-index: 10;
      max-height: 180px;
      overflow-y: auto;
    }
    .dropdown-item {
      padding: 8px 12px;
      font-size: 13px;
      cursor: pointer;
      color: var(--nb-text);
      transition: background 0.15s ease;
    }
    .dropdown-item:hover {
      background: var(--nb-primary-50);
      color: var(--nb-primary-600);
    }
    .dropdown-empty {
      padding: 10px;
      font-size: 12px;
      color: var(--nb-text-muted);
      text-align: center;
    }
  `]
})
export class LibraryDashboardComponent implements OnInit {
  libraryService = inject(LibraryService);
  studentsService = inject(StudentsService);

  books = signal<any[]>([]);
  borrows = signal<any[]>([]);
  fines = signal<any[]>([]);
  copies = signal<any[]>([]);

  activeTab = signal<'catalog' | 'borrows' | 'fines'>('catalog');
  
  isBorrowModalOpen = signal(false);
  isReturnModalOpen = signal(false);
  selectedBorrowForReturn = signal<any | null>(null);

  borrowData = {
    borrower_user_id: '',
    copy_id: '',
    loan_period_days: 14
  };

  borrowerSearchQuery = '';
  showBorrowerDropdown = signal(false);

  returnData = {
    actual_return_date: new Date().toISOString().split('T')[0]
  };

  ngOnInit() {
    this.loadDashboard();
    this.loadMetadata();
  }

  loadDashboard() {
    this.libraryService.getDashboardStats().subscribe();
    this.libraryService.getBooks().subscribe(data => this.books.set(data));
    this.libraryService.getBorrowTransactions().subscribe(data => this.borrows.set(data));
    this.libraryService.getFines().subscribe(data => this.fines.set(data));
    this.studentsService.getStudents({ page_size: 500 }).subscribe();
  }

  loadMetadata() {
    this.libraryService.getCopies().subscribe(data => this.copies.set(data));
  }

  filteredStudents(query: string): any[] {
    const list = this.studentsService.students() || [];
    if (!query) return list;
    return list.filter(s => s.profile.arabic_name.includes(query) || s.student_number.includes(query));
  }

  selectBorrower(student: any) {
    this.borrowData.borrower_user_id = student.id;
    this.borrowerSearchQuery = `${student.profile.arabic_name} (${student.student_number})`;
    this.showBorrowerDropdown.set(false);
  }

  getStudentName(userId: string): string {
    const s = (this.studentsService.students() || []).find(st => st.id === userId);
    return s ? s.profile.arabic_name : (userId ? `${userId.slice(0, 8)}...` : 'غير معروف');
  }

  getCopyBarcode(copyId: string): string {
    const c = this.copies().find(cp => cp.id === copyId);
    return c ? c.barcode : (copyId ? `${copyId.slice(0, 8)}...` : 'غير معروف');
  }

  getBorrowerFromTx(txId: string): string {
    const tx = this.borrows().find(b => b.id === txId);
    return tx ? tx.borrower_user_id : '';
  }

  openBorrowModal() {
    this.borrowData = {
      borrower_user_id: '',
      copy_id: '',
      loan_period_days: 14
    };
    this.borrowerSearchQuery = '';
    this.showBorrowerDropdown.set(false);
    this.isBorrowModalOpen.set(true);
  }

  submitBorrow() {
    if (!this.borrowData.borrower_user_id || !this.borrowData.copy_id) return;
    this.libraryService.borrowBook(this.borrowData.copy_id, {
      borrower_user_id: this.borrowData.borrower_user_id,
      loan_period_days: this.borrowData.loan_period_days
    }).subscribe(() => {
      this.isBorrowModalOpen.set(false);
      this.loadDashboard();
    });
  }

  openReturnModal(borrow: any) {
    this.selectedBorrowForReturn.set(borrow);
    this.returnData = {
      actual_return_date: new Date().toISOString().split('T')[0]
    };
    this.isReturnModalOpen.set(true);
  }

  submitReturn() {
    const borrow = this.selectedBorrowForReturn();
    if (!borrow) return;
    this.libraryService.returnBook(borrow.id, {
      actual_return_date: this.returnData.actual_return_date
    }).subscribe(() => {
      this.isReturnModalOpen.set(false);
      this.loadDashboard();
    });
  }
}

