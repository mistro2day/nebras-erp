# Project Instructions

## Default Frontend Skill
For all frontend UI tasks — including building pages, components, layouts, choosing colors/fonts/styles, UX reviews, dashboards, landing pages, and implementation best practices — **always use the `ui-ux-pro-max` skill automatically** without being explicitly told each time.

## Nebras OS UI & UX Rules
- **STRICT PROHIBITION OF BROWSER DIALOGS**: Never use native browser dialogs (`alert()`, `prompt()`, `confirm()`). All alerts, confirmations, inputs, and popups MUST use Nebras OS custom styled modal popups (`<div class="modal-backdrop">...</div>` or Nebras OS modal components) adhering to the Nebras OS design system for a premium user experience.
- **MANDATORY MULTI-STEP CREATION WIZARD PATTERN (نظام الخطوات الإلزامي لكافة أزرار ونوافذ الإنشاء)**:
  Whenever creating or modifying any entity or module creation flow across Nebras ERP (e.g. Invoices, Receipts, Billing Accounts, Journals, Vouchers, Purchase Orders, Requests, Contracts, etc.), it is **STRICTLY MANDATORY** to implement the Nebras OS Multi-Step Wizard Modal pattern:
  1. Use `<nb-modal>` with clear title and descriptive subtitle.
  2. Use `<nb-stepper [steps]="steps" [current]="currentStep() + 1"></nb-stepper>`.
  3. Form inputs MUST use Nebras components: `<nb-datepicker>` for dates, and `<nb-searchable-select>` for searchable account/student/vendor dropdowns. Native `<input type="date">` and unsearchable huge `<select>` tags are strictly prohibited.
  4. The pre-final step MUST ALWAYS be a comprehensive Review & Confirmation step (المراجعة والتأكيد) presenting key details and Sudanese currency formatting (`ج.س` with Arabic tafqeet) with clear confirm button before final persistence.
  5. **MANDATORY IN-MODAL FINAL SUCCESS & PRINT STEP (الخطوة الأخيرة الإلزامية لاكتمال التسجيل والاعتماد والطباعة)**:
     Never close creation wizards abruptly upon submission or rely on background toast messages. The wizard MUST ALWAYS conclude with a dedicated final Success & Completion step (`اكتمال السند والاعتماد` / `اكتمال التسجيل والاعتماد`) displayed inside the modal itself:
     a. An animated success badge & clear congratulatory message confirming successful persistence and posting to the general ledger/accounts.
     b. An official document card featuring the generated number (رقم السند/الفاتورة/القيد), student/entity details, financial amounts in Sudanese Pounds (`ج.س`), and Arabic tafqeet.
     c. Direct A4 print action button (`🖨️ طباعة المستند الرسمي (A4)`) linked to `<sf-document-drawer>` or equivalent print drawer.
     d. Clear `✓ إنهاء وإغلاق` button.
  6. Action buttons on tables MUST use authentic Nebras button classes (`btn ghost xs`, `btn primary xs`), never raw square emoji boxes.

## Git Workflow Rules
- **Arabic Git Commits**: All `git commit` messages MUST be written in Arabic to maintain context and history consistency.

## Sudanese Localization & Identity Rules (قواعد الهوية والسياق السوداني الصارم)
- **STRICT SUDANESE CONTEXT ONLY**: The entire Nebras ERP system (web, mobile, backend, seed data, mocks, UI text) is strictly targeted at **Sudan**.
- **PROHIBITION OF NON-SUDANESE DATA**: Never use Saudi, Gulf, or non-Sudanese names, currencies, banks, or terminology anywhere.
- **Currency**: Always use Sudanese Pound (`ج.س` / SDG / الجنيه السوداني). Never use `ر.س` or SAR.
- **Banking**: Always reference Sudanese banks and payment systems (e.g. تطبيق بنكك - بنك الخرطوم, فوري - بنك فيصل الإسلامي, أوكاش - بنك أمدرمان الوطني). Never use Al Rajhi, Al Ahli, etc.
- **Ministry & Accreditation (الوزارة والاعتماد الأكاديمي)**: Always use the official Sudanese ministry name: **«وزارة التعليم والتربية الوطنية»**. Never use «وزارة التربية والتعليم» or non-Sudanese variations.
- **Names & Locations**: All sample/mock/test names MUST be authentic Sudanese names (e.g., عثمان دفع الله, الفاتح بابكر, إخلاص ميرغني, مزمل الكباشي, التاج إبراهيم, نزار المجذوب, فاطمة البدوي). Locations must be Sudanese states/cities (الخرطوم, أم درمان, بحري, الجزيرة, بورتسودان, إلخ).

## Mandatory Documentation in Docs Rules (قاعدة التوثيق الإلزامي في مجلد docs)
- **STRICT MANDATORY DOCUMENTATION AFTER ANY DEVELOPMENT (التوثيق الإلزامي الفوري لكافة التطويرات)**:
  It is strictly mandatory after completing any feature, enhancement, or bug fix across Nebras ERP to update the documentation in `docs/`:
  1. **Update `docs/CHANGELOG.md`**: Record the changes under `Added`, `Changed`, or `Fixed` in Arabic with clear bullet points.
  2. **Update Module Documentation in `docs/modules/<module-name>.md`**: Add or update the relevant module documentation (e.g. `docs/modules/students.md`, `docs/modules/tenant-school-identity.md`, etc.) detailing the new architecture, business rules, APIs, and UI capabilities.
  3. No task or development is considered complete until its corresponding documentation in `docs/` is updated and committed to Git.

