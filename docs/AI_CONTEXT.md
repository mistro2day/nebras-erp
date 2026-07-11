# سياق الذكاء الاصطناعي (AI_CONTEXT.md)

يوفر هذا المستند ملخصاً شاملاً لسياق التطوير وأحدث الإضافات البرمجية لتوجيه مساعدي الذكاء الاصطناعي في المهام المستقبلية للمنصة.

## نظرة عامة على المشروع
Nebras ERP هو نظام تخطيط موارد المؤسسات لإدارة المدارس - سحابي أصلي، متعدد المستأجرين (قاعدة بيانات واحدة مع عزل بـ tenant_id)، جاهز للإنتاج.

## التقنيات المستخدمة
- **Backend**: Django 5 + DRF + PostgreSQL 17 + Redis + Celery
- **Frontend**: Angular 20 + Angular Material + Signals + SCSS
- **Architecture**: Clean Architecture + DDD + Repository Pattern + Event-Driven (Preparation) + Multi-Tenant

## الموديولات المكتملة

### 1. التأسيس والبنية المعمارية (Foundation)
- نموذج قاعدة البيانات الأساسي `CombinedBaseModel` مع UUID, SoftDelete, Audit, Tenant Isolation.
- إعدادات Django المنفصلة (base/dev/prod).
- تكوين Celery و Redis.

### 2. إدارة الهوية والوصول (IAM) - v0.4.0
- نموذج المستخدم المخصص، إدارة الأدوار والصلاحيات، JWT Authentication.

### 3. إدارة التنظيم (Organization) - v0.4.0
- التسلسل الهرمي التنظيمي، إدارة الفروع والأقسام.

### 4. البنية الأكاديمية (Academic Structure) - v0.5.0
- إدارة المراحل والمستويات والفصول والمقررات والحصص.

### 5. إدارة القبول (Admissions) - v0.5.0
- مسار القبول الكامل مع دعم مسارات العمل.

### 6. محرك مسارات العمل (Workflow Engine) - v0.5.0
- محرك مسارات عمل مرن وقابل للتخصيص.

### 7. إدارة دورة حياة الطالب (Student Lifecycle) - v0.6.0
- كيان الطالب كـ Aggregate Root مع 19 كياناً فرعياً.
- مولد رقم الطالب، التسجيل السنوي الفريد، تكامل مسارات العمل.
- شاشات Angular: لوحة التحكم، قائمة الطلاب، التفاصيل، التسجيل الجديد.

### 8. نواة المنصة (Platform Kernel) - v0.7.0
- Event Bus مركزي (Domain/Application/System Events).
- مركز الإشعارات (In-App, Email, SMS).
- محرك التدقيق (Audit Engine).
- تخزين الملفات مع التحقق من السلامة.
- خدمة الكاش مع Redis.
- شاشات Angular: لوحة التحكم، الإعدادات، سجلات النظام.

### 9. مكتبة التأسيس المشتركة (Shared Foundation Library) - v0.8.5
- **كلاسات النطاق الأساسية**: BaseEntity, AggregateRoot, ValueObject, DomainEvent, Result Pattern, Specification Pattern.
- **نماذج Django المجردة**: UUIDModel, TimestampModel, SoftDeleteModel, TenantModel, AuditModel, CombinedSharedModel.
- **البنية التحتية**: BaseRepository, TenantRepository, CRUDService, BaseCRUDViewSet.
- **أدوات التحقق**: الهاتف السعودي، الهوية الوطنية، التواريخ.
- **الاستثناءات**: ValidationException, BusinessException, AuthorizationException, NotFoundException, BaseAppException (المعالجة الموحدة للاستثناءات مدمجة بـ custom_exception_handler).
- **الثوابت**: Gender, AcademicStatus, WorkflowStatus.
- **مكتبة Angular**: ApiClient, Interceptors (Auth/Error), LoadingSpinner, EmptyState, ConfirmDialog, FileUpload, Breadcrumb.
- **لوحة التحكم التشغيلية**: عرض حي وتفاعلي (Signals) لمؤشرات الأداء للباك إند (CPU, Memory, DB size, API latency) القادمة ديناميكياً من SystemHealthService.
- **الاختبارات**: 33 اختباراً ناجحاً بنسبة تغطية كاملة للموديولات المطورة.

