/**
 * دالة تفقيط الأرقام وتحويلها إلى كلمات باللغة العربية (جنيه سوداني)
 */
export function tafqeetArabic(num: number, currency = 'جنيه سوداني'): string {
  if (!num || num <= 0) return 'صفر ' + currency;
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertGroup(n: number): string {
    let res = '';
    const h = Math.floor(n / 100);
    const rem = n % 100;
    if (h > 0) res += hundreds[h];
    if (rem > 0) {
      if (res) res += ' و';
      if (rem < 20) {
        res += ones[rem];
      } else {
        const t = Math.floor(rem / 10);
        const o = rem % 10;
        if (o > 0) res += ones[o] + ' و';
        res += tens[t];
      }
    }
    return res;
  }

  const intPart = Math.floor(num);
  let words = '';
  const millions = Math.floor(intPart / 1000000);
  const thousands = Math.floor((intPart % 1000000) / 1000);
  const rem = intPart % 1000;

  if (millions > 0) {
    if (millions === 1) words += 'مليون';
    else if (millions === 2) words += 'مليونان';
    else if (millions >= 3 && millions <= 10) words += convertGroup(millions) + ' ملايين';
    else words += convertGroup(millions) + ' مليون';
  }

  if (thousands > 0) {
    if (words) words += ' و';
    if (thousands === 1) words += 'ألف';
    else if (thousands === 2) words += 'ألفان';
    else if (thousands >= 3 && thousands <= 10) words += convertGroup(thousands) + ' آلاف';
    else words += convertGroup(thousands) + ' ألف';
  }

  if (rem > 0) {
    if (words) words += ' و';
    words += convertGroup(rem);
  }

  return `فقط ${words} ${currency} لا غير`;
}

/**
 * طباعة سند قيد اليومية المحاسبي الرسمي بهوية نظام نبراس وترويسة وفوتر المستأجر
 * مستوحى من Odoo 18 و Microsoft Dynamics 365 Finance.
 */
