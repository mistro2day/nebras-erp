import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'حدث خطأ غير متوقع.';

      if (error.status === 0) {
        errorMessage = 'تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت.';
      } else if (error.status === 401) {
        errorMessage = 'انتهت جلستك. الرجاء تسجيل الدخول مجدداً.';
      } else if (error.status === 403) {
        errorMessage = 'غير مصرح لك بإجراء هذه العملية.';
      } else if (error.status === 404) {
        errorMessage = 'العنصر المطلوب غير موجود.';
      } else if (error.status === 422) {
        errorMessage = error.error?.message || 'خطأ في البيانات المرسلة.';
      } else if (error.status >= 500) {
        errorMessage = 'خطأ داخلي في الخادم. يرجى المحاولة لاحقاً.';
      }

      console.error(`[HTTP Error ${error.status}]`, errorMessage, error);
      return throwError(() => ({ status: error.status, message: errorMessage, details: error.error }));
    })
  );
};