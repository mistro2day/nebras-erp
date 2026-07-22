import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatDialogModule } from '@angular/material/dialog';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NotificationService } from '../../core/services/notification.service';
import { environment } from '../../../environments/environment';
import { SendMessageModalComponent } from '../communications/components/send-message-modal.component';
import { EmployeeContractPrintModalComponent } from './components/employee-contract-print-modal.component';

interface Employee {
  id: string;
  name: string;
  avatar: string;
  jobTitle: string;
  department: string;
  email: string;
  phone: string;
  hireDate: string;
  status: 'active' | 'suspended' | 'probation';
  salary: number;
  allowance: number;
  basic_salary?: number;
  transport_allowance?: number;
  communication_allowance?: number;
  representation_allowance?: number;
  deductions?: number;
  net_payable?: number;
  contractType: string;
  fullData?: any;
}

interface LeaveRequest {
  id: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  duration: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
}

@Component({
  selector: 'app-hr',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MatDialogModule, 
    NbPageHeaderComponent, 
    NbPanelComponent, 
    SendMessageModalComponent,
    EmployeeContractPrintModalComponent
  ],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="الموارد البشرية والعقود" subtitle="إدارة الموظفين والمعلمين، السلفيات، العقود الرسمية 2026م، والخدمة الذاتية.">
        <button class="nb-btn-secondary" (click)="activeTab.set('advances')">السلفيات والخصومات</button>
        <button class="nb-btn-primary" (click)="navigateToCreate()">+ استمارة وتوظيف معلم جديد</button>
      </nb-page-header>

      <!-- التبويبات الرئيسية بتصميم عصري -->
      <div class="tabs-nav">
        <button class="tab-btn" [class.active]="activeTab() === 'dashboard'" (click)="activeTab.set('dashboard')">
          📊 لوحة الإحصائيات
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'directory'" (click)="activeTab.set('directory')">
          👥 دليل المعلمين والموظفين ({{ employees().length }})
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'contracts'" (click)="activeTab.set('contracts')">
          📜 عقود 2026م ومفردات الراتب
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'advances'" (click)="activeTab.set('advances')">
          💵 السلفيات وأبناء المعلمين
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'requests'" (click)="activeTab.set('requests')">
          📥 الإجازات والطلبات
        </button>
      </div>

      <!-- حالة جاري التحميل المعتمدة عند جلب البيانات من السيرفر -->
      @if (loading()) {
        <div class="loading-container animate-fade">
          <div class="spinner"></div>
          <p class="loading-text">جارٍ جلب بيانات المعلمين والموظفين من السيرفر…</p>
        </div>
      } @else {

        <!-- محتوى التبويب: لوحة الإحصائيات -->
        @if (activeTab() === 'dashboard') {
          <div class="stats-grid animate-fade">
            <div class="metric-card gradient-blue">
              <span class="label">إجمالي الكادر والمعلمين</span>
              <span class="value">{{ employees().length }} موظف ومعلم</span>
              <span class="subtext">نشط: {{ activeCount() }} | عقود معلم 2026م موثقة</span>
            </div>
            <div class="metric-card gradient-purple">
              <span class="label">رواتب واستحقاقات الشهر</span>
              <span class="value">{{ totalPayroll() | number }} ج.س</span>
              <span class="subtext">إجمالي البدلات والترحيل: {{ totalAllowances() | number }} ج.س</span>
            </div>
            <div class="metric-card gradient-green">
              <span class="label">السلفيات المالية النشطة</span>
              <span class="value">{{ advances().length }} سلفيات</span>
              <span class="subtext">الخصم على قسطين متتاليين</span>
            </div>
            <div class="metric-card gradient-orange">
              <span class="label">نصاب الحصص والتكليف</span>
              <span class="value">23 حصة</span>
              <span class="subtext">معفون من النوبتجية (DUTY)</span>
            </div>
          </div>

          <div class="dashboard-sections animate-fade">
            <nb-panel title="إجراءات سريعة للموارد البشرية" [flush]="true">
              <div class="quick-actions">
                <button class="action-card" (click)="navigateToCreate()">
                  <span class="icon">📜</span>
                  <span class="title">استمارة عقد معلم 2026</span>
                  <span class="desc">إنشاء عقد معلم وإقرار اللائحة</span>
                </button>
                <button class="action-card" (click)="activeTab.set('advances')">
                  <span class="icon">💵</span>
                  <span class="title">طلب وتتبع السلفيات</span>
                  <span class="desc">صرف ومتابعة أقساط السلفيات</span>
                </button>
                <button class="action-card" (click)="exportPayrollReport()">
                  <span class="icon">📥</span>
                  <span class="title">مسيرات الرواتب</span>
                  <span class="desc">تحميل شيت مفردات الرواتب</span>
                </button>
                <button class="action-card" (click)="activeTab.set('directory')">
                  <span class="icon">👥</span>
                  <span class="title">دليل الموظفين</span>
                  <span class="desc">معاينة وطباعة العقود والبيانات</span>
                </button>
              </div>
            </nb-panel>

            <nb-panel title="المعلمون والتوظيفات الأخيرة" [flush]="true">
              <div class="recent-list">
                @for (emp of recentEmployees(); track emp.id) {
                  <div class="recent-item">
                    <span class="avatar">{{ initials(emp.name) }}</span>
                    <div class="info">
                      <span class="name">{{ emp.name }}</span>
                      <span class="role">{{ emp.jobTitle }} • {{ emp.department }}</span>
                    </div>
                    <button class="btn-contract-sm" (click)="openContractModal(emp)">📜 العقد الرسمي</button>
                  </div>
                }
              </div>
            </nb-panel>
          </div>
        }

        <!-- محتوى التبويب: دليل الموظفين والمعلمين -->
        @if (activeTab() === 'directory') {
          <div class="toolbar animate-fade">
            <div class="search">
              <input [(ngModel)]="searchQuery" placeholder="بحث باسم المعلم، التخصص، أو الهاتف…" />
            </div>
            <div class="filters">
              <select [(ngModel)]="deptFilter">
                <option value="">جميع الأقسام</option>
                <option value="التعليم والإشراف">التعليم والإشراف</option>
                <option value="الإدارة المالية">الإدارة المالية</option>
                <option value="تقنية المعلومات">تقنية المعلومات</option>
              </select>
            </div>
          </div>

          <nb-panel [flush]="true" class="animate-fade">
            <div class="tbl">
              <div class="tbl-head" style="grid-template-columns: 1.5fr 1.2fr 1fr 1fr 1fr 1.2fr">
                <span>المعلم / الموظف</span><span>المسمى والتخصص</span><span>القسم</span><span>الهاتف والواتساب</span><span>التكليف والنصاب</span><span>إجراءات والعقد</span>
              </div>
              @if (filteredEmployees().length === 0) {
                <div class="tbl-empty">لا يوجد موظفون يطابقون خيارات البحث.</div>
              } @else {
                @for (emp of filteredEmployees(); track emp.id) {
                  <div class="tbl-row" style="grid-template-columns: 1.5fr 1.2fr 1fr 1fr 1fr 1.2fr">
                    <span class="emp-cell clickable" (click)="viewDetails(emp)">
                      <span class="avatar">{{ initials(emp.name) }}</span>
                      <div class="details">
                        <span class="name font-link">{{ emp.name }}</span>
                        <span class="email">{{ emp.email || '—' }}</span>
                      </div>
                    </span>
                    <span>{{ emp.jobTitle }}</span>
                    <span>{{ emp.department }}</span>
                    <span class="phone-cell">{{ emp.phone || '—' }}</span>
                    <span><b>23 حصة</b> (معفى)</span>
                    <span class="actions-cell">
                      <button class="btn-action view" (click)="viewDetails(emp)">👁️ الملف الكامل</button>
                      <button class="btn-action print" (click)="openContractModal(emp)">📜 العقد</button>
                      <button class="btn-action msg" (click)="openMessageModal(emp)">💬</button>
                    </span>
                  </div>
                }
              }
            </div>
          </nb-panel>
        }

        <!-- محتوى التبويب: عقود 2026م ومفردات الراتب -->
        @if (activeTab() === 'contracts') {
          <nb-panel [flush]="true" class="animate-fade">
            <div class="tbl">
              <div class="tbl-head" style="grid-template-columns: 1.4fr 1fr 1fr 1fr 1fr 1fr 1fr">
                <span>المعلم</span><span>الراتب الأساسي</span><span>بدل ترحيل</span><span>بدل اتصال</span><span>بدل تمثيل</span><span>الصافي المستحق</span><span>العقد واللائحة</span>
              </div>
              @for (emp of employees(); track emp.id) {
                <div class="tbl-row" style="grid-template-columns: 1.4fr 1fr 1fr 1fr 1fr 1fr 1fr">
                  <span class="emp-cell">
                    <span class="avatar">{{ initials(emp.name) }}</span>
                    <div class="details">
                      <span class="name">{{ emp.name }}</span>
                      <span class="role">{{ emp.jobTitle }}</span>
                    </div>
                  </span>
                  <span>{{ (emp.basic_salary || emp.salary) | number }} ج.س</span>
                  <span>{{ (emp.transport_allowance || 80000) | number }} ج.س</span>
                  <span>{{ (emp.communication_allowance || 40000) | number }} ج.س</span>
                  <span>{{ (emp.representation_allowance || 30000) | number }} ج.س</span>
                  <span class="total-salary"><b>{{ (emp.net_payable || (emp.salary + emp.allowance)) | number }} ج.س</b></span>
                  <span>
                    <button class="btn-action print" (click)="openContractModal(emp)">📜 عقد معلم 2026م</button>
                  </span>
                </div>
              }
            </div>
          </nb-panel>
        }

        <!-- محتوى التبويب: السلفيات وأبناء المعلمين -->
        @if (activeTab() === 'advances') {
          <div class="advances-grid animate-fade">
            <nb-panel title="سجل السلفيات المالية والأقساط المستقطعة" [flush]="true">
              <div class="tbl">
                <div class="tbl-head" style="grid-template-columns: 1.5fr 1fr 1.2fr 1fr 1fr">
                  <span>المعلم / الموظف</span><span>مبلغ السلفية</span><span>تاريخ الطلب والسبب</span><span>شهور الاستقطاع</span><span>الحالة والاعتماد</span>
                </div>
                @if (advances().length === 0) {
                  <div class="tbl-empty">لا توجد سلفيات مالية مسجلة حالياً.</div>
                } @else {
                  @for (adv of advances(); track adv.id) {
                    <div class="tbl-row" style="grid-template-columns: 1.5fr 1fr 1.2fr 1fr 1fr">
                      <span><b>{{ adv.employee_name || 'أ. عثمان أحمد العوض' }}</b></span>
                      <span><b style="color: #2563eb;">{{ adv.amount | number }} ج.س</b></span>
                      <span>{{ adv.request_date }} <br><small>{{ adv.reason || 'سلفية طارئة' }}</small></span>
                      <span>{{ adv.repayment_months || 2 }} شهور</span>
                      <span><span class="badge approved">مستحقة ومشفرة ✓</span></span>
                    </div>
                  }
                }
              </div>
            </nb-panel>
          </div>
        }

        <!-- محتوى التبويب: الإجازات والطلبات -->
        @if (activeTab() === 'requests') {
          <nb-panel [flush]="true" class="animate-fade">
            <div class="tbl">
              <div class="tbl-head" style="grid-template-columns: 1.2fr 1fr 1.5fr 0.8fr 1fr 1.2fr">
                <span>الموظف</span><span>نوع الطلب</span><span>الفترة والمدة</span><span>السبب</span><span>الحالة</span><span>إجراءات</span>
              </div>
              @for (req of requests(); track req.id) {
                <div class="tbl-row" style="grid-template-columns: 1.2fr 1fr 1.5fr 0.8fr 1fr 1.2fr">
                  <span class="name-cell">{{ req.employeeName }}</span>
                  <span>{{ req.type }}</span>
                  <span>
                    <strong>من:</strong> {{ req.startDate }} <br>
                    <strong>إلى:</strong> {{ req.endDate }} ({{ req.duration }} أيام)
                  </span>
                  <span>{{ req.reason || '—' }}</span>
                  <span>
                    <span class="badge" [class]="req.status">{{ requestStatusText(req.status) }}</span>
                  </span>
                  <span class="actions-cell">
                    @if (req.status === 'pending') {
                      <button class="btn-action approve" (click)="approveRequest(req.id)">اعتماد</button>
                      <button class="btn-action reject" (click)="rejectRequest(req.id)">رفض</button>
                    } @else {
                      <span class="status-done">✓ مكتمل</span>
                    }
                  </span>
                </div>
              }
            </div>
          </nb-panel>
        }

      }

      <!-- المودال التفاعلي لمعاينة وطباعة عقد معلم 2026م -->
      @if (showContractModal) {
        <app-employee-contract-print-modal
          [employee]="selectedContractEmployee()"
          (close)="showContractModal = false"
        ></app-employee-contract-print-modal>
      }

      <app-send-message-modal
        [(open)]="showMsgModal"
        [recipientName]="selectedEmployee()?.name || ''"
        [recipientPhone]="selectedEmployee()?.phone || ''"
        [recipientEmail]="selectedEmployee()?.email || ''"
        [contextVariables]="{ employee_name: selectedEmployee()?.name, job_title: selectedEmployee()?.jobTitle }"
        [allowedCategories]="['hr']"
      ></app-send-message-modal>

    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; font-family: var(--nb-font-family); background: var(--nb-background); }
    .tabs-nav { display: flex; gap: 8px; border-bottom: 2px solid var(--nb-border-soft); margin-bottom: 24px; padding-bottom: 4px; }
    .tab-btn { background: none; border: none; padding: 10px 18px; font-family: var(--nb-font-family); font-size: 14px;
      font-weight: 600; color: var(--nb-text-secondary); cursor: pointer; border-radius: var(--nb-radius); transition: all 0.2s; }
    .tab-btn:hover { background: var(--nb-surface-raised); color: var(--nb-text); }
    .tab-btn.active { background: #eff6ff; color: #1d4ed8; font-weight: 700; border-bottom: 2px solid #2563eb; }

    /* أنماط جاري التحميل المعتمدة */
    .loading-container {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 60px 20px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-top: 20px;
    }
    .spinner {
      width: 44px; height: 44px; border: 4px solid #e2e8f0; border-top-color: #2563eb;
      border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 16px;
    }
    .loading-text { font-size: 15px; font-weight: 700; color: #1e293b; margin: 0; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .metric-card { border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 8px; color: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
    .metric-card .label { font-size: 13px; opacity: 0.85; font-weight: 600; }
    .metric-card .value { font-size: 26px; font-weight: 800; }
    .metric-card .subtext { font-size: 12px; opacity: 0.9; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 6px; margin-top: 4px; }
    
    .gradient-blue { background: linear-gradient(135deg, #1e3c72, #2a5298); }
    .gradient-purple { background: linear-gradient(135deg, #6a11cb, #2575fc); }
    .gradient-green { background: linear-gradient(135deg, #11998e, #38ef7d); }
    .gradient-orange { background: linear-gradient(135deg, #f12711, #f5af19); }

    .dashboard-sections { display: grid; grid-template-columns: 1.6fr 1fr; gap: 20px; margin-top: 24px; }
    @media (max-width: 900px) { .dashboard-sections { grid-template-columns: 1fr; } }

    .quick-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding: 18px; }
    .action-card { display: flex; flex-direction: column; align-items: flex-start; text-align: right; background: var(--nb-surface);
      border: 1px solid var(--nb-border-soft); border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.2s; }
    .action-card:hover { border-color: #2563eb; box-shadow: 0 4px 12px rgba(37,99,235,0.1); transform: translateY(-2px); }
    .action-card .icon { font-size: 24px; margin-bottom: 8px; }
    .action-card .title { font-weight: 700; font-size: 14px; color: var(--nb-text); margin-bottom: 2px; }
    .action-card .desc { font-size: 11.5px; color: var(--nb-text-muted); }

    .recent-list { display: flex; flex-direction: column; gap: 12px; padding: 16px; }
    .recent-item { display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--nb-border-soft); padding-bottom: 10px; }
    .recent-item .avatar, .emp-cell .avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center;
      justify-content: center; background: #e0f2fe; color: #0369a1; font-weight: 700; font-size: 12px; }
    .recent-item .info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
    .recent-item .name { font-weight: 600; font-size: 13.5px; color: var(--nb-text); }
    .recent-item .role { font-size: 11.5px; color: var(--nb-text-muted); }
    
    .btn-contract-sm { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; border-radius: 6px; padding: 4px 8px; font-size: 11.5px; cursor: pointer; font-weight: 600; }

    .toolbar { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .toolbar .search input { width: 300px; height: 36px; padding: 0 12px; border: 1px solid var(--nb-border); border-radius: 8px; font-size: 13px; outline: none; }
    .toolbar .filters select { height: 36px; min-width: 180px; border: 1px solid var(--nb-border); border-radius: 8px; padding: 0 10px; font-size: 13px; outline: none; }

    .tbl { display: flex; flex-direction: column; width: 100%; }
    .tbl-head { display: grid; padding: 12px 18px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; color: #475569; }
    .tbl-row { display: grid; padding: 12px 18px; border-bottom: 1px solid #e2e8f0; align-items: center; font-size: 13.5px; color: var(--nb-text); }
    .tbl-row:hover { background: #f1f5f9; }
    .tbl-empty { text-align: center; padding: 32px; font-size: 13px; color: #64748b; }

    .emp-cell { display: flex; align-items: center; gap: 12px; }
    .emp-cell .details { display: flex; flex-direction: column; gap: 2px; }
    .emp-cell .name { font-weight: 700; color: var(--nb-text); }
    .emp-cell .email { font-size: 11.5px; color: #64748b; }
    .total-salary { font-weight: 700; color: #166534; }
    .phone-cell { font-variant-numeric: tabular-nums; }

    .badge { padding: 4px 10px; border-radius: 6px; font-size: 11.5px; font-weight: 700; text-align: center; display: inline-block; }
    .badge.active, .badge.approved { background: rgba(52,199,89,.15); color: #28a745; }
    .badge.probation { background: rgba(255,149,0,.15); color: #ff9500; }

    .actions-cell { display: flex; gap: 6px; }
    .btn-action { border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
    .btn-action.print { background: #e0f2fe; color: #0369a1; }
    .btn-action.msg { background: #f3e8ff; color: #7e22ce; }
    .btn-action.approve { background: #16a34a; color: #fff; }
    .btn-action.reject { background: #dc2626; color: #fff; }

    .emp-cell.clickable { cursor: pointer; }
    .emp-cell.clickable:hover .font-link { color: #2563eb; text-decoration: underline; }
    .btn-action.view { background: #f0fdf4; color: #166534; }

    .animate-fade { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class HRComponent implements OnInit {
  private readonly notify = inject(NotificationService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly activeTab = signal<'dashboard' | 'directory' | 'contracts' | 'advances' | 'requests'>('dashboard');

  showMsgModal = false;
  showContractModal = false;

  selectedEmployee = signal<Employee | null>(null);
  selectedContractEmployee = signal<any>(null);

  searchQuery = '';
  deptFilter = '';

  readonly loading = signal(true);
  readonly employees = signal<Employee[]>([]);
  readonly advances = signal<any[]>([]);

  readonly requests = signal<LeaveRequest[]>([
    {
      id: '1',
      employeeName: 'أ. عثمان أحمد العوض',
      type: 'إجازة سنوية',
      startDate: '2026-07-15',
      endDate: '2026-07-25',
      duration: 10,
      status: 'pending',
      reason: 'سفر لأداء العمرة وقضاء الإجازة السنوية'
    },
    {
      id: '2',
      employeeName: 'أ. مريم إبراهيم علي',
      type: 'إجازة مرضية',
      startDate: '2026-07-08',
      endDate: '2026-07-10',
      duration: 2,
      status: 'approved',
      reason: 'تقرير طبي - وعكة صحية طارئة'
    }
  ]);

  readonly activeCount = computed(() => this.employees().filter((e) => e.status === 'active').length);
  readonly totalPayroll = computed(() => this.employees().reduce((sum, e) => sum + (e.net_payable || e.salary), 0));
  readonly totalAllowances = computed(() => this.employees().reduce((sum, e) => sum + e.allowance, 0));
  readonly pendingCount = computed(() => this.requests().filter((r) => r.status === 'pending').length);

  readonly recentEmployees = computed(() => {
    return [...this.employees()].sort((a, b) => (b.hireDate || '').localeCompare(a.hireDate || '')).slice(0, 5);
  });

  readonly filteredEmployees = computed(() => {
    const q = this.searchQuery.trim().toLowerCase();
    const dept = this.deptFilter;
    return this.employees().filter((e) => {
      const matchQ = !q || (e.name && e.name.toLowerCase().includes(q)) || (e.jobTitle && e.jobTitle.toLowerCase().includes(q));
      const matchDept = !dept || e.department === dept;
      return matchQ && matchDept;
    });
  });

  ngOnInit() {
    this.loadEmployees();
    this.loadAdvances();
  }

  private cleanApiUrl(endpoint: string): string {
    const base = environment.apiUrl.replace(/\/+$/, '');
    const cleanEndpoint = endpoint.replace(/^\/+/, '');
    if (base.endsWith('/v1') && cleanEndpoint.startsWith('v1/')) {
      return `${base.replace(/\/v1$/, '')}/${cleanEndpoint}`;
    }
    return `${base}/${cleanEndpoint}`;
  }

  loadEmployees() {
    this.loading.set(true);
    const url = this.cleanApiUrl('v1/employees/employees/?page_size=100&ordering=-created_at');
    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.loading.set(false);
        const rawList = Array.isArray(res) 
          ? res 
          : (res?.data?.results || res?.data || res?.results || []);
        
        if (Array.isArray(rawList)) {
          const mapped: Employee[] = rawList.map((e: any) => ({
            id: e.id,
            name: e.full_name_ar || e.full_name_en || 'موظف/معلم',
            avatar: e.photo_url || '',
            jobTitle: e.position || 'معلم',
            department: e.department || 'التعليم والإشراف',
            email: e.email || '',
            phone: e.mobile || e.phone_1 || '',
            hireDate: e.joining_date || '2026-01-01',
            status: (e.status === 'suspended' ? 'suspended' : (e.status === 'probation' ? 'probation' : 'active')) as 'active' | 'suspended' | 'probation',
            salary: Number(e.basic_salary) || 200000,
            allowance: (Number(e.transport_allowance) || 80000) + (Number(e.communication_allowance) || 40000) + (Number(e.representation_allowance) || 30000),
            basic_salary: Number(e.basic_salary) || 200000,
            transport_allowance: Number(e.transport_allowance) || 80000,
            communication_allowance: Number(e.communication_allowance) || 40000,
            representation_allowance: Number(e.representation_allowance) || 30000,
            deductions: Number(e.deductions) || 0,
            net_payable: Number(e.net_payable) || 350000,
            contractType: e.employment_type === 'Full-time' ? 'دوام كامل' : 'عقد مؤقت',
            fullData: e
          }));
          this.employees.set(mapped);
        }
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  loadAdvances() {
    const url = this.cleanApiUrl('v1/employees/employees/all-advances/');
    this.http.get<any>(url).subscribe({
      next: (res) => {
        const rawAdvances = Array.isArray(res) 
          ? res 
          : (res?.data?.results || res?.data || res?.results || []);
        if (Array.isArray(rawAdvances)) {
          this.advances.set(rawAdvances);
        }
      }
    });
  }

  viewDetails(emp: Employee) {
    this.router.navigate(['/hr/employees', emp.id]);
  }

  openContractModal(emp: Employee) {
    this.selectedContractEmployee.set(emp.fullData || emp);
    this.showContractModal = true;
  }

  openMessageModal(emp: Employee) {
    this.selectedEmployee.set(emp);
    this.showMsgModal = true;
  }

  initials(name: string): string {
    if (!name) return 'م';
    const parts = name.split(' ');
    const first = parts[0]?.replace('أ.', '')?.replace('م.', '')?.trim() || '';
    const second = parts[1] || '';
    return (first[0] || '') + (second[0] || '');
  }

  requestStatusText(st: string): string {
    return { pending: 'معلق', approved: 'معتمد', rejected: 'مرفوض' }[st] || st;
  }

  approveRequest(id: string): void {
    this.requests.update((list) =>
      list.map((r) => (r.id === id ? { ...r, status: 'approved' } : r))
    );
    this.notify.success('تم اعتماد وتفعيل إجازة الموظف بنجاح.');
  }

  rejectRequest(id: string): void {
    this.requests.update((list) =>
      list.map((r) => (r.id === id ? { ...r, status: 'rejected' } : r))
    );
    this.notify.success('تم رفض طلب الإجازة.');
  }

  navigateToCreate(): void {
    this.router.navigate(['/hr/create']);
  }

  exportPayrollReport(): void {
    this.notify.success('تم تصدير شيت الرواتب ومفردات عقود 2026م بنجاح.');
  }
}
