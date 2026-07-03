# دليل المساهمة والعمل البرمجي (CONTRIBUTING.md) - Nebras ERP

يرسم هذا الدليل القواعد الفنية المعتمدة للمساهمة وتقديم التعديلات والمهام البرمجية في المنصة.

---

## 1. قواعد تسمية الفروع (Git Branch Naming)

يجب الالتزام بالتسميات التالية عند إنشاء فرع جديد:

- للميزات الجديدة: `feature/[app-name]-[short-description]` (مثال: `feature/admissions-application-model`).
- لإصلاح الأخطاء: `bugfix/[app-name]-[issue-id]` (مثال: `bugfix/identity-login-failed`).
- للتحسينات: `refactor/[module-name]-[description]`.

---

## 2. قواعد كتابة رسائل الـ Commit (Commit Message Standards)

يجب كتابة الرسائل بصيغة واضحة ومباشرة باللغة الإنجليزية كالتالي:

- `feat(identity): add device tracking and session support`
- `fix(academics): resolve academic year overlap query validation`
- `docs(readme): update environment setup instructions`

---

## 3. مراجعة الكود وجدول الدمج (Pull Requests & Code Review)

- لا يمكن دمج أي كود في فرع `develop` دون الحصول على مراجعة واعتماد (Approve) من مطورين اثنين على الأقل.
- يجب التأكد من مرور كافة الاختبارات البرمجية التلقائية (CI Pipeline) بنجاح وخلو الكود من أخطاء الـ Linter.