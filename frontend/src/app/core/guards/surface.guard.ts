import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TenantService } from '../services/tenant.service';
import { AuthService } from '../auth/auth.service';

/**
 * حارس المسار الجذري (/): يوجّه الزائر حسب حالته وحالة السطح (عام أم مدرسة)
 * دون الدخول في أي حلقة إعادة توجيه لا نهائية.
 */
export const rootSurfaceGuard: CanActivateFn = () => {
  const tenant = inject(TenantService);
  const auth = inject(AuthService);
  const router = inject(Router);

  // إذا كان المستخدم مسجلاً دخوله بالفعل ← إلى لوحة التحكم
  if (auth.isAuthenticated() || auth.currentUser()) {
    return router.createUrlTree(['/dashboard']);
  }

  // إذا كان على الموقع العام لنبراس (SaaS) ← إلى الموقع التسويقي
  if (tenant.isPublicSite()) {
    return router.createUrlTree(['/nebras']);
  }

  // إذا كان على نطاق مدرسة خاصة ← إلى بوابة ترحيب المدرسة
  return router.createUrlTree(['/welcome']);
};

export const publicSurfaceGuard: CanActivateFn = rootSurfaceGuard;

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
  if (auth.isSuperuser() || tenant.isAdminSite() || tenant.isDevHost()) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};
