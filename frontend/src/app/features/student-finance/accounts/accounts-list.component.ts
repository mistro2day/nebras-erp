import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StudentFinanceService } from '../student-finance.service';
import { StudentsService } from '../../students/students.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbDrawerComponent } from '../../../shared/nebras/nb-drawer.component';
import { NbDatepickerComponent } from '../../../shared/nebras/nb-datepicker.component';
import { NbExportMenuComponent, ExportColumn } from '../../../shared/export';

/**
 * حسابات الطلاب المالية — عرض 360° لحساب الطالب.
 * يربط الطالب (وحدة الطلاب) بالمالية (قيود واستحقاق وسندات قبض) عبر لوح تفاصيل موحّد:
 * الأرصدة، الفواتير، التحصيلات، المستحقات، المنح، والحظر المالي — مع إجراءات فورية
 * (إصدار فاتورة، تحصيل دفعة، منح، فرض/رفع حظر) تُرحّل مباشرة في دفتر أستاذ المالية.
 */
@Component({
  selector: 'app-sf-accounts-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, DecimalPipe, NbPageHeaderComponent, NbPanelComponent,
    NbDrawerComponent, NbDatepickerComponent, NbExportMenuComponent,
  ],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="حسابات الطلاب المالية"
        subtitle="عرض 360° لكل طالب: الأرصدة والفواتير والتحصيلات والمنح والحظر — مربوطة مباشرة بدفتر أستاذ المالية.">
        <button class="btn ghost" (click)="goDashboard()">لوحة التحكم</button>
        <nb-export-menu [columns]="cols()" [rows]="filtered()" title="حسابات الطلاب المالية" filename="حسابات-الطلاب"></nb-export-menu>
        <button class="btn primary" (click)="toggleCreate()">{{ creating() ? 'إغلاق' : '＋ فتح حساب لطالب' }}</button>
      </nb-page-header>

      @if (!settingsReady() && settingsChecked()) {
        <div class="warn-banner">⚠︎ لم تُضبط الإعدادات المالية للطلاب (حساب المدينين والإيرادات). قد تتعذّر الفوترة والتحصيل حتى تُهيّأ الوحدة.</div>
      }

      @if (creating()) {
        <nb-panel title="فتح حساب فوترة لطالب" class="mb">
          <div class="grid3">
            <label>الطالب
              <select class="fld" [(ngModel)]="cf.student_id">
                <option value="">اختر الطالب…</option>
                @for (s of studentsWithoutAccount(); track s.id) {
                  <option [value]="s.id">{{ s.profile?.arabic_name || s.student_number }} — {{ s.student_number }}</option>
                }
              </select>
            </label>
            <label>رقم الحساب<input class="fld" [(ngModel)]="cf.account_number" placeholder="SF-2026-0001" /></label>
            <label>الرصيد الافتتاحي<input class="fld num" type="number" [(ngModel)]="cf.opening_balance" /></label>
          </div>
          <div class="form-actions">
            <button class="btn primary" [disabled]="createBusy() || !cf.student_id || !cf.account_number" (click)="createAccount()">
              {{ createBusy() ? 'جارٍ الفتح…' : 'فتح الحساب' }}
            </button>
          </div>
          @if (studentsWithoutAccount().length === 0 && studentsLoaded()) {
            <p class="hint">كل الطلاب المسجّلين لديهم حسابات فوترة بالفعل.</p>
          }
        </nb-panel>
      }

      <!-- مؤشرات سريعة -->
      <div class="kpis">
        <div class="kpi"><span class="l">إجمالي المديونية</span><span class="v danger">{{ totalOutstanding() | number:'1.2-2' }} <em>ر.س</em></span></div>
        <div class="kpi"><span class="l">الأرصدة الدائنة</span><span class="v success">{{ totalCredit() | number:'1.2-2' }} <em>ر.س</em></span></div>
        <div class="kpi"><span class="l">حسابات محظورة</span><span class="v warning">{{ blockedCount() }}</span></div>
        <div class="kpi"><span class="l">إجمالي الحسابات</span><span class="v">{{ rows().length }}</span></div>
      </div>

      <div class="filters">
        <input class="fld search" [(ngModel)]="search" placeholder="بحث بالاسم أو رقم الحساب أو رقم الطالب…" />
        <select class="fld" [(ngModel)]="statusFilter">
          <option value="">كل الحالات</option>
          <option value="outstanding">عليه مديونية</option>
          <option value="credit">رصيد دائن</option>
          <option value="hold">إيقاف مالي</option>
          <option value="clear">سليم</option>
        </select>
        <span class="count">{{ filtered().length }} حساب</span>
      </div>

      <nb-panel [flush]="true">
        <div class="table-wrap">
          <table class="nb-table">
            <thead><tr><th>الطالب</th><th>رقم الحساب</th><th class="end">الرصيد الحالي</th><th class="end">المستحق</th><th class="end">دائن</th><th>الحالة</th></tr></thead>
            <tbody>
              @if (loading()) { <tr><td colspan="6" class="empty">جارٍ تحميل الحسابات…</td></tr> }
              @for (a of filtered(); track a.id) {
                <tr class="clickable" (click)="openAccount(a)">
                  <td><strong>{{ studentName(a.student_id) }}</strong> <span class="nm">{{ studentNumber(a.student_id) }}</span></td>
                  <td class="mono">{{ a.account_number }}</td>
                  <td class="end mono">{{ a.current_balance | number:'1.2-2' }}</td>
                  <td class="end mono" [class.due]="+a.outstanding_balance > 0">{{ a.outstanding_balance | number:'1.2-2' }}</td>
                  <td class="end mono">{{ a.credit_balance | number:'1.2-2' }}</td>
                  <td>
                    @if (a.financial_hold) { <span class="badge warn">إيقاف مالي</span> }
                    @else if (+a.outstanding_balance > 0) { <span class="badge due">مديونية</span> }
                    @else { <span class="badge ok">سليم</span> }
                  </td>
                </tr>
              }
              @if (!loading() && !filtered().length) { <tr><td colspan="6" class="empty">لا توجد حسابات مطابقة.</td></tr> }
            </tbody>
          </table>
        </div>
      </nb-panel>

      <!-- لوح 360° لحساب الطالب -->
      <nb-drawer [open]="!!sel()" [width]="720"
        [title]="sel() ? studentName(sel().student_id) : ''"
        [subtitle]="sel() ? ('حساب ' + sel().account_number + ' • رقم الطالب ' + studentNumber(sel().student_id)) : ''"
        (closed)="sel.set(null)">
        @if (sel(); as a) {
          <!-- بطاقات الأرصدة -->
          <div class="bal-cards">
            <div class="bal"><span class="bl">الرصيد الحالي</span><span class="bv">{{ a.current_balance | number:'1.2-2' }}</span></div>
            <div class="bal due"><span class="bl">المستحق</span><span class="bv">{{ a.outstanding_balance | number:'1.2-2' }}</span></div>
            <div class="bal cr"><span class="bl">دائن</span><span class="bv">{{ a.credit_balance | number:'1.2-2' }}</span></div>
            <div class="bal"><span class="bl">الحالة</span><span class="bv sm">{{ a.financial_hold ? 'إيقاف مالي' : 'سليم' }}</span></div>
          </div>

          <!-- إجراءات سريعة -->
          <div class="quick">
            <button class="btn primary sm" [class.on]="pane()==='invoice'" (click)="setPane('invoice')">＋ إصدار فاتورة</button>
            <button class="btn primary sm" [class.on]="pane()==='pay'" (click)="setPane('pay')">💵 تحصيل دفعة</button>
            <button class="btn ghost sm" [class.on]="pane()==='scholarship'" (click)="setPane('scholarship')">🎓 منحة</button>
            <button class="btn ghost sm" [class.on]="pane()==='hold'" (click)="setPane('hold')">⛔ حظر مالي</button>
            <a class="btn ghost sm" (click)="openStudent(a.student_id)">👤 ملف الطالب</a>
          </div>

          <!-- نماذج الإجراءات -->
          @if (pane() === 'invoice') {
            <div class="action-box">
              <h4>إصدار فاتورة رسوم</h4>
              <div class="fee-list">
                @for (fs of feeStructures(); track fs.id) {
                  <label class="chk"><input type="checkbox" [checked]="picked.has(fs.id)" (change)="togglePick(fs.id)" /> {{ fs.name }} <span class="amt">{{ fs.amount | number:'1.0-0' }} ر.س</span></label>
                }
              </div>
              <div class="row2">
                <label>تاريخ الاستحقاق<nb-datepicker [value]="invForm.due_date" (valueChange)="invForm.due_date = $event"></nb-datepicker></label>
                <div class="tot">الإجمالي المختار: <strong>{{ pickedTotal() | number:'1.0-0' }} ر.س</strong></div>
              </div>
              <button class="btn primary" [disabled]="busy() || !picked.size || !invForm.due_date" (click)="issueInvoice(a)">{{ busy() ? 'جارٍ الإصدار…' : 'إصدار وترحيل الفاتورة' }}</button>
            </div>
          }
          @if (pane() === 'pay') {
            <div class="action-box">
              <h4>تحصيل دفعة</h4>
              <div class="grid3">
                <label>المبلغ<input class="fld num" type="number" [(ngModel)]="payForm.amount" /></label>
                <label>طريقة الدفع<select class="fld" [(ngModel)]="payForm.payment_method_id">@for (m of methods(); track m.id) { <option [value]="m.id">{{ m.name_ar }}</option> }</select></label>
                <label>الصندوق<select class="fld" [(ngModel)]="payForm.cash_box_id">@for (c of cashBoxes(); track c.id) { <option [value]="c.id">{{ c.name_ar }}</option> }</select></label>
              </div>
              <button class="btn primary" [disabled]="busy() || !(payForm.amount > 0) || !payForm.payment_method_id" (click)="receivePayment(a)">{{ busy() ? 'جارٍ التحصيل…' : 'تحصيل وتوليد سند قبض' }}</button>
            </div>
          }
          @if (pane() === 'scholarship') {
            <div class="action-box">
              <h4>إضافة منحة</h4>
              <div class="grid3">
                <label>اسم المنحة<input class="fld" [(ngModel)]="schForm.name" placeholder="منحة تفوق" /></label>
                <label>النوع<select class="fld" [(ngModel)]="schForm.type"><option value="merit">تفوق</option><option value="need">حاجة</option><option value="partial">جزئية</option><option value="full">كاملة</option></select></label>
                <label>النسبة %<input class="fld num" type="number" [(ngModel)]="schForm.amount_percentage" /></label>
              </div>
              <button class="btn primary" [disabled]="busy() || !schForm.name" (click)="applyScholarship(a)">{{ busy() ? 'جارٍ…' : 'اعتماد المنحة' }}</button>
            </div>
          }
          @if (pane() === 'hold') {
            <div class="action-box">
              <h4>فرض حظر مالي</h4>
              <div class="grid3">
                <label>نوع الحظر<select class="fld" [(ngModel)]="holdForm.hold_type">
                  <option value="exam">حجب الامتحانات</option><option value="registration">منع التسجيل</option>
                  <option value="certificate">منع الشهادات</option><option value="graduation">حظر التخرج</option><option value="custom">مخصص</option>
                </select></label>
                <label class="col2">السبب<input class="fld" [(ngModel)]="holdForm.reason" placeholder="سبب فرض الحظر" /></label>
              </div>
              <button class="btn danger" [disabled]="busy() || !holdForm.reason" (click)="applyHold(a)">{{ busy() ? 'جارٍ…' : 'فرض الحظر' }}</button>
            </div>
          }

          <!-- تبويبات القوائم الفرعية -->
          <div class="subtabs">
            <button class="stab" [class.on]="tab()==='invoices'" (click)="tab.set('invoices')">الفواتير ({{ invoices().length }})</button>
            <button class="stab" [class.on]="tab()==='receipts'" (click)="tab.set('receipts')">التحصيلات ({{ receipts().length }})</button>
            <button class="stab" [class.on]="tab()==='receivables'" (click)="tab.set('receivables')">المستحقات ({{ receivables().length }})</button>
            <button class="stab" [class.on]="tab()==='scholarships'" (click)="tab.set('scholarships')">المنح ({{ scholarships().length }})</button>
            <button class="stab" [class.on]="tab()==='holds'" (click)="tab.set('holds')">الحظر ({{ holds().length }})</button>
          </div>

          <div class="sub-list">
            @if (tab() === 'invoices') {
              @for (i of invoices(); track i.id) {
                <div class="sub-row clickable" (click)="openDoc('invoice', i)"><span><strong>{{ i.invoice_number }}</strong> <span class="nm">{{ i.issue_date }}</span></span>
                  <span class="mono">{{ i.total_amount | number:'1.0-0' }} ر.س</span>
                  <span class="mono due" [class.paid]="+i.outstanding_amount===0">متبقٍ {{ i.outstanding_amount | number:'1.0-0' }}</span>
                  <span class="badge" [class.ok]="i.status==='posted'">{{ i.status === 'posted' ? 'مرحلة' : i.status }}</span></div>
              } @empty { <div class="empty sm">لا توجد فواتير.</div> }
            }
            @if (tab() === 'receipts') {
              @for (r of receipts(); track r.id) {
                <div class="sub-row clickable" (click)="openDoc('receipt', r)"><span><strong>{{ r.receipt_number }}</strong> <span class="nm">{{ r.payment_date }}</span></span>
                  <span class="mono success">{{ r.amount | number:'1.0-0' }} ر.س</span>
                  <span class="badge ok">{{ r.status === 'posted' ? 'مرحل' : r.status }}</span></div>
              } @empty { <div class="empty sm">لا توجد تحصيلات.</div> }
            }
            @if (tab() === 'receivables') {
              @for (r of receivables(); track r.id) {
                <div class="sub-row clickable" (click)="openDoc('receivable', r)"><span>مستحق فاتورة</span>
                  <span class="mono">{{ r.amount | number:'1.0-0' }}</span>
                  <span class="mono due" [class.paid]="r.status==='paid'">متبقٍ {{ r.outstanding_amount | number:'1.0-0' }}</span>
                  <span class="badge" [class.ok]="r.status==='paid'" [class.due]="r.status==='outstanding'">{{ r.status === 'paid' ? 'مسدد' : 'مستحق' }}</span></div>
              } @empty { <div class="empty sm">لا توجد مستحقات.</div> }
            }
            @if (tab() === 'scholarships') {
              @for (s of scholarships(); track s.id) {
                <div class="sub-row"><span><strong>{{ s.name }}</strong></span>
                  <span>{{ s.amount_percentage > 0 ? s.amount_percentage + '%' : (s.fixed_amount | number:'1.0-0') + ' ر.س' }}</span>
                  <span class="badge" [class.ok]="s.status==='approved'">{{ s.status === 'approved' ? 'نشطة' : s.status }}</span></div>
              } @empty { <div class="empty sm">لا توجد منح.</div> }
            }
            @if (tab() === 'holds') {
              @for (h of holds(); track h.id) {
                <div class="sub-row"><span><strong>{{ holdLabel(h.hold_type) }}</strong> <span class="nm">{{ h.reason }}</span></span>
                  <span class="badge" [class.warn]="h.status==='active'" [class.ok]="h.status==='released'">{{ h.status === 'active' ? 'نشط' : 'مرفوع' }}</span>
                  @if (h.status === 'active') { <button class="btn ghost xs" (click)="releaseHold(a, h)">رفع</button> }</div>
              } @empty { <div class="empty sm">لا يوجد حظر.</div> }
            }
          </div>
        }
      </nb-drawer>

      <!-- لوح تفاصيل المستند (فاتورة / تحصيل / مستحق) -->
      <nb-drawer [open]="!!doc()" [width]="620" [title]="docMeta().title" [subtitle]="docMeta().subtitle" (closed)="doc.set(null)">
        @if (doc(); as d) {
          <!-- الحقول الرئيسية -->
          <div class="dl">
            @for (f of docFields(); track f.k) {
              <div class="dl-row" [class.total]="f.total"><span class="k">{{ f.k }}</span><span class="v" [class]="f.cls || ''">{{ f.v }}</span></div>
            }
          </div>

          <!-- بنود الفاتورة -->
          @if (d.type === 'invoice' && (d.data.items?.length)) {
            <h4 class="dh">بنود الفاتورة</h4>
            <div class="table-wrap">
              <table class="nb-table dlines">
                <thead><tr><th>البند</th><th class="end">المبلغ</th></tr></thead>
                <tbody>
                  @for (it of d.data.items; track it.id) {
                    <tr><td>{{ it.description || 'بند رسوم' }}</td><td class="end mono">{{ it.amount | number:'1.2-2' }}</td></tr>
                  }
                  @if (d.data.discounts?.length) {
                    @for (dc of d.data.discounts; track dc.id) {
                      <tr><td class="disc">{{ dc.discount_reason }}</td><td class="end mono disc">- {{ dc.amount | number:'1.2-2' }}</td></tr>
                    }
                  }
                  <tr class="sum"><td>الإجمالي</td><td class="end mono">{{ d.data.total_amount | number:'1.2-2' }} ر.س</td></tr>
                </tbody>
              </table>
            </div>
          }
        }
        <div drawer-actions>
          <nb-export-menu [columns]="docExportCols()" [rows]="docExportRows()" [title]="docMeta().title" [subtitle]="docMeta().subtitle" [filename]="docMeta().title"></nb-export-menu>
        </div>
      </nb-drawer>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .mb { margin-bottom: 16px; }
    .warn-banner { background: var(--nb-warning-bg); color: var(--nb-warning); border: 1px solid var(--nb-warning-border, #f0c36d); border-radius: var(--nb-radius); padding: 10px 14px; font-size: 12.5px; margin-bottom: 14px; }
    .fld { height: 34px; padding: 0 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; box-sizing: border-box; width: 100%; }
    .fld.num { text-align: end; } .fld.search { min-width: 280px; }
    .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 800px) { .grid3 { grid-template-columns: 1fr; } }
    label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--nb-text-muted); }
    label.col2 { grid-column: span 2; }
    .form-actions { display: flex; gap: 10px; margin-top: 12px; }
    .hint { font-size: 12px; color: var(--nb-text-muted); margin: 10px 0 0; }

    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; }
    @media (max-width: 720px) { .kpis { grid-template-columns: 1fr 1fr; } }
    .kpi { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
    .kpi .l { font-size: 12px; color: var(--nb-text-muted); }
    .kpi .v { font-size: 20px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .kpi .v em { font-size: 11px; font-weight: 500; font-style: normal; color: var(--nb-text-muted); }
    .kpi .v.danger { color: var(--nb-danger); } .kpi .v.success { color: var(--nb-success); } .kpi .v.warning { color: var(--nb-warning); }

    .filters { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
    .filters .count { margin-inline-start: auto; font-size: 12px; color: var(--nb-text-muted); }

    .table-wrap { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .nb-table th { text-align: start; font-weight: 700; font-size: 11px; color: var(--nb-text-muted); background: var(--nb-surface-raised); padding: 9px 12px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table th.end { text-align: end; }
    .nb-table td { padding: 9px 12px; border-bottom: 1px solid var(--nb-border-row); color: var(--nb-text); }
    .nb-table tr:last-child td { border-bottom: none; }
    .nb-table tbody tr.clickable { cursor: pointer; }
    .nb-table tbody tr:hover td { background: var(--nb-surface-raised); }
    .mono { font-variant-numeric: tabular-nums; } .end { text-align: end; }
    .mono.due { color: var(--nb-danger); font-weight: 600; }
    .nm { color: var(--nb-text-muted); font-size: 11px; margin-inline-start: 6px; }
    .empty { text-align: center; padding: 24px; color: var(--nb-text-muted); } .empty.sm { padding: 16px; font-size: 12.5px; }
    .badge { display: inline-flex; padding: 2px 8px; font-size: 11px; font-weight: 700; border-radius: var(--nb-radius-sm); }
    .badge.ok { background: var(--nb-success-bg); color: var(--nb-success); }
    .badge.due { background: var(--nb-danger-bg); color: var(--nb-danger); }
    .badge.warn { background: var(--nb-warning-bg); color: var(--nb-warning); }

    /* الدرج 360 */
    .bal-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
    .bal { border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius); padding: 10px 12px; background: var(--nb-surface-raised); display: flex; flex-direction: column; gap: 4px; }
    .bal.due { border-top: 3px solid var(--nb-danger); } .bal.cr { border-top: 3px solid var(--nb-success); }
    .bl { font-size: 11px; color: var(--nb-text-muted); }
    .bv { font-size: 18px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; } .bv.sm { font-size: 14px; }
    .quick { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
    .action-box { border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 14px; margin-bottom: 16px; background: var(--nb-surface-raised); }
    .action-box h4 { margin: 0 0 10px; font-size: 13px; font-weight: 700; color: var(--nb-text); }
    .fee-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .chk { flex-direction: row; align-items: center; gap: 8px; font-size: 13px; color: var(--nb-text); }
    .chk .amt { margin-inline-start: auto; color: var(--nb-text-muted); font-variant-numeric: tabular-nums; }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: end; margin-bottom: 12px; }
    .tot { font-size: 13px; color: var(--nb-text); align-self: center; }

    .subtabs { display: flex; gap: 6px; flex-wrap: wrap; border-bottom: 1px solid var(--nb-border-soft); margin-bottom: 10px; }
    .stab { background: transparent; border: none; border-bottom: 2px solid transparent; padding: 8px 10px; font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--nb-text-muted); cursor: pointer; }
    .stab.on { color: var(--nb-primary-700); border-bottom-color: var(--nb-primary-600); }
    .sub-list { display: flex; flex-direction: column; }
    .sub-row { display: flex; align-items: center; gap: 12px; padding: 9px 4px; border-bottom: 1px solid var(--nb-border-soft); font-size: 13px; }
    .sub-row > span:first-child { flex: 1; }
    .sub-row .success { color: var(--nb-success); } .sub-row .due { color: var(--nb-danger); } .sub-row .due.paid { color: var(--nb-success); }
    .sub-row.clickable { cursor: pointer; } .sub-row.clickable:hover { background: var(--nb-surface-raised); }

    /* تفاصيل المستند */
    .dl { display: flex; flex-direction: column; margin-bottom: 8px; }
    .dl-row { display: flex; justify-content: space-between; gap: 16px; padding: 10px 2px; border-bottom: 1px solid var(--nb-border-soft); font-size: 13px; }
    .dl-row .k { color: var(--nb-text-muted); }
    .dl-row .v { color: var(--nb-text); font-weight: 700; text-align: end; }
    .dl-row .v.success { color: var(--nb-success); } .dl-row .v.danger { color: var(--nb-danger); }
    .dl-row.total { border-bottom: none; border-top: 2px solid var(--nb-border); margin-top: 4px; }
    .dl-row.total .v { font-size: 16px; }
    .dh { font-size: 13px; font-weight: 700; color: var(--nb-text); margin: 14px 0 10px; }
    .dlines .sum td { border-top: 2px solid var(--nb-border); font-weight: 700; background: var(--nb-surface-raised); }
    .dlines .disc { color: var(--nb-danger); }

    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 4px; }
    .btn.sm { height: 30px; padding: 0 10px; font-size: 12px; } .btn.xs { height: 26px; padding: 0 8px; font-size: 11px; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; } .btn.primary:hover:not(:disabled) { background: var(--nb-primary-700); }
    .btn.primary.on, .btn.ghost.on { outline: 2px solid var(--nb-primary-400); }
    .btn.danger { background: var(--nb-danger); color: #fff; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn:disabled { opacity: .55; cursor: not-allowed; }
  `],
})
export class SfAccountsListComponent implements OnInit {
  private svc = inject(StudentFinanceService);
  private studentsSvc = inject(StudentsService);
  private notify = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  loading = signal(false);
  rows = signal<any[]>([]);
  studentsMap = signal<Map<string, any>>(new Map());
  allStudents = signal<any[]>([]);
  studentsLoaded = signal(false);
  settingsReady = signal(false);
  settingsChecked = signal(false);

  methods = signal<any[]>([]);
  cashBoxes = signal<any[]>([]);
  feeStructures = signal<any[]>([]);

  // درج الحساب
  sel = signal<any | null>(null);
  pane = signal<'' | 'invoice' | 'pay' | 'scholarship' | 'hold'>('');
  tab = signal<'invoices' | 'receipts' | 'receivables' | 'scholarships' | 'holds'>('invoices');
  busy = signal(false);
  invoices = signal<any[]>([]);
  receipts = signal<any[]>([]);
  receivables = signal<any[]>([]);
  scholarships = signal<any[]>([]);
  holds = signal<any[]>([]);
  doc = signal<{ type: 'invoice' | 'receipt' | 'receivable'; data: any } | null>(null);

  creating = signal(false);
  createBusy = signal(false);
  cf = { student_id: '', account_number: '', opening_balance: 0 };

  picked = new Set<string>();
  invForm = { due_date: '' };
  payForm: any = { amount: 0, payment_method_id: '', cash_box_id: '' };
  schForm: any = { name: '', type: 'merit', amount_percentage: 25 };
  holdForm: any = { hold_type: 'exam', reason: '' };

  search = '';
  statusFilter = '';

  filtered = computed(() => {
    const q = this.search.trim().toLowerCase();
    return this.rows().filter((a) => {
      const nm = (this.studentName(a.student_id) + ' ' + this.studentNumber(a.student_id) + ' ' + a.account_number).toLowerCase();
      if (q && !nm.includes(q)) return false;
      switch (this.statusFilter) {
        case 'outstanding': return +a.outstanding_balance > 0;
        case 'credit': return +a.credit_balance > 0;
        case 'hold': return !!a.financial_hold;
        case 'clear': return !a.financial_hold && +a.outstanding_balance === 0;
        default: return true;
      }
    });
  });
  totalOutstanding = computed(() => this.rows().reduce((s, a) => s + (+a.outstanding_balance || 0), 0));
  totalCredit = computed(() => this.rows().reduce((s, a) => s + (+a.credit_balance || 0), 0));
  blockedCount = computed(() => this.rows().filter((a) => a.financial_hold).length);
  studentsWithoutAccount = computed(() => {
    const linked = new Set(this.rows().map((a) => a.student_id));
    return this.allStudents().filter((s) => !linked.has(s.id));
  });
  pickedTotal = computed(() => this.feeStructures().filter((f) => this.picked.has(f.id)).reduce((s, f) => s + (+f.amount || 0), 0));

  ngOnInit() {
    const q = this.route.snapshot.queryParamMap.get('q');
    if (q) this.search = q;
    this.loadStudents();
    this.reload();
    this.svc.listPaymentMethods().subscribe((r) => this.methods.set(r?.data ?? []));
    this.svc.listCashBoxes().subscribe((r) => this.cashBoxes.set(r?.data ?? []));
    this.svc.listFeeStructures().subscribe((r) => this.feeStructures.set((r?.data ?? []).filter((f: any) => f.is_active)));
    this.svc.getSettings().subscribe({
      next: (r) => { this.settingsReady.set((r?.data ?? []).length > 0); this.settingsChecked.set(true); },
      error: () => this.settingsChecked.set(true),
    });
  }

  loadStudents() {
    this.studentsSvc.getStudents({ page_size: 500 }).subscribe({
      next: (res: any) => {
        const list = res?.data ?? [];
        this.allStudents.set(list);
        const m = new Map<string, any>();
        list.forEach((s: any) => m.set(s.id, s));
        this.studentsMap.set(m);
        this.studentsLoaded.set(true);
      },
    });
  }

  reload() {
    this.loading.set(true);
    this.svc.listBillingAccounts({ page_size: 200, ordering: '-outstanding_balance' }).subscribe({
      next: (res) => { this.rows.set(res?.data ?? []); this.loading.set(false); },
      error: () => { this.rows.set([]); this.loading.set(false); },
    });
  }

  studentName(id: string): string { const s = this.studentsMap().get(id); return s?.profile?.arabic_name || 'طالب'; }
  studentNumber(id: string): string { return this.studentsMap().get(id)?.student_number || ''; }

  cols(): ExportColumn[] {
    return [
      { key: 'student', label: 'الطالب', map: (a) => this.studentName(a.student_id) },
      { key: 'number', label: 'رقم الطالب', map: (a) => this.studentNumber(a.student_id) },
      { key: 'account_number', label: 'رقم الحساب' },
      { key: 'current_balance', label: 'الرصيد الحالي', align: 'end' },
      { key: 'outstanding_balance', label: 'المستحق', align: 'end' },
      { key: 'credit_balance', label: 'دائن', align: 'end' },
      { key: 'financial_hold', label: 'الحالة', map: (a) => (a.financial_hold ? 'إيقاف مالي' : 'سليم') },
    ];
  }

  // ---- إنشاء الحساب ----
  toggleCreate() {
    this.creating.update((v) => !v);
    if (this.creating()) this.cf.account_number = `SF-${new Date().getFullYear()}-${String(this.rows().length + 1).padStart(4, '0')}`;
  }
  createAccount() {
    this.createBusy.set(true);
    this.svc.createBillingAccount({ ...this.cf }).subscribe({
      next: (res: any) => {
        this.createBusy.set(false); this.creating.set(false);
        this.notify.success(res?.message || 'تم فتح حساب الفوترة بنجاح.');
        this.cf = { student_id: '', account_number: '', opening_balance: 0 };
        this.reload();
      },
      error: (e) => { this.createBusy.set(false); this.notify.error(e?.error?.message || 'تعذّر فتح الحساب (تحقق من تفرّد رقم الحساب).'); },
    });
  }

  // ---- درج الحساب ----
  openAccount(a: any) {
    this.sel.set(a); this.pane.set(''); this.tab.set('invoices');
    this.payForm = { amount: 0, payment_method_id: this.methods()[0]?.id || '', cash_box_id: this.cashBoxes()[0]?.id || '' };
    this.invForm = { due_date: '' }; this.picked = new Set();
    this.loadAccountBundle(a.id);
  }
  loadAccountBundle(id: string) {
    this.svc.invoicesForAccount(id).subscribe((r) => this.invoices.set(r?.data ?? []));
    this.svc.receiptsForAccount(id).subscribe((r) => this.receipts.set(r?.data ?? []));
    this.svc.receivablesForAccount(id).subscribe((r) => this.receivables.set(r?.data ?? []));
    this.svc.scholarshipsForAccount(id).subscribe((r) => this.scholarships.set(r?.data ?? []));
    this.svc.holdsForAccount(id).subscribe((r) => this.holds.set(r?.data ?? []));
  }
  setPane(p: any) { this.pane.set(this.pane() === p ? '' : p); }
  togglePick(id: string) { this.picked.has(id) ? this.picked.delete(id) : this.picked.add(id); }

  // ---- تفاصيل المستند (فاتورة/تحصيل/مستحق) ----
  openDoc(type: 'invoice' | 'receipt' | 'receivable', data: any) { this.doc.set({ type, data }); }
  methodName(id: string) { return this.methods().find((m) => m.id === id)?.name_ar || '—'; }
  private money(v: any) { return (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ر.س'; }

  docMeta(): { title: string; subtitle: string } {
    const d = this.doc();
    if (!d) return { title: '', subtitle: '' };
    const who = this.sel() ? this.studentName(this.sel().student_id) : '';
    if (d.type === 'invoice') return { title: `فاتورة ${d.data.invoice_number}`, subtitle: who };
    if (d.type === 'receipt') return { title: `سند قبض ${d.data.receipt_number}`, subtitle: who };
    return { title: 'مستحق فاتورة', subtitle: who };
  }
  docFields(): { k: string; v: string; cls?: string; total?: boolean }[] {
    const d = this.doc();
    if (!d) return [];
    const x = d.data;
    if (d.type === 'invoice') {
      return [
        { k: 'رقم الفاتورة', v: x.invoice_number },
        { k: 'تاريخ الإصدار', v: x.issue_date },
        { k: 'تاريخ الاستحقاق', v: x.due_date },
        { k: 'الحالة', v: x.status === 'posted' ? 'مرحلة ومسجلة' : x.status },
        { k: 'المدفوع', v: this.money(x.paid_amount), cls: 'success' },
        { k: 'المتبقّي', v: this.money(x.outstanding_amount), cls: 'danger' },
        { k: 'قيد المالية', v: x.journal_entry_id ? 'مُرحّل في دفتر الأستاذ ✓' : '—' },
        { k: 'الإجمالي', v: this.money(x.total_amount), total: true },
      ];
    }
    if (d.type === 'receipt') {
      return [
        { k: 'رقم الإيصال', v: x.receipt_number },
        { k: 'تاريخ الدفع', v: x.payment_date },
        { k: 'طريقة الدفع', v: this.methodName(x.payment_method_id) },
        { k: 'الحالة', v: x.status === 'posted' ? 'مرحل ومقفل بالصندوق' : x.status },
        { k: 'سند المالية', v: x.voucher_id ? 'سند قبض مُرحّل ✓' : '—' },
        { k: 'المبلغ المحصّل', v: this.money(x.amount), total: true, cls: 'success' },
      ];
    }
    return [
      { k: 'الحالة', v: x.status === 'paid' ? 'مسدد بالكامل' : 'مستحق' },
      { k: 'المدفوع', v: this.money(x.paid_amount), cls: 'success' },
      { k: 'المتبقّي', v: this.money(x.outstanding_amount), cls: 'danger' },
      { k: 'أصل المستحق', v: this.money(x.amount), total: true },
    ];
  }
  docExportCols(): ExportColumn[] {
    if (this.doc()?.type === 'invoice') return [{ key: 'description', label: 'البند' }, { key: 'amount', label: 'المبلغ', align: 'end' }];
    return [{ key: 'k', label: 'البيان' }, { key: 'v', label: 'القيمة', align: 'end' }];
  }
  docExportRows(): any[] {
    const d = this.doc();
    if (!d) return [];
    if (d.type === 'invoice') {
      const rows = (d.data.items || []).map((i: any) => ({ description: i.description || 'بند رسوم', amount: Number(i.amount).toFixed(2) }));
      (d.data.discounts || []).forEach((dc: any) => rows.push({ description: dc.discount_reason, amount: '-' + Number(dc.amount).toFixed(2) }));
      rows.push({ description: 'الإجمالي', amount: Number(d.data.total_amount).toFixed(2) });
      return rows;
    }
    return this.docFields().map((f) => ({ k: f.k, v: f.v }));
  }

  private refreshAfter(a: any) {
    this.loadAccountBundle(a.id);
    this.svc.listBillingAccounts({ page_size: 200 }).subscribe((res) => {
      this.rows.set(res?.data ?? []);
      const updated = (res?.data ?? []).find((x: any) => x.id === a.id);
      if (updated) this.sel.set(updated);
    });
  }

  issueInvoice(a: any) {
    this.busy.set(true);
    this.svc.generateStudentInvoice({ billing_account_id: a.id, fee_structure_ids: Array.from(this.picked), due_date: this.invForm.due_date }).subscribe({
      next: () => { this.busy.set(false); this.notify.success('تم إصدار الفاتورة وترحيل قيد الاستحقاق في المالية.'); this.pane.set(''); this.picked = new Set(); this.refreshAfter(a); },
      error: (e) => { this.busy.set(false); this.notify.error(e?.error?.error || e?.error?.message || 'تعذّر إصدار الفاتورة.'); },
    });
  }
  receivePayment(a: any) {
    this.busy.set(true);
    this.svc.receiveStudentPayment({ billing_account_id: a.id, amount: +this.payForm.amount, payment_method_id: this.payForm.payment_method_id, cash_box_id: this.payForm.cash_box_id || undefined }).subscribe({
      next: () => { this.busy.set(false); this.notify.success('تم التحصيل وتوليد سند القبض في المالية.'); this.pane.set(''); this.refreshAfter(a); },
      error: (e) => { this.busy.set(false); this.notify.error(e?.error?.error || e?.error?.message || 'تعذّر التحصيل.'); },
    });
  }
  applyScholarship(a: any) {
    this.busy.set(true);
    this.svc.applyScholarshipApi({ billing_account_id: a.id, name: this.schForm.name, type: this.schForm.type, amount_percentage: +this.schForm.amount_percentage || 0, start_date: new Date().toISOString().slice(0, 10) }).subscribe({
      next: () => { this.busy.set(false); this.notify.success('تم اعتماد المنحة.'); this.pane.set(''); this.tab.set('scholarships'); this.refreshAfter(a); },
      error: (e) => { this.busy.set(false); this.notify.error(e?.error?.message || 'تعذّر اعتماد المنحة.'); },
    });
  }
  applyHold(a: any) {
    this.busy.set(true);
    this.svc.applyHoldApi({ billing_account_id: a.id, hold_type: this.holdForm.hold_type, reason: this.holdForm.reason }).subscribe({
      next: () => { this.busy.set(false); this.notify.success('تم فرض الحظر المالي.'); this.pane.set(''); this.tab.set('holds'); this.refreshAfter(a); },
      error: (e) => { this.busy.set(false); this.notify.error(e?.error?.message || 'تعذّر فرض الحظر.'); },
    });
  }
  releaseHold(a: any, h: any) {
    this.svc.releaseHold(h.id).subscribe({
      next: () => { this.notify.success('تم رفع الحظر المالي.'); this.refreshAfter(a); },
      error: (e) => this.notify.error(e?.error?.message || 'تعذّر رفع الحظر.'),
    });
  }
  openStudent(studentId: string) { this.router.navigate(['/students', studentId]); }
  goDashboard() { this.router.navigateByUrl('/student-finance/dashboard'); }
  holdLabel(t: string) { return ({ exam: 'حجب الامتحانات', registration: 'منع التسجيل', certificate: 'منع الشهادات', graduation: 'حظر التخرج', library: 'حظر المكتبة', custom: 'مخصص' } as any)[t] || t; }
}
