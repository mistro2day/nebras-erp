import { tafqeetArabic } from '../journals/journal-voucher-print';
import { getTenantPrintBranding } from '../../../core/helpers/tenant-print-branding';

/**
 * طباعة سند الصرف أو القبض المالي الرسمي بهوية المستأجر السوداني المعتمدة
 * صفحة واحدة A4 Portrait قياسية مع مصفوفة التوقيعات والختم المعتمد.
 */
export function printVoucher(voucher: any, tenantInfo?: any, printedBy?: string): void {
  if (!voucher) return;

  const branding = getTenantPrintBranding(tenantInfo);
  const schoolNameAr = branding.schoolNameAr;
  const schoolNameEn = branding.schoolNameEn;
  const logoUrl = branding.logoUrl;
  const phone = branding.phone;
  const email = branding.email;
  const address = branding.address;

  const isPayment = voucher.voucher_type === 'payment';
  const isReceipt = voucher.voucher_type === 'receipt';
  const docTitle = isPayment ? 'سند صرف مالي' : (isReceipt ? 'سند قبض مالي' : 'سند تسوية مالية');
  const docTypeEn = isPayment ? 'PAYMENT VOUCHER' : (isReceipt ? 'RECEIPT VOUCHER' : 'JOURNAL VOUCHER');
  const themeColor = isPayment ? '#991b1b' : (isReceipt ? '#065f46' : '#1e3a8a');
  const themeBg = isPayment ? '#fef2f2' : (isReceipt ? '#ecfdf5' : '#eff6ff');

  const amount = Number(voucher.amount) || 0;
  const tafqeetText = tafqeetArabic(amount, 'جنيه سوداني');
  const now = new Date();
  const printTimestamp = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString('ar-SD', { hour: '2-digit', minute: '2-digit' })}`;

  const statusMap: Record<string, string> = {
    draft: 'مسودة',
    approved: 'معتمد',
    posted: 'مرحّل لدفتر الأستاذ',
    cancelled: 'ملغي'
  };
  const statusLabel = statusMap[voucher.status] || voucher.status;

  const html = `<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>${docTitle} ${voucher.voucher_number}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm 8mm 10mm;
    }
    * { box-sizing: border-box; font-family: 'Segoe UI', 'Tajawal', Tahoma, Arial, sans-serif; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-size: 11.5px;
      line-height: 1.4;
      direction: rtl;
    }
    .print-sheet {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
      padding: 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* ترويسة المستأجر الرسمية */
    .tenant-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid ${themeColor};
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .org-meta { flex: 1; }
    .country-line {
      font-size: 10px;
      font-weight: 700;
      color: #475569;
      margin: 0 0 2px 0;
    }
    .org-name-ar {
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
      margin: 0 0 2px 0;
    }
    .org-name-en {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      margin: 0;
    }
    .brand-logo-wrap {
      padding: 0 16px;
      display: flex;
      justify-content: center;
    }
    .brand-logo {
      max-height: 60px;
      max-width: 120px;
      object-fit: contain;
    }
    .contact-meta {
      flex: 1;
      text-align: left;
      font-size: 10px;
      color: #475569;
      line-height: 1.5;
    }

    /* شريط عنوان السند */
    .doc-hero {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: ${themeBg};
      border: 1.5px solid ${themeColor};
      border-radius: 8px;
      padding: 10px 16px;
      margin-bottom: 14px;
    }
    .doc-hero-titles h1 {
      margin: 0;
      font-size: 19px;
      font-weight: 900;
      color: ${themeColor};
      letter-spacing: -0.3px;
    }
    .doc-hero-titles .sub-title {
      font-size: 10px;
      font-weight: 700;
      color: #475569;
      letter-spacing: 1px;
    }
    .doc-hero-badge {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .status-tag {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      background: #ffffff;
      border: 1px solid ${themeColor};
      color: ${themeColor};
    }

    /* بيانات السند الأساسية */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 14px;
    }
    .info-cell {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .info-cell .lbl {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
    }
    .info-cell .val {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
    }
    .mono { font-family: 'Consolas', 'Courier New', monospace; }

    /* بطاقة المبلغ الكبرى */
    .amount-highlight-box {
      border: 2px dashed ${themeColor};
      border-radius: 8px;
      background: #ffffff;
      padding: 12px 16px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .amount-num-wrap {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .amount-label {
      font-size: 12px;
      font-weight: 700;
      color: #475569;
    }
    .amount-large {
      font-size: 24px;
      font-weight: 900;
      color: ${themeColor};
    }
    .amount-currency {
      font-size: 12px;
      font-weight: 800;
      color: #475569;
    }
    .amount-tafqeet {
      font-size: 12px;
      font-weight: 700;
      color: #1e293b;
      background: #f1f5f9;
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }

    /* تفاصيل المحاسبة والحسابات */
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 11px;
    }
    .details-table th {
      background: #1e293b;
      color: #ffffff;
      font-weight: 700;
      padding: 7px 10px;
      text-align: right;
      border: 1px solid #334155;
    }
    .details-table td {
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .details-table tr:nth-child(even) { background: #f8fafc; }

    /* صندوق البيان والغرض */
    .desc-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 18px;
    }
    .desc-lbl {
      font-size: 10.5px;
      font-weight: 800;
      color: #475569;
      margin-bottom: 4px;
    }
    .desc-val {
      font-size: 12px;
      font-weight: 600;
      color: #0f172a;
      line-height: 1.5;
    }

    /* مصفوفة التوقيعات */
    .signatures-matrix {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 24px;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .sig-col {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 8px;
      text-align: center;
      background: #fafafa;
    }
    .sig-label {
      font-size: 10px;
      font-weight: 700;
      color: #475569;
      display: block;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 4px;
      margin-bottom: 35px;
    }
    .sig-sign {
      font-size: 10.5px;
      font-weight: 600;
      color: #64748b;
    }

    /* الفوتر */
    .tenant-footer {
      border-top: 1.5px solid #e2e8f0;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9.5px;
      color: #64748b;
    }
    .f-brand strong { color: #0f172a; }
  </style>
</head>
<body>
  <div class="print-sheet">
    <!-- الترويسة الرسمية -->
    <header class="tenant-header">
      <div class="org-meta">
        <div class="country-line">جمهورية السودان • وزارة التربية والتعليم</div>
        <h2 class="org-name-ar">${schoolNameAr}</h2>
        <div class="org-name-en">${schoolNameEn}</div>
      </div>
      <div class="brand-logo-wrap">
        <img src="${logoUrl}" alt="شعار المؤسسة" class="brand-logo" onerror="this.style.display='none'">
      </div>
      <div class="contact-meta">
        <div>العنوان: ${address}</div>
        <div>الهاتف: ${phone}</div>
        <div>البريد: ${email}</div>
      </div>
    </header>

    <!-- شريط عنوان السند -->
    <div class="doc-hero">
      <div class="doc-hero-titles">
        <h1>${docTitle}</h1>
        <span class="sub-title">${docTypeEn}</span>
      </div>
      <div class="doc-hero-badge">
        <span class="status-tag">${statusLabel}</span>
      </div>
    </div>

    <!-- شبكة معلومات السند -->
    <div class="info-grid">
      <div class="info-cell">
        <span class="lbl">رقم السند:</span>
        <span class="val mono">${voucher.voucher_number || '—'}</span>
      </div>
      <div class="info-cell">
        <span class="lbl">تاريخ السند:</span>
        <span class="val mono">${voucher.date || '—'}</span>
      </div>
      <div class="info-cell">
        <span class="lbl">طريقة الدفع / التحصيل:</span>
        <span class="val">${voucher.payment_method_name || 'تطبيق بنكك - بنك الخرطوم'}</span>
      </div>
      <div class="info-cell">
        <span class="lbl">الحساب البنكي / الخزينة:</span>
        <span class="val">${voucher.bank_account_name || voucher.cash_box_name || 'الخزينة النقدية الرئيسية'}</span>
      </div>
    </div>

    <!-- بطاقة المبلغ المميزة -->
    <div class="amount-highlight-box">
      <div class="amount-num-wrap">
        <span class="amount-label">${isPayment ? 'المبلغ المصروف:' : 'المبلغ المقبوض:'}</span>
        <span class="amount-large mono">${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span class="amount-currency">جنيه سوداني (ج.س)</span>
      </div>
      <div class="amount-tafqeet">
        ${tafqeetText}
      </div>
    </div>

    <!-- تفاصيل الحسابات والقيد -->
    <table class="details-table">
      <thead>
        <tr>
          <th>الحساب المقابل (دليل الحسابات GL)</th>
          <th>المصدر / الوجهة المالية</th>
          <th style="text-align: end;">المبلغ المسجل</th>
          <th style="text-align: center;">العملة</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${voucher.gl_account_name || voucher.gl_account || 'حساب المصروفات / الذمم'}</strong></td>
          <td>${voucher.bank_account_name || voucher.cash_box_name || 'حساب البنك / الصندوق'}</td>
          <td style="text-align: end;" class="mono font-bold">${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: center;">ج.س (SDG)</td>
        </tr>
      </tbody>
    </table>

    <!-- البيان والملاحظات -->
    <div class="desc-box">
      <div class="desc-lbl">البيان والغرض من السند:</div>
      <div class="desc-val">${voucher.description || 'لا يوجد بيان إضافي مدون بالسند.'}</div>
    </div>

    <!-- مصفوفة التوقيعات والاعتمادات -->
    <div class="signatures-matrix">
      <div class="sig-col">
        <span class="sig-label">أمين الخزينة / المحاسب</span>
        <span class="sig-sign">${printedBy || 'توقيع المحاسب'}</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">المراجعة والتدقيق</span>
        <span class="sig-sign">المراجع المالي الداخلي</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">الاعتماد المالي</span>
        <span class="sig-sign">المدير المالي</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">${isPayment ? 'توقيع المستلم' : 'توقيع الدافع'}</span>
        <span class="sig-sign">الاسم والتوقيع</span>
      </div>
    </div>

    <!-- تذييل المستأجر وهوية نبراس -->
    <footer class="tenant-footer">
      <div class="f-brand">
        منظومة <strong>نبراس (Nebras OS)</strong> • إدارة السندات والمدفوعات الرسمية
      </div>
      <div>
        <span>سند رقم: ${voucher.voucher_number || ''}</span> • 
        <span>طُبع بتاريخ: ${printTimestamp}</span>
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
    console.warn('تعذر فتح نافذة الطباعة المنبثقة.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
