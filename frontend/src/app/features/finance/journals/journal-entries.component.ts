import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FinanceService } from '../finance.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbDatepickerComponent } from '../../../shared/nebras/nb-datepicker.component';
import { NbDrawerComponent } from '../../../shared/nebras/nb-drawer.component';
import { NbExportMenuComponent, ExportColumn } from '../../../shared/export';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';

interface Line { account: string; debit: number; credit: number; cost_center: string | null; description?: string; }

/**
 * قيود اليومية (Journal Entries) — محرر القيد المزدوج مع دورة الاعتماد والترحيل،
 * على غرار Journal Entries في Odoo و General journal في D365 Finance.
 */
@Component({
  selector: 'app-journal-entries',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe, NbPageHeaderComponent, NbPanelComponent, NbDatepickerComponent, NbDrawerComponent, NbExportMenuComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="قيود اليومية والاعتمادات" subtitle="إنشاء القيود المزدوجة المتوازنة، واعتمادها، وترحيلها لدفتر الأستاذ العام.">
        <button class="btn ghost" (click)="back()">رجوع لمساحة العمل</button>
        <nb-export-menu [columns]="cols()" [rows]="journals()" title="قيود اليومية" subtitle="سجل القيود المحاسبية" filename="قيود-اليومية"></nb-export-menu>
        <button class="btn primary" (click)="toggleEditor()">＋ قيد يومية جديد</button>
      </nb-page-header>

      <div class="statusbar">
        @for (s of statuses; track s.key) {
          <button class="seg" [class.active]="statusFilter()===s.key" (click)="setStatus(s.key)">{{ s.label }}</button>
        }
      </div>

      @if (showEditor()) {
        <nb-panel title="محرر القيد المزدوج" subtitle="يجب أن يتساوى إجمالي المدين مع إجمالي الدائن قبل الحفظ." class="mb">
          <div class="grid4">
            <label>رقم القيد<input class="fld" [(ngModel)]="draft.entry_number" placeholder="JV-1001" /></label>
            <label>التاريخ<nb-datepicker [value]="draft.date" (valueChange)="draft.date = $event"></nb-datepicker></label>
            <label>الفترة المحاسبية
              <select class="fld" [(ngModel)]="draft.accounting_period">
                <option value="">اختر الفترة…</option>
                @for (p of periods(); track p.id) { <option [value]="p.id">{{ p.name }}</option> }
              </select>
            </label>
            <label>المرجع<input class="fld" [(ngModel)]="draft.reference" placeholder="مرجع خارجي (اختياري)" /></label>
          </div>
          <label class="full">البيان / الوصف<input class="fld" [(ngModel)]="draft.description" placeholder="وصف المعاملة المحاسبية" /></label>

          <div class="lines-head"><span>الحساب</span><span>مركز التكلفة</span><span>مدين</span><span>دائن</span><span></span></div>
          @for (ln of draft.lines; track $index) {
            <div class="line">
              <select class="fld" [(ngModel)]="ln.account">
                <option value="">— اختر الحساب —</option>
                @for (a of accounts(); track a.id) { <option [value]="a.id">{{ a.code }} - {{ a.name_ar }}</option> }
              </select>
              <select class="fld" [(ngModel)]="ln.cost_center">
                <option [ngValue]="null">— بدون —</option>
                @for (c of costCenters(); track c.id) { <option [ngValue]="c.id">{{ c.name_ar }}</option> }
              </select>
              <input class="fld num" type="number" min="0" [(ngModel)]="ln.debit" (ngModelChange)="onDebit(ln)" />
              <input class="fld num" type="number" min="0" [(ngModel)]="ln.credit" (ngModelChange)="onCredit(ln)" />
              <button class="icon-btn" (click)="removeLine($index)" title="حذف السطر">✕</button>
            </div>
          }
          <button class="btn ghost sm" (click)="addLine()">＋ إضافة سطر</button>

          <div class="totals" [class.ok]="balanced()" [class.bad]="!balanced()">
            <span>إجمالي المدين: <strong>{{ totalDebit() | number:'1.2-2' }}</strong></span>
            <span>إجمالي الدائن: <strong>{{ totalCredit() | number:'1.2-2' }}</strong></span>
            <span>الفرق: <strong>{{ (totalDebit() - totalCredit()) | number:'1.2-2' }}</strong></span>
            <span class="verdict">{{ balanced() ? '✓ القيد متوازن' : '✗ القيد غير متوازن' }}</span>
          </div>

          <div class="form-actions">
            <button class="btn primary" [disabled]="!balanced() || saving()" (click)="save()">{{ saving() ? 'جارٍ الحفظ…' : 'حفظ كمسودة' }}</button>
            <button class="btn ghost" (click)="showEditor.set(false)">إلغاء</button>
          </div>
        </nb-panel>
      }

      <nb-panel [flush]="true">
        <div class="table-wrap">
          <table class="nb-table">
            <thead><tr><th>رقم القيد</th><th>التاريخ</th><th>البيان</th><th>المصدر</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              @if (loading()) {
                <tr><td colspan="6"><nb-loading message="جارٍ تحميل القيود…"></nb-loading></td></tr>
              } @else {
              @for (j of journals(); track j.id) {
                <tr class="clickable" (click)="openDetail(j)">
                  <td><strong>{{ j.entry_number }}</strong></td>
                  <td class="mono">{{ j.date }}</td>
                  <td>{{ j.description }}</td>
                  <td>{{ sourceLabel(j.source_type) }}</td>
                  <td><span class="badge" [class]="j.status">{{ statusLabel(j.status) }}</span></td>
                  <td (click)="$event.stopPropagation()">
                    <div class="actions">
                      @if (j.status === 'draft') { <button class="btn primary xs" (click)="approve(j)">اعتماد</button> }
                      @if (j.status === 'approved') { <button class="btn primary xs" (click)="post(j)">ترحيل</button> }
                      @if (j.status === 'posted') { <button class="btn danger xs" (click)="reverse(j)">عكس القيد</button> }
                    </div>
                  </td>
                </tr>
              }
              @if (!journals().length) { <tr><td colspan="6" class="empty">لا توجد قيود بهذه الحالة.</td></tr> }
              }
            </tbody>
          </table>
        </div>
      </nb-panel>

      <!-- تفاصيل القيد المحاسبي -->
      <nb-drawer [open]="!!detail()" [width]="640"
        [title]="'قيد رقم ' + (detail()?.entry_number || '')"
        [subtitle]="detail()?.description" (closed)="detail.set(null)">
        @if (detail(); as d) {
          <div class="dsummary">
            <div class="chip"><span class="k">التاريخ</span><span class="v mono">{{ d.date }}</span></div>
            <div class="chip"><span class="k">الحالة</span><span class="badge" [class]="d.status">{{ statusLabel(d.status) }}</span></div>
            <div class="chip"><span class="k">المصدر</span><span class="v">{{ sourceLabel(d.source_type) }}</span></div>
            @if (d.reference) { <div class="chip"><span class="k">المرجع</span><span class="v">{{ d.reference }}</span></div> }
          </div>

          <h4 class="dh">أسطر القيد</h4>
          <div class="table-wrap">
            <table class="nb-table dlines">
              <thead><tr><th>الحساب</th><th class="end">مدين</th><th class="end">دائن</th></tr></thead>
              <tbody>
                @for (l of d.lines || []; track $index) {
                  <tr>
                    <td><strong>{{ l.account_code }}</strong> <span class="nm">{{ l.account_name }}</span></td>
                    <td class="end mono info">{{ +l.debit > 0 ? (l.debit | number:'1.2-2') : '—' }}</td>
                    <td class="end mono success">{{ +l.credit > 0 ? (l.credit | number:'1.2-2') : '—' }}</td>
                  </tr>
                }
                <tr class="sum">
                  <td>الإجمالي</td>
                  <td class="end mono"><strong>{{ detailDebit() | number:'1.2-2' }}</strong></td>
                  <td class="end mono"><strong>{{ detailCredit() | number:'1.2-2' }}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        }
        <div drawer-actions>
          <button class="btn ghost" (click)="printDetail()">🖨️ طباعة القيد</button>
          @if (detail()?.status === 'draft') { <button class="btn primary" (click)="approve(detail()); detail.set(null)">اعتماد</button> }
          @if (detail()?.status === 'approved') { <button class="btn primary" (click)="post(detail()); detail.set(null)">ترحيل</button> }
        </div>
      </nb-drawer>
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
    .fld.num { text-align: end; font-variant-numeric: tabular-nums; }
    .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    @media (max-width: 800px) { .grid4 { grid-template-columns: 1fr 1fr; } }
    label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--nb-text-muted); }
    label.full { margin-top: 12px; }

    .lines-head, .line { display: grid; grid-template-columns: 2.2fr 1.4fr 1fr 1fr 34px; gap: 8px; align-items: center; }
    .lines-head { margin: 16px 0 6px; font-size: 11px; font-weight: 700; color: var(--nb-text-muted); padding: 0 2px; }
    .line { margin-bottom: 8px; }
    .icon-btn { width: 30px; height: 30px; border: 1px solid var(--nb-border); background: var(--nb-surface); border-radius: var(--nb-radius);
      cursor: pointer; color: var(--nb-danger); font-size: 12px; }

    .totals { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; margin: 14px 0; padding: 10px 14px;
      border-radius: var(--nb-radius); font-size: 13px; background: var(--nb-surface-raised); border: 1px solid var(--nb-border); }
    .totals.ok { border-color: var(--nb-success); }
    .totals.bad { border-color: var(--nb-danger); }
    .totals .verdict { margin-inline-start: auto; font-weight: 700; }
    .totals.ok .verdict { color: var(--nb-success); }
    .totals.bad .verdict { color: var(--nb-danger); }
    .form-actions { display: flex; gap: 10px; }

    .table-wrap { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .nb-table th { text-align: start; font-weight: 700; font-size: 11px; color: var(--nb-text-muted);
      background: var(--nb-surface-raised); padding: 9px 12px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table td { padding: 9px 12px; border-bottom: 1px solid var(--nb-border-row); color: var(--nb-text); }
    .nb-table tr:last-child td { border-bottom: none; }
    .nb-table tbody tr:hover td { background: var(--nb-surface-raised); }
    .mono { font-variant-numeric: tabular-nums; }
    .empty { text-align: center; padding: 26px; color: var(--nb-text-muted); }
    .actions { display: flex; gap: 6px; }
    .nb-table tbody tr.clickable { cursor: pointer; }
    .info { color: var(--nb-info); } .success { color: var(--nb-success); }
    .nm { color: var(--nb-text-muted); font-size: 12px; }

    /* درج التفاصيل */
    .dsummary { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
    .chip { display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; border: 1px solid var(--nb-border-soft);
      border-radius: var(--nb-radius); background: var(--nb-surface-raised); min-width: 110px; }
    .chip .k { font-size: 11px; color: var(--nb-text-muted); }
    .chip .v { font-size: 13px; font-weight: 700; color: var(--nb-text); }
    .dh { font-size: 13px; font-weight: 700; color: var(--nb-text); margin: 4px 0 10px; }
    .dlines .sum td { border-top: 2px solid var(--nb-border); font-weight: 700; background: var(--nb-surface-raised); }
    .badge { display: inline-flex; padding: 2px 8px; font-size: 11px; font-weight: 700; border-radius: var(--nb-radius-sm); }
    .badge.draft { background: var(--nb-border-soft); color: var(--nb-text-secondary); }
    .badge.approved { background: var(--nb-info-bg); color: var(--nb-info); }
    .badge.posted { background: var(--nb-success-bg); color: var(--nb-success); }
    .badge.reversed, .badge.cancelled { background: var(--nb-danger-bg); color: var(--nb-danger); }

    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.sm { height: 30px; }
    .btn.xs { height: 28px; padding: 0 10px; font-size: 11.5px; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.primary:hover:not(:disabled) { background: var(--nb-primary-700); }
    .btn.danger { background: var(--nb-danger); color: #fff; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn:disabled { opacity: .55; cursor: not-allowed; }
  `],
})
export class JournalEntriesComponent implements OnInit {
  private service = inject(FinanceService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  journals = signal<any[]>([]);
  loading = signal(true);
  accounts = signal<any[]>([]);
  periods = signal<any[]>([]);
  costCenters = signal<any[]>([]);
  showEditor = signal(false);
  saving = signal(false);
  statusFilter = signal<string>('');
  detail = signal<any | null>(null);

  detailDebit = computed(() => (this.detail()?.lines || []).reduce((s: number, l: any) => s + (Number(l.debit) || 0), 0));
  detailCredit = computed(() => (this.detail()?.lines || []).reduce((s: number, l: any) => s + (Number(l.credit) || 0), 0));

  statuses = [
    { key: '', label: 'الكل' }, { key: 'draft', label: 'مسودة' },
    { key: 'approved', label: 'معتمد' }, { key: 'posted', label: 'مرحّل' }, { key: 'reversed', label: 'معكوس' },
  ];

  draft: any = this.blank();

  private draftVersion = signal(0); // لإعادة حساب المجاميع عند تعديل السطور
  totalDebit = computed(() => { this.draftVersion(); return this.draft.lines.reduce((s: number, l: Line) => s + (Number(l.debit) || 0), 0); });
  totalCredit = computed(() => { this.draftVersion(); return this.draft.lines.reduce((s: number, l: Line) => s + (Number(l.credit) || 0), 0); });
  balanced = computed(() => this.totalDebit() > 0 && Math.abs(this.totalDebit() - this.totalCredit()) < 0.01);

  ngOnInit() {
    this.service.getCOA({ status: 'active' }).subscribe((r) => { if (r?.success) this.accounts.set(r.data); });
    this.service.getPeriods({ status: 'open' }).subscribe((r) => { if (r?.success) this.periods.set(r.data); });
    this.service.getCostCenters({ status: 'active' }).subscribe((r) => { if (r?.success) this.costCenters.set(r.data); });
    this.load();
  }

  blank() {
    return { entry_number: '', date: new Date().toISOString().split('T')[0], accounting_period: '', reference: '', description: '',
      lines: [{ account: '', debit: 0, credit: 0, cost_center: null }, { account: '', debit: 0, credit: 0, cost_center: null }] as Line[] };
  }

  setStatus(s: string) { this.statusFilter.set(s); this.load(); }
  load() {
    this.loading.set(true);
    const params = this.statusFilter() ? { status: this.statusFilter() } : undefined;
    this.service.getJournals(params).subscribe({
      next: (r) => { if (r?.success) this.journals.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  toggleEditor() { this.showEditor.update((v) => !v); if (this.showEditor()) this.draft = this.blank(); }
  addLine() { this.draft.lines = [...this.draft.lines, { account: '', debit: 0, credit: 0, cost_center: null }]; this.draftVersion.update((v) => v + 1); }
  removeLine(i: number) { this.draft.lines = this.draft.lines.filter((_: any, idx: number) => idx !== i); this.draftVersion.update((v) => v + 1); }
  onDebit(ln: Line) { if (ln.debit) ln.credit = 0; this.draftVersion.update((v) => v + 1); }
  onCredit(ln: Line) { if (ln.credit) ln.debit = 0; this.draftVersion.update((v) => v + 1); }

  save() {
    if (!this.draft.entry_number || !this.draft.accounting_period) { this.notify.error('يرجى إدخال رقم القيد والفترة المحاسبية.'); return; }
    this.saving.set(true);
    this.service.getCurrencies({ is_base: true }).subscribe((cr) => {
      const base = cr?.data?.[0];
      const payload = { ...this.draft, currency: base?.id, exchange_rate: 1.0,
        lines: this.draft.lines.filter((l: Line) => l.account && (Number(l.debit) || Number(l.credit))) };
      this.service.createJournal(payload).subscribe({
        next: (r) => {
          this.saving.set(false);
          if (r?.success) { this.notify.success('تم حفظ القيد كمسودة بنجاح.'); this.showEditor.set(false); this.draft = this.blank(); this.load(); }
          else { this.notify.error(r?.message || 'تعذر حفظ القيد.'); }
        },
        error: () => { this.saving.set(false); this.notify.error('حدث خطأ أثناء الاتصال بالخادم.'); },
      });
    });
  }

  approve(j: any) { this.service.approveJournal(j.id).subscribe({ next: (r) => { if (r?.success) { this.notify.success('تم اعتماد القيد.'); this.load(); } else this.notify.error(r?.message || 'تعذر الاعتماد.'); }, error: (e) => this.notify.error(e?.error?.message || 'تعذر اعتماد القيد.') }); }
  post(j: any) { this.service.postJournal(j.id).subscribe({ next: (r) => { if (r?.success) { this.notify.success('تم ترحيل القيد لدفتر الأستاذ.'); this.load(); } else this.notify.error(r?.message || 'تعذر الترحيل.'); }, error: (e) => this.notify.error(e?.error?.message || 'تعذر ترحيل القيد.') }); }
  reverse(j: any) { this.service.reverseJournal(j.id).subscribe({ next: (r) => { if (r?.success) { this.notify.success('تم إنشاء القيد العكسي.'); this.load(); } else this.notify.error(r?.message || 'تعذر العكس.'); }, error: (e) => this.notify.error(e?.error?.message || 'تعذر عكس القيد.') }); }

  cols(): ExportColumn[] {
    return [
      { key: 'entry_number', label: 'رقم القيد' },
      { key: 'date', label: 'التاريخ' },
      { key: 'description', label: 'البيان' },
      { key: 'source_type', label: 'المصدر', map: (r) => this.sourceLabel(r.source_type) },
      { key: 'status', label: 'الحالة', map: (r) => this.statusLabel(r.status) },
    ];
  }

  openDetail(j: any) {
    this.detail.set(j); // عرض فوري بالبيانات المتوفرة
    this.service.getJournalDetails(j.id).subscribe({ next: (r) => { if (r?.success) this.detail.set(r.data); } });
  }
  printDetail() {
    const d = this.detail();
    if (!d) return;
    import('../../../shared/export').then(({ printDoc }) => {
      printDoc(
        { title: `قيد يومية رقم ${d.entry_number}`, subtitle: d.description },
        [
          { key: 'account', label: 'الحساب', map: (l: any) => `${l.account_code} - ${l.account_name}` },
          { key: 'debit', label: 'مدين', align: 'end' },
          { key: 'credit', label: 'دائن', align: 'end' },
        ],
        d.lines || [],
      );
    });
  }

  statusLabel(s: string) { return ({ draft: 'مسودة', approved: 'معتمد', posted: 'مرحّل', cancelled: 'ملغي', reversed: 'معكوس' } as any)[s] || s; }
  sourceLabel(s: string) { return ({ manual: 'يدوي', automatic: 'تلقائي', recurring: 'دوري', reversing: 'عكسي', imported: 'مستورد' } as any)[s] || s; }
  back() { this.router.navigateByUrl('/finance/dashboard'); }
}
