import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import {
  UserManagementService,
  UserItem,
  UserStats,
  Role,
  Permission,
  PermissionMatrixResponse,
} from '../services/user-management.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbBadgeComponent } from '../../../shared/nebras/nb-badge.component';

type RoleTab = 'all' | 'parents' | 'teachers' | 'admin' | 'students' | 'staff';
type StatusFilter = 'all' | 'active' | 'suspended' | 'locked' | 'inactive';
type ViewMode = 'table' | 'grid';

@Component({
  selector: 'app-user-management',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NbPageHeaderComponent,
    NbPanelComponent,
  ],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss'],
})
export class UserManagementComponent implements OnInit {
  private userMgmt = inject(UserManagementService);
  private fb = inject(FormBuilder);

  // الحالة العامة
  readonly users = signal<UserItem[]>([]);
  readonly roles = signal<Role[]>([]);
  readonly permissions = signal<Permission[]>([]);
  readonly stats = signal<UserStats>({
    total_users: 0,
    parents_count: 0,
    teachers_count: 0,
    admins_count: 0,
    students_count: 0,
    staff_count: 0,
    active_count: 0,
    locked_count: 0,
    suspended_count: 0,
  });

  readonly loading = signal<boolean>(false);
  readonly actionLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // أدوات التصفية والبحث
  readonly activeTab = signal<RoleTab>('all');
  readonly statusFilter = signal<StatusFilter>('all');
  readonly searchQuery = signal<string>('');
  readonly viewMode = signal<ViewMode>('table');

  // النوافذ المنبثقة (Custom Modals - Strictly No Browser Dialogs)
  readonly showAddModal = signal<boolean>(false);
  readonly showEditModal = signal<boolean>(false);
  readonly showResetPasswordModal = signal<boolean>(false);
  readonly showPermissionsModal = signal<boolean>(false);
  readonly showConfirmModal = signal<boolean>(false);
  readonly showDetailsDrawer = signal<boolean>(false);

  // المستخدم المحدد للعمليات
  readonly selectedUser = signal<UserItem | null>(null);
  readonly selectedUserRoles = signal<string[]>([]);
  readonly selectedRolePermissions = signal<{ [roleId: string]: string[] }>({});
  readonly currentPermRoleId = signal<string>('');

  // بيانات نموذج المودال
  readonly confirmActionData = signal<{
    title: string;
    message: string;
    confirmText: string;
    danger: boolean;
    action: () => void;
  } | null>(null);

  readonly resetPasswordValue = signal<string>('');
  readonly passwordCopied = signal<boolean>(false);

  // نماذج الإدخال Reactive Forms
  readonly userForm = this.fb.group({
    first_name: ['', [Validators.required, Validators.minLength(2)]],
    last_name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    username: [''],
    phone: [''],
    national_id: [''],
    password: [''],
    role_code: ['administrator'],
    status: ['active'],
  });

  // تصفية المستخدمين محلياً أو بالاستعلام
  readonly filteredUsers = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const tab = this.activeTab();
    const st = this.statusFilter();
    let list = this.users();

    if (tab !== 'all') {
      if (tab === 'parents') list = list.filter((u) => u.user_type === 'parent' || u.role_codes.includes('parent'));
      else if (tab === 'teachers') list = list.filter((u) => u.user_type === 'teacher' || u.role_codes.includes('teacher') || u.role_codes.includes('faculty'));
      else if (tab === 'admin') list = list.filter((u) => u.user_type === 'admin' || u.role_codes.includes('administrator') || u.is_staff || u.is_superuser);
      else if (tab === 'students') list = list.filter((u) => u.user_type === 'student' || u.role_codes.includes('student'));
      else if (tab === 'staff') list = list.filter((u) => u.user_type === 'staff' || u.role_codes.some(r => ['staff', 'hr', 'accountant'].includes(r)));
    }

    if (st !== 'all') {
      list = list.filter((u) => u.status === st);
    }

