# موديول فوترة المنصّة والاشتراكات (SaaS Billing & Multi‑Tenancy)

> **التاريخ:** 28 يوليو 2026
> **النطاق:** فوترة نبراس نفسها كمنصّة SaaS — اشتراكات المدارس المستأجِرة، لا رسوم الطلاب (تلك في `student_finance`).
> **التطبيق:** `backend/apps/saas_billing` · الواجهة: `frontend/src/app/features/saas-billing` و`features/public-site` و`features/platform/tenants`.

---

## 1. الفكرة والتمييز

نبراس منصّة متعدّدة المستأجرين: كل مدرسة = مستأجر (`Tenant`) له نطاق فرعي. هذا الموديول يدير **اشتراك كل مدرسة في نبراس** (خطط، فواتير، مدفوعات) — وهو شأن **مالك المنصّة** لا المستأجر.

| المفهوم | المصدر |
| --- | --- |
| فوترة اشتراك المدرسة في نبراس | `saas_billing` (هذا الموديول) |
| فوترة رسوم الطلاب داخل المدرسة | `student_finance` |

**نقطة معمارية جوهرية:** الموديول **عابر للمستأجرين** — لا يستخدم `CombinedSharedModel` ولا `BaseCRUDViewSet` (اللذين يعزلان البيانات لكل مستأجر). النماذج تحمل `tenant` كموضوع للفاتورة، والـ ViewSets عادية تُظهر كل المستأجرين لمالك المنصّة.

---

## 2. المعمارية: ثلاثة أسطح (Surfaces)

```
nebras.com / www        →  الموقع العام (تسويقي، بلا مصادقة)      surface = public
admin.nebras.com        →  لوحة المالك (إدارة المستأجرين+الفوترة)  surface = admin
al-mawrid.nebras.com    →  لوحة المدرسة (النظام الحالي)            surface = tenant
```

**حلّ السطح في الواجهة:** `TenantService.resolveSurface(hostname)` عند الإقلاع يستخرج السطح والنطاق الفرعي من `window.location.hostname`:
- نطاق جذر أو `www` → `public`.
- `admin` → `admin`.
- نطاق فرعي لمدرسة → `tenant` + يجلب المستأجر من `tenants/branding/current/` (يحلّه الميدلوير من Host).
- `localhost` / `*.onrender.com` / IP → مدرسة واحدة افتراضية (تطوير)، مع `isDevHost = true`.

**حلّ المستأجر في الخادم:** `apps/tenants/middleware.py` (كان موجوداً) يحلّ المستأجر من الـsubdomain في `Host`، ويحجز `www/api/admin`. وحُدّثت نقطة `tenants/branding/current` لتعطي الأولوية للمستأجر الذي حلّه الميدلوير.

**عزل منطقة المالك:** عنصر القائمة «منصة النظام (المالك)» موسوم `ownerOnly` ويُخفى داخل لوحة المستأجر؛ و`ownerSurfaceGuard` يمنع الوصول لمسارات `/platform` و`/saas-billing` إلا على سطح admin (أو التطوير المحلّي).

---

## 3. النماذج (Domain Models)

الجداول ببادئة `saas_`:

| النموذج | الجدول | الوصف |
| --- | --- | --- |
| `SubscriptionPlan` | `saas_subscription_plans` | خطة عامّة (بلا tenant): سعر، دورة، حدود (طلاب/موظفون/فروع)، وحدات، is_public |
| `TenantSubscription` | `saas_tenant_subscriptions` | اشتراك مستأجر: الحالة (trial/active/past_due/suspended/canceled/expired)، حدود الدورة |
| `Invoice` + `InvoiceLineItem` | `saas_invoices` / `saas_invoice_line_items` | فاتورة اشتراك + بنودها؛ حالات draft/open/paid/overdue/void |
| `Payment` | `saas_payments` | دفعة مرحّلة على فاتورة |
| `PaymentSubmission` | `saas_payment_submissions` | طلب سداد ذاتي (تحويل بنكي + إيصال) بحالة pending/approved/rejected |
| `TenantSignupRequest` | `saas_tenant_signup_requests` | طلب انضمام مدرسة عبر الموقع العام (لا يُنشئ مستأجراً حتى الاعتماد) |

---

## 4. الخدمات (`application/services.py` و`limits.py`)

