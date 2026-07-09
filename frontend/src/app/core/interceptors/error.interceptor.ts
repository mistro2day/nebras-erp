import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, Observable, shareReplay } from 'rxjs';
import { AuthService } from '../auth/auth.service';

/** تجديد مشترك جارٍ حاليًا لمنع عدة نداءات تجديد متزامنة عند فشل عدة طلبات دفعة واحدة. */
let refreshInFlight: Observable<any> | null = null;

function mapError(error: HttpErrorResponse) {
  let errorMessage = 'حدث خطأ غير متوقع.';

  if (error.status === 0) {
    errorMessage = 'تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت.';
  } else if (error.status === 401) {
    errorMessage = 'انتهت جلستك. الرجاء تسجيل الدخول مجدداً.';
  } else if (error.status === 403) {
    errorMessage = 'غير مصرح لك بإجراء هذه العملية.';
  } else if (error.status === 404) {
    errorMessage = 'العنصر المطلوب غير موجود.';
  } else {
    const backendMessage = error.error?.error?.message || error.error?.message;
    if (backendMessage) errorMessage = backendMessage;
    else if (error.status === 422) errorMessage = 'خطأ في البيانات المرسلة.';
    else if (error.status >= 500) errorMessage = 'خطأ داخلي في الخادم. يرجى المحاولة لاحقاً.';
  }

  console.error(`[HTTP Error ${error.status}]`, errorMessage, error);
  return { status: error.status, message: errorMessage, details: error.error };
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthCall =
        req.url.includes('/identity/login') || req.url.includes('/identity/token/refresh');

      // انتهاء صلاحية رمز الوصول: جدّد الرمز مرة واحدة ثم أعد تنفيذ الطلب الأصلي.
      if (
        error.status === 401 &&
        !isAuthCall &&
        !!localStorage.getItem('refresh_token')
      ) {
        if (!refreshInFlight) {
          refreshInFlight = auth.refreshToken().pipe(shareReplay(1));
        }
        return refreshInFlight.pipe(
          switchMap(() => {
            refreshInFlight = null;
            const newToken = auth.accessToken();
            if (!newToken) {
              return throwError(() => mapError(error));
            }
            // إعادة الطلب برمز جديد (لا يمرّ عبر مُعترِض المصادقة مجددًا، لذا نحقن الترويسة يدويًا).
            const retried = req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } });
            return next(retried);
          }),
          catchError(() => {
            refreshInFlight = null;
            return throwError(() => mapError(error));
          })
        );
      }

      return throwError(() => mapError(error));
    })
  );
};
