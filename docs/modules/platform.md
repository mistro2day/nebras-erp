<div dir="rtl">

# موديول نواة المنصة والبنية التحتية المشتركة (Platform Kernel)

يوثق هذا الملف الهيكل المعماري والمسؤوليات الفنية والربط لموديول **نواة المنصة (Platform Kernel)** في منصة Nebras ERP.

---

## 1. المعمارية الفنية (Architecture)
يُعد موديول `platform` المشترك هو بمثابة نواة البنية التحتية (Infrastructure Shared Kernel) لجميع موديولات النظام، ويوفر الطبقات الخدمية التالية:
- **Event Bus (ناقل الأحداث)**: التوزيع المتزامن واللامتزامن لأحداث النطاق والتطبيق مع تسجيلها التاريخي.
- **Notification Center (مركز التنبيهات)**: بوابة موحدة لإرسال الإشعارات (البريد الإلكتروني، واتساب، التنبيهات الفورية).
- **Audit Engine (محرك التدقيق)**: لتسجيل العمليات التشغيلية وتتبع التغيرات في السجلات.
- **File Storage Service (تخزين الملفات)**: للرفع الآمن للملفات والتحقق من الـ SHA256 Checksum وصيغة الملفات.

---

## 2. مخطط الكيانات والعلاقات (ER Diagram)

```mermaid
erDiagram
    SystemConfiguration {
        uuid id PK
        string config_key UK
        json config_value
        string config_type
        uuid tenant_id
    }
    AuditLog {
        uuid id PK
        uuid user_id
        string action
        string entity_name
        json old_values
        json new_values
        string severity
        uuid tenant_id
    }
    Notification {
        uuid id PK
        uuid recipient_id
        string channel
        string title
        text body
        string status
        uuid tenant_id
    }
    AttachmentMetadata {
        uuid id PK
        uuid file_asset_id
        string file_name
        bigint file_size
        string storage_provider
        string checksum
        uuid tenant_id
    }
    EventLog {
        uuid id PK
        uuid event_id
        string event_name
        json payload
        uuid correlation_id
        string status
        uuid tenant_id
    }
```

---

## 3. مسار وتدفق الأحداث (Event Flow Sequence Diagram)

```mermaid
sequenceDiagram
    participant App as Business App
    participant Bus as Platform Event Bus
    participant DB as DB Event Log
    participant Celery as Celery Queue
    participant Subscriber as Subscriber Handler

    App->>Bus: publish(event_name, payload, tenant_id)
    Bus->>DB: create EventLog (published)
    Bus->>Celery: dispatch_event_task.delay(event_id)
    Celery->>Subscriber: execute handler(payload, tenant_id)
    Subscriber-->>Bus: execution success
    Bus->>DB: update status to (processed)
```

---

## 4. واجهات البرمجة (API Documentation)

- **فحص صحة النظام**: `GET /api/v1/platform/health/`
  - يعود بتقرير صحة قاعدة البيانات، الكاش، والتخزين.
- **البحث الموحد**: `GET /api/v1/platform/search/?q={query}`
  - يبحث في الكيانات الرئيسية (الطلاب، المتقدمين).
- **رفع الملفات**: `POST /api/v1/platform/storage/upload/`
  - يرفع الملف ويحسب الـ Checksum ويعيد المعرف الفريد للتخزين.
- **تحديث الإعدادات**: `POST /api/v1/platform/configurations/set-value/`
  - يحفظ أو يعدل الإعدادات الخاصة بالنظام أو المستأجرين.

</div>