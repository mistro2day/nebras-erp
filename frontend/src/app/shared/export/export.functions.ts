/**
 * دوال التصدير الموحّدة لمشروع نبراس — عربية بالكامل بدعم الاتجاه من اليمين لليسار (RTL).
 *
 *  - exportCsv  : ملف CSV متوافق مع Excel (BOM للعربية).
 *  - exportExcel: ملف .xlsx فعلي باتجاه ورقة من اليمين لليسار وتنسيق ترويسة نبراس.
 *  - exportPdf  : ملف PDF عربي RTL (يُصوّر HTML المُنسّق فيحافظ على تشكيل الحروف).
 *  - printDoc   : نافذة طباعة منسّقة بترويسة نبراس واتجاه RTL.
 *
 * المكتبات (exceljs / jspdf / html2canvas) تُحمّل ديناميكياً عند الحاجة فقط.
 */
import { ExportColumn, ExportMeta } from './export.types';
import { getTenantPrintBranding } from '../../core/helpers/tenant-print-branding';

const BRAND = 'نبراس — نظام إدارة المدارس';
const BRAND_COLOR = '0057B8';

function cell(col: ExportColumn, row: any): string {
  const v = col.map ? col.map(row) : row[col.key];
  return v == null ? '' : String(v);
}

function stamp(): string {
  return new Date().toLocaleString('en-GB');
}

function fileName(meta: ExportMeta, ext: string): string {
  const base = meta.filename || meta.title;
  return `${base}-${new Date().toISOString().slice(0, 10)}.${ext}`;
}

function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ─────────────────────────── CSV ─────────────────────────── */
export function exportCsv(meta: ExportMeta, columns: ExportColumn[], rows: any[]): void {
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const header = columns.map((c) => esc(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => esc(cell(c, r))).join(',')).join('\n');
  const csv = '﻿' + header + '\n' + body; // BOM لدعم العربية في Excel
  saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), fileName(meta, 'csv'));
}

/** تنزيل CSV جاهز (نص مُعدّ مسبقاً) مع BOM لدعم العربية. */
export function downloadCsv(filename: string, content: string): void {
  saveBlob(new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' }), filename);
}

/* ─────────────────────────── Excel (RTL) ─────────────────────────── */
export async function exportExcel(meta: ExportMeta, columns: ExportColumn[], rows: any[]): Promise<void> {
  const mod: any = await import('exceljs');
  const ExcelJS = mod.default ?? mod;
  const wb = new ExcelJS.Workbook();
  wb.creator = BRAND;
  wb.created = new Date();

  // ورقة باتجاه من اليمين لليسار
  const ws = wb.addWorksheet(meta.title.slice(0, 28) || 'تقرير', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 3 }],
  });

  const colCount = columns.length;
  ws.columns = columns.map((c) => ({ key: c.key, width: c.width ?? 22 }));

  // صف العنوان (مدمج)
  ws.mergeCells(1, 1, 1, colCount);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = meta.title;
  titleCell.font = { bold: true, size: 15, color: { argb: 'FF' + BRAND_COLOR } };
  titleCell.alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getRow(1).height = 26;

  // صف الوصف/الختم
  ws.mergeCells(2, 1, 2, colCount);
  const subCell = ws.getCell(2, 1);
  subCell.value = `${meta.subtitle ? meta.subtitle + '  •  ' : ''}${BRAND}  •  ${stamp()}`;
  subCell.font = { size: 10, color: { argb: 'FF6B7280' } };
  subCell.alignment = { horizontal: 'right', vertical: 'middle' };

  // صف رأس الأعمدة
  const headerRow = ws.getRow(3);
  columns.forEach((c, i) => {
    const cc = headerRow.getCell(i + 1);
    cc.value = c.label;
    cc.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_COLOR } };
    cc.alignment = { horizontal: 'right', vertical: 'middle' };
    cc.border = { bottom: { style: 'thin', color: { argb: 'FFD6DBE6' } } };
  });
  headerRow.height = 20;

  // صفوف البيانات
  rows.forEach((r, ri) => {
    const row = ws.getRow(4 + ri);
    columns.forEach((c, i) => {
      const cc = row.getCell(i + 1);
      cc.value = c.map ? c.map(r) : r[c.key];
      cc.alignment = { horizontal: c.align === 'end' ? 'left' : 'right', vertical: 'middle' };
      if (ri % 2 === 1) cc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFBFD' } };
      cc.border = { bottom: { style: 'hair', color: { argb: 'FFE5E8EF' } } };
    });
  });

  const buf = await wb.xlsx.writeBuffer();
  saveBlob(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    fileName(meta, 'xlsx'),
  );
}

