<div dir="rtl">

# موديول لوحة التحكم التشغيلية وبيئة عمل الـ ERP (Dashboard & Workspace)

يوثق هذا المستند الهيكل المعماري والروابط وتوزيع الصلاحيات لموديول **لوحة التحكم التشغيلية وقالب بيئة العمل (App Shell)** في منصة Nebras ERP.

---

## 1. الهيكل المعماري (Architecture)

يتكون الموديول من قالب رئيسي خارجي (Layout) يلتف حول كامل صفحات التطبيق ويتحكم بالوصول والتصفية:

```mermaid
graph TD
    AppShell[App Shell: DashboardLayoutComponent] -->|يحتوي| Header[Top Header: Tenant, User, Search, Alerts]
    AppShell -->|يحتوي| Sidebar[Left Sidebar: Nested Dynamic Tree]
    AppShell -->|يعرض| RouterOutlet[Main Workspace View]
    RouterOutlet -->|يحمل كـ Lazy| Dashboard[ERPDashboardComponent]
```

---

## 2. شجرة التنقل وتوزيع الصلاحيات (Navigation Tree & RBAC)

يتم تصفية القوائم الجانبية تلقائياً بناءً على أدوار وصلاحيات المستخدم:

| الموديول | الرابط | الصلاحية المطلوبة | الحالة في المنصة |
| :--- | :--- | :--- | :--- |
| **الرئيسية** | `/dashboard` | مسموح للجميع | مفعل (نشط) |
| **القبول والتسجيل** | `/admissions/applicants` | `admissions.view` | مفعل (نشط) |
| **شؤون الطلاب** | `/students/list` | `students.view` | مفعل (نشط) |
| **الهيكل التنظيمي** | `/organization/overview` | `organization.view` | مفعل (نشط) |
| **الهيكل الأكاديمي** | `/academics/years` | `academics.view` | مفعل (نشط) |
| **إدارة المعلمين** | `/teachers/*` | `teachers.view` | * Coming Soon (قريباً)* |
| **الشؤون المالية** | `/finance/*` | `finance.view` | * Coming Soon (قريباً)* |
| **الموارد البشرية** | `/hr/*` | `hr.view` | * Coming Soon (قريباً)* |

---

## 3. واجهات الـ API المربوطة (API Endpoints)

- **بيانات وإحصائيات لوحة التحكم**: `GET /api/v1/platform/erp-dashboard/`
  - تعود ببيانات حقيقية من قاعدة البيانات حول إجمالي الطلاب والمتقدمين والفروع وآخر العمليات الأمنية والتنبيهات.

</div>