- **الفوترة:** `create_subscription`, `generate_invoice_for_subscription`, `record_payment` (يحدّث الحالة ويفعّل الاشتراك), `recalc_invoice_totals`, `sync_overdue_invoices`.
- **المؤشرات:** `compute_metrics` → MRR (سعر الخطة مطبّعاً لـ30 يوماً)، المستحقّات، المحصّل، الفواتير المتأخرة.
- **دورة الفوترة التلقائية:** `run_billing_cycle` (منسّق يومي) = متأخرات → `renew_due_subscriptions` (تجديد الدورة + فاتورة تجديد) → `enforce_delinquency` (متأخر السداد ≥ يوم، إيقاف ≥ 30 يوماً).
- **السداد الذاتي:** `submit_payment_request`, `approve_payment_submission` (يولّد دفعة), `reject_payment_submission`.
- **التسجيل الذاتي:** `normalize_subdomain`, `subdomain_available`, `create_signup_request`, `approve_signup_request` (يُنشئ `Tenant` + اشتراك تجريبي 14 يوماً), `reject_signup_request`.
- **حدود الخطة (`limits.py`):** `get_usage`, `ensure_can_add(tenant, resource)` (طلاب/موظفون/فروع)، `module_allowed`. القاعدتان: **الحدّ 0 = بلا حدّ**، **بلا خطة = غير مُقيَّد**.

---

## 5. تطبيق حدود الخطة (نقاط المنع الفعلي)

يُستدعى `ensure_can_add` عند الإنشاء ويرفع رسالة عربية عند التجاوز:
- **الطلاب:** `StudentApplicationService._enforce_student_limit` (يدوي + من متقدّم).
- **الفروع:** `BranchViewSet.perform_create`.
- **الموظفون:** `EmployeeViewSet.create`.

---

## 6. واجهات REST (`/api/v1/saas-billing/`)

| المسار | الصلاحية | الغرض |
| --- | --- | --- |
| `plans/` | مصادَق | CRUD الخطط |
| `plans/public/` | **عام** | باقات الموقع التسويقي |
| `subscriptions/` (+`provision`/`generate_invoice`/`cancel`) | مصادَق | اشتراكات المستأجرين |
| `invoices/` (+`record_payment`/`submit_payment`) | مصادَق/عام للسداد | الفواتير |
| `payment-submissions/` (+`approve`/`reject`) | مصادَق | مراجعة السداد الذاتي |
| `signup-requests/` (+`check_subdomain`/`approve`/`reject`) | إنشاء+فحص عامّان، المراجعة مصادَقة | طلبات الانضمام |
| `dashboard/` (+`run_cycle`/`usage`) | مصادَق | المؤشرات + تشغيل الدورة + الاستخدام |

**Celery:** مهمة `apps.saas_billing.tasks.run_billing_cycle` مجدولة يوميّاً 02:00 (`CELERY_BEAT_SCHEDULE`). أمر إدارة: `python manage.py run_billing_cycle [--date YYYY-MM-DD]`.

---

## 7. الواجهة الأمامية

- **لوحة الفوترة** (`/saas-billing`): تبويبات نظرة عامة (KPIs + رسم توزيع متحرك + لوحة الاستخدام مقابل الحدود + زر تشغيل الدورة)، الخطط، الاشتراكات، الفواتير، طلبات السداد (بشارة المعلّق).
- **إدارة المستأجرين** (`/platform/tenants`): قائمة المدارس + حالة اشتراك كلٍّ + إنشاء/تعديل + تفعيل اشتراك، وتبويب «طلبات الانضمام» (اعتماد يُنشئ المستأجر).
- **الموقع العام** (`/nebras`): بطل + مزايا + باقات حيّة + نموذج «اطلب المنصّة» مع فحص توفّر النطاق حيّاً.

---

## 8. البذر والاختبار

- بذر: `backend/seed_saas_billing.py` — 3 خطط (starter/growth/enterprise) + اشتراك وفاتورة لكل مستأجر نشط.
- **مفسّر بايثون:** المشروع يعمل بـ `C:\Program Files\Python313\python.exe` (به django 5.1 + requests)، لا بـ venv.
- اختبار محلّي: على `localhost` كل الشاشات متاحة بالمسار المباشر (`/nebras`, `/saas-billing`, `/platform/tenants`). اختبار الأسطح بالنطاقات الفرعية يحتاج `lvh.me` + بروكسي Angular ليصل الـAPI من نفس النطاق الفرعي.

---

## 9. متطلّبات النشر (خارج الكود)

- سجلّ DNS بديل `*.nebras.com`.
- شهادة SSL wildcard (`*.nebras.com`).
- تحديث `TENANT_PLATFORM_HOST_SUFFIXES` بالنطاق الحقيقي بدل `.onrender.com`.

---

## 10. تحذير أمني

`.mcp.json` (محلّي، غير متعقّب) كان يحوي مفتاح Google API صريحاً — أُخرج من التتبّع وحُوّل لمتغيّر بيئة. يُنصح بتدوير المفتاح القديم.
