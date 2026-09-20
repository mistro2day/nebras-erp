# توثيق نشر المنظومة على سحابة أمازون (AWS Deployment Guide)

يوثق هذا المستند بنية وطريقة نشر منظومة **نبراس ERP (Nebras ERP)** بنجاح على البنية التحتية السحابية لشركة أمازون (AWS).

---

## 1. المعمارية السحابية (Cloud Architecture)

تعتمد المنظومة بنية سحابية مدمجة وعالية الكفاءة تجمع بين الحوسبة الافتراضية وقواعد البيانات المدارة ووسائط المهام المؤقتة:

```mermaid
flowchart TD
    Internet["الإنترنت / المستخدمون"] -->|HTTP / HTTPS| EC2["خادم AWS EC2 (Amazon Linux)"]
    subgraph EC2_Server["بيئة خادم EC2 المدمجة"]
        Nginx["بوابة Nginx العكسية (Port 80/443)"]
        Nginx -->|الواجهة الأمامية| FrontendDist["حزمة Angular المبنية مسبقاً"]
        Nginx -->|المسارات الخلفية /api/ و /admin/| BackendGunicorn["Django 5.0 + Gunicorn (Port 8000)"]
        Nginx -->|الوسائط والملفات الثابتة| StaticMedia["Static & Media Volumes"]
        BackendGunicorn --> Redis["Redis 7 (Broker & Caching)"]
    end
    BackendGunicorn -->|اتصال مشفر SSL| RDS[("قاعدة بيانات AWS RDS PostgreSQL 17")]
```

---

## 2. المكونات والخدمات المفعّلة

1. **الخادم الرئيسي (AWS EC2 Instance)**:
   - نظام التشغيل: Amazon Linux 2023.
   - ذاكرة رام افتراضية مدعومة بذاكرة تبادل (2GB Swap File) لضمان الاستقرار وعدم توقف المعالج.
   - محرك الحاويات: Docker + Docker Compose + Docker Buildx.

2. **قاعدة البيانات المدارة (AWS RDS PostgreSQL 17)**:
   - المحرك: PostgreSQL 17 على مواصفات `db.t4g.micro`.
   - اسم قاعدة البيانات: `nebras_db`.
   - التشفير: اتصال آمن ومشفر عبر `sslmode=require`.
   - تم ترحيل واستيراد كافة بيانات النظام السابقة (الجداول، الطلاب، الحسابات، الإعدادات) بنجاح واكتمال 100%.

3. **الواجهة الأمامية (Angular 20 Frontend)**:
   - مبنية بوضعية الإنتاج التام (`build:prod`) بتقنيات التجزئة والتصغير والتجميع التلقائي.
   - خفيفة وسريعة التقديم عبر Nginx دون استهلاك موارد المعالج في السيرفر.

4. **الواجهة الخلفية (Django Backend & Gunicorn)**:
   - خادم WSGI متعدد العمال (`workers 3`).
   - تنفيذ تلقائي لعمليات `collectstatic` و `migrate` عند الإقلاع.
   - ترقية الإعدادات لدعم IP السيرفر وتفادي تعارضات CORS أو المضيفين المسموح بهم.

---

## 3. الأوامر القياسية للإدارة والتحديث

### إعادة تشغيل المنظومة:
```bash
cd ~/nebras-erp/docker
sudo docker compose restart
```

### متابعة سجلات النظام الحية (Logs):
```bash
sudo docker compose logs -f backend
sudo docker compose logs -f nginx
```

### تحديث المنظومة بعد أي تعديلات جديدة في الكود:
```bash
cd ~/nebras-erp
git pull origin master
cd docker
sudo docker compose up -d --build
```

---

## 4. إعداد النطاق المجاني وشهادة الأمان (Domain & SSL Setup)

تم ربط المنظومة بالنطاق السحابي المجاني:
**`nebraserp.duckdns.org`** -> `142.154.53.91`

### أ) سكريبت التحديث التلقائي للـ IP (Cron Job على سيرفر AWS):
لضمان تحديث الـ IP تلقائياً إذا تغير عنوان السيرفر:
```bash
mkdir -p ~/duckdns
cat << 'EOF' > ~/duckdns/duck.sh
echo url="https://www.duckdns.org/update?domains=nebraserp&token=YOUR_DUCKDNS_TOKEN&ip=" | curl -k -o ~/duckdns/duck.log -K -
EOF
chmod 700 ~/duckdns/duck.sh
```
ثم إضافة مهمة مجدولة عبر `crontab -e`:
```bash
*/15 * * * * ~/duckdns/duck.sh >/dev/null 2>&1
```

### ب) استخراج شهادة SSL/HTTPS المجانية (Certbot):
```bash
sudo dnf install certbot python3-certbot-nginx -y
sudo certbot --nginx -d nebraserp.duckdns.org
```
تقوم الأداة بتهيئة شهادة Let's Encrypt وتجديدها تلقائياً.

