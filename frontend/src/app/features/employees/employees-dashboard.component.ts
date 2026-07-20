import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { TenantService } from '../../core/services/tenant.service';
import { HttpClient } from '@angular/common/http';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../shared/nebras/nb-stat-card.component';

export interface EmployeeInfo {
  id: string;
  employee_number: string;
  full_name_ar: string;
  position: string;
  department: string;
  employment_type: string;
  status: string;
  email?: string;
}

/**
 * بوابة الموارد البشرية — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-employees-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="بوابة الموارد البشرية وإدارة الموظفين"
        [subtitle]="'لوحة تعقب الموظفين والإداريين الموحدة لـ ' + (($any(tenantService).currentTenant())?.nameAr || 'نبراس ERP')"
      ></nb-page-header>

      <div class="stats-grid">
        <nb-stat-card label="إجمالي الموظفين" [value]="employees().length"></nb-stat-card>
        <nb-stat-card label="الأقسام النشطة" [value]="5"></nb-stat-card>
      </div>

      <nb-panel title="سجل الموظفين الموحد" [flush]="true">
        <div class="tbl">
          <div class="tbl-head">
            <span>الرقم الوظيفي</span>
            <span>الاسم الكامل</span>
            <span>القسم</span>
            <span>المسمى الوظيفي</span>
            <span>نوع التوظيف</span>
            <span>الحالة</span>
            <span>الحساب</span>
          </div>
          @for (emp of employees(); track emp.id) {
            <div class="tbl-row">
              <span>{{ emp.employee_number }}</span>
              <span class="strong">{{ emp.full_name_ar }}</span>
              <span>{{ emp.department }}</span>
              <span>{{ emp.position }}</span>
              <span>{{ emp.employment_type }}</span>
              <span>
                <span [class]="emp.status === 'active' ? 'nb-badge-success' : 'nb-badge-neutral'">{{ emp.status === 'active' ? 'نشط' : emp.status }}</span>
              </span>
              <span>
                <button class="nb-btn-primary sm" (click)="activateAccount(emp)"
                  [disabled]="!emp.email || activatingId() === emp.id"
                  [title]="!emp.email ? 'يجب توفّر البريد الإلكتروني لتفعيل الحساب' : 'تفعيل دخول النظام + بوابة الخدمة الذاتية وإرسال بيانات الدخول'">
                  {{ activatingId() === emp.id ? 'جارٍ التفعيل…' : '🔑 تفعيل الحساب' }}
                </button>
              </span>
            </div>
          }
          @if (employees().length === 0) {
            <div class="tbl-empty">لا يوجد موظفين مسجلين حالياً.</div>
          }
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
      grid-template-columns: 1fr 1.6fr 1fr 1.2fr 1fr 0.9fr 1.2fr;
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
export class EmployeesDashboardComponent implements OnInit {
  tenantService = inject(TenantService);
  http = inject(HttpClient);

  employees = signal<EmployeeInfo[]>([]);
  activatingId = signal<string | null>(null);

  ngOnInit() {
    this.loadEmployees();
  }

  activateAccount(emp: EmployeeInfo) {
    if (this.activatingId()) return;
    this.activatingId.set(emp.id);
    this.http.post<any>(`/api/v1/employees/employees/${emp.id}/activate-account/`, {}).subscribe({
      next: (res) => {
        this.activatingId.set(null);
        console.log(res?.message || 'تم تفعيل حساب الموظف وإرسال بيانات الدخول بنجاح.');
      },
      error: (err) => {
        this.activatingId.set(null);
        console.error(err?.error?.error?.message || err?.error?.message || 'فشل تفعيل حساب الموظف.');
      }
    });
  }

  loadEmployees() {
    this.http.get<any>('/api/v1/employees/employees/').subscribe({
      next: (res) => {
        if (res && res.success) {
          this.employees.set(res.data);
        }
      }
    });
  }
}