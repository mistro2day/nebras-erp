import{a as U}from"./chunk-BFSHY4UP.js";import{a as A,b as q,g as F}from"./chunk-3KOLA7OL.js";import{C as I}from"./chunk-DUYKCMMX.js";import{a as N}from"./chunk-IWT6GYYJ.js";import{c as S,g as T,j,y as E}from"./chunk-FH62OBXP.js";import{r as z}from"./chunk-PZ6HKFY6.js";import{Ab as g,Bb as m,Gb as v,Hb as s,Ib as i,Sb as b,Ub as x,Wa as e,ec as k,fb as u,gc as r,hc as l,ic as P,lb as M,mc as O,nc as D,oc as $,qa as C}from"./chunk-MM2ZWJKN.js";function Z(t,o){if(t&1&&(s(0,"p"),r(1),i()),t&2){let a=x();e(),l(a.data.message)}}function tt(t,o){t&1&&(s(0,"b",5),r(1,"*"),i())}function nt(t,o){if(t&1&&(s(0,"div",7),r(1),i()),t&2){let a=x();e(),l(a.data.hint)}}function et(t,o){if(t&1&&(s(0,"div",8),r(1),i()),t&2){let a=x();e(),l(a.error())}}var R=class t{constructor(o,a){this.dialogRef=o;this.data=a;this.value=a.value??""}dialogRef;data;value="";error=C("");confirm(){let o=(this.value??"").trim();if(this.data.required!==!1&&!o){this.error.set(`${this.data.label} \u0645\u0637\u0644\u0648\u0628.`);return}this.dialogRef.close(o)}cancel(){this.dialogRef.close(null)}static \u0275fac=function(a){return new(a||t)(u(A),u(q))};static \u0275cmp=M({type:t,selectors:[["app-input-dialog"]],decls:21,vars:16,consts:[["dir","rtl",1,"nb-dlg"],[1,"nb-dlg-head"],[1,"nb-dlg-ic"],[1,"nb-dlg-body"],[1,"lbl"],[1,"req"],["autofocus","",3,"ngModelChange","keyup.enter","type","ngModel","placeholder"],[1,"hint"],[1,"nb-dlg-err"],[1,"nb-dlg-acts"],[1,"nb-dlg-btn","ghost",3,"click"],[1,"nb-dlg-btn","primary",3,"click"]],template:function(a,n){a&1&&(s(0,"div",0)(1,"div",1)(2,"span",2),r(3),i(),s(4,"div")(5,"h2"),r(6),i(),g(7,Z,2,1,"p"),i()(),s(8,"div",3)(9,"label")(10,"span",4),r(11),g(12,tt,2,0,"b",5),i(),s(13,"input",6),$("ngModelChange",function(p){return D(n.value,p)||(n.value=p),p}),b("keyup.enter",function(){return n.confirm()}),i()(),g(14,nt,2,1,"div",7),g(15,et,2,1,"div",8),i(),s(16,"div",9)(17,"button",10),b("click",function(){return n.cancel()}),r(18),i(),s(19,"button",11),b("click",function(){return n.confirm()}),r(20),i()()()),a&2&&(e(),k("warn",n.data.tone==="warn")("danger",n.data.tone==="danger"),e(2),l(n.data.icon||"\u270E"),e(3),l(n.data.title),e(),m(n.data.message?7:-1),e(4),P("",n.data.label," "),e(),m(n.data.required!==!1?12:-1),e(),v("type",n.data.type||"text"),O("ngModel",n.value),v("placeholder",n.data.placeholder||""),e(),m(n.data.hint?14:-1),e(),m(n.error()?15:-1),e(3),l(n.data.cancelText||"\u0625\u0644\u063A\u0627\u0621"),e(2),l(n.data.confirmText||"\u062A\u0623\u0643\u064A\u062F"))},dependencies:[z,E,S,T,j,F,I],styles:['@charset "UTF-8";.nb-dlg[_ngcontent-%COMP%]{font-family:var(--nb-font-family, "Cairo", sans-serif);min-width:460px;max-width:580px;display:flex;flex-direction:column}@media(max-width:560px){.nb-dlg[_ngcontent-%COMP%]{min-width:auto;width:100%}}.nb-dlg-head[_ngcontent-%COMP%]{display:flex;align-items:center;gap:13px;padding:16px 20px;background:linear-gradient(135deg,var(--nb-primary-600, #3f51b5),var(--nb-primary-800, #2c387e));color:#fff}.nb-dlg-head.warn[_ngcontent-%COMP%]{background:linear-gradient(135deg,#f59e0b,#b45309)}.nb-dlg-head.danger[_ngcontent-%COMP%]{background:linear-gradient(135deg,#dc2626,#991b1b)}.nb-dlg-ic[_ngcontent-%COMP%]{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;font-size:18px;flex:none;background:#ffffff2e}.nb-dlg-head[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%]{margin:0;font-size:15.5px;font-weight:800;color:#fff}.nb-dlg-head[_ngcontent-%COMP%]   p[_ngcontent-%COMP%]{margin:3px 0 0;font-size:11.5px;line-height:1.65;color:#ffffffd1}.nb-dlg-body[_ngcontent-%COMP%]{padding:20px;background:var(--nb-surface, #fff)}.nb-dlg-grid[_ngcontent-%COMP%]{display:grid;gap:14px}.nb-dlg-grid.cols-2[_ngcontent-%COMP%]{grid-template-columns:1fr 1fr}@media(max-width:560px){.nb-dlg-grid.cols-2[_ngcontent-%COMP%]{grid-template-columns:1fr}}.nb-dlg[_ngcontent-%COMP%]   label[_ngcontent-%COMP%]{display:grid;grid-template-rows:18px auto;gap:6px}.nb-dlg[_ngcontent-%COMP%]   .lbl[_ngcontent-%COMP%]{font-size:12.5px;font-weight:700;color:var(--nb-text, #1f2937);line-height:18px}.nb-dlg[_ngcontent-%COMP%]   .req[_ngcontent-%COMP%]{color:var(--nb-danger, #dc2626)}.nb-dlg[_ngcontent-%COMP%]   input[_ngcontent-%COMP%], .nb-dlg[_ngcontent-%COMP%]   select[_ngcontent-%COMP%]{font-family:inherit;font-size:13px;height:38px;padding:0 11px;width:100%;box-sizing:border-box;border:1px solid var(--nb-border, #e5e7eb);border-radius:var(--nb-radius, 8px);background:var(--nb-surface, #fff);color:var(--nb-text, #1f2937);transition:border-color .15s ease,box-shadow .15s ease}.nb-dlg[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus, .nb-dlg[_ngcontent-%COMP%]   select[_ngcontent-%COMP%]:focus{outline:none;border-color:var(--nb-primary-400, #7986cb);box-shadow:0 0 0 3px #3f51b51f}.nb-dlg[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]::placeholder{color:var(--nb-text-muted, #94a3b8);opacity:.75}.nb-dlg[_ngcontent-%COMP%]   .hint[_ngcontent-%COMP%]{font-size:11px;color:var(--nb-text-muted, #64748b);margin-top:7px}.nb-dlg-note[_ngcontent-%COMP%]{margin-top:16px;border-radius:var(--nb-radius, 8px);border-inline-start:3px solid var(--nb-primary-400, #7986cb);padding:10px 12px;font-size:12px;line-height:1.7;background:var(--nb-primary-50, #eef0fa);color:var(--nb-primary-800, #2c387e)}.nb-dlg-err[_ngcontent-%COMP%]{margin-top:12px;border-radius:var(--nb-radius, 8px);border-inline-start:3px solid var(--nb-danger, #dc2626);padding:10px 12px;font-size:12.5px;background:#fef2f2;color:#991b1b}.nb-dlg-acts[_ngcontent-%COMP%]{display:flex;justify-content:flex-end;gap:8px;padding:13px 20px;background:var(--nb-surface-raised, #f8fafc);border-top:1px solid var(--nb-border-soft, #eceef5)}.nb-dlg-btn[_ngcontent-%COMP%]{height:38px;padding:0 20px;font-family:inherit;font-size:13px;font-weight:700;border-radius:var(--nb-radius, 8px);cursor:pointer;border:none;transition:filter .15s ease}.nb-dlg-btn[_ngcontent-%COMP%]:hover:not(:disabled){filter:brightness(.95)}.nb-dlg-btn[_ngcontent-%COMP%]:disabled{opacity:.6;cursor:default}.nb-dlg-btn.ghost[_ngcontent-%COMP%]{background:var(--nb-surface, #fff);border:1px solid var(--nb-border, #e5e7eb);color:var(--nb-text, #1f2937)}.nb-dlg-btn.primary[_ngcontent-%COMP%]{background:var(--nb-primary-600, #3f51b5);color:#fff}.nb-dlg-btn.danger[_ngcontent-%COMP%]{background:var(--nb-danger, #dc2626);color:#fff}'],changeDetection:0})};function _t(t,o,a){if(!t)return;let n=N(o),c=n.schoolNameAr,p=n.schoolNameEn,L=n.logoUrl,W=n.phone,B=n.email,G=n.address,h=Number(t.total_amount)||0,V=U(h,"\u062C\u0646\u064A\u0647 \u0633\u0648\u062F\u0627\u0646\u064A"),y=new Date,H=`${y.toISOString().split("T")[0]} ${y.toLocaleTimeString("ar-SD",{hour:"2-digit",minute:"2-digit"})}`,J={draft:"\u0645\u0633\u0648\u062F\u0629 \u0645\u0628\u062F\u0626\u064A\u0629",approved:"\u0645\u0639\u062A\u0645\u062F \u0625\u062F\u0627\u0631\u064A\u0627\u064B",issued:"\u0645\u064F\u0631\u0633\u0644 \u0644\u0644\u0645\u0648\u0631\u0651\u062F",received:"\u0645\u0633\u062A\u0644\u0645 \u0628\u0627\u0644\u0645\u062E\u0627\u0632\u0646",completed:"\u0645\u0643\u062A\u0645\u0644 \u0648\u0645\u0631\u062D\u0651\u0644 \u0645\u0627\u0644\u064A\u0627\u064B",cancelled:"\u0645\u0644\u063A\u064A"}[t.status]||t.status,K=(t.items||[]).map((d,X)=>{let _=Number(d.quantity)||0,w=Number(d.unit_price)||0,Y=Number(d.total_price)||_*w;return`
      <tr>
        <td style="text-align: center;" class="mono">${X+1}</td>
        <td><strong>${d.item_name||"\u2014"}</strong></td>
        <td style="text-align: center;">${d.unit||"\u062D\u0628\u0629"}</td>
        <td style="text-align: end;" class="mono font-bold">${_}</td>
        <td style="text-align: end;" class="mono">${w.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
        <td>${d.budget_account_name||d.budget_account_id||"\u2014"}</td>
        <td>${d.cost_center_name||d.cost_center_id||"\u2014"}</td>
        <td style="text-align: end;" class="mono font-bold">${Y.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      </tr>
    `}).join(""),Q=`<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>\u0623\u0645\u0631 \u0634\u0631\u0627\u0621 \u0631\u0633\u0645\u064A ${t.po_number}</title>
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

    /* \u0634\u0631\u064A\u0637 \u0639\u0646\u0648\u0627\u0646 \u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 */
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

    /* \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0623\u0645\u0631 \u0648\u0627\u0644\u0645\u0648\u0631\u062F */
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

    /* \u062C\u062F\u0648\u0644 \u0627\u0644\u0623\u0635\u0646\u0627\u0641 \u0648\u0627\u0644\u0628\u0646\u0648\u062F */
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

    /* \u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0627\u062A \u0648\u0627\u0644\u062A\u0641\u0642\u064A\u0637 */
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

    /* \u0634\u0631\u0648\u0637 \u0627\u0644\u062F\u0641\u0639 \u0648\u0627\u0644\u062A\u0633\u0644\u064A\u0645 */
    .terms-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 14px;
      font-size: 10.5px;
    }
    .terms-box .t-title { font-weight: 800; color: #475569; margin-bottom: 3px; }

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
      min-height: 45px;
    }
    .stamp-img {
      max-height: 50px;
      max-width: 80px;
      object-fit: contain;
      transform: rotate(-5deg);
    }
    .stamp-badge-ph, .stamp-circle-ph {
      font-size: 8px;
      color: #0284c7;
      font-weight: 700;
      border: 1.5px dashed #0284c7;
      border-radius: 6px;
      width: 58px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      transform: rotate(-3deg);
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
        <h2 class="org-name-ar">${c}</h2>
        <div class="org-name-en">${p}</div>
      </div>
      <div class="brand-logo-wrap">
        <img src="${L}" alt="\u0634\u0639\u0627\u0631 \u0627\u0644\u0645\u0624\u0633\u0633\u0629" class="brand-logo" onerror="this.style.display='none'">
      </div>
      <div class="contact-meta">
        <div>\u0627\u0644\u0639\u0646\u0648\u0627\u0646: ${G}</div>
        <div>\u0627\u0644\u0647\u0627\u062A\u0641: ${W}</div>
        <div>\u0627\u0644\u0628\u0631\u064A\u062F: ${B}</div>
      </div>
    </header>

    <!-- \u0634\u0631\u064A\u0637 \u0639\u0646\u0648\u0627\u0646 \u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 -->
    <div class="doc-hero">
      <div>
        <h1>\u0623\u0645\u0631 \u0634\u0631\u0627\u0621 \u0631\u0633\u0645\u064A (Purchase Order)</h1>
        <span class="sub-title">\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0648\u0627\u0644\u0639\u0642\u0648\u062F \u2022 \u0646\u0638\u0627\u0645 \u0646\u0628\u0631\u0627\u0633</span>
      </div>
      <div class="status-tag">${J}</div>
    </div>

    <!-- \u0634\u0628\u0643\u0629 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 \u0648\u0627\u0644\u0645\u0648\u0631\u062F -->
    <div class="meta-grid">
      <div class="meta-box">
        <div class="meta-box-title">\u0628\u064A\u0627\u0646\u0627\u062A \u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621 \u0648\u0627\u0644\u062A\u0643\u0644\u064A\u0641</div>
        <div class="kv-row"><span class="k">\u0631\u0642\u0645 \u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621:</span><span class="v mono font-bold">${t.po_number}</span></div>
        <div class="kv-row"><span class="k">\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0625\u0635\u062F\u0627\u0631:</span><span class="v mono">${t.date||"\u2014"}</span></div>
        <div class="kv-row"><span class="k">\u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0648\u0627\u0632\u0646\u0629:</span><span class="v">${t.budget_account_name||"\u0645\u0648\u0627\u0632\u0646\u0629 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629"}</span></div>
        <div class="kv-row"><span class="k">\u0641\u0627\u062A\u0648\u0631\u0629 \u0627\u0644\u0645\u0648\u0631\u0651\u062F \u0627\u0644\u0645\u0631\u062C\u0639\u064A\u0629:</span><span class="v mono">${t.vendor_invoice_number||"\u0644\u0645 \u062A\u064F\u0633\u062C\u0644 \u0628\u0639\u062F"}</span></div>
      </div>

      <div class="meta-box">
        <div class="meta-box-title">\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u0631\u0651\u062F \u0627\u0644\u0645\u0639\u0646\u064A</div>
        <div class="kv-row"><span class="k">\u0627\u0633\u0645 \u0627\u0644\u0645\u0648\u0631\u0651\u062F:</span><span class="v font-bold">${t.vendor_name||"\u0645\u0648\u0631\u0651\u062F \u0645\u0639\u062A\u0645\u062F"}</span></div>
        <div class="kv-row"><span class="k">\u0627\u0644\u0647\u0627\u062A\u0641:</span><span class="v mono">${t.vendor_phone||"\u2014"}</span></div>
        <div class="kv-row"><span class="k">\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A:</span><span class="v">${t.vendor_email||"\u2014"}</span></div>
        <div class="kv-row"><span class="k">\u0627\u0644\u0645\u062F\u064A\u0646\u0629 / \u0627\u0644\u0645\u0642\u0631:</span><span class="v">${t.vendor_city||"\u0627\u0644\u062E\u0631\u0637\u0648\u0645"}</span></div>
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
          <th style="width: 14%; text-align: end;">\u0633\u0639\u0631 \u0627\u0644\u0648\u062D\u062F\u0629 (\u062C.\u0633)</th>
          <th style="width: 15%;">\u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0648\u0627\u0632\u0646\u0629</th>
          <th style="width: 11%;">\u0645\u0631\u0643\u0632 \u0627\u0644\u062A\u0643\u0644\u0641\u0629</th>
          <th style="width: 12%; text-align: end;">\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A (\u062C.\u0633)</th>
        </tr>
      </thead>
      <tbody>
        ${K||'<tr><td colspan="8" style="text-align: center;">\u0644\u0627 \u062A\u0648\u062C\u062F \u0623\u0635\u0646\u0627\u0641 \u0645\u062F\u0648\u0646\u0629 \u0628\u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621.</td></tr>'}
      </tbody>
    </table>

    <!-- \u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0627\u062A \u0648\u0627\u0644\u062A\u0641\u0642\u064A\u0637 -->
    <div class="total-box">
      <div class="total-num-wrap">
        <span>\u0625\u062C\u0645\u0627\u0644\u064A \u0623\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621:</span>
        <span class="total-large mono">${h.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
        <span class="font-bold">\u062C\u0646\u064A\u0647 \u0633\u0648\u062F\u0627\u0646\u064A (\u062C.\u0633)</span>
      </div>
      <div class="total-tafqeet">
        ${V}
      </div>
    </div>

    <!-- \u0634\u0631\u0648\u0637 \u0627\u0644\u062F\u0641\u0639 \u0648\u0627\u0644\u062A\u0633\u0644\u064A\u0645 -->
    <div class="terms-box">
      <div class="t-title">\u0634\u0631\u0648\u0637 \u0627\u0644\u0633\u062F\u0627\u062F \u0648\u0627\u0644\u0627\u0633\u062A\u0644\u0627\u0645:</div>
      <div>${t.payment_terms||"\u0627\u0644\u062F\u0641\u0639 \u0628\u0639\u062F \u0641\u062D\u0635 \u0648\u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u0628\u0636\u0627\u0639\u0629 \u0648\u0645\u0637\u0627\u0628\u0642\u0629 \u0627\u0644\u0645\u0648\u0627\u0635\u0641\u0627\u062A \u0645\u0639 \u0625\u0634\u0639\u0627\u0631 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u062E\u0627\u0632\u0646\u060C \u062E\u0644\u0627\u0644 15 \u064A\u0648\u0645\u0627\u064B \u0645\u0646 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629."}</div>
    </div>

    <!-- \u0645\u0635\u0641\u0648\u0641\u0629 \u0627\u0644\u062A\u0648\u0642\u064A\u0639\u0627\u062A \u0648\u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F\u0627\u062A \u0627\u0644\u0631\u0633\u0645\u064A\u0629 -->
    <div class="signatures-matrix">
      <div class="sig-col">
        <span class="sig-label">\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A</span>
        <span class="sig-sign">${a||"\u0625\u0639\u062F\u0627\u062F \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A"}</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">\u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0648\u0627\u0644\u062A\u062F\u0642\u064A\u0642 \u0627\u0644\u0645\u0627\u0644\u064A</span>
        <span class="sig-sign">\u0627\u0644\u0645\u0631\u0627\u062C\u0639 \u0627\u0644\u062F\u0627\u062E\u0644\u064A</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">\u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u0625\u062F\u0627\u0631\u064A / \u0627\u0644\u0645\u0627\u0644\u064A</span>
        <span class="sig-sign">\u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0627\u0645 / \u0627\u0644\u0645\u0627\u0644\u064A</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">\u0627\u0633\u062A\u0644\u0627\u0645 \u0648\u062A\u0639\u0647\u062F \u0627\u0644\u0645\u0648\u0631\u0651\u062F</span>
        <span class="sig-sign">\u0627\u0644\u062E\u062A\u0645 \u0648\u0627\u0644\u062A\u0648\u0642\u064A\u0639</span>
      </div>
      <div class="sig-col stamp-col">
        <span class="sig-label">\u0627\u0644\u062E\u062A\u0645 \u0627\u0644\u0631\u0633\u0645\u064A \u0644\u0644\u0645\u0624\u0633\u0633\u0629</span>
        <div class="stamp-wrap">
          ${n.stampUrl?`<img src="${n.stampUrl}" class="stamp-img" alt="\u0627\u0644\u062E\u062A\u0645 \u0627\u0644\u0631\u0633\u0645\u064A" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div class="stamp-circle-ph" style="display:none;"><span>\u0645\u0639\u062A\u0645\u062F</span></div>`:'<div class="stamp-circle-ph"><span>\u0627\u0644\u062E\u062A\u0645 \u0627\u0644\u0645\u0639\u062A\u0645\u062F</span></div>'}
        </div>
      </div>
    </div>

    <!-- \u062A\u0630\u064A\u064A\u0644 \u0627\u0644\u0645\u0633\u062A\u0623\u062C\u0631 \u0648\u0647\u0648\u064A\u0629 \u0646\u0628\u0631\u0627\u0633 -->
    <footer class="tenant-footer">
      <div class="f-brand">
        \u0645\u0646\u0638\u0648\u0645\u0629 <strong>\u0646\u0628\u0631\u0627\u0633 (Nebras OS)</strong> \u2022 \u0625\u062F\u0627\u0631\u0629 \u0633\u0644\u0627\u0633\u0644 \u0627\u0644\u0625\u0645\u062F\u0627\u062F \u0648\u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A
      </div>
      <div>
        <span>\u0623\u0645\u0631 \u0634\u0631\u0627\u0621: ${t.po_number}</span> \u2022 
        <span>\u0637\u064F\u0628\u0639 \u0628\u062A\u0627\u0631\u064A\u062E: ${H}</span>
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
</html>`,f=window.open("","_blank","width=1000,height=800,menubar=no,toolbar=no,location=no,status=no");if(!f){console.warn("\u062A\u0639\u0630\u0631 \u0641\u062A\u062D \u0646\u0627\u0641\u0630\u0629 \u0627\u0644\u0637\u0628\u0627\u0639\u0629 \u0627\u0644\u0645\u0646\u0628\u062B\u0642\u0629.");return}f.document.open(),f.document.write(Q),f.document.close()}export{R as a,_t as b};
