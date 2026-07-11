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
  contractType: string;
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
  imports: [CommonModule, FormsModule, MatDialogModule, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="الموارد البشرية" subtitle="إدارة الموظفين، العقود، طلبات الإجازات، والخدمة الذاتية.">
        <button class="nb-btn-secondary" (click)="activeTab.set('requests')">الطلبات المعلقة ({{ pendingCount() }})</button>
        <button class="nb-btn-primary" (click)="navigateToCreate()">إضافة موظف جديد</button>
      </nb-page-header>

      <!-- التبويبات الرئيسية بتصميم عصري -->
      <div class="tabs-nav">
        <button class="tab-btn" [class.active]="activeTab() === 'dashboard'" (click)="activeTab.set('dashboard')">
          📊 لوحة الإحصائيات
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'directory'" (click)="activeTab.set('directory')">
          👥 دليل الموظفين
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'contracts'" (click)="activeTab.set('contracts')">
          📄 العقود والرواتب
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'requests'" (click)="activeTab.set('requests')">
          📥 الإجازات والطلبات
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'org'" (click)="activeTab.set('org')">
          🏢 الهيكل والتهيئة
        </button>
      </div>

      <!-- محتوى التبويب: لوحة الإحصائيات -->
      @if (activeTab() === 'dashboard') {
        <div class="stats-grid animate-fade">
          <div class="metric-card gradient-blue">
            <span class="label">إجمالي الموظفين</span>
            <span class="value">{{ employees().length }} موظف</span>
            <span class="subtext">نشط: {{ activeCount() }} | تجربة: {{ probationCount() }}</span>
          </div>
          <div class="metric-card gradient-purple">
            <span class="label">رواتب الشهر الحالي</span>
            <span class="value">{{ totalPayroll() | number }} ج.س</span>
            <span class="subtext">البدلات الإجمالية: {{ totalAllowances() | number }} ج.س</span>
          </div>
          <div class="metric-card gradient-green">
            <span class="label">طلبات الإجازات المعتمدة</span>
            <span class="value">{{ approvedRequestsCount() }} طلب</span>
            <span class="subtext">الطلبات المعلقة بانتظار القرار: {{ pendingCount() }}</span>
          </div>
          <div class="metric-card gradient-orange">
            <span class="label">معدل الانضباط هذا الشهر</span>
            <span class="value">96.8%</span>
            <span class="subtext">متوسط التأخير: 12 دقيقة</span>
          </div>
        </div>

        <div class="dashboard-sections animate-fade">
          <!-- الإجراءات السريعة -->
          <nb-panel title="إجراءات سريعة للموارد البشرية" [flush]="true">
            <div class="quick-actions">
              <button class="action-card" (click)="navigateToCreate()">
                <span class="icon">➕</span>
                <span class="title">توظيف جديد</span>
                <span class="desc">إنشاء ملف وتعاقد لموظف</span>
              </button>
              <button class="action-card" (click)="activeTab.set('requests')">
                <span class="icon">📝</span>
                <span class="title">اعتماد إجازة</span>
                <span class="desc">مراجعة طلبات الإجازة المعلقة</span>
              </button>
              <button class="action-card" (click)="exportPayrollReport()">
                <span class="icon">📥</span>
                <span class="title">تصدير الرواتب</span>
                <span class="desc">تحميل شيت الرواتب كـ Excel</span>
              </button>
              <button class="action-card" (click)="activeTab.set('org')">
                <span class="icon">🏢</span>
                <span class="title">إدارة الأقسام</span>
                <span class="desc">إضافة إدارة أو تعديل هيكل</span>
              </button>
            </div>
          </nb-panel>

          <!-- التوظيفات الأخيرة -->
          <nb-panel title="الموظفون الملتحقون حديثاً" [flush]="true">
            <div class="recent-list">
              @for (emp of recentEmployees(); track emp.id) {
                <div class="recent-item">
                  <span class="avatar">{{ initials(emp.name) }}</span>
                  <div class="info">
                    <span class="name">{{ emp.name }}</span>
                    <span class="role">{{ emp.jobTitle }} • {{ emp.department }}</span>
                  </div>
                  <span class="date">{{ emp.hireDate }}</span>
                </div>
              }
            </div>
          </nb-panel>
        </div>
      }

      <!-- محتوى التبويب: دليل الموظفين -->
      @if (activeTab() === 'directory') {
        <div class="toolbar animate-fade">
          <div class="search">
            <input [(ngModel)]="searchQuery" placeholder="بحث باسم الموظف أو المسمى الوظيفي…" />
          </div>
          <div class="filters">
            <select [(ngModel)]="deptFilter">
              <option value="">جميع الأقسام</option>
              <option value="التعليم والإشراف">التعليم والإشراف</option>
              <option value="الإدارة المالية">الإدارة المالية</option>
              <option value="تقنية المعلومات">تقنية المعلومات</option>
              <option value="الموارد البشرية">الموارد البشرية</option>
            </select>
          </div>
        </div>

        <nb-panel [flush]="true" class="animate-fade">
          <div class="tbl">
            <div class="tbl-head" style="grid-template-columns: 1.5fr 1.2fr 1fr 1fr 1fr 1fr">
              <span>الموظف</span><span>المسمى الوظيفي</span><span>القسم</span><span>رقم الهاتف</span><span>تاريخ التعيين</span><span>الحالة</span>
            </div>
            @if (filteredEmployees().length === 0) {
              <div class="tbl-empty">لا يوجد موظفون يطابقون خيارات البحث.</div>
            } @else {
              @for (emp of filteredEmployees(); track emp.id) {
                <div class="tbl-row" style="grid-template-columns: 1.5fr 1.2fr 1fr 1fr 1fr 1fr">
                  <span class="emp-cell">
                    <span class="avatar">{{ initials(emp.name) }}</span>
                    <div class="details">
                      <span class="name">{{ emp.name }}</span>
                      <span class="email">{{ emp.email }}</span>
                    </div>
                  </span>
                  <span>{{ emp.jobTitle }}</span>
                  <span>{{ emp.department }}</span>
                  <span class="phone-cell">{{ emp.phone }}</span>
                  <span>{{ emp.hireDate }}</span>
                  <span>
                    <span class="badge" [class]="emp.status">{{ statusText(emp.status) }}</span>
                  </span>
                </div>
              }
            }
          </div>
        </nb-panel>
      }

      <!-- محتوى التبويب: العقود والرواتب -->
      @if (activeTab() === 'contracts') {
        <nb-panel [flush]="true" class="animate-fade">
          <div class="tbl">
            <div class="tbl-head" style="grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr">
              <span>الموظف</span><span>نوع العقد</span><span>الراتب الأساسي</span><span>البدلات</span><span>إجمالي المستحقات</span>
            </div>
            @for (emp of employees(); track emp.id) {
              <div class="tbl-row" style="grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr">
                <span class="emp-cell">
                  <span class="avatar">{{ initials(emp.name) }}</span>
                  <div class="details">
                    <span class="name">{{ emp.name }}</span>
                    <span class="role">{{ emp.jobTitle }}</span>
                  </div>
                </span>
                <span>{{ emp.contractType }}</span>
                <span>{{ emp.salary | number }} ج.س</span>
                <span>{{ emp.allowance | number }} ج.س</span>
                <span class="total-salary">{{ (emp.salary + emp.allowance) | number }} ج.س</span>
              </div>
            }
          </div>
        </nb-panel>
      }

      <!-- محتوى التبويب: الإجازات والطلبات -->
      @if (activeTab() === 'requests') {
        <nb-panel [flush]="true" class="animate-fade">
          <div class="tbl">
            <div class="tbl-head" style="grid-template-columns: 1.2fr 1fr 1.5fr 0.8fr 1fr 1.2fr">
              <span>الموظف</span><span>نوع الطلب</span><span>الفترة والمدة</span><span>السبب</span><span>الحالة</span><span>إجراءات</span>
            </div>
            @if (requests().length === 0) {
              <div class="tbl-empty">لا توجد طلبات إجازة مسجلة.</div>
            } @else {
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
            }
          </div>
        </nb-panel>
      }

      <!-- محتوى التبويب: الهيكل والتهيئة -->
      @if (activeTab() === 'org') {
        <div class="org-grid animate-fade">
          <nb-panel title="إدارات المؤسسة">
            <div class="dept-list">
              <div class="dept-card">
                <h4>🏫 إدارة التعليم والإشراف</h4>
                <p>عدد الموظفين: 12 موظف</p>
                <span class="manager">المدير المسؤول: أ. محمد أحمد الفكي</span>
              </div>
              <div class="dept-card">
                <h4>💼 الإدارة المالية والمشتريات</h4>
                <p>عدد الموظفين: 3 موظفين</p>
                <span class="manager">المدير المسؤول: أ. عثمان نوري</span>
              </div>
              <div class="dept-card">
                <h4>🖥️ إدارة تقنية المعلومات</h4>
                <p>عدد الموظفين: 2 موظفين</p>
                <span class="manager">المدير المسؤول: م. حيدر محجوب</span>
              </div>
              <div class="dept-card">
                <h4>👥 إدارة الموارد البشرية والخدمات</h4>
                <p>عدد الموظفين: 2 موظفين</p>
                <span class="manager">المدير المسؤول: أ. أمل مصطفى</span>
              </div>
            </div>
          </nb-panel>

          <nb-panel title="أوقات وساعات العمل الرسمية">
            <div class="worktime-config">
              <div class="config-row">
                <span>ساعات العمل الأساسية</span>
                <strong>08:00 ص - 03:00 م</strong>
              </div>
              <div class="config-row">
                <span>فترة السماح الصباحية</span>
                <strong>15 دقيقة</strong>
              </div>
              <div class="config-row">
                <span>أيام العمل الأسبوعية</span>
                <strong>من الأحد إلى الخميس</strong>
              </div>
              <div class="config-row">
                <span>رصيد الإجازات السنوي المتاح</span>
                <strong>30 يوماً مدفوعة القيمة</strong>
              </div>
            </div>
          </nb-panel>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; font-family: var(--nb-font-family); background: var(--nb-background); }
    .tabs-nav { display: flex; gap: 8px; border-bottom: 2px solid var(--nb-border-soft); margin-bottom: 24px; padding-bottom: 4px; }
    .tab-btn { background: none; border: none; padding: 10px 18px; font-family: var(--nb-font-family); font-size: 14px;
      font-weight: 600; color: var(--nb-text-secondary); cursor: pointer; border-radius: var(--nb-radius); transition: all 0.2s; }
    .tab-btn:hover { background: var(--nb-surface-raised); color: var(--nb-text); }
    .tab-btn.active { background: var(--nb-primary-50); color: var(--nb-primary-700); font-weight: 700; }

    /* الإحصائيات مع تدرجات لونية ممتازة */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .metric-card { border-radius: var(--nb-radius-card); padding: 20px; display: flex; flex-direction: column; gap: 8px; color: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
    .metric-card .label { font-size: 13px; opacity: 0.85; font-weight: 600; }
    .metric-card .value { font-size: 26px; font-weight: 800; }
    .metric-card .subtext { font-size: 12px; opacity: 0.9; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 6px; margin-top: 4px; }
    
    .gradient-blue { background: linear-gradient(135deg, #1e3c72, #2a5298); }
    .gradient-purple { background: linear-gradient(135deg, #6a11cb, #2575fc); }
    .gradient-green { background: linear-gradient(135deg, #11998e, #38ef7d); }
    .gradient-orange { background: linear-gradient(135deg, #f12711, #f5af19); }

    .dashboard-sections { display: grid; grid-template-columns: 1.6fr 1fr; gap: 20px; margin-top: 24px; }
    @media (max-width: 900px) { .dashboard-sections { grid-template-columns: 1fr; } }

    /* بطاقات الإجراءات السريعة */
    .quick-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding: 18px; }
    .action-card { display: flex; flex-direction: column; align-items: flex-start; text-align: right; background: var(--nb-surface);
      border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius-card); padding: 16px; cursor: pointer; transition: all 0.2s; }
    .action-card:hover { border-color: var(--nb-primary-400); box-shadow: 0 4px 12px var(--nb-primary-50); transform: translateY(-2px); }
    .action-card .icon { font-size: 24px; margin-bottom: 8px; }
    .action-card .title { font-weight: 700; font-size: 14px; color: var(--nb-text); margin-bottom: 2px; }
    .action-card .desc { font-size: 11.5px; color: var(--nb-text-muted); }

    /* قائمة الأحدث */
    .recent-list { display: flex; flex-direction: column; gap: 12px; padding: 16px; }
    .recent-item { display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--nb-border-soft); padding-bottom: 10px; }
    .recent-item:last-child { border: none; padding: 0; }
    .recent-item .avatar, .emp-cell .avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center;
      justify-content: center; background: var(--nb-primary-100); color: var(--nb-primary-700); font-weight: 700; font-size: 12px; }
    .recent-item .info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
    .recent-item .name { font-weight: 600; font-size: 13.5px; color: var(--nb-text); }
    .recent-item .role { font-size: 11.5px; color: var(--nb-text-muted); }
    .recent-item .date { font-size: 11.5px; color: var(--nb-text-secondary); font-variant-numeric: tabular-nums; }

    /* دليل الموظفين */
    .toolbar { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .toolbar .search input { width: 300px; height: 36px; padding: 0 12px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      font-size: 13px; font-family: var(--nb-font-family); color: var(--nb-text); background: var(--nb-surface); outline: none; }
    .toolbar .search input:focus { border-color: var(--nb-primary-500); }
    .toolbar .filters select { height: 36px; min-width: 180px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      padding: 0 10px; font-size: 13px; font-family: var(--nb-font-family); background: var(--nb-surface); outline: none; }

    /* الجداول */
    .tbl { display: flex; flex-direction: column; width: 100%; }
    .tbl-head { display: grid; padding: 12px 18px; background: var(--nb-surface-raised); border-bottom: 1px solid var(--nb-border);
      font-size: 13px; font-weight: 700; color: var(--nb-text-secondary); }
    .tbl-row { display: grid; padding: 12px 18px; border-bottom: 1px solid var(--nb-border-soft); align-items: center; font-size: 13.5px; color: var(--nb-text); }
    .tbl-row:hover { background: var(--nb-surface-raised); }
    .tbl-empty { text-align: center; padding: 32px; font-size: 13px; color: var(--nb-text-muted); }

    .emp-cell { display: flex; align-items: center; gap: 12px; }
    .emp-cell .details { display: flex; flex-direction: column; gap: 2px; }
    .emp-cell .name { font-weight: 700; color: var(--nb-text); }
    .emp-cell .email { font-size: 11.5px; color: var(--nb-text-muted); }
    .total-salary { font-weight: 700; color: var(--nb-primary-700); }
    .phone-cell { font-variant-numeric: tabular-nums; }

    /* شارات الحالة */
    .badge { padding: 4px 10px; border-radius: 6px; font-size: 11.5px; font-weight: 700; text-align: center; display: inline-block; }
    .badge.active { background: rgba(52,199,89,.15); color: #28a745; }
    .badge.probation { background: rgba(255,149,0,.15); color: #ff9500; }
    .badge.suspended { background: rgba(255,59,48,.15); color: #dc3545; }
    .badge.pending { background: rgba(0,122,255,.15); color: #007aff; }
    .badge.approved { background: rgba(52,199,89,.15); color: #28a745; }
    .badge.rejected { background: rgba(255,59,48,.15); color: #dc3545; }

    /* أزرار الإجراءات */
    .actions-cell { display: flex; gap: 8px; }
    .btn-action { border: none; padding: 4px 10px; border-radius: 6px; font-family: var(--nb-font-family); font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
    .btn-action:hover { opacity: 0.85; }
    .btn-action.approve { background: var(--nb-primary-600); color: #fff; }
    .btn-action.reject { background: var(--nb-danger); color: #fff; }
    .status-done { font-size: 12px; color: var(--nb-text-muted); font-weight: 600; }

    /* الهيكل الإداري */
    .org-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; }
    @media (max-width: 900px) { .org-grid { grid-template-columns: 1fr; } }
    .dept-list { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 16px; }
    .dept-card { background: var(--nb-surface); border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius-card); padding: 14px; }
    .dept-card h4 { margin: 0 0 6px; font-size: 14px; color: var(--nb-text); }
    .dept-card p { margin: 0 0 8px; font-size: 12px; color: var(--nb-text-secondary); }
    .dept-card .manager { font-size: 11.5px; color: var(--nb-primary-600); font-weight: 600; }

    .worktime-config { display: flex; flex-direction: column; gap: 12px; padding: 16px; }
    .config-row { display: flex; justify-content: space-between; border-bottom: 1px solid var(--nb-border-soft); padding-bottom: 10px; font-size: 13px; }
    .config-row:last-child { border: none; padding: 0; }
    .config-row span { color: var(--nb-text-secondary); }
    .config-row strong { color: var(--nb-text); }

    /* الحركات والأنيميشن */
    .animate-fade { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

    /* النوافذ المنبثقة */
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fade .18s; }
    .modal { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 24px; width: 480px; max-width: 90vw; }
    .modal h3 { margin: 0 0 6px; font-size: 16px; color: var(--nb-text); }
    .modal-sub { margin: 0 0 16px; font-size: 12.5px; color: var(--nb-text-muted); }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    @media (max-width: 500px) { .form-grid { grid-template-columns: 1fr; } }
    .form-grid .fld { grid-column: span 1; }
    .form-grid .fld.req { }
    .fld label { font-size: 12px; font-weight: 600; color: var(--nb-text); margin-bottom: 5px; }
    .fld input, .fld select { height: 36px; padding: 0 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); font-size: 13px; font-family: var(--nb-font-family); background: var(--nb-surface); color: var(--nb-text); outline: none; width: 100%; }
    .fld input:focus, .fld select:focus { border-color: var(--nb-primary-600); }
    .modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
  `],
})
export class HRComponent implements OnInit {
  private readonly notify = inject(NotificationService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly activeTab = signal<'dashboard' | 'directory' | 'contracts' | 'requests' | 'org'>('dashboard');

  // الفلاتر والبحث
  searchQuery = '';
  deptFilter = '';

  // بيانات الموظفين
  readonly employees = signal<Employee[]>([]);

  // قائمة طلبات الإجازات والخدمة الذاتية
  readonly requests = signal<LeaveRequest[]>([
    {
      id: '1',
      employeeName: 'أ. محمد أحمد الفكي',
      type: 'إجازة سنوية',
      startDate: '2026-07-15',
      endDate: '2026-07-25',
      duration: 10,
      status: 'pending',
      reason: 'سفر لأداء العمرة وقضاء الإجازة السنوية'
    },
    {
      id: '2',
      employeeName: 'أ. سارة جعفر كمال',
      type: 'إجازة مرضية',
      startDate: '2026-07-08',
      endDate: '2026-07-10',
      duration: 2,
      status: 'approved',
      reason: 'تقرير طبي - وعكة صحية طارئة'
    }
  ]);

  // محسوبات لوحة التحكم
  readonly activeCount = computed(() => this.employees().filter((e) => e.status === 'active').length);
  readonly probationCount = computed(() => this.employees().filter((e) => e.status === 'probation').length);
  readonly totalPayroll = computed(() => this.employees().reduce((sum, e) => sum + e.salary, 0));
  readonly totalAllowances = computed(() => this.employees().reduce((sum, e) => sum + e.allowance, 0));
  readonly pendingCount = computed(() => this.requests().filter((r) => r.status === 'pending').length);
  readonly approvedRequestsCount = computed(() => this.requests().filter((r) => r.status === 'approved').length);

  readonly recentEmployees = computed(() => {
    return [...this.employees()].sort((a, b) => b.hireDate.localeCompare(a.hireDate)).slice(0, 3);
  });

  readonly filteredEmployees = computed(() => {
    const q = this.searchQuery.trim().toLowerCase();
    const dept = this.deptFilter;
    return this.employees().filter((e) => {
      const matchQ = !q || e.name.toLowerCase().includes(q) || e.jobTitle.toLowerCase().includes(q);
      const matchDept = !dept || e.department === dept;
      return matchQ && matchDept;
    });
  });

  ngOnInit() {
    this.loadEmployees();
  }

  loadEmployees() {
    this.http.get<any>(`${environment.apiUrl}employees/employees/`).subscribe({
      next: (res) => {
        if (res && res.success) {
          const mapped = res.data.map((e: any) => ({
            id: e.id,
            name: e.full_name_ar,
            avatar: e.photo_url || '',
            jobTitle: e.position,
            department: e.department,
            email: e.email,
            phone: e.mobile,
            hireDate: e.joining_date,
            status: e.status === 'active' ? 'active' : (e.status === 'suspended' ? 'suspended' : 'probation'),
            salary: Number(e.salary) || 250000,
            allowance: Number(e.allowance) || Math.round((Number(e.salary) || 250000) * 0.2),
            contractType: e.employment_type === 'Full-time' ? 'دوام كامل' : (e.employment_type === 'Part-time' ? 'دوام جزئي' : 'عقد مؤقت')
          }));
          this.employees.set(mapped);
        }
      }
    });
  }

  initials(name: string): string {
    const parts = name.split(' ');
    const first = parts[0]?.replace('أ.', '')?.replace('م.', '')?.trim() || '';
    const second = parts[1] || '';
    return (first[0] || '') + (second[0] || '');
  }

  statusText(st: string): string {
    return { active: 'نشط', suspended: 'موقوف', probation: 'فترة التجربة' }[st] || st;
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
    this.notify.success('تم تصدير ملف مسيرات الرواتب لشهر يوليو بنجاح.');
  }
}
