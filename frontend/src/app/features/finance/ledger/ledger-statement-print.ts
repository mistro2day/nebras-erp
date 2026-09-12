import { tafqeetArabic } from '../journals/journal-voucher-print';

/**
 * محرك طباعة كشف حساب دفتر الأستاذ العام الرسمي (General Ledger Statement)
 * مصمم ليحتوي كشف الحساب في صفحة A4 واحدة (Single Page A4) أو متصلة بترويسة وفوتر المستأجر الرسمي.
 */
export function printLedgerStatement(account: any, entries: any[], tenantInfo?: any, printedBy?: string): void {
  if (!entries) return;

  const schoolNameAr = tenantInfo?.nameAr || tenantInfo?.name || 'مدارس النبراس النموذجية الأهلية';
  const schoolNameEn = tenantInfo?.nameEn || 'Nebras Model Educational Schools';
  const logoUrl = tenantInfo?.logoUrl || '/assets/images/branding/nebras_official_blue.png';
  const phone = tenantInfo?.phone || '0912300000';
  const email = tenantInfo?.email || 'finance@nebras-edu.sd';
  const address = tenantInfo?.address || 'جمهورية السودان — ولاية الخرطوم — قطاع التعليم الخاص';

  const totalDebit = entries.reduce((s: number, e: any) => s + (Number(e.debit) || 0), 0);
  const totalCredit = entries.reduce((s: number, e: any) => s + (Number(e.credit) || 0), 0);
  const finalBalance = entries.length > 0 ? (Number(entries[entries.length - 1].balance_snapshot) || 0) : 0;
  const tafqeetText = tafqeetArabic(Math.abs(finalBalance), 'جنيه سوداني');

  const now = new Date();
  const printTimestamp = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString('ar-SD', { hour: '2-digit', minute: '2-digit' })}`;

  const rowsHtml = entries.map((e: any, idx: number) => `
    <tr>
      <td class="center mono">${idx + 1}</td>
      <td class="mono">${e.date}</td>
      <td class="mono font-bold text-info">${e.entry_number || '—'}</td>
      <td class="mono text-muted">${e.reference || '—'}</td>
      <td><strong>${e.partner_name || '—'}</strong></td>
      <td class="desc-cell">${e.line_description || '—'}</td>
      <td class="end mono text-info">${+e.debit > 0 ? Number(e.debit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</td>
      <td class="end mono text-success">${+e.credit > 0 ? Number(e.credit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</td>
      <td class="end mono font-bold">${Number(e.balance_snapshot).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  const html = `<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>كشف حساب دفتر الأستاذ العام - ${account ? (account.code + ' ' + account.name_ar) : 'كافة الحسابات'}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 10mm 8mm 10mm; }
    * { box-sizing: border-box; font-family: 'Segoe UI', 'Tajawal', Tahoma, Arial, sans-serif; }
    html, body {
      margin: 0; padding: 0; background: #ffffff; color: #0f172a; font-size: 11px; line-height: 1.35; direction: rtl;
    }
    .print-sheet { width: 100%; max-width: 100%; margin: 0 auto; padding: 0; page-break-inside: avoid; break-inside: avoid; }
    .tenant-header {
      display: flex; justify-content: space-between; align-items: center;
      border-bottom: 2px solid #1e3a8a; padding-bottom: 6px; margin-bottom: 8px;
    }
    .country-line { font-size: 9.5px; font-weight: 700; color: #475569; margin: 0 0 2px 0; }
    .org-name-ar { font-size: 16px; font-weight: 900; color: #1e3a8a; margin: 0 0 1px 0; line-height: 1.2; }
    .org-name-en { font-size: 10.5px; font-weight: 600; color: #64748b; margin: 0 0 2px 0; font-family: 'Segoe UI', Arial, sans-serif; }
    .contact-line { font-size: 9.5px; color: #64748b; margin: 0; }
    .logo-box {
      width: 56px; height: 56px; display: flex; align-items: center; justify-content: center;
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 4px;
    }
    .logo-img { max-width: 100%; max-height: 100%; object-fit: contain; }

    .doc-banner {
      display: flex; justify-content: space-between; align-items: center;
      background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
      color: #ffffff; border-radius: 6px; padding: 6px 12px; margin-bottom: 8px;
    }
    .doc-banner h1 { margin: 0; font-size: 14px; font-weight: 900; }
    .doc-banner span { font-size: 9px; font-weight: 600; opacity: 0.9; text-transform: uppercase; }

    .meta-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px 12px;
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; margin-bottom: 8px;
    }
    .meta-col .k { font-size: 9px; font-weight: 700; color: #64748b; display: block; }
    .meta-col .v { font-size: 11px; font-weight: 700; color: #0f172a; }

    .table-container { margin-bottom: 8px; }
    .ledger-table { width: 100%; border-collapse: collapse; font-size: 10px; }
    .ledger-table th {
      background: #1e3a8a; color: #ffffff; padding: 5px 6px; font-weight: 700; font-size: 9.5px;
      border: 1px solid #1e3a8a; text-align: start;
    }
    .ledger-table td { padding: 4px 6px; border: 1px solid #e2e8f0; color: #1e293b; }
    .ledger-table tbody tr:nth-child(even) { background: #f8fafc; }
    .ledger-table tfoot td { background: #f1f5f9; font-weight: 800; border-top: 2px solid #cbd5e1; padding: 5px 6px; }

    .tafqeet-box {
      background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 5px 10px; margin-bottom: 8px;
      display: flex; justify-content: space-between; align-items: center; font-size: 10.5px;
    }
    .t-title { font-weight: 800; color: #1e40af; }
    .t-words { font-weight: 700; color: #0f172a; }
    .balance-tag { background: #dcfce7; color: #15803d; padding: 2px 7px; border-radius: 3px; font-weight: 800; font-size: 10px; }

    .signatures-matrix {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 8px; margin-bottom: 8px;
      page-break-inside: avoid; break-inside: avoid;
    }
    .sig-col { border: 1px solid #e2e8f0; border-radius: 6px; padding: 5px; text-align: center; background: #fff; }
    .sig-label { display: block; font-size: 9.5px; font-weight: 800; color: #1e3a8a; border-bottom: 1px dashed #cbd5e1; padding-bottom: 2px; margin-bottom: 20px; }
    .sig-sign { display: block; font-size: 9px; color: #94a3b8; }

    .tenant-footer {
      border-top: 1.5px solid #cbd5e1; padding-top: 5px; display: flex; justify-content: space-between;
      align-items: center; font-size: 9.5px; color: #64748b; page-break-inside: avoid; break-inside: avoid;
    }
    .mono { font-family: 'Consolas', 'Courier New', monospace; font-variant-numeric: tabular-nums; }
    .end { text-align: end; }
    .center { text-align: center; }
    .font-bold { font-weight: 700; }
    .text-muted { color: #64748b; }
    .text-info { color: #0284c7; }
    .text-success { color: #16a34a; }
    .desc-cell { font-size: 9.5px; color: #475569; max-width: 190px; }

    @media print {
      html, body { width: 100%; height: auto; background: #fff; }
      .print-sheet { padding: 0; max-width: 100%; page-break-after: avoid; break-after: avoid; }
      .doc-banner, .ledger-table th, .tafqeet-box, .signatures-matrix { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tr { page-break-inside: avoid; break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="print-sheet">
    <header class="tenant-header">
      <div>
        <p class="country-line">جمهورية السودان • وزارة التربية والتعليم • قطاع التعليم الخاص</p>
        <h2 class="org-name-ar">${schoolNameAr}</h2>
        <h4 class="org-name-en">${schoolNameEn}</h4>
        <p class="contact-line">📍 ${address} • هاتف: ${phone}</p>
      </div>
      <div class="logo-box">
        ${logoUrl ? `<img src="${logoUrl}" alt="الشعار" class="logo-img" onerror="this.style.display='none'" />` : ''}
      </div>
    </header>

    <div class="doc-banner">
      <div>
        <h1>كـشـف حـسـاب دَفـتـر الأُسـتـاذ الـعـام</h1>
        <span>OFFICIAL GENERAL LEDGER ACCOUNT STATEMENT</span>
      </div>
      <div>
        <span style="font-weight:700; font-size:11px;">العملة: الجنيه السوداني (ج.س)</span>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-col">
        <span class="k">الحساب المحاسبي:</span>
        <span class="v">${account ? `${account.code} - ${account.name_ar}` : 'كافة الحسابات الإجمالية'}</span>
      </div>
      <div class="meta-col">
        <span class="k">إجمالي المدين (ج.س):</span>
        <span class="v mono text-info">${totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
      <div class="meta-col">
        <span class="k">إجمالي الدائن (ج.س):</span>
        <span class="v mono text-success">${totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
      <div class="meta-col">
        <span class="k">الرصيد الختامي (ج.س):</span>
        <span class="v mono font-bold">${finalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
    </div>

    <div class="table-container">
      <table class="ledger-table">
        <thead>
          <tr>
            <th style="width: 25px;" class="center">#</th>
            <th style="width: 70px;">التاريخ</th>
            <th style="width: 90px;">رقم القيد</th>
            <th style="width: 80px;">المرجع</th>
            <th style="width: 100px;">الطرف المعني</th>
            <th>البيان والشرح التفصيلي</th>
            <th style="width: 85px;" class="end">مدين (ج.س)</th>
            <th style="width: 85px;" class="end">دائن (ج.س)</th>
            <th style="width: 95px;" class="end">الرصيد (ج.س)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="6"><strong>الإجمالي الكلي التراكمي:</strong></td>
            <td class="end mono text-info"><strong>${totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
            <td class="end mono text-success"><strong>${totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
            <td class="end mono font-bold"><strong>${finalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="tafqeet-box">
      <div>
        <span class="t-title">الرصيد كتابةً: </span>
        <span class="t-words">${tafqeetText}</span>
      </div>
      <div>
        <span class="balance-tag">✓ حركات مرحلة معتمدة</span>
      </div>
    </div>

    <div class="signatures-matrix">
      <div class="sig-col">
        <span class="sig-label">إعداد المحاسب</span>
        <span class="sig-sign">${printedBy || 'المحاسب المعتمد'}</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">المراجعة والتدقيق</span>
        <span class="sig-sign">المراجع الداخلي</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">الاعتماد المالي</span>
        <span class="sig-sign">المدير المالي</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">الختم المالي الرسمي</span>
        <span class="sig-sign">ختم المؤسسة المعتمد</span>
      </div>
    </div>

    <footer class="tenant-footer">
      <div>منظومة <strong>نبراس (Nebras OS)</strong> • دفتر الأستاذ العام وقيود اليومية</div>
      <div class="mono">تاريخ الطباعة: ${printTimestamp}</div>
    </footer>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  </script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=1000,height=800,menubar=no,toolbar=no,location=no,status=no');
  if (!w) {
    console.warn('تعذر فتح نافذة الطباعة.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
