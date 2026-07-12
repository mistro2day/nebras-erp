import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TenantService } from '../../core/services/tenant.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbStatCardComponent } from '../../shared/nebras/nb-stat-card.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { environment } from '../../../environments/environment';

interface PayrollRun {
  id: string;
  period_code: string;
  status: 'draft' | 'approved' | 'paid';
  total_cost: string;
}

interface Loan {
  id: string;
  loan_amount: string;
  remaining_balance: string;
  status: string;
}

@Component({
  selector: 'app-payroll-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DecimalPipe, NbPageHeaderComponent, NbStatCardComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="إدارة الرواتب والأجور"
        [subtitle]="'لوحة التحكم الشاملة لإدارة التعويضات، الأجور، الحوافز، والسلف بكادر ' + (($any(tenantService).currentTenant())?.nameAr || 'مجموعة مدارس النبراس الأهلية')"
      >
        <div class="header-actions">
          <button class="nb-btn-secondary" (click)="navigate('structures')">👤 هياكل الرواتب والحوافز</button>
          <button class="nb-btn-secondary" (click)="navigate('loans')">💵 السلف والقروض</button>
          <button class="nb-btn-primary" (click)="navigate('runs')">📊 مسيرات الرواتب</button>
        </div>
      </nb-page-header>

      <!-- بطاقات الإحصائيات الفخمة -->
      <div class="stats-grid animate-fade">
        <div class="stat-card-wrapper primary">
          <nb-stat-card label="إجمالي تكلفة رواتب الشهر الحالي" [value]="(totalCost() | number:'1.0-0') || '0'" suffix="ج.س"></nb-stat-card>
        </div>
        <div class="stat-card-wrapper warning">
          <nb-stat-card label="إجمالي القروض والسلف النشطة" [value]="(totalLoans() | number:'1.0-0') || '0'" suffix="ج.س"></nb-stat-card>
        </div>
        <div class="stat-card-wrapper info">
          <nb-stat-card label="عدد الكادر والموظفين" [value]="(employeeCount() | number) || '0'" suffix="موظف"></nb-stat-card>
        </div>
        <div class="stat-card-wrapper danger">
          <nb-stat-card label="السلف المعلقة بانتظار الاعتماد" [value]="(pendingLoans() | number) || '0'" suffix="طلبات"></nb-stat-card>
        </div>
      </div>

      <!-- تخطيط لوحة التحكم التفاعلية -->
      <div class="dashboard-grid animate-fade">
        <!-- المسيرات الأخيرة والنشطة -->
        <div class="recent-runs-panel">
          <nb-panel title="أحدث مسيرات الرواتب" subtitle="مراجعة دورات كشوف الأجور الشهرية وحالتها الحالية في النظام.">
            <div class="table-responsive">
              <table class="nb-table">
                <thead>
                  <tr>
                    <th>دورة المسير</th>
                    <th>تكلفة الصرف الإجمالية</th>
                    <th>الحالة التشغيلية</th>
                    <th>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  @for (run of recentRuns(); track run.id) {
                    <tr>
                      <td class="font-bold">📅 مسير شهر: {{ run.period_code }}</td>
                      <td>{{ (Number(run.total_cost) | number:'1.0-0') }} ج.س</td>
                      <td>
                        <span class="badge" [class]="run.status">{{ getStatusLabel(run.status) }}</span>
                      </td>
                      <td>
                        <button class="action-btn" (click)="navigate('runs')">التفاصيل</button>
                      </td>
                    </tr>
                  }
                  @if (recentRuns().length === 0) {
                    <tr>
                      <td colspan="4" class="text-center pad-20">لا توجد مسيرات رواتب مسجلة مؤخراً.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </nb-panel>
        </div>

        <!-- روابط وإجراءات سريعة مميزة -->
        <div class="quick-actions-panel">
          <nb-panel title="إجراءات الموارد المالية السريعة" subtitle="الوصول الفوري للوظائف الأكثر تكراراً في النظام.">
            <div class="quick-actions-list">
              <div class="action-item" (click)="navigate('structures')">
                <div class="icon">✨</div>
                <div class="txt">
                  <div class="title">توزيع الحوافز والمكافآت</div>
                  <div class="desc">تخصيص مكافآت الأداء المالي والزيادات التشجيعية للموظفين.</div>
                </div>
              </div>
              <div class="action-item" (click)="navigate('loans')">
                <div class="icon">💵</div>
                <div class="txt">
                  <div class="title">سلفة طارئة لموظف</div>
                  <div class="desc">تسجيل طلب سلفة نقدية جديدة وتحديد آلية السداد والأقساط.</div>
                </div>
              </div>
              <div class="action-item" (click)="navigate('runs')">
                <div class="icon">📑</div>
                <div class="txt">
                  <div class="title">مراجعة كشوف صرف الرواتب</div>
                  <div class="desc">فحص الاستقطاعات والمدخلات المالية قبل الاعتماد النهائي للمسير.</div>
                </div>
              </div>
            </div>
          </nb-panel>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-background); font-family: var(--nb-font-family); }
    .header-actions { display: flex; gap: 8px; align-items: center; }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }
    
    .stat-card-wrapper {
      border-radius: var(--nb-radius-card);
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(16,24,40,0.03);
      border-right: 4px solid transparent;
      background: var(--nb-surface);
    }
    .stat-card-wrapper.primary { border-right-color: var(--nb-primary-600); }
    .stat-card-wrapper.warning { border-right-color: #f57c00; }
    .stat-card-wrapper.info { border-right-color: #0288d1; }
    .stat-card-wrapper.danger { border-right-color: #d32f2f; }

    .dashboard-grid { display: grid; grid-template-columns: 1fr 360px; gap: 20px; }
    @media (max-width: 950px) { .dashboard-grid { grid-template-columns: 1fr; } }

    .table-responsive { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; text-align: start; font-size: 13px; }
    .nb-table th, .nb-table td { padding: 12px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table th { font-weight: 700; color: var(--nb-text-muted); background: var(--nb-surface-raised); }
    
    .font-bold { font-weight: 700; }
    .text-center { text-align: center; }
    .pad-20 { padding: 20px; color: var(--nb-text-faint); }
    
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      font-size: 10.5px;
      font-weight: 700;
      border-radius: 12px;
      line-height: 1;
    }
    .badge.draft { background: #fff3e0; color: #e65100; }
    .badge.approved { background: #e8f5e9; color: #2e7d32; }
    .badge.paid { background: #e3f2fd; color: #0d47a1; }

    .action-btn {
      padding: 4px 10px;
      font-size: 11.5px;
      font-weight: 600;
      background: var(--nb-primary-50);
      color: var(--nb-primary-700);
      border-radius: 4px;
      cursor: pointer;
      border: none;
      font-family: var(--nb-font-family);
    }
    .action-btn:hover { background: var(--nb-primary-100); }

    .quick-actions-list { display: flex; flex-direction: column; gap: 12px; }
    .action-item {
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 12px;
      border: 1px solid var(--nb-border-soft);
      border-radius: var(--nb-radius);
      cursor: pointer;
      background: var(--nb-surface);
      transition: all 0.15s ease;
    }
    .action-item:hover {
      background: var(--nb-surface-raised);
      border-color: var(--nb-primary-400);
      transform: translateY(-1px);
    }
    .action-item .icon {
      font-size: 20px;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: var(--nb-primary-50);
      color: var(--nb-primary-700);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .action-item .title { font-weight: 700; font-size: 13px; color: var(--nb-text); }
    .action-item .desc { font-size: 11px; color: var(--nb-text-muted); margin-top: 2px; }

    .nb-btn-primary, .nb-btn-secondary {
      height: 36px;
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
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class PayrollDashboardComponent implements OnInit {
  tenantService = inject(TenantService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  protected readonly Number = Number;

  readonly totalCost = signal<number>(0);
  readonly totalLoans = signal<number>(0);
  readonly employeeCount = signal<number>(0);
  readonly pendingLoans = signal<number>(0);
  readonly recentRuns = signal<PayrollRun[]>([]);

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    // 1. Fetch Payroll Runs (to sum cost and list recent ones)
    this.http.get<any>(`${environment.apiUrl}payroll/runs/`).subscribe({
      next: (res) => {
        if (res && res.success) {
          const runs = res.data as PayrollRun[];
          this.recentRuns.set(runs.slice(0, 5));
          const sum = runs.reduce((acc, run) => acc + parseFloat(run.total_cost || '0'), 0);
          this.totalCost.set(sum);
        }
      }
    });

    // 2. Fetch Loans (to sum remaining balance and count pending loans)
    this.http.get<any>(`${environment.apiUrl}payroll/loans/`).subscribe({
      next: (res) => {
        if (res && res.success) {
          const loans = res.data as Loan[];
          const sum = loans
            .filter(l => l.status === 'approved')
            .reduce((acc, l) => acc + parseFloat(l.remaining_balance || '0'), 0);
          this.totalLoans.set(sum);

          const pending = loans.filter(l => l.status === 'pending').length;
          this.pendingLoans.set(pending);
        }
      }
    });

    // 3. Fetch Employees (to get total count)
    this.http.get<any>(`${environment.apiUrl}employees/employees/`).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.employeeCount.set(res.data.length);
        }
      }
    });
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'draft': return 'مسودة';
      case 'approved': return 'معتمد';
      case 'paid': return 'مدفوع';
      default: return status;
    }
  }

  navigate(path: string) {
    this.router.navigate([`/payroll/${path}`]);
  }
}