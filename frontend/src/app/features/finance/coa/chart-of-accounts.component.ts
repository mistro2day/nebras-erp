import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FinanceService } from '../finance.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbExportMenuComponent, ExportColumn } from '../../../shared/export';

interface Account {
  id: string; code: string; name_ar: string; name_en: string;
  account_type: string; parent: string | null; normal_balance: 'debit' | 'credit';
  status: 'active' | 'inactive'; is_control_account: boolean;
}

/**
 * شجرة الحسابات (Chart of Accounts) — على غرار دليل الحسابات في Odoo و D365 Finance.
 */
@Component({
  selector: 'app-chart-of-accounts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent, NbExportMenuComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="شجرة الحسابات" subtitle="دليل الحسابات المعتمد: الأصول، الخصوم، حقوق الملكية، الإيرادات، والمصروفات.">
        <button class="btn ghost" (click)="back()">رجوع لمساحة العمل</button>
        <nb-export-menu [columns]="cols()" [rows]="filtered()" title="شجرة الحسابات" subtitle="دليل الحسابات المعتمد" filename="شجرة-الحسابات"></nb-export-menu>
        <button class="btn primary" (click)="showForm.set(!showForm())">＋ حساب جديد</button>
      </nb-page-header>

      <!-- شريط الفلاتر -->
      <div class="filters">
        <input class="fld search" placeholder="بحث بالرمز أو الاسم…" [(ngModel)]="search" (ngModelChange)="apply()" />
        <select class="fld" [(ngModel)]="typeFilter" (ngModelChange)="apply()">
          <option value="">كل الأنواع</option>
          @for (t of types(); track t.id) { <option [value]="t.id">{{ t.name_ar }}</option> }
        </select>
        <select class="fld" [(ngModel)]="statusFilter" (ngModelChange)="apply()">
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
        </select>
        <span class="count">{{ filtered().length }} حساب</span>
      </div>

      @if (showForm()) {
        <nb-panel title="إضافة حساب جديد للشجرة" class="mb">
          <div class="grid">
            <label>رمز الحساب<input class="fld" [(ngModel)]="form.code" placeholder="مثال: 1102" /></label>
            <label>الاسم العربي<input class="fld" [(ngModel)]="form.name_ar" placeholder="بنك الراجحي" /></label>
            <label>الاسم الإنجليزي<input class="fld" [(ngModel)]="form.name_en" placeholder="Al Rajhi Bank" /></label>
            <label>نوع الحساب
              <select class="fld" [(ngModel)]="form.account_type">
                <option value="">اختر النوع…</option>
                @for (t of types(); track t.id) { <option [value]="t.id">{{ t.name_ar }}</option> }
              </select>
            </label>
            <label>طبيعة الحساب
              <select class="fld" [(ngModel)]="form.normal_balance">
                <option value="debit">مدين (Debit)</option>
                <option value="credit">دائن (Credit)</option>
              </select>
            </label>
            <label>الحساب الأب
              <select class="fld" [(ngModel)]="form.parent">
                <option [ngValue]="null">— حساب رئيسي —</option>
                @for (a of accounts(); track a.id) { <option [ngValue]="a.id">{{ a.code }} - {{ a.name_ar }}</option> }
              </select>
            </label>
          </div>
          <div class="form-actions">
            <button class="btn primary" [disabled]="saving()" (click)="save()">{{ saving() ? 'جارٍ الحفظ…' : 'حفظ الحساب' }}</button>
            <button class="btn ghost" (click)="showForm.set(false)">إلغاء</button>
          </div>
        </nb-panel>
      }

      <nb-panel [flush]="true">
        <div class="table-wrap">
          <table class="nb-table">
            <thead>
              <tr><th>الرمز</th><th>اسم الحساب</th><th>النوع</th><th>طبيعة الحساب</th><th>الحالة</th></tr>
            </thead>
            <tbody>
              @for (a of filtered(); track a.id) {
                <tr>
                  <td class="mono" [style.padding-inline-start.px]="a.parent ? 28 : 12"><strong>{{ a.code }}</strong></td>
                  <td><strong>{{ a.name_ar }}</strong> <span class="en">{{ a.name_en }}</span>
                    @if (a.is_control_account) { <span class="tag">حساب تحكم</span> }
                  </td>
                  <td>{{ typeName(a.account_type) }}</td>
                  <td><span class="badge" [class.debit]="a.normal_balance==='debit'" [class.credit]="a.normal_balance==='credit'">
                    {{ a.normal_balance === 'debit' ? 'مدين' : 'دائن' }}</span></td>
                  <td><span class="badge" [class.ok]="a.status==='active'" [class.off]="a.status!=='active'">
                    {{ a.status === 'active' ? 'نشط' : 'غير نشط' }}</span></td>
                </tr>
              }
              @if (!filtered().length) { <tr><td colspan="5" class="empty">لا توجد حسابات مطابقة.</td></tr> }
            </tbody>
          </table>
        </div>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-background); font-family: var(--nb-font-family); }
    .mb { margin-bottom: 16px; }
    .filters { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
    .filters .count { margin-inline-start: auto; font-size: 12px; color: var(--nb-text-muted); }
    .fld { height: 34px; padding: 0 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; }
    .fld.search { min-width: 240px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }
    label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--nb-text-muted); }
    label .fld { width: 100%; box-sizing: border-box; }
    .form-actions { display: flex; gap: 10px; margin-top: 14px; }

    .table-wrap { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .nb-table th { text-align: start; font-weight: 700; font-size: 11px; color: var(--nb-text-muted);
      background: var(--nb-surface-raised); padding: 9px 12px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table td { padding: 9px 12px; border-bottom: 1px solid var(--nb-border-row); color: var(--nb-text); }
    .nb-table tr:last-child td { border-bottom: none; }
    .nb-table tbody tr:hover td { background: var(--nb-surface-raised); }
    .mono { font-variant-numeric: tabular-nums; }
    .en { color: var(--nb-text-muted); font-size: 11px; margin-inline-start: 6px; }
    .empty { text-align: center; padding: 26px; color: var(--nb-text-muted); }
    .tag { font-size: 10px; font-weight: 700; color: var(--nb-info); background: var(--nb-info-bg); padding: 1px 6px; border-radius: 4px; margin-inline-start: 6px; }
    .badge { display: inline-flex; padding: 2px 8px; font-size: 11px; font-weight: 700; border-radius: var(--nb-radius-sm); }
    .badge.debit { background: var(--nb-info-bg); color: var(--nb-info); }
    .badge.credit { background: var(--nb-success-bg); color: var(--nb-success); }
    .badge.ok { background: var(--nb-success-bg); color: var(--nb-success); }
    .badge.off { background: var(--nb-border-soft); color: var(--nb-text-secondary); }

    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.primary:hover:not(:disabled) { background: var(--nb-primary-700); }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn:disabled { opacity: .6; cursor: not-allowed; }
  `],
})
export class ChartOfAccountsComponent implements OnInit {
  private service = inject(FinanceService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  accounts = signal<Account[]>([]);
  types = signal<any[]>([]);
  showForm = signal(false);
  saving = signal(false);

  search = '';
  typeFilter = '';
  statusFilter = '';

  form: any = { code: '', name_ar: '', name_en: '', account_type: '', normal_balance: 'debit', parent: null };

  filtered = computed(() => {
    const s = this.search.trim().toLowerCase();
    return this.accounts().filter((a) =>
      (!s || a.code.toLowerCase().includes(s) || a.name_ar.includes(s) || (a.name_en || '').toLowerCase().includes(s)) &&
      (!this.typeFilter || a.account_type === this.typeFilter) &&
      (!this.statusFilter || a.status === this.statusFilter));
  });

  ngOnInit() {
    this.service.getAccountTypes().subscribe((r) => { if (r?.success) this.types.set(r.data); });
    this.load();
  }
  apply() {}
  load() {
    this.service.getCOA().subscribe((r) => { if (r?.success) this.accounts.set(r.data); });
  }
  typeName(id: string): string { return this.types().find((t) => t.id === id)?.name_ar || '—'; }

  cols(): ExportColumn[] {
    return [
      { key: 'code', label: 'الرمز' },
      { key: 'name_ar', label: 'اسم الحساب' },
      { key: 'name_en', label: 'الاسم الإنجليزي' },
      { key: 'account_type', label: 'النوع', map: (r) => this.typeName(r.account_type) },
      { key: 'normal_balance', label: 'الطبيعة', map: (r) => (r.normal_balance === 'debit' ? 'مدين' : 'دائن') },
      { key: 'status', label: 'الحالة', map: (r) => (r.status === 'active' ? 'نشط' : 'غير نشط') },
    ];
  }

  save() {
    if (!this.form.code || !this.form.name_ar || !this.form.account_type) {
      this.notify.error('يرجى تعبئة الرمز والاسم ونوع الحساب.'); return;
    }
    this.saving.set(true);
    this.service.createAccount(this.form).subscribe({
      next: (r) => {
        this.saving.set(false);
        if (r?.success) {
          this.notify.success('تمت إضافة الحساب بنجاح.');
          this.showForm.set(false);
          this.form = { code: '', name_ar: '', name_en: '', account_type: '', normal_balance: 'debit', parent: null };
          this.load();
        } else { this.notify.error(r?.message || 'تعذر حفظ الحساب.'); }
      },
      error: () => { this.saving.set(false); this.notify.error('حدث خطأ أثناء الاتصال بالخادم.'); },
    });
  }
  back() { this.router.navigateByUrl('/finance/dashboard'); }
}
