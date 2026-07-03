<div dir="rtl">

# وثائق وحدة إدارة الحضور والغياب وتتبع الوقت
## Nebras ERP — Attendance & Time Management Module

---

## نظرة عامة

وحدة إدارة الحضور والغياب وتتبع الوقت هي جزء أساسي من منظومة **نبراس ERP**.

تدير هذه الوحدة دورة الحضور الكاملة للموظفين والمعلمين، بما في ذلك:

- تسجيل الحضور والانصراف (Check-in / Check-out)
- تتبع التأخير والغياب
- نوبات العمل (المناوبات الصباحية والمسائية ورمضان)
- سياسات الحضور المرنة
- طلبات تصحيح الحضور
- نقاط التوسع (الأوقات الإضافية، البصمة البيومترية، حضور الطلاب)

---

## البنية المعمارية

```
apps/
    attendance/
        domain/
            models.py          ← النماذج الأساسية
        application/
            services.py        ← خدمات المنطق التجاري
        infrastructure/        ← تكاملات مستقبلية
        interfaces/
            serializers.py     ← محولات REST API
            views.py           ← واجهات ViewSet
            urls.py            ← مسارات API
        tests/
            test_models.py     ← اختبارات النماذج
            test_api.py        ← اختبارات API
        docs/
            README.md          ← هذا الملف
        migrations/
```

---

## النماذج الأساسية

### 1. AttendancePolicy — سياسة الحضور

| الحقل | النوع | الوصف |
|-------|-------|-------|
| `name` | CharField | اسم السياسة |
| `grace_period_minutes` | IntegerField | فترة السماح (افتراضي: 15 دقيقة) |
| `half_day_late_minutes` | IntegerField | حد التأخير لنصف يوم (افتراضي: 120 دقيقة) |
| `is_active` | BooleanField | الحالة |

### 2. WorkShift — نوبة العمل

| الحقل | النوع | الوصف |
|-------|-------|-------|
| `name` | CharField | اسم النوبة |
| `start_time` | TimeField | وقت البدء |
| `end_time` | TimeField | وقت الانتهاء |
| `break_start` | TimeField | بداية الاستراحة (اختياري) |
| `break_end` | TimeField | نهاية الاستراحة (اختياري) |
| `is_ramadan_shift` | BooleanField | هل هي مناوبة رمضان؟ |

### 3. AttendanceRecord — سجل الحضور

| الحقل | النوع | الوصف |
|-------|-------|-------|
| `employee` | FK → Employee | الموظف |
| `date` | DateField | التاريخ |
| `check_in` | TimeField | وقت الحضور |
| `check_out` | TimeField | وقت الانصراف |
| `status` | CharField | الحالة (present, absent, late, leave) |
| `late_minutes` | IntegerField | دقائق التأخير |
| `overtime_minutes` | IntegerField | دقائق العمل الإضافي |

### 4. CorrectionRequest — طلب تصحيح

| الحقل | النوع | الوصف |
|-------|-------|-------|
| `employee` | FK → Employee | الموظف |
| `date` | DateField | التاريخ |
| `requested_check_in` | TimeField | وقت الحضور المطلوب |
| `requested_check_out` | TimeField | وقت الانصراف المطلوب |
| `reason` | TextField | سبب التصحيح |
| `status` | CharField | الحالة (pending, approved, rejected) |

---

## واجهات API

| المسار | الطريقة | الوصف |
|--------|---------|-------|
| `/api/v1/attendance/records/` | GET, POST | قائمة/إنشاء سجلات الحضور |
| `/api/v1/attendance/records/{id}/` | GET, PUT, DELETE | تفاصيل/تعديل/حذف سجل |
| `/api/v1/attendance/records/check-in/` | POST | تسجيل حضور سريع |
| `/api/v1/attendance/policies/` | GET, POST | قائمة/إنشاء سياسات الحضور |
| `/api/v1/attendance/shifts/` | GET, POST | قائمة/إنشاء نوبات العمل |
| `/api/v1/attendance/corrections/` | GET, POST | قائمة/إنشاء طلبات التصحيح |

---

## التكاملات

| الوحدة | نوع التكامل |
|--------|-------------|
| Employee Core | FK مباشر — ربط الحضور بالموظف |
| HR | نقطة توسع — إجراءات تأديبية |
| Payroll | نقطة توسع — حساب خصومات التأخير/الغياب |
| Faculty | نقطة توسع — حضور المعلمين |
| Dashboard | واجهة أمامية — إحصائيات الحضور اليومية |

---

## خدمات المنطق التجاري

- `check_in_employee()` — تسجيل حضور موظف
- `check_out_employee()` — تسجيل انصراف موظف
- `calculate_late_minutes()` — حساب دقائق التأخير
- `calculate_overtime()` — حساب الوقت الإضافي
- `daily_summary()` — ملخص الحضور اليومي لمنشأة

---

## الاختبارات

| ملف الاختبار | عدد الاختبارات | الحالة |
|-------------|---------------|--------|
| `test_models.py` | 12 اختبار | ✅ ناجح |
| `test_api.py` | 4 اختبارات | ✅ ناجح |
| **المجموع** | **16 اختبار** | **✅ ناجح بالكامل** |

---

## نقاط التوسع المستقبلية

- [ ] حضور الطلاب (Student Attendance)
- [ ] تكامل البصمة البيومترية (Biometric Integration)
- [ ] تكامل الجدول الدراسي (Timetable)
- [ ] التحكم في الوصول (Access Control)
- [ ] تحليلات الذكاء الاصطناعي (AI Analytics)
- [ ] إشعارات فورية (Real-time Notifications)

</div>