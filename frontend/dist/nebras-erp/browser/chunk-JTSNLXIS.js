import{a as z}from"./chunk-6UXR7ML6.js";function D(t,m="\u062C\u0646\u064A\u0647 \u0633\u0648\u062F\u0627\u0646\u064A"){if(!t||t<=0)return"\u0635\u0641\u0631 "+m;let u=["","\u0648\u0627\u062D\u062F","\u0627\u062B\u0646\u0627\u0646","\u062B\u0644\u0627\u062B\u0629","\u0623\u0631\u0628\u0639\u0629","\u062E\u0645\u0633\u0629","\u0633\u062A\u0629","\u0633\u0628\u0639\u0629","\u062B\u0645\u0627\u0646\u064A\u0629","\u062A\u0633\u0639\u0629","\u0639\u0634\u0631\u0629","\u0623\u062D\u062F \u0639\u0634\u0631","\u0627\u062B\u0646\u0627 \u0639\u0634\u0631","\u062B\u0644\u0627\u062B\u0629 \u0639\u0634\u0631","\u0623\u0631\u0628\u0639\u0629 \u0639\u0634\u0631","\u062E\u0645\u0633\u0629 \u0639\u0634\u0631","\u0633\u062A\u0629 \u0639\u0634\u0631","\u0633\u0628\u0639\u0629 \u0639\u0634\u0631","\u062B\u0645\u0627\u0646\u064A\u0629 \u0639\u0634\u0631","\u062A\u0633\u0639\u0629 \u0639\u0634\u0631"],s=["","","\u0639\u0634\u0631\u0648\u0646","\u062B\u0644\u0627\u062B\u0648\u0646","\u0623\u0631\u0628\u0639\u0648\u0646","\u062E\u0645\u0633\u0648\u0646","\u0633\u062A\u0648\u0646","\u0633\u0628\u0639\u0648\u0646","\u062B\u0645\u0627\u0646\u0648\u0646","\u062A\u0633\u0639\u0648\u0646"],v=["","\u0645\u0627\u0626\u0629","\u0645\u0627\u0626\u062A\u0627\u0646","\u062B\u0644\u0627\u062B\u0645\u0627\u0626\u0629","\u0623\u0631\u0628\u0639\u0645\u0627\u0626\u0629","\u062E\u0645\u0633\u0645\u0627\u0626\u0629","\u0633\u062A\u0645\u0627\u0626\u0629","\u0633\u0628\u0639\u0645\u0627\u0626\u0629","\u062B\u0645\u0627\u0646\u0645\u0627\u0626\u0629","\u062A\u0633\u0639\u0645\u0627\u0626\u0629"];function p(f){let d="",b=Math.floor(f/100),l=f%100;if(b>0&&(d+=v[b]),l>0)if(d&&(d+=" \u0648"),l<20)d+=u[l];else{let y=Math.floor(l/10),n=l%10;n>0&&(d+=u[n]+" \u0648"),d+=s[y]}return d}let c=Math.floor(t),e="",i=Math.floor(c/1e6),r=Math.floor(c%1e6/1e3),g=c%1e3;return i>0&&(i===1?e+="\u0645\u0644\u064A\u0648\u0646":i===2?e+="\u0645\u0644\u064A\u0648\u0646\u0627\u0646":i>=3&&i<=10?e+=p(i)+" \u0645\u0644\u0627\u064A\u064A\u0646":e+=p(i)+" \u0645\u0644\u064A\u0648\u0646"),r>0&&(e&&(e+=" \u0648"),r===1?e+="\u0623\u0644\u0641":r===2?e+="\u0623\u0644\u0641\u0627\u0646":r>=3&&r<=10?e+=p(r)+" \u0622\u0644\u0627\u0641":e+=p(r)+" \u0623\u0644\u0641"),g>0&&(e&&(e+=" \u0648"),e+=p(g)),`\u0641\u0642\u0637 ${e} ${m} \u0644\u0627 \u063A\u064A\u0631`}function F(t,m,u){if(!t)return;let s=z(m),v=s.schoolNameAr,p=s.schoolNameEn,c=s.logoUrl,e=s.phone,i=s.email,r=s.address,g=t.lines||[],f=g.reduce((a,o)=>a+(Number(o.debit)||0),0),d=g.reduce((a,o)=>a+(Number(o.credit)||0),0),b=D(f,"\u062C\u0646\u064A\u0647 \u0633\u0648\u062F\u0627\u0646\u064A"),l=new Date,y=`${l.toISOString().split("T")[0]} ${l.toLocaleTimeString("ar-SD",{hour:"2-digit",minute:"2-digit"})}`,n=t.partner_details,x=t.source_details,w=t.fee_breakdown||[],_=g.map((a,o)=>`
    <tr>
      <td class="center mono">${o+1}</td>
      <td class="mono font-bold">${a.account_code}</td>
      <td><strong>${a.account_name}</strong></td>
      <td class="text-muted">${a.cost_center_name||"\u2014"}</td>
      <td class="desc-cell">${a.description||"\u2014"}</td>
      <td class="end mono text-info">${+a.debit>0?Number(a.debit).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}):"\u2014"}</td>
      <td class="end mono text-success">${+a.credit>0?Number(a.credit).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}):"\u2014"}</td>
    </tr>
  `).join(""),$="";n&&($=`
      <div class="partner-box">
        <div class="p-header">
          <span class="badge-role">${n.partner_type_label||"\u0627\u0644\u0637\u0631\u0641 \u0627\u0644\u0645\u0639\u0646\u064A"}</span>
          <h3 class="p-name">${n.name}</h3>
          ${n.student_number?`<span class="p-id mono">\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0623\u0643\u0627\u062F\u064A\u0645\u064A: ${n.student_number}</span>`:""}
        </div>
        <div class="p-grid">
          ${n.grade_name?`<div><span class="lbl">\u0627\u0644\u0635\u0641 / \u0627\u0644\u0645\u0631\u062D\u0644\u0629:</span> <span class="val">${n.grade_name}</span></div>`:""}
          ${n.guardian_name?`<div><span class="lbl">\u0648\u0644\u064A \u0627\u0644\u0623\u0645\u0631:</span> <span class="val">${n.guardian_name}</span></div>`:""}
          ${x?.payment_method?`<div><span class="lbl">\u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u062F\u0641\u0639:</span> <span class="val method-tag">${x.payment_method}</span></div>`:""}
          ${x?.destination?`<div><span class="lbl">\u0627\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u062A\u0644\u0645:</span> <span class="val">${x.destination}</span></div>`:""}
        </div>
      </div>
    `);let k="";w.length>0&&(k=`
      <div class="fee-section">
        <div class="fee-title">\u062A\u0641\u0635\u064A\u0644 \u0628\u0646\u0648\u062F \u0627\u0644\u0631\u0633\u0648\u0645 \u0648\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0633\u062F\u062F\u0629 / \u0627\u0644\u0645\u0633\u062A\u062D\u0642\u0629 \u0628\u0627\u0644\u0642\u064A\u062F:</div>
        <table class="fee-table">
          <thead>
            <tr>
              <th>\u0628\u0646\u062F \u0627\u0644\u0631\u0633\u0648\u0645</th>
              <th>\u0627\u0644\u0628\u064A\u0627\u0646 \u0648\u0627\u0644\u062E\u062F\u0645\u0629</th>
              <th class="center">\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0627\u0644\u0645\u0631\u062C\u0639\u064A\u0629</th>
              <th class="end">\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u062E\u0635\u0635</th>
            </tr>
          </thead>
          <tbody>${w.map(o=>`
      <tr>
        <td><strong>${o.fee_name}</strong></td>
        <td>${o.description||o.fee_name}</td>
        <td class="mono center">${o.invoice_number||"\u2014"}</td>
        <td class="end mono font-bold">${Number(o.allocated_amount||o.amount).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})} \u062C.\u0633</td>
      </tr>
    `).join("")}</tbody>
        </table>
      </div>
    `);let S={draft:"\u0645\u0633\u0648\u062F\u0629 \u0645\u0628\u062F\u0626\u064A\u0629",approved:"\u0642\u064A\u062F \u0645\u0639\u062A\u0645\u062F",posted:"\u0645\u0631\u062D\u0644 \u0644\u062F\u0641\u062A\u0631 \u0627\u0644\u0623\u0633\u062A\u0627\u0630 \u0627\u0644\u0639\u0627\u0645",reversed:"\u0642\u064A\u062F \u0645\u062D\u0627\u0633\u0628\u064A \u0645\u0639\u0643\u0648\u0633",cancelled:"\u0645\u0644\u063A\u064A"}[t.status]||t.status,j=`<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>\u0633\u0646\u062F \u0642\u064A\u062F \u0645\u062D\u0627\u0633\u0628\u064A ${t.entry_number}</title>
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

    /* \u062A\u0631\u0648\u064A\u0633\u0629 \u0627\u0644\u0645\u0633\u062A\u0623\u062C\u0631 \u0627\u0644\u0631\u0633\u0645\u064A\u0629 - \u0645\u062F\u0645\u062C\u0629 \u0648\u0623\u0646\u064A\u0642\u0629 */
    .tenant-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .org-meta {
      flex: 1;
    }
    .country-line {
      font-size: 9.5px;
      font-weight: 700;
      color: #475569;
      margin: 0 0 2px 0;
      letter-spacing: 0.2px;
    }
    .org-name-ar {
      font-size: 16px;
      font-weight: 900;
      color: #1e3a8a;
      margin: 0 0 1px 0;
      line-height: 1.2;
    }
    .org-name-en {
      font-size: 10.5px;
      font-weight: 600;
      color: #64748b;
      margin: 0 0 2px 0;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
    .contact-line {
      font-size: 9.5px;
      color: #64748b;
      margin: 0;
    }
    .logo-box {
      flex: none;
      width: 58px;
      height: 58px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 4px;
    }
    .logo-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .logo-placeholder {
      font-size: 26px;
    }

    /* \u0634\u0631\u064A\u0637 \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0633\u0646\u062F */
    .doc-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
      color: #ffffff;
      border-radius: 6px;
      padding: 6px 12px;
      margin-bottom: 8px;
    }
    .doc-titles h1 {
      margin: 0;
      font-size: 14px;
      font-weight: 900;
      letter-spacing: -0.2px;
      line-height: 1.2;
    }
    .doc-titles span {
      font-size: 9px;
      font-weight: 600;
      opacity: 0.9;
      text-transform: uppercase;
      display: block;
      margin-top: 1px;
    }
    .doc-badge-wrap {
      text-align: end;
    }
    .status-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.22);
      border: 1px solid rgba(255, 255, 255, 0.4);
      padding: 2px 8px;
      border-radius: 14px;
      font-size: 10px;
      font-weight: 700;
    }

    /* \u0634\u0628\u0643\u0629 \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0642\u064A\u062F */
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 10px;
      margin-bottom: 8px;
    }
    .meta-col {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .meta-col .k {
      font-size: 9px;
      font-weight: 700;
      color: #64748b;
    }
    .meta-col .v {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
    }

    /* \u0627\u0644\u0628\u064A\u0627\u0646 \u0627\u0644\u0639\u0627\u0645 */
    .description-box {
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      padding: 5px 9px;
      margin-bottom: 8px;
      font-size: 10.5px;
      color: #334155;
      line-height: 1.35;
    }
    .description-box strong {
      color: #1e3a8a;
      margin-inline-end: 4px;
    }

    /* \u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0634\u0631\u064A\u0643 / \u0627\u0644\u0637\u0627\u0644\u0628 */
    .partner-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      padding: 6px 10px;
      margin-bottom: 8px;
    }
    .p-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .badge-role {
      background: #dcfce7;
      color: #166534;
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 9.5px;
      font-weight: 700;
    }
    .p-name {
      margin: 0;
      font-size: 12px;
      font-weight: 800;
      color: #14532d;
    }
    .p-id {
      font-size: 10.5px;
      color: #166534;
      margin-inline-start: auto;
    }
    .p-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px 10px;
      font-size: 10px;
      border-top: 1px dashed #bbf7d0;
      padding-top: 4px;
    }
    .p-grid .lbl { color: #475569; }
    .p-grid .val { font-weight: 700; color: #1e293b; }
    .method-tag { background: #e0e7ff; color: #3730a3; padding: 1px 5px; border-radius: 3px; font-weight: 700; }

    /* \u062C\u062F\u0648\u0644 \u0623\u0633\u0637\u0631 \u0627\u0644\u0642\u064A\u062F \u0627\u0644\u0645\u0632\u062F\u0648\u062C */
    .table-container {
      margin-bottom: 8px;
    }
    .journal-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
    }
    .journal-table th {
      background: #1e3a8a;
      color: #ffffff;
      padding: 5px 8px;
      font-weight: 700;
      font-size: 10px;
      border: 1px solid #1e3a8a;
      text-align: start;
    }
    .journal-table td {
      padding: 4px 8px;
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
      padding: 5px 8px;
    }

    /* \u0627\u0644\u062A\u0641\u0642\u064A\u0637 \u0648\u0627\u0644\u062A\u0648\u0627\u0632\u0646 */
    .tafqeet-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      padding: 5px 10px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10.5px;
    }
    .t-title { font-weight: 800; color: #1e40af; }
    .t-words { font-weight: 700; color: #0f172a; }
    .balance-tag {
      background: #dcfce7;
      color: #15803d;
      padding: 2px 7px;
      border-radius: 3px;
      font-weight: 800;
      font-size: 10px;
    }

    /* \u062C\u062F\u0648\u0644 \u0628\u0646\u0648\u062F \u0627\u0644\u0631\u0633\u0648\u0645 */
    .fee-section {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 8px;
      margin-bottom: 8px;
    }
    .fee-title {
      font-size: 10px;
      font-weight: 800;
      color: #475569;
      margin-bottom: 4px;
    }
    .fee-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    .fee-table th { background: #f8fafc; padding: 3px 6px; border: 1px solid #e2e8f0; color: #475569; }
    .fee-table td { padding: 3px 6px; border: 1px solid #e2e8f0; }

    /* \u0645\u0635\u0641\u0648\u0641\u0629 \u0627\u0644\u062A\u0648\u0642\u064A\u0639\u0627\u062A \u0648\u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F\u0627\u062A */
    .signatures-matrix {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-top: 10px;
      margin-bottom: 10px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sig-col {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 8px;
      text-align: center;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 80px;
    }
    .sig-label {
      display: block;
      font-size: 10px;
      font-weight: 800;
      color: #1e3a8a;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 3px;
      margin-bottom: 6px;
    }
    .sig-sign {
      display: block;
      font-size: 9.5px;
      color: #94a3b8;
    }
    .stamp-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      min-height: 45px;
    }
    .stamp-img {
      max-height: 55px;
      max-width: 85px;
      object-fit: contain;
      transform: rotate(-3deg);
    }
    .stamp-ph {
      font-size: 8px;
      color: #0284c7;
      border: 1px dashed #0284c7;
      border-radius: 6px;
      width: 62px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      transform: rotate(-3deg);
    }

    /* \u062A\u0630\u064A\u064A\u0644 \u0627\u0644\u0645\u0633\u062A\u0623\u062C\u0631 \u0648\u0647\u0648\u064A\u0629 \u0646\u0628\u0631\u0627\u0633 */
    .tenant-footer {
      border-top: 1.5px solid #cbd5e1;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9.5px;
      color: #64748b;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .f-brand strong { color: #1e3a8a; }
    .f-qr {
      font-family: monospace;
      background: #f1f5f9;
      padding: 1px 5px;
      border-radius: 3px;
    }

    /* \u0623\u062F\u0648\u0627\u062A */
    .mono { font-family: 'Consolas', 'Courier New', monospace; font-variant-numeric: tabular-nums; }
    .end { text-align: end; }
    .center { text-align: center; }
    .font-bold { font-weight: 700; }
    .text-muted { color: #64748b; }
    .text-info { color: #0284c7; }
    .text-success { color: #16a34a; }
    .desc-cell { font-size: 10px; color: #475569; }

    @media print {
      html, body {
        width: 100%;
        height: auto;
        background: #fff;
      }
      .print-sheet {
        padding: 0;
        max-width: 100%;
        page-break-after: avoid;
        break-after: avoid;
      }
      .doc-banner { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .journal-table th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .partner-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .tafqeet-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .signatures-matrix { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tr { page-break-inside: avoid; break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="print-sheet">
    <!-- 1. \u062A\u0631\u0648\u064A\u0633\u0629 \u0627\u0644\u0645\u0633\u062A\u0623\u062C\u0631 \u0627\u0644\u0631\u0633\u0645\u064A\u0629 -->
    <header class="tenant-header">
      <div class="org-meta">
        <p class="country-line">\u062C\u0645\u0647\u0648\u0631\u064A\u0629 \u0627\u0644\u0633\u0648\u062F\u0627\u0646 \u2022 \u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0648\u0627\u0644\u062A\u0631\u0628\u064A\u0629 \u0627\u0644\u0648\u0637\u0646\u064A\u0629</p>
        <h2 class="org-name-ar">${v}</h2>
        <h4 class="org-name-en">${p}</h4>
        <p class="contact-line">\u{1F4CD} ${r} \u2022 \u0647\u0627\u062A\u0641: ${e} \u2022 \u0628\u0631\u064A\u062F: ${i}</p>
      </div>
      <div class="logo-box">
        ${c?`<img src="${c}" alt="\u0634\u0639\u0627\u0631 \u0627\u0644\u0645\u062F\u0631\u0633\u0629" class="logo-img" onerror="this.style.display='none';this.nextElementSibling.style.display='block'" /><span class="logo-placeholder" style="display:none;">\u{1F3DB}\uFE0F</span>`:'<span class="logo-placeholder">\u{1F3DB}\uFE0F</span>'}
      </div>
    </header>

    <!-- 2. \u0634\u0631\u064A\u0637 \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0645\u0633\u062A\u0646\u062F -->
    <div class="doc-banner">
      <div class="doc-titles">
        <h1>\u0633\u0640\u0646\u0640\u062F \u0642\u0640\u064A\u0640\u062F \u064A\u0640\u0648\u0645\u0640\u064A\u0640\u0629 \u0645\u0640\u062D\u0640\u0627\u0633\u0640\u0628\u0640\u064A</h1>
        <span>OFFICIAL GENERAL JOURNAL VOUCHER</span>
      </div>
      <div class="doc-badge-wrap">
        <span class="status-badge">${S}</span>
      </div>
    </div>

    <!-- 3. \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0642\u064A\u062F \u0627\u0644\u0645\u0627\u0644\u064A -->
    <div class="meta-grid">
      <div class="meta-col">
        <span class="k">\u0631\u0642\u0645 \u0627\u0644\u0642\u064A\u062F:</span>
        <span class="v mono">${t.entry_number}</span>
      </div>
      <div class="meta-col">
        <span class="k">\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0642\u064A\u062F:</span>
        <span class="v mono">${t.date}</span>
      </div>
      <div class="meta-col">
        <span class="k">\u0627\u0644\u0645\u0633\u062A\u0646\u062F \u0627\u0644\u0645\u0631\u062C\u0639\u064A:</span>
        <span class="v mono">${t.reference||"\u2014"}</span>
      </div>
      <div class="meta-col">
        <span class="k">\u0627\u0644\u0639\u0645\u0644\u0629 \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629:</span>
        <span class="v">${t.currency?.name_ar||"\u0627\u0644\u062C\u0646\u064A\u0647 \u0627\u0644\u0633\u0648\u062F\u0627\u0646\u064A (\u062C.\u0633)"}</span>
      </div>
    </div>

    <!-- \u0627\u0644\u0628\u064A\u0627\u0646 \u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A \u0627\u0644\u0639\u0627\u0645 \u0644\u0644\u0642\u064A\u062F -->
    <div class="description-box">
      <strong>\u0627\u0644\u0628\u064A\u0627\u0646 / \u0627\u0644\u0648\u0635\u0641:</strong> ${t.description||"\u0644\u0627 \u064A\u0648\u062C\u062F \u0628\u064A\u0627\u0646 \u0625\u0636\u0627\u0641\u064A"}
    </div>

    <!-- 4. \u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0637\u0631\u0641 / \u0627\u0644\u0637\u0627\u0644\u0628 (\u0625\u0646 \u0648\u064F\u062C\u062F) -->
    ${$}

    <!-- 5. \u062A\u0641\u0635\u064A\u0644 \u0628\u0646\u0648\u062F \u0627\u0644\u0631\u0633\u0648\u0645 (\u0625\u0646 \u0648\u064F\u062C\u062F\u062A) -->
    ${k}

    <!-- 6. \u062C\u062F\u0648\u0644 \u0623\u0633\u0637\u0631 \u0627\u0644\u0642\u064A\u062F \u0627\u0644\u0645\u0632\u062F\u0648\u062C -->
    <div class="table-container">
      <table class="journal-table">
        <thead>
          <tr>
            <th style="width: 28px;" class="center">#</th>
            <th style="width: 80px;">\u0631\u0642\u0645 \u0627\u0644\u062D\u0633\u0627\u0628</th>
            <th style="width: 160px;">\u0627\u0633\u0645 \u0627\u0644\u062D\u0633\u0627\u0628</th>
            <th style="width: 90px;">\u0645\u0631\u0643\u0632 \u0627\u0644\u062A\u0643\u0644\u0641\u0629</th>
            <th>\u0627\u0644\u0628\u064A\u0627\u0646 \u0648\u0627\u0644\u0634\u0631\u062D \u0627\u0644\u062A\u0641\u0635\u064A\u0644\u064A</th>
            <th style="width: 105px;" class="end">\u0645\u062F\u064A\u0646 (\u062C.\u0633)</th>
            <th style="width: 105px;" class="end">\u062F\u0627\u0626\u0646 (\u062C.\u0633)</th>
          </tr>
        </thead>
        <tbody>
          ${_}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5" style="text-align: start;"><strong>\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0643\u0644\u064A \u0627\u0644\u0645\u062A\u0648\u0627\u0632\u0646:</strong></td>
            <td class="end mono text-info"><strong>${f.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></td>
            <td class="end mono text-success"><strong>${d.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- 7. \u0634\u0631\u064A\u0637 \u0627\u0644\u062A\u0641\u0642\u064A\u0637 \u0648\u0627\u0644\u062A\u0648\u0627\u0632\u0646 -->
    <div class="tafqeet-box">
      <div>
        <span class="t-title">\u0627\u0644\u0645\u0628\u0644\u063A \u0643\u062A\u0627\u0628\u0629\u064B: </span>
        <span class="t-words">${b}</span>
      </div>
      <div>
        <span class="balance-tag">\u2713 \u0627\u0644\u0642\u064A\u062F \u0645\u062A\u0648\u0627\u0632\u0646 \u0648\u0645\u0637\u0627\u0628\u0642</span>
      </div>
    </div>

    <!-- 8. \u0645\u0635\u0641\u0648\u0641\u0629 \u0627\u0644\u062A\u0648\u0642\u064A\u0639\u0627\u062A \u0648\u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A\u0629 -->
    <div class="signatures-matrix">
      <div class="sig-col">
        <span class="sig-label">\u0625\u0639\u062F\u0627\u062F \u0627\u0644\u0645\u062D\u0627\u0633\u0628</span>
        <span class="sig-sign">${t.created_by_name||"\u062A\u0648\u0642\u064A\u0639 \u0627\u0644\u0645\u062D\u0627\u0633\u0628 \u0627\u0644\u0645\u062E\u062A\u0635"}</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">\u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0648\u0627\u0644\u062A\u062F\u0642\u064A\u0642</span>
        <span class="sig-sign">\u0627\u0644\u0645\u0631\u0627\u062C\u0639 \u0627\u0644\u0645\u0627\u0644\u064A \u0627\u0644\u062F\u0627\u062E\u0644\u064A</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">\u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u0645\u0627\u0644\u064A</span>
        <span class="sig-sign">${t.approved_by?"\u0645\u0639\u062A\u0645\u062F \u0625\u062F\u0627\u0631\u064A\u0627\u064B":"\u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0645\u0627\u0644\u064A"}</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">\u0627\u0644\u062E\u062A\u0645 \u0627\u0644\u0645\u0627\u0644\u064A \u0627\u0644\u0631\u0633\u0645\u064A</span>
        <div class="stamp-wrap">
          ${s.stampUrl?`<img src="${s.stampUrl}" class="stamp-img" alt="\u0627\u0644\u062E\u062A\u0645 \u0627\u0644\u0631\u0633\u0645\u064A" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div class="stamp-ph" style="display:none;">\u0645\u0639\u062A\u0645\u062F</div>`:'<div class="stamp-ph">\u0645\u0639\u062A\u0645\u062F</div>'}
        </div>
      </div>
    </div>

    <!-- 9. \u062A\u0630\u064A\u064A\u0644 \u0627\u0644\u0645\u0633\u062A\u0623\u062C\u0631 \u0648\u0647\u0648\u064A\u0629 \u0646\u0628\u0631\u0627\u0633 -->
    <footer class="tenant-footer">
      <div class="f-brand">
        \u0645\u0646\u0638\u0648\u0645\u0629 <strong>\u0646\u0628\u0631\u0627\u0633 (Nebras OS)</strong> \u2022 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0648\u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0629
      </div>
      <div class="f-meta">
        <span class="f-qr">\u0648\u062B\u064A\u0642\u0629 \u0645\u0627\u0644\u064A\u0629: ${t.entry_number}</span>
        <span> \u2022 \u0637\u064F\u0628\u0639\u062A: ${y}</span>
      </div>
    </footer>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 250);
    };
  <\/script>
</body>
</html>`,h=window.open("","_blank","width=1000,height=800,menubar=no,toolbar=no,location=no,status=no");if(!h){console.warn("\u062A\u0639\u0630\u0631 \u0641\u062A\u062D \u0646\u0627\u0641\u0630\u0629 \u0627\u0644\u0637\u0628\u0627\u0639\u0629 \u0627\u0644\u0645\u0646\u0628\u062B\u0642\u0629\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0633\u0645\u0627\u062D \u0628\u0627\u0644\u0646\u0648\u0627\u0641\u0630 \u0627\u0644\u0645\u0646\u0628\u062B\u0642\u0629 \u0644\u0644\u0645\u062A\u0635\u0641\u062D.");return}h.document.open(),h.document.write(j),h.document.close()}export{D as a,F as b};