/* ─────────────────────────── قالب HTML موحّد (طباعة/PDF) ─────────────────────────── */
function renderDocHtml(meta: ExportMeta, columns: ExportColumn[], rows: any[]): string {
  const branding = getTenantPrintBranding();
  const head = columns.map((c) => `<th style="text-align:${c.align === 'end' ? 'left' : 'right'}">${c.label}</th>`).join('');
  const body = rows
    .map(
      (r) =>
        '<tr>' +
        columns.map((c) => `<td style="text-align:${c.align === 'end' ? 'left' : 'right'}">${cell(c, r)}</td>`).join('') +
        '</tr>',
    )
    .join('');
  // التحديد الذكي للختم الرسمي بحسب طبيعة التقرير والمطبوعة (مالية / أكاديمية / إدارية عامة)
  const fullText = `${meta.title} ${meta.subtitle || ''}`;
  const isFinance = /مال|سند|قبض|صرف|فاتورة|رسوم|حساب|ميزانية|أستاذ|مشتريات|خزينة|رواتب|استحقاق/i.test(fullText);
  const isAcademic = /غياب|حضور|أكاديم|متابع|درجات|امتحان|تقييم|جدول|فصل|شعبة|إنذار/i.test(fullText);

  let docStamp = branding.stampUrl;
  let stampTitle = 'الختم الرسمي للمؤسسة';
  if (isFinance) {
    docStamp = branding.stampFinanceUrl || '';
    stampTitle = 'ختم الإدارة المالية والخزينة';
  } else if (isAcademic) {
    docStamp = branding.stampAcademicUrl || '';
    stampTitle = 'ختم الشؤون الأكاديمية والمتابعة';
  }

  return `
    <div class="nb-doc" dir="rtl">
      <div class="nb-doc-head">
        <div class="nb-doc-titles">
          <h1>${meta.title}</h1>
          ${meta.subtitle ? `<div class="nb-doc-sub">${meta.subtitle}</div>` : ''}
          <div class="nb-doc-meta-info">تاريخ التقرير: ${stamp()} • عدد السجلات: ${rows.length}</div>
        </div>
        <div class="nb-doc-brand">
          <div class="b-ministry">جمهورية السودان • وزارة التعليم والتربية الوطنية</div>
          <div class="b1">${branding.schoolNameAr}</div>
          <div class="b2">${branding.schoolNameEn}</div>
          <div class="b-contact">${branding.address || ''}</div>
        </div>
        ${branding.logoUrl ? `<div class="nb-doc-logo"><img src="${branding.logoUrl}" alt="شعار المدرسة" class="doc-logo-img" onerror="this.style.display='none'"></div>` : ''}
      </div>
      <table class="nb-doc-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
      
      <!-- مصفوفة التوقيعات والختم المعتمد للمؤسسة التعليمية بحسب الإدارة المختصة -->
      <div class="nb-doc-signatures">
        <div class="nb-sig-box">
          <span class="nb-sig-title">إعداد الموظف / المحاسب</span>
          <span class="nb-sig-val">توقيع المسؤول</span>
        </div>
        <div class="nb-sig-box">
          <span class="nb-sig-title">المراجعة والتدقيق</span>
          <span class="nb-sig-val">المراجع الداخلي</span>
        </div>
        <div class="nb-sig-box">
          <span class="nb-sig-title">الاعتماد الإداري</span>
          <span class="nb-sig-val">إدارة المؤسسة</span>
        </div>
        <div class="nb-sig-box nb-stamp-box">
          <span class="nb-sig-title">${stampTitle}</span>
          <div class="nb-stamp-wrapper">
            ${docStamp ? `<img src="${docStamp}" alt="${stampTitle}" class="nb-stamp-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div class="nb-stamp-ph" style="display:none;">معتمد</div>` : '<div class="nb-stamp-ph">معتمد</div>'}
          </div>
        </div>
      </div>

      <div class="nb-doc-foot">
        <span>${branding.schoolNameAr} • ${branding.phonesFormatted || branding.phone || ''}</span>
        <span>منظومة نبراس لإدارة المؤسسات التعليمية (Nebras OS)</span>
      </div>
    </div>`;
}

const DOC_CSS = `
  * { font-family: 'Segoe UI', Tahoma, 'Arial', sans-serif; box-sizing: border-box; }
  body { margin: 0; color: #111827; background: #fff; }
  .nb-doc { padding: 24px; }
  .nb-doc-head { display: flex; justify-content: space-between; align-items: center; border-bottom: 2.5px solid #${BRAND_COLOR}; padding-bottom: 12px; margin-bottom: 16px; }
  .nb-doc-titles h1 { font-size: 18px; margin: 0; color: #111827; }
  .nb-doc-sub { font-size: 12px; color: #6B7280; margin-top: 4px; }
  .nb-doc-meta-info { font-size: 10px; color: #9CA3AF; margin-top: 4px; }
  .nb-doc-brand { text-align: start; flex: 1; padding: 0 16px; }
  .b-ministry { font-size: 9px; font-weight: 700; color: #6B7280; margin-bottom: 2px; }
  .nb-doc-brand .b1 { font-size: 14px; font-weight: 800; color: #111827; }
  .nb-doc-brand .b2 { font-size: 10.5px; color: #6B7280; }
  .b-contact { font-size: 9px; color: #9CA3AF; margin-top: 2px; }
  .nb-doc-logo { width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; }
  .doc-logo-img { max-width: 56px; max-height: 56px; object-fit: contain; }
  .nb-doc-table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 12px; }
  .nb-doc-table th { background: #EEF3FB; padding: 8px 10px; border-bottom: 2px solid #D6DBE6; font-size: 11px; color: #374151; }
  .nb-doc-table td { padding: 7px 10px; border-bottom: 1px solid #E5E8EF; }
  .nb-doc-table tbody tr:nth-child(even) td { background: #FAFBFD; }
  .nb-doc-signatures { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 20px; padding-top: 10px; border-top: 1px solid #E5E8EF; page-break-inside: avoid; }
  .nb-sig-box { border: 1px solid #E5E8EF; border-radius: 6px; padding: 6px; text-align: center; background: #fafafa; display: flex; flex-direction: column; justify-content: space-between; min-height: 70px; }
  .nb-sig-title { font-size: 9px; font-weight: 700; color: #4B5563; border-bottom: 1px dashed #D1D5DB; padding-bottom: 2px; margin-bottom: 4px; }
  .nb-sig-val { font-size: 8.5px; color: #9CA3AF; }
  .nb-stamp-wrapper { display: flex; align-items: center; justify-content: center; min-height: 40px; flex: 1; }
  .nb-stamp-img { max-height: 52px; max-width: 85px; object-fit: contain; transform: rotate(-3deg); }
  .nb-stamp-ph { font-size: 8px; color: #${BRAND_COLOR}; border: 1px dashed #${BRAND_COLOR}; border-radius: 6px; width: 55px; height: 36px; display: flex; align-items: center; justify-content: center; text-align: center; transform: rotate(-3deg); font-weight: 700; }
  .nb-doc-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; font-size: 9.5px; color: #9CA3AF; border-top: 1px solid #E5E8EF; padding-top: 6px; }
`;

/* ─────────────────────────── طباعة ─────────────────────────── */
export function printDoc(meta: ExportMeta, columns: ExportColumn[], rows: any[]): void {
  const isLandscape = meta.orientation === 'landscape';
  const pageCss = isLandscape
    ? '@page { size: A4 landscape; margin: 10mm 15mm; }'
    : '@page { size: A4 portrait; margin: 15mm; }';
  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${meta.title}</title>
    <style>${DOC_CSS} ${pageCss} @media print{.nb-doc{padding:0}}</style></head>
    <body>${renderDocHtml(meta, columns, rows)}<script>window.onload=()=>window.print()</script></body></html>`;
  const w = window.open('', '_blank', isLandscape ? 'width=1150,height=750' : 'width=980,height=720');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/* ─────────────────────────── PDF (RTL) ─────────────────────────── */
export async function exportPdf(meta: ExportMeta, columns: ExportColumn[], rows: any[]): Promise<void> {
  const [jspdfMod, html2canvasMod]: any[] = await Promise.all([import('jspdf'), import('html2canvas')]);
  const JsPDF = jspdfMod.jsPDF ?? jspdfMod.default;
  const html2canvas = html2canvasMod.default ?? html2canvasMod;

  const isLandscape = meta.orientation === 'landscape';
  const holderWidth = isLandscape ? 1122 : 794;
  // حاوية مخفية بعرض A4 لتصوير المحتوى العربي المُنسّق
  const holder = document.createElement('div');
  holder.setAttribute('dir', 'rtl');
  holder.style.cssText = `position:fixed; top:0; inset-inline-start:-10000px; width:${holderWidth}px; background:#fff; z-index:-1;`;
  holder.innerHTML = `<style>${DOC_CSS}</style>${renderDocHtml(meta, columns, rows)}`;
  document.body.appendChild(holder);

  try {
    const canvas = await html2canvas(holder, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const pdf = new JsPDF(isLandscape ? 'l' : 'p', 'mm', 'a4');
    const pageW = isLandscape ? 297 : 210;
    const pageH = isLandscape ? 210 : 297;
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
    pdf.save(fileName(meta, 'pdf'));
  } finally {
    document.body.removeChild(holder);
  }
}

/**
 * تصدير عنصر DOM حيّ (كشف حساب، عقد، سند) مباشرة إلى ملف PDF رسمي
 * مع الحفاظ على الخطوط، الألوان، الشعارات، وتنسيقات RTL كاملة.
 */
export async function exportElementToPdf(
  elementOrId: HTMLElement | string,
  filename: string,
  options?: { scale?: number; orientation?: 'p' | 'l' }
): Promise<void> {
  const element = typeof elementOrId === 'string'
    ? document.getElementById(elementOrId)
    : elementOrId;
  if (!element) return;

  const [jspdfMod, html2canvasMod]: any[] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);
  const JsPDF = jspdfMod.jsPDF ?? jspdfMod.default;
  const html2canvas = html2canvasMod.default ?? html2canvasMod;

  const scale = options?.scale ?? 2.5;
  const orientation = options?.orientation ?? 'p';

  const canvas = await html2canvas(element, {
    scale,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  });

  const pdf = new JsPDF(orientation, 'mm', 'a4');
  const pageW = orientation === 'p' ? 210 : 297;
  const pageH = orientation === 'p' ? 297 : 210;
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;
  const img = canvas.toDataURL('image/png');

  let heightLeft = imgH;
  let position = 0;

  pdf.addImage(img, 'PNG', 0, position, imgW, imgH);
  heightLeft -= pageH;

  while (heightLeft > 5) {
    position -= pageH;
    pdf.addPage();
    pdf.addImage(img, 'PNG', 0, position, imgW, imgH);
    heightLeft -= pageH;
  }

  const finalName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdf.save(finalName);
}

