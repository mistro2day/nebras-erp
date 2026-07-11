import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NotificationService } from '../../../core/services/notification.service';

interface Employee {
  id: string;
  full_name_ar: string;
  department: string;
  position: string;
}

interface SalaryStructure {
  id?: string;
  employee: string;
  basic_salary: string;
  housing_allowance: string;
  transport_allowance: string;
  other_allowances: string; // Incentives / الحوافز والمكافآت
  is_active: boolean;
}

@Component({
  selector: 'app-salary-structures',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DecimalPipe, FormsModule, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="هياكل الرواتب والحوافز" subtitle="إدارة الأجور الأساسية، البدلات السكنية والانتقالية، والحوافز والمكافآت التشجيعية للموظفين.">
        <button class="nb-btn-secondary" (click)="goBack()">العودة للوحة التحكم</button>
      </nb-page-header>

      <div class="structures-layout">
        <!-- دليل الموظفين لاختيار الهيكل -->
        <div class="employees-sidebar">
          <nb-panel title="الموظفون والكادر" subtitle="اختر الموظف لعرض وتعديل راتبه وحوافزه.">
            <div class="search-box">
              <input type="text" placeholder="البحث عن موظف..." [(ngModel)]="searchQuery" (input)="filterEmployees()" />
            </div>
            <div class="emp-list">
              @for (emp of filteredEmployees(); track emp.id) {
                <div 
                  class="emp-item" 
                  [class.active]="selectedEmpId() === emp.id"
                  (click)="selectEmployee(emp)"
                >
                  <div class="emp-name">{{ emp.full_name_ar }}</div>
                  <div class="emp-desc">{{ emp.position }} - {{ emp.department }}</div>
                </div>
              }
              @if (filteredEmployees().length === 0) {
                <div class="no-data">لا يوجد موظفون مطهرون.</div>
              }
            </div>
          </nb-panel>
        </div>

        <!-- تفاصيل الراتب وهيكل البدلات والحوافز -->
        <div class="details-area">
          @if (selectedEmp()) {
            <nb-panel 
              [title]="'هيكل أجور الموظف: ' + selectedEmp()?.full_name_ar"
              [subtitle]="(selectedEmp()?.position) + ' — قسم ' + (selectedEmp()?.department)"
            >
              <form (submit)="saveStructure($event)" class="structure-form">
                <div class="section-divider">💳 تفاصيل الأجور والبدلات الشهرية</div>
                
                <div class="form-grid">
                  <div class="field req">
                    <label>الراتب الأساسي (ج.س)</label>
                    <input type="number" [(ngModel)]="struct.basic_salary" name="basic_salary" required />
                  </div>

                  <div class="field">
                    <label>بدل السكن شهرياً (ج.س)</label>
                    <input type="number" [(ngModel)]="struct.housing_allowance" name="housing_allowance" />
                  </div>

                  <div class="field">
                    <label>بدل الانتقال/المواصلات (ج.س)</label>
                    <input type="number" [(ngModel)]="struct.transport_allowance" name="transport_allowance" />
                  </div>
                </div>

                <div class="section-divider incentives-header">✨ الحوافز والمكافآت التشجيعية (Incentives)</div>
                <div class="incentives-desc">الحوافز والمكافآت الإضافية التي تُضاف للموظف وتصرف تلقائياً مع الراتب الأساسي والبدلات.</div>
                
                <div class="form-grid">
                  <div class="field highlight-field">
                    <label>قيمة الحوافز الشهرية / مكافأة الأداء (ج.س)</label>
                    <input type="number" class="incentive-input" [(ngModel)]="struct.other_allowances" name="other_allowances" placeholder="أدخل الحوافز الإضافية إن وجدت" />
                  </div>
                </div>

                <div class="form-actions">
                  <button type="submit" class="nb-btn-primary" [disabled]="saving()">
                    {{ saving() ? 'جاري حفظ التعديلات…' : 'حفظ هيكل الرواتب والحوافز ✓' }}
                  </button>
                </div>
              </form>
            </nb-panel>
          } @else {
            <div class="select-prompt">
              <div class="icon">👥</div>
              <h4>الرجاء اختيار أحد الموظفين من القائمة الجانبية</h4>
              <p>اختر أي موظف لعرض وتخصيص هيكل راتبه الأساسي، البدلات السكنية، وحوافز الأداء المالي الخاصة به.</p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-background); font-family: var(--nb-font-family); }
    .structures-layout { display: grid; grid-template-columns: 320px 1fr; gap: 20px; margin-top: 10px; }
    @media (max-width: 900px) { .structures-layout { grid-template-columns: 1fr; } }

    .search-box { margin-bottom: 12px; }
    .search-box input {
      width: 100%;
      height: 36px;
      padding: 0 10px;
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius);
      font-family: var(--nb-font-family);
      font-size: 12.5px;
      background: var(--nb-surface);
      color: var(--nb-text);
      outline: none;
    }
    .search-box input:focus { border-color: var(--nb-primary-600); }

    .emp-list { display: flex; flex-direction: column; gap: 8px; max-height: 65vh; overflow-y: auto; }
    .emp-item {
      padding: 10px 12px;
      border: 1px solid var(--nb-border-soft);
      border-radius: var(--nb-radius);
      cursor: pointer;
      background: var(--nb-surface);
      transition: all 0.15s ease;
    }
    .emp-item:hover { background: var(--nb-surface-raised); border-color: var(--nb-primary-300); }
    .emp-item.active { background: var(--nb-primary-50); border-color: var(--nb-primary-600); }
    .emp-name { font-weight: 700; font-size: 13px; color: var(--nb-text); }
    .emp-desc { font-size: 11px; color: var(--nb-text-muted); margin-top: 2px; }

    .section-divider {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--nb-primary-700);
      margin: 20px 0 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--nb-border-soft);
    }
    .incentives-header { color: #f57c00; border-color: #ffe0b2; }
    .incentives-desc { font-size: 12px; color: var(--nb-text-muted); margin-bottom: 12px; }

    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
    .field input {
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
    .field input:focus { border-color: var(--nb-primary-600); }
    .field.req label::after { content: ' *'; color: var(--nb-danger, #ff3b30); }

    .highlight-field { grid-column: span 1; background: #fff8e1; border: 1px dashed #ffe082; border-radius: var(--nb-radius); padding: 12px; }
    .incentive-input { background: white !important; border-color: #ffd54f !important; font-weight: 700; color: #b78103 !important; }
    .incentive-input:focus { border-color: #ffb300 !important; box-shadow: 0 0 0 3px #fff8e1 !important; }

    .form-actions { margin-top: 24px; border-top: 1px solid var(--nb-border-soft); padding-top: 16px; text-align: end; }

    .select-prompt {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      color: var(--nb-text-muted);
      text-align: center;
    }
    .select-prompt .icon { font-size: 36px; margin-bottom: 12px; }
    .select-prompt h4 { margin: 0 0 6px; font-size: 15px; color: var(--nb-text); }
    .select-prompt p { margin: 0; font-size: 12.5px; color: var(--nb-text-faint); }

    .no-data { text-align: center; padding: 20px; color: var(--nb-text-faint); font-size: 12.5px; }

    .nb-btn-primary, .nb-btn-secondary {
      height: 38px;
      padding: 0 20px;
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
  `]
})
export class SalaryStructuresComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  readonly employees = signal<Employee[]>([]);
  readonly filteredEmployees = signal<Employee[]>([]);
  readonly selectedEmpId = signal<string | null>(null);
  readonly selectedEmp = signal<Employee | null>(null);
  readonly saving = signal(false);

  searchQuery = '';
  struct: SalaryStructure = {
    employee: '',
    basic_salary: '0',
    housing_allowance: '0',
    transport_allowance: '0',
    other_allowances: '0',
    is_active: true
  };

  ngOnInit() {
    this.loadEmployees();
  }

  loadEmployees() {
    this.http.get<any>(`${environment.apiUrl}employees/employees/`).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.employees.set(res.data);
          this.filteredEmployees.set(res.data);
        }
      }
    });
  }

  filterEmployees() {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredEmployees.set(this.employees());
    } else {
      this.filteredEmployees.set(
        this.employees().filter(e => 
          e.full_name_ar.toLowerCase().includes(q) || 
          e.position.toLowerCase().includes(q) || 
          e.department.toLowerCase().includes(q)
        )
      );
    }
  }

  selectEmployee(emp: Employee) {
    this.selectedEmpId.set(emp.id);
    this.selectedEmp.set(emp);
    this.loadStructure(emp.id);
  }

  loadStructure(empId: string) {
    this.http.get<any>(`${environment.apiUrl}payroll/salary-structures/?employee=${empId}`).subscribe({
      next: (res) => {
        if (res && res.success && res.data.length > 0) {
          this.struct = {
            id: res.data[0].id,
            employee: res.data[0].employee,
            basic_salary: String(res.data[0].basic_salary),
            housing_allowance: String(res.data[0].housing_allowance),
            transport_allowance: String(res.data[0].transport_allowance),
            other_allowances: String(res.data[0].other_allowances),
            is_active: res.data[0].is_active
          };
        } else {
          // Initialize default structure if not exists
          this.struct = {
            employee: empId,
            basic_salary: '250000',
            housing_allowance: '50000',
            transport_allowance: '20000',
            other_allowances: '0',
            is_active: true
          };
        }
      }
    });
  }

  saveStructure(event: Event) {
    event.preventDefault();
    this.saving.set(true);

    const payload = {
      employee: this.struct.employee,
      basic_salary: String(this.struct.basic_salary),
      housing_allowance: String(this.struct.housing_allowance || 0),
      transport_allowance: String(this.struct.transport_allowance || 0),
      other_allowances: String(this.struct.other_allowances || 0),
      is_active: this.struct.is_active
    };

    const request$ = this.struct.id 
      ? this.http.put<any>(`${environment.apiUrl}payroll/salary-structures/${this.struct.id}/`, payload)
      : this.http.post<any>(`${environment.apiUrl}payroll/salary-structures/`, payload);

    request$.subscribe({
      next: (res) => {
        this.saving.set(false);
        if (res && res.success) {
          this.notify.success('تم حفظ هيكل الرواتب وتوزيع البدلات والحوافز بنجاح.');
          this.loadStructure(this.struct.employee);
        } else {
          this.notify.error('فشل حفظ الهيكل الوظيفي المالي.');
        }
      },
      error: () => {
        this.saving.set(false);
        this.notify.error('فشل الاتصال بالخادم لحفظ هيكل الرواتب.');
      }
    });
  }

  goBack() {
    this.router.navigate(['/payroll/dashboard']);
  }
}
