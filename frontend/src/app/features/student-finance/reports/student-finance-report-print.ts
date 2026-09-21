/**
 * محرك طباعة تقارير حسابات الطلاب المالية الرسمية A4 — Nebras OS
 * ─────────────────────────────────────────────────────────────
 * يُولّد مستندات وتقارير A4 رسمية بهوية المدرسة السودانية المعتمدة:
 * 1. تقارير الجداول المالية المتنوعة (إيرادات، تحصيلات، فواتير، متأخرين، مسددين، أقساط).
 * 2. شهادة إبراء ذمة مالية رسمية (Clearance Certificate) للطلاب المسددين.
 * 3. إشعار مطالبة مالية رسمي (Payment Demand Notice) للطلاب المتأخرين.
 *
 * جميع المبالغ بالجنيه السوداني (ج.س) مع التفقيط العربي وتوقيعات الاعتماد.
 */
import { ExportColumn } from '../../../shared/export/export.types';
import { getTenantPrintBranding } from '../../../core/helpers/tenant-print-branding';

const BRAND_SYSTEM = 'منظومة نبراس لإدارة المدارس (Nebras OS)';
const PRIMARY_COLOR = '#0057B8';
const MINISTRY = 'جمهورية السودان — وزارة التعليم والتربية الوطنية';

/**
 * تفقيط المبالغ بالجنيه السوداني
 */
export function tafqeet(num: number): string {
  if (num === 0) return 'صفر';
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة',
    'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر',
    'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  const scales = ['', 'ألف', 'مليون', 'مليار'];

  const intPart = Math.floor(Math.abs(num));
  const fracPart = Math.round((Math.abs(num) - intPart) * 100);

  if (intPart === 0 && fracPart === 0) return 'صفر';

  function convert3(n: number): string {
    if (n === 0) return '';
    const h = Math.floor(n / 100);
    const r = n % 100;
    const parts: string[] = [];
    if (h > 0) parts.push(hundreds[h]);
    if (r > 0) {
      if (r < 20) { parts.push(ones[r]); }
      else {
        const o = r % 10;
        const t = Math.floor(r / 10);
        if (o > 0) parts.push(ones[o] + ' و' + tens[t]);
        else parts.push(tens[t]);
      }
    }
    return parts.join(' و');
  }

  const groups: number[] = [];
  let temp = intPart;
  while (temp > 0) { groups.push(temp % 1000); temp = Math.floor(temp / 1000); }

  const textParts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue;
    let part = convert3(groups[i]);
    if (i > 0 && scales[i]) {
      if (groups[i] === 1) part = scales[i];
      else if (groups[i] === 2) part = scales[i] + 'ان';
      else part += ' ' + scales[i];
    }
    textParts.push(part);
  }

  let result = textParts.join(' و') + ' جنيه سوداني';
  if (fracPart > 0) result += ` و${convert3(fracPart)} قرش`;
  return result;
}

function timestamp(): string {
  return new Date().toLocaleString('ar-SD', { dateStyle: 'full', timeStyle: 'short' });
}

function cellValue(col: ExportColumn, row: any): string {
  const v = col.map ? col.map(row) : row[col.key];
  return v == null ? '' : String(v);
}

/**
 * توليد كود HTML الكامل لتقرير مالي رسمي بصيغة A4 أفقية بهوية المستأجر المعتمدة
 */
