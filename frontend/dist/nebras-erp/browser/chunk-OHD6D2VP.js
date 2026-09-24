import{c as tt,d as et}from"./chunk-OILRHUDC.js";import{a as Z}from"./chunk-DIPJ7YHJ.js";import{a as X}from"./chunk-R5FUFECX.js";import{a as Q}from"./chunk-HOTFIAGL.js";import{a as J}from"./chunk-6SCLRWTB.js";import{a as K}from"./chunk-EDJTOF3S.js";import{o as Y,r as H}from"./chunk-TGOLEZB2.js";import{a as j}from"./chunk-2ITX5RGN.js";import{$ as A,$a as W,Ab as p,Bb as s,Bc as f,Dc as x,Eb as B,Fb as q,Gb as P,Hb as i,Ib as n,Jb as T,Ob as k,Ra as z,Sb as S,Ub as c,Wa as r,ec as y,fa as F,ga as I,gc as o,hc as d,ic as g,lb as V,qa as w,ta as U,wa as G}from"./chunk-AYJP2YZK.js";import{g as L}from"./chunk-Z3S5WG22.js";var it=(u,e)=>e.id||u;function at(u,e){if(u&1){let t=k();i(0,"img",55),S("error",function(){F(t);let l=c(2);return I(l.onLogoError())}),n()}if(u&2){let t=c(2);P("src",t.getLogoUrl(),z)}}function ut(u,e){u&1&&(i(0,"div",17)(1,"span"),o(2,"\u{1F3DB}\uFE0F"),n()())}function rt(u,e){if(u&1&&(i(0,"div",25)(1,"span",26),o(2,"\u0627\u0644\u0627\u0633\u062A\u062D\u0642\u0627\u0642:"),n(),i(3,"span",27),o(4),n()()),u&2){let t=c();r(4),d(t.data==null?null:t.data.due_date)}}function lt(u,e){if(u&1&&(i(0,"div",31)(1,"span",32),o(2,"\u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u0633\u062F\u0627\u062F:"),n(),i(3,"span",35),o(4),n()(),i(5,"div",56)(6,"span",32),o(7,"\u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0645\u0646 \u0627\u0644\u0631\u0633\u0648\u0645:"),n(),i(8,"span",57),o(9),f(10,"number"),n()()),u&2){let t=c(2);r(4),d(t.getPaymentMethodText()),r(4),y("danger",t.getRemainingBalance()>0)("success",t.getRemainingBalance()<=0),r(),g(" ",x(10,6,t.getRemainingBalance(),"1.2-2")," \u062C.\u0633 ")}}function dt(u,e){if(u&1&&(i(0,"div",31)(1,"span",32),o(2,"\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0633\u062A\u062D\u0642\u0627\u0642:"),n(),i(3,"span",34),o(4),n()(),i(5,"div",56)(6,"span",32),o(7,"\u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0645\u0646 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629:"),n(),i(8,"span",57),o(9),f(10,"number"),n()()),u&2){let t=c(),a=c();r(4),d((t.data==null?null:t.data.due_date)||"\u2014"),r(4),y("danger",a.getInvoiceOutstanding()>0)("success",a.getInvoiceOutstanding()<=0),r(),g(" ",x(10,6,a.getInvoiceOutstanding(),"1.2-2")," \u062C.\u0633 ")}}function ct(u,e){if(u&1&&(i(0,"tr")(1,"td",58),o(2),n(),i(3,"td",59),o(4),n(),i(5,"td",60),o(6),f(7,"number"),n()()),u&2){let t=e.$implicit,a=e.$index;r(2),d(a+1),r(2),d(t.description||t.fee_structure_name||"\u0628\u0646\u062F \u0631\u0633\u0648\u0645 \u062F\u0631\u0627\u0633\u064A\u0629"),r(2),d(x(7,3,t.amount||0,"1.2-2"))}}function mt(u,e){if(u&1&&B(0,ct,8,6,"tr",null,it),u&2){let t=c(2);q(t.data.items)}}function pt(u,e){if(u&1&&(i(0,"tr")(1,"td",58),o(2,"1"),n(),i(3,"td",59),o(4),n(),i(5,"td",61),o(6),f(7,"number"),n()()),u&2){let t=c(2);r(4),g(" \u0631\u0633\u0648\u0645 \u062F\u0631\u0627\u0633\u064A\u0629 \u0648\u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0633\u062A\u062D\u0642\u0629 \u0644\u0644\u0637\u0627\u0644\u0628 \u2014 ",(t.data==null?null:t.data.notes)||(t.data==null?null:t.data.title)||"\u0641\u0627\u062A\u0648\u0631\u0629 \u0631\u0642\u0645 "+((t.data==null?null:t.data.invoice_number)||"")," "),r(2),d(x(7,2,(t.data==null?null:t.data.total_amount)||0,"1.2-2"))}}function st(u,e){if(u&1&&(i(0,"tr",62)(1,"td",58),o(2,"\u2605"),n(),i(3,"td",59),o(4),n(),i(5,"td",60),o(6),f(7,"number"),n()()),u&2){let t=e.$implicit;r(4),g("\u062E\u0635\u0645: ",t.discount_reason||"\u0645\u0646\u062D\u0629 / \u062A\u062E\u0641\u064A\u0636 \u0645\u0627\u0644\u064A \u0645\u0639\u062A\u0645\u062F"),r(2),g("- ",x(7,2,t.amount||0,"1.2-2"))}}function gt(u,e){if(u&1&&B(0,st,8,5,"tr",62,it),u&2){let t=c(2);q(t.data.discounts)}}function ft(u,e){if(u&1&&(p(0,mt,2,0)(1,pt,8,5,"tr"),p(2,gt,2,0)),u&2){let t=c();s(t.data.items!=null&&t.data.items.length?0:1),r(2),s(t.data.discounts!=null&&t.data.discounts.length?2:-1)}}function xt(u,e){if(u&1&&(i(0,"tr")(1,"td",58),o(2,"1"),n(),i(3,"td",59),o(4),n(),i(5,"td",61),o(6),f(7,"number"),n()()),u&2){let t=c();r(4),g(" \u0633\u062F\u0627\u062F \u0631\u0633\u0648\u0645 \u062F\u0631\u0627\u0633\u064A\u0629 \u0648\u062A\u0633\u062C\u064A\u0644 \u0644\u0644\u0637\u0627\u0644\u0628 \u2014 ",(t.data==null?null:t.data.notes)||"\u062F\u0641\u0639\u0629 \u0633\u062F\u0627\u062F \u0645\u0639\u062A\u0645\u062F\u0629 \u0628\u0645\u0648\u062C\u0628 \u0625\u064A\u0635\u0627\u0644 \u0642\u0628\u0636"," "),r(2),d(x(7,2,(t.data==null?null:t.data.amount)||0,"1.2-2"))}}function bt(u,e){if(u&1&&(i(0,"tr")(1,"td",58),o(2,"1"),n(),i(3,"td",59),o(4,"\u0645\u0633\u062A\u062D\u0642\u0627\u062A \u0631\u0633\u0648\u0645 \u062F\u0631\u0627\u0633\u064A\u0629 \u0645\u062C\u062F\u0648\u0644\u0629"),n(),i(5,"td",60),o(6),f(7,"number"),n()()),u&2){let t=c();r(6),d(x(7,1,(t.data==null?null:t.data.amount)||0,"1.2-2"))}}function ht(u,e){if(u&1&&(i(0,"tr",70)(1,"td",71),o(2,"\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0631\u0633\u0648\u0645 (\u0642\u0628\u0644 \u0627\u0644\u062E\u0635\u0645):"),n(),i(3,"td",72),o(4),f(5,"number"),n()(),i(6,"tr",73)(7,"td",74),o(8,"\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u062E\u0635\u0648\u0645\u0627\u062A \u0648\u0627\u0644\u062A\u062E\u0641\u064A\u0636\u0627\u062A:"),n(),i(9,"td",75),o(10),f(11,"number"),n()()),u&2){let t=c(3);r(4),d(x(5,2,t.getInvoiceGross(),"1.2-2")),r(6),g("- ",x(11,5,t.getInvoiceDiscount(),"1.2-2"))}}function _t(u,e){if(u&1&&(i(0,"tr",65)(1,"td",76),o(2,"\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u0633\u062F\u062F \u0648\u0627\u0644\u0645\u062F\u0641\u0648\u0639 \u062D\u062A\u0649 \u062A\u0627\u0631\u064A\u062E\u0647:"),n(),i(3,"td",77),o(4),f(5,"number"),n()()),u&2){let t=c(3);r(4),d(x(5,1,t.getPaidAmount(),"1.2-2"))}}function vt(u,e){if(u&1&&(p(0,ht,12,8),i(1,"tr",41)(2,"td",63),o(3,"\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0627\u0644\u0635\u0627\u0641\u064A \u0627\u0644\u0645\u0633\u062A\u062D\u0642:"),n(),i(4,"td",64),o(5),f(6,"number"),n()(),p(7,_t,6,4,"tr",65),i(8,"tr",66)(9,"td",67)(10,"span",68),o(11,"\u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0627\u0644\u0645\u0633\u062A\u062D\u0642 \u0645\u0646 \u0647\u0630\u0647 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629:"),n()(),i(12,"td",69),o(13),f(14,"number"),n()()),u&2){let t=c(),a=c();s(a.getInvoiceDiscount()>0?0:-1),r(5),d(x(6,8,(t.data==null?null:t.data.total_amount)||0,"1.2-2")),r(2),s(a.getPaidAmount()>0?7:-1),r(5),y("has-due",a.getInvoiceOutstanding()>0)("cleared",a.getInvoiceOutstanding()<=0),r(),g(" ",x(14,11,a.getInvoiceOutstanding(),"1.2-2")," ")}}function Ct(u,e){if(u&1&&(i(0,"tr",41)(1,"td",63),o(2," \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u0642\u0628\u0648\u0636 \u0648\u0627\u0644\u0645\u062D\u0635\u0651\u0644 \u0628\u0647\u0630\u0627 \u0627\u0644\u0633\u0646\u062F: "),n(),i(3,"td",64),o(4),f(5,"number"),n()(),i(6,"tr",66)(7,"td",67)(8,"span",68),o(9,"\u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0645\u0646 \u0627\u0644\u0631\u0633\u0648\u0645 \u0627\u0644\u062F\u0631\u0627\u0633\u064A\u0629 (\u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u0633\u062A\u062D\u0642):"),n()(),i(10,"td",69),o(11),f(12,"number"),n()()),u&2){let t=c(),a=c();r(4),g(" ",x(5,6,(t.data==null?null:t.data.amount)||0,"1.2-2")," "),r(6),y("has-due",a.getRemainingBalance()>0)("cleared",a.getRemainingBalance()<=0),r(),g(" ",x(12,9,a.getRemainingBalance(),"1.2-2")," ")}}function At(u,e){if(u&1&&(i(0,"tr",41)(1,"td",63),o(2,"\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u0633\u062A\u062D\u0642:"),n(),i(3,"td",78),o(4),f(5,"number"),n()()),u&2){let t=c();r(4),d(x(5,1,(t.data==null?null:t.data.amount)||0,"1.2-2"))}}function wt(u,e){if(u&1&&(i(0,"div",82)(1,"span",83),o(2,"\u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0627\u0644\u0645\u0633\u062A\u062D\u0642 \u0645\u0646 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0643\u062A\u0627\u0628\u0629\u064B:"),n(),i(3,"span",84),o(4),n()()),u&2){let t=c(3);r(4),d(t.getInvoiceOutstandingTafqeetText())}}function St(u,e){if(u&1&&(i(0,"div",79)(1,"span",80),o(2,"\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0643\u062A\u0627\u0628\u0629\u064B:"),n(),i(3,"span",81),o(4),n()(),p(5,wt,5,1,"div",82)),u&2){let t=c(2);r(4),d(t.getInvoiceTafqeetText()),r(),s(t.getInvoiceOutstanding()>0?5:-1)}}function yt(u,e){if(u&1&&(i(0,"div",82)(1,"span",83),o(2,"\u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0645\u0646 \u0627\u0644\u0631\u0633\u0648\u0645 \u0643\u062A\u0627\u0628\u0629\u064B:"),n(),i(3,"span",84),o(4),n()()),u&2){let t=c(3);r(4),d(t.getRemainingTafqeetText())}}function Et(u,e){if(u&1&&(i(0,"div",79)(1,"span",80),o(2,"\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u0642\u0628\u0648\u0636 \u0643\u062A\u0627\u0628\u0629\u064B:"),n(),i(3,"span",81),o(4),n()(),p(5,yt,5,1,"div",82)),u&2){let t=c(2);r(4),d(t.getTafqeetText()),r(),s(t.getRemainingBalance()>0?5:-1)}}function Dt(u,e){u&1&&(i(0,"p")(1,"strong"),o(2,"\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0647\u0627\u0645\u0629:"),n(),o(3," \u062A\u0633\u062A\u062D\u0642 \u0647\u0630\u0647 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0648\u062A\u062E\u0636\u0639 \u0644\u0644\u0627\u0626\u062D\u0629 \u0648\u0627\u0644\u0633\u064A\u0627\u0633\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629 \u0644\u0645\u062F\u0627\u0631\u0633 \u0627\u0644\u0645\u0648\u0631\u062F \u0627\u0644\u062C\u062F\u064A\u062F\u0629 \u0644\u0644\u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u062E\u0627\u0635. \u064A\u0631\u062C\u0649 \u0633\u062F\u0627\u062F \u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0642\u0628\u0644 \u062D\u0644\u0648\u0644 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0633\u062A\u062D\u0642\u0627\u0642 \u0644\u062A\u062C\u0646\u0628 \u062A\u0639\u0644\u064A\u0642 \u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0629 \u0623\u0648 \u0641\u0631\u0636 \u063A\u0631\u0627\u0645\u0627\u062A \u0627\u0644\u062A\u0623\u062E\u064A\u0631."),n())}function Pt(u,e){u&1&&(i(0,"p")(1,"strong"),o(2,"\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0647\u0627\u0645\u0629:"),n(),o(3," \u0627\u0644\u0631\u0633\u0648\u0645 \u0627\u0644\u0645\u062F\u0641\u0648\u0639\u0629 \u062A\u062E\u0636\u0639 \u0644\u0644\u0627\u0626\u062D\u0629 \u0648\u0627\u0644\u0633\u064A\u0627\u0633\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0644\u0644\u0645\u062F\u0631\u0633\u0629. \u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u062D\u062A\u0641\u0627\u0638 \u0628\u0647\u0630\u0627 \u0627\u0644\u0633\u0646\u062F \u0643\u0625\u062B\u0628\u0627\u062A \u0631\u0633\u0645\u064A \u0644\u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u0633\u062F\u0627\u062F."),n())}function Ot(u,e){if(u&1){let t=k();i(0,"img",85),S("error",function(){F(t);let l=c(2);return I(l.onStampError())}),n()}if(u&2){let t=c(2);P("src",t.getStampUrl(),z)}}function Mt(u,e){if(u&1&&(i(0,"div",53)(1,"span",86),o(2),n(),i(3,"span",87),o(4,"\u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629"),n(),i(5,"span",88),o(6,"\u2605 \u0645\u0639\u062A\u0645\u062F \u2605"),n()()),u&2){let t=c(2);r(2),d(t.getSchoolNameAr())}}function Ft(u,e){if(u&1){let t=k();i(0,"div",4)(1,"button",5),S("click",function(){F(t);let l=c();return I(l.printDocument())}),i(2,"span"),o(3,"\u{1F5A8}\uFE0F"),n(),i(4,"span"),o(5,"\u0637\u0628\u0627\u0639\u0629 \u0627\u0644\u0645\u0633\u062A\u0646\u062F \u0627\u0644\u0631\u0633\u0645\u064A (A4)"),n()(),i(6,"div",6)(7,"span",7),o(8),n()()(),i(9,"div",8)(10,"div",9)(11,"div",10)(12,"h2",11),o(13),n(),i(14,"h4",12),o(15),n(),i(16,"p",13),o(17,"\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0648\u0627\u0644\u062A\u0631\u0628\u064A\u0629 \u0627\u0644\u0648\u0637\u0646\u064A\u0629"),n(),i(18,"p",14),o(19),n()(),i(20,"div",15),p(21,at,1,1,"img",16)(22,ut,3,0,"div",17),n()(),i(23,"div",18)(24,"span",19),o(25,"\u25C6"),n()(),i(26,"div",20)(27,"div",21)(28,"h1",22),o(29),n(),i(30,"span",23),o(31),n()(),i(32,"div",24)(33,"div",25)(34,"span",26),o(35),n(),i(36,"span",27),o(37),n()(),i(38,"div",25)(39,"span",26),o(40),n(),i(41,"span",28),o(42),n()(),p(43,rt,5,1,"div",25),i(44,"div",25)(45,"span",26),o(46),n(),i(47,"span",29),o(48),n()()()(),i(49,"div",30)(50,"div",31)(51,"span",32),o(52,"\u0627\u0633\u0645 \u0627\u0644\u0637\u0627\u0644\u0628/\u0640\u0629:"),n(),i(53,"span",33),o(54),n()(),i(55,"div",31)(56,"span",32),o(57,"\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0623\u0643\u0627\u062F\u064A\u0645\u064A / \u0627\u0644\u0645\u062F\u0631\u0633\u064A:"),n(),i(58,"span",34),o(59),n()(),i(60,"div",31)(61,"span",32),o(62,"\u0627\u0644\u0645\u0631\u062D\u0644\u0629 \u0648\u0627\u0644\u0635\u0641:"),n(),i(63,"span",35),o(64),n()(),i(65,"div",31)(66,"span",32),o(67,"\u0627\u0644\u0634\u0639\u0628\u0629 / \u0627\u0644\u0641\u0635\u0644:"),n(),i(68,"span",35),o(69),n()(),i(70,"div",31)(71,"span",32),o(72,"\u0648\u0644\u064A \u0627\u0644\u0623\u0645\u0631:"),n(),i(73,"span",35),o(74),n()(),i(75,"div",31)(76,"span",32),o(77,"\u0647\u0627\u062A\u0641 \u0648\u0644\u064A \u0627\u0644\u0623\u0645\u0631:"),n(),i(78,"span",34),o(79),n()(),i(80,"div",31)(81,"span",32),o(82,"\u0631\u0642\u0645 \u062D\u0633\u0627\u0628 \u0627\u0644\u0637\u0627\u0644\u0628:"),n(),i(83,"span",34),o(84),n()(),p(85,lt,11,9)(86,dt,11,9),n(),i(87,"div",36)(88,"h3",37),o(89),n(),i(90,"table",38)(91,"thead")(92,"tr")(93,"th",39),o(94,"#"),n(),i(95,"th"),o(96),n(),i(97,"th",40),o(98,"\u0627\u0644\u0645\u0628\u0644\u063A"),n()()(),i(99,"tbody"),p(100,ft,3,2)(101,xt,8,5,"tr")(102,bt,8,4,"tr"),n(),i(103,"tfoot"),p(104,vt,15,14)(105,Ct,13,12)(106,At,6,4,"tr",41),n()()(),i(107,"div",42),p(108,St,6,2)(109,Et,6,2),n(),i(110,"div",43),p(111,Dt,4,0,"p")(112,Pt,4,0,"p"),n(),i(113,"div",44)(114,"div",45)(115,"span",46),o(116),n(),i(117,"div",47),o(118),n(),T(119,"div",48),i(120,"span",49),o(121,"\u0627\u0644\u062A\u0648\u0642\u064A\u0639 \u0648\u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F"),n()(),i(122,"div",45)(123,"span",46),o(124),n(),T(125,"div",48),i(126,"span",49),o(127),n()(),i(128,"div",50)(129,"span",46),o(130,"\u062E\u062A\u0645 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0644\u0644\u0645\u062F\u0631\u0633\u0629"),n(),i(131,"div",51),p(132,Ot,1,1,"img",52)(133,Mt,7,1,"div",53),n()()(),i(134,"div",54)(135,"span"),o(136,"\u062A\u0645 \u0627\u0644\u0625\u0635\u062F\u0627\u0631 \u0639\u0628\u0631 \u0646\u0638\u0627\u0645 \u0646\u0628\u0631\u0627\u0633 \u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0624\u0633\u0633\u0627\u062A \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A\u0629 (Nebras ERP)"),n(),i(137,"span"),o(138),n()()()}if(u&2){let t=e,a=c();r(7),y("posted",(t.data==null?null:t.data.status)==="posted")("draft",(t.data==null?null:t.data.status)==="draft"),r(),g(" ",(t.data==null?null:t.data.status)==="posted"?"\u2713 \u0645\u0633\u062A\u0646\u062F \u0645\u0639\u062A\u0645\u062F \u0648\u0645\u0631\u062D\u0644":"\u0645\u0633\u0648\u062F\u0629"," "),r(5),d(a.getSchoolNameAr()),r(2),d(a.getSchoolNameEn()),r(4),g("\u{1F4CD} ",a.getSchoolAddress()),r(2),s(a.getLogoUrl()?21:22),r(8),g(" ",t.type==="receipt"?"\u0633\u0646\u062F \u0642\u0640\u0628\u0640\u0636 \u0645\u0640\u0627\u0644\u0640\u064A":t.type==="invoice"?"\u0641\u0627\u062A\u0640\u0648\u0631\u0629 \u0631\u0633\u0640\u0648\u0645 \u062F\u0631\u0627\u0633\u0640\u064A\u0640\u0629 \u0631\u0633\u0645\u064A\u0640\u0629":"\u0625\u0634\u0639\u0627\u0631 \u0645\u0637\u0627\u0644\u0628\u0629 \u0645\u0627\u0644\u064A\u0629"," "),r(2),g(" ",t.type==="receipt"?"OFFICIAL PAYMENT RECEIPT":t.type==="invoice"?"OFFICIAL TUITION FEES INVOICE":"OFFICIAL PAYMENT NOTICE"," "),r(4),d(t.type==="invoice"?"\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629:":"\u0631\u0642\u0645 \u0627\u0644\u0633\u0646\u062F:"),r(2),d((t.data==null?null:t.data.receipt_number)||(t.data==null?null:t.data.invoice_number)||"\u2014"),r(3),d(t.type==="invoice"?"\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0625\u0635\u062F\u0627\u0631:":"\u0627\u0644\u062A\u0627\u0631\u064A\u062E:"),r(2),d((t.data==null?null:t.data.payment_date)||(t.data==null?null:t.data.issue_date)||a.todayDate),r(),s(t.type==="invoice"&&(t.data!=null&&t.data.due_date)?43:-1),r(3),d(t.type==="invoice"?"\u0627\u0644\u0645\u062D\u0627\u0633\u0628 \u0627\u0644\u0645\u0633\u0624\u0648\u0644:":"\u0623\u0645\u064A\u0646 \u0627\u0644\u0635\u0646\u062F\u0648\u0642 / \u0627\u0644\u0645\u062D\u0627\u0633\u0628:"),r(2),d(a.getAccountantName()||"\u2014"),r(6),d(a.getStudentName()),r(5),d(a.getStudentNumber()),r(5),d(a.getGradeName()),r(5),d(a.getSectionName()),r(5),d(a.getGuardianName()),r(5),d(a.getGuardianPhone()),r(5),d(a.getAccountNumber()),r(),s(t.type==="receipt"?85:t.type==="invoice"?86:-1),r(4),d(t.type==="invoice"?"\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0631\u0633\u0648\u0645 \u0627\u0644\u062F\u0631\u0627\u0633\u064A\u0629 \u0648\u0627\u0644\u0628\u0646\u0648\u062F":"\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0628\u0646\u0648\u062F \u0648\u0627\u0644\u0645\u0628\u0627\u0644\u063A \u0627\u0644\u0645\u0627\u0644\u064A\u0629"),r(7),d(t.type==="invoice"?"\u0628\u064A\u0627\u0646 \u0627\u0644\u0631\u0633\u0648\u0645 \u0627\u0644\u062F\u0631\u0627\u0633\u064A\u0629 / \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0628\u0646\u062F":"\u0628\u064A\u0627\u0646 \u0627\u0644\u0631\u0633\u0648\u0645 / \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0642\u0633\u0637"),r(4),s(t.type==="invoice"?100:t.type==="receipt"?101:102),r(4),s(t.type==="invoice"?104:t.type==="receipt"?105:106),r(4),s(t.type==="invoice"?108:109),r(3),s(t.type==="invoice"?111:112),r(5),d(t.type==="invoice"?"\u0645\u062D\u0627\u0633\u0628 \u0627\u0644\u0645\u062F\u0631\u0633\u0629 / \u0634\u0624\u0648\u0646 \u0627\u0644\u0637\u0644\u0627\u0628 \u0627\u0644\u0645\u0627\u0644\u064A\u0629":"\u0623\u0645\u064A\u0646 \u0627\u0644\u0635\u0646\u062F\u0648\u0642 / \u0627\u0644\u0645\u062D\u0627\u0633\u0628"),r(2),d(a.getAccountantName()),r(6),d(t.type==="invoice"?"\u0627\u0633\u062A\u0644\u0627\u0645 \u0648\u0644\u064A \u0627\u0644\u0623\u0645\u0631 / \u0627\u0644\u0637\u0627\u0644\u0628":"\u062A\u0648\u0642\u064A\u0639 \u0648\u0644\u064A \u0627\u0644\u0623\u0645\u0631 / \u0627\u0644\u0645\u0633\u062F\u062F"),r(3),d(t.type==="invoice"?"\u0627\u0644\u0627\u0633\u0645 \u0648\u0627\u0644\u062A\u0648\u0642\u064A\u0639 \u0628\u0627\u0644\u0639\u0644\u0645":"\u0627\u0644\u0627\u0633\u0645 \u0648\u0627\u0644\u062A\u0648\u0642\u064A\u0639"),r(5),s(a.getStampUrl()?132:133),r(6),g("\u062A\u0627\u0631\u064A\u062E \u0648\u0648\u0642\u062A \u0627\u0644\u0637\u0628\u0627\u0639\u0629: ",a.currentDateTime())}}var $={name:"\u0645\u062F\u0627\u0631\u0633 \u0627\u0644\u0645\u0648\u0631\u062F \u0627\u0644\u0646\u0645\u0648\u0630\u062C\u064A\u0629 \u0627\u0644\u062E\u0627\u0635\u0629",name_ar:"\u0645\u062F\u0627\u0631\u0633 \u0627\u0644\u0645\u0648\u0631\u062F \u0627\u0644\u0646\u0645\u0648\u0630\u062C\u064A\u0629 \u0627\u0644\u062E\u0627\u0635\u0629",name_en:"Al-Mawred Model Private Schools",accreditation:"\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645 \u0648\u0627\u0644\u062A\u0631\u0628\u064A\u0629 \u0627\u0644\u0648\u0637\u0646\u064A\u0629",address:"\u062C\u0645\u0647\u0648\u0631\u064A\u0629 \u0627\u0644\u0633\u0648\u062F\u0627\u0646 \u2014 \u0648\u0644\u0627\u064A\u0629 \u0627\u0644\u062E\u0631\u0637\u0648\u0645 \u2014 \u0623\u0631\u0643\u0648\u064A\u062A \u2014 \u0634\u0627\u0631\u0639 \u0627\u0644\u0641\u0631\u062F\u0648\u0633 \u2014 \u0645\u0631\u0628\u0639 54",logo_url:"",stamp_url:""};function N(u,e="\u062C\u0646\u064A\u0647"){if(!u||u<=0)return"\u0635\u0641\u0631 "+e;let t=["","\u0648\u0627\u062D\u062F","\u0627\u062B\u0646\u0627\u0646","\u062B\u0644\u0627\u062B\u0629","\u0623\u0631\u0628\u0639\u0629","\u062E\u0645\u0633\u0629","\u0633\u062A\u0629","\u0633\u0628\u0639\u0629","\u062B\u0645\u0627\u0646\u064A\u0629","\u062A\u0633\u0639\u0629","\u0639\u0634\u0631\u0629","\u0623\u062D\u062F \u0639\u0634\u0631","\u0627\u062B\u0646\u0627 \u0639\u0634\u0631","\u062B\u0644\u0627\u062B\u0629 \u0639\u0634\u0631","\u0623\u0631\u0628\u0639\u0629 \u0639\u0634\u0631","\u062E\u0645\u0633\u0629 \u0639\u0634\u0631","\u0633\u062A\u0629 \u0639\u0634\u0631","\u0633\u0628\u0639\u0629 \u0639\u0634\u0631","\u062B\u0645\u0627\u0646\u064A\u0629 \u0639\u0634\u0631","\u062A\u0633\u0639\u0629 \u0639\u0634\u0631"],a=["","","\u0639\u0634\u0631\u0648\u0646","\u062B\u0644\u0627\u062B\u0648\u0646","\u0623\u0631\u0628\u0639\u0648\u0646","\u062E\u0645\u0633\u0648\u0646","\u0633\u062A\u0648\u0646","\u0633\u0628\u0639\u0648\u0646","\u062B\u0645\u0627\u0646\u0648\u0646","\u062A\u0633\u0639\u0648\u0646"],l=["","\u0645\u0627\u0626\u0629","\u0645\u0627\u0626\u062A\u0627\u0646","\u062B\u0644\u0627\u062B\u0645\u0627\u0626\u0629","\u0623\u0631\u0628\u0639\u0645\u0627\u0626\u0629","\u062E\u0645\u0633\u0645\u0627\u0626\u0629","\u0633\u062A\u0645\u0627\u0626\u0629","\u0633\u0628\u0639\u0645\u0627\u0626\u0629","\u062B\u0645\u0627\u0646\u0645\u0627\u0626\u0629","\u062A\u0633\u0639\u0645\u0627\u0626\u0629"];function h(M){let b="",E=Math.floor(M/100),D=M%100;if(E>0&&(b+=l[E]),D>0)if(b&&(b+=" \u0648"),D<20)b+=t[D];else{let ot=Math.floor(D/10),R=D%10;R>0&&(b+=t[R]+" \u0648"),b+=a[ot]}return b}let C=Math.floor(u),m="",_=Math.floor(C/1e6),v=Math.floor(C%1e6/1e3),O=C%1e3;return _>0&&(_===1?m+="\u0645\u0644\u064A\u0648\u0646":_===2?m+="\u0645\u0644\u064A\u0648\u0646\u0627\u0646":_>=3&&_<=10?m+=h(_)+" \u0645\u0644\u0627\u064A\u064A\u0646":m+=h(_)+" \u0645\u0644\u064A\u0648\u0646"),v>0&&(m&&(m+=" \u0648"),v===1?m+="\u0623\u0644\u0641":v===2?m+="\u0623\u0644\u0641\u0627\u0646":v>=3&&v<=10?m+=h(v)+" \u0622\u0644\u0627\u0641":m+=h(v)+" \u0623\u0644\u0641"),O>0&&(m&&(m+=" \u0648"),m+=h(O)),`\u0641\u0642\u0637 ${m} ${e} \u0644\u0627 \u063A\u064A\u0631`}var nt=class u{elRef=A(G);studentsService=A(X);studentFinanceService=A(Q);tenantService=A(J);authService=A(K,{optional:!0});printFn=()=>this.printDocument();pdfFn=()=>this.exportVoucherPdf();doc=null;studentName="";student=null;schoolInfo=null;billingAccount=null;methods=[];closed=new W;brandingData=w(null);resolvedStudent=w(null);resolvedAccount=w(null);logoFailed=w(!1);stampFailed=w(!1);todayDate=new Date().toLocaleDateString("ar-EG");ngOnInit(){this.logoFailed.set(!1),this.stampFailed.set(!1),this.resolveMissingData()}ngOnChanges(e){(e.doc||e.student||e.billingAccount)&&this.resolveMissingData()}resolveMissingData(){let e=this.doc?.data;if(!this.schoolInfo&&!this.brandingData()&&this.studentsService.getBranding().subscribe({next:l=>{l&&this.brandingData.set(l)},error:()=>{}}),!e)return;let t=e.student_id||e.student?.id;!this.student&&t&&(!this.resolvedStudent()||this.resolvedStudent()?.id!==t)&&this.studentsService.getStudentById(t).subscribe({next:l=>{l&&l.success&&l.data&&this.resolvedStudent.set(l.data)},error:()=>{}});let a=e.student_billing_account_id||(typeof e.student_billing_account=="string"?e.student_billing_account:e.student_billing_account?.id);!this.billingAccount&&a&&(!this.resolvedAccount()||this.resolvedAccount()?.id!==a)&&this.studentFinanceService.listBillingAccounts({id:a}).subscribe({next:l=>{let h=l?.data?.[0];h&&this.resolvedAccount.set(h)},error:()=>{}})}schoolData(){return this.schoolInfo||this.brandingData()||this.tenantService.currentTenant()||null}getSchoolNameAr(){return this.schoolData()?.school_name_ar||this.schoolData()?.name_ar||this.schoolData()?.name||$.name_ar}getSchoolNameEn(){return this.schoolData()?.school_name_en||this.schoolData()?.name_en||$.name_en}getSchoolAddress(){return this.schoolData()?.address||$.address}getLogoUrl(){if(this.logoFailed())return"";let e=this.schoolData(),t=this.tenantService.currentTenant()?.logoUrl||e?.logo_url||e?.logo||"";if(!t)return"";if(t.startsWith("http://")||t.startsWith("https://")||t.startsWith("data:")||t.startsWith("blob:"))return t;let a=j.apiUrl.replace(/\/api\/v1\/?$/,"");return t.startsWith("/")?`${a}${t}`:`${a}/${t}`}getStampUrl(){if(this.stampFailed())return"";let e=this.schoolData(),t=this.tenantService.currentTenant()?.stampFinanceUrl||e?.stamp_finance_url||e?.stamp_finance||"";if(!t)return"";if(t.startsWith("http://")||t.startsWith("https://")||t.startsWith("data:")||t.startsWith("blob:"))return t;let a=j.apiUrl.replace(/\/api\/v1\/?$/,"");return t.startsWith("/")?`${a}${t}`:`${a}/${t}`}onLogoError(){this.logoFailed.set(!0)}onStampError(){this.stampFailed.set(!0)}getStudentObj(){return this.student||this.resolvedStudent()||null}getBillingAccountObj(){return this.billingAccount||this.resolvedAccount()||(typeof this.doc?.data?.student_billing_account=="object"?this.doc?.data?.student_billing_account:null)}getStudentName(){let e=this.getStudentObj();return this.doc?.data?.student_name||this.studentName||e?.profile?.arabic_name||e?.arabic_name||e?.profile?.english_name||e?.english_name||"\u2014"}getStudentNumber(){let e=this.getStudentObj();return this.doc?.data?.student_number||e?.student_number||"\u2014"}getGradeName(){let e=this.getStudentObj();return this.doc?.data?.grade_name||e?.grade_name||e?.enrollments?.[0]?.grade_level||"\u2014"}getSectionName(){let e=this.getStudentObj();return this.doc?.data?.section_name||e?.section_name||e?.enrollments?.[0]?.section_name||"\u2014"}getGuardianName(){let e=this.getStudentObj();return this.doc?.data?.guardian_name||e?.guardian_name||e?.family_relations?.[0]?.full_name||"\u2014"}getGuardianPhone(){let e=this.getStudentObj();return this.doc?.data?.guardian_phone||e?.guardian_phone||e?.family_relations?.[0]?.phone||"\u2014"}getAccountNumber(){if(this.doc?.data?.account_number)return this.doc.data.account_number;let e=this.getBillingAccountObj();if(e?.account_number)return e.account_number;let t=this.getStudentNumber();return t&&t!=="\u2014"?`ACC-${t}`:"\u2014"}getRemainingBalance(){let e=this.doc?.data;if(e?.remaining_balance!==void 0&&e?.remaining_balance!==null)return Number(e.remaining_balance)||0;if(e?.outstanding_balance!==void 0&&e?.outstanding_balance!==null)return Number(e.outstanding_balance)||0;let t=this.getBillingAccountObj();return t?.outstanding_balance!==void 0&&t?.outstanding_balance!==null&&Number(t.outstanding_balance)||0}getRemainingTafqeetText(){let e=this.getRemainingBalance();return N(e,"\u062C\u0646\u064A\u0647")}getPaymentMethodText(){let e=this.doc?.data;if(e?.payment_method_name)return e.payment_method_name;if(e?.payment_method?.name_ar)return e.payment_method.name_ar;if(e?.payment_method_id){let t=this.methods.find(a=>a.id===e.payment_method_id);if(t)return t.name_ar||t.name}return"\u0646\u0642\u062F\u0627\u064B / \u0643\u0627\u0634"}methodName(e){return this.methods.find(t=>t.id===e)?.name_ar||"\u0646\u0642\u062F\u0627\u064B / \u0643\u0627\u0634"}getInvoiceGross(){let e=this.doc?.data;if(!e)return 0;let t=(e.items||[]).reduce((a,l)=>a+(Number(l.amount)||0),0);return t>0?t:(Number(e.total_amount)||0)+this.getInvoiceDiscount()}getInvoiceDiscount(){let e=this.doc?.data;return!e?.discounts||!Array.isArray(e.discounts)?0:e.discounts.reduce((t,a)=>t+(Number(a.amount)||0),0)}getInvoiceOutstanding(){let e=this.doc?.data;if(!e)return 0;if(e.outstanding_amount!==void 0&&e.outstanding_amount!==null)return Number(e.outstanding_amount)||0;let t=Number(e.total_amount)||0,a=Number(e.paid_amount)||0;return Math.max(0,t-a)}getPaidAmount(){return Number(this.doc?.data?.paid_amount)||0}getInvoiceTafqeetText(){let e=Number(this.doc?.data?.total_amount)||0;return N(e,"\u062C\u0646\u064A\u0647")}getInvoiceOutstandingTafqeetText(){let e=this.getInvoiceOutstanding();return N(e,"\u062C\u0646\u064A\u0647")}getAccountantName(){let e=this.doc?.data;if(!e)return"";let t=e.accountant_name||e.created_by_name||e.collector_name||e.collector;if(t&&typeof t=="string"&&t.trim()&&t.trim()!=="\u2014")return t.trim();if(e.is_new_creation){let a=this.authService?.currentUser();if(a){let l=`${a.first_name||""} ${a.last_name||""}`.trim();if(l)return l;if(a.username)return a.username}}return""}meta(){let e=this.doc;return e?e.type==="invoice"?{title:`\u0641\u0627\u062A\u0648\u0631\u0629 \u0631\u0633\u0648\u0645 \u062F\u0631\u0627\u0633\u064A\u0629 ${e.data?.invoice_number||""}`,subtitle:this.getStudentName()}:e.type==="receipt"?{title:`\u0633\u0646\u062F \u0642\u0628\u0636 \u0645\u0627\u0644\u064A ${e.data?.receipt_number||""}`,subtitle:this.getStudentName()}:{title:"\u0645\u0633\u062A\u062D\u0642 \u0645\u0627\u0644\u064A",subtitle:this.getStudentName()}:{title:"",subtitle:""}}getTafqeetText(){let e=Number(this.doc?.type==="receipt"?this.doc?.data?.amount:this.doc?.data?.total_amount)||0;return N(e,"\u062C\u0646\u064A\u0647")}currentDateTime(){let e=new Date;return`${e.toLocaleDateString("ar-EG")} - ${e.toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"})}`}printDocument(){let t=this.elRef.nativeElement.querySelector("#official-print-voucher")||document.getElementById("official-print-voucher");if(!t){window.print();return}let a=document.createElement("iframe");a.style.position="fixed",a.style.top="-10000px",a.style.left="-10000px",a.style.width="1000px",a.style.height="1000px",a.style.border="0",a.style.opacity="0",a.style.pointerEvents="none",document.body.appendChild(a);let l=a.contentWindow?.document;if(!l){window.print();return}let h=`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <base href="${window.location.origin}/">
        <title>${this.meta().title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            background: #ffffff !important;
            color: #0f172a;
            font-family: 'Cairo', 'IBM Plex Sans Arabic', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
            direction: rtl;
            font-size: 12px;
            line-height: 1.4;
            width: 100%;
          }
          .official-voucher-card {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
            border: 1.5px solid #cbd5e1 !important;
            border-radius: 12px !important;
            padding: 20px 24px !important;
            background: #ffffff !important;
            box-shadow: none !important;
            position: relative !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .voucher-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            gap: 16px !important;
            margin-bottom: 4px !important;
          }
          .school-brand-meta .school-name-ar {
            font-size: 20px !important;
            font-weight: 800 !important;
            color: #0284c7 !important;
            margin: 0 0 2px !important;
            line-height: 1.2 !important;
          }
          .school-brand-meta .school-name-en {
            font-size: 12px !important;
            font-weight: 600 !important;
            color: #64748b !important;
            margin: 0 0 4px !important;
            letter-spacing: 0.5px !important;
          }
          .school-brand-meta .accreditation-line {
            font-size: 11px !important;
            color: #475569 !important;
            margin: 0 0 2px !important;
          }
          .school-brand-meta .school-contact-line {
            font-size: 11px !important;
            color: #64748b !important;
            margin: 0 !important;
          }
          .school-logo-wrapper {
            max-width: 140px !important;
            max-height: 80px !important;
            min-width: 60px !important;
            min-height: 60px !important;
            border-radius: 8px !important;
            border: 1px solid #cbd5e1 !important;
            padding: 4px !important;
            background: #ffffff !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            overflow: hidden !important;
            flex-shrink: 0 !important;
          }
          .school-logo-img {
            max-width: 130px !important;
            max-height: 72px !important;
            width: auto !important;
            height: auto !important;
            object-fit: contain !important;
          }
          .school-logo-placeholder {
            font-size: 32px !important;
          }
          .luxury-divider {
            position: relative !important;
            height: 2px !important;
            background: linear-gradient(90deg, transparent, #0284c7, transparent) !important;
            margin: 14px 0 !important;
            text-align: center !important;
          }
          .divider-diamond {
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            background: #ffffff !important;
            padding: 0 8px !important;
            color: #0284c7 !important;
            font-size: 13px !important;
            font-weight: bold !important;
          }
          .doc-banner {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            background: #f8fafc !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            padding: 10px 16px !important;
            margin-bottom: 14px !important;
          }
          .doc-title-box {
            display: flex !important;
            flex-direction: column !important;
          }
          .doc-main-title {
            font-size: 18px !important;
            font-weight: 800 !important;
            color: #0f172a !important;
            margin: 0 !important;
            line-height: 1.2 !important;
          }
          .doc-sub-title {
            font-size: 9.5px !important;
            color: #64748b !important;
            font-weight: 700 !important;
            letter-spacing: 0.5px !important;
          }
          .doc-meta-row {
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
          }
          .meta-item-box {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
            background: #ffffff !important;
            padding: 5px 12px !important;
            border-radius: 6px !important;
            border: 1px solid #cbd5e1 !important;
          }
          .meta-item-box .lbl {
            font-size: 11px !important;
            color: #64748b !important;
            font-weight: 600 !important;
          }
          .meta-item-box .val {
            font-size: 12px !important;
            font-weight: 800 !important;
            color: #0f172a !important;
          }
          .student-info-section {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px 16px !important;
            background: #ffffff !important;
            border: 1px dashed #cbd5e1 !important;
            border-radius: 8px !important;
            padding: 12px 16px !important;
            margin-bottom: 14px !important;
          }
          .info-cell {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            font-size: 12px !important;
          }
          .info-cell .c-label {
            color: #64748b !important;
            width: 140px !important;
            flex-shrink: 0 !important;
            font-weight: 600 !important;
          }
          .info-cell .c-val {
            color: #1e293b !important;
            font-weight: 600 !important;
          }
          .info-cell .c-val.strong {
            font-weight: 800 !important;
            color: #0284c7 !important;
          }
          .info-cell.balance-cell {
            background: #fef2f2 !important;
            padding: 5px 10px !important;
            border-radius: 6px !important;
            border: 1px dashed #fca5a5 !important;
            grid-column: 2 !important;
          }
          .remaining-val {
            font-size: 12.5px !important;
            font-weight: 800 !important;
          }
          .remaining-val.danger {
            color: #dc2626 !important;
          }
          .remaining-val.success {
            color: #059669 !important;
          }
          .breakdown-section {
            margin-bottom: 12px !important;
          }
          .section-heading {
            font-size: 13px !important;
            font-weight: 700 !important;
            color: #1e293b !important;
            margin: 0 0 8px !important;
          }
          .voucher-table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 12px !important;
          }
          .voucher-table th {
            background: #f1f5f9 !important;
            color: #475569 !important;
            font-weight: 700 !important;
            padding: 8px 12px !important;
            border: 1px solid #cbd5e1 !important;
            text-align: start !important;
          }
          .voucher-table td {
            padding: 8px 12px !important;
            border: 1px solid #cbd5e1 !important;
            color: #1e293b !important;
          }
          .voucher-table .discount-row td {
            color: #dc2626 !important;
            background: rgba(220, 38, 38, 0.03) !important;
          }
          .voucher-table tfoot .total-row td {
            background: #f8fafc !important;
            border-top: 2px solid #cbd5e1 !important;
            font-weight: 800 !important;
          }
          .total-label {
            font-size: 13px !important;
            color: #0f172a !important;
          }
          .total-amount {
            font-size: 14.5px !important;
            color: #059669 !important;
            font-weight: 800 !important;
          }
          .voucher-table tfoot .subtotal-row td {
            background: #f8fafc !important;
            font-weight: 600 !important;
          }
          .voucher-table tfoot .discount-total-row td {
            background: #fff5f5 !important;
            font-weight: 600 !important;
          }
          .voucher-table tfoot .paid-row td {
            background: #f0fdf4 !important;
            font-weight: 600 !important;
          }
          .voucher-table tfoot .remaining-row td {
            background: #fef2f2 !important;
            border-top: 1px dashed #fca5a5 !important;
            border-bottom: 2px solid #ef4444 !important;
            font-weight: 800 !important;
          }
          .remaining-label {
            font-size: 13px !important;
            color: #991b1b !important;
          }
          .remaining-title {
            font-weight: 800 !important;
          }
          .remaining-amount {
            font-size: 15px !important;
            font-weight: 800 !important;
          }
          .remaining-amount.has-due {
            color: #dc2626 !important;
          }
          .remaining-amount.cleared {
            color: #059669 !important;
          }
          .tafqeet-container {
            display: flex !important;
            flex-direction: column !important;
            gap: 7px !important;
            margin-bottom: 12px !important;
          }
          .tafqeet-box {
            background: #f0f9ff !important;
            border: 1px solid #bae6fd !important;
            border-radius: 6px !important;
            padding: 7px 12px !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            font-size: 12px !important;
          }
          .tafqeet-title {
            font-weight: 700 !important;
            color: #0284c7 !important;
            flex-shrink: 0 !important;
          }
          .tafqeet-text {
            font-weight: 700 !important;
            color: #0f172a !important;
          }
          .remaining-tafqeet-box {
            background: #fef2f2 !important;
            border: 1px solid #fca5a5 !important;
          }
          .remaining-tafqeet-title {
            color: #dc2626 !important;
            font-weight: 800 !important;
            flex-shrink: 0 !important;
          }
          .remaining-tafqeet-text {
            color: #991b1b !important;
            font-weight: 700 !important;
          }
          .terms-box {
            font-size: 10.5px !important;
            color: #64748b !important;
            margin-bottom: 14px !important;
            line-height: 1.5 !important;
          }
          .terms-box p {
            margin: 0 !important;
          }
          .signatures-section {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 16px !important;
            padding-top: 12px !important;
            border-top: 1px solid #cbd5e1 !important;
            margin-bottom: 12px !important;
          }
          .sig-box {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
          }
          .sig-title {
            font-size: 11px !important;
            font-weight: 700 !important;
            color: #475569 !important;
            margin-bottom: 8px !important;
          }
          .sig-signer-name {
            font-size: 11px !important;
            font-weight: 800 !important;
            color: #0f172a !important;
            margin-bottom: 10px !important;
            background: #f1f5f9 !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
            border: 1px solid #e2e8f0 !important;
          }
          .sig-space {
            width: 100% !important;
            border-bottom: 1px dashed #cbd5e1 !important;
            margin-bottom: 4px !important;
          }
          .sig-hint {
            font-size: 9.5px !important;
            color: #94a3b8 !important;
          }
          .stamp-container {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            min-height: 65px !important;
          }
          .official-school-stamp-img {
            max-height: 85px !important;
            max-width: 140px !important;
            width: auto !important;
            height: auto !important;
            object-fit: contain !important;
            transform: rotate(-3deg) !important;
          }
          .stamp-badge, .stamp-circle {
            min-width: 85px !important;
            max-width: 130px !important;
            height: 56px !important;
            padding: 4px 8px !important;
            border: 1.5px dashed #0284c7 !important;
            border-radius: 8px !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 8px !important;
            color: #0284c7 !important;
            font-weight: 700 !important;
            transform: rotate(-3deg) !important;
            text-align: center !important;
            line-height: 1.2 !important;
            padding: 2px 4px !important;
          }
          .voucher-footer-meta {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            font-size: 9.5px !important;
            color: #94a3b8 !important;
            border-top: 1px solid #f1f5f9 !important;
            padding-top: 8px !important;
            margin-top: 8px !important;
          }
          .mono { font-family: monospace, sans-serif; }
          .text-center { text-align: center; }
          .text-end { text-align: end; }
          .font-bold { font-weight: 700; }
          .text-danger { color: #dc2626 !important; }
          .text-success { color: #059669 !important; }
        </style>
      </head>
      <body>
        ${t.outerHTML}
      </body>
      </html>
    `;l.open(),l.write(h),l.close();let C=!1,m=()=>{setTimeout(()=>{document.body.contains(a)&&document.body.removeChild(a)},6e4)},_=()=>{if(!C){C=!0;try{a.contentWindow?.focus(),a.contentWindow?.print()}catch(b){console.error("Error during printing",b)}m()}};a.contentWindow?.addEventListener("afterprint",()=>{document.body.contains(a)&&document.body.removeChild(a)});let O=Array.from(l.images).map(b=>b.complete?Promise.resolve(!0):new Promise(E=>{b.onload=()=>E(!0),b.onerror=()=>E(!1)})),M=l.fonts?.ready||Promise.resolve();Promise.race([Promise.all([...O,M]),new Promise(b=>setTimeout(b,800))]).then(()=>{setTimeout(_,150)})}exportVoucherPdf(){return L(this,null,function*(){let t=this.elRef.nativeElement.querySelector("#official-print-voucher")||document.getElementById("official-print-voucher");if(!t){this.printDocument();return}try{yield tt(t,this.meta().title||"\u0633\u0646\u062F-\u0642\u0628\u0636-\u0645\u0627\u0644\u064A")}catch(a){console.warn("exportElementToPdf fallback to print dialog",a),this.printDocument()}})}exportCols(){return this.doc?.type==="invoice"?[{key:"description",label:"\u0627\u0644\u0628\u064A\u0627\u0646 / \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0628\u0646\u062F"},{key:"amount",label:"\u0627\u0644\u0645\u0628\u0644\u063A (\u062C.\u0633)",align:"end"}]:[{key:"field",label:"\u0627\u0644\u0628\u064A\u0627\u0646 \u0627\u0644\u0645\u0627\u0644\u064A / \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644"},{key:"value",label:"\u0627\u0644\u0642\u064A\u0645\u0629 / \u0627\u0644\u0628\u064A\u0627\u0646",align:"end"}]}exportRows(){let e=this.doc;if(!e)return[];if(e.type==="invoice"){let a=[{description:"\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629: "+(e.data?.invoice_number||"\u2014"),amount:""},{description:"\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0625\u0635\u062F\u0627\u0631: "+(e.data?.issue_date||"\u2014"),amount:""},{description:"\u0627\u0633\u0645 \u0627\u0644\u0637\u0627\u0644\u0628: "+this.getStudentName(),amount:""},{description:"\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0623\u0643\u0627\u062F\u064A\u0645\u064A: "+this.getStudentNumber(),amount:""},{description:"\u0627\u0644\u0645\u0631\u062D\u0644\u0629 \u0648\u0627\u0644\u0635\u0641: "+this.getGradeName(),amount:""},{description:"--- \u0628\u0646\u0648\u062F \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 ---",amount:""}];return(e.data.items||[]).forEach((l,h)=>{a.push({description:`${h+1}. ${l.description||"\u0628\u0646\u062F \u0631\u0633\u0648\u0645 \u062F\u0631\u0627\u0633\u064A\u0629"}`,amount:Number(l.amount).toFixed(2)})}),(e.data.discounts||[]).forEach(l=>{a.push({description:`\u062E\u0635\u0645: ${l.discount_reason||"\u0645\u0646\u062D\u0629 / \u062A\u062E\u0641\u064A\u0636"}`,amount:"-"+Number(l.amount).toFixed(2)})}),a.push({description:"\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0627\u0644\u0645\u0633\u062A\u062D\u0642",amount:Number(e.data?.total_amount||0).toFixed(2)}),a}let t=e.data?.payment_method_name||this.methodName(e.data?.payment_method_id);return[{field:"\u0646\u0648\u0639 \u0627\u0644\u0645\u0633\u062A\u0646\u062F",value:"\u0633\u0646\u062F \u0642\u0628\u0636 \u0645\u0627\u0644\u064A \u0631\u0633\u0645\u064A"},{field:"\u0631\u0642\u0645 \u0627\u0644\u0633\u0646\u062F",value:e.data?.receipt_number||"\u2014"},{field:"\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0633\u062F\u0627\u062F",value:e.data?.payment_date||this.todayDate},{field:"\u0627\u0633\u0645 \u0627\u0644\u0637\u0627\u0644\u0628/\u0640\u0629",value:this.getStudentName()},{field:"\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0623\u0643\u0627\u062F\u064A\u0645\u064A",value:this.getStudentNumber()},{field:"\u0627\u0644\u0645\u0631\u062D\u0644\u0629 \u0648\u0627\u0644\u0635\u0641",value:this.getGradeName()},{field:"\u0627\u0644\u0634\u0639\u0628\u0629 / \u0627\u0644\u0641\u0635\u0644",value:this.getSectionName()},{field:"\u0648\u0644\u064A \u0627\u0644\u0623\u0645\u0631",value:this.getGuardianName()},{field:"\u0647\u0627\u062A\u0641 \u0648\u0644\u064A \u0627\u0644\u0623\u0645\u0631",value:this.getGuardianPhone()},{field:"\u0631\u0642\u0645 \u062D\u0633\u0627\u0628 \u0627\u0644\u0637\u0627\u0644\u0628",value:this.getAccountNumber()},{field:"\u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u0633\u062F\u0627\u062F",value:t},{field:"\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u0642\u0628\u0648\u0636 (\u062C.\u0633)",value:Number(e.data?.amount||0).toFixed(2)},{field:"\u0627\u0644\u0645\u0628\u0644\u063A \u0643\u062A\u0627\u0628\u0629\u064B (\u0627\u0644\u062A\u0641\u0642\u064A\u0637)",value:this.getTafqeetText()},{field:"\u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0645\u0646 \u0627\u0644\u0631\u0633\u0648\u0645 (\u062C.\u0633)",value:Number(this.getRemainingBalance()).toFixed(2)},{field:"\u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0643\u062A\u0627\u0628\u0629\u064B",value:this.getRemainingTafqeetText()},{field:"\u062D\u0627\u0644\u0629 \u0627\u0644\u0633\u0646\u062F",value:e.data?.status==="posted"?"\u0645\u0639\u062A\u0645\u062F \u0648\u0645\u0631\u062D\u0644 \u0644\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0629":"\u0645\u0633\u0648\u062F\u0629"}]}static \u0275fac=function(t){return new(t||u)};static \u0275cmp=V({type:u,selectors:[["sf-document-drawer"]],inputs:{doc:"doc",studentName:"studentName",student:"student",schoolInfo:"schoolInfo",billingAccount:"billingAccount",methods:"methods"},outputs:{closed:"closed"},features:[U],decls:9,vars:13,consts:[[3,"closed","open","width","title","subtitle"],["drawer-actions","",1,"drawer-actions-wrapper"],["type","button",1,"btn-print-drawer-primary",3,"click"],[3,"columns","rows","title","subtitle","filename","showPrint","customPrint","customPdf"],[1,"doc-actions-bar","no-print"],["type","button",1,"btn-print-action",3,"click"],[1,"meta-tag"],[1,"status-pill"],["id","official-print-voucher",1,"official-voucher-card"],[1,"voucher-header"],[1,"school-brand-meta"],[1,"school-name-ar"],[1,"school-name-en"],[1,"accreditation-line"],[1,"school-contact-line"],[1,"school-logo-wrapper"],["alt","\u0634\u0639\u0627\u0631 \u0627\u0644\u0645\u062F\u0631\u0633\u0629",1,"school-logo-img",3,"src"],[1,"school-logo-placeholder"],[1,"luxury-divider"],[1,"divider-diamond"],[1,"doc-banner"],[1,"doc-title-box"],[1,"doc-main-title"],[1,"doc-sub-title"],[1,"doc-meta-row"],[1,"meta-item-box"],[1,"lbl"],[1,"val","mono"],[1,"val"],[1,"val","bold"],[1,"student-info-section"],[1,"info-cell"],[1,"c-label"],[1,"c-val","strong"],[1,"c-val","mono"],[1,"c-val"],[1,"breakdown-section"],[1,"section-heading"],[1,"voucher-table"],[2,"width","45px"],[1,"text-end",2,"width","140px"],[1,"total-row"],[1,"tafqeet-container"],[1,"terms-box"],[1,"signatures-section"],[1,"sig-box"],[1,"sig-title"],[1,"sig-signer-name"],[1,"sig-space"],[1,"sig-hint"],[1,"sig-box","stamp-box"],[1,"stamp-container"],["alt","\u0627\u0644\u062E\u062A\u0645 \u0627\u0644\u0631\u0633\u0645\u064A \u0644\u0644\u0645\u062F\u0631\u0633\u0629",1,"official-school-stamp-img",3,"src"],[1,"stamp-badge"],[1,"voucher-footer-meta"],["alt","\u0634\u0639\u0627\u0631 \u0627\u0644\u0645\u062F\u0631\u0633\u0629",1,"school-logo-img",3,"error","src"],[1,"info-cell","balance-cell"],[1,"c-val","mono","remaining-val"],[1,"text-center"],[1,"item-desc"],[1,"text-end","mono"],[1,"text-end","mono","font-bold"],[1,"discount-row"],["colspan","2",1,"total-label"],[1,"total-amount","mono","text-end","font-bold"],[1,"paid-row"],[1,"remaining-row"],["colspan","2",1,"remaining-label"],[1,"remaining-title"],[1,"remaining-amount","mono","text-end","font-bold"],[1,"subtotal-row"],["colspan","2",1,"subtotal-label"],[1,"mono","text-end"],[1,"discount-total-row"],["colspan","2",1,"discount-total-label"],[1,"mono","text-end","text-danger"],["colspan","2",1,"paid-label"],[1,"mono","text-end","text-success","font-bold"],[1,"total-amount","mono","text-end"],[1,"tafqeet-box"],[1,"tafqeet-title"],[1,"tafqeet-text"],[1,"tafqeet-box","remaining-tafqeet-box"],[1,"tafqeet-title","remaining-tafqeet-title"],[1,"tafqeet-text","remaining-tafqeet-text"],["alt","\u0627\u0644\u062E\u062A\u0645 \u0627\u0644\u0631\u0633\u0645\u064A \u0644\u0644\u0645\u062F\u0631\u0633\u0629",1,"official-school-stamp-img",3,"error","src"],[1,"stamp-school-text"],[1,"stamp-center-text"],[1,"stamp-approved-text"]],template:function(t,a){if(t&1&&(i(0,"nb-drawer",0),S("closed",function(){return a.closed.emit()}),p(1,Ft,139,38),i(2,"div",1)(3,"button",2),S("click",function(){return a.printDocument()}),i(4,"span"),o(5,"\u{1F5A8}\uFE0F"),n(),i(6,"span"),o(7,"\u0637\u0628\u0627\u0639\u0629 \u0627\u0644\u0645\u0633\u062A\u0646\u062F \u0627\u0644\u0631\u0633\u0645\u064A (A4)"),n()(),T(8,"nb-export-menu",3),n()()),t&2){let l;P("open",!!a.doc)("width",740)("title",a.meta().title)("subtitle",a.meta().subtitle),r(),s((l=a.doc)?1:-1,l),r(7),P("columns",a.exportCols())("rows",a.exportRows())("title",a.meta().title)("subtitle",a.meta().subtitle)("filename",a.meta().title)("showPrint",!0)("customPrint",a.printFn)("customPdf",a.pdfFn)}},dependencies:[H,Z,et,Y],styles:['@charset "UTF-8";.drawer-actions-wrapper[_ngcontent-%COMP%]{display:flex;align-items:center;justify-content:space-between;width:100%;gap:12px}.btn-print-drawer-primary[_ngcontent-%COMP%]{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#0284c7,#0369a1);color:#fff;border:none;padding:8px 18px;border-radius:8px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px #0284c740;transition:all .2s ease}.btn-print-drawer-primary[_ngcontent-%COMP%]:hover{background:linear-gradient(135deg,#0369a1,#075985);transform:translateY(-1px);box-shadow:0 4px 12px #0284c759}.doc-actions-bar[_ngcontent-%COMP%]{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--nb-border-soft)}.btn-print-action[_ngcontent-%COMP%]{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#0284c7,#0369a1);color:#fff;border:none;padding:9px 18px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px #0284c740;transition:all .2s ease}.btn-print-action[_ngcontent-%COMP%]:hover{background:linear-gradient(135deg,#0369a1,#075985);transform:translateY(-1px);box-shadow:0 4px 12px #0284c759}.status-pill[_ngcontent-%COMP%]{font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px}.status-pill.posted[_ngcontent-%COMP%]{background:#10b9811f;color:#059669;border:1px solid rgba(16,185,129,.3)}.status-pill.draft[_ngcontent-%COMP%]{background:#f59e0b1f;color:#d97706;border:1px solid rgba(245,158,11,.3)}.official-voucher-card[_ngcontent-%COMP%]{background:#fff;border:1px solid #cbd5e1;border-radius:12px;padding:24px;color:#0f172a;box-shadow:0 4px 16px #0000000a;position:relative}.voucher-header[_ngcontent-%COMP%]{display:flex;justify-content:space-between;align-items:center;gap:16px}.school-brand-meta[_ngcontent-%COMP%]   .school-name-ar[_ngcontent-%COMP%]{font-size:19px;font-weight:800;color:#0284c7;margin:0 0 2px}.school-brand-meta[_ngcontent-%COMP%]   .school-name-en[_ngcontent-%COMP%]{font-size:12px;font-weight:600;color:#64748b;margin:0 0 4px;letter-spacing:.5px}.school-brand-meta[_ngcontent-%COMP%]   .accreditation-line[_ngcontent-%COMP%]{font-size:11px;color:#475569;margin:0 0 2px}.school-brand-meta[_ngcontent-%COMP%]   .school-contact-line[_ngcontent-%COMP%]{font-size:11px;color:#64748b;margin:0}.school-logo-wrapper[_ngcontent-%COMP%]{max-width:140px;max-height:80px;min-width:60px;min-height:60px;border-radius:8px;border:1px solid #e2e8f0;padding:4px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}.school-logo-img[_ngcontent-%COMP%]{max-width:130px;max-height:72px;width:auto;height:auto;object-fit:contain}.school-logo-placeholder[_ngcontent-%COMP%]{font-size:32px}.luxury-divider[_ngcontent-%COMP%]{position:relative;height:2px;background:linear-gradient(90deg,transparent,#0284c7,transparent);margin:16px 0;text-align:center}.divider-diamond[_ngcontent-%COMP%]{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:0 8px;color:#0284c7;font-size:12px}.doc-banner[_ngcontent-%COMP%]{display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:10px 16px;margin-bottom:16px}.doc-title-box[_ngcontent-%COMP%]{display:flex;flex-direction:column}.doc-main-title[_ngcontent-%COMP%]{font-size:17px;font-weight:800;color:#0f172a;margin:0}.doc-sub-title[_ngcontent-%COMP%]{font-size:9.5px;color:#64748b;font-weight:700;letter-spacing:.5px}.doc-meta-row[_ngcontent-%COMP%]{display:flex;align-items:center;gap:12px}.meta-item-box[_ngcontent-%COMP%]{display:flex;align-items:center;gap:6px;background:#fff;padding:5px 12px;border-radius:6px;border:1px solid #cbd5e1}.meta-item-box[_ngcontent-%COMP%]   .lbl[_ngcontent-%COMP%]{font-size:11px;color:#64748b;font-weight:600}.meta-item-box[_ngcontent-%COMP%]   .val[_ngcontent-%COMP%]{font-size:12px;font-weight:800;color:#0f172a}.student-info-section[_ngcontent-%COMP%]{display:grid;grid-template-columns:repeat(2,1fr);gap:8px 16px;background:#fff;border:1px dashed #cbd5e1;border-radius:8px;padding:12px 16px;margin-bottom:16px}.info-cell[_ngcontent-%COMP%]{display:flex;align-items:center;gap:8px;font-size:12px}.info-cell[_ngcontent-%COMP%]   .c-label[_ngcontent-%COMP%]{color:#64748b;width:140px;flex-shrink:0}.info-cell[_ngcontent-%COMP%]   .c-val[_ngcontent-%COMP%]{color:#1e293b;font-weight:600}.info-cell[_ngcontent-%COMP%]   .c-val.strong[_ngcontent-%COMP%]{font-weight:800;color:#0284c7}.info-cell.balance-cell[_ngcontent-%COMP%]{background:#ef44440d;padding:6px 10px;border-radius:6px;border:1px dashed rgba(239,68,68,.25);grid-column:2}.remaining-val[_ngcontent-%COMP%]{font-size:13px;font-weight:800}.remaining-val.danger[_ngcontent-%COMP%]{color:#dc2626}.remaining-val.success[_ngcontent-%COMP%]{color:#059669}.breakdown-section[_ngcontent-%COMP%]{margin-bottom:14px}.section-heading[_ngcontent-%COMP%]{font-size:13px;font-weight:700;color:#1e293b;margin:0 0 8px}.voucher-table[_ngcontent-%COMP%]{width:100%;border-collapse:collapse;font-size:12px}.voucher-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%]{background:#f1f5f9;color:#475569;font-weight:700;padding:8px 12px;border:1px solid #cbd5e1;text-align:start}.voucher-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%]{padding:8px 12px;border:1px solid #cbd5e1;color:#1e293b}.voucher-table[_ngcontent-%COMP%]   .discount-row[_ngcontent-%COMP%]   td[_ngcontent-%COMP%]{color:#dc2626;background:#dc262608}.voucher-table[_ngcontent-%COMP%]   tfoot[_ngcontent-%COMP%]   .total-row[_ngcontent-%COMP%]   td[_ngcontent-%COMP%]{background:#f8fafc;border-top:2px solid #cbd5e1;font-weight:800}.total-label[_ngcontent-%COMP%]{font-size:13px;color:#0f172a}.total-amount[_ngcontent-%COMP%]{font-size:15px;color:#059669;font-weight:800}.voucher-table[_ngcontent-%COMP%]   tfoot[_ngcontent-%COMP%]   .remaining-row[_ngcontent-%COMP%]   td[_ngcontent-%COMP%]{background:#fef2f2b3;border-top:1px dashed #fca5a5;border-bottom:2px solid #ef4444;font-weight:800}.remaining-label[_ngcontent-%COMP%]{font-size:13px;color:#991b1b}.remaining-title[_ngcontent-%COMP%]{font-weight:800}.remaining-amount[_ngcontent-%COMP%]{font-size:16px;font-weight:800}.remaining-amount.has-due[_ngcontent-%COMP%]{color:#dc2626}.remaining-amount.cleared[_ngcontent-%COMP%]{color:#059669}.tafqeet-container[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}.tafqeet-box[_ngcontent-%COMP%]{background:#0284c70f;border:1px solid rgba(2,132,199,.2);border-radius:6px;padding:8px 14px;display:flex;align-items:center;gap:8px;font-size:12px}.tafqeet-title[_ngcontent-%COMP%]{font-weight:700;color:#0284c7;flex-shrink:0}.tafqeet-text[_ngcontent-%COMP%]{font-weight:700;color:#0f172a}.remaining-tafqeet-box[_ngcontent-%COMP%]{background:#fef2f2d9;border:1px solid rgba(239,68,68,.35)}.remaining-tafqeet-title[_ngcontent-%COMP%]{color:#dc2626;font-weight:800}.remaining-tafqeet-text[_ngcontent-%COMP%]{color:#991b1b;font-weight:700}.terms-box[_ngcontent-%COMP%]{font-size:11px;color:#64748b;margin-bottom:18px;line-height:1.5}.terms-box[_ngcontent-%COMP%]   p[_ngcontent-%COMP%]{margin:0}.signatures-section[_ngcontent-%COMP%]{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding-top:14px;border-top:1px solid #cbd5e1;margin-bottom:14px}.sig-box[_ngcontent-%COMP%]{display:flex;flex-direction:column;align-items:center;text-align:center}.sig-title[_ngcontent-%COMP%]{font-size:11px;font-weight:700;color:#475569;margin-bottom:8px}.sig-signer-name[_ngcontent-%COMP%]{font-size:11px;font-weight:800;color:#0f172a;margin-bottom:12px;background:#f1f5f9;padding:2px 8px;border-radius:4px;border:1px solid #e2e8f0}.sig-space[_ngcontent-%COMP%]{width:100%;border-bottom:1px dashed #cbd5e1;margin-bottom:4px}.sig-hint[_ngcontent-%COMP%]{font-size:10px;color:#94a3b8}.stamp-container[_ngcontent-%COMP%]{display:flex;align-items:center;justify-content:center;min-height:70px}.official-school-stamp-img[_ngcontent-%COMP%]{max-height:80px;max-width:110px;object-fit:contain;transform:rotate(-3deg)}.stamp-badge[_ngcontent-%COMP%]{width:80px;height:56px;border:1.5px dashed #0284c7;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:8px;color:#0284c7;font-weight:700;transform:rotate(-3deg);text-align:center;line-height:1.2;padding:4px}.voucher-footer-meta[_ngcontent-%COMP%]{display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:8px}.mono[_ngcontent-%COMP%]{font-family:monospace,sans-serif}.text-center[_ngcontent-%COMP%]{text-align:center}.text-end[_ngcontent-%COMP%]{text-align:end}@media print{@page{size:A4 portrait;margin:10mm 12mm}body[_ngcontent-%COMP%]   *[_ngcontent-%COMP%]{visibility:hidden!important}#official-print-voucher[_ngcontent-%COMP%], #official-print-voucher[_ngcontent-%COMP%]   *[_ngcontent-%COMP%]{visibility:visible!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}#official-print-voucher[_ngcontent-%COMP%]{position:fixed!important;top:0!important;left:0!important;right:0!important;width:100%!important;max-width:100%!important;margin:0!important;padding:16px 20px!important;border:1.5px solid #cbd5e1!important;box-shadow:none!important;background:#fff!important;z-index:999999!important;page-break-inside:avoid!important;break-inside:avoid!important}.doc-actions-bar[_ngcontent-%COMP%], [drawer-actions][_ngcontent-%COMP%], .no-print[_ngcontent-%COMP%]{display:none!important}}'],changeDetection:0})};export{nt as a};
