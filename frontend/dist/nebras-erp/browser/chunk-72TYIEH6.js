import{a as j}from"./chunk-IWT6GYYJ.js";import{r as S}from"./chunk-PZ6HKFY6.js";import{Ab as z,Bb as A,Kb as E,Lb as x,Ob as B,Pb as $,Tb as F,Ub as N,Wa as P,fa as D,ga as _,gc as w,lb as k,qa as M}from"./chunk-MM2ZWJKN.js";import{g as y}from"./chunk-Z3S5WG22.js";var L="\u0646\u0628\u0631\u0627\u0633 \u2014 \u0646\u0638\u0627\u0645 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u062F\u0627\u0631\u0633",C="0057B8";function q(t,n){let o=t.map?t.map(n):n[t.key];return o==null?"":String(o)}function O(){return new Date().toLocaleString("en-GB")}function R(t,n){return`${t.filename||t.title}-${new Date().toISOString().slice(0,10)}.${n}`}function T(t,n){let o=URL.createObjectURL(t),e=document.createElement("a");e.href=o,e.download=n,e.click(),setTimeout(()=>URL.revokeObjectURL(o),1e3)}function X(t,n){T(new Blob(["\uFEFF"+n],{type:"text/csv;charset=utf-8;"}),t)}function U(t,n,o){return y(this,null,function*(){let e=yield import("./chunk-NP2SHPK5.js"),l=e.default??e,p=new l.Workbook;p.creator=L,p.created=new Date;let i=p.addWorksheet(t.title.slice(0,28)||"\u062A\u0642\u0631\u064A\u0631",{views:[{rightToLeft:!0,state:"frozen",ySplit:3}]}),u=n.length;i.columns=n.map(c=>({key:c.key,width:c.width??22})),i.mergeCells(1,1,1,u);let f=i.getCell(1,1);f.value=t.title,f.font={bold:!0,size:15,color:{argb:"FF"+C}},f.alignment={horizontal:"right",vertical:"middle"},i.getRow(1).height=26,i.mergeCells(2,1,2,u);let s=i.getCell(2,1);s.value=`${t.subtitle?t.subtitle+"  \u2022  ":""}${L}  \u2022  ${O()}`,s.font={size:10,color:{argb:"FF6B7280"}},s.alignment={horizontal:"right",vertical:"middle"};let r=i.getRow(3);n.forEach((c,m)=>{let d=r.getCell(m+1);d.value=c.label,d.font={bold:!0,color:{argb:"FFFFFFFF"},size:11},d.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF"+C}},d.alignment={horizontal:"right",vertical:"middle"},d.border={bottom:{style:"thin",color:{argb:"FFD6DBE6"}}}}),r.height=20,o.forEach((c,m)=>{let d=i.getRow(4+m);n.forEach((b,h)=>{let g=d.getCell(h+1);g.value=b.map?b.map(c):c[b.key],g.alignment={horizontal:b.align==="end"?"left":"right",vertical:"middle"},m%2===1&&(g.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFAFBFD"}}),g.border={bottom:{style:"hair",color:{argb:"FFE5E8EF"}}}})});let a=yield p.xlsx.writeBuffer();T(new Blob([a],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),R(t,"xlsx"))})}function W(t,n,o){let e=j(),l=n.map(a=>`<th style="text-align:${a.align==="end"?"left":"right"}">${a.label}</th>`).join(""),p=o.map(a=>"<tr>"+n.map(c=>`<td style="text-align:${c.align==="end"?"left":"right"}">${q(c,a)}</td>`).join("")+"</tr>").join(""),i=`${t.title} ${t.subtitle||""}`,u=/مال|سند|قبض|صرف|فاتورة|رسوم|حساب|ميزانية|أستاذ|مشتريات|خزينة|رواتب|استحقاق/i.test(i),f=/غياب|حضور|أكاديم|متابع|درجات|امتحان|تقييم|جدول|فصل|شعبة|إنذار/i.test(i),s=e.stampUrl,r="\u0627\u0644\u062E\u062A\u0645 \u0627\u0644\u0631\u0633\u0645\u064A \u0644\u0644\u0645\u0624\u0633\u0633\u0629";return u?(s=e.stampFinanceUrl||"",r="\u062E\u062A\u0645 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0648\u0627\u0644\u062E\u0632\u064A\u0646\u0629"):f&&(s=e.stampAcademicUrl||"",r="\u062E\u062A\u0645 \u0627\u0644\u0634\u0624\u0648\u0646 \u0627\u0644\u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0629 \u0648\u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629"),`
    <div class="nb-doc" dir="rtl">
      <div class="nb-doc-head">
        <div class="nb-doc-titles">
          <h1>${t.title}</h1>
          ${t.subtitle?`<div class="nb-doc-sub">${t.subtitle}</div>`:""}
          <div class="nb-doc-meta-info">\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062A\u0642\u0631\u064A\u0631: ${O()} \u2022 \u0639\u062F\u062F \u0627\u0644\u0633\u062C\u0644\u0627\u062A: ${o.length}</div>
        </div>
        <div class="nb-doc-brand">
          <div class="b-ministry">\u062C\u0645\u0647\u0648\u0631\u064A\u0629 \u0627\u0644\u0633\u0648\u062F\u0627\u0646 \u2022 \u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0648\u0627\u0644\u062A\u0631\u0628\u064A\u0629 \u0627\u0644\u0648\u0637\u0646\u064A\u0629</div>
          <div class="b1">${e.schoolNameAr}</div>
          <div class="b2">${e.schoolNameEn}</div>
          <div class="b-contact">${e.address||""}</div>
        </div>
        ${e.logoUrl?`<div class="nb-doc-logo"><img src="${e.logoUrl}" alt="\u0634\u0639\u0627\u0631 \u0627\u0644\u0645\u062F\u0631\u0633\u0629" class="doc-logo-img" onerror="this.style.display='none'"></div>`:""}
      </div>
      <table class="nb-doc-table"><thead><tr>${l}</tr></thead><tbody>${p}</tbody></table>
      
      <!-- \u0645\u0635\u0641\u0648\u0641\u0629 \u0627\u0644\u062A\u0648\u0642\u064A\u0639\u0627\u062A \u0648\u0627\u0644\u062E\u062A\u0645 \u0627\u0644\u0645\u0639\u062A\u0645\u062F \u0644\u0644\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A\u0629 \u0628\u062D\u0633\u0628 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u062E\u062A\u0635\u0629 -->
      <div class="nb-doc-signatures">
        <div class="nb-sig-box">
          <span class="nb-sig-title">\u0625\u0639\u062F\u0627\u062F \u0627\u0644\u0645\u0648\u0638\u0641 / \u0627\u0644\u0645\u062D\u0627\u0633\u0628</span>
          <span class="nb-sig-val">\u062A\u0648\u0642\u064A\u0639 \u0627\u0644\u0645\u0633\u0624\u0648\u0644</span>
        </div>
        <div class="nb-sig-box">
          <span class="nb-sig-title">\u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0648\u0627\u0644\u062A\u062F\u0642\u064A\u0642</span>
          <span class="nb-sig-val">\u0627\u0644\u0645\u0631\u0627\u062C\u0639 \u0627\u0644\u062F\u0627\u062E\u0644\u064A</span>
        </div>
        <div class="nb-sig-box">
          <span class="nb-sig-title">\u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u0625\u062F\u0627\u0631\u064A</span>
          <span class="nb-sig-val">\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0624\u0633\u0633\u0629</span>
        </div>
        <div class="nb-sig-box nb-stamp-box">
          <span class="nb-sig-title">${r}</span>
          <div class="nb-stamp-wrapper">
            ${s?`<img src="${s}" alt="${r}" class="nb-stamp-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div class="nb-stamp-ph" style="display:none;">\u0645\u0639\u062A\u0645\u062F</div>`:'<div class="nb-stamp-ph">\u0645\u0639\u062A\u0645\u062F</div>'}
          </div>
        </div>
      </div>

      <div class="nb-doc-foot">
        <span>${e.schoolNameAr} \u2022 ${e.phonesFormatted||e.phone||""}</span>
        <span>\u0645\u0646\u0638\u0648\u0645\u0629 \u0646\u0628\u0631\u0627\u0633 \u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0624\u0633\u0633\u0627\u062A \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A\u0629 (Nebras OS)</span>
      </div>
    </div>`}var H=`
  * { font-family: 'Segoe UI', Tahoma, 'Arial', sans-serif; box-sizing: border-box; }
  body { margin: 0; color: #111827; background: #fff; }
  .nb-doc { padding: 24px; }
  .nb-doc-head { display: flex; justify-content: space-between; align-items: center; border-bottom: 2.5px solid #${C}; padding-bottom: 12px; margin-bottom: 16px; }
  .nb-doc-titles h1 { font-size: 18px; margin: 0; color: #111827; }
  .nb-doc-sub { font-size: 12px; color: #6B7280; margin-top: 4px; }
  .nb-doc-meta-info { font-size: 10px; color: #9CA3AF; margin-top: 4px; }
  .nb-doc-brand { text-align: start; flex: 1; padding: 0 16px; }
  .b-ministry { font-size: 9px; font-weight: 700; color: #6B7280; margin-bottom: 2px; }
  .nb-doc-brand .b1 { font-size: 14px; font-weight: 800; color: #111827; }
  .nb-doc-brand .b2 { font-size: 10.5px; color: #6B7280; }
  .b-contact { font-size: 9px; color: #9CA3AF; margin-top: 2px; }
  .nb-doc-logo { width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; }
  .doc-logo-img { max-width: 56px; max-height: 56px; object-fit: contain; }
  .nb-doc-table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 12px; }
  .nb-doc-table th { background: #EEF3FB; padding: 8px 10px; border-bottom: 2px solid #D6DBE6; font-size: 11px; color: #374151; }
  .nb-doc-table td { padding: 7px 10px; border-bottom: 1px solid #E5E8EF; }
  .nb-doc-table tbody tr:nth-child(even) td { background: #FAFBFD; }
  .nb-doc-signatures { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 20px; padding-top: 10px; border-top: 1px solid #E5E8EF; page-break-inside: avoid; }
  .nb-sig-box { border: 1px solid #E5E8EF; border-radius: 6px; padding: 6px; text-align: center; background: #fafafa; display: flex; flex-direction: column; justify-content: space-between; min-height: 70px; }
  .nb-sig-title { font-size: 9px; font-weight: 700; color: #4B5563; border-bottom: 1px dashed #D1D5DB; padding-bottom: 2px; margin-bottom: 4px; }
  .nb-sig-val { font-size: 8.5px; color: #9CA3AF; }
  .nb-stamp-wrapper { display: flex; align-items: center; justify-content: center; min-height: 40px; flex: 1; }
  .nb-stamp-img { max-height: 52px; max-width: 85px; object-fit: contain; transform: rotate(-3deg); }
  .nb-stamp-ph { font-size: 8px; color: #${C}; border: 1px dashed #${C}; border-radius: 6px; width: 55px; height: 36px; display: flex; align-items: center; justify-content: center; text-align: center; transform: rotate(-3deg); font-weight: 700; }
  .nb-doc-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; font-size: 9.5px; color: #9CA3AF; border-top: 1px solid #E5E8EF; padding-top: 6px; }
`;function I(t,n,o){let e=t.orientation==="landscape",l=e?"@page { size: A4 landscape; margin: 10mm 15mm; }":"@page { size: A4 portrait; margin: 15mm; }",p=`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${t.title}</title>
    <style>${H} ${l} @media print{.nb-doc{padding:0}}</style></head>
    <body>${W(t,n,o)}<script>window.onload=()=>window.print()<\/script></body></html>`,i=window.open("","_blank",e?"width=1150,height=750":"width=980,height=720");i&&(i.document.open(),i.document.write(p),i.document.close())}function G(t,n,o){return y(this,null,function*(){let[e,l]=yield Promise.all([import("./chunk-QAFPTA2O.js"),import("./chunk-N2LKX7ET.js")]),p=e.jsPDF??e.default,i=l.default??l,u=t.orientation==="landscape",f=u?1122:794,s=document.createElement("div");s.setAttribute("dir","rtl"),s.style.cssText=`position:fixed; top:0; inset-inline-start:-10000px; width:${f}px; background:#fff; z-index:-1;`,s.innerHTML=`<style>${H}</style>${W(t,n,o)}`,document.body.appendChild(s);try{let r=yield i(s,{scale:2,backgroundColor:"#ffffff",useCORS:!0}),a=new p(u?"l":"p","mm","a4"),c=u?297:210,m=u?210:297,d=c,b=r.height*d/r.width,h=r.toDataURL("image/png"),g=b,v=0;for(a.addImage(h,"PNG",0,v,d,b),g-=m;g>0;)v-=m,a.addPage(),a.addImage(h,"PNG",0,v,d,b),g-=m;a.save(R(t,"pdf"))}finally{document.body.removeChild(s)}})}function Y(t,n,o){return y(this,null,function*(){let e=typeof t=="string"?document.getElementById(t):t;if(!e)return;let[l,p]=yield Promise.all([import("./chunk-QAFPTA2O.js"),import("./chunk-N2LKX7ET.js")]),i=l.jsPDF??l.default,u=p.default??p,f=o?.scale??2.5,s=o?.orientation??"p",r=yield u(e,{scale:f,backgroundColor:"#ffffff",useCORS:!0,logging:!1}),a=new i(s,"mm","a4"),c=s==="p"?210:297,m=s==="p"?297:210,d=c,b=r.height*d/r.width,h=r.toDataURL("image/png"),g=b,v=0;for(a.addImage(h,"PNG",0,v,d,b),g-=m;g>5;)v-=m,a.addPage(),a.addImage(h,"PNG",0,v,d,b),g-=m;let V=n.endsWith(".pdf")?n:`${n}.pdf`;a.save(V)})}function K(t,n){if(t&1){let o=B();E(0,"button",5),F("click",function(){D(o);let l=N();return _(l.doPrint())}),E(1,"span",2),w(2,"\u{1F5A8}\uFE0F"),x(),w(3," \u0637\u0628\u0627\u0639\u0629"),x()}}var J=class t{columns=[];rows=[];title="";subtitle;filename;showPrint=!0;customPrint;customPdf;busy=M(!1);meta(){return{title:this.title,subtitle:this.subtitle,filename:this.filename}}doPrint(){if(this.customPrint){this.customPrint();return}I(this.meta(),this.columns,this.rows)}doExcel(){return y(this,null,function*(){this.busy.set(!0);try{yield U(this.meta(),this.columns,this.rows)}finally{this.busy.set(!1)}})}doPdf(){return y(this,null,function*(){if(this.customPdf){this.customPdf();return}this.busy.set(!0);try{yield G(this.meta(),this.columns,this.rows)}finally{this.busy.set(!1)}})}static \u0275fac=function(o){return new(o||t)};static \u0275cmp=k({type:t,selectors:[["nb-export-menu"]],inputs:{columns:"columns",rows:"rows",title:"title",subtitle:"subtitle",filename:"filename",showPrint:"showPrint",customPrint:"customPrint",customPdf:"customPdf"},decls:10,vars:3,consts:[[1,"nb-exp"],["title","\u062A\u0635\u062F\u064A\u0631 Excel",1,"nb-exp-btn","xl",3,"click","disabled"],[1,"ico"],["title","\u062A\u0635\u062F\u064A\u0631 PDF",1,"nb-exp-btn","pdf",3,"click","disabled"],["title","\u0637\u0628\u0627\u0639\u0629",1,"nb-exp-btn"],["title","\u0637\u0628\u0627\u0639\u0629",1,"nb-exp-btn",3,"click"]],template:function(o,e){o&1&&(E(0,"div",0)(1,"button",1),F("click",function(){return e.doExcel()}),E(2,"span",2),w(3,"\u25A4"),x(),w(4," Excel "),x(),E(5,"button",3),F("click",function(){return e.doPdf()}),E(6,"span",2),w(7,"\u25A6"),x(),w(8," PDF "),x(),z(9,K,4,0,"button",4),x()),o&2&&(P(),$("disabled",e.busy()),P(4),$("disabled",e.busy()),P(4),A(e.showPrint?9:-1))},dependencies:[S],styles:[".nb-exp[_ngcontent-%COMP%]{display:inline-flex;align-items:center;gap:6px}.nb-exp-btn[_ngcontent-%COMP%]{display:inline-flex;align-items:center;gap:5px;height:34px;padding:0 12px;font-family:var(--nb-font-family);font-size:12px;font-weight:600;cursor:pointer;border:1px solid var(--nb-border);border-radius:var(--nb-radius);background:var(--nb-surface-raised);color:var(--nb-text);white-space:nowrap;transition:all .15s ease}.nb-exp-btn[_ngcontent-%COMP%]:hover:not(:disabled){border-color:var(--nb-primary-400);color:var(--nb-primary-700)}.nb-exp-btn[_ngcontent-%COMP%]:disabled{opacity:.55;cursor:not-allowed}.nb-exp-btn[_ngcontent-%COMP%]   .ico[_ngcontent-%COMP%]{font-size:13px;line-height:1}.nb-exp-btn.xl[_ngcontent-%COMP%]{color:#157347}.nb-exp-btn.xl[_ngcontent-%COMP%]:hover:not(:disabled){border-color:#157347}.nb-exp-btn.pdf[_ngcontent-%COMP%]{color:#c0392b}.nb-exp-btn.pdf[_ngcontent-%COMP%]:hover:not(:disabled){border-color:#c0392b}"],changeDetection:0})};export{X as a,I as b,Y as c,J as d};
