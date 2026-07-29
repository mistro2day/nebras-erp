# تطبيق نبراس للهاتف (Nebras Mobile)

تطبيق Flutter لمنصّة نبراس المدرسية. المرحلة الحالية: **بوابة ولي الأمر** طرف‑لطرف
(تحلّ محلّ بوابة الويب هاتف‑أولاً)، مع أساس قابل للتوسّع لبقيّة الأدوار.

## المعمار

```
lib/
  main.dart                 نقطة الدخول (ProviderScope + استعادة الجلسة + Router)
  app/router.dart           go_router + إعادة توجيه حسب المصادقة والدور
  core/
    config/app_config.dart  عنوان API ومعرّف المستأجر (عبر --dart-define)
    network/                Dio ApiService (حقن التوكن والمستأجر) + تطبيع الأخطاء
    storage/                تخزين آمن للجلسة (flutter_secure_storage)
    providers.dart          مزوّدات Riverpod للبنية التحتية
    theme/ , ui/            الثيم ومساعدات التنسيق
  features/
    auth/                   المصادقة (repository + controller + شاشة دخول)
    parent/                 بوابة ولي الأمر (نماذج/مستودع/مزوّدات/شاشات)
    common/                 شاشة الأدوار قيد التطوير
```

- **إدارة الحالة:** Riverpod (Notifier/FutureProvider).
- **الشبكة:** Dio مع interceptor يحقن `Authorization` و`X-Tenant-ID` تلقائياً.
- **المصادقة:** حقيقية عبر `identity/login`، التوكن في تخزين آمن، توجيه حسب `portal_user_type`.

## التشغيل

```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api/v1
```

- **محاكي Android:** `10.0.2.2` يشير إلى `localhost` الجهاز المضيف (الافتراضي).
- **محاكي iOS/سطح المكتب:** استبدله بـ `http://127.0.0.1:8000/api/v1`.
- **مستأجر مختلف:** أضِف `--dart-define=TENANT_ID=<uuid>`.

## نقاط API المستهلَكة (بوابة ولي الأمر)

| الشاشة | النقطة |
| --- | --- |
| الدخول | `POST identity/login/` |
| قائمة الأبناء | `GET portal/parent/children/` |
| تفاصيل ابن | `GET portal/parent/children/{id}/` |
| طلبات السداد | `GET student-finance/online-payments/?mine=true` |
| إرسال سداد | `POST student-finance/online-payments/` (multipart) |
| الإعلانات | `GET portal/announcements/` |
| تغيير كلمة المرور | `POST identity/change-my-password/` |

## اللاحق

- تعميم النمط على أدوار: الطالب، المعلّم، الإدارة.
- إشعارات Push (FCM) + تسجيل جهاز عبر `notifications/device-tokens/`.
- حلّ المستأجر متعدّد المدارس عند الدخول.
