import { HttpInterceptorFn, HttpHeaders } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { TenantService } from '../services/tenant.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const tenantService = inject(TenantService);

  const token = authService.accessToken();
  const tenant = tenantService.currentTenant();

  let headers = req.headers;

  // 1. حقن رمز الـ JWT (Bearer Token) عند توفره
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  // 2. حقن معرف المستأجر الحالي (Tenant ID) لضمان عزل البيانات في الاستدعاء
  if (tenant) {
    headers = headers.set('X-Tenant-ID', tenant.id);
  }

  const authReq = req.clone({ headers });
  return next(authReq);
};