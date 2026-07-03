# وثيقة معايير الجودة وبوابات القبول (QUALITY_REPORT.md) - Nebras ERP

توضح هذه الوثيقة بوابات الجودة (Quality Gates) الحالية والقواعد الصارمة التي يجب على كل موديول برمجيات إضافي اجتيازها قبل اعتماده كـ **Production Ready**.

---

## 1. بوابات الجودة الخمس المعتمدة (The 5 Quality Gates)

لضمان سلامة واستقرار النظام وعدم حدوث تراجعات (Regression)، يجب استيفاء بوابات الجودة التالية لكل موديول جديد:

```
[ Gate 1: DDD Domain Model ] ──> [ Gate 2: Clean API ViewSets ] ──> [ Gate 3: Tenant Isolation ]
                                                                             │
[ Gate 5: Production Approval ] <── [ Gate 4: Test Coverage >= 90% ] <───────┘
```

1. **بوابة النطاق وبنية الـ DDD:**
   - يجب أن يرث الكيان الأساسي من `AggregateRoot` أو `BaseEntity` في `shared`.
   - يجب عزل منطق العمل عن طبقة الـ Views.
2. **بوابة واجهات الـ REST API:**
   - يجب الالتزام بصيغة الرد الموحدة للنجاح والفشل (`StandardResponse`, `custom_exception_handler`).
   - يجب استخدام `BaseCRUDViewSet` وعزل الـ Serializers بـ `TenantBaseSerializer`.
3. **بوابة عزل المستأجرين (Tenant Isolation):**
   - يجب إدراج حقل `tenant_id` وتطبيق التصفية التلقائية عبر الـ Middleware وقواعد ORM الموحدة.
4. **بوابة الأمان والتدقيق (Audit & RBAC):**
   - يجب تفعيل الـ Audit Logs للعمليات الحساسة (إنشاء، تعديل، حذف) عبر الـ Event Bus.
   - يجب تقييد الوصول بحارس الصلاحيات الديناميكي والأدوار (RBAC).
5. **بوابة التغطية البرمجية والاختبارات (Test Coverage):**
   - يجب كتابة اختبارات تكامل ووحدة تغطي كافة الحالات والمسارات.
   - النسبة المستهدفة لتغطية الكود (Code Coverage) يجب ألا تقل عن **90%**.

---

## 2. تقرير الحالة والتحقق الحالي

* **معدل نجاح الاختبارات الحالية:** 100% (جميع الاختبارات الـ 33 ناجحة ومستقرة).
* **التوافق المعماري:** جميع الموديولات النشطة ملتزمة ببوابات الجودة المعمارية (Foundation, IAM, Organization, Academics, Admissions, Students, Platform).