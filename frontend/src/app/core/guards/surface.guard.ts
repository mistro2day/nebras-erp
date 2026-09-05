import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TenantService } from '../services/tenant.service';
import { AuthService } from '../auth/auth.service';

/**
 * حارس السطح: على النطاق الجذر لنبراس (surface = public) يُحوَّل الزائر إلى الموقع
 * التسويقي بدل لوحة المستأجر. على نطاق مدرسة فرعي يمرّ الطلب كالمعتاد.
 */
export const publicSurfaceGuard: CanActivateFn = () => {
  const tenant = inject(TenantService);
  const auth = inject(AuthService);
  const router = inject(Router);
  if (tenant.isPublicSite()) {
    if (auth.currentUser() || auth.isAuthenticated()) {
      return router.createUrlTree(['/dashboard']);
    }
    return router.createUrlTree(['/nebras']);
  }
  return true;
};

/**
 * حارس بوابة الترحيب: إذا دخل الزائر على /welcome وهو على الموقع العام لنبراس (بلا نطاق مدرسة)،
 * يتم توجيهه إلى الموقع التسويقي الرئيسي /nebras.
 */
export const welcomeSurfaceGuard: CanActivateFn = () => {
  const tenant = inject(TenantService);
  const router = inject(Router);
  if (tenant.isPublicSite()) {
    return router.createUrlTree(['/nebras']);
  }
  return true;
};

/**
 * حارس منطقة المالك: يمنع الوصول لشاشات المنصّة (إدارة المستأجرين/الفوترة) لغير المالكين.
 * متاح فقط لمالك المنصة (is_superuser) أو على نطاق admin المركزي.
 */
export const ownerSurfaceGuard: CanActivateFn = () => {
  const tenant = inject(TenantService);
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isSuperuser() || tenant.isAdminSite()) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};
