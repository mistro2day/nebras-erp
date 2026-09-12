import { ChangeDetectionStrategy, Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProcurementService } from '../procurement.service';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbModalComponent } from '../../../shared/nebras/nb-modal.component';
import { NbStepperComponent } from '../../../shared/nebras/nb-stepper.component';
import { tafqeetArabic } from '../../finance/journals/journal-voucher-print';

interface ItemRow {
  item_name: string;
  quantity: number | null;
  unit: string;
  inventory_item_id: string;
  estimated_unit_price: number | null;
  budget_account_id: string;
  cost_center_id: string;
}

/**
 * معالج إنشاء طلب شراء بنمط نبراس (Nebras Modal + Stepper)
 * متعدد الخطوات مع التحقق من الأبعاد المالية وخطوة التأكيد النهائي لمنع الأخطاء.
 */
@Component({
  selector: 'app-pr-create-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe, NbModalComponent, NbStepperComponent],
  template: `
    <nb-modal
      [open]="true"
      title="إنشاء طلب شراء جديد (Purchase Request)"
      subtitle="معالج متعدد الخطوات بنمط نبراس مع ربط الأبعاد المالية والتأكيد النهائي."
      maxWidth="880px"
      (closed)="cancel.emit()"
    >
      <nb-stepper [steps]="steps" [current]="currentStep() + 1"></nb-stepper>

      <div class="step-content">
        @if (refError()) { <div class="ref-err">⚠︎ {{ refError() }}</div> }

        <!-- الخطوة 1: القسم والسبب -->
        @if (currentStep() === 0) {
          <div class="form-grid">
            <label>
              <span>القسم الطالب *</span>
              <select class="fld" [(ngModel)]="departmentId" required>
                <option value="">اختر القسم الطالب…</option>
                @for (d of departments(); track d.id) {
                  <option [value]="d.id">{{ d.name }}</option>
                }
              </select>
            </label>

            <label>
              <span>مبرر وسبب الشراء *</span>
              <input type="text" class="fld" [(ngModel)]="reason" placeholder="مثال: توريد كتب ومستلزمات معمل العلوم" required />
            </label>
          </div>

          <div class="dims-note">
            <span class="dn-ic">🔗</span>
            <span>
              طلب الشراء يمر بدورة اعتماد ومراجعة قبل تحويله إلى طلب عروض أسعار (RFQ) أو أمر شراء مباشر (PO).
            </span>
          </div>
        }

        <!-- الخطوة 2: الأصناف والأبعاد المالية -->
        @if (currentStep() === 1) {
          <div class="items-builder">
            <div class="builder-header">
              <span class="sec-title">أصناف وبنود الطلب والميزانية</span>
              <button type="button" class="btn primary xs" (click)="addItem()">＋ إضافة صنف</button>
            </div>

            <div class="table-wrap">
              <table class="nb-table">
                <thead>
                  <tr>
                    <th style="width: 25%;">الصنف *</th>
                    <th style="width: 10%;">الوحدة</th>
                    <th style="width: 10%;" class="end">الكمية *</th>
                    <th style="width: 15%;" class="end">سعر تقديري (ج.س) *</th>
                    <th style="width: 18%;">حساب الموازنة *</th>
                    <th style="width: 17%;">مركز التكلفة *</th>
                    <th style="width: 5%;"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (it of items(); track $index) {
                    <tr>
                      <td>
                        <select class="fld-sm mb-4" [ngModel]="it.inventory_item_id" (ngModelChange)="pickItem($index, $event)">
                          <option value="">— اسم حر (غير مخزني) —</option>
                          @for (inv of inventoryItems(); track inv.id) {
                            <option [value]="inv.id">{{ inv.name }}</option>
                          }
                        </select>
                        @if (!it.inventory_item_id) {
                          <input type="text" class="fld-sm" [(ngModel)]="it.item_name" placeholder="اكتب اسم الصنف" />
                        }
                      </td>
                      <td>
                        <input type="text" class="fld-sm center" [(ngModel)]="it.unit" placeholder="حبة" [readonly]="!!it.inventory_item_id" />
                      </td>
                      <td>
                        <input type="number" min="1" class="fld-sm end mono" [(ngModel)]="it.quantity" placeholder="1" />
                      </td>
                      <td>
                        <input type="number" min="0" class="fld-sm end mono" [(ngModel)]="it.estimated_unit_price" placeholder="0.00" />
                      </td>
                      <td>
                        <select class="fld-sm" [(ngModel)]="it.budget_account_id">
                          <option value="">— الحساب —</option>
                          @for (a of accounts(); track a.id) {
                            <option [value]="a.id">{{ a.code }} - {{ a.name }}</option>
                          }
                        </select>
                      </td>
                      <td>
                        <select class="fld-sm" [(ngModel)]="it.cost_center_id">
                          <option value="">— المركز —</option>
                          @for (c of costCenters(); track c.id) {
                            <option [value]="c.id">{{ c.name }}</option>
                          }
                        </select>
                      </td>
                      <td class="center">
                        <button type="button" class="btn-del" (click)="removeItem($index)" [disabled]="items().length === 1">✕</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="total-summary-bar">
              <div class="total-calc">
                <span>الإجمالي التقديري:</span>
                <strong class="total-val mono">{{ total() | number:'1.2-2' }}</strong>
                <span>جنيه سوداني (ج.س)</span>
              </div>
              <div class="total-tafqeet-preview">
                {{ tafqeet(total()) }}
              </div>
            </div>
          </div>
        }

        <!-- الخطوة 3: المراجعة والتأكيد النهائي -->
        @if (currentStep() === 2) {
          <div class="review-panel">
            <div class="review-card">
              <div class="rev-row">
                <span class="k">القسم الطالب:</span>
                <span class="v font-bold">{{ selectedDeptName() }}</span>
              </div>
              <div class="rev-row">
                <span class="k">سبب ومبرر الطلب:</span>
                <span class="v">{{ reason }}</span>
              </div>
              <div class="rev-row">
                <span class="k">عدد الأصناف:</span>
                <span class="v mono">{{ items().length }} صنف</span>
              </div>
              <div class="rev-row highlight">
                <span class="k">الإجمالي التقديري:</span>
                <span class="v amount mono font-bold">{{ total() | number:'1.2-2' }} جنيه سوداني</span>
              </div>
              <div class="rev-row">
                <span class="k">التفقيط:</span>
                <span class="v font-bold text-primary">{{ tafqeet(total()) }}</span>
              </div>
            </div>

            <div class="mini-table-box">
              <table class="nb-table mini">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>الصنف</th>
                    <th class="center">الكمية</th>
                    <th class="end">السعر التقديري</th>
                    <th class="end">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  @for (it of items(); track $index) {
                    <tr>
                      <td class="center mono">{{ $index + 1 }}</td>
                      <td><strong>{{ it.item_name }}</strong></td>
                      <td class="center mono">{{ it.quantity }} {{ it.unit }}</td>
                      <td class="end mono">{{ it.estimated_unit_price | number:'1.2-2' }}</td>
                      <td class="end mono font-bold">{{ ((it.quantity || 0) * (it.estimated_unit_price || 0)) | number:'1.2-2' }} ج.س</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="confirm-alert">
              <span class="ca-icon">🛡️</span>
              <div>
                <strong>تأكيد إرسال طلب الشراء:</strong>
                <span>سيتم إرسال الطلب إلى إدارة المشتريات والمراجعة المالية للبدء في مسار الاعتماد.</span>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- الإجراءات السفلية -->
      <div modal-actions class="wizard-actions">
        <div class="left-actions">
          <button type="button" class="btn ghost" (click)="cancel.emit()" [disabled]="saving()">إلغاء</button>
        </div>
        <div class="right-actions">
          @if (currentStep() > 0) {
            <button type="button" class="btn secondary" (click)="prevStep()" [disabled]="saving()">‹ السابق</button>
          }
          @if (currentStep() < steps.length - 1) {
            <button type="button" class="btn primary" (click)="nextStep()" [disabled]="!canProceed()">
              التالي ›
            </button>
          } @else {
            <button type="button" class="btn success" (click)="submit()" [disabled]="saving() || !canProceed()">
              {{ saving() ? 'جارٍ الحفظ…' : '✓ تأكيد وإرسال طلب الشراء' }}
            </button>
          }
        </div>
      </div>
    </nb-modal>
  `,
  styles: [`
    .step-content { min-height: 290px; padding: 10px 2px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    label { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; font-weight: 600; color: var(--nb-text); }
    .fld { height: 38px; padding: 0 12px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; width: 100%; box-sizing: border-box; }
    .fld:focus { outline: none; border-color: var(--nb-primary-600); }
    .fld-sm { height: 30px; padding: 0 8px; border: 1px solid var(--nb-border); border-radius: 6px; background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 12px; width: 100%; box-sizing: border-box; }
    .fld-sm.mb-4 { margin-bottom: 4px; }
    .mono { font-family: 'Consolas', 'Courier New', monospace; }
    .font-bold { font-weight: 700; }
    .center { text-align: center; }
    .end { text-align: end; }

    .dims-note { display: flex; align-items: center; gap: 10px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 12px 14px; margin-top: 14px; font-size: 12.5px; color: #0f766e; }
    .dn-ic { font-size: 18px; flex: none; }
    .ref-err { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-radius: 8px; padding: 10px 12px; font-size: 12.5px; margin-bottom: 12px; }

    .items-builder { display: flex; flex-direction: column; gap: 10px; }
    .builder-header { display: flex; justify-content: space-between; align-items: center; }
    .sec-title { font-size: 13.5px; font-weight: 700; color: var(--nb-text); }
    .table-wrap { overflow-x: auto; max-height: 230px; border: 1px solid var(--nb-border); border-radius: 8px; }
    .nb-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .nb-table th { background: var(--nb-surface-raised); padding: 8px 10px; font-size: 11px; font-weight: 700; color: var(--nb-text-muted); text-align: start; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table td { padding: 6px 8px; border-bottom: 1px solid var(--nb-border-row); }
    .btn-del { width: 26px; height: 26px; border: none; background: #fee2e2; color: #dc2626; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 700; }
    .btn-del:disabled { opacity: 0.4; cursor: not-allowed; }

    .total-summary-bar { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; font-size: 13px; }
    .total-calc { display: flex; align-items: baseline; gap: 8px; color: #0f766e; }
    .total-val { font-size: 18px; font-weight: 900; }
    .total-tafqeet-preview { font-size: 12px; font-weight: 700; color: #115e59; background: #ffffff; padding: 4px 10px; border-radius: 6px; border: 1px solid #ccfbf1; }

    .review-panel { display: flex; flex-direction: column; gap: 12px; }
    .review-card { background: var(--nb-surface-raised, #f8fafc); border: 1px solid var(--nb-border); border-radius: 8px; padding: 12px 14px; }
    .rev-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid var(--nb-border-soft); font-size: 12.5px; }
    .rev-row:last-child { border-bottom: none; }
    .rev-row .k { color: var(--nb-text-muted); font-weight: 600; }
    .rev-row .v { color: var(--nb-text); font-weight: 700; }
    .rev-row.highlight { background: rgba(15, 118, 110, 0.08); margin: 4px -14px; padding: 8px 14px; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; }
    .rev-row .v.amount { font-size: 16px; color: #0f766e; }

    .mini-table-box { border: 1px solid var(--nb-border); border-radius: 8px; padding: 8px; background: var(--nb-surface); max-height: 120px; overflow-y: auto; }
    .nb-table.mini td { padding: 4px 8px; font-size: 11.5px; }

    .confirm-alert { display: flex; gap: 10px; padding: 10px 14px; border-radius: 8px; background: #fefce8; border: 1px solid #fef08a; color: #854d0e; font-size: 12px; }
    .ca-icon { font-size: 18px; }

    .wizard-actions { display: flex; justify-content: space-between; align-items: center; width: 100%; margin-top: 10px; }
    .right-actions, .left-actions { display: flex; gap: 10px; }
    .btn { height: 38px; padding: 0 16px; font-family: inherit; font-size: 13px; font-weight: 700; border-radius: var(--nb-radius); cursor: pointer; border: none; display: inline-flex; align-items: center; justify-content: center; }
    .btn.xs { height: 28px; padding: 0 10px; font-size: 11.5px; }
    .btn.primary { background: #0f766e; color: #fff; }
    .btn.primary:hover:not(:disabled) { background: #115e59; }
    .btn.secondary { background: #e2e8f0; color: #1e293b; }
    .btn.success { background: #16a34a; color: #fff; }
    .btn.success:hover:not(:disabled) { background: #15803d; }
    .btn.ghost { background: transparent; border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; }
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
  readonly inventoryItems = signal<any[]>([]);
  readonly saving = signal(false);
  readonly refError = signal('');

  currentStep = signal(0);
  departmentId = '';
  reason = '';

  steps: string[] = [
    'القسم والسبب',
    'الأصناف والموازنة',
    'المراجعة والتأكيد',
  ];

  readonly total = computed(() =>
    this.items().reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.estimated_unit_price) || 0), 0));

  ngOnInit() {
    this.svc.getRequestReferenceData().subscribe({
      next: (res: any) => {
        const d = res?.data ?? res ?? {};
        this.departments.set(d.departments || []);
        this.accounts.set(d.accounts || []);
        this.costCenters.set(d.cost_centers || []);
        this.inventoryItems.set(d.inventory_items || []);
      },
      error: (e) => this.refError.set(`تعذّر تحميل البيانات المرجعية — ${e?.message || 'خطأ'}`),
    });
  }

  blank(): ItemRow {
    return {
      item_name: '',
      quantity: 1,
      unit: 'حبة',
      estimated_unit_price: 0,
      budget_account_id: '',
      cost_center_id: '',
      inventory_item_id: ''
    };
  }

  pickItem(index: number, invId: string) {
    const inv = this.inventoryItems().find((x) => x.id === invId);
    this.items.update((list) => list.map((row, i) => {
      if (i !== index) return row;
      if (!invId) return { ...row, inventory_item_id: '' };
      return { ...row, inventory_item_id: invId, item_name: inv?.name || row.item_name, unit: inv?.unit || row.unit };
    }));
  }

  addItem() { this.items.update(l => [...l, this.blank()]); }
  removeItem(i: number) { this.items.update(l => l.filter((_, idx) => idx !== i)); }

  onStepChange(step: number) {
    if (step <= this.currentStep() || this.canProceed()) {
      this.currentStep.set(step);
    }
  }

  nextStep() {
    if (this.canProceed() && this.currentStep() < this.steps.length - 1) {
      this.currentStep.update(s => s + 1);
    }
  }

  prevStep() {
    if (this.currentStep() > 0) {
      this.currentStep.update(s => s - 1);
    }
  }

  canProceed(): boolean {
    if (this.currentStep() === 0) {
      return !!this.departmentId && !!this.reason.trim();
    }
    if (this.currentStep() === 1) {
      const its = this.items();
      return its.length > 0 && its.every(i =>
        !!i.item_name.trim() && Number(i.quantity) > 0 && Number(i.estimated_unit_price) >= 0 &&
        !!i.budget_account_id && !!i.cost_center_id
      );
    }
    return true;
  }

  tafqeet(amt: number): string {
    return tafqeetArabic(amt, 'جنيه سوداني');
  }

  selectedDeptName(): string {
    return this.departments().find(d => d.id === this.departmentId)?.name || '—';
  }

  submit() {
    if (!this.canProceed()) return;

    const payload = {
      department_id: this.departmentId,
      requested_by: this.auth.currentUser()?.id,
      reason: this.reason.trim(),
      items: this.items().map(i => ({
        item_name: i.item_name.trim(),
        quantity: i.quantity,
        unit: i.unit || 'حبة',
        estimated_unit_price: i.estimated_unit_price,
        budget_account_id: i.budget_account_id,
        cost_center_id: i.cost_center_id,
        inventory_item_id: i.inventory_item_id || null,
      })),
    };

    this.saving.set(true);
    this.svc.createPurchaseRequest(payload as any).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('تم إنشاء طلب الشراء بنجاح.');
        this.created.emit();
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.error(e?.details?.error || e?.details?.detail || e?.message || 'تعذّر إنشاء الطلب.');
      },
    });
  }
}
