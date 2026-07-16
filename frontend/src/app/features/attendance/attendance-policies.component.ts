import { ChangeDetectionStrategy, Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbBadgeComponent } from '../../shared/nebras/nb-badge.component';
import { NbDrawerComponent } from '../../shared/nebras/nb-drawer.component';
import { NbLoadingComponent } from '../../shared/nebras/nb-loading.component';

@Component({
  selector: 'app-attendance-policies',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NbPageHeaderComponent,
    NbPanelComponent,
    NbBadgeComponent,
    NbDrawerComponent,
    NbLoadingComponent
  ],
  template: `
    <div class="page" dir="rtl">
      <!-- رأس الصفحة -->
      <nb-page-header
        title="سياسات الحضور والإنصراف"
        subtitle="إعداد قواعد العمل الإضافي، فترات السماح، ولوائح الحضور لجميع الموظفين والمعلمين"
      >
        <div class="header-nav">
          <a routerLink="/attendance/dashboard" class="nav-btn">نظرة عامة</a>
          <a routerLink="/attendance/shifts" class="nav-btn">الدوامات وجدولة العمل</a>
          <a routerLink="/attendance/corrections" class="nav-btn">طلبات التصحيح</a>
          <a routerLink="/attendance/policies" class="nav-btn active">سياسات الحضور</a>
          <a routerLink="/attendance/check-in-methods" class="nav-btn">طرق تسجيل البصمة والتحقق</a>
          <button class="add-policy-btn" (click)="openAddDrawer()">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            إضافة سياسة حضور
          </button>
        </div>
      </nb-page-header>

      <!-- قائمة السياسات المعتمدة -->
      <nb-panel title="سياسات الحضور والعمل الإضافي الحالية" [flush]="true">
        @if (isLoading()) {
          <nb-loading message="جاري تحميل سياسات الحضور والعمل الإضافي..."></nb-loading>
        } @else {
          <div class="tbl">
            <div class="tbl-head">
              <span>اسم السياسة</span>
              <span>مطبق على</span>
              <span>إجمالي عدد الموظفين</span>
              <span>العمل الإضافي المعتمد</span>
              <span>المعدل</span>
              <span>خيارات التعويض والحدود</span>
            </div>

            @for (policy of policies(); track policy.id) {
              <div class="tbl-row">
                <span class="policy-name">{{ policy.name }}</span>
                <span><nb-badge kind="info">{{ policy.applied_to }}</nb-badge></span>
                <span class="count-num">{{ policy.employee_count }} موظف</span>
                <span>
                  <nb-badge [kind]="policy.overtime_enabled ? 'success' : 'neutral'">
                    {{ policy.overtime_enabled ? 'مفعّل' : 'غير مفعّل' }}
                  </nb-badge>
                </span>
                <span class="rate-val">{{ policy.overtime_rate }}</span>
                <span class="comp-details">{{ policy.compensation_rules }}</span>
              </div>
            }

            @if (policies().length === 0) {
              <div class="tbl-empty">لا توجد سياسات حضور مضافة حالياً.</div>
            }
          </div>
        }
      </nb-panel>

      <!-- درج إضافة سياسة حضور جديدة -->
      <nb-drawer [open]="isDrawerOpen()" title="اضافة سياسة العمل الإضافي والحضور" (closed)="closeDrawer()">
        <div class="drawer-form">
          <div class="form-group">
            <label>اسم السياسة</label>
            <input type="text" class="form-control" [(ngModel)]="newPolicyName" placeholder="مثال: سياسة العمل الإضافي المعتمدة" />
          </div>

          <div class="form-group row-flex">
            <div class="flex-item">
              <label class="toggle-container">
                <input type="checkbox" [(ngModel)]="overtimeEnabled" />
                <span class="toggle-label">عمل إضافي مدفوع</span>
              </label>
              <p class="hint">يمكن للموظفين طلب تعويض مالي عن الساعات الإضافية التي عملوها.</p>
            </div>
          </div>

          <div class="form-group" *ngIf="overtimeEnabled">
            <label>اختر نوع العمل الإضافي الذي سيتم حسابه</label>
            <div class="radio-options">
              <label class="radio-lbl">
                <input type="radio" name="ot_rate" [(ngModel)]="overtimeRate" value="1.5x" />
                (1.5x) عادي
              </label>
              <label class="radio-lbl">
                <input type="radio" name="ot_rate" [(ngModel)]="overtimeRate" value="2x" />
                (2x) مضاعف
              </label>
              <label class="radio-lbl">
                <input type="radio" name="ot_rate" [(ngModel)]="overtimeRate" value="custom" />
                مخصصة
              </label>
            </div>
          </div>

          <div class="form-group">
            <label class="toggle-container">
              <input type="checkbox" [(ngModel)]="compensateWithVacation" />
              <span class="toggle-label">تعويض الوقت الإضافي بإجازة</span>
            </label>
            <p class="hint">يمكن للموظفين طلب إجازة تعويضية من الساعات الإضافية التي عملوها.</p>
          </div>

          <div class="form-group">
            <label class="toggle-container">
              <input type="checkbox" [(ngModel)]="applyRulesLimit" />
              <span class="toggle-label">حدود طلب الساعات الإضافية</span>
            </label>
            <p class="hint">تحديد عدد الساعات التعويضية؛ يمكنك تعيين حد يومي أو شهري لعدد الساعات التي يمكن للموظف الحصول عليها كتعويض.</p>
          </div>

          <div class="form-group">
            <label class="toggle-container">
              <input type="checkbox" [(ngModel)]="applyPreConditions" />
              <span class="toggle-label">تطبيق شروط خاصة قبل طلب عمل إضافي</span>
            </label>
            <p class="hint">يفعّل هذا الخيار في حالة حاجة الموظفين المسند لهم هذه السياسة لإتمام شروط معينة قبل تقديم طلب العمل الإضافي.</p>
          </div>

          <div class="form-group">
            <label>تطبيق السياسة على</label>
            <select class="form-control" [(ngModel)]="appliedTo">
              <option value="جميع موظفي الشركة">جميع موظفي الشركة (سيتم تطبيق واختيار جميع موظفي الشركة تلقائياً)</option>
              <option value="معلمي المرحلة الابتدائية">معلمي المرحلة الابتدائية</option>
              <option value="الإدارة العامة">الإدارة العامة</option>
            </select>
          </div>

          <div class="actions-footer">
            <button class="btn-primary" (click)="savePolicy()">حفظ السياسة</button>
            <button class="btn-secondary" (click)="closeDrawer()">إلغاء</button>
          </div>
        </div>
      </nb-drawer>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; background: #F8F9FC; }
    .header-nav { display: flex; gap: 8px; margin-top: 12px; align-items: center; width: 100%; border-bottom: 1px solid var(--nb-border-soft); padding-bottom: 8px; }
    .nav-btn { text-decoration: none; padding: 8px 16px; font-size: 13px; font-weight: 600; color: var(--nb-text-secondary); border-radius: 6px; transition: all 0.2s; }
    .nav-btn:hover { background: var(--nb-surface-raised); color: var(--nb-text); }
    .nav-btn.active { background: #101828; color: #fff; }

    .add-policy-btn {
      margin-inline-start: auto;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 700;
      color: #fff;
      background: #101828;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    .add-policy-btn:hover { background: #1f2d3d; }

    .tbl { display: flex; flex-direction: column; }
    .tbl-head, .tbl-row { display: grid; grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr 1fr 2.5fr; gap: 12px; padding: 12px 18px; align-items: center; }
    .tbl-head { background: #FCFCFD; border-bottom: 1px solid var(--nb-border-soft); font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .tbl-row { border-bottom: 1px solid var(--nb-border-row); font-size: 13px; color: var(--nb-text); }
    .tbl-row:hover { background: #F9FAFB; }

    .policy-name { font-weight: 700; color: var(--nb-text); }
    .count-num { color: var(--nb-text-secondary); font-weight: 600; }
    .rate-val { font-weight: 700; color: #475467; }
    .comp-details { font-size: 12.5px; color: var(--nb-text-muted); }

    .tbl-empty { padding: 48px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }

    /* نماذج الدرج */
    .drawer-form { display: flex; flex-direction: column; gap: 16px; padding: 4px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 13px; font-weight: 700; color: var(--nb-text); }
    .form-control { height: 40px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 12px; font-size: 13px; outline: none; background: #fff; font-family: var(--nb-font-family); }
    
    .hint { font-size: 11px; color: var(--nb-text-muted); margin: 0; line-height: 1.4; }
    
    .toggle-container { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .toggle-label { font-size: 13px; font-weight: 600; color: var(--nb-text); }

    .radio-options { display: flex; gap: 16px; margin-top: 4px; }
    .radio-lbl { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--nb-text-secondary); cursor: pointer; }

    .actions-footer { display: flex; gap: 12px; margin-top: 16px; }
    .btn-primary { background: #101828; color: #fff; border: none; padding: 10px 18px; border-radius: var(--nb-radius); font-size: 13px; font-weight: 700; cursor: pointer; }
    .btn-primary:hover { background: #1f2d3d; }
    .btn-secondary { background: transparent; border: 1px solid var(--nb-border); color: var(--nb-text-secondary); padding: 10px 18px; border-radius: var(--nb-radius); font-size: 13px; font-weight: 700; cursor: pointer; }
    .btn-secondary:hover { background: var(--nb-surface-raised); }
  `]
})
export class AttendancePoliciesComponent implements OnInit {
  http = inject(HttpClient);

