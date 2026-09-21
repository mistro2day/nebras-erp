import{a as oe}from"./chunk-EZTDHCV5.js";import{a as ae}from"./chunk-56MJVLXT.js";import"./chunk-5NGJZ2HL.js";import{d as ie}from"./chunk-OILRHUDC.js";import{a as ne}from"./chunk-DIPJ7YHJ.js";import{a as te}from"./chunk-LFTXXDUP.js";import{a as ee}from"./chunk-3JSU6E3D.js";import{a as Z}from"./chunk-M5YKIRD2.js";import{a as q}from"./chunk-6SCLRWTB.js";import{a as Y}from"./chunk-VT3BB4OL.js";import{g as R,j as H,p as J,q as K,r as Q,y as X}from"./chunk-MP426SMZ.js";import{d as W}from"./chunk-GPDPVP2E.js";import"./chunk-5ESGBUBJ.js";import{o as B,r as V}from"./chunk-TGOLEZB2.js";import"./chunk-2ITX5RGN.js";import"./chunk-FJCM6PLI.js";import"./chunk-FPPZ4BUR.js";import{$ as _,Ab as w,Bb as S,Bc as m,Dc as g,Eb as A,Fb as k,Gb as b,Hb as e,Ib as t,Jb as D,Mc as L,Ob as U,Sb as p,Ub as M,Wa as a,fa as C,ga as y,gc as n,hc as d,ic as x,jc as j,lb as G,mc as F,nc as O,oc as P,qa as f}from"./chunk-AYJP2YZK.js";import"./chunk-Z3S5WG22.js";function re(u,o,i,r){if(!o)return;let l=Y(i),s=l.schoolNameAr,le=l.schoolNameEn,N=l.logoUrl,de=l.phone,ye=l.email,se=l.address,$=o.reduce((c,h)=>c+(Number(h.debit)||0),0),z=o.reduce((c,h)=>c+(Number(h.credit)||0),0),E=o.length>0&&Number(o[o.length-1].balance_snapshot)||0,ce=ae(Math.abs(E),"\u062C\u0646\u064A\u0647 \u0633\u0648\u062F\u0627\u0646\u064A"),T=new Date,pe=`${T.toISOString().split("T")[0]} ${T.toLocaleTimeString("ar-SD",{hour:"2-digit",minute:"2-digit"})}`,me=o.map((c,h)=>`
    <tr>
      <td class="center mono">${h+1}</td>
      <td class="mono">${c.date}</td>
      <td class="mono font-bold text-info">${c.entry_number||"\u2014"}</td>
      <td class="mono text-muted">${c.reference||"\u2014"}</td>
      <td><strong>${c.partner_name||"\u2014"}</strong></td>
      <td class="desc-cell">${c.line_description||"\u2014"}</td>
      <td class="end mono text-info">${+c.debit>0?Number(c.debit).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}):"\u2014"}</td>
      <td class="end mono text-success">${+c.credit>0?Number(c.credit).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}):"\u2014"}</td>
      <td class="end mono font-bold">${Number(c.balance_snapshot).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
    </tr>
  `).join(""),ge=`<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>\u0643\u0634\u0641 \u062D\u0633\u0627\u0628 \u062F\u0641\u062A\u0631 \u0627\u0644\u0623\u0633\u062A\u0627\u0630 \u0627\u0644\u0639\u0627\u0645 - ${u?u.code+" "+u.name_ar:"\u0643\u0627\u0641\u0629 \u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A"}</title>
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
    .sig-col { border: 1px solid #e2e8f0; border-radius: 6px; padding: 5px; text-align: center; background: #fff; display: flex; flex-direction: column; justify-content: space-between; min-height: 75px; }
    .sig-label { display: block; font-size: 9.5px; font-weight: 800; color: #1e3a8a; border-bottom: 1px dashed #cbd5e1; padding-bottom: 2px; margin-bottom: 4px; }
    .sig-sign { display: block; font-size: 9px; color: #94a3b8; }
    .stamp-wrap { display: flex; align-items: center; justify-content: center; flex: 1; min-height: 40px; }
    .stamp-img { max-height: 50px; max-width: 80px; object-fit: contain; transform: rotate(-3deg); }
    .stamp-ph { font-size: 7.5px; color: #0284c7; border: 1px dashed #0284c7; border-radius: 6px; width: 56px; height: 36px; display: flex; align-items: center; justify-content: center; text-align: center; transform: rotate(-3deg); }

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
        <p class="country-line">\u062C\u0645\u0647\u0648\u0631\u064A\u0629 \u0627\u0644\u0633\u0648\u062F\u0627\u0646 \u2022 \u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0648\u0627\u0644\u062A\u0631\u0628\u064A\u0629 \u0627\u0644\u0648\u0637\u0646\u064A\u0629</p>
        <h2 class="org-name-ar">${s}</h2>
        <h4 class="org-name-en">${le}</h4>
        <p class="contact-line">\u{1F4CD} ${se} \u2022 \u0647\u0627\u062A\u0641: ${de}</p>
      </div>
      <div class="logo-box">
        ${N?`<img src="${N}" alt="\u0627\u0644\u0634\u0639\u0627\u0631" class="logo-img" onerror="this.style.display='none'" />`:""}
      </div>
    </header>

    <div class="doc-banner">
      <div>
        <h1>\u0643\u0640\u0634\u0640\u0641 \u062D\u0640\u0633\u0640\u0627\u0628 \u062F\u064E\u0641\u0640\u062A\u0640\u0631 \u0627\u0644\u0623\u064F\u0633\u0640\u062A\u0640\u0627\u0630 \u0627\u0644\u0640\u0639\u0640\u0627\u0645</h1>
        <span>OFFICIAL GENERAL LEDGER ACCOUNT STATEMENT</span>
      </div>
      <div>
        <span style="font-weight:700; font-size:11px;">\u0627\u0644\u0639\u0645\u0644\u0629: \u0627\u0644\u062C\u0646\u064A\u0647 \u0627\u0644\u0633\u0648\u062F\u0627\u0646\u064A (\u062C.\u0633)</span>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-col">
        <span class="k">\u0627\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A:</span>
        <span class="v">${u?`${u.code} - ${u.name_ar}`:"\u0643\u0627\u0641\u0629 \u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0629"}</span>
      </div>
      <div class="meta-col">
        <span class="k">\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u062F\u064A\u0646 (\u062C.\u0633):</span>
        <span class="v mono text-info">${$.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
      </div>
      <div class="meta-col">
        <span class="k">\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u062F\u0627\u0626\u0646 (\u062C.\u0633):</span>
        <span class="v mono text-success">${z.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
      </div>
      <div class="meta-col">
        <span class="k">\u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u062E\u062A\u0627\u0645\u064A (\u062C.\u0633):</span>
        <span class="v mono font-bold">${E.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
      </div>
    </div>

    <div class="table-container">
      <table class="ledger-table">
        <thead>
          <tr>
            <th style="width: 25px;" class="center">#</th>
            <th style="width: 70px;">\u0627\u0644\u062A\u0627\u0631\u064A\u062E</th>
            <th style="width: 90px;">\u0631\u0642\u0645 \u0627\u0644\u0642\u064A\u062F</th>
            <th style="width: 80px;">\u0627\u0644\u0645\u0631\u062C\u0639</th>
            <th style="width: 100px;">\u0627\u0644\u0637\u0631\u0641 \u0627\u0644\u0645\u0639\u0646\u064A</th>
            <th>\u0627\u0644\u0628\u064A\u0627\u0646 \u0648\u0627\u0644\u0634\u0631\u062D \u0627\u0644\u062A\u0641\u0635\u064A\u0644\u064A</th>
            <th style="width: 85px;" class="end">\u0645\u062F\u064A\u0646 (\u062C.\u0633)</th>
            <th style="width: 85px;" class="end">\u062F\u0627\u0626\u0646 (\u062C.\u0633)</th>
            <th style="width: 95px;" class="end">\u0627\u0644\u0631\u0635\u064A\u062F (\u062C.\u0633)</th>
          </tr>
        </thead>
        <tbody>
          ${me}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="6"><strong>\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0643\u0644\u064A \u0627\u0644\u062A\u0631\u0627\u0643\u0645\u064A:</strong></td>
            <td class="end mono text-info"><strong>${$.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></td>
            <td class="end mono text-success"><strong>${z.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></td>
            <td class="end mono font-bold"><strong>${E.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="tafqeet-box">
      <div>
        <span class="t-title">\u0627\u0644\u0631\u0635\u064A\u062F \u0643\u062A\u0627\u0628\u0629\u064B: </span>
        <span class="t-words">${ce}</span>
      </div>
      <div>
        <span class="balance-tag">\u2713 \u062D\u0631\u0643\u0627\u062A \u0645\u0631\u062D\u0644\u0629 \u0645\u0639\u062A\u0645\u062F\u0629</span>
      </div>
    </div>

    <div class="signatures-matrix">
      <div class="sig-col">
        <span class="sig-label">\u0625\u0639\u062F\u0627\u062F \u0627\u0644\u0645\u062D\u0627\u0633\u0628</span>
        <span class="sig-sign">${r||"\u0627\u0644\u0645\u062D\u0627\u0633\u0628 \u0627\u0644\u0645\u0639\u062A\u0645\u062F"}</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">\u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0648\u0627\u0644\u062A\u062F\u0642\u064A\u0642</span>
        <span class="sig-sign">\u0627\u0644\u0645\u0631\u0627\u062C\u0639 \u0627\u0644\u062F\u0627\u062E\u0644\u064A</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">\u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u0645\u0627\u0644\u064A</span>
        <span class="sig-sign">\u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0645\u0627\u0644\u064A</span>
      </div>
      <div class="sig-col">
        <span class="sig-label">\u0627\u0644\u062E\u062A\u0645 \u0627\u0644\u0645\u0627\u0644\u064A \u0627\u0644\u0631\u0633\u0645\u064A</span>
        <div class="stamp-wrap">
          ${l.stampFinanceUrl?`<img src="${l.stampFinanceUrl}" class="stamp-img" alt="\u062E\u062A\u0645 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div class="stamp-ph" style="display:none;">\u0645\u0639\u062A\u0645\u062F</div>`:'<div class="stamp-ph">\u0645\u0639\u062A\u0645\u062F</div>'}
        </div>
      </div>
    </div>

    <footer class="tenant-footer">
      <div>\u0645\u0646\u0638\u0648\u0645\u0629 <strong>\u0646\u0628\u0631\u0627\u0633 (Nebras OS)</strong> \u2022 \u062F\u0641\u062A\u0631 \u0627\u0644\u0623\u0633\u062A\u0627\u0630 \u0627\u0644\u0639\u0627\u0645 \u0648\u0642\u064A\u0648\u062F \u0627\u0644\u064A\u0648\u0645\u064A\u0629</div>
      <div class="mono">\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0637\u0628\u0627\u0639\u0629: ${pe}</div>
    </footer>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  <\/script>
</body>
</html>`,v=window.open("","_blank","width=1000,height=800,menubar=no,toolbar=no,location=no,status=no");if(!v){console.warn("\u062A\u0639\u0630\u0631 \u0641\u062A\u062D \u0646\u0627\u0641\u0630\u0629 \u0627\u0644\u0637\u0628\u0627\u0639\u0629.");return}v.document.open(),v.document.write(ge),v.document.close()}var I=(u,o)=>o.id;function be(u,o){if(u&1&&(e(0,"option",14),n(1),t()),u&2){let i=o.$implicit;b("value",i.id),a(),j("",i.code," - ",i.name_ar)}}function xe(u,o){if(u&1&&(e(0,"option",14),n(1),t()),u&2){let i=o.$implicit;b("value",i.id),a(),d(i.name_ar)}}function fe(u,o){u&1&&(e(0,"tr")(1,"td",24),D(2,"nb-loading",25),t()())}function he(u,o){if(u&1){let i=U();e(0,"tr",27),p("click",function(){let l=C(i).$implicit,s=M(2);return y(s.selected.set(l))}),e(1,"td",28),n(2),t(),e(3,"td",29),n(4),t(),e(5,"td")(6,"strong"),n(7),t(),e(8,"span",30),n(9),t()(),e(10,"td")(11,"span",31),n(12),t()(),e(13,"td",32),n(14),t(),e(15,"td",33),n(16),m(17,"number"),t(),e(18,"td",34),n(19),m(20,"number"),t(),e(21,"td",35)(22,"strong"),n(23),m(24,"number"),t()(),e(25,"td",36),p("click",function(l){return C(i),y(l.stopPropagation())}),e(26,"button",37),p("click",function(){let l=C(i).$implicit,s=M(2);return y(s.selected.set(l))}),n(27,"\u062A\u0641\u0627\u0635\u064A\u0644"),t()()()}if(u&2){let i=o.$implicit;a(2),d(i.date),a(2),d(i.entry_number||"\u2014"),a(3),d(i.account_code),a(2),d(i.account_name),a(3),d(i.partner_name||"\u2014"),a(),b("title",i.line_description),a(),d(i.line_description||"\u2014"),a(2),d(+i.debit>0?g(17,10,i.debit,"1.2-2"):"\u2014"),a(3),d(+i.credit>0?g(20,13,i.credit,"1.2-2"):"\u2014"),a(4),d(g(24,16,i.balance_snapshot,"1.2-2"))}}function ve(u,o){u&1&&(e(0,"tr")(1,"td",38),n(2,"\u0644\u0627 \u062A\u0648\u062C\u062F \u062D\u0631\u0643\u0627\u062A \u0645\u0631\u062D\u0651\u0644\u0629 \u0645\u0637\u0627\u0628\u0642\u0629 \u0644\u0644\u0641\u0644\u0627\u062A\u0631."),t()())}function _e(u,o){if(u&1&&(A(0,he,28,19,"tr",26,I),w(2,ve,3,0,"tr")),u&2){let i=M();k(i.entries()),a(2),S(i.entries().length?-1:2)}}function Ce(u,o){if(u&1&&(e(0,"div",22)(1,"div",39)(2,"span",40),n(3,"\u0631\u0642\u0645 \u0627\u0644\u0642\u064A\u062F \u0627\u0644\u0645\u0627\u0644\u064A"),t(),e(4,"span",41),n(5),t()(),e(6,"div",39)(7,"span",40),n(8,"\u0627\u0644\u0645\u0633\u062A\u0646\u062F \u0627\u0644\u0645\u0631\u062C\u0639\u064A"),t(),e(9,"span",42),n(10),t()(),e(11,"div",39)(12,"span",40),n(13,"\u0627\u0644\u062A\u0627\u0631\u064A\u062E"),t(),e(14,"span",42),n(15),t()(),e(16,"div",39)(17,"span",40),n(18,"\u0627\u0644\u0637\u0631\u0641 \u0627\u0644\u0645\u0639\u0646\u064A"),t(),e(19,"span",10),n(20),t()(),e(21,"div",39)(22,"span",40),n(23,"\u0627\u0644\u062D\u0633\u0627\u0628"),t(),e(24,"span",10)(25,"strong"),n(26),t(),n(27),t()(),e(28,"div",39)(29,"span",40),n(30,"\u0645\u0631\u0643\u0632 \u0627\u0644\u062A\u0643\u0644\u0641\u0629"),t(),e(31,"span",10),n(32),t()(),e(33,"div",39)(34,"span",40),n(35,"\u0627\u0644\u0628\u064A\u0627\u0646 \u0648\u0627\u0644\u0634\u0631\u062D"),t(),e(36,"span",10),n(37),t()(),e(38,"div",39)(39,"span",40),n(40,"\u0645\u062F\u064A\u0646"),t(),e(41,"span",43),n(42),m(43,"number"),t()(),e(44,"div",39)(45,"span",40),n(46,"\u062F\u0627\u0626\u0646"),t(),e(47,"span",44),n(48),m(49,"number"),t()(),e(50,"div",45)(51,"span",40),n(52,"\u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u062A\u0631\u0627\u0643\u0645\u064A"),t(),e(53,"span",42)(54,"strong"),n(55),m(56,"number"),t()()()()),u&2){let i=o;a(5),d(i.entry_number||"\u2014"),a(5),d(i.reference||"\u2014"),a(5),d(i.date),a(5),d(i.partner_name||"\u2014"),a(6),d(i.account_code),a(),x(" ",i.account_name),a(5),d(i.cost_center_name||"\u2014"),a(5),d(i.line_description||"\u2014"),a(5),x("",+i.debit>0?g(43,11,i.debit,"1.2-2"):"\u2014"," \u062C.\u0633"),a(6),x("",+i.credit>0?g(49,14,i.credit,"1.2-2"):"\u2014"," \u062C.\u0633"),a(7),x("",g(56,17,i.balance_snapshot,"1.2-2")," \u062C.\u0633")}}var ue=class u{service=_(oe);tenantService=_(q);router=_(W);entries=f([]);loading=f(!0);accounts=f([]);costCenters=f([]);selected=f(null);accountFilter="";ccFilter="";totalDebit=L(()=>this.entries().reduce((o,i)=>o+(Number(i.debit)||0),0));totalCredit=L(()=>this.entries().reduce((o,i)=>o+(Number(i.credit)||0),0));ngOnInit(){this.service.getCOA().subscribe(o=>{o?.success&&this.accounts.set(o.data)}),this.service.getCostCenters().subscribe(o=>{o?.success&&this.costCenters.set(o.data)}),this.load()}load(){let o={};this.accountFilter&&(o.account=this.accountFilter),this.ccFilter&&(o.cost_center=this.ccFilter),this.loading.set(!0),this.service.getLedgerEntries(o).subscribe({next:i=>{i?.success&&this.entries.set(i.data),this.loading.set(!1)},error:()=>this.loading.set(!1)})}printStatement(){let o=this.accounts().find(i=>i.id===this.accountFilter)||null;re(o,this.entries(),this.tenantService.currentTenant())}cols(){return[{key:"date",label:"\u0627\u0644\u062A\u0627\u0631\u064A\u062E"},{key:"entry_number",label:"\u0631\u0642\u0645 \u0627\u0644\u0642\u064A\u062F"},{key:"account_code",label:"\u0631\u0645\u0632 \u0627\u0644\u062D\u0633\u0627\u0628"},{key:"account_name",label:"\u0627\u0633\u0645 \u0627\u0644\u062D\u0633\u0627\u0628"},{key:"partner_name",label:"\u0627\u0644\u0637\u0631\u0641 \u0627\u0644\u0645\u0639\u0646\u064A"},{key:"line_description",label:"\u0627\u0644\u0628\u064A\u0627\u0646"},{key:"debit",label:"\u0645\u062F\u064A\u0646 (\u062C.\u0633)",align:"end"},{key:"credit",label:"\u062F\u0627\u0626\u0646 (\u062C.\u0633)",align:"end"},{key:"balance_snapshot",label:"\u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u062A\u0631\u0627\u0643\u0645\u064A (\u062C.\u0633)",align:"end"}]}back(){this.router.navigateByUrl("/finance/dashboard")}static \u0275fac=function(i){return new(i||u)};static \u0275cmp=G({type:u,selectors:[["app-general-ledger"]],decls:73,vars:20,consts:[["dir","rtl",1,"page"],["title","\u062F\u0641\u062A\u0631 \u0627\u0644\u0623\u0633\u062A\u0627\u0630 \u0627\u0644\u0639\u0627\u0645","subtitle","\u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u0645\u0631\u062D\u0651\u0644\u0629 \u0628\u0634\u0643\u0644 \u0646\u0647\u0627\u0626\u064A \u0641\u064A \u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u0645\u0639 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062A\u0631\u0627\u0643\u0645\u064A\u0629 \u0648\u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A\u0629."],[1,"btn","ghost",3,"click"],["title","\u0637\u0628\u0627\u0639\u0629 \u0643\u0634\u0641 \u062D\u0633\u0627\u0628 \u062F\u0641\u062A\u0631 \u0627\u0644\u0623\u0633\u062A\u0627\u0630 \u0627\u0644\u0631\u0633\u0645\u064A \u0628\u0647\u0648\u064A\u0629 \u0646\u0628\u0631\u0627\u0633",1,"btn","ghost",3,"click","disabled"],["title","\u062F\u0641\u062A\u0631 \u0627\u0644\u0623\u0633\u062A\u0627\u0630 \u0627\u0644\u0639\u0627\u0645","subtitle","\u0627\u0644\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u0645\u0631\u062D\u0651\u0644\u0629 \u0648\u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062A\u0631\u0627\u0643\u0645\u064A\u0629","filename","\u062F\u0641\u062A\u0631-\u0627\u0644\u0623\u0633\u062A\u0627\u0630",3,"columns","rows"],[1,"kpis"],[1,"kpi"],[1,"l"],[1,"v","info"],[1,"v","success"],[1,"v"],[1,"filters"],[1,"fld",3,"ngModelChange","ngModel"],["value",""],[3,"value"],[1,"count"],[3,"flush"],[1,"table-wrap"],[1,"nb-table"],[1,"end"],[1,"center"],["title","\u062A\u0641\u0627\u0635\u064A\u0644 \u062D\u0631\u0643\u0629 \u062F\u0641\u062A\u0631 \u0627\u0644\u0623\u0633\u062A\u0627\u0630",3,"closed","open","subtitle"],[1,"dl"],["drawer-actions",""],["colspan","9"],["message","\u062C\u0627\u0631\u064D \u062A\u062D\u0645\u064A\u0644 \u062D\u0631\u0643\u0627\u062A \u062F\u0641\u062A\u0631 \u0627\u0644\u0623\u0633\u062A\u0627\u0630 \u0627\u0644\u0639\u0627\u0645\u2026"],[1,"clickable"],[1,"clickable",3,"click"],[1,"mono"],[1,"mono","font-bold","text-info"],[1,"nm"],[1,"partner-pill"],[1,"desc-cell",3,"title"],[1,"end","info"],[1,"end","success"],[1,"end","mono"],[1,"center",3,"click"],["title","\u0645\u0639\u0627\u064A\u0646\u0629 \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u062D\u0631\u0643\u0629",1,"btn","ghost","xs",3,"click"],["colspan","9",1,"empty"],[1,"dl-row"],[1,"k"],[1,"v","mono","text-info"],[1,"v","mono"],[1,"v","mono","info"],[1,"v","mono","success"],[1,"dl-row","total"]],template:function(i,r){if(i&1&&(e(0,"div",0)(1,"nb-page-header",1)(2,"button",2),p("click",function(){return r.back()}),n(3,"\u0631\u062C\u0648\u0639 \u0644\u0645\u0633\u0627\u062D\u0629 \u0627\u0644\u0639\u0645\u0644"),t(),e(4,"button",3),p("click",function(){return r.printStatement()}),n(5,"\u{1F5A8}\uFE0F \u0637\u0628\u0627\u0639\u0629 \u0643\u0634\u0641 \u0627\u0644\u062D\u0633\u0627\u0628"),t(),D(6,"nb-export-menu",4),t(),e(7,"div",5)(8,"div",6)(9,"span",7),n(10,"\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u062F\u064A\u0646"),t(),e(11,"span",8),n(12),m(13,"number"),e(14,"em"),n(15,"\u062C.\u0633"),t()()(),e(16,"div",6)(17,"span",7),n(18,"\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u062F\u0627\u0626\u0646"),t(),e(19,"span",9),n(20),m(21,"number"),e(22,"em"),n(23,"\u062C.\u0633"),t()()(),e(24,"div",6)(25,"span",7),n(26,"\u0639\u062F\u062F \u0627\u0644\u062D\u0631\u0643\u0627\u062A"),t(),e(27,"span",10),n(28),t()()(),e(29,"div",11)(30,"select",12),P("ngModelChange",function(s){return O(r.accountFilter,s)||(r.accountFilter=s),s}),p("ngModelChange",function(){return r.load()}),e(31,"option",13),n(32,"\u0643\u0644 \u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A"),t(),A(33,be,2,3,"option",14,I),t(),e(35,"select",12),P("ngModelChange",function(s){return O(r.ccFilter,s)||(r.ccFilter=s),s}),p("ngModelChange",function(){return r.load()}),e(36,"option",13),n(37,"\u0643\u0644 \u0645\u0631\u0627\u0643\u0632 \u0627\u0644\u062A\u0643\u0644\u0641\u0629"),t(),A(38,xe,2,2,"option",14,I),t(),e(40,"span",15),n(41),t()(),e(42,"nb-panel",16)(43,"div",17)(44,"table",18)(45,"thead")(46,"tr")(47,"th"),n(48,"\u0627\u0644\u062A\u0627\u0631\u064A\u062E"),t(),e(49,"th"),n(50,"\u0631\u0642\u0645 \u0627\u0644\u0642\u064A\u062F"),t(),e(51,"th"),n(52,"\u0627\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A"),t(),e(53,"th"),n(54,"\u0627\u0644\u0637\u0631\u0641 \u0627\u0644\u0645\u0639\u0646\u064A"),t(),e(55,"th"),n(56,"\u0627\u0644\u0628\u064A\u0627\u0646 \u0648\u0627\u0644\u0634\u0631\u062D"),t(),e(57,"th",19),n(58,"\u0645\u062F\u064A\u0646 (\u062C.\u0633)"),t(),e(59,"th",19),n(60,"\u062F\u0627\u0626\u0646 (\u062C.\u0633)"),t(),e(61,"th",19),n(62,"\u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u062A\u0631\u0627\u0643\u0645\u064A (\u062C.\u0633)"),t(),e(63,"th",20),n(64,"\u0625\u062C\u0631\u0627\u0621\u0627\u062A"),t()()(),e(65,"tbody"),w(66,fe,3,0,"tr")(67,_e,3,1),t()()()(),e(68,"nb-drawer",21),p("closed",function(){return r.selected.set(null)}),w(69,Ce,57,20,"div",22),e(70,"div",23)(71,"button",2),p("click",function(){return r.printStatement()}),n(72,"\u{1F5A8}\uFE0F \u0637\u0628\u0627\u0639\u0629 \u0643\u0634\u0641 \u0627\u0644\u062D\u0633\u0627\u0628"),t()()()()),i&2){let l,s;a(4),b("disabled",!r.entries().length),a(2),b("columns",r.cols())("rows",r.entries()),a(6),x("",g(13,14,r.totalDebit(),"1.2-2")," "),a(8),x("",g(21,17,r.totalCredit(),"1.2-2")," "),a(8),d(r.entries().length),a(2),F("ngModel",r.accountFilter),a(3),k(r.accounts()),a(2),F("ngModel",r.ccFilter),a(3),k(r.costCenters()),a(3),x("",r.entries().length," \u062D\u0631\u0643\u0629 \u0645\u0631\u062D\u0651\u0644\u0629"),a(),b("flush",!0),a(24),S(r.loading()?66:67),a(2),b("open",!!r.selected())("subtitle",((l=r.selected())==null?null:l.account_code)+" \u2014 "+((l=r.selected())==null?null:l.account_name)),a(),S((s=r.selected())?69:-1,s)}},dependencies:[V,X,K,Q,J,R,H,ee,te,ne,ie,Z,B],styles:[".page[_ngcontent-%COMP%]{flex:1;padding:24px;overflow-y:auto;background:var(--nb-background);font-family:var(--nb-font-family)}.kpis[_ngcontent-%COMP%]{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}@media(max-width:680px){.kpis[_ngcontent-%COMP%]{grid-template-columns:1fr}}.kpi[_ngcontent-%COMP%]{background:var(--nb-surface);border:1px solid var(--nb-border);border-radius:var(--nb-radius-card);padding:12px 14px;display:flex;flex-direction:column;gap:4px}.kpi[_ngcontent-%COMP%]   .l[_ngcontent-%COMP%]{font-size:12px;color:var(--nb-text-muted)}.kpi[_ngcontent-%COMP%]   .v[_ngcontent-%COMP%]{font-size:20px;font-weight:700;color:var(--nb-text);font-variant-numeric:tabular-nums}.kpi[_ngcontent-%COMP%]   .v[_ngcontent-%COMP%]   em[_ngcontent-%COMP%]{font-size:11px;font-weight:500;font-style:normal;color:var(--nb-text-muted)}.kpi[_ngcontent-%COMP%]   .v.info[_ngcontent-%COMP%]{color:var(--nb-info)}.kpi[_ngcontent-%COMP%]   .v.success[_ngcontent-%COMP%]{color:var(--nb-success)}.filters[_ngcontent-%COMP%]{display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap}.filters[_ngcontent-%COMP%]   .count[_ngcontent-%COMP%]{margin-inline-start:auto;font-size:12px;color:var(--nb-text-muted)}.fld[_ngcontent-%COMP%]{height:34px;padding:0 10px;border:1px solid var(--nb-border);border-radius:var(--nb-radius);background:var(--nb-surface);color:var(--nb-text);font-family:inherit;font-size:13px;min-width:220px}.table-wrap[_ngcontent-%COMP%]{overflow-x:auto}.nb-table[_ngcontent-%COMP%]{width:100%;border-collapse:collapse;font-size:13px}.nb-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%]{text-align:start;font-weight:700;font-size:11px;color:var(--nb-text-muted);background:var(--nb-surface-raised);padding:9px 12px;border-bottom:1px solid var(--nb-border-soft)}.nb-table[_ngcontent-%COMP%]   th.end[_ngcontent-%COMP%]{text-align:end}.nb-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%]{padding:9px 12px;border-bottom:1px solid var(--nb-border-row);color:var(--nb-text)}.nb-table[_ngcontent-%COMP%]   tr[_ngcontent-%COMP%]:last-child   td[_ngcontent-%COMP%]{border-bottom:none}.nb-table[_ngcontent-%COMP%]   tbody[_ngcontent-%COMP%]   tr[_ngcontent-%COMP%]:hover   td[_ngcontent-%COMP%]{background:var(--nb-surface-raised)}.nb-table[_ngcontent-%COMP%]   tbody[_ngcontent-%COMP%]   tr.clickable[_ngcontent-%COMP%]{cursor:pointer}.mono[_ngcontent-%COMP%]{font-variant-numeric:tabular-nums}.end[_ngcontent-%COMP%]{text-align:end;font-variant-numeric:tabular-nums}.info[_ngcontent-%COMP%]{color:var(--nb-info)}.success[_ngcontent-%COMP%]{color:var(--nb-success)}.nm[_ngcontent-%COMP%]{color:var(--nb-text-muted);font-size:12px;margin-inline-start:6px}.empty[_ngcontent-%COMP%]{text-align:center;padding:26px;color:var(--nb-text-muted)}.dl[_ngcontent-%COMP%]{display:flex;flex-direction:column}.dl-row[_ngcontent-%COMP%]{display:flex;justify-content:space-between;gap:16px;padding:11px 2px;border-bottom:1px solid var(--nb-border-soft);font-size:13px}.dl-row[_ngcontent-%COMP%]   .k[_ngcontent-%COMP%]{color:var(--nb-text-muted)}.dl-row[_ngcontent-%COMP%]   .v[_ngcontent-%COMP%]{color:var(--nb-text);font-weight:600;text-align:end}.dl-row.total[_ngcontent-%COMP%]{border-bottom:none;border-top:2px solid var(--nb-border);margin-top:4px}.btn[_ngcontent-%COMP%]{height:34px;padding:0 14px;font-family:inherit;font-size:12.5px;font-weight:600;border-radius:var(--nb-radius);cursor:pointer;border:none}.btn.ghost[_ngcontent-%COMP%]{background:var(--nb-surface-raised);border:1px solid var(--nb-border);color:var(--nb-text)}.btn.xs[_ngcontent-%COMP%]{height:26px;padding:0 8px;font-size:11px}.btn[_ngcontent-%COMP%]:disabled{opacity:.5;cursor:not-allowed}.partner-pill[_ngcontent-%COMP%]{background:#f0fdf4;color:#166534;padding:2px 7px;border-radius:4px;font-size:11.5px;font-weight:600;border:1px solid #bbf7d0;display:inline-block}.desc-cell[_ngcontent-%COMP%]{max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px;color:var(--nb-text-muted)}"],changeDetection:0})};export{ue as GeneralLedgerComponent};
