/**
 * محرك طباعة التقارير المالية الرسمية A4 — Nebras OS
 * ─────────────────────────────────────────────────────
 * يُولّد مستند HTML منسّق للطباعة بترويسة المدرسة الرسمية،
 * جدول التقرير بالجنيه السوداني (ج.س)، مؤشرات الأداء،
 * تفقيط المبالغ بالعربية، وتوقيعات المحاسب والمدير المالي.
 *
 * يعتمد على نفس نسق المطبوعات المستخدم في السندات والفواتير.
 */
import { ExportColumn } from '../../../shared/export/export.types';

const BRAND = 'نبراس — نظام إدارة المدارس';
const BRAND_COLOR = '#0057B8';

/**
 * تفقيط (تحويل رقم إلى نص عربي) — دعم حتى مليارات الجنيهات السودانية
 */
function tafqeet(num: number): string {
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
      else if (groups[i] === 2) part = scales[i] + (i === 1 ? 'ان' : 'ان');
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

function fmtNum(v: any): string {
  return (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function cellValue(col: ExportColumn, row: any): string {
  const v = col.map ? col.map(row) : row[col.key];
  return v == null ? '' : String(v);
}

/**
 * طباعة تقرير مالي رسمي بصيغة A4 مع ترويسة المدرسة وتوقيعات
 */
export function printFinancialReport(
  title: string,
  columns: ExportColumn[],
  rows: any[],
  filterInfo: string,
  kpis?: Array<{ label: string; value: string; sub?: string }>,
): void {
  // حساب الإجمالي الكلي من آخر صف Total
  const totalRow = [...rows].reverse().find((r: any) => r._isTotal);
  const grandTotal = totalRow
    ? Number(totalRow.credit ?? totalRow.amount ?? totalRow.balance ?? totalRow.debit ?? 0) || 0
    : 0;

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
        <span class="tafqeet-label">المبلغ تفقيطاً:</span>
        <span class="tafqeet-text">${tafqeet(grandTotal)} فقط لا غير</span>
       </div>`
    : '';

  const html = `<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>${title} — ${BRAND}</title>
  <style>
    * { font-family: 'Segoe UI', Tahoma, 'Arial', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; color: #111827; }
    @page { size: A4 portrait; margin: 12mm 15mm; }
    @media print { .no-print { display: none !important; } }

    .doc { padding: 24px; max-width: 210mm; margin: 0 auto; }

    /* ─── ترويسة المدرسة الرسمية ─── */
    .doc-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      border-bottom: 3px solid ${BRAND_COLOR}; padding-bottom: 14px; margin-bottom: 16px;
    }
    .header-main h1 { font-size: 18px; color: #111827; margin-bottom: 4px; }
    .header-main .sub { font-size: 11px; color: #6B7280; }
    .header-brand { text-align: left; }
    .header-brand .brand-name { font-size: 13px; font-weight: 700; color: ${BRAND_COLOR}; }
    .header-brand .brand-date { font-size: 10px; color: #9CA3AF; margin-top: 3px; }
    .header-brand .ministry { font-size: 9px; color: #9CA3AF; margin-top: 2px; }

    /* ─── شريط الفلاتر ─── */
    .filter-bar { font-size: 11px; color: #6B7280; margin-bottom: 14px; padding: 8px 12px;
      background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; }

    /* ─── مؤشرات الأداء ─── */
    .kpi-strip { display: flex; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
    .kpi { flex: 1; min-width: 140px; padding: 10px 12px; background: #F3F4F6; border-radius: 6px;
      border-right: 3px solid ${BRAND_COLOR}; }
    .kpi-l { display: block; font-size: 9.5px; color: #6B7280; font-weight: 600; letter-spacing: 0.3px; }
    .kpi-v { display: block; font-size: 16px; font-weight: 800; color: #111827; margin-top: 2px; font-variant-numeric: tabular-nums; }
    .kpi-s { display: block; font-size: 9px; color: #9CA3AF; margin-top: 1px; }

    /* ─── جدول التقرير ─── */
    .report-tbl { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px; }
    .report-tbl th { background: #EEF3FB; padding: 8px 10px; border-bottom: 2px solid #D6DBE6;
      font-size: 10px; font-weight: 700; color: #374151; }
    .report-tbl td { padding: 7px 10px; border-bottom: 1px solid #E5E8EF; color: #111827; }
    .report-tbl tbody tr:nth-child(even) td { background: #FAFBFD; }
    .report-tbl .bold { font-weight: 700; }
    .report-tbl .total-row td {
      background: #EEF3FB !important; font-weight: 800; font-size: 11.5px;
      border-top: 2px solid ${BRAND_COLOR}; border-bottom: 2px double ${BRAND_COLOR};
    }
    .report-tbl .sub-total td { background: #F3F4F6 !important; font-weight: 700; border-top: 1px solid #D1D5DB; }

    /* ─── تفقيط ─── */
    .tafqeet { padding: 10px 14px; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 6px;
      font-size: 12px; margin-bottom: 14px; }
    .tafqeet-label { font-weight: 700; color: #92400E; }
    .tafqeet-text { color: #78350F; }

    /* ─── التوقيعات ─── */
    .signatures {
      display: flex; justify-content: space-between; gap: 20px; margin-top: 30px;
      padding-top: 16px; border-top: 1px dashed #D1D5DB;
    }
    .sig { flex: 1; text-align: center; }
    .sig-label { font-size: 10px; color: #6B7280; margin-bottom: 26px; display: block; }
    .sig-line { border-top: 1px solid #374151; padding-top: 6px; font-size: 11px; font-weight: 600; color: #111827; }

    /* ─── تذييل ─── */
    .doc-footer { text-align: center; font-size: 9px; color: #9CA3AF; margin-top: 20px; padding-top: 10px; border-top: 1px solid #E5E7EB; }
  </style>
</head>
<body>
  <div class="doc">
    <div class="doc-header">
      <div class="header-main">
        <h1>${title}</h1>
        <div class="sub">${filterInfo}</div>
      </div>
      <div class="header-brand">
        <div class="brand-name">${BRAND}</div>
        <div class="brand-date">${timestamp()}</div>
        <div class="ministry">وزارة التعليم والتربية الوطنية — السودان</div>
      </div>
    </div>

    <div class="filter-bar">📅 ${filterInfo} &nbsp;|&nbsp; 💰 العملة: الجنيه السوداني (ج.س / SDG)</div>

    ${kpiHtml}

    <table class="report-tbl">
      <thead><tr>${theadHtml}</tr></thead>
      <tbody>${tbodyHtml}</tbody>
    </table>

    ${tafqeetHtml}

    <div class="signatures">
      <div class="sig">
        <span class="sig-label">إعداد</span>
        <div class="sig-line">المحاسب المسؤول</div>
      </div>
      <div class="sig">
        <span class="sig-label">مراجعة</span>
        <div class="sig-line">المراقب المالي</div>
      </div>
      <div class="sig">
        <span class="sig-label">اعتماد</span>
        <div class="sig-line">المدير المالي / مدير المدرسة</div>
      </div>
    </div>

    <div class="doc-footer">
      ${BRAND} &nbsp;•&nbsp; جميع المبالغ بالجنيه السوداني (ج.س) &nbsp;•&nbsp; عدد السجلات: ${rows.length} &nbsp;•&nbsp; ${timestamp()}
    </div>
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=980,height=720');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
