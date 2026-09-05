import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { TenantService } from '../services/tenant.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const tenant = inject(TenantService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  // على الموقع العام (النطاق الرئيسي / السطح العام لنبراس) ← التوجيه للموقع التسويقي
  if (tenant.isPublicSite()) {
    return router.createUrlTree(['/nebras']);
  }

  // زائر يفتح جذر الموقع لمدرسة محددة ← بوابة الهبوط للمدرسة
  const url = state.url.split('?')[0];
  if (url === '/' || url === '/dashboard' || url === '') {
    return router.createUrlTree(['/welcome']);
  }
  return router.createUrlTree(['/accounts/login']);
};