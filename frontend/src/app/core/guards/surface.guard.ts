import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TenantService } from '../services/tenant.service';

/**
 * حارس السطح: على النطاق الجذر لنبراس (surface = public) يُحوَّل الزائر إلى الموقع
 * التسويقي بدل لوحة المستأجر. على نطاق مدرسة فرعي يمرّ الطلب كالمعتاد.
 */
export const publicSurfaceGuard: CanActivateFn = () => {
  const tenant = inject(TenantService);
  const router = inject(Router);
  if (tenant.isPublicSite()) {
    return router.createUrlTree(['/nebras']);
  }
  return true;
};

/**
 * حارس منطقة المالك: يمنع الوصول لشاشات المنصّة (إدارة المستأجرين/الفوترة) من
 * داخل لوحة مستأجر. متاح على سطح admin وفي التطوير المحلّي فقط.
 */
export const ownerSurfaceGuard: CanActivateFn = () => {
  const tenant = inject(TenantService);
  const router = inject(Router);
  if (tenant.showOwnerArea()) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};
