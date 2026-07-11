/**
 * أدوات تصدير وطباعة مشتركة لصفحات النظام المالي.
 * - exportCsv: يصدّر صفوفاً إلى ملف CSV متوافق مع Excel (يدعم العربية عبر BOM).
 * - printTable: يفتح نافذة طباعة منسّقة بترويسة نبراس واتجاه RTL.
 */

export interface ExportColumn {
  key: string;
  label: string;
  /** محوّل قيمة اختياري لعرض مخصص. */
  map?: (row: any) => string | number;
}

export function exportCsv(filename: string, columns: ExportColumn[], rows: any[]): void {
  const esc = (v: any) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => esc(c.label)).join(',');
  const body = rows
    .map((r) => columns.map((c) => esc(c.map ? c.map(r) : r[c.key])).join(','))
    .join('\n');
  const csv = '﻿' + header + '\n' + body; // BOM لدعم العربية في Excel
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printTable(title: string, columns: ExportColumn[], rows: any[], subtitle = ''): void {
  const head = columns.map((c) => `<th>${c.label}</th>`).join('');
  const body = rows
    .map((r) => '<tr>' + columns.map((c) => `<td>${c.map ? c.map(r) : r[c.key] ?? ''}</td>`).join('') + '</tr>')
    .join('');
  const stamp = new Date().toLocaleString('en-GB');
  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${title}</title>
    <style>
      * { font-family: 'Segoe UI', Tahoma, sans-serif; }
      body { margin: 28px; color: #111; }
      .head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0057B8; padding-bottom: 10px; margin-bottom: 16px; }
      h1 { font-size: 18px; margin: 0; }
      .sub { font-size: 12px; color: #555; margin-top: 4px; }
      .brand { font-size: 13px; font-weight: 700; color: #0057B8; }
      .stamp { font-size: 11px; color: #777; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { background: #f0f3f8; text-align: start; padding: 8px 10px; border-bottom: 2px solid #d6dbe6; font-size: 11px; }
      td { padding: 7px 10px; border-bottom: 1px solid #e5e8ef; }
      tr:nth-child(even) td { background: #fafbfd; }
      @media print { body { margin: 0; } }
    </style></head><body>
      <div class="head">
        <div><h1>${title}</h1>${subtitle ? `<div class="sub">${subtitle}</div>` : ''}</div>
        <div style="text-align:end"><div class="brand">نبراس — النظام المالي</div><div class="stamp">${stamp}</div></div>
      </div>
      <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
      <script>window.onload = () => { window.print(); }</script>
    </body></html>`;
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