export function renderStudentFinanceReportHtml(
  title: string,
  columns: ExportColumn[],
  rows: any[],
  filterInfo: string,
  kpis?: Array<{ label: string; value: string; sub?: string }>,
  customGrandTotal?: number,
  tenantInfo?: any,
  forPdf = false
): string {
  const branding = getTenantPrintBranding(tenantInfo);
  const docStamp = branding.stampFinanceUrl || branding.stampUrl || '';

  // حساب المجموع الكلي
  let grandTotal = customGrandTotal ?? 0;
  if (!grandTotal) {
    const totalRow = [...rows].reverse().find((r: any) => r._isTotal);
    if (totalRow) {
      grandTotal = Number(totalRow.amount ?? totalRow.total ?? totalRow.outstanding ?? totalRow.remaining ?? 0) || 0;
    }
  }

  const kpiHtml = kpis?.length
    ? `<div class="kpi-strip">
        ${kpis.map(k => `<div class="kpi"><span class="kpi-l">${k.label}</span><span class="kpi-v">${k.value}</span>${k.sub ? `<span class="kpi-s">${k.sub}</span>` : ''}</div>`).join('')}
       </div>`
    : '';

  const theadHtml = columns.map(c => `<th style="text-align:${c.align === 'end' ? 'left' : 'right'}">${c.label}</th>`).join('');
  const tbodyHtml = rows.map(r => {
    const isTotal = r._isTotal;
    const isSub = r._isSubTotal;
    const cls = isTotal ? 'total-row' : isSub ? 'sub-total' : '';
    const cells = columns.map(c => {
      const val = cellValue(c, r);
      return `<td style="text-align:${c.align === 'end' ? 'left' : 'right'}" class="${isTotal || isSub ? 'bold' : ''}">${val}</td>`;
    }).join('');
    return `<tr class="${cls}">${cells}</tr>`;
  }).join('');

  const tafqeetHtml = grandTotal > 0
    ? `<div class="tafqeet">
        <span class="tafqeet-label">المبلغ الإجمالي تفقيطاً بالعملة الوطنية:</span>
        <span class="tafqeet-text">${tafqeet(grandTotal)} فقط لا غير</span>
       </div>`
    : '';

  const printScript = forPdf ? '' : '<script>window.onload = () => window.print();</script>';

  return `<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>${title} — ${branding.schoolNameAr}</title>
  <style>
    * { font-family: 'Segoe UI', 'Tajawal', Tahoma, 'Arial', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; color: #0f172a; font-size: 11px; line-height: 1.35; direction: rtl; }
    @page { 
      size: A4 landscape; 
      margin: 8mm 10mm 8mm 10mm; 
    }
    @media print { 
      .no-print { display: none !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }

    .doc { padding: 12px 16px; max-width: 297mm; width: 100%; margin: 0 auto; }

    /* ترويسة المدرسة الرسمية بهوية المستأجر */
    .tenant-header {
      display: flex; justify-content: space-between; align-items: center;
      border-bottom: 2.5px solid ${PRIMARY_COLOR}; padding-bottom: 8px; margin-bottom: 10px;
    }
    .header-right { flex: 1; text-align: right; }
    .ministry { font-size: 10px; font-weight: 700; color: #475569; margin-bottom: 2px; }
    .school-name-ar { font-size: 17px; font-weight: 900; color: ${PRIMARY_COLOR}; margin-bottom: 1px; }
    .school-name-en { font-size: 10.5px; font-weight: 600; color: #64748b; font-family: 'Segoe UI', Arial, sans-serif; margin-bottom: 3px; }
    .school-contact { font-size: 9px; color: #64748b; }

    .header-center { flex: 1; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .logo-box { width: 54px; height: 54px; display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
    .logo-img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .report-title-badge { 
      background: #eff6ff; border: 1px solid #bfdbfe; color: #1e3a8a;
      padding: 3px 14px; border-radius: 20px; font-size: 13px; font-weight: 800; display: inline-block;
    }

    .header-left { flex: 1; text-align: left; font-size: 9.5px; color: #475569; line-height: 1.6; }
    .header-left .meta-row strong { color: #0f172a; }

    /* شريط العنوان والفلترة */
    .doc-banner {
      display: flex; justify-content: space-between; align-items: center;
      background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
      color: #ffffff; border-radius: 6px; padding: 6px 14px; margin-bottom: 10px;
    }
    .doc-banner .banner-title { font-size: 12.5px; font-weight: 800; }
    .doc-banner .banner-meta { font-size: 10px; opacity: 0.95; }

    /* شريط مؤشرات الأداء KPIs */
    .kpi-strip { display: flex; gap: 10px; margin-bottom: 10px; }
    .kpi { 
      flex: 1; min-width: 100px; padding: 6px 10px; background: #f8fafc; 
      border: 1px solid #e2e8f0; border-radius: 6px; border-right: 3px solid ${PRIMARY_COLOR}; 
    }
    .kpi-l { display: block; font-size: 9px; color: #64748b; font-weight: 600; }
    .kpi-v { display: block; font-size: 13.5px; font-weight: 800; color: #0f172a; margin-top: 1px; font-variant-numeric: tabular-nums; }
    .kpi-s { display: block; font-size: 8.5px; color: #94a3b8; }

    /* جدول التقرير الأفقي */
    .report-tbl { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 10px; }
    .report-tbl th { 
      background: #f1f5f9; padding: 6px 8px; border: 1px solid #cbd5e1;
      font-size: 10px; font-weight: 800; color: #1e293b; white-space: nowrap;
    }
    .report-tbl td { 
      padding: 5px 8px; border: 1px solid #e2e8f0; color: #0f172a; white-space: nowrap; 
    }
    .report-tbl tbody tr:nth-child(even) td { background: #f8fafc; }
    .report-tbl .bold { font-weight: 700; }
    .report-tbl .total-row td {
      background: #eff6ff !important; font-weight: 900; font-size: 11px;
      border-top: 2px solid ${PRIMARY_COLOR}; border-bottom: 2px double ${PRIMARY_COLOR};
      color: #1e3a8a;
    }
    .report-tbl .sub-total td { background: #f1f5f9 !important; font-weight: 700; border-top: 1px solid #cbd5e1; }

    /* تفقيط */
    .tafqeet { 
      padding: 7px 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px;
      font-size: 11px; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;
    }
    .tafqeet-label { font-weight: 700; color: #92400e; }
    .tafqeet-text { font-weight: 700; color: #78350f; }

    /* التوقيعات الرسمية بهوية المستأجر والختم */
    .signatures {
      display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; 
      margin-top: 18px; padding-top: 10px; border-top: 1px dashed #cbd5e1;
    }
    .sig { flex: 1; text-align: center; }
    .sig-label { font-size: 9.5px; color: #64748b; margin-bottom: 20px; display: block; font-weight: 600; }
    .sig-line { border-top: 1px solid #334155; padding-top: 4px; font-size: 10px; font-weight: 700; color: #0f172a; }
    .stamp-box {
      width: 60px; height: 60px; border: 1.5px dashed #94a3b8; border-radius: 50%;
      display: grid; place-items: center; font-size: 8px; color: #94a3b8; margin: 0 auto;
    }
    .stamp-img { max-width: 65px; max-height: 65px; object-fit: contain; }

    /* تذييل الصفحة الرسمي */
    .doc-footer { 
      display: flex; justify-content: space-between; align-items: center;
      font-size: 8.5px; color: #94a3b8; margin-top: 12px; padding-top: 6px; border-top: 1px solid #e2e8f0; 
    }
  </style>
</head>
<body>
  <div class="doc">
    <!-- ترويسة المستأجر الرسمية -->
    <div class="tenant-header">
      <div class="header-right">
        <div class="ministry">${MINISTRY}</div>
        <div class="school-name-ar">${branding.schoolNameAr}</div>
        <div class="school-name-en">${branding.schoolNameEn}</div>
        <div class="school-contact">${branding.address ? branding.address + ' &nbsp;|&nbsp; ' : ''}هاتف: ${branding.phone || '—'}</div>
      </div>
      <div class="header-center">
        <div class="logo-box">
          <img src="${branding.logoUrl}" alt="شعار المدرسة" class="logo-img" onerror="this.style.display='none'">
        </div>
        <div class="report-title-badge">${title}</div>
      </div>
      <div class="header-left">
        <div class="meta-row">تاريخ التقرير: <strong>${timestamp()}</strong></div>
        <div class="meta-row">نطاق السجلات: <strong>${filterInfo}</strong></div>
        <div class="meta-row">العملة: <strong>الجنيه السوداني (ج.س / SDG)</strong></div>
        <div class="meta-row">إجمالي القيود: <strong>${rows.length} قيد</strong></div>
      </div>
    </div>

    <!-- شريط الملخص والفلترة -->
    <div class="doc-banner">
      <div class="banner-title">📊 ${title} &nbsp;•&nbsp; ${filterInfo}</div>
      <div class="banner-meta">تقرير رسمي معتمد — الإدارة المالية وإدارة حسابات الطلاب</div>
    </div>

    ${kpiHtml}

    <!-- جدول البيانات في الصفحة الأفقية -->
    <table class="report-tbl">
      <thead><tr>${theadHtml}</tr></thead>
      <tbody>${tbodyHtml}</tbody>
    </table>

    ${tafqeetHtml}

    <!-- توقيعات الاعتماد والختم المالي الرسمي للمدرسة -->
    <div class="signatures">
      <div class="sig">
        <span class="sig-label">إعداد المحاسب المسؤول</span>
        <div class="sig-line">محاسب شؤون الطلاب والخزينة</div>
      </div>
      <div class="sig">
        <span class="sig-label">تدقيق ومراجعة داخلية</span>
        <div class="sig-line">المراقب المالي</div>
      </div>
      <div class="sig">
        <span class="sig-label">اعتماد المدير المالي والإداري</span>
        <div class="sig-line">مدير الإدارة المالية</div>
      </div>
      <div class="sig" style="flex: 0 0 100px;">
        ${docStamp ? `<img src="${docStamp}" class="stamp-img" alt="ختم الإدارة المالية">` : '<div class="stamp-box">ختم الإدارة المالية</div>'}
      </div>
    </div>

    <!-- التذييل النظامي -->
    <div class="doc-footer">
      <span>${branding.schoolNameAr} &nbsp;•&nbsp; ${branding.address || 'جمهورية السودان'} &nbsp;•&nbsp; هاتف: ${branding.phone || '—'}</span>
      <span>${BRAND_SYSTEM} &nbsp;•&nbsp; تم الاستخراج بتاريخ: ${timestamp()}</span>
    </div>
  </div>
  ${printScript}
</body>
</html>`;
}

