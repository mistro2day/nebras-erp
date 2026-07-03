# دليل وهيكلية واجهة الاستخدام (Angular Workspace & UI Architecture) - Nebras ERP

يوضح هذا المستند التنظيم البرمجي وقرارات التصميم للواجهة الأمامية لمنصة **Nebras ERP** التي تم بناؤها باستخدام Angular 20.

---

## 1. هيكل المجلدات والتنظيم البرمجي

تم تقسيم التطبيق وتوزيعه بالاعتماد على المكونات المستقلة (Standalone Components) والتحميل الكسول (Lazy Loading):

```
frontend/src/app/
├── core/                  # Singleton Services (Auth, Guards, Tenant branding)
├── shared/                # Pipes, Directives, general common utilities
├── layouts/               # Dashboard Layout & Auth Layout wrappers
├── design-system/         # Reusable UI elements (Buttons, cards, grids)
└── features/              # Feature modules loaded lazily (dashboard, academics)
```

---

## 2. إدارة الهوية والبراندينغ ديناميكياً (Tenant branding via Angular Signals)

تم تصميم وإعداد خدمة [tenant.service.ts](file:///D:/nebras-erp/frontend/src/app/core/services/tenant.service.ts) بالاعتماد على **Angular Signals**:
- يتم تخزين تفاصيل المستأجر الحالي (الاسم، الألوان، الشعار).
- يتم تحديث ألوان واجهة العميل ديناميكياً عبر تعديل متغيرات CSS المخصصة (CSS Custom Variables) مثل `--primary-color` و `--secondary-color` ديناميكياً لكل مدرسة (Multi-Tenancy Visual Isolation).

---

## 3. نظام التصميم والتبديل المظهري (Design System & Theme switching)

- **الملف التأسيسي للتنسيقات:** يحتوي ملف [design-system.scss](file:///D:/nebras-erp/frontend/src/styles/design-system.scss) على المتغيرات الهيكلية ومواصفات الألوان المظلمة والمضيئة (Dark & Light themes).
- **دعم الـ RTL للغة العربية:** تم تفعيل التوجيه `direction: rtl` بشكل افتراضي مع تجهيز العناصر البرمجية لدعم التدويل (Internationalization) لسهولة إدراج اللغات الأخرى مستقبلاً.