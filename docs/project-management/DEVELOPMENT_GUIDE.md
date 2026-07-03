# دليل التطوير وإعداد البيئات (DEVELOPMENT_GUIDE.md) - Nebras ERP

يوضح هذا الدليل الخطوات اللازمة لتجهيز بيئة التطوير المحلية وتشغيل المنصة للباك إند والفرونت إند.

---

## 1. تجهيز بيئة الباك إند (Backend Setup)

### المتطلبات الأساسية:
- Python 3.13
- PostgreSQL 17
- Redis

### خطوات التشغيل:
1. انتقل للمجلد `backend/`:
   ```bash
   cd backend
   ```
2. قم بإنشاء بيئة وهمية وتفعيلها:
   ```bash
   python -m venv venv
   .\venv\Scripts\Activate.ps1 # لبيئة ويندوز
   ```
3. قم بتثبيت المكتبات المطلوبة:
   ```bash
   pip install -r requirements.txt
   ```
4. قم بتشغيل الهجرات وخادم التطوير:
   ```bash
   python manage.py migrate
   python manage.py runserver
   ```

---

## 2. تجهيز بيئة الفرونت إند (Frontend Setup)

### المتطلبات:
- Node.js (إصدار 20 فما فوق)
- Angular CLI

### خطوات التشغيل:
1. انتقل للمجلد `frontend/`:
   ```bash
   cd frontend
   ```
2. ثبت الاعتمادات:
   ```bash
   npm install
   ```
3. ابدأ خادم التطوير المحلي:
   ```bash
   npm run start
   ```
   سيكون التطبيق متاحاً على الرابط `http://localhost:4200/`.