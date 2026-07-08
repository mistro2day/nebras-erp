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
  
  // استخدام Signals لحفظ حالة المستخدم وجلسة العمل الحالية والصلاحيات
  currentUser = signal<any | null>(null);
  accessToken = signal<string | null>(null);
  userPermissions = signal<string[]>([]);

  // Computed state
  isAuthenticated = computed(() => !!this.accessToken());
  isSuperuser = computed(() => this.currentUser()?.is_superuser || false);

  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}identity/login/`, credentials).pipe(
      tap(response => {
        if (response.success) {
          const authData: AuthResponse = response.data;
          this.accessToken.set(authData.access);
          this.currentUser.set(authData.user);
          this.userPermissions.set(authData.permissions || []);
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

  clearSession() {
    this.accessToken.set(null);
    this.currentUser.set(null);
    this.userPermissions.set([]);
    localStorage.removeItem('refresh_token');
  }
}
