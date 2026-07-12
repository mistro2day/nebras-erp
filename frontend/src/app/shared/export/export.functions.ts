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
  const head = columns.map((c) => `<th style="text-align:${c.align === 'end' ? 'left' : 'right'}">${c.label}</th>`).join('');
  const body = rows
    .map(
      (r) =>
        '<tr>' +
        columns.map((c) => `<td style="text-align:${c.align === 'end' ? 'left' : 'right'}">${cell(c, r)}</td>`).join('') +
        '</tr>',
    )
    .join('');
  return `
    <div class="nb-doc" dir="rtl">
      <div class="nb-doc-head">
        <div>
          <h1>${meta.title}</h1>
          ${meta.subtitle ? `<div class="nb-doc-sub">${meta.subtitle}</div>` : ''}
        </div>
        <div class="nb-doc-brand">
          <div class="b1">${BRAND}</div>
          <div class="b2">${stamp()}</div>
        </div>
      </div>
      <table class="nb-doc-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
      <div class="nb-doc-foot">عدد السجلات: ${rows.length}</div>
    </div>`;
}

const DOC_CSS = `
  * { font-family: 'Segoe UI', Tahoma, 'Arial', sans-serif; box-sizing: border-box; }
  body { margin: 0; color: #111827; background: #fff; }
  .nb-doc { padding: 28px; }
  .nb-doc-head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2.5px solid #${BRAND_COLOR}; padding-bottom: 12px; margin-bottom: 18px; }
  .nb-doc-head h1 { font-size: 19px; margin: 0; color: #111827; }
  .nb-doc-sub { font-size: 12px; color: #6B7280; margin-top: 5px; }
  .nb-doc-brand { text-align: left; }
  .nb-doc-brand .b1 { font-size: 13px; font-weight: 700; color: #${BRAND_COLOR}; }
  .nb-doc-brand .b2 { font-size: 11px; color: #9CA3AF; margin-top: 3px; }
  .nb-doc-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .nb-doc-table th { background: #EEF3FB; padding: 9px 11px; border-bottom: 2px solid #D6DBE6; font-size: 11px; color: #374151; }
  .nb-doc-table td { padding: 8px 11px; border-bottom: 1px solid #E5E8EF; }
  .nb-doc-table tbody tr:nth-child(even) td { background: #FAFBFD; }
  .nb-doc-foot { margin-top: 14px; font-size: 11px; color: #9CA3AF; text-align: left; }
`;

/* ─────────────────────────── طباعة ─────────────────────────── */
export function printDoc(meta: ExportMeta, columns: ExportColumn[], rows: any[]): void {
  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${meta.title}</title>
    <style>${DOC_CSS}@media print{.nb-doc{padding:0}}</style></head>
    <body>${renderDocHtml(meta, columns, rows)}<script>window.onload=()=>window.print()</script></body></html>`;
  const w = window.open('', '_blank', 'width=980,height=720');
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

  // حاوية مخفية بعرض A4 (794px ≈ 210mm عند 96dpi) لتصوير المحتوى العربي المُنسّق
  const holder = document.createElement('div');
  holder.setAttribute('dir', 'rtl');
  holder.style.cssText = 'position:fixed; top:0; inset-inline-start:-10000px; width:794px; background:#fff; z-index:-1;';
  holder.innerHTML = `<style>${DOC_CSS}</style>${renderDocHtml(meta, columns, rows)}`;
  document.body.appendChild(holder);

  try {
    const canvas = await html2canvas(holder, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const pdf = new JsPDF('p', 'mm', 'a4');
    const pageW = 210;
    const pageH = 297;
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
