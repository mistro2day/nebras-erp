import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FinanceService } from '../finance.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { exportCsv, printTable, ExportColumn } from '../finance-export.util';

/**
 * دفتر الأستاذ العام (General Ledger) — استعراض الحركات المرحّلة وأرصدتها التراكمية،
 * على غرار General Ledger في Odoo و D365 Finance.
 */
@Component({
  selector: 'app-general-ledger',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="دفتر الأستاذ العام" subtitle="جميع الحركات المرحّلة بشكل نهائي في الحسابات مع الأرصدة التراكمية.">
        <button class="btn ghost" (click)="back()">رجوع لمساحة العمل</button>
        <button class="btn ghost" (click)="print()">🖨️ طباعة</button>
        <button class="btn ghost" (click)="exportFile()">⬇️ تصدير CSV</button>
      </nb-page-header>

      <div class="kpis">
        <div class="kpi"><span class="l">إجمالي المدين</span><span class="v info">{{ totalDebit() | number:'1.2-2' }} <em>ر.س</em></span></div>
        <div class="kpi"><span class="l">إجمالي الدائن</span><span class="v success">{{ totalCredit() | number:'1.2-2' }} <em>ر.س</em></span></div>
        <div class="kpi"><span class="l">عدد الحركات</span><span class="v">{{ entries().length }}</span></div>
      </div>

      <div class="filters">
        <select class="fld" [(ngModel)]="accountFilter" (ngModelChange)="load()">
          <option value="">كل الحسابات</option>
          @for (a of accounts(); track a.id) { <option [value]="a.id">{{ a.code }} - {{ a.name_ar }}</option> }
        </select>
        <select class="fld" [(ngModel)]="ccFilter" (ngModelChange)="load()">
          <option value="">كل مراكز التكلفة</option>
          @for (c of costCenters(); track c.id) { <option [value]="c.id">{{ c.name_ar }}</option> }
        </select>
        <span class="count">{{ entries().length }} حركة</span>
      </div>

      <nb-panel [flush]="true">
        <div class="table-wrap">
          <table class="nb-table">
            <thead><tr><th>التاريخ</th><th>الحساب</th><th class="end">مدين</th><th class="end">دائن</th><th class="end">الرصيد التراكمي</th></tr></thead>
            <tbody>
              @for (e of entries(); track e.id) {
                <tr>
                  <td class="mono">{{ e.date }}</td>
                  <td><strong>{{ e.account_code }}</strong> <span class="nm">{{ e.account_name }}</span></td>
                  <td class="end info">{{ +e.debit > 0 ? (e.debit | number:'1.2-2') : '—' }}</td>
                  <td class="end success">{{ +e.credit > 0 ? (e.credit | number:'1.2-2') : '—' }}</td>
                  <td class="end mono"><strong>{{ e.balance_snapshot | number:'1.2-2' }}</strong></td>
                </tr>
              }
              @if (!entries().length) { <tr><td colspan="5" class="empty">لا توجد حركات مرحّلة مطابقة للفلاتر.</td></tr> }
            </tbody>
          </table>
        </div>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-background); font-family: var(--nb-font-family); }
    .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
    @media (max-width: 680px) { .kpis { grid-template-columns: 1fr; } }
    .kpi { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
    .kpi .l { font-size: 12px; color: var(--nb-text-muted); }
    .kpi .v { font-size: 20px; font-weight: 700; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .kpi .v em { font-size: 11px; font-weight: 500; font-style: normal; color: var(--nb-text-muted); }
    .kpi .v.info { color: var(--nb-info); } .kpi .v.success { color: var(--nb-success); }

    .filters { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
    .filters .count { margin-inline-start: auto; font-size: 12px; color: var(--nb-text-muted); }
    .fld { height: 34px; padding: 0 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; min-width: 220px; }

    .table-wrap { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .nb-table th { text-align: start; font-weight: 700; font-size: 11px; color: var(--nb-text-muted);
      background: var(--nb-surface-raised); padding: 9px 12px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table th.end { text-align: end; }
    .nb-table td { padding: 9px 12px; border-bottom: 1px solid var(--nb-border-row); color: var(--nb-text); }
    .nb-table tr:last-child td { border-bottom: none; }
    .nb-table tbody tr:hover td { background: var(--nb-surface-raised); }
    .mono { font-variant-numeric: tabular-nums; }
    .end { text-align: end; font-variant-numeric: tabular-nums; }
    .info { color: var(--nb-info); } .success { color: var(--nb-success); }
    .nm { color: var(--nb-text-muted); font-size: 12px; margin-inline-start: 6px; }
    .empty { text-align: center; padding: 26px; color: var(--nb-text-muted); }

    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
  `],
})
export class GeneralLedgerComponent implements OnInit {
  private service = inject(FinanceService);
  private router = inject(Router);

  entries = signal<any[]>([]);
  accounts = signal<any[]>([]);
  costCenters = signal<any[]>([]);
  accountFilter = '';
  ccFilter = '';

  totalDebit = computed(() => this.entries().reduce((s, e) => s + (Number(e.debit) || 0), 0));
  totalCredit = computed(() => this.entries().reduce((s, e) => s + (Number(e.credit) || 0), 0));

  ngOnInit() {
    this.service.getCOA().subscribe((r) => { if (r?.success) this.accounts.set(r.data); });
    this.service.getCostCenters().subscribe((r) => { if (r?.success) this.costCenters.set(r.data); });
    this.load();
  }
  load() {
    const params: any = {};
    if (this.accountFilter) params.account = this.accountFilter;
    if (this.ccFilter) params.cost_center = this.ccFilter;
    this.service.getLedgerEntries(params).subscribe((r) => { if (r?.success) this.entries.set(r.data); });
  }
  private cols(): ExportColumn[] {
    return [
      { key: 'date', label: 'التاريخ' },
      { key: 'account_code', label: 'رمز الحساب' },
      { key: 'account_name', label: 'اسم الحساب' },
      { key: 'debit', label: 'مدين' },
      { key: 'credit', label: 'دائن' },
      { key: 'balance_snapshot', label: 'الرصيد التراكمي' },
    ];
  }
  exportFile() { exportCsv('دفتر-الأستاذ', this.cols(), this.entries()); }
  print() { printTable('دفتر الأستاذ العام', this.cols(), this.entries(), 'الحركات المرحّلة والأرصدة التراكمية'); }
  back() { this.router.navigateByUrl('/finance/dashboard'); }
}