### 10. واجهة وبيئة عمل الـ ERP الشاملة (ERP Workspace) - v0.9.0
- **القالب العام للمنصة (App Shell)**: شريط التنقل العلوي للمستأجر النشط، قائمة جانبية منسدلة (Sidebar) مع دعم إظهار الموديولات القادمة كـ "Coming Soon"، وفلترة الروابط بناءً على صلاحيات المستخدم وأدواره (RBAC).
- **لوحة التحكم الفعالة**: ودجات إحصائية حية تقرأ ديناميكياً من الباك إند (إجمالي الطلاب، طلبات القبول، الفروع، التنبيهات غير المقروءة)، مع لوحة إجراءات سريعة (Quick Actions) وجدول زمني لآخر النشاطات الأمنية.
- **ميزات بيئة العمل**: البحث المركزي السريع، التنبيهات المنبثقة، وتناسق واجهات المظهر الداكن والمضيء.

### 11. نواة الأعمال المشتركة للمنصة (Nebras Core Business Platform - NCBP) - v0.9.5
- **محركات الأعمال المشتركة**: بناء Universal Attachment Engine، Comment Widget، Timeline، Approval Engine، والـ Lookup Engine المركزي.
- **توليد الأرقام المرجعية والاستيراد والتصدير**: موديولات مرنة لتوليد أرقام الكيانات (مثل STD-2026-000001) وإجراء عمليات الـ Bulk Import/Export عبر CSV.
- **المكونات المشتركة بالفرونت إند**: تطوير `app-attachment-viewer` و `app-comment-widget` و `app-timeline-widget` كعناصر Angular Standalone و Signals جاهزة للاستخدام الفوري.

### 12. منصة إدارة البيانات المرجعية الموحدة (Master Data Management - MDM) - v1.0.0
- **منصة إدارة البيانات المرجعية**: إنشاء وتطوير تطبيق `master_data` ليكون المصدر الرئيسي والوحيد للبيانات المرجعية والثوابت (جغرافية، شخصية، أكاديمية، مالية، إدارية).
- **التحقق ومنع العلاقات الحلقية**: دمج منطق التحقق الذكي `check_circular_reference` لمنع الدوران الحلقي في الهياكل الشجرية للـ MDM.
- **محرر الشجرة بالفرونت إند**: بناء شجرة العرض والتفاعل الهرمية `app-master-hierarchy-tree` كعنصر Angular Standalone وتعمل بالـ Signals.
- **تأكيد وثبات المنصة**: إضافة واختبار موديول الـ MDM بالكامل ودمجه مع الفحوصات والتحقق ليعود بنسبة نجاح 100%.

### 13. إدارة المعلمين وأعضاء هيئة التدريس (Faculty & Teacher Management) - v1.1.0
- **إدارة المعلمين وتفاصيل التعيين**: إنشاء وتطوير تطبيق `faculty` للباك إند وتطبيق هجرات الجداول للـ (FacultyMember, TeacherProfile, AcademicQualification, TeachingLicense, TeacherAssignment, TeacherAvailability).
- **قواعد العمل ومستويات التحميل**: دمج خدمات التحقق الذاتي مثل `validate_national_id_unique` وقواعد ضبط ساعات العمل القصوى.
- **شاشات ولوحة تحكم المعلمين بالفرونت إند**: بناء شاشات لوحة تحكم المعلمين والبطاقات `app-teacher-card` كعناصر Angular مستقلة تعمل بالـ Signals.
- **التكامل البرمجي الكامل**: عزل المعلمين وربطهم بنظام الصلاحيات وقاعدة البيانات، مع تفعيل 39 اختباراً ناجحاً بنسبة 100%.

