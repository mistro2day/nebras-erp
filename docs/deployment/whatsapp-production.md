# نشر الواتساب في الإنتاج — Hostinger (خطة تنفيذ)

> **الحالة:** مقترح معتمد للتنفيذ لاحقاً. يوثّق هذا الملف قرارات ومعمارية تشغيل قناة الواتساب على السيرفر النهائي في Hostinger.
> **مرتبط بـ:** [ADR-008 القوالب الموحّدة](../DECISIONS.md) · [موديول الاتصالات](../admissions.md) · تكامل Evolution API v2.

---

## 0) القرار الحاسم: خطة الاستضافة

| الخطة | تصلح للواتساب؟ | السبب |
|------|:---:|------|
| Shared / Premium / Business Hosting | ❌ لا | لا تدعم Docker ولا عمليات دائمة (Node/Python daemon). Evolution وBaileys يحتاجان جلسة WebSocket حيّة 24/7 |
| **VPS (KVM)** | ✅ إلزامي | root كامل + Docker + عمليات دائمة + منافذ مخصصة |
| Cloud Hosting | ⚠️ محدود | بيئة مُدارة — يُتجنّب لهذه الحالة |

**التوصية:** Hostinger **VPS KVM 2** كحدّ أدنى (2 vCPU / 8GB RAM). يشغّل: Evolution API + PostgreSQL + Redis + Django + Nginx + بناء Angular. KVM 4 أريح.

---

## 1) مسارات تشغيل الواتساب (اختيار واحد)

### المسار A — استضافة Evolution API ذاتياً (الوضع الحالي)
- **الآلية:** Baileys (واتساب ويب غير رسمي) + شريحة عادية + كود QR.
- ✅ مجاني، بلا رسوم لكل رسالة، يعمل بأي رقم، **جاهز فعلاً في المشروع**.
- ❌ غير رسمي → خطر حظر الرقم عند الإرسال الجماعي/المزعج؛ الجلسة قد تنقطع وتحتاج إعادة مسح QR.
- **الأنسب للإطلاق السريع** مع الضوابط (قسم 4).

### المسار B — WhatsApp Cloud API الرسمي (Meta)
- **الآلية:** API رسمي عبر رقم أعمال موثّق (Business verification).
- ✅ رسمي، موثوق، لا يُحظر، دعم رسمي للقوالب والوسائط والويبهوك.
- ❌ يحتاج توثيق أعمال Meta + حساب Facebook Business + رقم مخصص، ورسوم لكل محادثة (أول ~1000 محادثة/شهر مجانية). التوثيق قد يكون صعباً في السودان.
- **الأنسب للاستقرار النهائي** إن توفّر التوثيق.

### المسار C — مزوّد BSP وسيط (Twilio / 360dialog / Wati)
- Cloud API رسمي عبر وسيط يبسّط التوثيق والإعداد.
- ✅ أسهل توثيق ودعم ولوحة تحكم. ❌ الأغلى + اشتراك شهري.

**الخطة المعتمدة:** الإطلاق بالمسار **A** (جاهز)، مع تصميم الكود ليكون **قابلاً للتبديل** إلى B لاحقاً عبر طبقة مزوّد واحدة بالخلفية (قسم 3 + مهمة 4).

---

## 2) 🔴 إصلاح أمني إلزامي قبل الإنتاج

**المشكلة الحالية:** الواجهة (المتصفح) تنادي Evolution API مباشرة و`apikey` مكتوب داخل كود JavaScript (`evoApiKey` في `communications.service.ts`). أي مستخدم يفتح Developer Tools يراه ويرسل رسائل باسم المدرسة.

**الحل:** نقل كل نداءات الواتساب إلى الخلفية (Django):
```
المتصفح → Django (/api/v1/communications/whatsapp/*) → Evolution API (داخلي)
```
- الواجهة تُرسل عبر الخلفية فقط، **بلا apikey في المتصفح**.
- `apikey` وعنوان Evolution في **متغيرات بيئة الخادم** (`.env`) لا في الكود.
- Evolution يُربط على شبكة Docker داخلية (`expose` لا `ports`) → غير مكشوف على الإنترنت.

**التأثير على الكود الحالي:**
- `communications.service.ts`: تحويل `/whatsapp-api/*` (بروكسي المتصفح) → استدعاء endpoint خلفي جديد.
- `proxy.conf.json`: حذف بلوك `/whatsapp-api` من الإنتاج (يبقى للتطوير المحلي فقط).
- backend: endpoints جديدة `whatsapp/send`, `whatsapp/status`, `whatsapp/qr` تُنفّذ نداء Evolution خادم-لخادم.

---

## 3) المعمارية على Hostinger VPS

```
Internet  (443 HTTPS فقط)
   ▼
Nginx (reverse proxy + Let's Encrypt SSL)
   ├── erp.yourschool.com   → Angular (ملفات ثابتة مبنية)
   ├── api.yourschool.com   → Django (Gunicorn :8000)
   └── (لا منفذ عام لـ Evolution)
        │  شبكة Docker خاصة
        ▼
   Docker Compose:
     ├── evolution-api  (expose 8080 داخلياً فقط)
     ├── postgres       (قاعدة النظام + جلسات Baileys)
     └── redis          (طابور Evolution)
```

