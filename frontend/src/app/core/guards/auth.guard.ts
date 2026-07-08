import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  // زائر يفتح جذر الموقع ← بوابة الهبوط العامة (تقديم / تتبّع / دخول الإدارة).
  // روابط عميقة داخلية ← صفحة الدخول مباشرة.
  const url = state.url.split('?')[0];
  if (url === '/' || url === '/dashboard' || url === '') {
    return router.createUrlTree(['/welcome']);
  }
  return router.createUrlTree(['/accounts/login']);
};