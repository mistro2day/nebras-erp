import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FinanceService } from '../finance.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbExportMenuComponent, ExportColumn } from '../../../shared/export';

/**
 * مراكز التكلفة (Cost Centers) — الأبعاد المالية والفروع والأقسام،
 * على غرار Analytic Accounts في Odoo و Financial dimensions في D365 Finance.
 */
@Component({
  selector: 'app-cost-centers',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe, NbPageHeaderComponent, NbPanelComponent, NbExportMenuComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="مراكز التكلفة" subtitle="هيكل مراكز التكلفة والأبعاد المالية لتوزيع المصروفات على الفروع والأقسام والمشاريع.">
        <button class="btn ghost" (click)="back()">رجوع لمساحة العمل</button>
        <nb-export-menu [columns]="cols()" [rows]="centers()" title="مراكز التكلفة" subtitle="هيكل مراكز التكلفة والأبعاد المالية" filename="مراكز-التكلفة"></nb-export-menu>
        <button class="btn primary" (click)="showForm.set(!showForm())">＋ مركز تكلفة</button>
      </nb-page-header>

      @if (showForm()) {
        <nb-panel title="إضافة مركز تكلفة" class="mb">
          <div class="grid4">
            <label>الرمز<input class="fld" [(ngModel)]="form.code" placeholder="CC-01" /></label>
            <label>الاسم العربي<input class="fld" [(ngModel)]="form.name_ar" /></label>
            <label>الاسم الإنجليزي<input class="fld" [(ngModel)]="form.name_en" /></label>
            <label>النوع
              <select class="fld" [(ngModel)]="form.type">
                <option value="branch">فرع</option><option value="campus">حرم</option><option value="department">قسم</option>
                <option value="project">مشروع</option><option value="activity">نشاط</option><option value="custom">مخصص</option>
              </select>
            </label>
            <label>المركز الأب
              <select class="fld" [(ngModel)]="form.parent"><option [ngValue]="null">— رئيسي —</option>@for (c of centers(); track c.id) { <option [ngValue]="c.id">{{ c.name_ar }}</option> }</select>
            </label>
            <label>الميزانية المخصصة<input class="fld num" type="number" min="0" [(ngModel)]="form.budget_allocated" /></label>
          </div>
          <div class="form-actions"><button class="btn primary" (click)="save()">حفظ المركز</button><button class="btn ghost" (click)="showForm.set(false)">إلغاء</button></div>
        </nb-panel>
      }

      <nb-panel [flush]="true"><div class="table-wrap"><table class="nb-table">
        <thead><tr><th>الرمز</th><th>الاسم</th><th>النوع</th><th class="end">الميزانية المخصصة</th><th>الحالة</th></tr></thead>
        <tbody>
          @for (c of centers(); track c.id) {
            <tr>
              <td [style.padding-inline-start.px]="c.parent ? 28 : 12"><strong>{{ c.code }}</strong></td>
              <td>{{ c.name_ar }} <span class="nm">{{ c.name_en }}</span></td>
              <td>{{ typeLabel(c.type) }}</td>
              <td class="end mono">{{ c.budget_allocated | number:'1.2-2' }}</td>
              <td><span class="badge ok">{{ c.status === 'active' ? 'نشط' : 'غير نشط' }}</span></td>
            </tr>
          }
          @if (!centers().length) { <tr><td colspan="5" class="empty">لا توجد مراكز تكلفة.</td></tr> }
        </tbody></table></div></nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-background); font-family: var(--nb-font-family); }
    .mb { margin-bottom: 16px; }
    .fld { height: 34px; padding: 0 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; box-sizing: border-box; width: 100%; }
    .fld.num { text-align: end; }
    .grid4 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 800px) { .grid4 { grid-template-columns: 1fr; } }
    label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--nb-text-muted); }
    .form-actions { display: flex; gap: 10px; margin-top: 14px; }

    .table-wrap { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .nb-table th { text-align: start; font-weight: 700; font-size: 11px; color: var(--nb-text-muted);
      background: var(--nb-surface-raised); padding: 9px 12px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table th.end { text-align: end; }
    .nb-table td { padding: 9px 12px; border-bottom: 1px solid var(--nb-border-row); color: var(--nb-text); }
    .nb-table tr:last-child td { border-bottom: none; }
    .nb-table tbody tr:hover td { background: var(--nb-surface-raised); }
    .mono { font-variant-numeric: tabular-nums; } .end { text-align: end; }
    .nm { color: var(--nb-text-muted); font-size: 12px; margin-inline-start: 6px; }
    .empty { text-align: center; padding: 26px; color: var(--nb-text-muted); }
    .badge { display: inline-flex; padding: 2px 8px; font-size: 11px; font-weight: 700; border-radius: var(--nb-radius-sm); }
    .badge.ok { background: var(--nb-success-bg); color: var(--nb-success); }

    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; } .btn.primary:hover { background: var(--nb-primary-700); }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
  `],
})
export class CostCentersComponent implements OnInit {
  private service = inject(FinanceService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  centers = signal<any[]>([]);
  showForm = signal(false);
  form: any = this.blank();

  ngOnInit() { this.load(); }
  blank() { return { code: '', name_ar: '', name_en: '', type: 'department', parent: null, budget_allocated: 0 }; }
  load() { this.service.getCostCenters().subscribe((r) => { if (r?.success) this.centers.set(r.data); }); }
  save() {
    if (!this.form.code || !this.form.name_ar) { this.notify.error('يرجى إدخال الرمز والاسم.'); return; }
    this.service.createCostCenter(this.form).subscribe({
      next: (r) => { if (r?.success) { this.notify.success('تم حفظ مركز التكلفة.'); this.showForm.set(false); this.form = this.blank(); this.load(); } else this.notify.error(r?.message || 'تعذر الحفظ.'); },
      error: (e) => this.notify.error(e?.error?.message || 'حدث خطأ أثناء الاتصال بالخادم.'),
    });
  }
  cols(): ExportColumn[] {
    return [
      { key: 'code', label: 'الرمز' },
      { key: 'name_ar', label: 'الاسم' },
      { key: 'type', label: 'النوع', map: (r) => this.typeLabel(r.type) },
      { key: 'budget_allocated', label: 'الميزانية المخصصة', align: 'end' },
      { key: 'status', label: 'الحالة', map: (r) => (r.status === 'active' ? 'نشط' : 'غير نشط') },
    ];
  }
  typeLabel(t: string) { return ({ branch: 'فرع', campus: 'حرم', department: 'قسم', project: 'مشروع', activity: 'نشاط', custom: 'مخصص' } as any)[t] || t; }
  back() { this.router.navigateByUrl('/finance/dashboard'); }
}
