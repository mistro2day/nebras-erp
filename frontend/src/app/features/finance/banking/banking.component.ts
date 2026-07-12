import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FinanceService } from '../finance.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbExportMenuComponent, ExportColumn } from '../../../shared/export';

/**
 * البنوك والصناديق (Cash & Bank) — إدارة البنوك، الحسابات البنكية، والخزائن النقدية،
 * على غرار Bank & Cash في Odoo و Cash and bank management في D365 Finance.
 */
@Component({
  selector: 'app-banking',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent, NbExportMenuComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="البنوك والصناديق النقدية" subtitle="إدارة المصارف، الحسابات البنكية، والخزائن النقدية المرتبطة بالحسابات المحاسبية.">
        <button class="btn ghost" (click)="back()">رجوع لمساحة العمل</button>
        <nb-export-menu [columns]="expCols()" [rows]="expRows()" [title]="expTitle()" filename="بنوك-وصناديق"></nb-export-menu>
      </nb-page-header>

      <div class="statusbar">
        <button class="seg" [class.active]="tab()==='banks'" (click)="tab.set('banks')">المصارف</button>
        <button class="seg" [class.active]="tab()==='accounts'" (click)="tab.set('accounts')">الحسابات البنكية</button>
        <button class="seg" [class.active]="tab()==='cash'" (click)="tab.set('cash')">الخزائن النقدية</button>
      </div>

      <!-- المصارف -->
      @if (tab() === 'banks') {
        <nb-panel title="إضافة مصرف" class="mb">
          <div class="grid4">
            <label>الاسم العربي<input class="fld" [(ngModel)]="bank.name_ar" /></label>
            <label>الاسم الإنجليزي<input class="fld" [(ngModel)]="bank.name_en" /></label>
            <label>الرمز<input class="fld" [(ngModel)]="bank.code" /></label>
            <label>سويفت (SWIFT)<input class="fld" [(ngModel)]="bank.swift_code" /></label>
          </div>
          <div class="form-actions"><button class="btn primary" (click)="saveBank()">حفظ المصرف</button></div>
        </nb-panel>
        <nb-panel [flush]="true"><div class="table-wrap"><table class="nb-table">
          <thead><tr><th>الرمز</th><th>الاسم</th><th>SWIFT</th></tr></thead>
          <tbody>
            @for (b of banks(); track b.id) { <tr><td><strong>{{ b.code }}</strong></td><td>{{ b.name_ar }} <span class="nm">{{ b.name_en }}</span></td><td class="mono">{{ b.swift_code }}</td></tr> }
            @if (!banks().length) { <tr><td colspan="3" class="empty">لا توجد مصارف مسجلة.</td></tr> }
          </tbody></table></div></nb-panel>
      }

      <!-- الحسابات البنكية -->
      @if (tab() === 'accounts') {
        <nb-panel title="إضافة حساب بنكي" class="mb">
          <div class="grid4">
            <label>المصرف<select class="fld" [(ngModel)]="acc.bank"><option value="">اختر…</option>@for (b of banks(); track b.id) { <option [value]="b.id">{{ b.name_ar }}</option> }</select></label>
            <label>رقم الحساب<input class="fld" [(ngModel)]="acc.account_number" /></label>
            <label>الآيبان (IBAN)<input class="fld" [(ngModel)]="acc.iban" /></label>
            <label>العملة<select class="fld" [(ngModel)]="acc.currency">@for (c of currencies(); track c.id) { <option [value]="c.id">{{ c.code }}</option> }</select></label>
            <label>حساب الأستاذ (GL)<select class="fld" [(ngModel)]="acc.gl_account"><option value="">اختر…</option>@for (a of accounts(); track a.id) { <option [value]="a.id">{{ a.code }} - {{ a.name_ar }}</option> }</select></label>
          </div>
          <div class="form-actions"><button class="btn primary" (click)="saveAccount()">حفظ الحساب</button></div>
        </nb-panel>
        <nb-panel [flush]="true"><div class="table-wrap"><table class="nb-table">
          <thead><tr><th>المصرف</th><th>رقم الحساب</th><th>الآيبان</th><th>الحالة</th></tr></thead>
          <tbody>
            @for (a of bankAccounts(); track a.id) { <tr><td><strong>{{ a.bank_name }}</strong></td><td class="mono">{{ a.account_number }}</td><td class="mono">{{ a.iban }}</td><td><span class="badge ok">{{ a.status === 'active' ? 'نشط' : 'غير نشط' }}</span></td></tr> }
            @if (!bankAccounts().length) { <tr><td colspan="4" class="empty">لا توجد حسابات بنكية.</td></tr> }
          </tbody></table></div></nb-panel>
      }

      <!-- الخزائن النقدية -->
      @if (tab() === 'cash') {
        <nb-panel title="إضافة خزينة نقدية" class="mb">
          <div class="grid4">
            <label>الاسم العربي<input class="fld" [(ngModel)]="box.name_ar" /></label>
            <label>الاسم الإنجليزي<input class="fld" [(ngModel)]="box.name_en" /></label>
            <label>العملة<select class="fld" [(ngModel)]="box.currency">@for (c of currencies(); track c.id) { <option [value]="c.id">{{ c.code }}</option> }</select></label>
            <label>حساب الأستاذ (GL)<select class="fld" [(ngModel)]="box.gl_account"><option value="">اختر…</option>@for (a of accounts(); track a.id) { <option [value]="a.id">{{ a.code }} - {{ a.name_ar }}</option> }</select></label>
          </div>
          <div class="form-actions"><button class="btn primary" (click)="saveBox()">حفظ الخزينة</button></div>
        </nb-panel>
        <nb-panel [flush]="true"><div class="table-wrap"><table class="nb-table">
          <thead><tr><th>الاسم</th><th>العملة</th><th>الحالة</th></tr></thead>
          <tbody>
            @for (cb of cashBoxes(); track cb.id) { <tr><td><strong>{{ cb.name_ar }}</strong> <span class="nm">{{ cb.name_en }}</span></td><td>{{ currCode(cb.currency) }}</td><td><span class="badge ok">{{ cb.status === 'active' ? 'نشطة' : 'غير نشطة' }}</span></td></tr> }
            @if (!cashBoxes().length) { <tr><td colspan="3" class="empty">لا توجد خزائن نقدية.</td></tr> }
          </tbody></table></div></nb-panel>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-background); font-family: var(--nb-font-family); }
    .mb { margin-bottom: 16px; }
    .statusbar { display: flex; gap: 6px; margin-bottom: 14px; flex-wrap: wrap; }
    .seg { height: 32px; padding: 0 14px; border: 1px solid var(--nb-border); background: var(--nb-surface);
      color: var(--nb-text-secondary); border-radius: var(--nb-radius); font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; }
    .seg.active { background: var(--nb-primary-600); border-color: var(--nb-primary-600); color: #fff; }
    .fld { height: 34px; padding: 0 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; box-sizing: border-box; width: 100%; }
    .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    @media (max-width: 900px) { .grid4 { grid-template-columns: 1fr 1fr; } }
    label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--nb-text-muted); }
    .form-actions { display: flex; gap: 10px; margin-top: 14px; }

    .table-wrap { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .nb-table th { text-align: start; font-weight: 700; font-size: 11px; color: var(--nb-text-muted);
      background: var(--nb-surface-raised); padding: 9px 12px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table td { padding: 9px 12px; border-bottom: 1px solid var(--nb-border-row); color: var(--nb-text); }
    .nb-table tr:last-child td { border-bottom: none; }
    .nb-table tbody tr:hover td { background: var(--nb-surface-raised); }
    .mono { font-variant-numeric: tabular-nums; }
    .nm { color: var(--nb-text-muted); font-size: 12px; margin-inline-start: 6px; }
    .empty { text-align: center; padding: 26px; color: var(--nb-text-muted); }
    .badge { display: inline-flex; padding: 2px 8px; font-size: 11px; font-weight: 700; border-radius: var(--nb-radius-sm); }
    .badge.ok { background: var(--nb-success-bg); color: var(--nb-success); }

    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.primary:hover { background: var(--nb-primary-700); }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
  `],
})
export class BankingComponent implements OnInit {
  private service = inject(FinanceService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  tab = signal<'banks' | 'accounts' | 'cash'>('banks');
  banks = signal<any[]>([]);
  bankAccounts = signal<any[]>([]);
  cashBoxes = signal<any[]>([]);
  currencies = signal<any[]>([]);
  accounts = signal<any[]>([]);

  bank: any = { name_ar: '', name_en: '', code: '', swift_code: '' };
  acc: any = { bank: '', account_number: '', iban: '', currency: '', gl_account: '' };
  box: any = { name_ar: '', name_en: '', currency: '', gl_account: '', custodian_id: '00000000-0000-0000-0000-000000000000' };

  ngOnInit() {
    this.service.getCurrencies({ status: 'active' }).subscribe((r) => { if (r?.success) this.currencies.set(r.data); });
    this.service.getCOA({ status: 'active' }).subscribe((r) => { if (r?.success) this.accounts.set(r.data); });
    this.loadAll();
  }
  loadAll() {
    this.service.getBanks().subscribe((r) => { if (r?.success) this.banks.set(r.data); });
    this.service.getBankAccounts().subscribe((r) => { if (r?.success) this.bankAccounts.set(r.data); });
    this.service.getCashBoxes().subscribe((r) => { if (r?.success) this.cashBoxes.set(r.data); });
  }
  currCode(id: string) { return this.currencies().find((c) => c.id === id)?.code || '—'; }

  private handle(obs: any, okMsg: string, reset: () => void) {
    obs.subscribe({
      next: (r: any) => { if (r?.success) { this.notify.success(okMsg); reset(); this.loadAll(); } else this.notify.error(r?.message || 'تعذر الحفظ.'); },
      error: (e: any) => this.notify.error(e?.error?.message || 'حدث خطأ أثناء الاتصال بالخادم. تأكد من صحة البيانات.'),
    });
  }
  saveBank() {
    if (!this.bank.name_ar || !this.bank.code) { this.notify.error('يرجى إدخال اسم المصرف ورمزه.'); return; }
    this.handle(this.service.createBank(this.bank), 'تم حفظ المصرف.', () => (this.bank = { name_ar: '', name_en: '', code: '', swift_code: '' }));
  }
  saveAccount() {
    if (!this.acc.bank || !this.acc.account_number || !this.acc.gl_account) { this.notify.error('يرجى إدخال المصرف ورقم الحساب وحساب الأستاذ.'); return; }
    this.handle(this.service.createBankAccount(this.acc), 'تم حفظ الحساب البنكي.', () => (this.acc = { bank: '', account_number: '', iban: '', currency: '', gl_account: '' }));
  }
  saveBox() {
    if (!this.box.name_ar || !this.box.gl_account) { this.notify.error('يرجى إدخال اسم الخزينة وحساب الأستاذ.'); return; }
    this.handle(this.service.createCashBox(this.box), 'تم حفظ الخزينة.', () => (this.box = { name_ar: '', name_en: '', currency: '', gl_account: '', custodian_id: '00000000-0000-0000-0000-000000000000' }));
  }

  expTitle(): string { return this.tab() === 'banks' ? 'المصارف' : this.tab() === 'accounts' ? 'الحسابات البنكية' : 'الخزائن النقدية'; }
  expCols(): ExportColumn[] {
    if (this.tab() === 'banks') return [{ key: 'code', label: 'الرمز' }, { key: 'name_ar', label: 'الاسم' }, { key: 'swift_code', label: 'SWIFT' }];
    if (this.tab() === 'accounts') return [{ key: 'bank_name', label: 'المصرف' }, { key: 'account_number', label: 'رقم الحساب' }, { key: 'iban', label: 'IBAN' }];
    return [{ key: 'name_ar', label: 'الاسم' }, { key: 'currency', label: 'العملة', map: (r: any) => this.currCode(r.currency) }];
  }
  expRows(): any[] { return this.tab() === 'banks' ? this.banks() : this.tab() === 'accounts' ? this.bankAccounts() : this.cashBoxes(); }
  back() { this.router.navigateByUrl('/finance/dashboard'); }
}