  policies = signal<any[]>([]);
  isLoading = signal(false);
  isDrawerOpen = signal(false);

  // حقول الإدخال
  newPolicyName = '';
  overtimeEnabled = true;
  overtimeRate = '1.5x';
  compensateWithVacation = true;
  applyRulesLimit = false;
  applyPreConditions = false;
  appliedTo = 'جميع موظفي الشركة';

  ngOnInit() {
    this.loadPolicies();
  }

  loadPolicies() {
    this.isLoading.set(true);
    setTimeout(() => {
      this.policies.set([
        {
          id: 1,
          name: 'شفت العمل الشامل',
          applied_to: 'كل الموظفين',
          employee_count: 24,
          overtime_enabled: true,
          overtime_rate: '1.5x',
          compensation_rules: 'عمل إضافي مدفوع'
        },
        {
          id: 2,
          name: 'الدوام الإداري والتعليمي',
          applied_to: 'المعلمين والإداريين',
          employee_count: 18,
          overtime_enabled: true,
          overtime_rate: '2x',
          compensation_rules: 'تعويض الوقت الإضافي بإجازة تعويضية'
        }
      ]);
      this.isLoading.set(false);
    }, 600);
  }

  openAddDrawer() {
    this.isDrawerOpen.set(true);
  }

  closeDrawer() {
    this.isDrawerOpen.set(false);
  }

  savePolicy() {
    if (!this.newPolicyName.trim()) return;

    const newPolicy = {
      id: Date.now(),
      name: this.newPolicyName,
      applied_to: this.appliedTo,
      employee_count: this.appliedTo.includes('جميع') ? 24 : 5,
      overtime_enabled: this.overtimeEnabled,
      overtime_rate: this.overtimeEnabled ? this.overtimeRate : 'غير مفعّل',
      compensation_rules: this.compensateWithVacation ? 'إجازة تعويضية' : 'تعويض مالي'
    };

    this.policies.update(list => [newPolicy, ...list]);
    this.closeDrawer();

    // إعادة تعيين الحقول
    this.newPolicyName = '';
    this.overtimeEnabled = true;
    this.overtimeRate = '1.5x';
    this.compensateWithVacation = true;
    this.applyRulesLimit = false;
    this.applyPreConditions = false;
  }
}
