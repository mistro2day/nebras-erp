# تكامل أداة DeepWiki / Litho في Nebras ERP

توثيق إعداد واستخدام محرك التوثيق المعماري ونمذجة C4 Model وخادم MCP الذكي.

---

## 1. نظرة عامة (Overview)

تم ربط محرك **DeepWiki** و **deepwiki-rs (Litho)** في مشروع نِبراس (Nebras ERP) لتحقيق هدفين رئيسيين:
1. **تزويد وكلاء الذكاء الاصطناعي (AI Coding Assistants)** برؤية معمارية شاملة للكود المصدري وتبعيات الموديولات، لتقليل الهلوسة وتسريع حل المهام المعقدة.
2. **توليد وتحديث التوثيق المعماري (Living Architecture Docs)** ومخططات C4 Model تلقائياً داخل مجلد `docs/architecture/`.

---

## 2. خادم MCP (Model Context Protocol)

تم ربط خادم DeepWiki MCP الرسمي على مستويين:
1. **مستوى المشروع (`d:/nebras-erp/.mcp.json`)**:
   ```json
   "deepwiki": {
     "command": "npx",
     "args": [
       "-y",
       "mcp-remote",
       "https://mcp.deepwiki.com/mcp"
     ],
     "env": {}
   }
   ```
2. **المستوى العام لبيئة Antigravity IDE (`C:\Users\mistr\.gemini\antigravity-ide\mcp_config.json`)**:
   يتيح لمساعد الذكاء الاصطناعي استدعاء أدوات DeepWiki لاستكشاف مستودعات GitHub والبحث في وثائقها وبنيتها البرمجية.

---

## 3. ملف التهيئة المحلي `litho.toml`

يقع ملف `litho.toml` في جذر المشروع ويتحكم في كيفية مسح الأكواد:
- **مسار الإخراج**: `docs/architecture`
- **المجلدات المستبعدة**: `.venv`, `node_modules`, `dist`, `.git`, `mobile`
- **المجلدات المشمولة**: `backend/apps`, `frontend/src/app`
- **اللغة المستهدفة**: العربية (`target_language = "ar"`)

---

## 4. تشغيل الفحص وتوليد التوثيق محلياً (CLI / Docker)

يمكن تشغيل التوليد المعماري عبر سكربت PowerShell المتوفر في `scripts/deepwiki.ps1`:

```powershell
# تشغيل الفحص المعماري وتوليد التوثيق عبر Docker
.\scripts\deepwiki.ps1 -Action "generate"
```

أو عبر Docker مباشرة:
```bash
docker build -t nebras-deepwiki -f docker/deepwiki/Dockerfile .
docker run --rm -v "%cd%:/workspace" -w /workspace nebras-deepwiki
```
