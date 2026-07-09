import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthResponse {
  access: string;
  refresh: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    is_superuser: boolean;
  };
  permissions: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  
  // استرجاع البيانات المحفوظة محلياً لتجنب فقدان الجلسة عند تحديث الصفحة
  currentUser = signal<any | null>(this.getStoredUser());
  accessToken = signal<string | null>(localStorage.getItem('access_token'));
  userPermissions = signal<string[]>(this.getStoredPermissions());

  constructor() {
    const access = localStorage.getItem('access_token');
    const refresh = localStorage.getItem('refresh_token');
    if (!access && refresh) {
      this.refreshToken().subscribe();
    }
  }

  // Computed state
  isAuthenticated = computed(() => !!this.accessToken());
  isSuperuser = computed(() => this.currentUser()?.is_superuser || false);

  private getStoredUser() {
    try {
      const u = localStorage.getItem('current_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }

  private getStoredPermissions() {
    try {
      const p = localStorage.getItem('user_permissions');
      return p ? JSON.parse(p) : [];
    } catch {
      return [];
    }
  }

  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}identity/login/`, credentials).pipe(
      tap(response => {
        if (response.success) {
          const authData: AuthResponse = response.data;
          this.accessToken.set(authData.access);
          this.currentUser.set(authData.user);
          this.userPermissions.set(authData.permissions || []);
          
          // حفظ بيانات الجلسة كاملة في التخزين المحلي لتظل مستمرة
          localStorage.setItem('access_token', authData.access);
          localStorage.setItem('current_user', JSON.stringify(authData.user));
          localStorage.setItem('user_permissions', JSON.stringify(authData.permissions || []));
          localStorage.setItem('refresh_token', authData.refresh);
        }
      })
    );
  }

  hasPermission(permCode: string): boolean {
    if (this.isSuperuser()) return true;
    return this.userPermissions().includes(permCode);
  }

  logout(): Observable<any> {
    const refresh = localStorage.getItem('refresh_token');
    return this.http.post<any>(`${environment.apiUrl}identity/logout/`, { refresh }).pipe(
      tap(() => {
        this.clearSession();
      })
    );
  }

  refreshToken(): Observable<any> {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) {
      this.clearSession();
      return of(null);
    }
    return this.http.post<any>(`${environment.apiUrl}identity/token/refresh/`, { refresh }).pipe(
      tap({
        next: (response) => {
          const newAccess = response.access || response.data?.access;
          if (newAccess) {
            this.accessToken.set(newAccess);
            localStorage.setItem('access_token', newAccess);
            if (response.refresh) {
              localStorage.setItem('refresh_token', response.refresh);
            }
          }
        },
        error: () => {
          this.clearSession();
        }
      })
    );
  }

  clearSession() {
    this.accessToken.set(null);
    this.currentUser.set(null);
    this.userPermissions.set([]);
    
    // مسح كافة بيانات الجلسة من التخزين المحلي
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
    localStorage.removeItem('user_permissions');
    localStorage.removeItem('refresh_token');
  }
}
