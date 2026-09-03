# Project Instructions

## Default Frontend Skill
For all frontend UI tasks — including building pages, components, layouts, choosing colors/fonts/styles, UX reviews, dashboards, landing pages, and implementation best practices — **always use the `ui-ux-pro-max` skill automatically** without being explicitly told each time.

## Nebras OS UI & UX Rules
- **STRICT PROHIBITION OF BROWSER DIALOGS**: Never use native browser dialogs (`alert()`, `prompt()`, `confirm()`). All alerts, confirmations, inputs, and popups MUST use Nebras OS custom styled modal popups (`<div class="modal-backdrop">...</div>` or Nebras OS modal components) adhering to the Nebras OS design system for a premium user experience.

## Git Workflow Rules
- **Arabic Git Commits**: All `git commit` messages MUST be written in Arabic to maintain context and history consistency.

## Sudanese Localization & Identity Rules (قواعد الهوية والسياق السوداني الصارم)
- **STRICT SUDANESE CONTEXT ONLY**: The entire Nebras ERP system (web, mobile, backend, seed data, mocks, UI text) is strictly targeted at **Sudan**.
- **PROHIBITION OF NON-SUDANESE DATA**: Never use Saudi, Gulf, or non-Sudanese names, currencies, banks, or terminology anywhere.
- **Currency**: Always use Sudanese Pound (`ج.س` / SDG / الجنيه السوداني). Never use `ر.س` or SAR.
- **Banking**: Always reference Sudanese banks and payment systems (e.g. تطبيق بنكك - بنك الخرطوم, فوري - بنك فيصل الإسلامي, أوكاش - بنك أمدرمان الوطني). Never use Al Rajhi, Al Ahli, etc.
- **Names & Locations**: All sample/mock/test names MUST be authentic Sudanese names (e.g., عثمان دفع الله, الفاتح بابكر, إخلاص ميرغني, مزمل الكباشي, التاج إبراهيم, نزار المجذوب, فاطمة البدوي). Locations must be Sudanese states/cities (الخرطوم, أم درمان, بحري, الجزيرة, بورتسودان, إلخ).
