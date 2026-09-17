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

const BRAND = 'نبراس — نظام إدارة المدارس والتحصيل المالي';
const BRAND_COLOR = '#0057B8';
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
 * طباعة تقرير مالي رسمي للطلاب بصيغة A4
 */
export function printStudentFinanceReport(
  title: string,
  columns: ExportColumn[],
  rows: any[],
  filterInfo: string,
  kpis?: Array<{ label: string; value: string; sub?: string }>,
  customGrandTotal?: number
): void {
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
        <span class="tafqeet-label">الإجمالي تفقيطاً:</span>
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

    /* ترويسة المدرسة الرسمية */
    .doc-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      border-bottom: 3px solid ${BRAND_COLOR}; padding-bottom: 14px; margin-bottom: 16px;
    }
    .header-main h1 { font-size: 18px; color: #111827; margin-bottom: 4px; font-weight: 800; }
    .header-main .sub { font-size: 11.5px; color: #4B5563; }
    .header-brand { text-align: left; }
    .header-brand .brand-name { font-size: 13px; font-weight: 700; color: ${BRAND_COLOR}; }
    .header-brand .brand-date { font-size: 10px; color: #6B7280; margin-top: 3px; }
    .header-brand .ministry { font-size: 9.5px; color: #6B7280; margin-top: 2px; font-weight: 600; }

    /* شريط الفلاتر والمعلومات */
    .filter-bar { font-size: 11px; color: #374151; margin-bottom: 14px; padding: 8px 12px;
      background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; display: flex; justify-content: space-between; }

    /* مؤشرات الأداء */
    .kpi-strip { display: flex; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
    .kpi { flex: 1; min-width: 130px; padding: 10px 12px; background: #F3F4F6; border-radius: 6px;
      border-right: 3px solid ${BRAND_COLOR}; }
    .kpi-l { display: block; font-size: 9.5px; color: #6B7280; font-weight: 600; }
    .kpi-v { display: block; font-size: 15px; font-weight: 800; color: #111827; margin-top: 2px; font-variant-numeric: tabular-nums; }
    .kpi-s { display: block; font-size: 9px; color: #9CA3AF; margin-top: 1px; }

    /* جدول التقرير */
    .report-tbl { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px; }
    .report-tbl th { background: #EEF3FB; padding: 8px 10px; border-bottom: 2px solid #D6DBE6;
      font-size: 10px; font-weight: 700; color: #1F2937; }
    .report-tbl td { padding: 7px 10px; border-bottom: 1px solid #E5E8EF; color: #111827; }
    .report-tbl tbody tr:nth-child(even) td { background: #FAFBFD; }
    .report-tbl .bold { font-weight: 700; }
    .report-tbl .total-row td {
      background: #EEF3FB !important; font-weight: 800; font-size: 11.5px;
      border-top: 2px solid ${BRAND_COLOR}; border-bottom: 2px double ${BRAND_COLOR};
    }
    .report-tbl .sub-total td { background: #F3F4F6 !important; font-weight: 700; border-top: 1px solid #D1D5DB; }

    /* تفقيط */
    .tafqeet { padding: 10px 14px; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 6px;
      font-size: 12px; margin-bottom: 14px; }
    .tafqeet-label { font-weight: 700; color: #92400E; }
    .tafqeet-text { color: #78350F; }

    /* التوقيعات الرسمية */
    .signatures {
      display: flex; justify-content: space-between; gap: 20px; margin-top: 28px;
      padding-top: 16px; border-top: 1px dashed #D1D5DB;
    }
    .sig { flex: 1; text-align: center; }
    .sig-label { font-size: 10px; color: #6B7280; margin-bottom: 24px; display: block; }
    .sig-line { border-top: 1px solid #374151; padding-top: 6px; font-size: 11px; font-weight: 600; color: #111827; }

    /* تذييل */
    .doc-footer { text-align: center; font-size: 9px; color: #9CA3AF; margin-top: 20px; padding-top: 10px; border-top: 1px solid #E5E7EB; }
  </style>
</head>
<body>
  <div class="doc">
    <div class="doc-header">
      <div class="header-main">
        <h1>${title}</h1>
        <div class="sub">حسابات الطلاب المالية والقبض &nbsp;•&nbsp; ${filterInfo}</div>
      </div>
      <div class="header-brand">
        <div class="brand-name">${BRAND}</div>
        <div class="brand-date">${timestamp()}</div>
        <div class="ministry">${MINISTRY}</div>
      </div>
    </div>

    <div class="filter-bar">
      <span>📅 ${filterInfo}</span>
      <span>💰 العملة: <strong>الجنيه السوداني (ج.س / SDG)</strong></span>
    </div>

    ${kpiHtml}

    <table class="report-tbl">
      <thead><tr>${theadHtml}</tr></thead>
      <tbody>${tbodyHtml}</tbody>
    </table>

    ${tafqeetHtml}

    <div class="signatures">
      <div class="sig">
        <span class="sig-label">إعداد الموظف المختص</span>
        <div class="sig-line">محاسب شؤون الطلاب والقبض</div>
      </div>
      <div class="sig">
        <span class="sig-label">تدقيق ومراجعة</span>
        <div class="sig-line">المراقب المالي الداخلي</div>
      </div>
      <div class="sig">
        <span class="sig-label">اعتماد رسمي</span>
        <div class="sig-line">المدير المالي والإداري / الختم الرسمي</div>
      </div>
    </div>

    <div class="doc-footer">
      ${BRAND} &nbsp;•&nbsp; جميع المعاملات بالجنيه السوداني &nbsp;•&nbsp; سجلات: ${rows.length} &nbsp;•&nbsp; تاريخ الطباعة: ${timestamp()}
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
}): void {
  const html = `<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>شهادة براءة ذمة مالية — ${student.student_name}</title>
  <style>
    * { font-family: 'Segoe UI', Tahoma, 'Arial', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; color: #111827; }
    @page { size: A4 portrait; margin: 15mm 20mm; }
    .cert { padding: 30px; max-width: 210mm; margin: 0 auto; border: 4px double #0057B8; border-radius: 8px; position: relative; }
    .header { text-align: center; border-bottom: 2px solid #0057B8; padding-bottom: 15px; margin-bottom: 25px; }
    .header h2 { font-size: 14px; color: #4B5563; margin-bottom: 4px; }
    .header h1 { font-size: 24px; color: #0057B8; margin-bottom: 6px; font-weight: 800; }
    .header .sub { font-size: 11px; color: #6B7280; }
    .body { font-size: 14px; line-height: 2; margin-bottom: 30px; text-align: justify; }
    .highlight { font-weight: 700; color: #1E3A8A; background: #EEF3FB; padding: 2px 8px; border-radius: 4px; }
    .info-box { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .info-row:last-child { margin-bottom: 0; }
    .signatures { display: flex; justify-content: space-between; margin-top: 50px; text-align: center; }
    .sig { width: 160px; }
    .sig-line { border-top: 1px solid #374151; margin-top: 50px; padding-top: 8px; font-size: 12px; font-weight: 700; }
    .stamp-box { width: 120px; height: 120px; border: 2px dashed #9CA3AF; border-radius: 50%; display: grid; place-items: center; font-size: 11px; color: #9CA3AF; margin: 20px auto 0; }
  </style>
</head>
<body>
  <div class="cert">
    <div class="header">
      <h2>${MINISTRY}</h2>
      <h1>إفادة براءة ذمة مالية رسمية</h1>
      <div class="sub">العام الدراسي: ${student.academic_year || '2025 - 2026 م'} &nbsp;|&nbsp; التاريخ: ${timestamp()}</div>
    </div>

    <div class="body">
      تشهد الإدارة المالية وإدارة حسابات الطلاب بأن الطالب/ـة: <span class="highlight">${student.student_name}</span>،
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
        <div class="stamp-box">ختم المدرسة الرسمي</div>
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
}): void {
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
    * { font-family: 'Segoe UI', Tahoma, 'Arial', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; color: #111827; }
    @page { size: A4 portrait; margin: 15mm 20mm; }
    .notice { padding: 30px; max-width: 210mm; margin: 0 auto; border: 2px solid #DC2626; border-radius: 8px; }
    .header { text-align: center; border-bottom: 2px solid #DC2626; padding-bottom: 12px; margin-bottom: 20px; }
    .header h2 { font-size: 13px; color: #6B7280; }
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
      <h2>${MINISTRY}</h2>
      <h1>إشعار مطالبة مالية وتذكير بالسداد</h1>
      <div>التاريخ: ${timestamp()} &nbsp;|&nbsp; رقم الحساب: ${student.account_number}</div>
    </div>

    <div class="body">
      <strong>السيد ولي أمر الطالب/ـة المحترم:</strong> ${student.guardian_name || student.student_name} (${student.guardian_phone || '—'})<br>
      <strong>الطالب:</strong> ${student.student_name} (رقم أكاديمي: ${student.student_number}) — <strong>الصف:</strong> ${student.grade_name || '—'}<br><br>
      نود تذكير عنايتكم الكريمة بوجود مستحقات دراسية متأخرة لم يتم سدادها حتى تاريخه، بإجمالي قدره:
      <strong style="color:#DC2626; font-size:16px;"> ${student.outstanding_balance.toLocaleString('en-US')} ج.س</strong>
      (${tafqeet(student.outstanding_balance)})، بفترة تأخير بلغت <strong>${student.days_overdue} يوماً</strong>.
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
 * طباعة إيصال / سند قبض مالي رسمي A4 للطالب بهوية وزارة التعليم والتربية الوطنية
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
}): void {
  const amountStr = (Number(receipt.amount) || 0).toLocaleString('en-US');
  const tafqeetStr = tafqeet(Number(receipt.amount) || 0);

  const html = `<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>سند قبض رسمي — ${receipt.receipt_number}</title>
  <style>
    * { font-family: 'Segoe UI', Tahoma, 'Arial', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; color: #111827; padding: 20px; }
    @page { size: A4 portrait; margin: 15mm 20mm; }
    .voucher { max-width: 210mm; margin: 0 auto; border: 2px solid #0057B8; border-radius: 8px; padding: 25px; position: relative; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0057B8; padding-bottom: 15px; margin-bottom: 20px; }
    .header .title-area h2 { font-size: 13px; color: #4B5563; }
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
    .signatures { display: flex; justify-content: space-between; margin-top: 45px; text-align: center; font-size: 12px; }
    .sig-box { width: 170px; }
    .sig-line { border-top: 1px solid #374151; margin-top: 40px; padding-top: 6px; font-weight: 700; }
    .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #9CA3AF; border-top: 1px dashed #E5E7EB; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="voucher">
    <div class="header">
      <div class="title-area">
        <h2>${MINISTRY}</h2>
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
        <div>الاعتماد المالي والختم</div>
        <div class="sig-line">المدير المالي</div>
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

