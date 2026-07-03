# قواعد التسمية المعيارية والهندسة المعمارية (Naming Conventions & Architecture)

يوضح هذا المستند القواعد المتبعة لتطوير منصة **Nebras ERP** لضمان الاتساق البرمجي عبر جميع الفرق البرمجية.

## 1. قواعد تسمية الكود البرمجي (Naming Conventions)

### Backend (Python / Django)
- **ملفات التطبيقات والأدلة**: lowercase مع استخدام الأفعال/الأسماء المباشرة (مثل: `accounts`, `academics`).
- **الفئات (Classes)**: PascalCase (مثل: `StudentAttendance`, `InvoiceService`).
- **الوظائف والمتغيرات**: snake_case (مثل: `calculate_gpa()`, `tenant_id`).
- **المستودعات (Repositories) وحالات الاستخدام**: تنتهي بـ `Repository` أو `UseCase` لتوضيح دورها.

### Frontend (TypeScript / Angular)
- **المكونات (Components)**: kebab-case مع اللاحقة `.component.ts` (مثل: `student-list.component.ts`).
- **الخدمات (Services)**: kebab-case مع اللاحقة `.service.ts` (مثل: `tenant-resolver.service.ts`).
- **النماذج (Models / Interfaces)**: PascalCase داخل ملفات تنتهي بـ `.model.ts` (مثل: `student.model.ts`).

### Mobile (Dart / Flutter)
- **الملفات والمجلدات**: snake_case (مثل: `home_screen.dart`).
- **الفئات (Classes)**: PascalCase (مثل: `AuthRepository`).
- **المتغيرات والوظائف**: camelCase (مثل: `getUserProfile()`).

---

## 2. هيكلية الباك إند النظيف (Clean Layered App Structure)

كل تطبيق في مجلد `backend/apps/` يحتوي على أربع طبقات معزولة:

```
app_name/
├── domain/            # النماذج الكيانية النقية وقواعد العمل (مستقل تماماً عن Django)
│   ├── models.py      # Entities
│   └── value_objects.py
├── application/       # حالات الاستخدام والخدمات والتطبيقات العملية
│   ├── services.py    # Application Services
│   └── use_cases.py
├── interfaces/        # طبقة التوصيل الخارجي (HTTP, API, CLI)
│   ├── views.py       # Django views/viewsets
│   ├── serializers.py
│   └── urls.py
└── infrastructure/    # قواعد البيانات والتكاملات الخارجية والمخازن
    └── repositories.py # تطبيق استرجاع البيانات (Database Access)
```

---

## 3. قرارات معمارية هامة

- **Tenant Isolation**: سيتم تطبيق استعلامات مخصصة داخل `infrastructure/repositories.py` بحيث لا يتم تنفيذ أي استعلام لقاعدة البيانات دون التحقق من الـ `tenant_id` لضمان عدم تسريب البيانات.
- **Standalone Angular Components**: جميع المكونات المنشأة حديثاً ستكون Standalone لتسهيل عملية الـ Lazy Loading الفردية وتصغير حجم الحزم البرمجية المرسلة للمتصفح.
- **Clean Architecture Flutter**: يعتمد الموبايل على فصل الـ UI (Presentation) تماماً عن طبقة البيانات والـ Rest Client (Data) من خلال العقود البرمجية المحددة في (Domain).