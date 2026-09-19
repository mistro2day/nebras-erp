import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiClientService } from '../../../core/services/api-client.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';

export interface Role {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string;
}

export interface Permission {
  id: string;
  name: string;
  code: string;
  module: string;
}

export interface MatrixRow {
  permission: Permission;
  role_ids: string[];
}

@Component({
  selector: 'app-permissions-matrix',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="مصفوفة الصلاحيات التفصيلية (Permission Matrix)"
        subtitle="إدارة الصلاحيات التفصيلية والوصول إلى النماذج والموديولات للأدوار المختلفة بشكل ديناميكي كامل."
      >
        <div class="header-actions">
          <button class="btn btn-outline" (click)="openCreateRoleModal()">
            <span class="icon">➕</span>
            إضافة دور جديد
          </button>
          <button class="btn btn-primary" (click)="loadMatrix()" [disabled]="loading()" title="تحديث البيانات">
            <span class="icon">🔄</span>
            تحديث المصفوفة
          </button>
        </div>
      </nb-page-header>

      @if (successMessage()) {
        <div class="alert alert-success animate-fade-in">
          <span class="alert-icon">✓</span>
          <span>{{ successMessage() }}</span>
        </div>
      }

      @if (errorMessage()) {
        <div class="alert alert-danger animate-fade-in">
          <span class="alert-icon">⚠️</span>
          <span>{{ errorMessage() }}</span>
        </div>
      }

      <nb-panel [flush]="true">
        <!-- شريط التصفية والبحث في الصلاحيات -->
        <div class="matrix-toolbar">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              placeholder="ابحث باسم الصلاحية أو الرمز أو الموديول..."
              [value]="searchQuery()"
              (input)="searchQuery.set($any($event.target).value)"
            />
            @if (searchQuery()) {
              <button class="clear-btn" (click)="searchQuery.set('')">✕</button>
            }
          </div>

          <!-- فلاتر الموديولات -->
          <div class="module-filter-pills">
            <button
              class="mod-pill"
              [class.active]="selectedModule() === 'all'"
              (click)="selectedModule.set('all')"
            >
              الكل ({{ matrix().length }})
            </button>
            <button
              class="mod-pill pill-forms"
              [class.active]="selectedModule() === 'forms'"
              (click)="selectedModule.set('forms')"
            >
              📋 النماذج والطلبات
            </button>
            <button
              class="mod-pill"
              [class.active]="selectedModule() === 'students'"
              (click)="selectedModule.set('students')"
            >
              🎓 الطلاب
            </button>
            <button
              class="mod-pill"
              [class.active]="selectedModule() === 'attendance'"
              (click)="selectedModule.set('attendance')"
            >
              ⏱️ الحضور والأكاديميات
            </button>
            <button
              class="mod-pill"
              [class.active]="selectedModule() === 'employees'"
              (click)="selectedModule.set('employees')"
            >
              💼 الموظفون
            </button>
            <button
              class="mod-pill"
              [class.active]="selectedModule() === 'finance'"
              (click)="selectedModule.set('finance')"
            >
              💰 المالية والرواتب
            </button>
            <button
              class="mod-pill"
              [class.active]="selectedModule() === 'portal'"
              (click)="selectedModule.set('portal')"
            >
              🚪 البوابات
            </button>
          </div>
        </div>

        <!-- حالة التحميل -->
        @if (loading()) {
          <nb-loading message="جاري جلب مصفوفة الصلاحيات وتجهيز الأدوار..."></nb-loading>
        } @else if (filteredMatrix().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">🔐</div>
            <div class="empty-title">لا توجد صلاحيات مطابقة</div>
            <div class="empty-desc">يرجى تعديل معايير البحث أو اختيار موديول آخر.</div>
          </div>
        } @else {
          <div class="table-wrapper">
            <table class="matrix-table">
              <thead>
                <tr>
                  <th class="perm-header">الصلاحية / الموديول</th>
                  @for (role of roles(); track role.id) {
                    <th class="role-header">
                      <div class="role-title">{{ role.name }}</div>
                      <span class="role-badge" [class.badge-system]="role.category === 'system'">
                        {{ role.category === 'system' ? 'نظامي' : 'مخصص' }}
                      </span>
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of filteredMatrix(); track row.permission.id) {
                  <tr [class.highlight-forms]="row.permission.module === 'forms'">
                    <td class="perm-cell">
                      <div class="perm-name-row">
                        <span class="perm-name">{{ row.permission.name }}</span>
                        @if (row.permission.module === 'forms') {
                          <span class="tag-forms">نموذج</span>
                        }
                      </div>
                      <span class="perm-code">{{ row.permission.code }}</span>
                    </td>
                    @for (role of roles(); track role.id) {
                      <td class="checkbox-cell">
                        <label class="custom-checkbox">
                          <input
                            type="checkbox"
                            [checked]="isAssigned(row, role.id)"
                            (change)="togglePermission(row, role.id)"
                            [disabled]="saving()"
                          />
                          <span class="checkmark"></span>
                        </label>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </nb-panel>

      <!-- مودال إضافة دور جديد (Strict Nebras OS Custom Modal) -->
      @if (showCreateRoleModal()) {
        <div class="modal-backdrop animate-fade-in" (click)="closeCreateRoleModal()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-group">
                <span class="modal-icon">🛡️</span>
                <div>
                  <h3 class="modal-title">إضافة دور جديد إلى النظام</h3>
                  <p class="modal-subtitle">سيتم إدراج هذا الدور في مصفوفة الصلاحيات لتحديد صلاحياته التفصيلية.</p>
                </div>
              </div>
              <button class="modal-close" (click)="closeCreateRoleModal()">✕</button>
            </div>

            <form (ngSubmit)="submitCreateRole()">
              <div class="modal-body">
                <div class="form-group">
                  <label class="form-label">اسم الدور بالعربية <span class="required">*</span></label>
                  <input
                    type="text"
                    class="form-input"
                    placeholder="مثال: مشرف المختبرات / مساعد محاسب"
                    [value]="newRoleName()"
                    (input)="newRoleName.set($any($event.target).value)"
                    required
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">رمز الدور (Role Code بالإنجليزية) <span class="required">*</span></label>
                  <input
                    type="text"
                    class="form-input text-ltr"
                    placeholder="مثال: lab_supervisor"
                    [value]="newRoleCode()"
                    (input)="newRoleCode.set($any($event.target).value)"
                    required
                  />
                  <span class="field-hint">رمز فريد بالأحرف الإنجليزية الصغيرة والشرطة السفلية</span>
                </div>

                <div class="form-group">
                  <label class="form-label">وصف وتفاصيل الدور</label>
                  <textarea
                    class="form-textarea"
                    rows="3"
                    placeholder="اكتب وصفاً موجزاً لمهام وصلاحيات هذا الدور..."
                    [value]="newRoleDescription()"
                    (input)="newRoleDescription.set($any($event.target).value)"
                  ></textarea>
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" (click)="closeCreateRoleModal()">إلغاء</button>
                <button
                  type="submit"
                  class="btn btn-primary"
                  [disabled]="creatingRole() || !newRoleName().trim() || !newRoleCode().trim()"
                >
                  @if (creatingRole()) {
                    <span>جاري الحفظ...</span>
                  } @else {
                    <span>✓ حفظ وإضافة الدور</span>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 0 4px 32px;
      min-width: 0;
      font-family: inherit;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 180ms ease;

      &.btn-primary {
        background: linear-gradient(135deg, #6366f1, #4f46e5);
        color: #ffffff;
        box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);

        &:hover:not(:disabled) {
          background: linear-gradient(135deg, #4f46e5, #4338ca);
        }
      }

      &.btn-outline {
        background: var(--nb-surface, #ffffff);
        color: var(--nb-primary-600, #4f46e5);
        border: 1px solid var(--nb-primary-300, #c7d2fe);

        &:hover:not(:disabled) {
          background: rgba(99, 102, 241, 0.06);
          border-color: var(--nb-primary-500, #6366f1);
        }
      }

      &.btn-secondary {
        background: #f1f5f9;
        color: #475569;
        &:hover:not(:disabled) {
          background: #e2e8f0;
        }
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;

      &.alert-success {
        background: rgba(16, 185, 129, 0.12);
        color: #065f46;
        border: 1px solid rgba(16, 185, 129, 0.25);
      }
      &.alert-danger {
        background: rgba(239, 68, 68, 0.12);
        color: #991b1b;
        border: 1px solid rgba(239, 68, 68, 0.25);
      }
    }

    .matrix-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 14px 18px;
      background: var(--nb-surface, #ffffff);
      border-bottom: 1px solid var(--nb-border-soft, #e2e8f0);
      flex-wrap: wrap;
    }

    .search-box {
      position: relative;
      flex: 1;
      min-width: 260px;
      max-width: 400px;

      .search-icon {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--nb-text-muted, #94a3b8);
        font-size: 14px;
      }

      input {
        width: 100%;
        padding: 8px 36px 8px 30px;
        border: 1px solid var(--nb-border-soft, #cbd5e1);
        border-radius: 8px;
        font-family: inherit;
        font-size: 13px;
        background: var(--nb-surface-raised, #f8fafc);
        color: var(--nb-text, #1e293b);
        box-sizing: border-box;

        &:focus {
          outline: none;
          border-color: var(--nb-primary-500, #6366f1);
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
      }

      .clear-btn {
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 12px;
      }
    }

    .module-filter-pills {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow-x: auto;

      .mod-pill {
        padding: 6px 12px;
        border-radius: 20px;
        border: 1px solid var(--nb-border-soft, #e2e8f0);
        background: var(--nb-surface-raised, #f8fafc);
        color: var(--nb-text-muted, #64748b);
        font-family: inherit;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        transition: all 150ms ease;

        &:hover {
          color: var(--nb-text, #1e293b);
          border-color: var(--nb-primary-300, #a5b4fc);
        }

        &.active {
          background: var(--nb-primary-600, #4f46e5);
          border-color: var(--nb-primary-600, #4f46e5);
          color: #ffffff;
        }

        &.pill-forms.active {
          background: #059669;
          border-color: #059669;
        }
      }
    }

    .table-wrapper {
      overflow-x: auto;
      width: 100%;
    }

    .matrix-table {
      width: 100%;
      border-collapse: collapse;
      text-align: right;
      font-size: 13px;

      thead th {
        padding: 14px 18px;
        background: var(--nb-surface-raised, #f8fafc);
        border-bottom: 2px solid var(--nb-border-soft, #e2e8f0);
        white-space: nowrap;
      }

      tbody tr {
        border-bottom: 1px solid var(--nb-border-soft, #f1f5f9);
        transition: background 150ms ease;

        &:hover {
          background: rgba(248, 250, 252, 0.85);
        }

        &.highlight-forms {
          background: rgba(236, 253, 245, 0.4);
        }

        td {
          padding: 12px 18px;
          vertical-align: middle;
        }
      }
    }

    .perm-header {
      min-width: 280px;
      color: var(--nb-text-muted, #64748b);
      font-weight: 700;
      font-size: 12.5px;
    }

    .role-header {
      text-align: center;
      min-width: 130px;
    }

    .role-title {
      font-weight: 700;
      font-size: 13px;
      color: var(--nb-text, #0f172a);
    }

    .role-badge {
      display: inline-block;
      margin-top: 4px;
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 4px;
      background: #f1f5f9;
      color: #475569;
      font-weight: 700;

      &.badge-system {
        background: #e0e7ff;
        color: #3730a3;
      }
    }

    .perm-cell {
      display: flex;
      flex-direction: column;
      gap: 3px;

      .perm-name-row {
        display: flex;
        align-items: center;
        gap: 6px;

        .perm-name {
          color: var(--nb-text, #1e293b);
          font-weight: 600;
          font-size: 13px;
        }

        .tag-forms {
          font-size: 10px;
          padding: 1px 6px;
          background: #dcfce7;
          color: #15803d;
          border-radius: 4px;
          font-weight: 700;
        }
      }

      .perm-code {
        color: var(--nb-text-muted, #64748b);
        font-size: 11px;
        font-family: monospace;
      }
    }

    .checkbox-cell {
      text-align: center;

      .custom-checkbox {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;

        input {
          width: 18px;
          height: 18px;
          accent-color: var(--nb-primary-600, #4f46e5);
          cursor: pointer;
        }
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
      gap: 8px;

      .empty-icon { font-size: 40px; }
      .empty-title { font-size: 15px; font-weight: 700; color: #0f172a; }
      .empty-desc { font-size: 13px; color: #64748b; }
    }

    /* أنماط المودال Nebras OS Custom Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 16px;
    }

    .modal-card {
      background: var(--nb-surface, #ffffff);
      border-radius: 16px;
      width: 100%;
      max-width: 520px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      overflow: hidden;
      border: 1px solid var(--nb-border-soft, #e2e8f0);
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 24px;
      border-bottom: 1px solid var(--nb-border-soft, #f1f5f9);
      background: var(--nb-surface-raised, #f8fafc);
    }

    .modal-title-group {
      display: flex;
      align-items: center;
      gap: 12px;

      .modal-icon {
        font-size: 24px;
      }

      .modal-title {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        color: var(--nb-text, #0f172a);
      }

      .modal-subtitle {
        margin: 4px 0 0;
        font-size: 12px;
        color: var(--nb-text-muted, #64748b);
      }
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 18px;
      color: var(--nb-text-muted, #94a3b8);
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 150ms ease;

      &:hover {
        background: #f1f5f9;
        color: #0f172a;
      }
    }

    .modal-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;

      .form-label {
        font-size: 13px;
        font-weight: 600;
        color: var(--nb-text, #334155);

        .required {
          color: #ef4444;
        }
      }

      .field-hint {
        font-size: 11px;
        color: var(--nb-text-muted, #64748b);
      }

      .form-input, .form-textarea {
        width: 100%;
        padding: 10px 14px;
        border: 1px solid var(--nb-border-soft, #cbd5e1);
        border-radius: 8px;
        font-family: inherit;
        font-size: 13px;
        background: #ffffff;
        color: var(--nb-text, #0f172a);
        box-sizing: border-box;

        &.text-ltr {
          direction: ltr;
          text-align: left;
        }

        &:focus {
          outline: none;
          border-color: var(--nb-primary-500, #6366f1);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
      }
    }

    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 16px 24px;
      border-top: 1px solid var(--nb-border-soft, #f1f5f9);
      background: var(--nb-surface-raised, #f8fafc);
    }

    .animate-fade-in {
      animation: fadeIn 200ms ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `]
})
export class PermissionsMatrixComponent implements OnInit {
  private apiClient = inject(ApiClientService);

  readonly roles = signal<Role[]>([]);
  readonly matrix = signal<MatrixRow[]>([]);
  readonly loading = signal<boolean>(true);
  readonly saving = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly selectedModule = signal<string>('all');
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  // إشارات مودال إنشاء دور جديد
  readonly showCreateRoleModal = signal<boolean>(false);
  readonly creatingRole = signal<boolean>(false);
  readonly newRoleName = signal<string>('');
  readonly newRoleCode = signal<string>('');
  readonly newRoleDescription = signal<string>('');

  readonly filteredMatrix = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const mod = this.selectedModule();
    let rows = this.matrix();

    if (mod !== 'all') {
      if (mod === 'forms') {
        rows = rows.filter((r) => r.permission.module === 'forms' || r.permission.code.startsWith('forms'));
      } else {
        rows = rows.filter((r) => r.permission.module === mod || r.permission.code.startsWith(mod));
      }
    }

    if (q) {
      rows = rows.filter(
        (r) =>
          r.permission.name.toLowerCase().includes(q) ||
          r.permission.code.toLowerCase().includes(q) ||
          r.permission.module.toLowerCase().includes(q)
      );
    }

    return rows;
  });

  ngOnInit(): void {
    this.loadMatrix();
  }

  loadMatrix(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.apiClient.get<any>('identity/permission-matrix/').subscribe({
      next: (res) => {
        if (res && res.data) {
          this.roles.set(res.data.roles || []);
          this.matrix.set(res.data.matrix || []);
        }
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('تعذر جلب مصفوفة الصلاحيات. يرجى المحاولة لاحقاً.');
        this.loading.set(false);
      },
    });
  }

  isAssigned(row: MatrixRow, roleId: string): boolean {
    return row.role_ids.includes(roleId);
  }

  togglePermission(row: MatrixRow, roleId: string): void {
    const isCurrentlyAssigned = row.role_ids.includes(roleId);
    let newRoleIds = [...row.role_ids];

    if (isCurrentlyAssigned) {
      newRoleIds = newRoleIds.filter((id) => id !== roleId);
    } else {
      newRoleIds.push(roleId);
    }

    row.role_ids = newRoleIds;
    this.saving.set(true);

    const permissionIds = this.matrix()
      .filter((r) => r.role_ids.includes(roleId))
      .map((r) => r.permission.id);

    const body = {
      role_id: roleId,
      permission_ids: permissionIds,
    };

    this.apiClient.post('identity/permission-matrix/', body).subscribe({
      next: () => {
        this.saving.set(false);
        this.showToast('تم تحديث الصلاحية بنجاح.');
      },
      error: () => {
        this.saving.set(false);
        // التراجع في حال الفشل
        if (isCurrentlyAssigned) {
          row.role_ids.push(roleId);
        } else {
          row.role_ids = row.role_ids.filter((id) => id !== roleId);
        }
        this.errorMessage.set('فشل حفظ الصلاحية.');
      },
    });
  }

  showToast(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(null), 3000);
  }

  openCreateRoleModal(): void {
    this.newRoleName.set('');
    this.newRoleCode.set('');
    this.newRoleDescription.set('');
    this.showCreateRoleModal.set(true);
  }

  closeCreateRoleModal(): void {
    this.showCreateRoleModal.set(false);
  }

  submitCreateRole(): void {
    const name = this.newRoleName().trim();
    const code = this.newRoleCode().trim().toLowerCase();
    const description = this.newRoleDescription().trim();

    if (!name || !code) {
      this.errorMessage.set('يرجى إدخال اسم الدور ورمزه بالكامل.');
      return;
    }

    this.creatingRole.set(true);
    this.errorMessage.set(null);

    const body = {
      name,
      code,
      description,
      category: 'custom'
    };

    this.apiClient.post<any>('identity/roles/', body).subscribe({
      next: (res) => {
        this.creatingRole.set(false);
        this.closeCreateRoleModal();
        this.showToast(`تمت إضافة الدور «${name}» بنجاح وتحديث المصفوفة.`);
        this.loadMatrix();
      },
      error: (err) => {
        this.creatingRole.set(false);
        const detail = err?.error?.message || err?.error?.code?.[0] || 'فشل إضافة الدور الجديد. تأكد من أن الرمز غير مستخدم مسبقاً.';
        this.errorMessage.set(detail);
      }
    });
  }
}