**docker-compose.prod.yml (هيكل مبدئي):**
```yaml
services:
  evolution-api:
    image: evoapicloud/evolution-api:v2.3.7
    restart: always
    expose: ["8080"]          # داخلي فقط — لا ports:
    environment:
      - AUTHENTICATION_API_KEY=${EVO_API_KEY}
      - DATABASE_PROVIDER=postgresql
      - DATABASE_CONNECTION_URI=postgresql://user:pass@postgres:5432/nebras
      - CACHE_REDIS_ENABLED=true
      - CACHE_REDIS_URI=redis://redis:6379
    depends_on: [postgres, redis]

  postgres:
    image: postgres:17
    restart: always
    volumes: [pgdata:/var/lib/postgresql/data]
    environment:
      - POSTGRES_DB=nebras
      - POSTGRES_PASSWORD=${DB_PASSWORD}

  redis:
    image: redis:7
    restart: always

volumes:
  pgdata:
```
- `restart: always` → يعود بعد إعادة تشغيل الخادم.
- الجلسة محفوظة في Postgres (`baileys_sessions`) → **لا حاجة لإعادة مسح QR** بعد إعادة التشغيل.
- الإنستنس المعتمد: `nebras-khartoum-instance`.

---

## 4) الموثوقية والصيانة (خاصة بالمسار A)

1. **بقاء الرقم متصلاً:** رقم مخصص للمدرسة على جهاز لا يُسجَّل خروجه؛ حفظ الجلسة مُفعّل.
2. **تجنّب الحظر:** لا إرسال جماعي دفعة واحدة — **طابور بمهلة** بين الرسائل (Evolution + Redis)، ومحتوى قوالب معتمدة فقط ([ADR-008](../DECISIONS.md)).
3. **Webhooks:** ربط Evolution بويبهوك على الخلفية لاستقبال حالات **تم التسليم/قُرئت** وتحديث «سجل حركة الرسائل الفورية» تلقائياً (بدل `PENDING` الثابت). المسار المقترح: `POST /api/v1/communications/webhooks/evolution/`.
4. **المراقبة:** `docker healthcheck` + فحص `connectionState` دوري (المنطق موجود في `testProviderConnection`) + تنبيه عند انقطاع الجلسة.
5. **النسخ الاحتياطي:** نسخ Postgres يومياً (يحوي جلسة الواتساب + بيانات النظام).
6. **HTTPS إلزامي:** الويبهوك وواتساب يتطلبان روابط https صالحة.

---

## 5) خطوات النشر العملية

1. اطلب VPS KVM 2، قالب **Ubuntu 22.04 + Docker** (متوفّر بنقرة في Hostinger).
2. نطاقان فرعيان `erp.` و`api.` موجّهان لـ IP الخادم (DNS في Hostinger).
3. ثبّت Nginx + Certbot (SSL مجاني من Let's Encrypt).
4. `docker compose -f docker-compose.prod.yml up -d` لـ Evolution + Postgres + Redis.
5. انشر Django عبر Gunicorn + systemd؛ ابْنِ Angular (`ng build`) وقدّمه عبر Nginx.
6. امسح QR **مرة واحدة** لربط الرقم (تُحفظ الجلسة في Postgres).
7. نفّذ الإصلاح الأمني (قسم 2): تحويل مسار الواتساب للخلفية.

---

## 6) قائمة مهام التنفيذ (لاحقاً)

- [ ] **(أولوية 1)** نقل نداءات الواتساب إلى الخلفية وإخفاء `apikey` — شرط إنتاج.
- [ ] كتابة `docker-compose.prod.yml` + `nginx.conf` الفعليّين في `deploy/`.
- [ ] Webhook تحديث حالات التسليم/القراءة في السجل تلقائياً.
- [ ] طبقة مزوّد قابلة للتبديل (Evolution ↔ Cloud API) لتسهيل الترقية للمسار B.
- [ ] سكربت نسخ احتياطي يومي لـ Postgres.
- [ ] توثيق متغيرات البيئة المطلوبة (`EVO_API_KEY`, `DB_PASSWORD`, `EVO_INSTANCE`...).

---

## 7) ملاحظات مرجعية من التنفيذ الحالي

- Evolution API v2.3.7 على `localhost:8080` (تطوير) عبر بروكسي `/whatsapp-api`.
- المسارات: إرسال `POST /message/sendText/{instance}` بجسم `{number, text}` + ترويسة `apikey`؛ الحالة `GET /instance/connectionState/{instance}`؛ QR `GET /instance/connect/{instance}`.
- توثيق الرسائل الخارجية في السجل عبر `POST /api/v1/communications/messages/log-external/`.
- تطبيع رقم الواتساب إلى E.164 مطبّق في الواجهة والخلفية (`Guardian.whatsapp_phone`).