export function printJournalVoucher(journal: any, tenantInfo?: any, printedBy?: string): void {
  if (!journal) return;

  const schoolNameAr = tenantInfo?.nameAr || tenantInfo?.name || 'مدارس النبراس النموذجية الأهلية';
  const schoolNameEn = tenantInfo?.nameEn || 'Nebras Model Educational Schools';
  const logoUrl = tenantInfo?.logoUrl || '/assets/images/branding/nebras_official_blue.png';
  const phone = tenantInfo?.phone || '0912300000';
  const email = tenantInfo?.email || 'finance@nebras-edu.sd';
  const address = tenantInfo?.address || 'جمهورية السودان — ولاية الخرطوم — قطاع التعليم الخاص';

  const lines = journal.lines || [];
  const totalDebit = lines.reduce((s: number, l: any) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s: number, l: any) => s + (Number(l.credit) || 0), 0);
  const tafqeetText = tafqeetArabic(totalDebit, 'جنيه سوداني');
  const now = new Date();
  const printTimestamp = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString('ar-SD', { hour: '2-digit', minute: '2-digit' })}`;

  const partner = journal.partner_details;
  const src = journal.source_details;
  const feeBreakdown = journal.fee_breakdown || [];

  const linesHtml = lines.map((l: any, idx: number) => `
    <tr>
      <td class="center mono">${idx + 1}</td>
      <td class="mono font-bold">${l.account_code}</td>
      <td><strong>${l.account_name}</strong></td>
      <td class="text-muted">${l.cost_center_name || '—'}</td>
      <td class="desc-cell">${l.description || '—'}</td>
      <td class="end mono text-info">${+l.debit > 0 ? Number(l.debit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</td>
      <td class="end mono text-success">${+l.credit > 0 ? Number(l.credit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</td>
    </tr>
  `).join('');

  let partnerBlock = '';
  if (partner) {
    partnerBlock = `
      <div class="partner-box">
        <div class="p-header">
          <span class="badge-role">${partner.partner_type_label || 'الطرف المعني'}</span>
          <h3 class="p-name">${partner.name}</h3>
          ${partner.student_number ? `<span class="p-id mono">الرقم الأكاديمي: ${partner.student_number}</span>` : ''}
        </div>
        <div class="p-grid">
          ${partner.grade_name ? `<div><span class="lbl">الصف / المرحلة:</span> <span class="val">${partner.grade_name}</span></div>` : ''}
          ${partner.guardian_name ? `<div><span class="lbl">ولي الأمر:</span> <span class="val">${partner.guardian_name}</span></div>` : ''}
          ${src?.payment_method ? `<div><span class="lbl">طريقة الدفع:</span> <span class="val method-tag">${src.payment_method}</span></div>` : ''}
          ${src?.destination ? `<div><span class="lbl">الحساب المستلم:</span> <span class="val">${src.destination}</span></div>` : ''}
        </div>
      </div>
    `;
  }

  let feeBreakdownBlock = '';
  if (feeBreakdown.length > 0) {
    const feeRows = feeBreakdown.map((f: any) => `
      <tr>
        <td><strong>${f.fee_name}</strong></td>
        <td>${f.description || f.fee_name}</td>
        <td class="mono center">${f.invoice_number || '—'}</td>
        <td class="end mono font-bold">${Number(f.allocated_amount || f.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.س</td>
      </tr>
    `).join('');

    feeBreakdownBlock = `
      <div class="fee-section">
        <div class="fee-title">تفصيل بنود الرسوم والخدمات المسددة / المستحقة بالقيد:</div>
        <table class="fee-table">
          <thead>
            <tr>
              <th>بند الرسوم</th>
              <th>البيان والخدمة</th>
              <th class="center">الفاتورة المرجعية</th>
              <th class="end">المبلغ المخصص</th>
            </tr>
          </thead>
          <tbody>${feeRows}</tbody>
        </table>
      </div>
    `;
  }

  const statusMap: Record<string, string> = {
    draft: 'مسودة مبدئية',
    approved: 'قيد معتمد',
    posted: 'مرحل لدفتر الأستاذ العام',
    reversed: 'قيد محاسبي معكوس',
    cancelled: 'ملغي'
  };
  const statusLabel = statusMap[journal.status] || journal.status;

  const html = `<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>سند قيد محاسبي ${journal.entry_number}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 12mm 16mm 12mm;
    }
    * { box-sizing: border-box; font-family: 'Segoe UI', 'Tajawal', Tahoma, Arial, sans-serif; }
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-size: 12.5px;
      line-height: 1.4;
      direction: rtl;
    }
    .print-sheet {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      padding: 10px;
    }

    /* ترويسة المستأجر الرسمية */
    .tenant-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2.5px solid #1e3a8a;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .org-meta {
      flex: 1;
    }
    .country-line {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      margin: 0 0 3px 0;
    }
    .org-name-ar {
      font-size: 20px;
      font-weight: 900;
      color: #1e3a8a;
      margin: 0 0 2px 0;
    }
    .org-name-en {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      margin: 0 0 4px 0;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
    .contact-line {
      font-size: 10.5px;
      color: #64748b;
      margin: 0;
    }
    .logo-box {
      flex: none;
      width: 75px;
      height: 75px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 6px;
    }
    .logo-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .logo-placeholder {
      font-size: 32px;
    }

    /* شريط عنوان السند */
    .doc-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
      color: #ffffff;
      border-radius: 8px;
      padding: 10px 16px;
      margin-bottom: 14px;
    }
    .doc-titles h1 {
      margin: 0;
      font-size: 17px;
      font-weight: 900;
      letter-spacing: -0.2px;
    }
    .doc-titles span {
      font-size: 10px;
      font-weight: 600;
      opacity: 0.85;
      text-transform: uppercase;
      display: block;
      margin-top: 2px;
    }
    .doc-badge-wrap {
      text-align: end;
    }
    .status-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.4);
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
    }

    /* شبكة تفاصيل القيد */
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
    }
    .meta-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .meta-col .k {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
    }
    .meta-col .v {
      font-size: 12.5px;
      font-weight: 700;
      color: #0f172a;
    }

    /* البيان العام */
    .description-box {
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 14px;
      font-size: 12px;
      color: #334155;
    }
    .description-box strong {
      color: #1e3a8a;
      margin-inline-end: 6px;
    }

    /* بطاقة الشريك / الطالب */
    .partner-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
    }
    .p-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }
    .badge-role {
      background: #dcfce7;
      color: #166534;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 10.5px;
      font-weight: 700;
    }
    .p-name {
      margin: 0;
      font-size: 14px;
      font-weight: 800;
      color: #14532d;
    }
    .p-id {
      font-size: 11.5px;
      color: #166534;
      margin-inline-start: auto;
    }
    .p-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px 14px;
      font-size: 11.5px;
      border-top: 1px dashed #bbf7d0;
      padding-top: 6px;
    }
    .p-grid .lbl { color: #475569; }
    .p-grid .val { font-weight: 700; color: #1e293b; }
    .method-tag { background: #e0e7ff; color: #3730a3; padding: 1px 6px; border-radius: 4px; }

    /* جدول أسطر القيد المزدوج */
    .table-container {
      margin-bottom: 12px;
    }
    .journal-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .journal-table th {
      background: #1e3a8a;
      color: #ffffff;
      padding: 8px 10px;
      font-weight: 700;
      font-size: 11px;
      border: 1px solid #1e3a8a;
      text-align: start;
    }
    .journal-table td {
      padding: 7px 10px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .journal-table tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    .journal-table tfoot td {
      background: #f1f5f9;
      font-weight: 800;
      border-top: 2px solid #cbd5e1;
      padding: 9px 10px;
    }

    /* التفقيط والتوازن */
    .tafqeet-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 9px 14px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }
    .t-title { font-weight: 800; color: #1e40af; }
    .t-words { font-weight: 700; color: #0f172a; }
    .balance-tag {
      background: #dcfce7;
      color: #15803d;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 800;
      font-size: 11px;
    }

    /* جدول بنود الرسوم */
    .fee-section {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 14px;
    }
    .fee-title {
      font-size: 11px;
      font-weight: 800;
      color: #475569;
      margin-bottom: 6px;
    }
    .fee-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .fee-table th { background: #f8fafc; padding: 5px 8px; border: 1px solid #e2e8f0; color: #475569; }
    .fee-table td { padding: 5px 8px; border: 1px solid #e2e8f0; }

    /* مصفوفة التوقيعات والاعتمادات */
    .signatures-matrix {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-top: 16px;
      margin-bottom: 16px;
    }
    .sig-col {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px;
      text-align: center;
      background: #ffffff;
    }
    .sig-label {
      display: block;
      font-size: 11px;
      font-weight: 800;
      color: #1e3a8a;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 5px;
      margin-bottom: 35px;
    }
    .sig-sign {
      display: block;
      font-size: 10px;
      color: #94a3b8;
    }

    /* تذييل المستأجر وهوية نبراس */
    .tenant-footer {
      border-top: 1.5px solid #cbd5e1;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10.5px;
      color: #64748b;
    }
    .f-brand strong { color: #1e3a8a; }
    .f-qr {
      font-family: monospace;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
    }

    /* أدوات */
    .mono { font-family: 'Consolas', 'Courier New', monospace; font-variant-numeric: tabular-nums; }
    .end { text-align: end; }
    .center { text-align: center; }
    .font-bold { font-weight: 700; }
    .text-muted { color: #64748b; }
    .text-info { color: #0284c7; }
    .text-success { color: #16a34a; }
    .desc-cell { font-size: 11.5px; color: #475569; }

    @media print {
      body { background: #fff; }
      .print-sheet { padding: 0; max-width: 100%; }
      .doc-banner { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .journal-table th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .partner-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .tafqeet-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="print-sheet">
    <!-- 1. ترويسة المستأجر الرسمية -->
    <header class="tenant-header">
      <div class="org-meta">
        <p class="country-line">جمهورية السودان • وزارة التربية والتعليم • قطاع التعليم الخاص</p>
        <h2 class="org-name-ar">${schoolNameAr}</h2>
        <h4 class="org-name-en">${schoolNameEn}</h4>
        <p class="contact-line">📍 ${address} • هاتف: ${phone} • بريد: ${email}</p>
      </div>
      <div class="logo-box">
        ${logoUrl ? `<img src="${logoUrl}" alt="شعار المدرسة" class="logo-img" onerror="this.style.display='none';this.nextElementSibling.style.display='block'" /><span class="logo-placeholder" style="display:none;">🏛️</span>` : '<span class="logo-placeholder">🏛️</span>'}
      </div>
    </header>

    <!-- 2. شريط عنوان المستند -->
    <div class="doc-banner">
      <div class="doc-titles">
        <h1>سـنـد قـيـد يـومـيـة مـحـاسـبـي</h1>
        <span>OFFICIAL GENERAL JOURNAL VOUCHER</span>
      </div>
      <div class="doc-badge-wrap">
        <span class="status-badge">${statusLabel}</span>
      </div>
    </div>

    <!-- 3. بيانات القيد المالي -->
    <div class="meta-grid">
      <div class="meta-col">
        <span class="k">رقم القيد:</span>
        <span class="v mono">${journal.entry_number}</span>
      </div>
      <div class="meta-col">
        <span class="k">تاريخ القيد:</span>
        <span class="v mono">${journal.date}</span>
      </div>
      <div class="meta-col">
        <span class="k">المستند المرجعي:</span>
        <span class="v mono">${journal.reference || '—'}</span>
      </div>
      <div class="meta-col">
        <span class="k">العملة المعتمدة:</span>
        <span class="v">${journal.currency?.name_ar || 'الجنيه السوداني (ج.س)'}</span>
      </div>
    </div>

    <!-- البيان المحاسبي العام للقيد -->
    <div class="description-box">
      <strong>البيان / الوصف:</strong> ${journal.description || 'لا يوجد بيان إضافي'}
    </div>

    <!-- 4. بطاقة الطرف / الطالب (إن وُجد) -->
    ${partnerBlock}

    <!-- 5. تفصيل بنود الرسوم (إن وُجدت) -->
    ${feeBreakdownBlock}

    <!-- 6. جدول أسطر القيد المزدوج -->
    <div class="table-container">
      <table class="journal-table">
        <thead>
          <tr>
            <th style="width: 30px;" class="center">#</th>
            <th style="width: 85px;">رقم الحساب</th>
            <th style="width: 170px;">اسم الحساب</th>
            <th style="width: 100px;">مركز التكلفة</th>
            <th>البيان والشرح التفصيلي</th>
            <th style="width: 110px;" class="end">مدين (ج.س)</th>
            <th style="width: 110px;" class="end">دائن (ج.س)</th>
          </tr>
        </thead>
        <tbody>
          ${linesHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5" style="text-align: start;"><strong>الإجمالي الكلي المتوازن:</strong></td>
            <td class="end mono text-info"><strong>${totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
            <td class="end mono text-success"><strong>${totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- 7. شريط التفقيط والتوازن -->
    <div class="tafqeet-box">
      <div>
        <span class="t-title">المبلغ كتابةً: </span>
        <span class="t-words">${tafqeetText}</span>
      </div>
      <div>
        <span class="balance-tag">✓ القيد متوازن ومطابق</span>
      </div>
    </div>

    <!-- 8. مصفوفة التوقيعات والاعتمادات المحاسبية -->
    <div class="signatures-matrix">
      <div class="sig-col">
        <span class="sig-label">إعداد المحاسب</span>
        <span class="sig-sign">${journal.created_by_name || 'توقيع المحاسب المختص'}</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">المراجعة والتدقيق</span>
        <span class="sig-sign">المراجع المالي الداخلي</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">الاعتماد المالي</span>
        <span class="sig-sign">${journal.approved_by ? 'معتمد إدارياً' : 'المدير المالي'}</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">الختم المالي الرسمي</span>
        <span class="sig-sign">ختم المؤسسة المعتمد</span>
      </div>
    </div>

    <!-- 9. تذييل المستأجر وهوية نبراس -->
    <footer class="tenant-footer">
      <div class="f-brand">
        منظومة <strong>نبراس (Nebras OS)</strong> لإدارة المؤسسات التعليمية • موديول الإدارة المالية والحسابات العامة
      </div>
      <div class="f-meta">
        <span class="f-qr">وثيقة مالية صادرة: ${journal.entry_number}</span>
        <span> • طُبعت بواسطة: ${printedBy || 'المحاسب المعتمد'} • ${printTimestamp}</span>
      </div>
    </footer>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=1000,height=800,menubar=no,toolbar=no,location=no,status=no');
  if (!w) {
    alert('يرجى السماح بالنوافذ المنبثقة للطباعة.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
