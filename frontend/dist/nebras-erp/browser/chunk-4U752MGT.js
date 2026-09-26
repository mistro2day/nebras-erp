import{a as X}from"./chunk-OV5OJ52E.js";import{a as W}from"./chunk-JWWPS4PW.js";import{a as K}from"./chunk-NS5AKQK7.js";import"./chunk-SSREKVFW.js";import{a as J}from"./chunk-WQNDPI6K.js";import"./chunk-CY3GULLM.js";import{c as Y,g as G}from"./chunk-HRDZ373I.js";import"./chunk-D7RAZQKA.js";import"./chunk-44YQBPZP.js";import"./chunk-BM27TSDU.js";import"./chunk-DR5RU2SH.js";import"./chunk-BWGQBAQ7.js";import{C as Q}from"./chunk-JLSRJTCI.js";import{a as B}from"./chunk-EDJTOF3S.js";import{a as H}from"./chunk-BALWOZUM.js";import{b as L,d as V,e as U}from"./chunk-GPDPVP2E.js";import"./chunk-5ESGBUBJ.js";import{r as j}from"./chunk-TGOLEZB2.js";import"./chunk-2ITX5RGN.js";import"./chunk-FJCM6PLI.js";import"./chunk-FPPZ4BUR.js";import{$ as m,Ab as x,Bb as b,Eb as M,Fb as P,Gb as D,Hb as r,Ib as i,Jb as O,Mc as N,Ob as y,Sb as f,Ub as l,Wa as s,ec as A,fa as _,ga as h,gc as o,hc as u,ic as q,lb as T,qa as p,wc as I,zb as k}from"./chunk-AYJP2YZK.js";import{a as S,b as E,g as w}from"./chunk-Z3S5WG22.js";function Z(a,t,e){if(!a)return;let n=H(t),d=n.schoolNameAr,c=n.schoolNameEn,v=n.logoUrl,nt=n.phone,it=n.email,at=n.address,$=Number(a.total_estimated_amount)||0,ot=W($,"\u062C\u0646\u064A\u0647 \u0633\u0648\u062F\u0627\u0646\u064A"),R=new Date,rt=`${R.toISOString().split("T")[0]} ${R.toLocaleTimeString("ar-SD",{hour:"2-digit",minute:"2-digit"})}`,st={draft:"\u0645\u0633\u0648\u062F\u0629 \u0645\u0628\u062F\u0626\u064A\u0629",pending_approval:"\u062A\u062D\u062A \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0648\u0627\u0644\u062A\u062F\u0642\u064A\u0642",approved:"\u0645\u0639\u062A\u0645\u062F \u0644\u0644\u0634\u0631\u0627\u0621 \u0648\u0627\u0644\u062A\u0648\u0631\u064A\u062F",rejected:"\u0645\u0631\u0641\u0648\u0636",rfq_created:"\u062A\u0645 \u062A\u0648\u0644\u064A\u062F \u0637\u0644\u0628 \u0639\u0631\u0648\u0636 \u0627\u0644\u0623\u0633\u0639\u0627\u0631 (RFQ)",completed:"\u0645\u0643\u062A\u0645\u0644 \u0648\u0645\u064F\u0646\u0641\u0651\u0630"}[a.status]||a.status,ut={high:"\u0639\u0627\u062C\u0644 \u062C\u062F\u0627\u064B",medium:"\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0623\u0647\u0645\u064A\u0629",low:"\u0627\u0639\u062A\u064A\u0627\u062F\u064A / \u0645\u0646\u062E\u0641\u0636"}[a.priority]||"\u0639\u0627\u062F\u064A",dt=(a.items||[]).map((g,ct)=>{let F=Number(g.quantity)||0,z=Number(g.estimated_unit_price)||0,pt=F*z;return`
      <tr>
        <td style="text-align: center;" class="mono">${ct+1}</td>
        <td><strong>${g.item_name||"\u2014"}</strong></td>
        <td style="text-align: center;">${g.unit||"\u062D\u0628\u0629"}</td>
        <td style="text-align: end;" class="mono font-bold">${F}</td>
        <td style="text-align: end;" class="mono">${z.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
        <td>${g.budget_account_name||"\u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0629"}</td>
        <td>${g.cost_center_name||"\u0627\u0644\u0642\u0633\u0645 \u0627\u0644\u0637\u0627\u0644\u0628"}</td>
        <td style="text-align: end;" class="mono font-bold">${pt.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      </tr>
    `}).join(""),lt=`<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>\u0637\u0644\u0628 \u0634\u0631\u0627\u0621 \u062F\u0627\u062E\u0644\u064A ${a.request_number}</title>
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

    /* \u062A\u0631\u0648\u064A\u0633\u0629 \u0627\u0644\u0645\u0633\u062A\u0623\u062C\u0631 \u0627\u0644\u0631\u0633\u0645\u064A\u0629 */
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

    /* \u0634\u0631\u064A\u0637 \u0639\u0646\u0648\u0627\u0646 \u0637\u0644\u0628 \u0627\u0644\u0634\u0631\u0627\u0621 */
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

    /* \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0637\u0644\u0628 */
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

    /* \u062C\u062F\u0648\u0644 \u0627\u0644\u0628\u0646\u0648\u062F */
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

    /* \u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0627\u062A */
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

    /* \u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u063A\u0631\u0636 \u0648\u0627\u0644\u0633\u0628\u0628 */
    .reason-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 14px;
      font-size: 10.5px;
    }
    .reason-box .r-title { font-weight: 800; color: #475569; margin-bottom: 3px; }

    /* \u0645\u0635\u0641\u0648\u0641\u0629 \u0627\u0644\u062A\u0648\u0642\u064A\u0639\u0627\u062A \u0648\u0627\u0644\u062E\u062A\u0645 \u0627\u0644\u0645\u0639\u062A\u0645\u062F */
    .signatures-matrix {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin-top: 18px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .sig-col {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 4px;
      text-align: center;
      background: #fafafa;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 75px;
    }
    .sig-label {
      font-size: 9px;
      font-weight: 700;
      color: #475569;
      display: block;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 3px;
      margin-bottom: 4px;
    }
    .sig-sign {
      font-size: 9.5px;
      font-weight: 600;
      color: #64748b;
    }
    .stamp-col {
      background: #f8fafc;
      border: 1px solid #94a3b8;
    }
    .stamp-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      min-height: 48px;
    }
    .stamp-img {
      max-height: 52px;
      max-width: 80px;
      object-fit: contain;
      transform: rotate(-3deg);
    }
    .stamp-placeholder {
      font-size: 8.5px;
      color: #94a3b8;
      border: 1.5px dashed #cbd5e1;
      border-radius: 6px;
      width: 58px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      line-height: 1.15;
    }

    /* \u0627\u0644\u0641\u0648\u062A\u0631 */
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
    <!-- \u0627\u0644\u062A\u0631\u0648\u064A\u0633\u0629 \u0627\u0644\u0631\u0633\u0645\u064A\u0629 -->
    <header class="tenant-header">
      <div class="org-meta">
        <div class="country-line">\u062C\u0645\u0647\u0648\u0631\u064A\u0629 \u0627\u0644\u0633\u0648\u062F\u0627\u0646 \u2022 \u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0648\u0627\u0644\u062A\u0631\u0628\u064A\u0629 \u0627\u0644\u0648\u0637\u0646\u064A\u0629</div>
        <h2 class="org-name-ar">${d}</h2>
        <div class="org-name-en">${c}</div>
      </div>
      <div class="brand-logo-wrap">
        <img src="${v}" alt="\u0634\u0639\u0627\u0631 \u0627\u0644\u0645\u0624\u0633\u0633\u0629" class="brand-logo" onerror="this.style.display='none'">
      </div>
      <div class="contact-meta">
        <div>\u0627\u0644\u0639\u0646\u0648\u0627\u0646: ${at}</div>
        <div>\u0627\u0644\u0647\u0627\u062A\u0641: ${nt}</div>
        <div>\u0627\u0644\u0628\u0631\u064A\u062F: ${it}</div>
      </div>
    </header>

    <!-- \u0634\u0631\u064A\u0637 \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0637\u0644\u0628 -->
    <div class="doc-hero">
      <div>
        <h1>\u0637\u0644\u0628 \u0634\u0631\u0627\u0621 \u062F\u0627\u062E\u0644\u064A (Purchase Request)</h1>
        <span class="sub-title">\u0625\u062F\u0627\u0631\u0629 \u0633\u0644\u0627\u0633\u0644 \u0627\u0644\u0625\u0645\u062F\u0627\u062F \u0648\u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A \u2022 \u0646\u0638\u0627\u0645 \u0646\u0628\u0631\u0627\u0633</span>
      </div>
      <div class="status-tag">${st}</div>
    </div>

    <!-- \u0634\u0628\u0643\u0629 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0637\u0644\u0628 -->
    <div class="meta-grid">
      <div class="meta-box">
        <div class="meta-box-title">\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0637\u0644\u0628 \u0627\u0644\u062F\u0627\u062E\u0644\u064A</div>
        <div class="kv-row"><span class="k">\u0631\u0642\u0645 \u0637\u0644\u0628 \u0627\u0644\u0634\u0631\u0627\u0621:</span><span class="v mono font-bold">${a.request_number}</span></div>
        <div class="kv-row"><span class="k">\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0637\u0644\u0628:</span><span class="v mono">${a.date||"\u2014"}</span></div>
        <div class="kv-row"><span class="k">\u062F\u0631\u062C\u0629 \u0627\u0644\u0623\u0648\u0644\u0648\u064A\u0629:</span><span class="v">${ut}</span></div>
      </div>

      <div class="meta-box">
        <div class="meta-box-title">\u0627\u0644\u062C\u0647\u0629 \u0627\u0644\u0637\u0627\u0644\u0628\u0629 \u0648\u0627\u0644\u062A\u0643\u0644\u064A\u0641</div>
        <div class="kv-row"><span class="k">\u0627\u0644\u0642\u0633\u0645 \u0627\u0644\u0637\u0627\u0644\u0628:</span><span class="v font-bold">${a.department_name||"\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u062F\u0631\u0633\u0629"}</span></div>
        <div class="kv-row"><span class="k">\u0645\u064F\u0642\u062F\u0651\u0645 \u0627\u0644\u0637\u0644\u0628:</span><span class="v">${a.requested_by_name||"\u0627\u0644\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u0625\u062F\u0627\u0631\u064A"}</span></div>
        <div class="kv-row"><span class="k">\u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u0625\u062F\u0627\u0631\u064A:</span><span class="v">${a.approved_by_name||"\u0628\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F"}</span></div>
      </div>
    </div>

    <!-- \u062C\u062F\u0648\u0644 \u0627\u0644\u0628\u0646\u0648\u062F \u0648\u0627\u0644\u0623\u0635\u0646\u0627\u0641 -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 4%; text-align: center;">#</th>
          <th style="width: 28%;">\u0627\u0644\u0635\u0646\u0641 \u0648\u0627\u0644\u0628\u064A\u0627\u0646</th>
          <th style="width: 8%; text-align: center;">\u0627\u0644\u0648\u062D\u062F\u0629</th>
          <th style="width: 8%; text-align: end;">\u0627\u0644\u0643\u0645\u064A\u0629</th>
          <th style="width: 14%; text-align: end;">\u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A (\u062C.\u0633)</th>
          <th style="width: 15%;">\u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0648\u0627\u0632\u0646\u0629</th>
          <th style="width: 11%;">\u0645\u0631\u0643\u0632 \u0627\u0644\u062A\u0643\u0644\u0641\u0629</th>
          <th style="width: 12%; text-align: end;">\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A (\u062C.\u0633)</th>
        </tr>
      </thead>
      <tbody>
        ${dt||'<tr><td colspan="8" style="text-align: center;">\u0644\u0627 \u062A\u0648\u062C\u062F \u0623\u0635\u0646\u0627\u0641 \u0645\u062F\u0648\u0646\u0629 \u0628\u0627\u0644\u0637\u0644\u0628.</td></tr>'}
      </tbody>
    </table>

    <!-- \u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0627\u062A \u0648\u0627\u0644\u062A\u0641\u0642\u064A\u0637 -->
    <div class="total-box">
      <div class="total-num-wrap">
        <span>\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A\u0629:</span>
        <span class="total-large mono">${$.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
        <span class="font-bold">\u062C\u0646\u064A\u0647 \u0633\u0648\u062F\u0627\u0646\u064A (\u062C.\u0633)</span>
      </div>
      <div class="total-tafqeet">
        ${ot}
      </div>
    </div>

    <!-- \u0645\u0628\u0631\u0631\u0627\u062A \u0648\u0633\u0628\u0628 \u0627\u0644\u0634\u0631\u0627\u0621 -->
    <div class="reason-box">
      <div class="r-title">\u0645\u0628\u0631\u0631\u0627\u062A \u0648\u0633\u0628\u0628 \u0627\u0644\u0634\u0631\u0627\u0621:</div>
      <div>${a.reason||"\u062A\u0623\u0645\u064A\u0646 \u0627\u062D\u062A\u064A\u0627\u062C\u0627\u062A \u0627\u0644\u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A\u0629 \u0648\u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629 \u0648\u0641\u0642 \u0627\u0644\u062E\u0637\u0629 \u0627\u0644\u062A\u0634\u063A\u064A\u0644\u064A\u0629 \u0644\u0644\u0645\u0624\u0633\u0633\u0629."}</div>
    </div>

    <!-- \u0645\u0635\u0641\u0648\u0641\u0629 \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F\u0627\u062A \u0648\u0627\u0644\u062A\u0648\u0642\u064A\u0639\u0627\u062A \u0648\u0627\u0644\u062E\u062A\u0645 \u0627\u0644\u0645\u0639\u062A\u0645\u062F -->
    <div class="signatures-matrix">
      <div class="sig-col">
        <span class="sig-label">\u0631\u0626\u064A\u0633 \u0627\u0644\u0642\u0633\u0645 \u0627\u0644\u0637\u0627\u0644\u0628</span>
        <span class="sig-sign">${e||"\u0645\u0642\u062F\u0651\u0645 \u0627\u0644\u0637\u0644\u0628"}</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">\u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0648\u0627\u0644\u062A\u062F\u0642\u064A\u0642 \u0627\u0644\u0645\u0627\u0644\u064A</span>
        <span class="sig-sign">\u0627\u0644\u0645\u0631\u0627\u062C\u0639 \u0627\u0644\u062F\u0627\u062E\u0644\u064A</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A</span>
        <span class="sig-sign">\u0645\u062F\u064A\u0631 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">\u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u0645\u0627\u0644\u064A \u0648\u0627\u0644\u0625\u062F\u0627\u0631\u064A</span>
        <span class="sig-sign">\u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0627\u0645 / \u0627\u0644\u0645\u0627\u0644\u064A</span>
      </div>
      <div class="sig-col stamp-col">
        <span class="sig-label">\u0627\u0644\u062E\u062A\u0645 \u0627\u0644\u0645\u0627\u0644\u064A \u0627\u0644\u0631\u0633\u0645\u064A</span>
        <div class="stamp-wrap">
          ${n.stampFinanceUrl?`
            <img src="${n.stampFinanceUrl}" alt="\u062E\u062A\u0645 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629" class="stamp-img" onerror="this.parentElement.innerHTML='<div class=\\'stamp-placeholder\\'>\u062E\u062A\u0645 \u0645\u0627\u0644\u064A<br>\u0645\u0639\u062A\u0645\u062F</div>'" />
          `:`
            <div class="stamp-placeholder">\u062E\u062A\u0645 \u0645\u0627\u0644\u064A<br>\u0645\u0639\u062A\u0645\u062F</div>
          `}
        </div>
      </div>
    </div>

    <!-- \u062A\u0630\u064A\u064A\u0644 \u0627\u0644\u0645\u0633\u062A\u0623\u062C\u0631 \u0648\u0647\u0648\u064A\u0629 \u0646\u0628\u0631\u0627\u0633 -->
    <footer class="tenant-footer">
      <div class="f-brand">
        \u0645\u0646\u0638\u0648\u0645\u0629 <strong>\u0646\u0628\u0631\u0627\u0633 (Nebras OS)</strong> \u2022 \u0625\u062F\u0627\u0631\u0629 \u0633\u0644\u0627\u0633\u0644 \u0627\u0644\u0625\u0645\u062F\u0627\u062F \u0648\u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A
      </div>
      <div>
        <span>\u0637\u0644\u0628 \u0634\u0631\u0627\u0621: ${a.request_number}</span> \u2022 
        <span>\u0637\u064F\u0628\u0639 \u0628\u062A\u0627\u0631\u064A\u062E: ${rt}</span>
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
</html>`,C=window.open("","_blank","width=1000,height=800,menubar=no,toolbar=no,location=no,status=no");if(!C){console.warn("\u062A\u0639\u0630\u0631 \u0641\u062A\u062D \u0646\u0627\u0641\u0630\u0629 \u0627\u0644\u0637\u0628\u0627\u0639\u0629 \u0627\u0644\u0645\u0646\u0628\u062B\u0642\u0629.");return}C.document.open(),C.document.write(lt),C.document.close()}var mt=()=>[],gt=(a,t)=>t.key,et=(a,t)=>t.id;function xt(a,t){a&1&&O(0,"div",3)(1,"div",4)}function bt(a,t){if(a&1){let e=y();r(0,"button",27),f("click",function(){_(e);let d=l(),c=l();return h(c.submit(d))}),o(1,"\u{1F4E4} \u0625\u0631\u0633\u0627\u0644 \u0644\u0644\u0627\u0639\u062A\u0645\u0627\u062F"),i(),r(2,"span",28),o(3,"\u0627\u0644\u062E\u0637\u0648\u0629 \u0627\u0644\u062A\u0627\u0644\u064A\u0629: \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0637\u0644\u0628 \u0644\u0645\u0631\u0627\u062C\u0639\u062A\u0647 \u0648\u0627\u0639\u062A\u0645\u0627\u062F\u0647."),i()}if(a&2){let e=l(2);D("disabled",e.busy())}}function ft(a,t){if(a&1){let e=y();r(0,"button",29),f("click",function(){_(e);let d=l(),c=l();return h(c.approve(d))}),o(1,"\u2713 \u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u0637\u0644\u0628"),i(),r(2,"span",28),o(3,"\u0627\u0644\u062E\u0637\u0648\u0629 \u0627\u0644\u062A\u0627\u0644\u064A\u0629: \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F \u062B\u0645 \u062A\u0648\u0644\u064A\u062F \u0639\u0631\u0648\u0636 \u0627\u0644\u0623\u0633\u0639\u0627\u0631."),i()}if(a&2){let e=l(2);D("disabled",e.busy())}}function vt(a,t){if(a&1){let e=y();r(0,"button",27),f("click",function(){_(e);let d=l(),c=l();return h(c.makeRfq(d))}),o(1,"\u{1F4E8} \u062A\u0648\u0644\u064A\u062F \u0637\u0644\u0628 \u0639\u0631\u0648\u0636 \u0623\u0633\u0639\u0627\u0631"),i(),r(2,"span",28),o(3,"\u0627\u0644\u062E\u0637\u0648\u0629 \u0627\u0644\u062A\u0627\u0644\u064A\u0629: \u0627\u0633\u062A\u0642\u0628\u0627\u0644 \u0639\u0631\u0648\u0636 \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646 \u0648\u0627\u0644\u062A\u0631\u0633\u064A\u0629."),i()}if(a&2){let e=l(2);D("disabled",e.busy())}}function _t(a,t){a&1&&(r(0,"a",30),o(1,"\u{1F4E8} \u0641\u062A\u062D \u0639\u0631\u0648\u0636 \u0627\u0644\u0623\u0633\u0639\u0627\u0631"),i(),r(2,"span",28),o(3,"\u0633\u062C\u0651\u0644 \u0639\u0631\u0648\u0636 \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646 \u062B\u0645 \u0623\u0631\u0633\u0650 \u0644\u062A\u0648\u0644\u064A\u062F \u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621."),i())}function ht(a,t){a&1&&(r(0,"a",14),o(1,"\u{1F4E6} \u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621"),i())}function yt(a,t){if(a&1&&O(0,"span",35),a&2){let e=l().$index,n=l(2);A("done",n.stepIndex()>e)}}function Ct(a,t){if(a&1&&(r(0,"div",31)(1,"span",32),o(2),i(),r(3,"span",33),o(4),i()(),x(5,yt,1,2,"span",34)),a&2){let e=t.$implicit,n=t.$index,d=t.$index,c=t.$count,v=l(2);A("done",v.stepIndex()>n)("now",v.stepIndex()===n),s(2),u(v.stepIndex()>n?"\u2713":n+1),s(2),u(e.label),s(),b(d!==c-1?5:-1)}}function wt(a,t){if(a&1&&(r(0,"div",26)(1,"span",36),o(2),i(),r(3,"span",37),o(4),i(),r(5,"span",38),o(6),i(),r(7,"span",37),o(8),i(),r(9,"span",39),o(10),i(),r(11,"span",39),o(12),i(),r(13,"span",40),o(14),i()()),a&2){let e=t.$implicit,n=l(2);s(2),u(e.item_name),s(2),u(e.quantity),s(2),u(e.unit),s(2),u(n.fmt(e.estimated_unit_price)),s(2),u(n.accName(e.budget_account_id)),s(2),u(n.ccName(e.cost_center_id)),s(2),u(n.fmt(n.lineTotal(e)))}}function kt(a,t){a&1&&(r(0,"div",2),o(1,"\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u0646\u0648\u062F."),i())}function Mt(a,t){if(a&1&&(r(0,"div",42)(1,"span",43),o(2),i(),r(3,"span"),o(4),i(),r(5,"span",40),o(6),i(),r(7,"span",25)(8,"span",8),o(9),i()()()),a&2){let e=t.$implicit,n=l(3);s(2),u(e.po_number),s(2),u(n.vendorName(e.vendor)),s(2),u(n.fmt(e.total_amount)),s(2),k("data-s",e.status),s(),u(n.poStatus(e.status))}}function Pt(a,t){if(a&1&&(r(0,"section",22)(1,"div",23)(2,"h3"),o(3,"\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 \u0627\u0644\u0645\u062A\u0648\u0644\u0651\u062F\u0629"),i()(),r(4,"div",41)(5,"span"),o(6,"\u0631\u0642\u0645 \u0627\u0644\u0623\u0645\u0631"),i(),r(7,"span"),o(8,"\u0627\u0644\u0645\u0648\u0631\u0651\u062F"),i(),r(9,"span",25),o(10,"\u0627\u0644\u0642\u064A\u0645\u0629"),i(),r(11,"span",25),o(12,"\u0627\u0644\u062D\u0627\u0644\u0629"),i()(),M(13,Mt,10,5,"div",42,et),i()),a&2){let e=l(2);s(13),P(e.orders())}}function Dt(a,t){if(a&1){let e=y();r(0,"div",5)(1,"div",6)(2,"div",7)(3,"h1"),o(4),i(),r(5,"span",8),o(6),i(),r(7,"span",9),o(8),i()(),r(9,"p",10),o(10),i(),r(11,"div",11)(12,"span")(13,"b"),o(14,"\u0627\u0644\u0642\u0633\u0645 \u0627\u0644\u0637\u0627\u0644\u0628:"),i(),o(15),i(),r(16,"span")(17,"b"),o(18,"\u0627\u0644\u062A\u0627\u0631\u064A\u062E:"),i(),o(19),i(),r(20,"span")(21,"b"),o(22,"\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A:"),i(),r(23,"em"),o(24),i()()()(),r(25,"div",12)(26,"button",13),f("click",function(){let d=_(e),c=l();return h(c.print(d))}),o(27,"\u{1F5A8}\uFE0F \u0637\u0628\u0627\u0639\u0629"),i(),x(28,bt,4,1)(29,ft,4,1)(30,vt,4,1)(31,_t,4,0)(32,ht,2,0,"a",14),i()(),r(33,"div",15),M(34,Ct,6,7,null,null,gt),i(),r(36,"div",16)(37,"a",17)(38,"span",18),o(39),i(),r(40,"span",19),o(41,"\u{1F4E8} \u0639\u0631\u0648\u0636 \u0623\u0633\u0639\u0627\u0631"),i()(),r(42,"a",20)(43,"span",18),o(44),i(),r(45,"span",19),o(46,"\u{1F4E6} \u0623\u0648\u0627\u0645\u0631 \u0634\u0631\u0627\u0621"),i()(),r(47,"div",21)(48,"span",18),o(49),i(),r(50,"span",19),o(51,"\u{1F9FE} \u0628\u0646\u0648\u062F \u0627\u0644\u0637\u0644\u0628"),i()()(),r(52,"section",22)(53,"div",23)(54,"h3"),o(55,"\u0628\u0646\u0648\u062F \u0627\u0644\u0637\u0644\u0628"),i()(),r(56,"div",24)(57,"span"),o(58,"\u0627\u0644\u0635\u0646\u0641"),i(),r(59,"span",25),o(60,"\u0627\u0644\u0643\u0645\u064A\u0629"),i(),r(61,"span"),o(62,"\u0627\u0644\u0648\u062D\u062F\u0629"),i(),r(63,"span",25),o(64,"\u0633\u0639\u0631 \u062A\u0642\u062F\u064A\u0631\u064A"),i(),r(65,"span"),o(66,"\u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0648\u0627\u0632\u0646\u0629"),i(),r(67,"span"),o(68,"\u0645\u0631\u0643\u0632 \u0627\u0644\u062A\u0643\u0644\u0641\u0629"),i(),r(69,"span",25),o(70,"\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A"),i()(),M(71,wt,15,7,"div",26,et),x(73,kt,2,0,"div",2),i(),x(74,Pt,15,0,"section",22)}if(a&2){let e=t,n=l();s(4),u(e.request_number),s(),k("data-s",e.status),s(),u(n.statusText(e.status)),s(),k("data-p",e.priority),s(),u(n.priText(e.priority)),s(2),u(e.reason||"\u2014"),s(5),q(" ",n.deptName(e.department_id)),s(4),q(" ",e.date),s(5),u(n.fmt(e.total_estimated_amount)),s(4),b(e.status==="draft"?28:e.status==="pending_approval"?29:e.status==="approved"?30:e.status==="rfq_created"?31:e.status==="completed"?32:-1),s(6),P(n.steps),s(5),u(n.rfqs().length),s(5),u(n.orders().length),s(5),u((e.items==null?null:e.items.length)||0),s(22),P(e.items||I(15,mt)),s(2),b(e.items!=null&&e.items.length?-1:73),s(),b(n.orders().length?74:-1)}}function St(a,t){a&1&&(r(0,"div",2),o(1,"\u062A\u0639\u0630\u0651\u0631 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0637\u0644\u0628."),i())}var tt=class a{svc=m(X);route=m(L);router=m(V);auth=m(B);dialog=m(Y);notify=m(K);pr=p(null);loading=p(!0);busy=p(!1);rfqs=p([]);orders=p([]);deptMap=p({});accMap=p({});ccMap=p({});vendorMap=p({});id="";steps=[{key:"draft",label:"\u0645\u0633\u0648\u062F\u0629"},{key:"pending_approval",label:"\u0642\u064A\u062F \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F"},{key:"approved",label:"\u0645\u0639\u062A\u0645\u062F"},{key:"rfq_created",label:"\u0639\u0631\u0648\u0636 \u0623\u0633\u0639\u0627\u0631"},{key:"completed",label:"\u0645\u0643\u062A\u0645\u0644"}];stepIndex=N(()=>{let t=this.pr()?.status,e=this.steps.findIndex(n=>n.key===t);return e<0?0:e});pick(t){return Array.isArray(t)?t:t?.data??t?.results??[]}ngOnInit(){this.id=this.route.snapshot.paramMap.get("id"),this.load(),this.svc.getRequestReferenceData().subscribe({next:t=>{let e=t?.data??t??{};this.deptMap.set(Object.fromEntries((e.departments||[]).map(n=>[String(n.id),n.name]))),this.accMap.set(Object.fromEntries((e.accounts||[]).map(n=>[String(n.id),`${n.code} \u2014 ${n.name}`]))),this.ccMap.set(Object.fromEntries((e.cost_centers||[]).map(n=>[String(n.id),n.name])))},error:()=>{}}),this.svc.getVendors({page_size:200}).subscribe({next:t=>this.vendorMap.set(Object.fromEntries(this.pick(t).map(e=>[String(e.id),e.name_ar||e.name_en]))),error:()=>{}})}load(){this.loading.set(!0),this.svc.getPurchaseRequest(this.id).subscribe({next:t=>{this.pr.set(t?.data??t),this.loading.set(!1)},error:()=>this.loading.set(!1)}),this.svc.getRFQs({page_size:200}).subscribe({next:t=>this.rfqs.set(this.pick(t).filter(e=>String(e.purchase_request)===this.id)),error:()=>{}}),this.svc.getPurchaseOrders({page_size:200}).subscribe({next:t=>this.orders.set(this.pick(t).filter(e=>String(e.purchase_request)===this.id)),error:()=>{}})}print(t){let e=E(S({},t),{department_name:this.deptName(t.department_id),items:(t.items||[]).map(n=>E(S({},n),{budget_account_name:this.accName(n.budget_account_id),cost_center_name:this.ccName(n.cost_center_id)}))});Z(e)}back(){this.router.navigate(["/procurement/requests"])}fmt(t){return(Number(t)||0).toLocaleString("en-US",{maximumFractionDigits:2})}lineTotal(t){return(Number(t.quantity)||0)*(Number(t.estimated_unit_price)||0)}deptName(t){return this.deptMap()[String(t)]||"\u2014"}accName(t){return this.accMap()[String(t)]||"\u2014"}ccName(t){return this.ccMap()[String(t)]||"\u2014"}vendorName(t){return this.vendorMap()[String(t)]||"\u2014"}priText(t){return{high:"\u0639\u0627\u062C\u0644",medium:"\u0645\u062A\u0648\u0633\u0637",low:"\u0645\u0646\u062E\u0641\u0636"}[t]||t||"\u2014"}statusText(t){return{draft:"\u0645\u0633\u0648\u062F\u0629",pending_approval:"\u062A\u062D\u062A \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629",approved:"\u0645\u0639\u062A\u0645\u062F \u0644\u0644\u0634\u0631\u0627\u0621",rejected:"\u0645\u0631\u0641\u0648\u0636",rfq_created:"\u0623\u064F\u0646\u0634\u0626 RFQ",completed:"\u0645\u0643\u062A\u0645\u0644"}[t]||t}poStatus(t){return{draft:"\u0645\u0633\u0648\u062F\u0629",approved:"\u0645\u0639\u062A\u0645\u062F",issued:"\u0645\u064F\u0631\u0633\u0644",completed:"\u0645\u0643\u062A\u0645\u0644 \u0648\u0645\u064F\u0631\u062D\u0651\u0644",cancelled:"\u0645\u0644\u063A\u0649"}[t]||t}confirm(t){return new Promise(e=>this.dialog.open(J,{data:t}).afterClosed().subscribe(n=>e(!!n)))}submit(t){return w(this,null,function*(){(yield this.confirm({title:"\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0637\u0644\u0628 \u0644\u0644\u0627\u0639\u062A\u0645\u0627\u062F",message:`\u0633\u064A\u064F\u0631\u0633\u0644 \xAB${t.request_number}\xBB \u0644\u0645\u0631\u0627\u062C\u0639\u062A\u0647 \u0648\u0627\u0639\u062A\u0645\u0627\u062F\u0647\u060C \u0648\u0644\u0646 \u064A\u0628\u0642\u0649 \u0645\u0633\u0648\u062F\u0629 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062A\u0639\u062F\u064A\u0644.`,confirmText:"\u0625\u0631\u0633\u0627\u0644",color:"primary"}))&&(this.busy.set(!0),this.svc.submitPurchaseRequest(t.id).subscribe({next:()=>{this.busy.set(!1),this.notify.success("\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0637\u0644\u0628 \u0644\u0644\u0627\u0639\u062A\u0645\u0627\u062F."),this.load()},error:n=>{this.busy.set(!1),this.notify.error(n?.details?.error||n?.message||"\u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u0625\u0631\u0633\u0627\u0644.")}}))})}approve(t){return w(this,null,function*(){(yield this.confirm({title:"\u0627\u0639\u062A\u0645\u0627\u062F \u0637\u0644\u0628 \u0627\u0644\u0634\u0631\u0627\u0621",message:`\u0633\u064A\u062A\u0645 \u0627\u0639\u062A\u0645\u0627\u062F \xAB${t.request_number}\xBB \u0648\u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0628\u0647 \u0641\u064A \u0645\u0633\u0627\u0631 \u0627\u0644\u0634\u0631\u0627\u0621.`,confirmText:"\u0627\u0639\u062A\u0645\u0627\u062F",color:"primary"}))&&(this.busy.set(!0),this.svc.approvePurchaseRequest(t.id,{approver_id:this.auth.currentUser()?.id}).subscribe({next:()=>{this.busy.set(!1),this.notify.success("\u062A\u0645 \u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u0637\u0644\u0628."),this.load()},error:n=>{this.busy.set(!1),this.notify.error(n?.details?.error||n?.message||"\u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F.")}}))})}makeRfq(t){return w(this,null,function*(){if(!(yield this.confirm({title:"\u062A\u0648\u0644\u064A\u062F \u0637\u0644\u0628 \u0639\u0631\u0648\u0636 \u0623\u0633\u0639\u0627\u0631",message:`\u0633\u064A\u064F\u0648\u0644\u064E\u0651\u062F RFQ \u0645\u0646 \xAB${t.request_number}\xBB \u0628\u0645\u0648\u0639\u062F \u0646\u0647\u0627\u0626\u064A \u0628\u0639\u062F 7 \u0623\u064A\u0627\u0645.`,confirmText:"\u062A\u0648\u0644\u064A\u062F",color:"primary"})))return;let n=new Date(Date.now()+7*864e5).toISOString().slice(0,19);this.busy.set(!0),this.svc.createRFQ({purchase_request_id:t.id,deadline:n,notes:""}).subscribe({next:()=>{this.busy.set(!1),this.notify.success("\u062A\u0645 \u062A\u0648\u0644\u064A\u062F \u0637\u0644\u0628 \u0639\u0631\u0648\u0636 \u0627\u0644\u0623\u0633\u0639\u0627\u0631."),this.load()},error:d=>{this.busy.set(!1),this.notify.error(d?.details?.error||d?.message||"\u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u062A\u0648\u0644\u064A\u062F.")}})})}static \u0275fac=function(e){return new(e||a)};static \u0275cmp=T({type:a,selectors:[["app-procurement-request-detail"]],decls:6,vars:1,consts:[["dir","rtl",1,"page"],[1,"back",3,"click"],[1,"empty"],[1,"sk","hero"],[1,"sk"],[1,"hero"],[1,"hero-main"],[1,"h-title"],[1,"badge"],[1,"pri"],[1,"reason"],[1,"meta"],[1,"hero-actions"],["title","\u0637\u0628\u0627\u0639\u0629 \u0627\u0644\u0637\u0644\u0628 \u0628\u0628\u0646\u0648\u062F\u0647",1,"btn","ghost",3,"click"],["routerLink","/procurement/orders",1,"btn","ok"],[1,"track"],[1,"smart"],["routerLink","/procurement/rfqs",1,"sb"],[1,"sb-n"],[1,"sb-l"],["routerLink","/procurement/orders",1,"sb"],[1,"sb","static"],[1,"card"],[1,"card-head"],[1,"row","head"],[1,"ta-end"],[1,"row"],[1,"btn","primary",3,"click","disabled"],[1,"hint"],[1,"btn","ok",3,"click","disabled"],["routerLink","/procurement/rfqs",1,"btn","primary"],[1,"step"],[1,"dot"],[1,"st-label"],[1,"line",3,"done"],[1,"line"],[1,"strong"],[1,"ta-end","mono"],[1,"muted"],[1,"dim"],[1,"ta-end","strong"],[1,"row","po","head"],[1,"row","po"],[1,"mono"]],template:function(e,n){if(e&1&&(r(0,"div",0)(1,"button",1),f("click",function(){return n.back()}),o(2,"\u2039 \u0631\u062C\u0648\u0639 \u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0634\u0631\u0627\u0621"),i(),x(3,xt,2,0)(4,Dt,75,16)(5,St,2,0,"div",2),i()),e&2){let d;s(3),b(n.loading()?3:(d=n.pr())?4:5,d)}},dependencies:[j,U,G,Q],styles:['@charset "UTF-8";.page[_ngcontent-%COMP%]{flex:1;padding:22px;overflow-y:auto;background:var(--nb-bg);font-family:var(--nb-font-family)}.back[_ngcontent-%COMP%]{background:none;border:none;color:var(--nb-primary-600);font-family:inherit;font-weight:700;font-size:13.5px;cursor:pointer;padding:4px 0 12px}.hero[_ngcontent-%COMP%]{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;background:var(--nb-surface);border:1px solid var(--nb-border);border-radius:var(--nb-radius-card);padding:20px;margin-bottom:14px}@media(max-width:820px){.hero[_ngcontent-%COMP%]{flex-direction:column}}.h-title[_ngcontent-%COMP%]{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.h-title[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%]{margin:0;font-size:22px;font-weight:800;color:var(--nb-text);font-variant-numeric:tabular-nums}.reason[_ngcontent-%COMP%]{margin:8px 0 12px;font-size:13.5px;color:var(--nb-text-secondary)}.meta[_ngcontent-%COMP%]{display:flex;gap:20px;flex-wrap:wrap;font-size:12.5px;color:var(--nb-text-muted)}.meta[_ngcontent-%COMP%]   b[_ngcontent-%COMP%]{color:var(--nb-text);font-weight:700}.meta[_ngcontent-%COMP%]   em[_ngcontent-%COMP%]{font-style:normal;font-weight:800;color:var(--nb-text);font-size:14px}.hero-actions[_ngcontent-%COMP%]{flex:none;display:flex;flex-direction:column;gap:8px;align-items:stretch}.hint[_ngcontent-%COMP%]{font-size:11.5px;color:var(--nb-text-muted);text-align:center;max-width:240px}a.btn[_ngcontent-%COMP%]{display:inline-flex;align-items:center;justify-content:center;text-decoration:none}.track[_ngcontent-%COMP%]{display:flex;align-items:center;background:var(--nb-surface);border:1px solid var(--nb-border);border-radius:var(--nb-radius-card);padding:14px 18px;margin-bottom:14px;overflow-x:auto}.step[_ngcontent-%COMP%]{display:flex;align-items:center;gap:8px;flex:none}.dot[_ngcontent-%COMP%]{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;flex:none;font-size:11px;font-weight:800;background:var(--nb-surface-raised);color:var(--nb-text-muted);border:1px solid var(--nb-border)}.st-label[_ngcontent-%COMP%]{font-size:12px;font-weight:700;color:var(--nb-text-muted);white-space:nowrap}.step.done[_ngcontent-%COMP%]   .dot[_ngcontent-%COMP%]{background:#16a34a;color:#fff;border-color:transparent}.step.done[_ngcontent-%COMP%]   .st-label[_ngcontent-%COMP%]{color:var(--nb-text)}.step.now[_ngcontent-%COMP%]   .dot[_ngcontent-%COMP%]{background:var(--nb-primary-600);color:#fff;border-color:transparent;box-shadow:0 0 0 4px var(--nb-primary-50)}.step.now[_ngcontent-%COMP%]   .st-label[_ngcontent-%COMP%]{color:var(--nb-primary-700);font-weight:800}.line[_ngcontent-%COMP%]{flex:1;min-width:24px;height:2px;background:var(--nb-border);margin:0 10px}.line.done[_ngcontent-%COMP%]{background:#16a34a}.btn[_ngcontent-%COMP%]{height:38px;padding:0 18px;font-family:inherit;font-size:13px;font-weight:800;border-radius:var(--nb-radius);cursor:pointer;border:none;white-space:nowrap}.btn.ok[_ngcontent-%COMP%]{background:#16a34a;color:#fff}.btn.primary[_ngcontent-%COMP%]{background:var(--nb-primary-600);color:#fff}.btn[_ngcontent-%COMP%]:disabled{opacity:.6;cursor:default}.smart[_ngcontent-%COMP%]{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap}.sb[_ngcontent-%COMP%]{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:120px;background:var(--nb-surface);border:1px solid var(--nb-border);border-radius:var(--nb-radius-card);padding:12px 16px;text-decoration:none;transition:border-color .15s ease,transform .15s ease}.sb[_ngcontent-%COMP%]:not(.static):hover{border-color:var(--nb-primary-400);transform:translateY(-2px)}.sb-n[_ngcontent-%COMP%]{font-size:20px;font-weight:800;color:var(--nb-primary-700);font-variant-numeric:tabular-nums}.sb-l[_ngcontent-%COMP%]{font-size:11.5px;font-weight:700;color:var(--nb-text-muted)}.sb.static[_ngcontent-%COMP%]   .sb-n[_ngcontent-%COMP%]{color:var(--nb-text)}.card[_ngcontent-%COMP%]{background:var(--nb-surface);border:1px solid var(--nb-border);border-radius:var(--nb-radius-card);overflow:hidden;margin-bottom:14px}.card-head[_ngcontent-%COMP%]{padding:14px 16px 10px}.card-head[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%]{margin:0;font-size:14px;font-weight:800;color:var(--nb-text)}.row[_ngcontent-%COMP%]{display:grid;grid-template-columns:1.6fr .6fr .6fr .9fr 1.3fr 1.2fr .9fr;gap:8px;align-items:center;padding:10px 16px;font-size:13px;color:var(--nb-text);border-top:1px solid var(--nb-border-soft)}.row.po[_ngcontent-%COMP%]{grid-template-columns:1.2fr 1.6fr 1fr 1fr}.row.head[_ngcontent-%COMP%]{background:var(--nb-surface-raised);font-size:11px;font-weight:700;color:var(--nb-text-muted)}.ta-end[_ngcontent-%COMP%]{text-align:end}.mono[_ngcontent-%COMP%]{font-variant-numeric:tabular-nums}.muted[_ngcontent-%COMP%]{color:var(--nb-text-muted)}.strong[_ngcontent-%COMP%]{font-weight:700}.dim[_ngcontent-%COMP%]{color:var(--nb-primary-700);font-size:12px}.badge[_ngcontent-%COMP%]{font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;background:var(--nb-surface-raised);color:var(--nb-text-muted)}.badge[data-s=approved][_ngcontent-%COMP%]{background:#e0f2fe;color:#075985}.badge[data-s=completed][_ngcontent-%COMP%]{background:#dcfce7;color:#166534}.badge[data-s=rejected][_ngcontent-%COMP%]{background:#fee2e2;color:#991b1b}.badge[data-s=pending_approval][_ngcontent-%COMP%], .badge[data-s=draft][_ngcontent-%COMP%]{background:#fef3c7;color:#92400e}.badge[data-s=rfq_created][_ngcontent-%COMP%]{background:var(--nb-primary-50);color:var(--nb-primary-700)}.pri[_ngcontent-%COMP%]{font-size:11px;font-weight:700;padding:3px 9px;border-radius:6px}.pri[data-p=high][_ngcontent-%COMP%]{background:#fee2e2;color:#991b1b}.pri[data-p=medium][_ngcontent-%COMP%]{background:#fef3c7;color:#92400e}.pri[data-p=low][_ngcontent-%COMP%]{background:var(--nb-surface-raised);color:var(--nb-text-muted)}.empty[_ngcontent-%COMP%]{padding:28px 16px;text-align:center;font-size:13px;color:var(--nb-text-muted)}.sk[_ngcontent-%COMP%]{height:60px;border-radius:var(--nb-radius-card);margin-bottom:12px;background:linear-gradient(90deg,var(--nb-surface-raised),var(--nb-surface),var(--nb-surface-raised));background-size:200% 100%;animation:_ngcontent-%COMP%_sh 1.2s infinite}.sk.hero[_ngcontent-%COMP%]{height:130px}@keyframes _ngcontent-%COMP%_sh{0%{background-position:200% 0}to{background-position:-200% 0}}'],changeDetection:0})};export{tt as ProcurementRequestDetailComponent};
