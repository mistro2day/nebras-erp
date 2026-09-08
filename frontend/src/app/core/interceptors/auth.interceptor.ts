import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('access_token');
  const tenantRaw = localStorage.getItem('nb_tenant');
  let tenantId: string | null = null;
  if (tenantRaw) {
    try {
      tenantId = JSON.parse(tenantRaw)?.id;
    } catch (_) {}
  }
  if (!tenantId && !environment.production && environment.defaultTenantId) {
    tenantId = environment.defaultTenantId;
  }

  const setHeaders: Record<string, string> = {};
  if (token) {
    setHeaders['Authorization'] = `Bearer ${token}`;
  }
  if (tenantId) {
    setHeaders['X-Tenant-ID'] = tenantId;
  }

  if (Object.keys(setHeaders).length > 0) {
    return next(req.clone({ setHeaders }));
  }

  return next(req);
};