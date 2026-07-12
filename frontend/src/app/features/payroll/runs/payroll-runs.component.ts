import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
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
  run_date: string;
  status: 'draft' | 'review' | 'approved' | 'paid';
  total_cost: string;
  approvers_chain?: string[];
  current_approval_step?: number;
  approval_request_id?: string;
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

interface User {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
}

@Component({
  selector: 'app-payroll-runs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DecimalPipe, DatePipe, FormsModule, NbPageHeaderComponent, NbPanelComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="مسيرات وكشوف الرواتب" subtitle="مراجعة مسيرات الرواتب الدورية، إدارتها بنظام موافقات متعدد المراحل، وصرف قسائم الموظفين.">
        <div class="header-actions">
          <button class="nb-btn-primary animate-pulse" (click)="openCreateModal()">➕ إنشاء مسير رواتب جديد</button>
          <button class="nb-btn-secondary" (click)="goBack()">العودة للوحة التحكم</button>
        </div>
      </nb-page-header>

      @if (loading()) {
        <nb-loading message="جاري تحميل مسيرات الرواتب وتحديث الموافقات..."></nb-loading>
      }

      <!-- مسار الحالة والموافقة النشط للمسير المحدد -->
      @if (selectedRun(); as run) {
        <div class="status-stepper-panel animate-fade">
          <div class="stepper-title-row">
            <h4>📦 حالة مسير شهر: {{ run.period_code }}</h4>
            <div class="stepper-badges">
              <span class="badge" [class]="run.status">{{ getStatusLabel(run.status) }}</span>
              @if (run.status === 'review') {
                <span class="badge warning">بانتظار موافقة المستوى: {{ (run.current_approval_step || 0) + 1 }}</span>
              }
            </div>
          </div>
          
          <!-- خطوات المسير العام -->
          <div class="stepper">
            <div class="step-item" [class.active]="run.status === 'draft'">
              <div class="step-icon">1</div>
              <div class="step-label">إعداد (مسودة)</div>
            </div>
            <div class="step-line" [class.active]="run.status !== 'draft'"></div>
            
            <div class="step-item" [class.active]="run.status === 'review'">
              <div class="step-icon">2</div>
              <div class="step-label">مراجعة الموافقات</div>
            </div>
            <div class="step-line" [class.active]="run.status === 'approved' || run.status === 'paid'"></div>
            
            <div class="step-item" [class.active]="run.status === 'approved'">
              <div class="step-icon">3</div>
              <div class="step-label">معتمد وصالح للصرف</div>
            </div>
            <div class="step-line" [class.active]="run.status === 'paid'"></div>
            
            <div class="step-item" [class.active]="run.status === 'paid'">
              <div class="step-icon">4</div>
              <div class="step-label">تم الصرف</div>
            </div>
          </div>

          <!-- سلسلة الموافقات التفصيلية للمسؤولين -->
          @if (run.approvers_chain && run.approvers_chain.length > 0) {
            <div class="approval-chain-box">
              <span class="chain-title">🔗 سلسلة موافقات المسؤولين المحددة للمسير:</span>
              <div class="chain-steps">
                @for (approver of run.approvers_chain; track approver; let i = $index) {
                  @let isDone = (run.current_approval_step || 0) > i || run.status === 'approved' || run.status === 'paid';
                  @let isCurrent = (run.current_approval_step || 0) === i && run.status === 'review';
                  <div class="chain-node" [class.done]="isDone" [class.current]="isCurrent">
                    <span class="node-icon">
                      @if (isDone) { ✓ } @else if (isCurrent) { 🟡 } @else { ⚪ }
                    </span>
                    <span class="node-name">{{ getUserName(approver) }}</span>
                    <span class="node-level">مستوى {{ i + 1 }}</span>
                  </div>
                  @if (i < run.approvers_chain.length - 1) {
                    <span class="chain-arrow">➔</span>
                  }
                }
              </div>
              
              <!-- إمكانية الاعتماد المباشر لمن هم في سلسلة الموافقات من كبار المسؤولين -->
              @if (run.status === 'review') {
                <div class="approve-action-block">
                  <p>تنبيه: يتطلب هذا المسير اعتماداً من المستخدم الحالي أو المعتمد المعني للمستوى المذكور أعلاه.</p>
                  <button class="nb-btn-primary approve-action-btn" (click)="triggerApprovalDecision(run)">
                    ✍️ اعتماد وتوقيع الخطوة الحالية
                  </button>
                </div>
              }
            </div>
          }
        </div>
      }

      <div class="runs-layout">
        <!-- قسم مسيرات الرواتب -->
        <div class="runs-list-panel">
          <nb-panel title="مسيرات الرواتب المسجلة" subtitle="متابعة المسيرات وحالة الموافقات الخاصة بكل فترة محاسبية.">
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
                  </div>
                  
                  @if (run.status === 'draft') {
                    <button 
                      class="nb-btn-primary approve-btn" 
                      (click)="openApprovalChainModal($event, run)"
                    >
                      🚀 تقديم طلب موافقة للمسؤولين
                    </button>
                  } @else if (run.status === 'approved') {
                    <button 
                      class="nb-btn-secondary approve-btn paid-btn" 
                      (click)="markAsPaid($event, run)"
                    >
                      💳 تأكيد وصرف كشوف الرواتب
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
            subtitle="قائمة تفصيلية بالأجور، البدلات، الخصومات وصافي الراتب المستحق."
          >
            @if (selectedRunId()) {
              <div class="table-responsive">
                <table class="nb-table">
                  <thead>
                    <tr>
                      <th>اسم الموظف</th>
                      <th>الراتب الأساسي</th>
                      <th>البدلات والحوافز</th>
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
                        <td class="text-success">{{ (Number(slip.gross_earnings) - Number(slip.basic_salary) | number:'1.0-0') || '0' }} ج.س</td>
                        <td class="text-danger">{{ (Number(slip.total_deductions) | number:'1.0-0') || '0' }} ج.س</td>
                        <td class="font-bold highlight">{{ (Number(slip.net_salary) | number:'1.0-0') || '0' }} ج.س</td>
                        <td>
                          <span class="badge" [class]="slip.status">{{ getStatusLabel(slip.status) }}</span>
                        </td>
                      </tr>
                    }
                    @if (payslips().length === 0) {
                      <tr>
                        <td colspan="6" class="text-center pad-20">لا توجد قسائم رواتب تفصيلية مرتبطة بهذا المسير.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="select-prompt">
                <div class="icon">👈</div>
                <h4>الرجاء اختيار مسير رواتب من القائمة الجانبية</h4>
                <p>اختر أي مسير لعرض تفاصيل الموافقات وكشوف الرواتب.</p>
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

    <!-- نافذة منبثقة لتحديد سلسلة المسؤولين عن الاعتماد (Approval Chain Picker Modal) -->
    @if (showApprovalModal()) {
      <div class="modal-overlay" (click)="closeApprovalModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>تحديد سلسلة المسؤولين عن الاعتماد</h3>
            <button class="close-btn" (click)="closeApprovalModal()">×</button>
          </div>
          
          <form (submit)="submitApprovalChain($event)" class="modal-form">
            <p class="desc-text">حدد المسؤولين بالترتيب للموافقة على هذا الكشف (سلسلة من 3 مستويات):</p>
            
            <div class="field req">
              <label>المستوى 1: مدير الموارد البشرية (HR Manager)</label>
              <select [(ngModel)]="approvers[0]" name="app1" required>
                <option value="">اختر المسؤول الأول...</option>
                @for (u of users(); track u.id) {
                  <option [value]="u.id">{{ u.first_name || '' }} {{ u.last_name || '' }} ({{ u.email }})</option>
                }
              </select>
            </div>

            <div class="field req">
              <label>المستوى 2: المدير المالي (CFO)</label>
              <select [(ngModel)]="approvers[1]" name="app2" required>
                <option value="">اختر المسؤول الثاني...</option>
                @for (u of users(); track u.id) {
                  <option [value]="u.id">{{ u.first_name || '' }} {{ u.last_name || '' }} ({{ u.email }})</option>
                }
              </select>
            </div>

            <div class="field req">
              <label>المستوى 3: المدير العام / الرئيس التنفيذي (CEO)</label>
              <select [(ngModel)]="approvers[2]" name="app3" required>
                <option value="">اختر المسؤول الثالث...</option>
                @for (u of users(); track u.id) {
                  <option [value]="u.id">{{ u.first_name || '' }} {{ u.last_name || '' }} ({{ u.email }})</option>
                }
              </select>
            </div>

            <div class="modal-actions">
              <button type="submit" class="nb-btn-primary" [disabled]="submittingApproval()">
                {{ submittingApproval() ? 'جاري التقديم للموافقة…' : 'إرسال للموافقة والاعتماد المالي 🚀' }}
              </button>
              <button type="button" class="nb-btn-secondary" (click)="closeApprovalModal()">إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-background); font-family: var(--nb-font-family); }
    .header-actions { display: flex; gap: 8px; align-items: center; }
    
    .status-stepper-panel {
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
      padding: 20px;
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .stepper-title-row { display: flex; justify-content: space-between; align-items: center; }
    .stepper-title-row h4 { margin: 0; font-size: 14.5px; color: var(--nb-text); }
    .stepper-badges { display: flex; gap: 6px; }

    .stepper { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; }
    .step-item { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .step-icon { width: 32px; height: 32px; border-radius: 50%; background: #e0e0e0; color: #757575; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
    .step-label { font-size: 11.5px; font-weight: 600; color: var(--nb-text-muted); }
    .step-item.active .step-icon { background: var(--nb-primary-600); color: white; box-shadow: var(--nb-focus-ring); }
    .step-item.active .step-label { color: var(--nb-text); font-weight: 700; }
    
    .step-line { flex: 1; height: 3px; background: #e0e0e0; margin: 0 10px; position: relative; top: -10px; }
    .step-line.active { background: var(--nb-primary-600); }

    .approval-chain-box { background: #fafafa; border: 1px dashed var(--nb-border); border-radius: var(--nb-radius); padding: 14px; display: flex; flex-direction: column; gap: 10px; }
    .chain-title { font-size: 12px; font-weight: 700; color: var(--nb-text); }
    .chain-steps { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .chain-node { display: flex; flex-direction: column; align-items: center; background: white; border: 1px solid var(--nb-border); padding: 6px 12px; border-radius: 6px; }
    .chain-node.done { border-color: var(--nb-success, #2e7d32); background: #e8f5e9; }
    .chain-node.current { border-color: #ffd54f; background: #fffde7; box-shadow: 0 0 4px #ffd54f; }
    .node-icon { font-size: 12px; }
    .node-name { font-size: 12px; font-weight: 700; color: var(--nb-text); }
    .node-level { font-size: 10px; color: var(--nb-text-muted); }
    .chain-arrow { color: var(--nb-text-faint); font-weight: 700; }

    .approve-action-block { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--nb-border-soft); padding-top: 10px; margin-top: 4px; font-size: 11.5px; color: var(--nb-text-muted); }
    .approve-action-btn { height: 32px; padding: 0 12px; font-size: 11.5px; }

    .runs-layout { display: grid; grid-template-columns: 340px 1fr; gap: 20px; }
    @media (max-width: 900px) { .runs-layout { grid-template-columns: 1fr; } }
    
    .runs-list { display: flex; flex-direction: column; gap: 12px; max-height: 70vh; overflow-y: auto; }
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
    
    .approve-btn { width: 100%; height: 32px; font-size: 12px; font-weight: 600; padding: 0; margin-top: 4px; }
    .paid-btn { background: #e3f2fd; border-color: #90caf9; color: #0d47a1; }
    .paid-btn:hover { background: #bbdefb; }

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
    .badge.draft { background: #e0e0e0; color: #616161; }
    .badge.review { background: #fff3e0; color: #e65100; }
    .badge.approved { background: #e8f5e9; color: #2e7d32; }
    .badge.paid { background: #e3f2fd; color: #0d47a1; }
    .badge.warning { background: #ffe082; color: #b78103; }

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
    .modal { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 24px; width: 460px; max-width: 90vw; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .modal-header h3 { margin: 0; font-size: 15px; color: var(--nb-text); }
    .close-btn { background: none; border: none; font-size: 24px; color: var(--nb-text-muted); cursor: pointer; }
    
    .modal-form { display: flex; flex-direction: column; gap: 14px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
    .field input, .field select {
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
    .field input:focus, .field select:focus { border-color: var(--nb-primary-600); }
    .field.req label::after { content: ' *'; color: var(--nb-danger); }
    .desc-text { font-size: 12px; color: var(--nb-text-muted); }
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
  readonly selectedRun = computed(() => this.runs().find(r => r.id === this.selectedRunId()));
  
  readonly users = signal<User[]>([]);
  readonly loading = signal(false);

  // Modals Control
  readonly showCreateModal = signal(false);
  readonly showApprovalModal = signal(false);
  
  readonly creatingRun = signal(false);
  readonly submittingApproval = signal(false);
  readonly processingId = signal<string | null>(null);

  newRunPeriodCode = '';
  activeRunForApproval: PayrollRun | null = null;
  approvers: string[] = ['', '', ''];

  ngOnInit() {
    this.loadRuns();
    this.loadUsers();
  }

  loadRuns() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}payroll/runs/`).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res && res.success) {
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

  loadUsers() {
    this.http.get<any>(`${environment.apiUrl}identity/users/`).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.users.set(res.data);
        }
      }
    });
  }

  getUserName(userId: string): string {
    const u = this.users().find(user => user.id === userId);
    return u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email : userId;
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

  openApprovalChainModal(event: Event, run: PayrollRun) {
    event.stopPropagation();
    this.activeRunForApproval = run;
    this.approvers = ['', '', ''];
    this.showApprovalModal.set(true);
  }

  closeApprovalModal() {
    this.showApprovalModal.set(false);
  }

  submitApprovalChain(event: Event) {
    event.preventDefault();
    if (!this.approvers[0] || !this.approvers[1] || !this.approvers[2]) {
      this.notify.error('يرجى تحديد المسؤولين لكافة مستويات الاعتماد الثلاثة.');
      return;
    }

    this.submittingApproval.set(true);
    const payload = { approvers: this.approvers };
    
    this.http.post<any>(`${environment.apiUrl}payroll/runs/${this.activeRunForApproval?.id}/submit-for-approval/`, payload).subscribe({
      next: (res) => {
        this.submittingApproval.set(false);
        this.closeApprovalModal();
        if (res && res.success) {
          this.notify.success('تم إرسال كشف مسير الرواتب بنجاح إلى مركز الموافقات وسلسلة المعتمدين.');
          this.loadRuns();
        } else {
          this.notify.error('فشل إرسال المسير للموافقة.');
        }
      },
      error: () => {
        this.submittingApproval.set(false);
        this.notify.error('حدث خطأ بالاتصال بالخادم لتقديم طلب الموافقة.');
      }
    });
  }

  triggerApprovalDecision(run: PayrollRun) {
    if (!run.approval_request_id) return;
    this.loading.set(true);
    
    // Simulate quick decision from approvals engine for the current assignee step
    this.http.post<any>(`/api/v1/approvals/requests/${run.approval_request_id}/decision/`, {
      action: 'approve',
      comments: 'اعتماد مسير الرواتب المرفوع محاسبياً.'
    }).subscribe({
      next: () => {
        this.notify.success('تم إقرار وتوقيع خطوة موافقة مسير الرواتب بنجاح.');
        this.loadRuns();
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('فشل تسجيل قرار الاعتماد في مركز الموافقات.');
      }
    });
  }

  markAsPaid(event: Event, run: PayrollRun) {
    event.stopPropagation();
    this.loading.set(true);
    
    // Direct status transition to Paid once approved
    this.http.put<any>(`${environment.apiUrl}payroll/runs/${run.id}/`, {
      period: run.period,
      run_date: run.run_date,
      status: 'paid',
      total_cost: run.total_cost
    }).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.notify.success('تم دفع وصرف كشف مسير الرواتب بنجاح للموظفين.');
          this.loadRuns();
        } else {
          this.loading.set(false);
          this.notify.error('فشل تأكيد صرف الكشف.');
        }
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('فشل الاتصال بالخادم لتأكيد الصرف.');
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
    this.newRunPeriodCode = new Date().toISOString().slice(0, 7);
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
    const code = this.newRunPeriodCode;
    const parts = code.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const startDate = `${code}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${code}-${lastDay}`;

    this.http.get<any>(`${environment.apiUrl}payroll/periods/`).subscribe({
      next: (res) => {
        if (res && res.success) {
          const existingPeriod = res.data.find((p: any) => p.code === code);
          if (existingPeriod) {
            this.createRunForPeriod(existingPeriod.id);
          } else {
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
      case 'review': return 'قيد المراجعة والموافقة';
      case 'approved': return 'معتمد وصالح للصرف';
      case 'paid': return 'مدفوع ومصروف مالي';
      default: return status;
    }
  }

  goBack() {
    this.router.navigate(['/payroll/dashboard']);
  }
}