    if (q) {
      list = list.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q) ||
          u.national_id?.toLowerCase().includes(q)
      );
    }

    return list;
  });

  ngOnInit(): void {
    this.loadData();
    this.loadRolesAndPermissions();
  }

  loadData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.userMgmt.getUsers().subscribe({
      next: (res) => {
        this.users.set(res.results || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('تعذر جلب قائمة المستخدمين. يرجى إعادة المحاولة.');
        this.loading.set(false);
      },
    });

    this.userMgmt.getUserStats().subscribe({
      next: (s) => this.stats.set(s),
      error: () => {},
    });
  }

  loadRolesAndPermissions(): void {
    this.userMgmt.getRoles().subscribe({
      next: (roles) => this.roles.set(roles),
      error: () => {},
    });

    this.userMgmt.getPermissionMatrix().subscribe({
      next: (res) => {
        if (res && res.permissions) {
          this.permissions.set(res.permissions);
        }
        if (res && res.matrix && res.roles) {
          const map: { [roleId: string]: string[] } = {};
          res.roles.forEach((r) => (map[r.id] = []));
          res.matrix.forEach((m) => {
            m.role_ids.forEach((rid) => {
              if (!map[rid]) map[rid] = [];
              map[rid].push(m.permission.id);
            });
          });
          this.selectedRolePermissions.set(map);
          if (res.roles.length > 0 && !this.currentPermRoleId()) {
            this.currentPermRoleId.set(res.roles[0].id);
          }
        }
      },
      error: () => {},
    });
  }

  // التبويبات والفرز
  setTab(tab: RoleTab): void {
    this.activeTab.set(tab);
  }

  setStatus(st: StatusFilter): void {
    this.statusFilter.set(st);
  }

  toggleViewMode(): void {
    this.viewMode.set(this.viewMode() === 'table' ? 'grid' : 'table');
  }

  // فتح وإغلاق النوافذ
  openAddModal(preselectedRoleCode?: string): void {
    this.userForm.reset({
      first_name: '',
      last_name: '',
      email: '',
      username: '',
      phone: '',
      national_id: '',
      password: this.generateRandomPassword(),
      role_code: preselectedRoleCode || 'administrator',
      status: 'active',
    });
    this.errorMessage.set(null);
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
  }

  openEditModal(user: UserItem): void {
    this.selectedUser.set(user);
    this.selectedUserRoles.set(user.roles.map((r) => r.id));
    this.userForm.patchValue({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      username: user.username,
      phone: user.phone || '',
      national_id: user.national_id || '',
      status: user.status,
    });
    this.errorMessage.set(null);
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.selectedUser.set(null);
  }

  openResetPasswordModal(user: UserItem): void {
    this.selectedUser.set(user);
    this.resetPasswordValue.set(this.generateRandomPassword());
    this.passwordCopied.set(false);
    this.errorMessage.set(null);
    this.showResetPasswordModal.set(true);
  }

  closeResetPasswordModal(): void {
    this.showResetPasswordModal.set(false);
    this.selectedUser.set(null);
    this.resetPasswordValue.set('');
  }

  openPermissionsModal(roleId?: string): void {
    if (roleId) {
      this.currentPermRoleId.set(roleId);
    } else if (this.roles().length > 0 && !this.currentPermRoleId()) {
      this.currentPermRoleId.set(this.roles()[0].id);
    }
    this.errorMessage.set(null);
    this.showPermissionsModal.set(true);
  }

  closePermissionsModal(): void {
    this.showPermissionsModal.set(false);
  }

  openDetailsDrawer(user: UserItem): void {
    this.selectedUser.set(user);
    this.showDetailsDrawer.set(true);
  }

  closeDetailsDrawer(): void {
    this.showDetailsDrawer.set(false);
    this.selectedUser.set(null);
  }

  // حفظ وإرسال البيانات
  submitCreateUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.actionLoading.set(true);
    const formVal = this.userForm.value;

    this.userMgmt
      .createUser({
        first_name: formVal.first_name!,
        last_name: formVal.last_name!,
        email: formVal.email!,
        username: formVal.username || formVal.email!.split('@')[0],
        phone: formVal.phone || undefined,
        national_id: formVal.national_id || undefined,
        password: formVal.password || this.generateRandomPassword(),
        role_code: formVal.role_code || 'administrator',
        status: formVal.status || 'active',
      })
      .subscribe({
        next: (res) => {
          this.actionLoading.set(false);
          this.closeAddModal();
          this.showSuccess('تمت إضافة المستخدم بنجاح وتعيين الصلاحيات له.');
          this.loadData();
        },
        error: (err) => {
          this.actionLoading.set(false);
          const msg =
            err?.error?.error?.message ||
            err?.error?.message ||
            err?.error?.email?.[0] ||
            'تعذر إنشاء المستخدم. يرجى التأكد من عدم تكرار البريد أو رقم الهوية.';
          this.errorMessage.set(msg);
        },
      });
  }

  submitEditUser(): void {
    const user = this.selectedUser();
    if (!user || this.userForm.invalid) return;

    this.actionLoading.set(true);
    const formVal = this.userForm.value;

    this.userMgmt
      .updateUser(user.id, {
        first_name: formVal.first_name!,
        last_name: formVal.last_name!,
        email: formVal.email!,
        username: formVal.username || undefined,
        phone: formVal.phone || undefined,
        national_id: formVal.national_id || undefined,
        status: formVal.status as any,
      })
      .subscribe({
        next: () => {
          // تحديث الأدوار أيضاً
          this.userMgmt.assignRoles(user.id, this.selectedUserRoles()).subscribe({
            next: () => {
              this.actionLoading.set(false);
              this.closeEditModal();
              this.showSuccess('تم تحديث بيانات المستخدم وأدواره بنجاح.');
              this.loadData();
            },
            error: () => {
              this.actionLoading.set(false);
              this.closeEditModal();
              this.loadData();
            },
          });
        },
        error: (err) => {
          this.actionLoading.set(false);
          this.errorMessage.set('فشل تحديث البيانات. يرجى مراجعة المدخلات.');
        },
      });
  }

  submitResetPassword(): void {
    const user = this.selectedUser();
    const newPass = this.resetPasswordValue().trim();
    if (!user || !newPass) return;

    this.actionLoading.set(true);
    this.userMgmt.adminResetPassword(user.id, newPass).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.closeResetPasswordModal();
        this.showSuccess(`تم تعيين كلمة مرور جديدة للمستخدم (${user.full_name}) بنجاح.`);
        this.loadData();
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.errorMessage.set('فشل تعيين كلمة المرور.');
      },
    });
  }

  // إدارة الصلاحيات للنماذج والموديولات
  toggleRolePermission(permId: string): void {
    const roleId = this.currentPermRoleId();
    if (!roleId) return;

    const currentMap = { ...this.selectedRolePermissions() };
    const perms = currentMap[roleId] ? [...currentMap[roleId]] : [];

    const idx = perms.indexOf(permId);
    if (idx > -1) {
      perms.splice(idx, 1);
    } else {
      perms.push(permId);
    }
    currentMap[roleId] = perms;
    this.selectedRolePermissions.set(currentMap);
  }

  hasPermission(permId: string): boolean {
    const roleId = this.currentPermRoleId();
    if (!roleId) return false;
    const perms = this.selectedRolePermissions()[roleId] || [];
    return perms.includes(permId);
  }

  saveRolePermissions(): void {
    const roleId = this.currentPermRoleId();
    if (!roleId) return;

    this.actionLoading.set(true);
    const perms = this.selectedRolePermissions()[roleId] || [];

    this.userMgmt.updateRolePermissions(roleId, perms).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.showSuccess('تم حفظ وتحديث مصفوفة الصلاحيات بنجاح.');
      },
      error: () => {
        this.actionLoading.set(false);
        this.errorMessage.set('فشل حفظ الصلاحيات.');
      },
    });
  }

  // الإجراءات السريعة (تبديل الحالة، فك القفل، إنهاء الجلسات، الحذف)
  confirmToggleStatus(user: UserItem): void {
    const isActivating = user.status !== 'active';
    this.confirmActionData.set({
      title: isActivating ? 'تفعيل حساب المستخدم' : 'تعليق حساب المستخدم',
      message: isActivating
        ? `هل أنت متأكد من رغبتك في تفعيل حساب (${user.full_name})؟ سيتمكن من تسجيل الدخول للنظام فوراً.`
        : `هل أنت متأكد من رغبتك في تعليق حساب (${user.full_name})؟ لن يتمكن من تسجيل الدخول حتى إعادة تفعيله.`,
      confirmText: isActivating ? 'نعم، تفعيل الحساب' : 'نعم، تعليق الحساب',
      danger: !isActivating,
      action: () => {
        this.actionLoading.set(true);
        this.userMgmt.toggleStatus(user.id, isActivating ? 'active' : 'suspended').subscribe({
          next: () => {
            this.actionLoading.set(false);
            this.closeConfirmModal();
            this.showSuccess(`تم ${isActivating ? 'تفعيل' : 'تعليق'} الحساب بنجاح.`);
            this.loadData();
          },
          error: () => {
            this.actionLoading.set(false);
            this.closeConfirmModal();
            this.errorMessage.set('تعذر تغيير حالة الحساب.');
          },
        });
      },
    });
    this.showConfirmModal.set(true);
  }

  confirmUnlock(user: UserItem): void {
    this.confirmActionData.set({
      title: 'إلغاء قفل الحساب',
      message: `تم قفل هذا الحساب بسبب محاولات دخول فاشلة متكررة. هل تريد إلغاء القفل وتصفير عداد المحاولات للمستخدم (${user.full_name})؟`,
      confirmText: 'إلغاء القفل والتفعيل',
      danger: false,
      action: () => {
        this.actionLoading.set(true);
        this.userMgmt.unlockUser(user.id).subscribe({
          next: () => {
            this.actionLoading.set(false);
            this.closeConfirmModal();
            this.showSuccess('تم فك قفل الحساب بنجاح.');
            this.loadData();
          },
          error: () => {
            this.actionLoading.set(false);
            this.closeConfirmModal();
            this.errorMessage.set('تعذر فك قفل الحساب.');
          },
        });
      },
    });
    this.showConfirmModal.set(true);
  }

  confirmTerminateSessions(user: UserItem): void {
    this.confirmActionData.set({
      title: 'إنهاء جميع الجلسات النشطة',
      message: `سيؤدي هذا الإجراء إلى تسجيل خروج المستخدم (${user.full_name}) من جميع الأجهزة والمتصفحات المفتوحة حالياً. هل ترغب بالمتابعة؟`,
      confirmText: 'إنهاء جميع الجلسات',
      danger: true,
      action: () => {
        this.actionLoading.set(true);
        this.userMgmt.terminateSessions(user.id).subscribe({
          next: () => {
            this.actionLoading.set(false);
            this.closeConfirmModal();
            this.showSuccess('تم إنهاء جميع جلسات المستخدم بنجاح.');
            this.loadData();
          },
          error: () => {
            this.actionLoading.set(false);
            this.closeConfirmModal();
            this.errorMessage.set('تعذر إنهاء الجلسات.');
          },
        });
      },
    });
    this.showConfirmModal.set(true);
  }

  confirmDeleteUser(user: UserItem): void {
    this.confirmActionData.set({
      title: 'حذف حساب المستخدم',
      message: `تحذير: هل أنت متأكد من حذف المستخدم (${user.full_name})؟ سيتم حظر الحساب وإلغاء ارتباطاته.`,
      confirmText: 'نعم، حذف المستخدم',
      danger: true,
      action: () => {
        this.actionLoading.set(true);
        this.userMgmt.deleteUser(user.id).subscribe({
          next: () => {
            this.actionLoading.set(false);
            this.closeConfirmModal();
            this.showSuccess('تم حذف المستخدم بنجاح.');
            this.loadData();
          },
          error: () => {
            this.actionLoading.set(false);
            this.closeConfirmModal();
            this.errorMessage.set('فشل حذف المستخدم.');
          },
        });
      },
    });
    this.showConfirmModal.set(true);
  }

  closeConfirmModal(): void {
    this.showConfirmModal.set(false);
    this.confirmActionData.set(null);
  }

  executeConfirmAction(): void {
    const data = this.confirmActionData();
    if (data && data.action) {
      data.action();
    }
  }

  // توليد كلمة مرور عشوائية ونسخها
  generateRandomPassword(): string {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  }

  regeneratePassword(): void {
    this.resetPasswordValue.set(this.generateRandomPassword());
    this.passwordCopied.set(false);
  }

  copyPassword(): void {
    const pass = this.resetPasswordValue();
    if (pass && navigator.clipboard) {
      navigator.clipboard.writeText(pass);
      this.passwordCopied.set(true);
      setTimeout(() => this.passwordCopied.set(false), 2500);
    }
  }

  toggleEditUserRole(roleId: string): void {
    const roles = [...this.selectedUserRoles()];
    const idx = roles.indexOf(roleId);
    if (idx > -1) {
      roles.splice(idx, 1);
    } else {
      roles.push(roleId);
    }
    this.selectedUserRoles.set(roles);
  }

  showSuccess(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(null), 4000);
  }

  getUserInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  getRoleBadgeClass(roleType: string): string {
    switch (roleType) {
      case 'admin':
        return 'badge-admin';
      case 'teacher':
        return 'badge-teacher';
      case 'parent':
        return 'badge-parent';
      case 'student':
        return 'badge-student';
      default:
        return 'badge-staff';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'locked':
        return 'status-locked';
      case 'suspended':
        return 'status-suspended';
      default:
        return 'status-inactive';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'active':
        return 'نشط';
      case 'locked':
        return 'مقفل أمنياً';
      case 'suspended':
        return 'موقوف مؤقتاً';
      default:
        return 'غير نشط';
    }
  }
}
