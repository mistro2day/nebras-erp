import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiClientService } from '../../../core/services/api-client.service';

export interface UserRoleItem {
  id: string;
  name: string;
  code: string;
  category: string;
  is_system: boolean;
  expires_at?: string | null;
}

export interface UserItem {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone?: string;
  national_id?: string;
  avatar_url?: string | null;
  language: string;
  user_timezone: string;
  status: 'active' | 'inactive' | 'suspended' | 'locked';
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  roles: UserRoleItem[];
  role_codes: string[];
  primary_role: string;
  user_type: 'parent' | 'teacher' | 'admin' | 'student' | 'staff' | 'general' | 'applicant' | 'employee';
  user_type_label: string;
  failed_login_attempts: number;
  lockout_until?: string | null;
  active_sessions_count: number;
  created_at: string;
  updated_at: string;
}

export interface UserStats {
  total_users: number;
  parents_count: number;
  teachers_count: number;
  admins_count: number;
  students_count: number;
  staff_count: number;
  active_count: number;
  locked_count: number;
  suspended_count: number;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  category: string;
  description?: string;
  is_system: boolean;
  permissions_count: number;
  permission_ids?: string[];
}

export interface Permission {
  id: string;
  name: string;
  code: string;
  type: string;
  module: string;
  resource?: string;
  action: string;
}

export interface PermissionMatrixResponse {
  roles: Role[];
  permissions: Permission[];
  matrix: {
    permission: Permission;
    role_ids: string[];
  }[];
}

export interface PaginatedResponse<T> {
  data: {
    results: T[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  } | T[];
  message?: string;
  success?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class UserManagementService {
  private api = inject(ApiClientService);

  getUsers(params?: {
    role_category?: string;
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Observable<{ results: UserItem[]; total: number }> {
    return this.api.get<any>('identity/users/', params).pipe(
      map((res) => {
        if (res && res.data) {
          if (Array.isArray(res.data)) {
            return { results: res.data, total: res.data.length };
          }
          if (res.data.results) {
            return {
              results: res.data.results,
              total: res.data.total || res.data.count || res.data.results.length,
            };
          }
        }
        if (Array.isArray(res)) {
          return { results: res, total: res.length };
        }
        return { results: [], total: 0 };
      })
    );
  }

  getUserStats(): Observable<UserStats> {
    return this.api.get<any>('identity/users/stats/').pipe(
      map((res) => res.data || res)
    );
  }

  getRoles(): Observable<Role[]> {
    return this.api.get<any>('identity/roles/').pipe(
      map((res) => {
        if (res && res.data) {
          return Array.isArray(res.data) ? res.data : (res.data.results || []);
        }
        return Array.isArray(res) ? res : [];
      })
    );
  }

  getPermissionMatrix(): Observable<PermissionMatrixResponse> {
    return this.api.get<any>('identity/permission-matrix/').pipe(
      map((res) => res.data || res)
    );
  }

  updateRolePermissions(roleId: string, permissionIds: string[]): Observable<any> {
    return this.api.post<any>('identity/permission-matrix/', {
      role_id: roleId,
      permission_ids: permissionIds,
    });
  }

  createUser(payload: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    national_id?: string;
    username?: string;
    password?: string;
    role_ids?: string[];
    role_code?: string;
    status?: string;
    school_id?: string;
    branch_id?: string;
  }): Observable<any> {
    return this.api.post<any>('identity/users/', payload);
  }

  updateUser(id: string, payload: Partial<UserItem>): Observable<any> {
    return this.api.patch<any>(`identity/users/${id}/`, payload);
  }

  deleteUser(id: string): Observable<any> {
    return this.api.delete<any>(`identity/users/${id}/`);
  }

  toggleStatus(id: string, status?: string): Observable<any> {
    return this.api.post<any>(`identity/users/${id}/toggle-status/`, { status });
  }

  unlockUser(id: string): Observable<any> {
    return this.api.post<any>(`identity/users/${id}/unlock/`, {});
  }

  adminResetPassword(id: string, newPassword: string): Observable<any> {
    return this.api.post<any>(`identity/users/${id}/admin-reset-password/`, {
      new_password: newPassword,
    });
  }

  terminateSessions(id: string): Observable<any> {
    return this.api.post<any>(`identity/users/${id}/terminate-sessions/`, {});
  }

  assignRoles(id: string, roleIds: string[]): Observable<any> {
    return this.api.post<any>(`identity/users/${id}/assign-roles/`, {
      role_ids: roleIds,
    });
  }
}
