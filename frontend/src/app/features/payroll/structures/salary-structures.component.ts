import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { NotificationService } from '../../../core/services/notification.service';

interface Employee {
  id: string;
  full_name_ar: string;
  department: string;
  position: string;
  salary?: string | number;
  allowance?: string | number;
}

interface SalaryStructure {
  id?: string;
  employee: string;
  basic_salary: string;
  housing_allowance: string;
  transport_allowance: string;
  other_allowances: string; // الحوافز والمكافآت
  is_active: boolean;
}

@Component({
  selector: 'app-salary-structures',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DecimalPipe, FormsModule, NbPageHeaderComponent, NbPanelComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="هياكل الرواتب والحوافز" subtitle="إدارة ومتابعة الأجور والبدلات للموظفين مع تخصيص الحوافز والمكافآت التشجيعية.">
        <div class="header-actions">
          <button class="nb-btn-secondary" (click)="printPage()">🖨️ طباعة الكشف</button>
          <button class="nb-btn-secondary" (click)="exportCSV()">📥 تصدير البيانات</button>
          <button class="nb-btn-primary" (click)="goBack()">العودة للوحة التحكم</button>
        </div>
      </nb-page-header>

      @if (loading()) {
        <nb-loading message="جاري تحميل كادر الموظفين وهياكل الرواتب..."></nb-loading>
      }

      <div class="table-container animate-fade">
        <nb-panel title="جدول الرواتب والأجور المعتمد" subtitle="اضغط على أي موظف لتعديل الحوافز والمكافآت الخاصة به.">
          <div class="search-bar">
            <input type="text" placeholder="البحث باسم الموظف، القسم، أو المسمى الوظيفي..." [(ngModel)]="searchQuery" (input)="filterEmployees()" />
          </div>

          <div class="table-responsive">
            <table class="nb-table">
              <thead>
                <tr>
                  <th>الموظف</th>
                  <th>القسم / الوظيفة</th>
                  <th>الراتب الأساسي (من HR)</th>
                  <th>البدلات المعتمدة</th>
                  <th>الحوافز والمكافآت (تعديل)</th>
                  <th>إجمالي الراتب</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                @for (emp of filteredEmployees(); track emp.id) {
                  @let struct = getEmpStructure(emp.id);
                  <tr (click)="selectEmployee(emp)" class="clickable-row" [class.selected]="selectedEmpId() === emp.id">
                    <td class="font-bold">{{ emp.full_name_ar }}</td>
                    <td>
                      <span class="position-tag">{{ emp.position }}</span>
                      <span class="dept-tag">{{ emp.department }}</span>
                    </td>
                    <td class="numeric">{{ (Number(struct.basic_salary) | number:'1.0-0') }} ج.س</td>
                    <td class="numeric">{{ (Number(struct.housing_allowance) + Number(struct.transport_allowance) | number:'1.0-0') }} ج.س</td>
                    <td class="numeric incentive-cell">
                      ✨ {{ (Number(struct.other_allowances) | number:'1.0-0') }} ج.س
                    </td>
                    <td class="numeric font-bold highlight">
                      {{ (Number(struct.basic_salary) + Number(struct.housing_allowance) + Number(struct.transport_allowance) + Number(struct.other_allowances) | number:'1.0-0') }} ج.س
                    </td>
                    <td>
                      <button class="action-btn" (click)="selectEmployee(emp); $event.stopPropagation()">⚙️ الحوافز</button>
                    </td>
                  </tr>
                }
                @if (filteredEmployees().length === 0) {
                  <tr>
                    <td colspan="7" class="text-center pad-20">لا يوجد موظفون مطهرون في النظام.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </nb-panel>
      </div>

      <!-- لوحة التفاصيل الجانبية (Drawer Panel) لتعديل الحوافز والمكافآت -->
      @if (selectedEmp()) {
        <div class="drawer-overlay" (click)="closeDrawer()">
          <div class="drawer" (click)="$event.stopPropagation()">
            <div class="drawer-header">
              <h3>تعديل حوافز الموظف</h3>
              <button class="close-btn" (click)="closeDrawer()">×</button>
            </div>
            
            <div class="drawer-body">
              <div class="emp-profile-summary">
                <div class="avatar">👤</div>
                <h4>{{ selectedEmp()?.full_name_ar }}</h4>
                <p>{{ selectedEmp()?.position }} — {{ selectedEmp()?.department }}</p>
              </div>

              <form (submit)="saveStructure($event)" class="structure-form">
                <div class="section-divider">💳 الأجور الأساسية والبدلات (للقراءة فقط - تُعدل من الموارد البشرية)</div>
                
                <div class="field disabled-field">
                  <label>الراتب الأساسي (ج.س) 🔒</label>
                  <input type="number" [value]="struct.basic_salary" readonly disabled />
                  <span class="hint-text">يُعدل هذا الحقل حصراً من ملف الموظف في الموارد البشرية.</span>
                </div>

                <div class="field disabled-field">
                  <label>بدل السكن شهرياً (ج.س) 🔒</label>
                  <input type="number" [value]="struct.housing_allowance" readonly disabled />
                </div>

                <div class="field disabled-field">
                  <label>بدل الانتقال/المواصلات (ج.س) 🔒</label>
                  <input type="number" [value]="struct.transport_allowance" readonly disabled />
                </div>

                <div class="section-divider incentives-header">✨ الحوافز والمكافآت التشجيعية (قابل للتعديل)</div>
                <p class="incentives-desc">أدخل الحوافز الإضافية وعلاوات الأداء الشهري التي ستصرف للموظف مع الراتب الحالي.</p>
                
                <div class="field highlight-field">
                  <label>قيمة الحوافز والمكافآت (ج.س)</label>
                  <input type="number" class="incentive-input" [(ngModel)]="struct.other_allowances" name="other_allowances" required min="0" placeholder="مثال: 50000" />
                </div>

                <div class="form-actions">
                  <button type="submit" class="nb-btn-primary submit-btn" [disabled]="saving()">
                    {{ saving() ? 'جاري حفظ التعديلات…' : 'حفظ واعتماد الحوافز ✓' }}
                  </button>
                  <button type="button" class="nb-btn-secondary cancel-btn" (click)="closeDrawer()">إلغاء</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-background); font-family: var(--nb-font-family); }
    .header-actions { display: flex; gap: 8px; align-items: center; }

    .search-bar { margin-bottom: 16px; }
    .search-bar input {
      width: 100%;
      height: 40px;
      padding: 0 14px;
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
      font-family: var(--nb-font-family);
      font-size: 13.5px;
      background: var(--nb-surface);
      color: var(--nb-text);
      outline: none;
      transition: all 0.2s;
    }
    .search-bar input:focus { border-color: var(--nb-primary-600); box-shadow: var(--nb-focus-ring); }

    .table-responsive { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; text-align: start; font-size: 13px; }
    .nb-table th, .nb-table td { padding: 12px 16px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table th { font-weight: 700; color: var(--nb-text-muted); background: var(--nb-surface-raised); text-transform: uppercase; font-size: 12px; }
    
    .clickable-row { cursor: pointer; transition: background 0.15s; }
    .clickable-row:hover { background: var(--nb-surface-raised); }
    .clickable-row.selected { background: var(--nb-primary-50); }

    .position-tag { display: inline-block; font-weight: 600; font-size: 11px; background: #e3f2fd; color: #0d47a1; padding: 2px 6px; border-radius: 4px; margin-left: 6px; }
    .dept-tag { display: inline-block; font-size: 11px; background: #f5f5f5; color: #616161; padding: 2px 6px; border-radius: 4px; }

    .numeric { text-align: left; font-variant-numeric: tabular-nums; }
    .incentive-cell { color: #f57c00; font-weight: 700; }
    .highlight { color: var(--nb-primary-700); }

    .font-bold { font-weight: 700; }
    .text-center { text-align: center; }
    .pad-20 { padding: 20px; color: var(--nb-text-faint); }

    .action-btn {
      padding: 4px 10px;
      font-size: 11.5px;
      font-weight: 600;
      background: var(--nb-surface-raised);
      border: 1px solid var(--nb-border);
      color: var(--nb-text);
      border-radius: 4px;
      cursor: pointer;
      font-family: var(--nb-font-family);
    }
    .action-btn:hover { background: var(--nb-border-soft); border-color: var(--nb-primary-400); }

    /* Drawer Styles */
    .drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; justify-content: flex-end; animation: fadeIn 0.2s ease; }
    .drawer { width: 420px; background: var(--nb-surface); height: 100%; box-shadow: -4px 0 24px rgba(0,0,0,0.15); display: flex; flex-direction: column; animation: slideIn 0.25s ease-out; }
    
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

    .drawer-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid var(--nb-border-soft); }
    .drawer-header h3 { margin: 0; font-size: 15px; color: var(--nb-text); }
    .close-btn { background: none; border: none; font-size: 24px; color: var(--nb-text-muted); cursor: pointer; line-height: 1; }

    .drawer-body { padding: 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 20px; }
    
    .emp-profile-summary { text-align: center; padding-bottom: 16px; border-bottom: 1px solid var(--nb-border-soft); }
    .emp-profile-summary .avatar { font-size: 32px; width: 64px; height: 64px; border-radius: 50%; background: var(--nb-primary-50); color: var(--nb-primary-700); display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; }
    .emp-profile-summary h4 { margin: 0 0 4px; font-size: 14.5px; color: var(--nb-text); }
    .emp-profile-summary p { margin: 0; font-size: 12px; color: var(--nb-text-muted); }

    .section-divider {
      font-size: 12px;
      font-weight: 700;
      color: var(--nb-text-muted);
      margin: 16px 0 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--nb-border-soft);
      text-transform: uppercase;
    }
    .incentives-header { color: #f57c00; border-color: #ffe0b2; }
    .incentives-desc { font-size: 11.5px; color: var(--nb-text-muted); margin: -4px 0 12px; line-height: 1.4; }

    .structure-form { display: flex; flex-direction: column; gap: 14px; }
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
    
    .disabled-field input { background: var(--nb-surface-raised) !important; color: var(--nb-text-muted) !important; border-color: var(--nb-border-soft) !important; cursor: not-allowed; }
    .hint-text { font-size: 10.5px; color: var(--nb-text-faint); margin-top: 2px; }

    .highlight-field { background: #fff8e1; border: 1px dashed #ffe082; border-radius: var(--nb-radius); padding: 12px; }
    .incentive-input { background: white !important; border-color: #ffd54f !important; font-weight: 700; color: #b78103 !important; }
    
    .form-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
    .submit-btn { flex: 1; }

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

    .animate-fade { animation: fadeIn 0.3s ease-out; }
  `]
})
export class SalaryStructuresComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  protected readonly Number = Number;

  readonly employees = signal<Employee[]>([]);
  readonly filteredEmployees = signal<Employee[]>([]);
  readonly structuresMap = signal<Map<string, SalaryStructure>>(new Map());
  readonly selectedEmpId = signal<string | null>(null);
  readonly selectedEmp = signal<Employee | null>(null);
  
  readonly saving = signal(false);
  readonly loading = signal(false);

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
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}employees/employees/`).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.employees.set(res.data);
          this.filteredEmployees.set(res.data);
          this.loadAllStructures();
        } else {
          this.loading.set(false);
        }
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  loadAllStructures() {
    this.http.get<any>(`${environment.apiUrl}payroll/salary-structures/`).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res && res.success) {
          const map = new Map<string, SalaryStructure>();
          res.data.forEach((s: any) => {
            map.set(s.employee, {
              id: s.id,
              employee: s.employee,
              basic_salary: String(s.basic_salary),
              housing_allowance: String(s.housing_allowance),
              transport_allowance: String(s.transport_allowance),
              other_allowances: String(s.other_allowances),
              is_active: s.is_active
            });
          });
          this.structuresMap.set(map);
        }
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  getEmpStructure(empId: string): SalaryStructure {
    const map = this.structuresMap();
    if (map.has(empId)) {
      return map.get(empId)!;
    }
    // Fallback using employee HR salary values if no structure exists in DB
    const emp = this.employees().find(e => e.id === empId);
    return {
      employee: empId,
      basic_salary: emp && emp.salary ? String(emp.salary) : '250000',
      housing_allowance: '50000',
      transport_allowance: '20000',
      other_allowances: emp && emp.allowance ? String(emp.allowance) : '0',
      is_active: true
    };
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
    this.struct = this.getEmpStructure(emp.id);
  }

  closeDrawer() {
    this.selectedEmpId.set(null);
    this.selectedEmp.set(null);
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
          this.closeDrawer();
          this.loadEmployees(); // Reload to refresh grid
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

  exportCSV() {
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += 'اسم الموظف,القسم,الوظيفة,الراتب الأساسي,البدلات,الحوافز والمكافآت,إجمالي الراتب\n';

    this.filteredEmployees().forEach(emp => {
      const s = this.getEmpStructure(emp.id);
      const total = Number(s.basic_salary) + Number(s.housing_allowance) + Number(s.transport_allowance) + Number(s.other_allowances);
      csvContent += `"${emp.full_name_ar}","${emp.department}","${emp.position}",${s.basic_salary},${Number(s.housing_allowance) + Number(s.transport_allowance)},${s.other_allowances},${total}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `كشف_الرواتب_والحوافز_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  printPage() {
    window.print();
  }

  goBack() {
    this.router.navigate(['/payroll/dashboard']);
  }
}
