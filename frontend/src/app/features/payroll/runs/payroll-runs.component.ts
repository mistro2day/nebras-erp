import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { NbDatepickerComponent } from '../../../shared/nebras/nb-datepicker.component';
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
  employee?: string;
  employee_name?: string;
  basic_salary: string;
  gross_earnings: string;
  total_deductions: string;
  net_salary: string;
  status: string;
  custom_earnings?: { name: string; amount: number }[];
  custom_deductions?: { name: string; amount: number }[];
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
  imports: [CommonModule, DecimalPipe, DatePipe, FormsModule, NbPageHeaderComponent, NbLoadingComponent, NbDatepickerComponent],
  template: `
    <div class="page" dir="rtl">

      <!-- ═══════════════ الخطوة 1: اختيار أو إنشاء المسير ═══════════════ -->
      @if (currentStep() === 1) {
        <nb-page-header title="مسيرات الرواتب" subtitle="اختر مسيراً موجوداً أو أنشئ مسيراً جديداً لبدء المراجعة.">
          <div class="header-actions">
            <button class="nb-btn nb-btn-primary" (click)="openCreateModal()">
              <span class="btn-icon">+</span> إنشاء مسير جديد
            </button>
            <button class="nb-btn nb-btn-ghost" (click)="goBack()">العودة</button>
          </div>
        </nb-page-header>

        @if (loading()) {
          <nb-loading message="جاري تحميل المسيرات..."></nb-loading>
        }

        <!-- شبكة بطاقات المسيرات -->
        <div class="runs-grid">
          @for (run of runs(); track run.id) {
            <div
              class="run-tile"
              [class.tile-draft]="run.status === 'draft'"
              [class.tile-review]="run.status === 'review'"
              [class.tile-approved]="run.status === 'approved'"
              [class.tile-paid]="run.status === 'paid'"
              (click)="enterReview(run)"
            >
              <div class="tile-top">
                <span class="tile-month">{{ run.period_code || '—' }}</span>
                <span class="tile-badge" [attr.data-status]="run.status">{{ getStatusLabel(run.status) }}</span>
              </div>

              <div class="tile-cost">
                {{ formatCost(run.total_cost) }}
                <small>ج.س</small>
              </div>

              <div class="tile-meta">
                <span>تاريخ الإنشاء: {{ run.run_date | date:'yyyy/MM/dd' }}</span>
              </div>

              <div class="tile-action">
                <span class="tile-cta">فتح ومراجعة ←</span>
              </div>
            </div>
          }

          @if (!loading() && runs().length === 0) {
            <div class="empty-state">
              <div class="empty-icon">📋</div>
              <h4>لا توجد مسيرات رواتب بعد</h4>
              <p>أنشئ مسيراً جديداً للبدء بإعداد كشوف الموظفين لهذا الشهر.</p>
              <button class="nb-btn nb-btn-primary" (click)="openCreateModal()">إنشاء مسير جديد</button>
            </div>
          }
        </div>
      }

      <!-- ═══════════════ الخطوة 2: مراجعة وتعديل الجدول بعرض كامل ═══════════════ -->
      @if (currentStep() === 2) {
        @if (selectedRun(); as run) {
          <!-- شريط التنقل العلوي -->
          <div class="review-topbar">
            <button class="nb-btn nb-btn-ghost back-link" (click)="goToStep1()">
              → العودة لقائمة المسيرات
            </button>
            <div class="topbar-title">
              <h3>مسير رواتب شهر: {{ run.period_code }}</h3>
              <span class="topbar-badge" [attr.data-status]="run.status">{{ getStatusLabel(run.status) }}</span>
            </div>
            <div class="topbar-actions">
              <button class="nb-btn nb-btn-outline" (click)="linkAttendance()">⏰ ربط الحضور والانصراف</button>
              @if (run.status === 'draft') {
                <button class="nb-btn nb-btn-accent" (click)="openApprovalChainModal(run)">
                  🚀 تقديم للموافقة
                </button>
              }
              @if (run.status === 'approved') {
                <button class="nb-btn nb-btn-success" (click)="markAsPaid(run)">
                  💳 تأكيد الصرف
                </button>
              }
              <button class="nb-btn nb-btn-outline" (click)="exportTable()">📥 تصدير</button>
              <button class="nb-btn nb-btn-outline" (click)="printTable()">🖨️ طباعة</button>
            </div>
          </div>

          <!-- مؤشر المراحل (Stepper) -->
          <div class="stepper-bar">
            @for (step of steps; track step.key; let i = $index) {
              @let stepIdx = getStepIndex(run.status);
              <div class="stp" [class.done]="i < stepIdx" [class.active]="i === stepIdx">
                <div class="stp-dot">
                  @if (i < stepIdx) { ✓ } @else { {{ i + 1 }} }
                </div>
                <span class="stp-label">{{ step.label }}</span>
              </div>
              @if (i < steps.length - 1) {
                <div class="stp-connector" [class.filled]="i < stepIdx"></div>
              }
            }
          </div>

          <!-- سلسلة الموافقات -->
          @if (run.approvers_chain && run.approvers_chain.length > 0) {
            <div class="chain-strip">
              <span class="chain-label">سلسلة الاعتماد:</span>
              @for (approver of run.approvers_chain; track approver; let i = $index) {
                @let isDone = (run.current_approval_step || 0) > i || run.status === 'approved' || run.status === 'paid';
                @let isCurrent = (run.current_approval_step || 0) === i && run.status === 'review';
                <div class="chain-chip" [class.chip-done]="isDone" [class.chip-active]="isCurrent">
                  <span class="chip-icon">@if (isDone) { ✓ } @else if (isCurrent) { ● } @else { ○ }</span>
                  {{ getUserName(approver) }}
                </div>
                @if (i < run.approvers_chain.length - 1) {
                  <span class="chain-sep">→</span>
                }
              }
              @if (run.status === 'review') {
                <button class="nb-btn nb-btn-sm nb-btn-success chain-approve-btn" (click)="triggerApprovalDecision(run, 'approve')">
                  ✓ اعتماد الخطوة الحالية
                </button>
                <button class="nb-btn nb-btn-sm nb-btn-accent chain-reject-btn" (click)="openRejectModal(run)">
                  ✕ رفض وإرجاع لمسودة
                </button>
              }
            </div>
          }

          <!-- ملخص سريع بنمط ألوان نبراس المخصصة -->
          <div class="summary-row">
            <div class="summary-card card-blue">
              <div class="sc-value">{{ payslips().length }}</div>
              <div class="sc-label">👥 عدد الموظفين</div>
            </div>
            <div class="summary-card card-purple">
              <div class="sc-value">{{ formatCost(run.total_cost) }} <small>ج.س</small></div>
              <div class="sc-label">💰 إجمالي الرواتب المستحقة</div>
            </div>
            <div class="summary-card card-red">
              <div class="sc-value">{{ computeTotalDeductions() | number:'1.0-0' }} <small>ج.س</small></div>
              <div class="sc-label">📉 إجمالي الخصومات</div>
            </div>
            <div class="summary-card card-green">
              <div class="sc-value">{{ computeTotalNet() | number:'1.0-0' }} <small>ج.س</small></div>
              <div class="sc-label">💵 صافي المبالغ المستحقة للرواتب</div>
            </div>
          </div>

          <!-- شريط التحكم الإضافي: تخصيص الأعمدة، والبحث، والفلترة -->
          <div class="table-controls">
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input
                type="text"
                placeholder="البحث باسم الموظف أو الكود..."
                class="ctrl-input search-input"
                [ngModel]="searchQuery()"
                (input)="onSearchInput($event)"
              />
            </div>
            
            <div class="control-actions">
              <div class="dropdown-wrap">
                <button class="nb-btn nb-btn-outline" (click)="toggleColDropdown()">
                  ⚙️ تخصيص الأعمدة
                </button>
                @if (showColDropdown()) {
                  <div class="custom-dropdown">
                    <h4>تخصيص الأعمدة المتاحة</h4>
                    @for (col of availableCols(); track col.key) {
                      <label class="dropdown-item">
                        <input
                          type="checkbox"
                          [checked]="col.visible"
                          (change)="toggleColVisibility(col.key)"
                        />
                        {{ col.label }}
                      </label>
                    }
                  </div>
                }
              </div>

              <div class="dropdown-wrap">
                <button class="nb-btn nb-btn-outline" (click)="toggleAddColDropdown()">
                  ➕ إضافة عمود مالي
                </button>
                @if (showAddColDropdown()) {
                  <div class="custom-dropdown">
                    <h4>اختر نوع العمود لإضافته</h4>
                    <button class="nb-btn nb-btn-sm add-col-opt" (click)="openAddColumnModal('earning')">➕ إضافة عمود استحقاق (بدل/حافز)</button>
                    <button class="nb-btn nb-btn-sm add-col-opt opt-danger" (click)="openAddColumnModal('deduction')">➖ إضافة عمود استقطاع (خصم/جزاء)</button>
                  </div>
                }
              </div>
            </div>
          </div>

          @if (loadingPayslips()) {
            <nb-loading message="جاري تحميل كشوف الرواتب..."></nb-loading>
          }

          <!-- جدول الموظفين بعرض كامل -->
          <div class="print-header" style="display:none">
            <div class="print-logo">منصة نبراس — Nebras ERP</div>
            <div class="print-info">
              <div>كشف مسير رواتب شهر: {{ run.period_code }}</div>
              <div>إجمالي التكلفة: {{ formatCost(run.total_cost) }} ج.س | عدد الموظفين: {{ payslips().length }}</div>
            </div>
          </div>
          
          @if (!loadingPayslips()) {
            <div class="full-table-wrap" id="payroll-table">
              <table class="payroll-table">
                <thead>
                  <!-- Row 1: Header Categories -->
                  <tr>
                    <th rowspan="2" class="col-idx">#</th>
                    <th rowspan="2" class="col-name text-start-align">معلومات الموظف</th>
                    
                    <th colspan="2" class="cat-hdr cat-basic">الراتب والبدلات الأساسية</th>
                    
                    <!-- Dynamic Earnings Headers -->
                    @if (hasVisibleDynamicEarnings()) {
                      <th [attr.colspan]="getVisibleDynamicEarningsCount()" class="cat-hdr cat-earnings">الإضافات والاستحقاقات</th>
                    }
                    
                    <th rowspan="2" class="col-num col-gross cat-hdr cat-basic">إجمالي الراتب</th>
                    
                    <!-- Dynamic Deductions Headers -->
                    @if (hasVisibleDynamicDeductions()) {
                      <th [attr.colspan]="getVisibleDynamicDeductionsCount()" class="cat-hdr cat-deductions">الاستقطاعات</th>
                    }
                    
                    <th rowspan="2" class="col-num col-net cat-hdr cat-total-net">صافي الراتب</th>
                  </tr>
                  <!-- Row 2: Sub-headers -->
                  <tr>
                    <!-- Basic & Fixed -->
                    <th class="col-num">الراتب الأساسي</th>
                    <th class="col-num">بدلات أخرى</th>
                    
                    <!-- Dynamic Earnings Columns -->
                    @for (col of availableCols(); track col.key) {
                      @if (col.type === 'earning' && col.visible) {
                        <th class="col-num col-dyn-earning">
                          {{ col.label }}
                          <button class="remove-col-btn" (click)="removeDynamicColumn(col.key)">✕</button>
                        </th>
                      }
                    }
                    
                    <!-- Dynamic Deductions Columns -->
                    @for (col of availableCols(); track col.key) {
                      @if (col.type === 'deduction' && col.visible) {
                        <th class="col-num col-dyn-deduction">
                          {{ col.label }}
                          <button class="remove-col-btn" (click)="removeDynamicColumn(col.key)">✕</button>
                        </th>
                      }
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (slip of filteredPayslips(); track slip.id; let idx = $index) {
                    <tr>
                      <td class="col-idx">{{ idx + 1 }}</td>
                      <td class="col-name cell-name text-start-align">
                        <div>{{ slip.employee_name || 'موظف' }}</div>
                        <small class="emp-code">EMP-{{ slip.id.slice(0, 5) }}</small>
                      </td>
                      
                      <!-- Basic Salaries & Allowances -->
                      <td class="col-num bg-light-blue">{{ Number(slip.basic_salary) | number:'1.0-0' }}</td>
                      <td class="col-num bg-light-blue">{{ computeOther(slip) | number:'1.0-0' }}</td>
                      
                      <!-- Dynamic Earnings cells -->
                      @for (col of availableCols(); track col.key) {
                        @if (col.type === 'earning' && col.visible) {
                          <td class="col-num bg-light-green text-center"
                              [class.cursor-pointer]="run.status === 'draft'"
                              [class.cell-editable]="run.status === 'draft'"
                              (click)="run.status === 'draft' && openQuickEditModal(slip, col)">
                            @if (run.status === 'draft') { <span class="btn-cell-add">+</span> }
                            {{ getDynamicVal(slip, col.key) | number:'1.0-0' }}
                          </td>
                        }
                      }
                      
                      <!-- Gross Total -->
                      <td class="col-num col-gross bg-light-blue font-bold-text">{{ computeGrossWithDynamic(slip) | number:'1.0-0' }}</td>
                      
                      <!-- Dynamic Deductions cells -->
                      @for (col of availableCols(); track col.key) {
                        @if (col.type === 'deduction' && col.visible) {
                          <td class="col-num bg-light-red text-center"
                              [class.cursor-pointer]="run.status === 'draft'"
                              [class.cell-editable]="run.status === 'draft'"
                              (click)="run.status === 'draft' && openQuickEditModal(slip, col)">
                            @if (run.status === 'draft') { <span class="btn-cell-add btn-cell-sub">-</span> }
                            {{ getDynamicVal(slip, col.key) | number:'1.0-0' }}
                          </td>
                        }
                      }
                      
                      <!-- Net Total -->
                      <td class="col-num col-net bg-light-gold font-bold-text">{{ computeNetWithDynamic(slip) | number:'1.0-0' }}</td>
                    </tr>
                  }
                  @if (filteredPayslips().length === 0 && !loadingPayslips()) {
                    <tr>
                      <td [attr.colspan]="2 + 3 + getVisibleDynamicEarningsCount() + getVisibleDynamicDeductionsCount() + 2" class="empty-row">
                        لا توجد بيانات مطابقة لخيارات البحث المحددة.
                      </td>
                    </tr>
                  }
                </tbody>
                @if (filteredPayslips().length > 0) {
                  <tfoot>
                    <tr>
                      <td colspan="2" class="foot-label">الإجمالي الكلي</td>
                      <td class="col-num foot-val">{{ computeTotalBasic() | number:'1.0-0' }}</td>
                      <td class="col-num foot-val">—</td>
                      
                      <!-- Dynamic Earnings totals -->
                      @for (col of availableCols(); track col.key) {
                        @if (col.type === 'earning' && col.visible) {
                          <td class="col-num foot-val">{{ computeTotalDynamic(col.key) | number:'1.0-0' }}</td>
                        }
                      }
                      
                      <!-- Gross total -->
                      <td class="col-num foot-val col-gross">{{ computeTotalGrossWithDynamic() | number:'1.0-0' }}</td>
                      
                      <!-- Dynamic Deductions totals -->
                      @for (col of availableCols(); track col.key) {
                        @if (col.type === 'deduction' && col.visible) {
                          <td class="col-num foot-val">{{ computeTotalDynamic(col.key) | number:'1.0-0' }}</td>
                        }
                      }
                      
                      <!-- Net total -->
                      <td class="col-num foot-val col-net">{{ computeTotalNetWithDynamic() | number:'1.0-0' }}</td>
                    </tr>
                  </tfoot>
                }
              </table>
            </div>
          }
        }
      }
    </div>

    <!-- ════════ Modal: إنشاء مسير جديد ════════ -->
    @if (showCreateModal()) {
      <div class="overlay" (click)="closeCreateModal()">
        <div class="dialog" (click)="$event.stopPropagation()">
          <div class="dialog-head">
            <h3>إنشاء مسير رواتب جديد</h3>
            <button class="x-btn" (click)="closeCreateModal()">✕</button>
          </div>
          <form (submit)="submitCreateRun($event)" class="dialog-body">
            <label class="form-label req">تاريخ المسير</label>
            <nb-datepicker [value]="newRunDate" (valueChange)="onNewRunDateChange($event)" placeholder="اختر التاريخ"></nb-datepicker>
            <div class="dialog-foot">
              <button type="submit" class="nb-btn nb-btn-primary" [disabled]="creatingRun()">
                {{ creatingRun() ? 'جاري الإنشاء...' : 'إنشاء المسير' }}
              </button>
              <button type="button" class="nb-btn nb-btn-ghost" (click)="closeCreateModal()">إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- ════════ Modal: تحديد سلسلة المعتمدين ════════ -->
    @if (showApprovalModal()) {
      <div class="overlay" (click)="closeApprovalModal()">
        <div class="dialog dialog-wide" (click)="$event.stopPropagation()">
          <div class="dialog-head">
            <h3>تحديد سلسلة المعتمدين</h3>
            <button class="x-btn" (click)="closeApprovalModal()">✕</button>
          </div>
          <form (submit)="submitApprovalChain($event)" class="dialog-body">
            <p class="dialog-desc">حدد المسؤولين بالترتيب لاعتماد هذا المسير (3 مستويات):</p>

            <label class="form-label req">المستوى 1 — مدير الموارد البشرية</label>
            <select class="form-input" [(ngModel)]="approvers[0]" name="a1" required>
              <option value="">اختر...</option>
              @for (u of users(); track u.id) {
                <option [value]="u.id">{{ u.first_name || '' }} {{ u.last_name || '' }} — {{ u.email }}</option>
              }
            </select>

            <label class="form-label req">المستوى 2 — المدير المالي</label>
            <select class="form-input" [(ngModel)]="approvers[1]" name="a2" required>
              <option value="">اختر...</option>
              @for (u of users(); track u.id) {
                <option [value]="u.id">{{ u.first_name || '' }} {{ u.last_name || '' }} — {{ u.email }}</option>
              }
            </select>

            <label class="form-label req">المستوى 3 — المدير العام</label>
            <select class="form-input" [(ngModel)]="approvers[2]" name="a3" required>
              <option value="">اختر...</option>
              @for (u of users(); track u.id) {
                <option [value]="u.id">{{ u.first_name || '' }} {{ u.last_name || '' }} — {{ u.email }}</option>
              }
            </select>

            <div class="dialog-foot">
              <button type="submit" class="nb-btn nb-btn-primary" [disabled]="submittingApproval()">
                {{ submittingApproval() ? 'جاري الإرسال...' : 'إرسال للموافقة' }}
              </button>
              <button type="button" class="nb-btn nb-btn-ghost" (click)="closeApprovalModal()">إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- ════════ Modal: إضافة عمود مالي جديد (نبراس ديزاين) ════════ -->
    @if (showAddColModal()) {
      <div class="overlay" (click)="closeAddColumnModal()">
        <div class="dialog" (click)="$event.stopPropagation()">
          <div class="dialog-head">
            <h3>{{ newColType === 'earning' ? 'إضافة عمود استحقاق جديد' : 'إضافة عمود استقطاع جديد' }}</h3>
            <button class="x-btn" (click)="closeAddColumnModal()">✕</button>
          </div>
          <div class="dialog-body">
            <label class="form-label req">اسم العمود</label>
            <input
              type="text"
              class="form-input"
              [(ngModel)]="newColLabel"
              placeholder="مثال: حافز تميز، خصم تأخير إضافي..."
              required
            />
            <div class="dialog-foot">
              <button type="button" class="nb-btn nb-btn-primary" (click)="confirmAddNewColumn()">
                إضافة العمود
              </button>
              <button type="button" class="nb-btn nb-btn-ghost" (click)="closeAddColumnModal()">إلغاء</button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ════════ Modal: إضافة حافز / خصم مالي ════════ -->
    @if (showQuickEditModal()) {
      <div class="overlay" (click)="closeQuickEditModal()">
        <div class="dialog" (click)="$event.stopPropagation()">
          <div class="dialog-head">
            <h3>{{ activeEditCol()?.type === 'earning' ? 'إضافة استحقاق مالي' : 'إضافة خصم / استقطاع' }}</h3>
            <button class="x-btn" (click)="closeQuickEditModal()">✕</button>
          </div>
          <div class="dialog-body">
            <p class="dialog-desc">
              الموظف: <strong>{{ activeEditSlip()?.employee_name }}</strong><br>
              العمود المالي: <strong>{{ activeEditCol()?.label }}</strong>
            </p>
            
            <label class="form-label req">المبلغ بالجنيه السوداني (ج.س)</label>
            <input type="number" class="form-input" [(ngModel)]="quickEditAmount" placeholder="أدخل القيمة المباشرة..." />

            <div class="dialog-foot">
              <button type="button" class="nb-btn nb-btn-primary" (click)="saveQuickEditVal()">
                حفظ التعديل
              </button>
              <button type="button" class="nb-btn nb-btn-ghost" (click)="closeQuickEditModal()">إلغاء</button>
            </div>
          </div>
        </div>
      </div>
    }
    <!-- ════════ Modal: الرفض مع كتابة الملاحظات ════════ -->
    @if (showRejectModal()) {
      <div class="overlay" (click)="closeRejectModal()">
        <div class="dialog" (click)="$event.stopPropagation()">
          <div class="dialog-head">
            <h3>📝 تسجيل ملاحظات وسبب الرفض</h3>
            <button class="x-btn" (click)="closeRejectModal()">✕</button>
          </div>
          <div class="dialog-body">
            <p class="dialog-desc" style="margin-bottom: 12px; font-size: 13px; color: #555;">
              سيتم رفض الخطوة الحالية وإرجاع مسير الرواتب إلى حالة <strong>مسودة</strong> ليتمكن الموظف من تعديله.
            </p>
            
            <label class="form-label req" style="margin-bottom: 6px; display: block;">سبب الرفض / الملاحظات</label>
            <textarea
              class="form-input"
              style="height: 100px; padding: 10px; resize: none; width: 100%; border: 1px solid var(--nb-border);"
              [(ngModel)]="rejectComments"
              placeholder="اكتب تفاصيل سبب الرفض أو التعديلات المطلوبة من المحاسب..."
              required
            ></textarea>

            <div class="dialog-foot" style="margin-top: 16px; display: flex; gap: 8px;">
              <button type="button" class="nb-btn nb-btn-accent" [disabled]="!rejectComments.trim()" (click)="confirmRejectDecision()">
                ✕ تأكيد الرفض والإرجاع
              </button>
              <button type="button" class="nb-btn nb-btn-ghost" (click)="closeRejectModal()">إلغاء</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* ─── Foundation ─── */
    .page {
      flex: 1; padding: 24px; overflow-y: auto;
      background: var(--nb-background); font-family: var(--nb-font-family);
    }
    .header-actions { display: flex; gap: 8px; align-items: center; }
    .text-start-align { text-align: start !important; }

    /* ─── Buttons ─── */
    .nb-btn {
      display: inline-flex; align-items: center; gap: 6px;
      height: 36px; padding: 0 16px; border: none; border-radius: var(--nb-radius);
      font-family: var(--nb-font-family); font-size: 12.5px; font-weight: 600;
      cursor: pointer; transition: all .15s; white-space: nowrap;
    }
    .nb-btn-primary { background: var(--nb-primary-600); color: #fff; }
    .nb-btn-primary:hover:not(:disabled) { background: var(--nb-primary-700); }
    .nb-btn-accent { background: #e65100; color: #fff; }
    .nb-btn-accent:hover:not(:disabled) { background: #bf360c; }
    .nb-btn-success { background: #2e7d32; color: #fff; }
    .nb-btn-success:hover:not(:disabled) { background: #1b5e20; }
    .nb-btn-outline { background: transparent; border: 1px solid var(--nb-border); color: var(--nb-text); }
    .nb-btn-outline:hover { background: var(--nb-surface-raised); }
    .nb-btn-ghost { background: transparent; color: var(--nb-text-muted); }
    .nb-btn-ghost:hover { color: var(--nb-text); background: var(--nb-surface-raised); }
    .nb-btn-sm { height: 28px; padding: 0 10px; font-size: 11.5px; }
    .nb-btn:disabled { opacity: .55; cursor: not-allowed; }
    .btn-icon { font-size: 16px; line-height: 1; }

    /* ═══════ Step 1: Runs Grid ═══════ */
    .runs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
      margin-top: 4px;
    }
    .run-tile {
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
      padding: 18px;
      cursor: pointer;
      transition: border-color .15s, box-shadow .15s, transform .12s;
      display: flex; flex-direction: column; gap: 12px;
      position: relative; overflow: hidden;
    }
    .run-tile::before {
      content: ''; position: absolute; inset-block-start: 0; inset-inline-start: 0;
      width: 4px; height: 100%; border-radius: 0 4px 4px 0;
    }
    .tile-draft::before  { background: #9e9e9e; }
    .tile-review::before { background: #e65100; }
    .tile-approved::before { background: #2e7d32; }
    .tile-paid::before   { background: #0d47a1; }

    .run-tile:hover {
      border-color: var(--nb-primary-400);
      box-shadow: 0 4px 16px rgba(0,0,0,.06);
      transform: translateY(-2px);
    }

    .tile-top { display: flex; justify-content: space-between; align-items: center; }
    .tile-month { font-size: 15px; font-weight: 700; color: var(--nb-text); letter-spacing: -.3px; }
    .tile-badge {
      font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 10px;
    }
    .tile-badge[data-status="draft"]    { background: #eeeeee; color: #616161; }
    .tile-badge[data-status="review"]   { background: #fff3e0; color: #e65100; }
    .tile-badge[data-status="approved"] { background: #e8f5e9; color: #2e7d32; }
    .tile-badge[data-status="paid"]     { background: #e3f2fd; color: #0d47a1; }

    .tile-cost {
      font-size: 22px; font-weight: 800; color: var(--nb-text);
      letter-spacing: -.5px; line-height: 1.1;
    }
    .tile-cost small { font-size: 12px; font-weight: 600; color: var(--nb-text-muted); }

    .tile-meta { font-size: 11px; color: var(--nb-text-faint); }
    .tile-action { border-top: 1px solid var(--nb-border-soft); padding-top: 10px; }
    .tile-cta { font-size: 12px; font-weight: 600; color: var(--nb-primary-600); }

    .empty-state {
      grid-column: 1 / -1;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 60px 20px; text-align: center;
    }
    .empty-icon { font-size: 36px; margin-bottom: 12px; }
    .empty-state h4 { margin: 0 0 6px; font-size: 15px; color: var(--nb-text); }
    .empty-state p { margin: 0 0 16px; font-size: 12.5px; color: var(--nb-text-faint); max-width: 320px; }

    /* ═══════ Step 2: Full-width Review ═══════ */
    .review-topbar {
      display: flex; align-items: center; gap: 16px;
      padding: 12px 0; margin-bottom: 12px;
      border-bottom: 1px solid var(--nb-border-soft);
    }
    .back-link { font-size: 12.5px; }
    .topbar-title { flex: 1; display: flex; align-items: center; gap: 10px; }
    .topbar-title h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--nb-text); }
    .topbar-badge {
      font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 10px;
    }
    .topbar-badge[data-status="draft"]    { background: #eeeeee; color: #616161; }
    .topbar-badge[data-status="review"]   { background: #fff3e0; color: #e65100; }
    .topbar-badge[data-status="approved"] { background: #e8f5e9; color: #2e7d32; }
    .topbar-badge[data-status="paid"]     { background: #e3f2fd; color: #0d47a1; }
    .topbar-actions { display: flex; gap: 8px; }

    /* Stepper */
    .stepper-bar {
      display: flex; align-items: center; gap: 0;
      padding: 16px 20px; margin-bottom: 16px;
      background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
    }
    .stp { display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 80px; }
    .stp-dot {
      width: 30px; height: 30px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700;
      background: #e0e0e0; color: #757575;
      transition: all .2s;
    }
    .stp.active .stp-dot { background: var(--nb-primary-600); color: #fff; box-shadow: 0 0 0 3px rgba(var(--nb-primary-rgb, 25 118 210) / .2); }
    .stp.done .stp-dot   { background: #2e7d32; color: #fff; }
    .stp-label { font-size: 11px; font-weight: 600; color: var(--nb-text-muted); text-align: center; }
    .stp.active .stp-label { color: var(--nb-text); font-weight: 700; }
    .stp.done .stp-label   { color: #2e7d32; }

    .stp-connector { flex: 1; height: 2px; background: #e0e0e0; margin: 0 4px; position: relative; top: -9px; }
    .stp-connector.filled { background: #2e7d32; }

    /* Approval Chain Strip */
    .chain-strip {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      padding: 10px 14px; margin-bottom: 16px;
      background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius);
    }
    .chain-label { font-size: 11.5px; font-weight: 700; color: var(--nb-text); }
    .chain-chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: 14px; font-size: 11.5px; font-weight: 600;
      background: var(--nb-surface-raised); border: 1px solid var(--nb-border);
      color: var(--nb-text);
    }
    .chip-done { background: #e8f5e9; border-color: #a5d6a7; color: #2e7d32; }
    .chip-active { background: #fff8e1; border-color: #ffe082; color: #f57f17; box-shadow: 0 0 6px rgba(255,193,7,.25); }
    .chip-icon { font-size: 10px; }
    .chain-sep { color: var(--nb-text-faint); font-size: 12px; }
    .chain-approve-btn { margin-inline-start: auto; }

    /* Summary Cards with Nebras Styles */
    .summary-row {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
      margin-bottom: 18px;
    }
    @media (max-width: 800px) { .summary-row { grid-template-columns: repeat(2, 1fr); } }
    
    .summary-card {
      background: var(--nb-surface);
      border-radius: var(--nb-radius-card);
      padding: 18px;
      border: 1px solid var(--nb-border);
      box-shadow: 0 4px 12px rgba(0,0,0,0.02);
      display: flex;
      flex-direction: column;
      justify-content: center;
      position: relative;
    }
    .summary-card::after {
      content: ''; position: absolute; top: 0; bottom: 0; right: 0; width: 5px;
      border-radius: 0 4px 4px 0;
    }
    .card-blue::after { background-color: #2196f3; }
    .card-purple::after { background-color: #9c27b0; }
    .card-red::after { background-color: #f44336; }
    .card-green::after { background-color: #4caf50; }

    .card-blue .sc-value { color: #0d47a1; }
    .card-purple .sc-value { color: #4a148c; }
    .card-red .sc-value { color: #b71c1c; }
    .card-green .sc-value { color: #1b5e20; }

    .sc-value { font-size: 23px; font-weight: 800; letter-spacing: -.5px; }
    .sc-value small { font-size: 13px; font-weight: 600; opacity: 0.7; }
    .sc-label { font-size: 12px; color: var(--nb-text-muted); margin-top: 6px; font-weight: 600; }

    /* Controls Bar */
    .table-controls {
      display: flex; justify-content: space-between; align-items: center;
      gap: 16px; margin-bottom: 12px; flex-wrap: wrap;
    }
    .search-box {
      position: relative; flex: 1; max-width: 400px;
    }
    .search-icon {
      position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
      color: var(--nb-text-muted); font-size: 14px;
    }
    .search-input {
      width: 100%; height: 36px; padding: 0 36px 0 12px;
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); outline: none;
      font-size: 12.5px;
    }
    .control-actions { display: flex; gap: 8px; align-items: center; }
    
    .dropdown-wrap { position: relative; }
    .custom-dropdown {
      position: absolute; left: 0; top: calc(100% + 4px);
      background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius); box-shadow: 0 4px 16px rgba(0,0,0,.15);
      z-index: 10; padding: 12px; min-width: 200px;
      display: flex; flex-direction: column; gap: 8px;
    }
    .custom-dropdown h4 { margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: var(--nb-text); }
    .dropdown-item {
      display: flex; align-items: center; gap: 8px; font-size: 12px;
      cursor: pointer; color: var(--nb-text); padding: 4px 0;
    }
    .dropdown-item input { cursor: pointer; }
    
    .add-col-opt {
      text-align: start; width: 100%; border: 1px solid var(--nb-border-soft);
      background: var(--nb-surface-raised); padding: 6px 10px; border-radius: 4px;
      cursor: pointer; font-size: 11.5px; transition: background .15s;
    }
    .add-col-opt:hover { background: var(--nb-border-soft); }
    .opt-danger { color: #b71c1c; }

    /* Full-width Payroll Table */
    .full-table-wrap { overflow-x: auto; border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); }
    .payroll-table {
      width: 100%; border-collapse: collapse; font-size: 12px;
      text-align: center; white-space: nowrap;
    }
    .payroll-table th {
      padding: 8px 10px;
      font-weight: 700; font-size: 11px;
      border: 1px solid var(--nb-border);
      background: var(--nb-surface-raised);
      color: var(--nb-text-muted);
    }
    
    /* Header Categories colors matching the Jisr reference */
    .cat-hdr { font-weight: 700 !important; color: #4b5563 !important; font-size: 11.5px !important; text-align: center !important; }
    .cat-basic { background: #f3f4f6 !important; border-bottom: 2px solid #e5e7eb !important; }
    .cat-earnings { background: #e6fcf5 !important; border-bottom: 2px solid #34d399 !important; color: #047857 !important; }
    .cat-deductions { background: #fff1f2 !important; border-bottom: 2px solid #f87171 !important; color: #b91c1c !important; }
    .cat-total-net { background: #f5f3ff !important; border-bottom: 2px solid #818cf8 !important; color: #4f46e5 !important; }
    
    .payroll-table td {
      padding: 10px 12px;
      border: 1px solid #e5e7eb;
      color: #374151;
      vertical-align: middle;
      font-size: 12px;
    }
    .payroll-table tbody tr:hover { background: #f9fafb; }
    
    /* Column alignments and widths */
    .col-idx { width: 36px; text-align: center; color: #9ca3af; background: #f9fafb; }
    .col-name { min-width: 160px; text-align: start; font-weight: 600; color: #111827; }
    .col-num { font-variant-numeric: tabular-nums; min-width: 90px; color: #374151; }
    
    .emp-code { font-size: 10px; color: #6b7280; display: block; margin-top: 2px; font-weight: normal; }
    .font-bold-text { font-weight: 700; }
    
    /* Specific light background colors for columns matching the reference */
    .bg-light-blue { background-color: #ffffff; }
    .bg-light-green { background-color: #f6fdf9; color: #047857; }
    .bg-light-red { background-color: #fffbfb; color: #b91c1c; }
    .bg-light-gold { background-color: #faf9fe; color: #4338ca; font-weight: 700; }

    .col-gross { color: #1e3a8a; }
    .col-ded { color: #b91c1c; }
    .col-net { color: #4338ca; }
    
    .col-dyn-earning { position: relative; color: #047857; background: #ecfdf5 !important; }
    .col-dyn-deduction { position: relative; color: #b91c1c; background: #fef2f2 !important; }
    
    .remove-col-btn {
      background: none; border: none; color: #9ca3af; cursor: pointer;
      font-size: 9px; margin-inline-start: 4px; padding: 2px;
    }
    .remove-col-btn:hover { color: #ef4444; }
    
    /* Editable Cells */
    .cell-editable { position: relative; cursor: pointer; transition: background-color 0.15s; }
    .cell-editable:hover { background-color: #f3f4f6 !important; }
    .btn-cell-add {
      position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
      width: 18px; height: 18px; border-radius: 4px;
      background: #ffffff; border: 1px solid #d1d5db; color: #4b5563; font-size: 11px; font-weight: bold;
      display: none; align-items: center; justify-content: center;
      line-height: 1; box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .btn-cell-sub {
      color: #b91c1c;
    }
    .cell-editable:hover .btn-cell-add { display: inline-flex; }

    .empty-row { text-align: center; padding: 32px; color: #6b7280; }

    .payroll-table tfoot td {
      padding: 12px;
      border: 1px solid #d1d5db;
      background: #f9fafb;
      font-weight: 700;
      color: #111827;
    }
    .foot-label { color: #111827; text-align: start; }
    .foot-val { text-align: center; }

    /* ─── Modal / Dialog ─── */
    .overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.4);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .dialog {
      background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 24px;
      width: 420px; max-width: 92vw;
    }
    .dialog-wide { width: 500px; }
    .dialog-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .dialog-head h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--nb-text); }
    .x-btn { background: none; border: none; font-size: 18px; color: var(--nb-text-muted); cursor: pointer; padding: 4px; }
    .dialog-body { display: flex; flex-direction: column; gap: 12px; }
    .dialog-desc { font-size: 12px; color: var(--nb-text-muted); margin: 0; }
    .dialog-foot { display: flex; gap: 8px; margin-top: 8px; }

    .form-label { font-size: 12px; font-weight: 600; color: var(--nb-text); margin-bottom: -6px; }
    .form-label.req::after { content: ' *'; color: var(--nb-danger, #d32f2f); }
    .form-input {
      height: 38px; padding: 0 10px;
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      font-family: var(--nb-font-family); font-size: 13px;
      background: var(--nb-surface); color: var(--nb-text); outline: none;
    }
    .form-input:focus { border-color: var(--nb-primary-600); }

    /* ─── Print (Landscape) ─── */
    @media print {
      @page { size: landscape; margin: 12mm; }
      .review-topbar, .stepper-bar, .chain-strip, .summary-row, .table-controls,
      .nb-btn, .header-actions, nb-page-header { display: none !important; }
      .page { padding: 0; background: #fff; }
      .full-table-wrap { border: none; }
      .payroll-table { font-size: 11px; }
      .payroll-table th, .payroll-table td { padding: 6px 8px; }
      .print-header {
        display: flex !important;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 10px;
        border-bottom: 2px solid #333;
      }
      .print-header .print-logo { font-size: 18px; font-weight: 800; color: #1a237e; }
      .print-header .print-info { font-size: 11px; color: #555; text-align: start; }
    }
  `]
})
export class PayrollRunsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  protected readonly Number = Number;

  // ── State ──
  readonly currentStep = signal<1 | 2>(1);
  readonly runs = signal<PayrollRun[]>([]);
  readonly payslips = signal<Payslip[]>([]);
  readonly selectedRunId = signal<string | null>(null);
  readonly selectedRun = computed(() => this.runs().find(r => r.id === this.selectedRunId()));

  readonly users = signal<User[]>([]);
  readonly loading = signal(false);
  readonly loadingPayslips = signal(false);

  readonly showCreateModal = signal(false);
  readonly showApprovalModal = signal(false);
  readonly creatingRun = signal(false);
  readonly submittingApproval = signal(false);

  // Column management modal
  readonly showAddColModal = signal(false);
  newColType: 'earning' | 'deduction' = 'earning';
  newColLabel = '';

  // Quick Edit & Column customizations
  readonly showColDropdown = signal(false);
  readonly showAddColDropdown = signal(false);
  readonly showQuickEditModal = signal(false);
  
  readonly searchQuery = signal('');
  
  readonly availableCols = signal<Array<{ key: string; label: string; type: 'basic' | 'earning' | 'deduction'; visible: boolean }>>([
    { key: 'basic_salary', label: 'الراتب الأساسي', type: 'basic', visible: true },
    { key: 'other_allowances', label: 'بدلات أخرى', type: 'basic', visible: true },
    { key: 'bonus', label: 'حافز إضافي', type: 'earning', visible: true },
    { key: 'delay_deduction', label: 'خصم تأخير', type: 'deduction', visible: true },
    { key: 'absence_deduction', label: 'خصم غياب', type: 'deduction', visible: true },
  ]);

  activeEditSlip = signal<Payslip | null>(null);
  activeEditCol = signal<{ key: string; label: string; type: string } | null>(null);
  quickEditAmount: number | null = null;

  newRunDate = '';
  newRunPeriodCode = '';
  activeRunForApproval: PayrollRun | null = null;
  approvers: string[] = ['', '', ''];

  readonly showRejectModal = signal(false);
  rejectComments = '';
  activeRejectRun: PayrollRun | null = null;

  readonly steps = [
    { key: 'draft', label: 'إعداد' },
    { key: 'review', label: 'مراجعة واعتماد' },
    { key: 'approved', label: 'معتمد' },
    { key: 'paid', label: 'مصروف' },
  ];

  // ── Lifecycle ──
  ngOnInit() {
    this.loadRuns();
    this.loadUsers();
  }

  // ── Column Management ──
  toggleColDropdown() {
    this.showColDropdown.update(v => !v);
    this.showAddColDropdown.set(false);
  }
  
  toggleAddColDropdown() {
    this.showAddColDropdown.update(v => !v);
    this.showColDropdown.set(false);
  }
  
  toggleColVisibility(key: string) {
    this.availableCols.update(list => list.map(c => c.key === key ? { ...c, visible: !c.visible } : c));
  }

  openAddColumnModal(type: 'earning' | 'deduction') {
    this.newColType = type;
    this.newColLabel = '';
    this.showAddColModal.set(true);
    this.showAddColDropdown.set(false);
  }

  closeAddColumnModal() {
    this.showAddColModal.set(false);
    this.newColLabel = '';
  }

  confirmAddNewColumn() {
    const label = this.newColLabel.trim();
    if (!label) {
      this.notify.error('الرجاء إدخال اسم العمود.');
      return;
    }
    const key = 'custom_' + Date.now();
    this.availableCols.update(list => [...list, { key, label, type: this.newColType, visible: true }]);
    this.closeAddColumnModal();
    this.notify.success('تمت إضافة العمود بنجاح.');
  }

  removeDynamicColumn(key: string) {
    this.availableCols.update(list => list.filter(c => c.key !== key));
  }

  getVisibleDynamicEarningsCount(): number {
    return this.availableCols().filter(c => c.type === 'earning' && c.visible).length;
  }

  getVisibleDynamicDeductionsCount(): number {
    return this.availableCols().filter(c => c.type === 'deduction' && c.visible).length;
  }

  hasVisibleDynamicEarnings(): boolean {
    return this.getVisibleDynamicEarningsCount() > 0;
  }

  hasVisibleDynamicDeductions(): boolean {
    return this.getVisibleDynamicDeductionsCount() > 0;
  }

  // ── Helper functions for dynamic value retrieval and storage ──
  getDynamicVal(slip: Payslip, colKey: string): number {
    const col = this.availableCols().find(c => c.key === colKey);
    if (!col) return 0;
    if (colKey === 'delay_deduction') {
      return Number((slip as any).late_deduction || 0);
    }
    if (col.type === 'basic') {
      return Number((slip as any)[colKey] || 0);
    }
    if (col.type === 'earning') {
      const item = slip.custom_earnings?.find(e => e.name === col.label);
      return item ? item.amount : 0;
    } else {
      const item = slip.custom_deductions?.find(d => d.name === col.label);
      return item ? item.amount : 0;
    }
  }

  setDynamicVal(slip: Payslip, colKey: string, val: number) {
    const col = this.availableCols().find(c => c.key === colKey);
    if (!col) return;
    if (col.type === 'basic') {
      (slip as any)[colKey] = String(val);
      return;
    }
    if (col.type === 'earning') {
      if (!slip.custom_earnings) slip.custom_earnings = [];
      const idx = slip.custom_earnings.findIndex(e => e.name === col.label);
      if (idx > -1) slip.custom_earnings[idx].amount = val;
      else slip.custom_earnings.push({ name: col.label, amount: val });
    } else {
      if (!slip.custom_deductions) slip.custom_deductions = [];
      const idx = slip.custom_deductions.findIndex(d => d.name === col.label);
      if (idx > -1) slip.custom_deductions[idx].amount = val;
      else slip.custom_deductions.push({ name: col.label, amount: val });
    }
  }

  // ── Quick Edit Modal ──
  openQuickEditModal(slip: Payslip, col: any) {
    this.activeEditSlip.set(slip);
    this.activeEditCol.set(col);
    this.quickEditAmount = this.getDynamicVal(slip, col.key) || null;
    this.showQuickEditModal.set(true);
  }

  closeQuickEditModal() {
    this.showQuickEditModal.set(false);
    this.activeEditSlip.set(null);
    this.activeEditCol.set(null);
    this.quickEditAmount = null;
  }

  saveQuickEditVal() {
    const slip = this.activeEditSlip();
    const col = this.activeEditCol();
    if (!slip || !col) return;
    
    const amt = this.quickEditAmount || 0;
    this.setDynamicVal(slip, col.key, amt);

    const basic = Number(slip.basic_salary);
    const other = this.computeOther(slip);
    
    let dynEarningsSum = 0;
    this.availableCols().forEach(c => {
      if (c.type === 'earning') dynEarningsSum += this.getDynamicVal(slip, c.key);
    });
    slip.gross_earnings = String(basic + other + dynEarningsSum);

    let dynDeductionsSum = Number(slip.total_deductions); // keep loan deductions too
    this.availableCols().forEach(c => {
      if (c.type === 'deduction') dynDeductionsSum += this.getDynamicVal(slip, c.key);
    });
    
    slip.net_salary = String(Math.max(0, Number(slip.gross_earnings) - dynDeductionsSum));

    this.payslips.update(list => list.map(s => s.id === slip.id ? { ...slip } : s));
    this.closeQuickEditModal();
    this.notify.success('تم تحديث البيانات المالية للموظف بنجاح.');
  }

  // ── Calculations with custom added columns ──
  computeGrossWithDynamic(slip: Payslip): number {
    const basic = Number(slip.basic_salary);
    const other = this.computeOther(slip);
    let sum = 0;
    this.availableCols().forEach(c => {
      if (c.type === 'earning' && c.visible) {
        sum += this.getDynamicVal(slip, c.key);
      }
    });
    return basic + other + sum;
  }

  computeNetWithDynamic(slip: Payslip): number {
    const gross = this.computeGrossWithDynamic(slip);
    let ded = Number(slip.total_deductions);
    this.availableCols().forEach(c => {
      if (c.type === 'deduction' && c.visible) {
        ded += this.getDynamicVal(slip, c.key);
      }
    });
    return Math.max(0, gross - ded);
  }

  // ── Filters & Search ──
  readonly filteredPayslips = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const list = this.payslips();
    if (!query) return list;
    return list.filter(s => s.employee_name?.toLowerCase().includes(query));
  });

  onSearchInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  // ── Navigation ──
  goToStep1() {
    this.currentStep.set(1);
    this.selectedRunId.set(null);
    this.payslips.set([]);
  }

  enterReview(run: PayrollRun) {
    this.selectedRunId.set(run.id);
    this.currentStep.set(2);
    this.loadPayslipsWithPreview(run);
  }

  goBack() {
    this.router.navigate(['/payroll/dashboard']);
  }

  linkAttendance() {
    const run = this.selectedRun();
    if (!run) return;
    this.loadingPayslips.set(true);
    // استدعاء إعادة الحساب لإعادة المعاينة وسحب بيانات الحضور والانصراف الحية للموظفين
    this.http.post<any>(`${environment.apiUrl}payroll/runs/${run.id}/preview/`, {}).subscribe({
      next: () => {
        this.http.get<any>(`${environment.apiUrl}payroll/payslips/?payroll_run=${run.id}`).subscribe({
          next: (r2) => {
            if (r2?.success) {
              this.payslips.set(r2.data);
              this.fetchEmployeeNamesForSlips(r2.data);
              this.notify.success('تم بنجاح سحب بيانات الحضور والانصراف الحية لشهر يونيو واحتساب الخصومات التلقائية للتأخير لكل موظف.');
            } else {
              this.loadingPayslips.set(false);
            }
            this.loadRuns();
          },
          error: () => this.loadingPayslips.set(false),
        });
      },
      error: () => {
        this.loadingPayslips.set(false);
        this.notify.error('فشل في إعادة احتساب مسير الرواتب الحضور.');
      }
    });
  }

  // ── Data Loading ──
  loadRuns() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}payroll/runs/`).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res?.success) {
          this.runs.set(res.data);
          this.fetchPeriodDetailsForRuns(res.data);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  loadUsers() {
    this.http.get<any>(`${environment.apiUrl}identity/users/`).subscribe({
      next: (res) => { if (res?.success) this.users.set(res.data); },
    });
  }

  fetchPeriodDetailsForRuns(rawRuns: any[]) {
    this.http.get<any>(`${environment.apiUrl}payroll/periods/`).subscribe({
      next: (res) => {
        if (res?.success) {
          const map = new Map<string, string>();
          res.data.forEach((p: any) => map.set(p.id, p.code));
          this.runs.update(list => list.map(r => ({ ...r, period_code: map.get(r.period || '') || '—' })));
        }
      },
    });
  }

  loadPayslipsWithPreview(run: PayrollRun) {
    this.loadingPayslips.set(true);
    this.http.get<any>(`${environment.apiUrl}payroll/payslips/?payroll_run=${run.id}`).subscribe({
      next: (res) => {
        if (res?.success && res.data.length > 0) {
          this.payslips.set(res.data);
          this.fetchEmployeeNamesForSlips(res.data);
        } else {
          this.http.post<any>(`${environment.apiUrl}payroll/runs/${run.id}/preview/`, {}).subscribe({
            next: () => {
              this.http.get<any>(`${environment.apiUrl}payroll/payslips/?payroll_run=${run.id}`).subscribe({
                next: (r2) => {
                  if (r2?.success) {
                    this.payslips.set(r2.data);
                    this.fetchEmployeeNamesForSlips(r2.data);
                  } else {
                    this.loadingPayslips.set(false);
                  }
                  this.loadRuns();
                },
                error: () => this.loadingPayslips.set(false),
              });
            },
            error: () => {
              this.loadingPayslips.set(false);
              this.notify.error('فشل في معاينة كشوف الرواتب.');
            },
          });
        }
      },
      error: () => this.loadingPayslips.set(false),
    });
  }

  fetchEmployeeNamesForSlips(slips: any[]) {
    if (slips.length === 0) {
      this.loadingPayslips.set(false);
      return;
    }
    this.http.get<any>(`${environment.apiUrl}employees/employees/`).subscribe({
      next: (res) => {
        this.loadingPayslips.set(false);
        if (res?.success) {
          const map = new Map<string, string>();
          res.data.forEach((e: any) => map.set(e.id, e.full_name_ar));
          this.payslips.update(list => list.map(s => ({ ...s, employee_name: map.get(s.employee || '') || 'موظف' })));
        }
      },
      error: () => this.loadingPayslips.set(false),
    });
  }

  getUserName(userId: string): string {
    const u = this.users().find(x => x.id === userId);
    return u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email : userId.slice(0, 8);
  }

  // ── Computed Helpers ──
  computeHousing(slip: Payslip): number {
    const gross = Number(slip.gross_earnings);
    const basic = Number(slip.basic_salary);
    const extras = gross - basic;
    return extras > 0 ? Math.round(extras * 0.5) : 0;
  }
  computeTransport(slip: Payslip): number {
    const gross = Number(slip.gross_earnings);
    const basic = Number(slip.basic_salary);
    const extras = gross - basic;
    return extras > 0 ? Math.round(extras * 0.3) : 0;
  }
  computeOther(slip: Payslip): number {
    const gross = Number(slip.gross_earnings);
    const basic = Number(slip.basic_salary);
    const housing = this.computeHousing(slip);
    const transport = this.computeTransport(slip);
    return Math.max(0, gross - basic - housing - transport);
  }

  computeTotalBasic(): number { return this.filteredPayslips().reduce((s, p) => s + Number(p.basic_salary), 0); }
  
  computeTotalDynamic(colKey: string): number {
    return this.filteredPayslips().reduce((s, p) => s + this.getDynamicVal(p, colKey), 0);
  }

  computeTotalGrossWithDynamic(): number {
    return this.filteredPayslips().reduce((s, p) => s + this.computeGrossWithDynamic(p), 0);
  }

  computeTotalDeductions(): number { 
    return this.filteredPayslips().reduce((s, p) => {
      let ded = Number(p.total_deductions);
      this.availableCols().forEach(c => {
        if (c.type === 'deduction' && c.visible) ded += this.getDynamicVal(p, c.key);
      });
      return s + ded;
    }, 0);
  }

  computeTotalNet(): number {
    return this.filteredPayslips().reduce((s, p) => s + this.computeNetWithDynamic(p), 0);
  }

  computeTotalNetWithDynamic(): number {
    return this.computeTotalNet();
  }

  getStepIndex(status: string): number {
    const m: Record<string, number> = { draft: 0, review: 1, approved: 2, paid: 3 };
    return m[status] ?? 0;
  }

  formatCost(v: string): string {
    const n = Number(v);
    if (!n) return '0';
    return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      draft: 'مسودة', review: 'قيد الاعتماد', approved: 'معتمد', paid: 'مصروف',
    };
    return labels[status] || status;
  }

  // ── Create Run Modal ──
  openCreateModal() {
    this.newRunDate = new Date().toISOString().slice(0, 10);
    this.newRunPeriodCode = this.newRunDate.slice(0, 7);
    this.showCreateModal.set(true);
  }
  closeCreateModal() { this.showCreateModal.set(false); }

  onNewRunDateChange(v: string) {
    if (v) {
      this.newRunDate = v;
      this.newRunPeriodCode = v.slice(0, 7);
    }
  }

  submitCreateRun(e: Event) {
    e.preventDefault();
    if (!this.newRunPeriodCode) return;
    this.creatingRun.set(true);
    const code = this.newRunPeriodCode;
    const [y, m] = code.split('-').map(Number);
    const startDate = `${code}-01`;
    const endDate = `${code}-${new Date(y, m, 0).getDate()}`;

    this.http.get<any>(`${environment.apiUrl}payroll/periods/`).subscribe({
      next: (res) => {
        if (res?.success) {
          const existing = res.data.find((p: any) => p.code === code);
          if (existing) {
            this.createRunForPeriod(existing.id);
          } else {
            this.http.post<any>(`${environment.apiUrl}payroll/periods/`, { code, start_date: startDate, end_date: endDate }).subscribe({
              next: (pRes) => {
                if (pRes?.success) this.createRunForPeriod(pRes.data.id);
                else { this.creatingRun.set(false); this.notify.error('فشل إنشاء الفترة.'); }
              },
              error: () => { this.creatingRun.set(false); this.notify.error('خطأ في إنشاء الفترة.'); },
            });
          }
        }
      },
    });
  }

  createRunForPeriod(periodId: string) {
    this.http.post<any>(`${environment.apiUrl}payroll/runs/`, {
      period: periodId, run_date: new Date().toISOString(), status: 'draft', total_cost: '0.00',
    }).subscribe({
      next: (res) => {
        this.creatingRun.set(false);
        this.closeCreateModal();
        if (res?.success) {
          this.notify.success('تم إنشاء المسير بنجاح.');
          this.loadRuns();
        }
      },
      error: () => { this.creatingRun.set(false); this.notify.error('خطأ في إنشاء المسير.'); },
    });
  }

  // ── Approval Chain Modal ──
  openApprovalChainModal(run: PayrollRun) {
    this.activeRunForApproval = run;
    this.approvers = ['', '', ''];
    this.showApprovalModal.set(true);
  }
  closeApprovalModal() { this.showApprovalModal.set(false); }

  submitApprovalChain(e: Event) {
    e.preventDefault();
    if (!this.approvers[0] || !this.approvers[1] || !this.approvers[2]) {
      this.notify.error('حدد المسؤولين الثلاثة.');
      return;
    }
    this.submittingApproval.set(true);
    this.http.post<any>(
      `${environment.apiUrl}payroll/runs/${this.activeRunForApproval?.id}/submit-for-approval/`,
      { approvers: this.approvers },
    ).subscribe({
      next: (res) => {
        this.submittingApproval.set(false);
        this.closeApprovalModal();
        if (res?.success) {
          this.notify.success('تم إرسال المسير للموافقة بنجاح.');
          this.loadRuns();
          const runObj = this.runs().find(r => r.id === this.selectedRunId());
          if (runObj) this.loadPayslipsWithPreview(runObj);
        } else {
          this.notify.error('فشل إرسال المسير.');
        }
      },
      error: () => {
        this.submittingApproval.set(false);
        this.notify.error('خطأ بالاتصال بالخادم.');
      },
    });
  }

  triggerApprovalDecision(run: PayrollRun, actionCode: 'approve' | 'reject' = 'approve', comments: string = 'اعتماد خطوة مسير الرواتب.') {
    if (!run.approval_request_id) return;
    this.loading.set(true);
    this.http.post<any>(`${environment.apiUrl}approvals/requests/${run.approval_request_id}/decision/`, {
      action: actionCode, comments: comments,
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.notify.success(actionCode === 'approve' ? 'تم اعتماد الخطوة بنجاح.' : 'تم رفض المسير وإرجاعه لمسودة.');
        this.loadRuns();
        if (this.selectedRunId() === run.id) {
          this.goToStep1();
        }
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('فشل تسجيل قرار الاعتماد.');
      },
    });
  }

  openRejectModal(run: PayrollRun) {
    this.activeRejectRun = run;
    this.rejectComments = '';
    this.showRejectModal.set(true);
  }

  closeRejectModal() {
    this.showRejectModal.set(false);
    this.rejectComments = '';
    this.activeRejectRun = null;
  }

  confirmRejectDecision() {
    const run = this.activeRejectRun;
    const comments = this.rejectComments.trim();
    if (!run || !comments) return;
    this.closeRejectModal();
    this.triggerApprovalDecision(run, 'reject', comments);
  }

  markAsPaid(run: PayrollRun) {
    this.loading.set(true);
    this.http.put<any>(`${environment.apiUrl}payroll/runs/${run.id}/`, {
      period: run.period, run_date: run.run_date, status: 'paid', total_cost: run.total_cost,
    }).subscribe({
      next: (res) => {
        if (res?.success) {
          this.notify.success('تم الصرف بنجاح.');
          this.loadRuns();
        } else { this.loading.set(false); }
      },
      error: () => { this.loading.set(false); this.notify.error('فشل تأكيد الصرف.'); },
    });
  }

  // ── Export Excel (XLSX) with Nebras formatting ──
  exportTable() {
    const slips = this.payslips();
    if (slips.length === 0) { this.notify.error('لا توجد بيانات للتصدير.'); return; }
    const run = this.selectedRun();
    const periodCode = run?.period_code || 'export';

    const title = `كشف مسير رواتب شهر: ${periodCode}`;
    const now = new Date().toLocaleDateString('ar-SA');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
 <Style ss:ID="hdr"><Font ss:Bold="1" ss:Size="11" ss:Color="#FFFFFF"/><Interior ss:Color="#1A237E" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:ReadingOrder="RightToLeft"/></Style>
 <Style ss:ID="title"><Font ss:Bold="1" ss:Size="14" ss:Color="#1A237E"/><Alignment ss:Horizontal="Center" ss:ReadingOrder="RightToLeft"/></Style>
 <Style ss:ID="sub"><Font ss:Size="10" ss:Color="#555555"/><Alignment ss:Horizontal="Center" ss:ReadingOrder="RightToLeft"/></Style>
 <Style ss:ID="num"><NumberFormat ss:Format="#,##0"/><Alignment ss:Horizontal="Center"/></Style>
 <Style ss:ID="net"><Font ss:Bold="1" ss:Color="#2E7D32"/><NumberFormat ss:Format="#,##0"/><Alignment ss:Horizontal="Center"/></Style>
 <Style ss:ID="ded"><Font ss:Color="#C62828"/><NumberFormat ss:Format="#,##0"/><Alignment ss:Horizontal="Center"/></Style>
 <Style ss:ID="txt"><Font ss:Size="10"/><Alignment ss:Horizontal="Right" ss:ReadingOrder="RightToLeft"/></Style>
 <Style ss:ID="foot"><Font ss:Bold="1" ss:Size="11"/><Interior ss:Color="#E8EAF6" ss:Pattern="Solid"/><NumberFormat ss:Format="#,##0"/><Alignment ss:Horizontal="Center"/></Style>
</Styles>
<Worksheet ss:Name="كشف الرواتب" ss:RightToLeft="1">
<Table>
 <Column ss:Width="35"/><Column ss:Width="180"/><Column ss:Width="90"/><Column ss:Width="90"/><Column ss:Width="90"/><Column ss:Width="90"/><Column ss:Width="110"/><Column ss:Width="100"/><Column ss:Width="110"/>
 <Row ss:Height="28"><Cell ss:MergeAcross="8" ss:StyleID="title"><Data ss:Type="String">منصة نبراس — ${title}</Data></Cell></Row>
 <Row ss:Height="20"><Cell ss:MergeAcross="8" ss:StyleID="sub"><Data ss:Type="String">تاريخ التصدير: ${now} | إجمالي التكلفة: ${this.formatCost(run?.total_cost || '0')} ج.س | عدد الموظفين: ${slips.length}</Data></Cell></Row>
 <Row></Row>
 <Row>
  <Cell ss:StyleID="hdr"><Data ss:Type="String">#</Data></Cell>
  <Cell ss:StyleID="hdr"><Data ss:Type="String">اسم الموظف</Data></Cell>
  <Cell ss:StyleID="hdr"><Data ss:Type="String">الراتب الأساسي</Data></Cell>
  <Cell ss:StyleID="hdr"><Data ss:Type="String">بدل السكن</Data></Cell>
  <Cell ss:StyleID="hdr"><Data ss:Type="String">بدل النقل</Data></Cell>
  <Cell ss:StyleID="hdr"><Data ss:Type="String">بدلات أخرى</Data></Cell>
  <Cell ss:StyleID="hdr"><Data ss:Type="String">إجمالي الاستحقاقات</Data></Cell>
  <Cell ss:StyleID="hdr"><Data ss:Type="String">الاستقطاعات</Data></Cell>
  <Cell ss:StyleID="hdr"><Data ss:Type="String">صافي الراتب</Data></Cell>
 </Row>`;

    let totBasic = 0, totGross = 0, totDed = 0, totNet = 0;
    slips.forEach((s, i) => {
      const basic = Number(s.basic_salary);
      const gross = Number(s.gross_earnings);
      const ded = Number(s.total_deductions);
      const net = Number(s.net_salary);
      const housing = this.computeHousing(s);
      const transport = this.computeTransport(s);
      const other = this.computeOther(s);
      totBasic += basic; totGross += gross; totDed += ded; totNet += net;

      xml += `\n <Row>
  <Cell ss:StyleID="num"><Data ss:Type="Number">${i + 1}</Data></Cell>
  <Cell ss:StyleID="txt"><Data ss:Type="String">${s.employee_name || 'موظف'}</Data></Cell>
  <Cell ss:StyleID="num"><Data ss:Type="Number">${basic}</Data></Cell>
  <Cell ss:StyleID="num"><Data ss:Type="Number">${housing}</Data></Cell>
  <Cell ss:StyleID="num"><Data ss:Type="Number">${transport}</Data></Cell>
  <Cell ss:StyleID="num"><Data ss:Type="Number">${other}</Data></Cell>
  <Cell ss:StyleID="num"><Data ss:Type="Number">${gross}</Data></Cell>
  <Cell ss:StyleID="ded"><Data ss:Type="Number">${ded}</Data></Cell>
  <Cell ss:StyleID="net"><Data ss:Type="Number">${net}</Data></Cell>
 </Row>`;
    });

    xml += `\n <Row>
  <Cell ss:StyleID="foot"><Data ss:Type="String"></Data></Cell>
  <Cell ss:StyleID="foot"><Data ss:Type="String">الإجمالي</Data></Cell>
  <Cell ss:StyleID="foot"><Data ss:Type="Number">${totBasic}</Data></Cell>
  <Cell ss:StyleID="foot"><Data ss:Type="String">—</Data></Cell>
  <Cell ss:StyleID="foot"><Data ss:Type="String">—</Data></Cell>
  <Cell ss:StyleID="foot"><Data ss:Type="String">—</Data></Cell>
  <Cell ss:StyleID="foot"><Data ss:Type="Number">${totGross}</Data></Cell>
  <Cell ss:StyleID="foot"><Data ss:Type="Number">${totDed}</Data></Cell>
  <Cell ss:StyleID="foot"><Data ss:Type="Number">${totNet}</Data></Cell>
 </Row>`;

    xml += `\n</Table>\n</Worksheet>\n</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nebras_payroll_${periodCode}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    this.notify.success('تم تصدير كشف الرواتب بنجاح إلى ملف Excel.');
  }

  printTable() {
    window.print();
  }
}
