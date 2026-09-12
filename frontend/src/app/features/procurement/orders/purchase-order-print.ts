import { tafqeetArabic } from '../../finance/journals/journal-voucher-print';

/**
 * طباعة أمر الشراء الرسمي (Purchase Order - PO)
 * بهوية نظام نبراس وترويسة وفوتر المستأجر السوداني.
 * معايير صفحة واحدة A4 Portrait قياسية، تفقيط بالجنيه السوداني، الأبعاد المالية والتوقيعات.
 */
export function printPurchaseOrder(order: any, tenantInfo?: any, printedBy?: string): void {
  if (!order) return;

  const schoolNameAr = tenantInfo?.nameAr || tenantInfo?.name || 'مدارس النبراس النموذجية الأهلية';
  const schoolNameEn = tenantInfo?.nameEn || 'Nebras Model Educational Schools';
  const logoUrl = tenantInfo?.logoUrl || '/assets/images/branding/nebras_official_blue.png';
  const phone = tenantInfo?.phone || '0912300000';
  const email = tenantInfo?.email || 'procurement@nebras-edu.sd';
  const address = tenantInfo?.address || 'جمهورية السودان — ولاية الخرطوم — إدارة الإمداد والمشتريات';

  const totalAmount = Number(order.total_amount) || 0;
  const tafqeetText = tafqeetArabic(totalAmount, 'جنيه سوداني');
  const now = new Date();
  const printTimestamp = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString('ar-SD', { hour: '2-digit', minute: '2-digit' })}`;

  const statusMap: Record<string, string> = {
    draft: 'مسودة مبدئية',
    approved: 'معتمد إدارياً',
    issued: 'مُرسل للمورّد',
    received: 'مستلم بالمخازن',
    completed: 'مكتمل ومرحّل مالياً',
    cancelled: 'ملغي'
  };
  const statusLabel = statusMap[order.status] || order.status;

  const items = order.items || [];
  const itemsRows = items.map((it: any, idx: number) => {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unit_price) || 0;
    const lineTotal = Number(it.total_price) || (qty * price);
    return `
      <tr>
        <td style="text-align: center;" class="mono">${idx + 1}</td>
        <td><strong>${it.item_name || '—'}</strong></td>
        <td style="text-align: center;">${it.unit || 'حبة'}</td>
        <td style="text-align: end;" class="mono font-bold">${qty}</td>
        <td style="text-align: end;" class="mono">${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td>${it.budget_account_name || it.budget_account_id || '—'}</td>
        <td>${it.cost_center_name || it.cost_center_id || '—'}</td>
        <td style="text-align: end;" class="mono font-bold">${lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `;
  }).join('');

  const html = `<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>أمر شراء رسمي ${order.po_number}</title>
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
      font-size: 11px;
      line-height: 1.35;
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
      border-bottom: 2px solid #0f766e;
      padding-bottom: 6px;
      margin-bottom: 10px;
    }
    .org-meta { flex: 1; }
    .country-line {
      font-size: 9.5px;
      font-weight: 700;
      color: #475569;
      margin: 0 0 2px 0;
    }
    .org-name-ar {
      font-size: 17px;
      font-weight: 900;
      color: #0f172a;
      margin: 0 0 2px 0;
    }
    .org-name-en {
      font-size: 10.5px;
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
      max-height: 55px;
      max-width: 110px;
      object-fit: contain;
    }
    .contact-meta {
      flex: 1;
      text-align: left;
      font-size: 9.5px;
      color: #475569;
      line-height: 1.45;
    }

    /* شريط عنوان أمر الشراء */
    .doc-hero {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f0fdfa;
      border: 1.5px solid #0f766e;
      border-radius: 6px;
      padding: 8px 14px;
      margin-bottom: 12px;
    }
    .doc-hero h1 {
      margin: 0;
      font-size: 18px;
      font-weight: 900;
      color: #0f766e;
    }
    .doc-hero .sub-title {
      font-size: 9.5px;
      font-weight: 700;
      color: #475569;
      letter-spacing: 1px;
    }
    .status-tag {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      background: #ffffff;
      border: 1px solid #0f766e;
      color: #0f766e;
    }

    /* بيانات الأمر والمورد */
    .meta-grid {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 10px;
      margin-bottom: 12px;
    }
    .meta-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 12px;
    }
    .meta-box-title {
      font-size: 10.5px;
      font-weight: 800;
      color: #0f766e;
      margin-bottom: 6px;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 3px;
    }
    .kv-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: 10.5px;
    }
    .kv-row .k { color: #64748b; font-weight: 600; }
    .kv-row .v { color: #0f172a; font-weight: 700; }
    .mono { font-family: 'Consolas', 'Courier New', monospace; }
    .font-bold { font-weight: 700; }

    /* جدول الأصناف والبنود */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 10.5px;
    }
    .items-table th {
      background: #1e293b;
      color: #ffffff;
      font-weight: 700;
      padding: 6px 8px;
      text-align: right;
      border: 1px solid #334155;
    }
    .items-table td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .items-table tr:nth-child(even) { background: #f8fafc; }

    /* صندوق الإجماليات والتفقيط */
    .total-box {
      border: 1.5px solid #0f766e;
      border-radius: 6px;
      background: #ffffff;
      padding: 10px 14px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .total-num-wrap {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .total-large {
      font-size: 20px;
      font-weight: 900;
      color: #0f766e;
    }
    .total-tafqeet {
      font-size: 11.5px;
      font-weight: 700;
      color: #1e293b;
      background: #f1f5f9;
      padding: 5px 12px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }

    /* شروط الدفع والتسليم */
    .terms-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 14px;
      font-size: 10.5px;
    }
    .terms-box .t-title { font-weight: 800; color: #475569; margin-bottom: 3px; }

    /* مصفوفة التوقيعات */
    .signatures-matrix {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-top: 18px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .sig-col {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 6px;
      text-align: center;
      background: #fafafa;
    }
    .sig-label {
      font-size: 9.5px;
      font-weight: 700;
      color: #475569;
      display: block;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 4px;
      margin-bottom: 28px;
    }
    .sig-sign {
      font-size: 10px;
      font-weight: 600;
      color: #64748b;
    }

    /* الفوتر */
    .tenant-footer {
      border-top: 1.5px solid #e2e8f0;
      padding-top: 5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
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

    <!-- شريط عنوان أمر الشراء -->
    <div class="doc-hero">
      <div>
        <h1>أمر شراء رسمي (Purchase Order)</h1>
        <span class="sub-title">إدارة المشتريات والعقود • نظام نبراس</span>
      </div>
      <div class="status-tag">${statusLabel}</div>
    </div>

    <!-- شبكة معلومات أمر الشراء والمورد -->
    <div class="meta-grid">
      <div class="meta-box">
        <div class="meta-box-title">بيانات أمر الشراء والتكليف</div>
        <div class="kv-row"><span class="k">رقم أمر الشراء:</span><span class="v mono font-bold">${order.po_number}</span></div>
        <div class="kv-row"><span class="k">تاريخ الإصدار:</span><span class="v mono">${order.date || '—'}</span></div>
        <div class="kv-row"><span class="k">حساب الموازنة:</span><span class="v">${order.budget_account_name || 'موازنة المشتريات المعتمدة'}</span></div>
        <div class="kv-row"><span class="k">فاتورة المورّد المرجعية:</span><span class="v mono">${order.vendor_invoice_number || 'لم تُسجل بعد'}</span></div>
      </div>

      <div class="meta-box">
        <div class="meta-box-title">بيانات المورّد المعني</div>
        <div class="kv-row"><span class="k">اسم المورّد:</span><span class="v font-bold">${order.vendor_name || 'مورّد معتمد'}</span></div>
        <div class="kv-row"><span class="k">الهاتف:</span><span class="v mono">${order.vendor_phone || '—'}</span></div>
        <div class="kv-row"><span class="k">البريد الإلكتروني:</span><span class="v">${order.vendor_email || '—'}</span></div>
        <div class="kv-row"><span class="k">المدينة / المقر:</span><span class="v">${order.vendor_city || 'الخرطوم'}</span></div>
      </div>
    </div>

    <!-- جدول البنود والأصناف -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 4%; text-align: center;">#</th>
          <th style="width: 28%;">الصنف والبيان</th>
          <th style="width: 8%; text-align: center;">الوحدة</th>
          <th style="width: 8%; text-align: end;">الكمية</th>
          <th style="width: 14%; text-align: end;">سعر الوحدة (ج.س)</th>
          <th style="width: 15%;">حساب الموازنة</th>
          <th style="width: 11%;">مركز التكلفة</th>
          <th style="width: 12%; text-align: end;">الإجمالي (ج.س)</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows || '<tr><td colspan="8" style="text-align: center;">لا توجد أصناف مدونة بأمر الشراء.</td></tr>'}
      </tbody>
    </table>

    <!-- صندوق الإجماليات والتفقيط -->
    <div class="total-box">
      <div class="total-num-wrap">
        <span>إجمالي أمر الشراء:</span>
        <span class="total-large mono">${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span class="font-bold">جنيه سوداني (ج.س)</span>
      </div>
      <div class="total-tafqeet">
        ${tafqeetText}
      </div>
    </div>

    <!-- شروط الدفع والتسليم -->
    <div class="terms-box">
      <div class="t-title">شروط السداد والاستلام:</div>
      <div>${order.payment_terms || 'الدفع بعد فحص واستلام البضاعة ومطابقة المواصفات مع إشعار إدارة المخازن، خلال 15 يوماً من تسجيل الفاتورة.'}</div>
    </div>

    <!-- مصفوفة التوقيعات والاعتمادات الرسمية -->
    <div class="signatures-matrix">
      <div class="sig-col">
        <span class="sig-label">مسؤول المشتريات</span>
        <span class="sig-sign">${printedBy || 'إعداد المشتريات'}</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">المراجعة والتدقيق المالي</span>
        <span class="sig-sign">المراجع الداخلي</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">الاعتماد الإداري / المالي</span>
        <span class="sig-sign">المدير العام / المالي</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">استلام وتعهد المورّد</span>
        <span class="sig-sign">الختم والتوقيع</span>
      </div>
    </div>

    <!-- تذييل المستأجر وهوية نبراس -->
    <footer class="tenant-footer">
      <div class="f-brand">
        منظومة <strong>نبراس (Nebras OS)</strong> • إدارة سلاسل الإمداد والمشتريات
      </div>
      <div>
        <span>أمر شراء: ${order.po_number}</span> • 
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