/**
 * طباعة تقرير مالي رسمي للطلاب بصيغة A4 أفقية (Landscape) بهوية المستأجر المعتمدة
 */
export function printStudentFinanceReport(
  title: string,
  columns: ExportColumn[],
  rows: any[],
  filterInfo: string,
  kpis?: Array<{ label: string; value: string; sub?: string }>,
  customGrandTotal?: number,
  tenantInfo?: any
): void {
  const html = renderStudentFinanceReportHtml(title, columns, rows, filterInfo, kpis, customGrandTotal, tenantInfo, false);
  const w = window.open('', '_blank', 'width=1100,height=750');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/**
 * تصدير ملف PDF رسمي عالي الدقة مطابق تماماً لمطبوعة A4 الأفقية
 */
export async function exportStudentFinanceReportToPdf(
  title: string,
  columns: ExportColumn[],
  rows: any[],
  filterInfo: string,
  kpis?: Array<{ label: string; value: string; sub?: string }>,
  customGrandTotal?: number,
  tenantInfo?: any
): Promise<void> {
  const [jspdfMod, html2canvasMod]: any[] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);
  const JsPDF = jspdfMod.jsPDF ?? jspdfMod.default;
  const html2canvas = html2canvasMod.default ?? html2canvasMod;

  const html = renderStudentFinanceReportHtml(title, columns, rows, filterInfo, kpis, customGrandTotal, tenantInfo, true);

  // إنشاء حاوية مخفية بأبعاد A4 Landscape (عرض 1122 بكسل بدقة A4)
  const holder = document.createElement('div');
  holder.setAttribute('dir', 'rtl');
  holder.style.cssText = 'position:fixed; top:0; inset-inline-start:-10000px; width:1122px; background:#fff; z-index:-1;';
  holder.innerHTML = html;
  document.body.appendChild(holder);

  try {
    const canvas = await html2canvas(holder, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });
    const pdf = new JsPDF('l', 'mm', 'a4');
    const pageW = 297;
    const pageH = 210;
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    const img = canvas.toDataURL('image/png');

    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(img, 'PNG', 0, position, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position -= pageH;
      pdf.addPage();
      pdf.addImage(img, 'PNG', 0, position, imgW, imgH);
      heightLeft -= pageH;
    }
    const cleanName = `${title.replace(/[\s\/\\:*?"<>|]+/g, '_')}-${new Date().toISOString().slice(0, 10)}.pdf`;
    pdf.save(cleanName);
  } finally {
    document.body.removeChild(holder);
  }
}

