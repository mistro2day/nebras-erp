import { ChangeDetectionStrategy, Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProcurementService } from '../procurement.service';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

interface ItemRow {
  item_name: string; quantity: number | null; unit: string;
  estimated_unit_price: number | null; budget_account_id: string; cost_center_id: string;
}

/**
 * نموذج إنشاء طلب شراء — مربوط بالمالية: كل بند يختار حساب موازنة (شجرة الحسابات)
 * ومركز تكلفة من المالية، فيتحقّق الخادم من صلاحيتهما. نمط Odoo/D365 لسطور الطلب.
 */
@Component({
  selector: 'app-pr-create-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="panel" dir="rtl">
      <div class="panel-head">
        <h3>طلب شراء جديد</h3>
        <button class="x" (click)="cancel.emit()" aria-label="إغلاق">✕</button>
      </div>

      @if (refError()) { <div class="ref-err">⚠︎ {{ refError() }}</div> }
      @if (!refError() && departments().length === 0) {
        <div class="ref-hint">لا توجد أقسام معرّفة — أضفها من <b>الهيكل التنظيمي ← الأقسام</b>.</div>
      }
      @if (!refError() && costCenters().length === 0) {
        <div class="ref-hint">
          لا توجد مراكز تكلفة نشطة — تُعرَّف في وحدة المالية.
          <a routerLink="/finance/cost-centers">فتح مراكز التكلفة ←</a>
        </div>
      }

      <div class="grid2">
        <label>القسم الطالب <span>*</span>
          <select [(ngModel)]="departmentId">
            <option value="">اختر القسم…</option>
            @for (d of departments(); track d.id) { <option [value]="d.id">{{ d.name }}</option> }
          </select>
        </label>
        <label>سبب الطلب <span>*</span>
          <input [(ngModel)]="reason" placeholder="مثال: تجهيزات مكتبية للفصل الدراسي" />
        </label>
      </div>

      <div class="items">
        <!-- الأبعاد المالية تُعرَّف في المالية وتُستهلك هنا فقط (نمط Odoo/D365) -->
        <div class="dims-note">
          <span class="dn-ic">🔗</span>
          <span>
            <b>حساب الموازنة</b> و<b>مركز التكلفة</b> أبعاد مالية تُعرَّف في وحدة المالية،
            ويُخصم عليها الإنفاق عند إصدار أمر الشراء.
          </span>
          <a routerLink="/finance/cost-centers" class="dn-link">إدارة مراكز التكلفة ←</a>
        </div>
        <div class="items-head">
          <span>الصنف</span><span>الكمية</span><span>الوحدة</span><span>سعر تقديري</span>
          <span class="dim-h">حساب الموازنة</span><span class="dim-h">مركز التكلفة</span><span></span>
        </div>
        @for (it of items(); track $index) {
          <div class="item">
            <input [(ngModel)]="it.item_name" placeholder="اسم الصنف" />
            <input type="number" min="0" [(ngModel)]="it.quantity" placeholder="0" />
            <input [(ngModel)]="it.unit" placeholder="حبة" />
            <input type="number" min="0" [(ngModel)]="it.estimated_unit_price" placeholder="0.00" />
            <select [(ngModel)]="it.budget_account_id" class="dim-in">
              <option value="">—</option>
              @for (a of accounts(); track a.id) { <option [value]="a.id">{{ a.code }} — {{ a.name }}</option> }
            </select>
            <select [(ngModel)]="it.cost_center_id" class="dim-in">
              <option value="">—</option>
              @for (c of costCenters(); track c.id) {
                <option [value]="c.id">{{ c.code }} — {{ c.name }} ({{ c.budget_allocated | number:'1.0-0' }})</option>
              }
            </select>
            <button class="rm" (click)="removeItem($index)" [disabled]="items().length === 1" aria-label="حذف">✕</button>
          </div>
        }
        <button class="add" (click)="addItem()">＋ إضافة صنف</button>
      </div>

      <div class="foot">
        <div class="total">الإجمالي التقديري: <strong>{{ total() | number:'1.0-2' }}</strong></div>
        <div class="foot-actions">
          <button class="btn ghost" (click)="cancel.emit()">إلغاء</button>
          <button class="btn primary" [disabled]="saving()" (click)="submit()">
            {{ saving() ? 'جارٍ الحفظ…' : 'إنشاء الطلب' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .panel { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      padding: 16px; margin-bottom: 16px; font-family: var(--nb-font-family); }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .panel-head h3 { margin: 0; font-size: 15px; font-weight: 800; color: var(--nb-text); }
    .x { background: none; border: none; font-size: 16px; color: var(--nb-text-muted); cursor: pointer; }
    label { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; font-weight: 700; color: var(--nb-text); }
    label span { color: var(--nb-danger); }
    .ref-err { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-radius: var(--nb-radius);
      padding: 10px 12px; font-size: 12.5px; font-weight: 600; margin-bottom: 12px; }
    .ref-hint { background: var(--nb-warning-bg, #fffaf0); border: 1px solid #fde9c8; color: #92400e;
      border-radius: var(--nb-radius); padding: 9px 12px; font-size: 12.5px; margin-bottom: 10px; }
    .ref-hint a { color: #b45309; font-weight: 800; text-decoration: none; margin-inline-start: 6px; }
    .ref-hint a:hover { text-decoration: underline; }
    .grid2 { display: grid; grid-template-columns: 1fr 1.4fr; gap: 12px; margin-bottom: 16px; }
    @media (max-width: 720px) { .grid2 { grid-template-columns: 1fr; } }
    input, select { font-family: inherit; font-size: 13px; padding: 8px 10px; border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius); background: var(--nb-surface); color: var(--nb-text); }
    input:focus, select:focus { outline: none; border-color: var(--nb-primary-400); box-shadow: 0 0 0 3px rgba(63,81,181,0.12); }
    /* ملاحظة ملكية الأبعاد المالية */
    .dims-note { display: flex; align-items: center; gap: 10px; background: var(--nb-primary-50);
      border: 1px solid var(--nb-primary-100, #E8EAF6); border-radius: var(--nb-radius);
      padding: 10px 12px; margin-bottom: 12px; font-size: 12px; color: var(--nb-primary-800, #2C387E); }
    .dn-ic { font-size: 15px; flex: none; }
    .dims-note b { font-weight: 800; }
    .dn-link { margin-inline-start: auto; flex: none; color: var(--nb-primary-700); font-weight: 800;
      text-decoration: none; font-size: 11.5px; white-space: nowrap; }
    .dn-link:hover { text-decoration: underline; }

    .items-head, .item { display: grid; grid-template-columns: 1.6fr 0.7fr 0.7fr 0.9fr 1.4fr 1.4fr 32px; gap: 8px; align-items: center; }
    .items-head { font-size: 11px; font-weight: 700; color: var(--nb-text-muted); padding: 0 2px 6px; }
    /* تمييز الأبعاد المالية بصرياً عن حقول الصنف */
    .dim-h { color: var(--nb-primary-700); }
    .dim-in { background: var(--nb-primary-50); border-color: var(--nb-primary-100, #E8EAF6); }
    .item { margin-bottom: 8px; }
    .rm { background: none; border: 1px solid var(--nb-border); border-radius: 8px; color: var(--nb-danger);
      cursor: pointer; height: 34px; }
    .rm:disabled { opacity: .4; cursor: default; }
    .add { background: var(--nb-primary-50); border: 1px dashed var(--nb-primary-300); color: var(--nb-primary-700);
      border-radius: var(--nb-radius); padding: 8px 14px; font-family: inherit; font-weight: 700; font-size: 12.5px;
      cursor: pointer; margin-top: 4px; }
    .foot { display: flex; align-items: center; justify-content: space-between; margin-top: 16px;
      padding-top: 14px; border-top: 1px solid var(--nb-border-soft); }
    .total { font-size: 13px; color: var(--nb-text-muted); }
    .total strong { font-size: 17px; color: var(--nb-text); font-weight: 800; }
    .foot-actions { display: flex; gap: 8px; }
    .btn { height: 36px; padding: 0 18px; font-family: inherit; font-size: 13px; font-weight: 700; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.primary:disabled { opacity: .6; }
  `]
})
export class PrCreateFormComponent implements OnInit {
  readonly created = output<void>();
  readonly cancel = output<void>();

  private svc = inject(ProcurementService);
  private auth = inject(AuthService);
  private notify = inject(NotificationService);

  readonly departments = signal<any[]>([]);
  readonly accounts = signal<any[]>([]);
  readonly costCenters = signal<any[]>([]);
  readonly items = signal<ItemRow[]>([this.blank()]);
  readonly saving = signal(false);

  departmentId = '';
  reason = '';

  readonly total = computed(() =>
    this.items().reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.estimated_unit_price) || 0), 0));

  readonly refError = signal('');

  ngOnInit() {
    this.svc.getRequestReferenceData().subscribe({
      next: (res: any) => {
        const d = res?.data ?? res ?? {};
        this.departments.set(d.departments || []);
        this.accounts.set(d.accounts || []);
        this.costCenters.set(d.cost_centers || []);
      },
      // معترض الأخطاء يُسطّح الخطأ إلى {status, message, details} — نعرض سببه الحقيقي
      error: (e) => this.refError.set(
        `تعذّر تحميل البيانات المرجعية — ${e?.message || 'خطأ غير معروف'}` +
        (e?.status ? ` (HTTP ${e.status})` : '') +
        (e?.status === 404 ? ' — أعد تشغيل خادم الـ backend لتسجيل النقطة الجديدة.' : '')
      ),
    });
  }

  blank(): ItemRow {
    return { item_name: '', quantity: null, unit: 'حبة', estimated_unit_price: null, budget_account_id: '', cost_center_id: '' };
  }
  addItem() { this.items.update(l => [...l, this.blank()]); }
  removeItem(i: number) { this.items.update(l => l.filter((_, idx) => idx !== i)); }

  submit() {
    if (!this.departmentId) { this.notify.error('اختر القسم الطالب.'); return; }
    if (!this.reason.trim()) { this.notify.error('أدخل سبب الطلب.'); return; }
    const items = this.items().filter(i => i.item_name.trim());
    if (items.length === 0) { this.notify.error('أضف صنفاً واحداً على الأقل.'); return; }
    for (const it of items) {
      if (!it.quantity || !it.estimated_unit_price) { this.notify.error('أكمل الكمية والسعر لكل صنف.'); return; }
      if (!it.budget_account_id || !it.cost_center_id) { this.notify.error('اختر حساب الموازنة ومركز التكلفة لكل صنف (ربط المالية).'); return; }
    }

    const payload = {
      department_id: this.departmentId,
      requested_by: this.auth.currentUser()?.id,
      reason: this.reason.trim(),
      items: items.map(i => ({
        item_name: i.item_name.trim(), quantity: i.quantity, unit: i.unit || 'حبة',
        estimated_unit_price: i.estimated_unit_price,
        budget_account_id: i.budget_account_id, cost_center_id: i.cost_center_id,
      })),
    };
    this.saving.set(true);
    this.svc.createPurchaseRequest(payload as any).subscribe({
      next: () => { this.saving.set(false); this.notify.success('تم إنشاء طلب الشراء.'); this.created.emit(); },
      error: (e) => { this.saving.set(false); this.notify.error(e?.details?.error || e?.details?.detail || e?.message || 'تعذّر إنشاء الطلب. تحقّق من ربط المالية.'); },
    });
  }
}
