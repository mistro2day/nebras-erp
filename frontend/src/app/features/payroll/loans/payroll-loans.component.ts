import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NotificationService } from '../../../core/services/notification.service';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';

interface Employee {
  id: string;
  full_name_ar: string;
}

interface Loan {
  id: string;
  employee: string;
  employee_name?: string;
  loan_amount: string;
  monthly_installment: string;
  remaining_balance: string;
  status: 'pending' | 'approved' | 'paid' | 'settled';
  deduction_start_month?: string;
  skipped_months?: string;
}

@Component({
  selector: 'app-payroll-loans',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DecimalPipe, FormsModule, NbPageHeaderComponent, NbPanelComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="السلف والقروض المدرسية" subtitle="إدارة طلبات السلف والقروض والأقساط الشهرية الخاصة بكادر المدرسة.">
        <button class="nb-btn-secondary" (click)="goBack()">العودة للوحة التحكم</button>
      </nb-page-header>

      <div class="loans-layout">
        <!-- جدول القروض الحالية -->
        <div class="table-panel">
          <nb-panel title="سجل السلف والقروض النشطة" subtitle="تفاصيل السلف القائمة والأقساط المستقطعة الشهرية.">
            @if (loading()) {
              <nb-loading message="جاري تحميل سجل السلف والقروض..."></nb-loading>
            }
            <div class="table-responsive">
              <table class="nb-table">
                <thead>
                  <tr>
                    <th>الموظف</th>
                    <th>مبلغ القرض/السلفة</th>
                    <th>القسط الشهري</th>
                    <th>الرصيد المتبقي</th>
                    <th>بدء الخصم</th>
                    <th>أشهر التخطي</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  @for (loan of loans(); track loan.id) {
                    <tr>
                      <td class="font-bold">{{ loan.employee_name || 'موظف نبراس' }}</td>
                      <td>{{ (Number(loan.loan_amount) | number:'1.0-0') }} ج.س</td>
                      <td>{{ (Number(loan.monthly_installment) | number:'1.0-0') }} ج.س</td>
                      <td class="font-bold highlight">{{ (Number(loan.remaining_balance) | number:'1.0-0') }} ج.س</td>
                      <td>{{ loan.deduction_start_month || 'فوري' }}</td>
                      <td>
                        <span class="text-warning font-bold" [title]="loan.skipped_months || ''">
                          {{ loan.skipped_months || 'لا يوجد' }}
                        </span>
                      </td>
                      <td>
                        <span class="badge" [class]="loan.status">{{ getStatusLabel(loan.status) }}</span>
                      </td>
                      <td>
                        @if (loan.status === 'pending') {
                          <div class="action-buttons">
                            <button class="action-btn approve" (click)="approveLoan(loan.id)">اعتماد</button>
                            <button class="action-btn reject" (click)="rejectLoan(loan.id)">رفض</button>
                          </div>
                        } @else {
                          <span class="text-faint">—</span>
                        }
                      </td>
                    </tr>
                  }
                  @if (loans().length === 0) {
                    <tr>
                      <td colspan="6" class="text-center pad-20">لا توجد قروض أو سلف مسجلة حالياً.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </nb-panel>
        </div>

        <!-- طلب سلفة جديدة -->
        <div class="form-panel">
          <nb-panel title="تسجيل طلب سلفة جديد" subtitle="إدخال طلب سلفة وجدولة الأقساط الشهرية للموظف.">
            <form (submit)="submitLoan($event)" class="loan-form">
              <div class="field req search-dropdown-container">
                <label>اختر الموظف المستفيد</label>
                <div class="search-input-wrapper">
                  <input 
                    type="text" 
                    placeholder="ابحث عن اسم الموظف..." 
                    [value]="selectedEmployeeName()"
                    (focus)="showDropdown.set(true)"
                    (input)="onSearchInput($event)"
                  />
                  @if (showDropdown() && filteredEmployees().length > 0) {
                    <div class="dropdown-list">
                      @for (emp of filteredEmployees(); track emp.id) {
                        <div class="dropdown-item" (click)="selectEmployee(emp)">
                          {{ emp.full_name_ar }}
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>

              <div class="field req">
                <label>مبلغ القرض/السلفة (ج.س)</label>
                <input type="number" [(ngModel)]="newLoan.loan_amount" name="loan_amount" required min="1" />
              </div>

              <div class="field req">
                <label>القسط الشهري المستقطع (ج.س)</label>
                <input type="number" [(ngModel)]="newLoan.monthly_installment" name="monthly_installment" required min="1" />
              </div>

              <div class="field">
                <label>شهر بدء الخصم (مثال: 2026-08)</label>
                <input type="month" [(ngModel)]="newLoan.deduction_start_month" name="deduction_start_month" placeholder="YYYY-MM" />
              </div>

              <div class="field">
                <label>تخطي أقساط أشهر معينة (مفصولة بفاصلة)</label>
                <input type="text" [(ngModel)]="newLoan.skipped_months" name="skipped_months" placeholder="مثال: 2026-10, 2026-12" />
              </div>

              <button type="submit" class="nb-btn-primary submit-btn" [disabled]="submitting()">
                {{ submitting() ? 'جاري تقديم الطلب…' : 'تسجيل واعتماد الطلب ✓' }}
              </button>
            </form>
          </nb-panel>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-background); font-family: var(--nb-font-family); }
    .loans-layout { display: grid; grid-template-columns: 1fr 340px; gap: 20px; margin-top: 10px; }
    @media (max-width: 950px) { .loans-layout { grid-template-columns: 1fr; } }

    .table-responsive { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; text-align: start; font-size: 13px; }
    .nb-table th, .nb-table td { padding: 12px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table th { font-weight: 700; color: var(--nb-text-muted); background: var(--nb-surface-raised); }
    .nb-table td.highlight { color: var(--nb-primary-700); }

    .font-bold { font-weight: 700; }
    .text-center { text-align: center; }
    .pad-20 { padding: 20px; color: var(--nb-text-faint); }
    .text-faint { color: var(--nb-text-faint); }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      font-size: 10.5px;
      font-weight: 700;
      border-radius: 12px;
      line-height: 1;
    }
    .badge.pending { background: #fff3e0; color: #e65100; }
    .badge.approved { background: #e8f5e9; color: #2e7d32; }
    .badge.paid { background: #e3f2fd; color: #0d47a1; }
    .badge.settled { background: #eceff1; color: #37474f; }

    .action-buttons { display: flex; gap: 6px; }
    .action-btn {
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 600;
      border-radius: 4px;
      cursor: pointer;
      border: none;
      font-family: var(--nb-font-family);
    }
    .action-btn.approve { background: var(--nb-primary-50); color: var(--nb-primary-700); }
    .action-btn.approve:hover { background: var(--nb-primary-100); }
    .action-btn.reject { background: #ffebee; color: #c62828; }
    .action-btn.reject:hover { background: #ffcdd2; }

    .loan-form { display: flex; flex-direction: column; gap: 14px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
    .field select, .field input {
      height: 38px;
      padding: 0 10px;
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius);
      font-family: var(--nb-font-family);
      font-size: 13px;
      background: var(--nb-surface);
      color: var(--nb-text);
      outline: none;
    }
    .field select:focus, .field input:focus { border-color: var(--nb-primary-600); }
    .field.req label::after { content: ' *'; color: var(--nb-danger, #ff3b30); }

    .submit-btn { width: 100%; margin-top: 6px; }

    .nb-btn-primary, .nb-btn-secondary {
      height: 38px;
      padding: 0 16px;
      font-family: var(--nb-font-family);
      font-size: 12.5px;
      font-weight: 600;
      border-radius: var(--nb-radius);
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .nb-btn-primary { background: var(--nb-primary-600); color: white; }
    .nb-btn-primary:hover:not(:disabled) { background: var(--nb-primary-700); }
    .nb-btn-secondary { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .nb-btn-secondary:hover:not(:disabled) { background: var(--nb-border-soft); }
    .nb-btn-primary:disabled, .nb-btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }

    /* Searchable dropdown */
    .search-dropdown-container { position: relative; }
    .search-input-wrapper { position: relative; }
    .dropdown-list {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius);
      max-height: 200px;
      overflow-y: auto;
      z-index: 100;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      margin-top: 4px;
    }
    .dropdown-item {
      padding: 8px 12px;
      cursor: pointer;
      font-size: 13px;
      color: var(--nb-text);
      transition: background 0.15s;
    }
    .dropdown-item:hover { background: var(--nb-primary-50); color: var(--nb-primary-700); }
  `]
})
export class PayrollLoansComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  protected readonly Number = Number;

  readonly loans = signal<Loan[]>([]);
  readonly employees = signal<Employee[]>([]);
  readonly submitting = signal(false);
  readonly loading = signal(false);

  readonly employeeSearchQuery = signal('');
  readonly showDropdown = signal(false);
  readonly selectedEmployeeName = signal('');


  readonly filteredEmployees = computed(() => {
    const q = this.employeeSearchQuery().trim().toLowerCase();
    if (!q) return this.employees();
    return this.employees().filter(e => e.full_name_ar.toLowerCase().includes(q));
  });

  newLoan = {
    employee: '',
    loan_amount: null as number | null,
    monthly_installment: null as number | null,
    deduction_start_month: '',
    skipped_months: ''
  };

  ngOnInit() {
    this.loadLoans();
    this.loadEmployees();
  }

  loadLoans() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}payroll/loans/`).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res && res.success) {
          const rawLoans = res.data;
          this.loans.set(rawLoans);
          this.fetchEmployeeNamesForLoans(rawLoans);
        }
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  loadEmployees() {
    this.http.get<any>(`${environment.apiUrl}employees/employees/`).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.employees.set(res.data);
        }
      }
    });
  }

  onSearchInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.employeeSearchQuery.set(val);
    this.selectedEmployeeName.set(val);
    this.showDropdown.set(true);
  }

  selectEmployee(emp: Employee) {
    this.newLoan.employee = emp.id;
    this.selectedEmployeeName.set(emp.full_name_ar);
    this.showDropdown.set(false);
  }

  fetchEmployeeNamesForLoans(rawLoans: any[]) {
    const empIds = Array.from(new Set(rawLoans.map(l => l.employee)));
    if (empIds.length === 0) return;

    this.http.get<any>(`${environment.apiUrl}employees/employees/`).subscribe({
      next: (res) => {
        if (res && res.success) {
          const empMap = new Map<string, string>();
          res.data.forEach((e: any) => empMap.set(e.id, e.full_name_ar));
          
          this.loans.update(current => 
            current.map(l => ({
              ...l,
              employee_name: empMap.get(l.employee) || 'موظف نبراس'
            }))
          );
        }
      }
    });
  }

  submitLoan(event: Event) {
    event.preventDefault();
    if (!this.newLoan.employee || !this.newLoan.loan_amount || !this.newLoan.monthly_installment) {
      this.notify.error('يرجى تعبئة كافة الحقول المطلوبة للسلفة.');
      return;
    }

    this.submitting.set(true);
    const payload = {
      employee: this.newLoan.employee,
      loan_amount: String(this.newLoan.loan_amount),
      monthly_installment: String(this.newLoan.monthly_installment),
      remaining_balance: String(this.newLoan.loan_amount),
      deduction_start_month: this.newLoan.deduction_start_month || '',
      skipped_months: this.newLoan.skipped_months || '',
      status: 'pending'
    };

    this.http.post<any>(`${environment.apiUrl}payroll/loans/`, payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res && res.success) {
          this.notify.success('تم تسجيل طلب السلفة/القرض بنجاح وبانتظار الاعتماد المالي.');
          this.newLoan = { employee: '', loan_amount: null, monthly_installment: null, deduction_start_month: '', skipped_months: '' };
          this.selectedEmployeeName.set('');
          this.employeeSearchQuery.set('');
          this.loadLoans();
        } else {
          this.notify.error(res?.message || 'حدث خطأ أثناء تسجيل طلب السلفة.');
        }
      },
      error: () => {
        this.submitting.set(false);
        this.notify.error('فشل الاتصال بالخادم لتسجيل طلب السلفة.');
      }
    });
  }

  approveLoan(loanId: string) {
    this.http.patch<any>(`${environment.apiUrl}payroll/loans/${loanId}/`, { status: 'approved' }).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.notify.success('تم اعتماد السلفة/القرض بنجاح وتفعيل جدول السداد.');
          this.loadLoans();
        } else {
          this.notify.error('فشل اعتماد السلفة.');
        }
      }
    });
  }

  rejectLoan(loanId: string) {
    this.http.patch<any>(`${environment.apiUrl}payroll/loans/${loanId}/`, { status: 'settled' }).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.notify.success('تم إلغاء/رفض السلفة بنجاح.');
          this.loadLoans();
        } else {
          this.notify.error('فشل إلغاء السلفة.');
        }
      }
    });
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'approved': return 'معتمد وسارٍ';
      case 'paid': return 'مدفوع';
      case 'settled': return 'ملغى / مسوى';
      default: return status;
    }
  }

  goBack() {
    this.router.navigate(['/payroll/dashboard']);
  }
}
