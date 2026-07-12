import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { NotificationService } from '../../../core/services/notification.service';

interface PayrollRun {
  id: string;
  period?: string;
  period_code?: string;
  period_detail?: any;
  run_date: string;
  status: 'draft' | 'approved' | 'paid';
  total_cost: string;
}

interface Payslip {
  id: string;
  employee_name?: string;
  basic_salary: string;
  gross_earnings: string;
  total_deductions: string;
  net_salary: string;
  status: string;
}

@Component({
  selector: 'app-payroll-runs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DecimalPipe, FormsModule, NbPageHeaderComponent, NbPanelComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="مسيرات وكشوف الرواتب" subtitle="مراجعة مسيرات الرواتب الدورية، واعتمادها، وإصدار قسائم رواتب الموظفين.">
        <div class="header-actions">
          <button class="nb-btn-primary" (click)="openCreateModal()">➕ إنشاء مسير رواتب جديد</button>
          <button class="nb-btn-secondary" (click)="goBack()">العودة للوحة التحكم</button>
        </div>
      </nb-page-header>

      @if (loading()) {
        <nb-loading message="جاري تحميل مسيرات الرواتب وكشوف الموظفين..."></nb-loading>
      }

      <div class="runs-layout">
        <!-- قسم مسيرات الرواتب -->
        <div class="runs-list-panel">
          <nb-panel title="مسيرات الرواتب المسجلة" subtitle="اضغط على المسير لعرض كشوف الرواتب التفصيلية للموظفين.">
            <div class="runs-list">
              @for (run of runs(); track run.id) {
                <div 
                  class="run-card" 
                  [class.selected]="selectedRunId() === run.id"
                  (click)="selectRun(run.id)"
                >
                  <div class="run-header">
                    <span class="period-code">📅 مسير شهر: {{ run.period_code || 'غير محدد' }}</span>
                    <span class="badge" [class]="run.status">{{ getStatusLabel(run.status) }}</span>
                  </div>
                  <div class="run-body">
                    <div class="metric">
                      <span class="lbl">التكلفة الإجمالية:</span>
                      <span class="val">{{ (Number(run.total_cost) | number:'1.0-0') || '0' }} ج.س</span>
                    </div>
                    <div class="metric">
                      <span class="lbl">تاريخ التشغيل:</span>
                      <span class="val-sub">{{ run.run_date | date:'yyyy-MM-dd HH:mm' }}</span>
                    </div>
                  </div>
                  @if (run.status === 'draft') {
                    <button 
                      class="nb-btn-primary approve-btn" 
                      (click)="processRun($event, run.id)"
                      [disabled]="processingId() === run.id"
                    >
                      {{ processingId() === run.id ? 'جارٍ الاعتماد…' : 'اعتماد وصرف المسير ✓' }}
                    </button>
                  }
                </div>
              }
              @if (runs().length === 0) {
                <div class="no-data">لا توجد مسيرات رواتب مسجلة في النظام حالياً.</div>
              }
            </div>
          </nb-panel>
        </div>

        <!-- تفاصيل الكشوف للموظفين (Payslips) -->
        <div class="payslips-panel">
          <nb-panel 
            [title]="selectedRunId() ? 'كشف رواتب الموظفين للمسير المحدد' : 'تفاصيل كشف الرواتب'"
            subtitle="قائمة تفصيلية بالرواتب الأساسية، الاستقطاعات، وصافي المستحقات لكل موظف."
          >
            @if (selectedRunId()) {
              <div class="table-responsive">
                <table class="nb-table">
                  <thead>
                    <tr>
                      <th>اسم الموظف</th>
                      <th>الراتب الأساسي</th>
                      <th>إجمالي المستحقات</th>
                      <th>الاستقطاعات/السلف</th>
                      <th>صافي الراتب</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (slip of payslips(); track slip.id) {
                      <tr>
                        <td class="font-bold">{{ slip.employee_name || 'موظف نبراس' }}</td>
                        <td>{{ (Number(slip.basic_salary) | number:'1.0-0') || '0' }} ج.س</td>
                        <td class="text-success">{{ (Number(slip.gross_earnings) | number:'1.0-0') || '0' }} ج.س</td>
                        <td class="text-danger">{{ (Number(slip.total_deductions) | number:'1.0-0') || '0' }} ج.س</td>
                        <td class="font-bold highlight">{{ (Number(slip.net_salary) | number:'1.0-0') || '0' }} ج.س</td>
                        <td>
                          <span class="badge" [class]="slip.status">{{ getStatusLabel(slip.status) }}</span>
                        </td>
                      </tr>
                    }
                    @if (payslips().length === 0) {
                      <tr>
                        <td colspan="6" class="text-center pad-20">لا توجد قسائم رواتب تفصيلية مرتبطة بهذا المسير. اضغط على "اعتماد وصرف المسير" لتوليدها تلقائياً.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="select-prompt">
                <div class="icon">👈</div>
                <h4>الرجاء اختيار مسير رواتب من القائمة الجانبية</h4>
                <p>اختر أي مسير لعرض كشوف الرواتب التفصيلية للموظفين التابعين له.</p>
              </div>
            }
          </nb-panel>
        </div>
      </div>
    </div>

    <!-- نافذة منبثقة لإنشاء مسير رواتب جديد (Modal) -->
    @if (showCreateModal()) {
      <div class="modal-overlay" (click)="closeCreateModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>إنشاء مسير رواتب جديد</h3>
            <button class="close-btn" (click)="closeCreateModal()">×</button>
          </div>
          
          <form (submit)="submitCreateRun($event)" class="modal-form">
            <div class="field req">
              <label>كود دورة المسير (شهر-سنة)</label>
              <input type="month" [(ngModel)]="newRunPeriodCode" name="periodCode" required />
              <span class="hint">مثال: اختيار أغسطس 2026 سينشئ كود الفترة "2026-08".</span>
            </div>

            <div class="modal-actions">
              <button type="submit" class="nb-btn-primary" [disabled]="creatingRun()">
                {{ creatingRun() ? 'جاري الإنشاء…' : 'إنشاء دورة المسير ✓' }}
              </button>
              <button type="button" class="nb-btn-secondary" (click)="closeCreateModal()">إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-background); font-family: var(--nb-font-family); }
    .header-actions { display: flex; gap: 8px; align-items: center; }
    
    .runs-layout { display: grid; grid-template-columns: 320px 1fr; gap: 20px; margin-top: 10px; }
    @media (max-width: 900px) { .runs-layout { grid-template-columns: 1fr; } }
    
    .runs-list { display: flex; flex-direction: column; gap: 12px; max-height: 70vh; overflow-y: auto; padding-left: 4px; }
    .run-card {
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius);
      padding: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .run-card:hover { border-color: var(--nb-primary-400); background: var(--nb-surface-raised); }
    .run-card.selected { border-color: var(--nb-primary-600); box-shadow: var(--nb-focus-ring); background: var(--nb-primary-50); }
    
    .run-header { display: flex; justify-content: space-between; align-items: center; }
    .period-code { font-weight: 700; font-size: 13px; color: var(--nb-text); }
    .run-body { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
    .metric { display: flex; justify-content: space-between; }
    .lbl { color: var(--nb-text-muted); }
    .val { font-weight: 700; color: var(--nb-text); }
    .val-sub { color: var(--nb-text-faint); font-variant-numeric: tabular-nums; }
    
    .approve-btn { width: 100%; height: 32px; font-size: 12px; font-weight: 600; padding: 0; margin-top: 4px; }
    
    .table-responsive { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; text-align: start; font-size: 13px; }
    .nb-table th, .nb-table td { padding: 12px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table th { font-weight: 700; color: var(--nb-text-muted); background: var(--nb-surface-raised); }
    .nb-table td.highlight { color: var(--nb-primary-700); }
    
    .font-bold { font-weight: 700; }
    .text-success { color: var(--nb-success, #2e7d32); }
    .text-danger { color: var(--nb-danger, #d32f2f); }
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

    .select-prompt {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: var(--nb-text-muted);
      text-align: center;
    }
    .select-prompt .icon { font-size: 32px; margin-bottom: 12px; }
    .select-prompt h4 { margin: 0 0 6px; font-size: 15px; color: var(--nb-text); }
    .select-prompt p { margin: 0; font-size: 12.5px; color: var(--nb-text-faint); }

    .no-data { text-align: center; padding: 20px; color: var(--nb-text-faint); font-size: 12.5px; }

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

    /* Modal Styles */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 24px; width: 440px; max-width: 90vw; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .modal-header h3 { margin: 0; font-size: 15px; color: var(--nb-text); }
    .close-btn { background: none; border: none; font-size: 24px; color: var(--nb-text-muted); cursor: pointer; }
    
    .modal-form { display: flex; flex-direction: column; gap: 14px; }
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
    .field.req label::after { content: ' *'; color: var(--nb-danger); }
    .hint { font-size: 11px; color: var(--nb-text-faint); }
    
    .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 10px; }
  `]
})
export class PayrollRunsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  protected readonly Number = Number;

  readonly runs = signal<PayrollRun[]>([]);
  readonly payslips = signal<Payslip[]>([]);
  readonly selectedRunId = signal<string | null>(null);
  readonly processingId = signal<string | null>(null);
  readonly loading = signal(false);

  // Modal Control
  readonly showCreateModal = signal(false);
  readonly creatingRun = signal(false);
  newRunPeriodCode = '';

  ngOnInit() {
    this.loadRuns();
  }

  loadRuns() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}payroll/runs/`).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res && res.success) {
          // Fetch period details for code mappings
          const rawRuns = res.data;
          this.runs.set(rawRuns);
          this.fetchPeriodDetailsForRuns(rawRuns);
          if (rawRuns.length > 0 && !this.selectedRunId()) {
            this.selectRun(rawRuns[0].id);
          }
        }
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  fetchPeriodDetailsForRuns(rawRuns: any[]) {
    this.http.get<any>(`${environment.apiUrl}payroll/periods/`).subscribe({
      next: (res) => {
        if (res && res.success) {
          const periodMap = new Map<string, string>();
          res.data.forEach((p: any) => periodMap.set(p.id, p.code));
          
          this.runs.update(current => 
            current.map(r => ({
              ...r,
              period_code: periodMap.get(r.period || '') || 'غير محدد'
            }))
          );
        }
      }
    });
  }

  selectRun(runId: string) {
    this.selectedRunId.set(runId);
    this.loadPayslips(runId);
  }

  loadPayslips(runId: string) {
    this.http.get<any>(`${environment.apiUrl}payroll/payslips/?payroll_run=${runId}`).subscribe({
      next: (res) => {
        if (res && res.success) {
          const rawSlips = res.data;
          this.payslips.set(rawSlips);
          this.fetchEmployeeNamesForSlips(rawSlips);
        }
      }
    });
  }

  fetchEmployeeNamesForSlips(slips: any[]) {
    const empIds = Array.from(new Set(slips.map(s => s.employee)));
    if (empIds.length === 0) return;

    this.http.get<any>(`${environment.apiUrl}employees/employees/`).subscribe({
      next: (res) => {
        if (res && res.success) {
          const empMap = new Map<string, string>();
          res.data.forEach((e: any) => empMap.set(e.id, e.full_name_ar));
          
          this.payslips.update(current => 
            current.map(s => ({
              ...s,
              employee_name: empMap.get((s as any).employee) || 'موظف نبراس'
            }))
          );
        }
      }
    });
  }

  processRun(event: Event, runId: string) {
    event.stopPropagation();
    this.processingId.set(runId);
    this.http.post<any>(`${environment.apiUrl}payroll/runs/${runId}/process/`, {}).subscribe({
      next: (res) => {
        this.processingId.set(null);
        if (res && res.success) {
          this.notify.success('تمت معالجة واعتماد مسير الرواتب بنجاح وصرف قسائم الموظفين.');
          this.loadRuns();
        } else {
          this.notify.error(res?.message || 'فشلت معالجة مسير الرواتب.');
        }
      },
      error: () => {
        this.processingId.set(null);
        this.notify.error('حدث خطأ أثناء الاتصال بالخادم لمعالجة مسير الرواتب.');
      }
    });
  }

  openCreateModal() {
    this.newRunPeriodCode = new Date().toISOString().slice(0, 7); // Default current month YYYY-MM
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  submitCreateRun(event: Event) {
    event.preventDefault();
    if (!this.newRunPeriodCode) {
      this.notify.error('يرجى اختيار شهر دورة مسير الرواتب.');
      return;
    }

    this.creatingRun.set(true);
    // Find or create the period code first
    const code = this.newRunPeriodCode; // format: YYYY-MM
    const parts = code.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    
    const startDate = `${code}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${code}-${lastDay}`;

    // Get periods list to check if period already exists
    this.http.get<any>(`${environment.apiUrl}payroll/periods/`).subscribe({
      next: (res) => {
        if (res && res.success) {
          const existingPeriod = res.data.find((p: any) => p.code === code);
          if (existingPeriod) {
            this.createRunForPeriod(existingPeriod.id);
          } else {
            // Create a new period
            const periodPayload = { code, start_date: startDate, end_date: endDate };
            this.http.post<any>(`${environment.apiUrl}payroll/periods/`, periodPayload).subscribe({
              next: (pRes) => {
                if (pRes && pRes.success) {
                  this.createRunForPeriod(pRes.data.id);
                } else {
                  this.creatingRun.set(false);
                  this.notify.error('فشل إنشاء فترة مسير الرواتب المحاسبية.');
                }
              },
              error: () => {
                this.creatingRun.set(false);
                this.notify.error('فشل الاتصال بالخادم لإنشاء الفترة.');
              }
            });
          }
        }
      }
    });
  }

  createRunForPeriod(periodId: string) {
    const runPayload = {
      period: periodId,
      run_date: new Date().toISOString(),
      status: 'draft',
      total_cost: '0.00'
    };

    this.http.post<any>(`${environment.apiUrl}payroll/runs/`, runPayload).subscribe({
      next: (res) => {
        this.creatingRun.set(false);
        this.closeCreateModal();
        if (res && res.success) {
          this.notify.success('تم إنشاء دورة مسير رواتب جديدة كمسودة بنجاح.');
          this.loadRuns();
          this.selectedRunId.set(res.data.id);
        } else {
          this.notify.error('فشل إنشاء مسير الرواتب الجديد.');
        }
      },
      error: () => {
        this.creatingRun.set(false);
        this.notify.error('حدث خطأ أثناء الاتصال بالخادم لإنشاء مسير الرواتب.');
      }
    });
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'draft': return 'مسودة (غير معالج)';
      case 'approved': return 'معتمد (معالج)';
      case 'paid': return 'مدفوع';
      default: return status;
    }
  }

  goBack() {
    this.router.navigate(['/payroll/dashboard']);
  }
}
