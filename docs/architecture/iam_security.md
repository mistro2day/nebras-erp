# دليل نظام الهوية والوصول والتأمين (Identity & Access Management) - Nebras ERP

يوضح هذا المستند التصميم الأمني لمحرك المصادقة وإدارة الجلسات والأدوار التفاعلية في نظام Nebras ERP.

---

## 1. محرك التحقق من الصلاحيات (RBAC Engine)

تم بناء فئة الحارس الديناميكية `HasPermission` في [authorization.py](file:///D:/nebras-erp/backend/apps/identity/authorization.py):

- **عزل المدارس:** تقوم الفئة ديناميكياً بجلب الأدوار الخاصة بالمستخدم المحددة للمستأجر الفعال الحالي (`request.tenant`).
- **وراثة وترتيب الصلاحيات:** يتحقق الحارس من امتلاك المستخدم للصلاحية المحددة أو امتلاكه صلاحية أعلى ترث منها في شجرة الأدوار والصلاحيات.

---

## 2. إدارة الجلسات وتعقب الأجهزة (Device & Session Management)

يوفر موديول الـ IAM لوحات تتبع وسجلات متقدمة تشمل:
- تعقب وحفظ الجلسات والأجهزة الفعالة ونوع المتصفح وعنوان الـ IP لكل عملية دخول في [views.py](file:///D:/nebras-erp/backend/apps/identity/interfaces/views.py).
- إمكانية إجراء **Force Logout** وجدولة إلغاء صلاحية الرموز الأمنية للـ JWT من خلال تسجيل الخروج الموحد.

---

## 3. تكامل الواجهة الأمامية (Angular UI Integration)

- **حارس الاتصالات الـ HTTP Interceptor:** يقوم [auth.interceptor.ts](file:///D:/nebras-erp/frontend/src/app/core/auth/auth.interceptor.ts) تلقائياً بحقن رمز الـ JWT الموحد ورمز المستأجر الحالي لجميع الطلبات لضمان عزل البيانات بصرياً وحسابياً.
- **صفحة تسجيل الدخول:** تم تصميم [login.component.ts](file:///D:/nebras-erp/frontend/src/app/features/accounts/login/login.component.ts) ليتفاعل تلقائياً مع الثيم المختار وألوان المدرسة وشعارها عند التحميل المبدئي.