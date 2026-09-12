import { tafqeetArabic } from '../../finance/journals/journal-voucher-print';

/**
 * طباعة طلب الشراء الرسمي (Purchase Request - PR)
 * بهوية نظام نبراس وترويسة وفوتر المستأجر السوداني.
 * معايير صفحة واحدة A4 Portrait قياسية، تفقيط بالجنيه السوداني والتوقيعات الرسمية.
 */
export function printPurchaseRequest(request: any, tenantInfo?: any, printedBy?: string): void {
  if (!request) return;

  const schoolNameAr = tenantInfo?.nameAr || tenantInfo?.name || 'مدارس النبراس النموذجية الأهلية';
  const schoolNameEn = tenantInfo?.nameEn || 'Nebras Model Educational Schools';
  const logoUrl = tenantInfo?.logoUrl || '/assets/images/branding/nebras_official_blue.png';
  const phone = tenantInfo?.phone || '0912300000';
  const email = tenantInfo?.email || 'procurement@nebras-edu.sd';
  const address = tenantInfo?.address || 'جمهورية السودان — ولاية الخرطوم — إدارة الإمداد والمشتريات';

  const totalAmount = Number(request.total_estimated_amount) || 0;
  const tafqeetText = tafqeetArabic(totalAmount, 'جنيه سوداني');
  const now = new Date();
  const printTimestamp = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString('ar-SD', { hour: '2-digit', minute: '2-digit' })}`;

  const statusMap: Record<string, string> = {
    draft: 'مسودة مبدئية',
    pending_approval: 'تحت المراجعة والتدقيق',
    approved: 'معتمد للشراء والتوريد',
    rejected: 'مرفوض',
    rfq_created: 'تم توليد طلب عروض الأسعار (RFQ)',
    completed: 'مكتمل ومُنفّذ'
  };
  const statusLabel = statusMap[request.status] || request.status;

  const priorityMap: Record<string, string> = {
    high: 'عاجل جداً',
    medium: 'متوسط الأهمية',
    low: 'اعتيادي / منخفض'
  };
  const priorityLabel = priorityMap[request.priority] || 'عادي';

  const items = request.items || [];
  const itemsRows = items.map((it: any, idx: number) => {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.estimated_unit_price) || 0;
    const lineTotal = qty * price;
    return `
      <tr>
        <td style="text-align: center;" class="mono">${idx + 1}</td>
        <td><strong>${it.item_name || '—'}</strong></td>
        <td style="text-align: center;">${it.unit || 'حبة'}</td>
        <td style="text-align: end;" class="mono font-bold">${qty}</td>
        <td style="text-align: end;" class="mono">${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td>${it.budget_account_name || 'حساب المصروفات العامة'}</td>
        <td>${it.cost_center_name || 'القسم الطالب'}</td>
        <td style="text-align: end;" class="mono font-bold">${lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `;
  }).join('');

  const html = `<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>طلب شراء داخلي ${request.request_number}</title>
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
      border-bottom: 2px solid #1e3a8a;
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

    /* شريط عنوان طلب الشراء */
    .doc-hero {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #eff6ff;
      border: 1.5px solid #1e3a8a;
      border-radius: 6px;
      padding: 8px 14px;
      margin-bottom: 12px;
    }
    .doc-hero h1 {
      margin: 0;
      font-size: 18px;
      font-weight: 900;
      color: #1e3a8a;
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
      border: 1px solid #1e3a8a;
      color: #1e3a8a;
    }

    /* بيانات الطلب */
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
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
      color: #1e3a8a;
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

    /* جدول البنود */
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

    /* صندوق الإجماليات */
    .total-box {
      border: 1.5px solid #1e3a8a;
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
      color: #1e3a8a;
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

    /* صندوق الغرض والسبب */
    .reason-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 14px;
      font-size: 10.5px;
    }
    .reason-box .r-title { font-weight: 800; color: #475569; margin-bottom: 3px; }

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

    <!-- شريط عنوان الطلب -->
    <div class="doc-hero">
      <div>
        <h1>طلب شراء داخلي (Purchase Request)</h1>
        <span class="sub-title">إدارة سلاسل الإمداد والمشتريات • نظام نبراس</span>
      </div>
      <div class="status-tag">${statusLabel}</div>
    </div>

    <!-- شبكة معلومات الطلب -->
    <div class="meta-grid">
      <div class="meta-box">
        <div class="meta-box-title">بيانات الطلب الداخلي</div>
        <div class="kv-row"><span class="k">رقم طلب الشراء:</span><span class="v mono font-bold">${request.request_number}</span></div>
        <div class="kv-row"><span class="k">تاريخ الطلب:</span><span class="v mono">${request.date || '—'}</span></div>
        <div class="kv-row"><span class="k">درجة الأولوية:</span><span class="v">${priorityLabel}</span></div>
      </div>

      <div class="meta-box">
        <div class="meta-box-title">الجهة الطالبة والتكليف</div>
        <div class="kv-row"><span class="k">القسم الطالب:</span><span class="v font-bold">${request.department_name || 'إدارة المدرسة'}</span></div>
        <div class="kv-row"><span class="k">مُقدّم الطلب:</span><span class="v">${request.requested_by_name || 'المسؤول الإداري'}</span></div>
        <div class="kv-row"><span class="k">الاعتماد الإداري:</span><span class="v">${request.approved_by_name || 'بانتظار الاعتماد'}</span></div>
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
          <th style="width: 14%; text-align: end;">السعر التقديري (ج.س)</th>
          <th style="width: 15%;">حساب الموازنة</th>
          <th style="width: 11%;">مركز التكلفة</th>
          <th style="width: 12%; text-align: end;">الإجمالي (ج.س)</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows || '<tr><td colspan="8" style="text-align: center;">لا توجد أصناف مدونة بالطلب.</td></tr>'}
      </tbody>
    </table>

    <!-- صندوق الإجماليات والتفقيط -->
    <div class="total-box">
      <div class="total-num-wrap">
        <span>إجمالي القيمة التقديرية:</span>
        <span class="total-large mono">${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span class="font-bold">جنيه سوداني (ج.س)</span>
      </div>
      <div class="total-tafqeet">
        ${tafqeetText}
      </div>
    </div>

    <!-- مبررات وسبب الشراء -->
    <div class="reason-box">
      <div class="r-title">مبررات وسبب الشراء:</div>
      <div>${request.reason || 'تأمين احتياجات العملية التعليمية والإدارية وفق الخطة التشغيلية للمؤسسة.'}</div>
    </div>

    <!-- مصفوفة الاعتمادات والتوقيعات -->
    <div class="signatures-matrix">
      <div class="sig-col">
        <span class="sig-label">رئيس القسم الطالب</span>
        <span class="sig-sign">${printedBy || 'مقدّم الطلب'}</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">المراجعة والتدقيق المالي</span>
        <span class="sig-sign">المراجع الداخلي</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">إدارة المشتريات</span>
        <span class="sig-sign">مدير المشتريات</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">الاعتماد المالي والإداري</span>
        <span class="sig-sign">المدير العام / المالي</span>
      </div>
    </div>

    <!-- تذييل المستأجر وهوية نبراس -->
    <footer class="tenant-footer">
      <div class="f-brand">
        منظومة <strong>نبراس (Nebras OS)</strong> • إدارة سلاسل الإمداد والمشتريات
      </div>
      <div>
        <span>طلب شراء: ${request.request_number}</span> • 
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