/**
 * طباعة شهادة براءة ذمة مالية رسمية للطالب المسدد
 */
export function printClearanceCertificate(student: {
  student_name: string;
  student_number: string;
  account_number: string;
  grade_name: string;
  guardian_name?: string;
  total_paid: number;
  academic_year?: string;
}, tenantInfo?: any): void {
  const branding = getTenantPrintBranding(tenantInfo);
  const html = `<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>شهادة براءة ذمة مالية — ${student.student_name}</title>
  <style>
    * { font-family: 'Segoe UI', 'Tajawal', Tahoma, 'Arial', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; color: #111827; }
    @page { size: A4 portrait; margin: 15mm 20mm; }
    .cert { padding: 30px; max-width: 210mm; margin: 0 auto; border: 4px double #0057B8; border-radius: 8px; position: relative; }
    .header { text-align: center; border-bottom: 2px solid #0057B8; padding-bottom: 15px; margin-bottom: 25px; }
    .header .ministry { font-size: 11px; color: #4B5563; font-weight: 700; margin-bottom: 3px; }
    .header .school-name { font-size: 16px; color: #0057B8; font-weight: 900; margin-bottom: 6px; }
    .header h1 { font-size: 22px; color: #1E3A8A; margin-bottom: 6px; font-weight: 800; }
    .header .sub { font-size: 11px; color: #6B7280; }
    .body { font-size: 14px; line-height: 2; margin-bottom: 30px; text-align: justify; }
    .highlight { font-weight: 700; color: #1E3A8A; background: #EEF3FB; padding: 2px 8px; border-radius: 4px; }
    .info-box { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .info-row:last-child { margin-bottom: 0; }
    .signatures { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 50px; text-align: center; }
    .sig { width: 160px; }
    .sig-line { border-top: 1px solid #374151; margin-top: 40px; padding-top: 8px; font-size: 12px; font-weight: 700; }
    .stamp-box { width: 100px; height: 100px; border: 2px dashed #9CA3AF; border-radius: 50%; display: grid; place-items: center; font-size: 10px; color: #9CA3AF; margin: 0 auto; }
    .stamp-img { max-width: 95px; max-height: 95px; object-fit: contain; }
  </style>
</head>
<body>
  <div class="cert">
    <div class="header">
      <div class="ministry">${MINISTRY}</div>
      <div class="school-name">${branding.schoolNameAr}</div>
      <h1>إفادة براءة ذمة مالية رسمية</h1>
      <div class="sub">العام الدراسي: ${student.academic_year || '2025 - 2026 م'} &nbsp;|&nbsp; التاريخ: ${timestamp()}</div>
    </div>

    <div class="body">
      تشهد الإدارة المالية وإدارة حسابات الطلاب في <strong>${branding.schoolNameAr}</strong> بأن الطالب/ـة: <span class="highlight">${student.student_name}</span>،
      المقيد بالرقم الأكاديمي: <span class="highlight">${student.student_number}</span>،
      بالصف/المرحلة: <span class="highlight">${student.grade_name || '—'}</span>،
      وحساب الفوترة رقم: <span class="highlight">${student.account_number}</span>،
      قد أتم/ـت سداد كافة الرسوم الدراسية والمصروفات المستحقة للعام الدراسي حتى تاريخه بإجمالي مسدد قدره:
      <span class="highlight">${student.total_paid.toLocaleString('en-US')} جنيه سوداني</span>
      (${tafqeet(student.total_paid)}).
      <br><br>
      وبناءً عليه، تم منح هذه الشهادة الرسمية لإبراء الذمة المالية دون أدنى مسؤولية أو التزام مالي متبقٍ على الطالب تجاه المدرسة.
    </div>

    <div class="info-box">
      <div class="info-row"><span>اسم ولي الأمر:</span><strong>${student.guardian_name || '—'}</strong></div>
      <div class="info-row"><span>رصيد الحساب الحالي:</span><strong style="color:#059669;">0.00 ج.س (خالص الرسوم بالكامل)</strong></div>
      <div class="info-row"><span>تاريخ إصدار الشهادة:</span><strong>${timestamp()}</strong></div>
    </div>

    <div class="signatures">
      <div class="sig">
        <span>محاسب شؤون الطلاب</span>
        <div class="sig-line">توقيع المحاسب</div>
      </div>
      <div class="sig">
        ${branding.stampUrl ? `<img src="${branding.stampUrl}" class="stamp-img" alt="الختم الرسمي">` : '<div class="stamp-box">ختم المدرسة الرسمي</div>'}
      </div>
      <div class="sig">
        <span>المدير المالي والإداري</span>
        <div class="sig-line">اعتماد الإدارة</div>
      </div>
    </div>
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=900,height=750');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/**
 * طباعة إشعار مطالبة مالية رسمي للطلاب المتأخرين
 */
export function printDemandNotice(student: {
  student_name: string;
  student_number: string;
  account_number: string;
  grade_name: string;
  guardian_name?: string;
  guardian_phone?: string;
  outstanding_balance: number;
  days_overdue: number;
  overdue_items: Array<{ title: string; due_date: string; amount: number }>;
}, tenantInfo?: any): void {
  const branding = getTenantPrintBranding(tenantInfo);
  const itemsHtml = student.overdue_items.map(it => `
    <tr>
      <td style="padding:8px; border-bottom:1px solid #E5E7EB;">${it.title}</td>
      <td style="padding:8px; border-bottom:1px solid #E5E7EB;">${it.due_date}</td>
      <td style="padding:8px; border-bottom:1px solid #E5E7EB; text-align:left; font-weight:700;">${it.amount.toLocaleString('en-US')} ج.س</td>
    </tr>
  `).join('');

  const html = `<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>إشعار مطالبة مالية — ${student.student_name}</title>
  <style>
    * { font-family: 'Segoe UI', 'Tajawal', Tahoma, 'Arial', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; color: #111827; }
    @page { size: A4 portrait; margin: 15mm 20mm; }
    .notice { padding: 30px; max-width: 210mm; margin: 0 auto; border: 2px solid #DC2626; border-radius: 8px; }
    .header { text-align: center; border-bottom: 2px solid #DC2626; padding-bottom: 12px; margin-bottom: 20px; }
    .header .ministry { font-size: 11px; color: #4B5563; font-weight: 700; margin-bottom: 3px; }
    .header .school-name { font-size: 16px; color: #1E3A8A; font-weight: 900; margin-bottom: 6px; }
    .header h1 { font-size: 22px; color: #DC2626; font-weight: 800; margin: 4px 0; }
    .body { font-size: 13.5px; line-height: 1.8; margin-bottom: 20px; }
    .tbl { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12.5px; }
    .tbl th { background: #FEE2E2; color: #991B1B; padding: 8px; text-align: right; }
    .payment-box { background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 6px; padding: 14px; margin: 20px 0; font-size: 12.5px; }
    .signatures { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
    .sig-line { border-top: 1px solid #374151; margin-top: 40px; padding-top: 6px; font-size: 11px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="notice">
    <div class="header">
      <div class="ministry">${MINISTRY}</div>
      <div class="school-name">${branding.schoolNameAr}</div>
      <h1>إشعار مطالبة مالية وتذكير بالسداد</h1>
      <div>التاريخ: ${timestamp()} &nbsp;|&nbsp; رقم الحساب: ${student.account_number}</div>
    </div>

    <div class="body">
      السيد ولي أمر الطالب/ـة المحترم: <strong>${student.guardian_name || student.student_name}</strong><br>
      السلام عليكم ورحمة الله وبركاته،،<br><br>
      تحية طيبة، ونود إحاطتكم بوجود متأخرات مالية مستحقة على حساب الطالب/ـة:
      <strong>${student.student_name}</strong> (الرقم الأكاديمي: ${student.student_number}، الصف: ${student.grade_name || '—'})،
      حيث بلغت المبالغ المتأخرة المستحقة حتى تاريخه مبلغاً وقدره:
      <strong style="color:#DC2626; font-size:16px;">${student.outstanding_balance.toLocaleString('en-US')} جنيه سوداني</strong>
      (${tafqeet(student.outstanding_balance)}).
    </div>

    <table class="tbl">
      <thead>
        <tr>
          <th>بيان الرسم / القسط</th>
          <th>تاريخ الاستحقاق</th>
          <th style="text-align:left;">المبلغ المستحق</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="payment-box">
      <strong>💳 قنوات السداد البنكية المعتمدة لتفادي الحظر المالي:</strong><br>
      • <strong>تطبيق بنكك (بنك الخرطوم):</strong> حساب رقم <code>1234567</code> باسم المدرسة، مع كتابة اسم الطالب ورقم الحساب في الملاحظات.<br>
      • <strong>خدمة فوري (بنك فيصل الإسلامي):</strong> دفع مباشر لحساب المدرسة.<br>
      • <strong>خزينة المدرسة:</strong> سداد نقدي مباشر بقسم الحسابات والحصول على سند قبض فوري.
    </div>

    <div class="signatures">
      <div style="width:180px;">
        <span>محاسب الإيرادات والتحصيل</span>
        <div class="sig-line">توقيع المحاسب</div>
      </div>
      <div style="width:180px;">
        <span>إدارة الشؤون المالية</span>
        <div class="sig-line">الختم والاعتماد</div>
      </div>
    </div>
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=900,height=750');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/**
 * طباعة إيصال / سند قبض مالي رسمي A4 للطالب بهوية المدرسة والوزارة
 */
export function printReceiptVoucher(receipt: {
  receipt_number: string;
  receipt_date: string;
  student_name: string;
  student_number?: string;
  branch_name?: string;
  stage_name?: string;
  grade_name?: string;
  section_name?: string;
  payment_method: string;
  reference_number?: string;
  amount: number;
  collector?: string;
  notes?: string;
}, tenantInfo?: any): void {
  const branding = getTenantPrintBranding(tenantInfo);
  const amountStr = (Number(receipt.amount) || 0).toLocaleString('en-US');
  const tafqeetStr = tafqeet(Number(receipt.amount) || 0);

  const html = `<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>سند قبض رسمي — ${receipt.receipt_number}</title>
  <style>
    * { font-family: 'Segoe UI', 'Tajawal', Tahoma, 'Arial', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; color: #111827; padding: 20px; }
    @page { size: A4 portrait; margin: 15mm 20mm; }
    .voucher { max-width: 210mm; margin: 0 auto; border: 2px solid #0057B8; border-radius: 8px; padding: 25px; position: relative; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0057B8; padding-bottom: 15px; margin-bottom: 20px; }
    .header .title-area h3 { font-size: 11px; color: #4B5563; margin-bottom: 2px; }
    .header .title-area h2 { font-size: 15px; color: #1E3A8A; font-weight: 800; margin-bottom: 4px; }
    .header .title-area h1 { font-size: 22px; color: #0057B8; font-weight: 800; margin: 4px 0; }
    .header .meta { text-align: left; font-size: 12px; color: #374151; }
    .receipt-badge { background: #EEF3FB; border: 1px solid #0057B8; color: #0057B8; font-size: 14px; font-weight: 700; padding: 4px 12px; border-radius: 6px; display: inline-block; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; background: #F9FAFB; padding: 15px; border-radius: 6px; border: 1px solid #E5E7EB; font-size: 13px; }
    .grid-row { display: flex; gap: 8px; }
    .label { color: #6B7280; font-weight: 600; min-width: 110px; }
    .val { color: #111827; font-weight: 700; }
    .amount-box { background: #F0FDF4; border: 2px solid #16A34A; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 25px; }
    .amount-title { font-size: 12px; color: #15803D; font-weight: 600; }
    .amount-num { font-size: 26px; font-weight: 800; color: #16A34A; margin: 4px 0; }
    .amount-words { font-size: 14px; color: #166534; font-weight: 600; }
    .signatures { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 45px; text-align: center; font-size: 12px; }
    .sig-box { width: 170px; }
    .sig-line { border-top: 1px solid #374151; margin-top: 40px; padding-top: 6px; font-weight: 700; }
    .stamp-box { width: 80px; height: 80px; border: 1.5px dashed #94a3b8; border-radius: 50%; display: grid; place-items: center; font-size: 9px; color: #94a3b8; margin: 0 auto; }
    .stamp-img { max-width: 75px; max-height: 75px; object-fit: contain; }
    .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #9CA3AF; border-top: 1px dashed #E5E7EB; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="voucher">
    <div class="header">
      <div class="title-area">
        <h3>${MINISTRY}</h3>
        <h2>${branding.schoolNameAr}</h2>
        <h1>سند قبض وتحصيل مالي</h1>
        <div style="font-size:12px; color:#4B5563;">حسابات الرسوم والقبض المدرسية</div>
      </div>
      <div class="meta">
        <div>التاريخ: <strong>${receipt.receipt_date}</strong></div>
        <div class="receipt-badge">${receipt.receipt_number}</div>
      </div>
    </div>

    <div class="grid">
      <div class="grid-row">
        <span class="label">اسم الطالب:</span>
        <span class="val">${receipt.student_name}</span>
      </div>
      <div class="grid-row">
        <span class="label">الرقم الأكاديمي:</span>
        <span class="val">${receipt.student_number || '—'}</span>
      </div>
      <div class="grid-row">
        <span class="label">الفرع:</span>
        <span class="val">${receipt.branch_name || 'فرع البنين'}</span>
      </div>
      <div class="grid-row">
        <span class="label">المرحلة الدراسية:</span>
        <span class="val">${receipt.stage_name || 'المرحلة المتوسطة'}</span>
      </div>
      <div class="grid-row">
        <span class="label">الصف والشعبة:</span>
        <span class="val">${receipt.grade_name || '—'} ${receipt.section_name ? '(' + receipt.section_name + ')' : ''}</span>
      </div>
      <div class="grid-row">
        <span class="label">طريقة السداد:</span>
        <span class="val">${receipt.payment_method}</span>
      </div>
      <div class="grid-row">
        <span class="label">رقم المرجع / الإشعار:</span>
        <span class="val" style="font-family:monospace;">${receipt.reference_number || '—'}</span>
      </div>
      <div class="grid-row">
        <span class="label">المحصّل المسؤول:</span>
        <span class="val">${receipt.collector || 'محاسب الخزينة'}</span>
      </div>
    </div>

    <div class="amount-box">
      <div class="amount-title">المبلغ المحصل نقداً / بنكياً</div>
      <div class="amount-num">${amountStr} <span style="font-size:16px;">جنيه سوداني (ج.س)</span></div>
      <div class="amount-words">فقط وقدره: ${tafqeetStr}</div>
    </div>

    <div class="signatures">
      <div class="sig-box">
        <div>توقيع المودع / ولي الأمر</div>
        <div class="sig-line">الاسم والتوقيع</div>
      </div>
      <div class="sig-box">
        <div>توقيع المحصّل / أمين الخزينة</div>
        <div class="sig-line">${receipt.collector || 'أمين الصندوق'}</div>
      </div>
      <div class="sig-box">
        ${branding.stampUrl ? `<img src="${branding.stampUrl}" class="stamp-img" alt="الختم الرسمي">` : '<div class="stamp-box">الختم الرسمي</div>'}
        <div class="sig-line" style="margin-top:10px;">المدير المالي</div>
      </div>
    </div>

    <div class="footer">
      نبراس لإدارة المؤسسات التعليمية &nbsp;•&nbsp; مستند تحصيل رسمي معتمد &nbsp;•&nbsp; تاريخ الطباعة: ${timestamp()}
    </div>
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=900,height=750');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

