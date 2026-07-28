# موديول إدارة الهوية والملف الشخصي للمستخدم — Identity & Profile Module

يغطي هذا المستند البنية المعمارية وتكاملات الواجهة الأمامية مع الخلفية لإدارة هوية المستخدم، الملف الشخصي، الصورة الرمزية (Avatar)، إعدادات الأمان والجلسات، ومحرك إرسال الإشعارات البريدية المجدولة في نظام **نبراس OS**.

---

## 1. الهيكلة المعمارية (Backend Architecture)

يستند موديول الهوية في الباك اند إلى تطبيق `apps.identity` بالاعتماد على تصميم النطاق الموجه (Domain-Driven Design):

### النماذج في دبيات البيانات (Domain Models):
- **`User`** (`apps/identity/domain/models.py`):
  - مفتاح أساسي فريد من نوع UUID.
  - دعم الحقول الشخصية والملف التعريفي: `first_name`, `last_name`, `email`, `username`, `phone`, `national_id`, `avatar`, `language`, `user_timezone`.
  - حقل التفضيلات المتقدمة: `preferences` (JSONField) لتخزين سمة المظهر (`theme`)، الإشعارات البريدية (`email_digest`)، الصوت (`sound`)، وكثافة الجداول (`density`).
  - سياسات الأمان وقفل الحساب: `failed_login_attempts`, `lockout_until`, `password_changed_at`.
- **`UserSession`**:
  - تتبع الجلسات النشطة لكل مستخدم مع تسجيل اسم الجهاز، المتصفح، نظام التشغيل، عنوان IP، وتاريخ آخر نشاط.
- **`PasswordHistory`**:
  - حفظ سجل الهاشات لمنع تكرار كلمات المرور القديمة.

---

## 2. نقاط الوصول (API Endpoints)

تم دعم نقاط الوصول التالية في `apps/identity/interfaces/views.py`:

| نقطة الوصول (Endpoint) | الطريقة | الوصف والتأثير |
| :--- | :--- | :--- |
| `/api/v1/identity/users/me/` | `GET` | استرجاع بيانات المستخدم الحالي الموقّع بالكامل مع رابط الصورة الرمزية المطلق وتفضيلاته. |
| `/api/v1/identity/users/me/` | `PATCH / PUT` | تحديث البيانات الشخصية ورابط الصورة الرمزية يدعم `multipart/form-data` وحذف الصورة عبر `remove_avatar`. |
| `/api/v1/identity/change-my-password/` | `POST` | تغيير كلمة المرور الحالية للمستخدم مع التحقق من قوتها وسياسة الهاش القديم. |
| `/api/v1/identity/security-dashboard/` | `GET` | استرجاع إحصائيات الجلسات والأجهزة الفعالة الخاصة بالمستخدم الحالي. |
| `/api/v1/identity/sessions/<id>/terminate/` | `POST` | إنهاء جلسة جهاز معين بشكل آمن من الباك اند. |
| `/api/v1/identity/logout-all/` | `POST` | تسجيل الخروج وإنهاء جميع الجلسات الفعالة للأجهزة الأخرى. |

---

## 3. التكامل في الواجهة الأمامية (Frontend & Layout)

### أ. اتساق الصورة الرمزية في الهيدر والبار الجانبي
- **`AuthService`** (`frontend/src/app/core/auth/auth.service.ts`):
  - تزويد الخدمة بدالة `updateCurrentUser(userData)` التي تحدث إشارة `currentUser` محلياً وفي `localStorage`.
- **`DashboardLayoutComponent`** (`frontend/src/app/layouts/dashboard-layout/dashboard-layout.component.ts`):
  - ربط أسفل الشريط الجانبي (Sidebar bottom user item) والأفاتار العلوي في الهيدر (Topbar avatar) بإشارة `userAvatarUrl()` و `userInitials()`.
  - يتحدث الأفاتار فوراً في كل الشاشات بمجرد رفع صورة جديدة دون الحاجة لإعادة تحميل الصفحة.

### ب. شاشة إعدادات الملف الشخصي المتبوبة (`UserProfileComponent`)
- تم تصميم الشاشة في `frontend/src/app/features/accounts/profile/profile.component.ts` بالاعتماد على مهارات **Nebras OS (UI-UX Pro Max)** وتضم 4 تبويبات:
  1. **البيانات الشخصية**: تعديل الاسم، البريد، الرقم الوطني، الهاتف، رفع الصورة الرمزية مع معاينة فورية وطبقة تفاعلية (Camera Overlay)، واختيار اللغة والتوقيت.
  2. **الأمان وكلمة المرور**: تغيير كلمة المرور، إظهار/إخفاء كلمة المرور، ومؤشر تفاعلي لقوة كلمة المرور (Password Strength Meter).
  3. **الجلسات والأجهزة**: استعراض الجلسات الفعالة، عنوان IP، ونظام التشغيل، وتفعيل زر إنهاء الجلسة عبر **نافذة تأكيد مخصصة (Nebras Styled Modal)** بدون أجهزة المتصفح التقليدية (`alert`/`confirm`).
  4. **التفضيلات والنظام**: التحكم في السمة والملخص البريدي.

---

## 4. محرك إرسال الإشعارات البريدية المجدولة (Daily Email Digest Dispatcher)

تم إنشاء وتفعيل أمر جانغو المجدول `send_daily_email_digest`:

- **ملف السكريبت**: `backend/apps/identity/management/commands/send_daily_email_digest.py`
- **طريقة التشغيل**:
  ```bash
  python backend/manage.py send_daily_email_digest
  ```
- **طريقة التشغيل التجريبي (Dry Run)**:
  ```bash
  python backend/manage.py send_daily_email_digest --dry-run
  ```
- **آلية العمل**:
  1. الاستعلام المباشر من DB عن المستخدمين المؤهلين الحاملين لـ `preferences.email_digest = True`.
  2. تجميع الإشعارات المسجلة لكل مستخدم خلال الـ 24 ساعة الماضية.
  3. إنشاء بريد بصيغة HTML فاخرة ومتناسقة مع نظام نبراس OS وإرسالها عبر بروتوكول البريد (Email Backend / SMTP).

---

## 5. خطوات الجدولة الدورية للإنتاج (Production Cron Job Setup)

لضمان تشغيل الإرسال البريدي اليومي تلقائياً في سيرفر الإنتاج (Linux):
```cron
# تشغيل محرك الإشعارات البريدية اليومي كل ليلة عند الساعة 12:00 منتصف الليل
0 0 * * * cd /path/to/nebras-erp && /path/to/venv/bin/python backend/manage.py send_daily_email_digest >> /var/log/nebras_digest.log 2>&1
```
