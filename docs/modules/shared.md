# وثيقة موديول المكتبة المشتركة (Shared Foundation Library)

## نظرة عامة
مكتبة التأسيس المشتركة (`apps/shared`) هي الطبقة الأساسية المشتركة لجميع موديولات Nebras ERP.
تحتوي على جميع الكلاسات الأساسية وأنماط DDD وأدوات التحقق والاستثناءات المركزية.

> **ملاحظة:** هذا الموديول لا يحتوي على أي منطق أعمال (Business Logic). إنه بنية تحتية بحتة.

## الهيكل المعماري
```
apps/shared/
├── domain/
│   ├── base.py            # EntityId, BaseEntity, AggregateRoot, ValueObject, Result, Specification
│   ├── models.py          # TimestampModel, UUIDModel, SoftDeleteModel, TenantModel, AuditModel, CombinedSharedModel
│   ├── validators.py      # validate_saudi_phone, validate_national_id, validate_future_date, validate_past_date
│   ├── exceptions.py      # BaseAppException, ValidationException, BusinessException, AuthorizationException, NotFoundException
│   └── constants.py       # Gender, AcademicStatus, WorkflowStatus
├── application/
│   ├── repositories.py    # BaseRepository, TenantRepository
│   ├── services.py        # CRUDService
│   └── utils.py           # StringUtils, CodeGenerator
├── interfaces/
│   ├── views.py           # BaseCRUDViewSet
│   ├── serializers.py     # TenantBaseSerializer
│   └── permissions.py     # TenantPermission
└── tests.py               # 25 اختبار وحدة
```

## الكلاسات الأساسية

### كلاسات النطاق (Domain Base Classes)
| الكلاس | الوصف |
|---|---|
| `EntityId` | كائن قيمة للـ UUID الفريد |
| `BaseEntity` | الكيان الأساسي مع ID والمساواة |
| `AggregateRoot` | جذر التجميع مع إدارة Domain Events |
| `ValueObject` | كائن قيمة مع مساواة هيكلية |
| `DomainEvent` | حدث النطاق الأساسي |
| `BusinessRule` | قاعدة أعمال قابلة لإعادة الاستخدام |
| `Result[T]` | نمط النتيجة (Success/Failure) |
| `Specification` | نمط التوصيف مع AND/OR/NOT |

### النماذج المجردة (Abstract Models)
| النموذج | الحقول |
|---|---|
| `UUIDModel` | `id` (UUID pk) |
| `TimestampModel` | `created_at`, `updated_at` |
| `SoftDeleteModel` | `deleted_at`, `delete()`, `restore()` |
| `TenantModel` | `tenant_id` (UUID, indexed) |
| `AuditModel` | `created_by`, `updated_by`, `version` |
| `CombinedSharedModel` | يرث من جميع ما سبق |

### أدوات التحقق (Validators)
- `validate_saudi_phone`: التحقق من أرقام الهواتف السعودية (05xxxxxxxx أو +9665xxxxxxxx)
- `validate_national_id`: التحقق من رقم الهوية الوطنية (10 أرقام تبدأ بـ 1 أو 2)
- `validate_future_date`: التحقق من أن التاريخ في المستقبل
- `validate_past_date`: التحقق من أن التاريخ في الماضي

## مكتبة Angular المشتركة

### الخدمات (Services)
- `ApiClientService`: خدمة HTTP مركزية لجميع طلبات الـ API

### المعترضات (Interceptors)
- `authInterceptor`: إرفاق JWT Token تلقائياً
- `errorInterceptor`: معالجة أخطاء HTTP بصيغة عربية

### المكونات المشتركة (Shared Components)
| المكون | الوظيفة |
|---|---|
| `LoadingSpinnerComponent` | مؤشر التحميل المركزي |
| `EmptyStateComponent` | حالة عدم وجود بيانات |
| `ConfirmDialogComponent` | حوار التأكيد الموحد |
| `FileUploadComponent` | رفع الملفات مع Drag & Drop |
| `BreadcrumbComponent` | التنقل الهرمي |

## الاختبارات
- **25 اختبار وحدة** تغطي جميع الكلاسات الأساسية
- **36 اختبار regression** لضمان التوافق مع النظام بالكامل
- **النتيجة:** OK (جميع الاختبارات ناجحة)