### 14. النواة الموحدة للموظفين (Employee Core Platform) - v1.2.0
- **إعادة الهيكلة المعمارية لمفهوم الموظف**: بناء تطبيق `employees` للباك إند وتوفير الجداول التأسيسية لـ (Employee, Profile, StatusHistory).
- **دمج المعلمين وتوافق البيانات**: تعديل الكيان `FacultyMember` ليرتبط بـ `Employee` كعلاقة تخصص لضمان استقرار الهيكل وإزالة التكرار مع التوافق التام للوراء.
- **شاشات الموارد البشرية بالفرونت إند**: بناء شاشات لوحة تحكم الموظفين والـ Table بالفرونت إند مع تفعيل مسارات التنقل بالصلاحيات لـ `/hr/dashboard`.
- **التحقق والاختبارات**: تمرير واجتياز 41 اختباراً ناجحاً بنسبة 100% للتأكد من سلامة عملية الدمج المعماري.

### 15. الرواتب والتعويضات (Payroll & Compensation) - v1.3.0
- **إدارة مسيرات الرواتب وهياكل الأجور**: إنشاء وتطوير تطبيق `payroll` للباك إند وتطبيق هجرات الجداول (SalaryStructure, EmployeeLoan, PayrollRun, Payslip).
- **قواعد احتساب الرواتب والقروض**: دمج محركات الحساب التلقائية لصافي المستحقات بعد استقطاع أقساط السلف والجزاءات.
- **شاشات وقسيمة الراتب بالفرونت إند**: بناء شاشات الـ Payroll Dashboard والودجات التفاعلية وعارض قسيمة الراتب `app-payslip-viewer` بالـ Signals.
- **التكامل البرمجي والتغطية**: عزل مسيرات الرواتب على مستوى المستأجرين مع تفعيل 42 اختباراً ناجحاً بنسبة 100%.








## هيكل المشروع
```
nebras-erp/
├── backend/
│   ├── apps/
│   │   ├── common/         # النماذج المشتركة الأصلية (التوافق الخلفي)
│   │   ├── tenants/        # إدارة المستأجرين
│   │   ├── iam/            # إدارة الهوية والوصول
│   │   ├── organization/   # إدارة التنظيم
│   │   ├── academics/      # البنية الأكاديمية
│   │   ├── admissions/     # القبول والتسجيل
│   │   ├── workflow/       # محرك مسارات العمل
│   │   ├── students/       # دورة حياة الطالب
│   │   ├── platform/       # نواة المنصة
│   │   └── shared/         # مكتبة التأسيس المشتركة (الجديد)
│   ├── config/             # إعدادات Django
│   └── manage.py
├── frontend/
│   └── src/app/
│       ├── core/           # خدمات ومعترضات مركزية
│       ├── shared/         # مكونات مشتركة
│       └── features/       # الميزات حسب الموديول
└── docs/                   # التوثيق
```

## القرارات المعمارية (ADRs)
| الرقم | القرار |
|---|---|
| ADR-001 | Django + DRF + PostgreSQL |
| ADR-002 | قاعدة بيانات واحدة مع عزل بـ tenant_id |
| ADR-003 | Clean Architecture مع DDD |
| ADR-004 | Angular Standalone Components مع Signals |
| ADR-005 | البنية الأكاديمية كنطاق مستقل |
| ADR-006 | Platform Kernel كبنية مشتركة |
| ADR-007 | Shared Foundation Library لتوحيد أنماط DDD |
| ADR-008 | استخدام نظام الصفحات الكاملة ومتعددة الخطوات (Wizard/Stepper) بدلاً من النوافذ المنبثقة (Popups) لأي عمليات إضافة أو تسجيل جديدة في النظام لضمان تجربة مستخدم متسقة وواجهات ممتازة. |
| ADR-009 | استخدام منتقي التاريخ المعتمد `<nb-datepicker>` بدلاً من حقول الإدخال الافتراضية للتواريخ `input[type=date]` لتوحيد مظهر الحقول وتجربة اختيار التواريخ عبر المنصة بالكامل. |
| ADR-010 | توجيه وتوطين النظام لجمهورية السودان، وبالتالي اعتماد مصطلح "الرقم الوطني" رسمياً في كافة الواجهات ونماذج الإدخال وقواعد البيانات والتحقق بدلاً من "الهوية الوطنية". |

## الخطوة القادمة
المرحلة 11: تأسيس الموارد البشرية (HR & Staff Management Foundation).