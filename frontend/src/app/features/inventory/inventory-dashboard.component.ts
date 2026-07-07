import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { InventoryService } from './inventory.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../shared/nebras/nb-stat-card.component';

/**
 * منصة المستودعات والمخزون — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-inventory-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="منصة إدارة المستودعات والتحكم في المخزون"
        subtitle="التحكم الفوري بالأرصدة، مستويات إعادة الطلب، عمليات الصرف والاستلام، والتقييم المخزني"
      >
        <button class="nb-btn-secondary" (click)="loadDashboard()">تحديث البيانات</button>
      </nb-page-header>

      @if (inventoryService.stats(); as stats) {
        <div class="stats-grid">
          <nb-stat-card label="إجمالي الأصناف" [value]="stats.total_items" suffix="صنف"></nb-stat-card>
          <nb-stat-card label="أصناف تحت حد الطلب" [value]="stats.low_stock" suffix="صنف" [valueKind]="stats.low_stock ? 'warning' : 'default'"></nb-stat-card>
          <nb-stat-card label="أصناف منتهية" [value]="stats.out_of_stock" suffix="صنف" [valueKind]="stats.out_of_stock ? 'danger' : 'default'"></nb-stat-card>
          <nb-stat-card label="إجمالي قيمة المخزون" [value]="(stats.total_value | currency:'SAR ':'symbol':'1.2-2') || '—'" valueKind="success"></nb-stat-card>
        </div>
      }

      <div class="tables-section">
        <nb-panel title="الأصناف والبنود المخزنية" [flush]="true">
          <div class="tbl">
            <div class="tbl-head it"><span>رمز الصنف (SKU)</span><span>اسم الصنف</span><span>النوع</span></div>
            @for (row of items; track row.id) {
              <div class="tbl-row it">
                <span>{{ row.sku }}</span>
                <span class="strong">{{ row.name_ar }}</span>
                <span><span class="nb-badge-info">{{ getTypeText(row.item_type) }}</span></span>
              </div>
            }
            @if (items.length === 0) { <div class="tbl-empty">لا توجد أصناف.</div> }
          </div>
        </nb-panel>

        <nb-panel title="المستودعات والمخازن" [flush]="true">
          <div class="tbl">
            <div class="tbl-head wh"><span>رمز المستودع</span><span>اسم المستودع</span><span>النوع</span></div>
            @for (row of warehouses; track row.id) {
              <div class="tbl-row wh">
                <span>{{ row.code }}</span>
                <span class="strong">{{ row.name_ar }}</span>
                <span>
                  @if (!row.is_virtual) { <span class="nb-badge-success">مستودع فعلي</span> }
                  @else { <span class="nb-badge-warning">افتراضي/عبور</span> }
                </span>
              </div>
            }
            @if (warehouses.length === 0) { <div class="tbl-empty">لا توجد مستودعات.</div> }
          </div>
        </nb-panel>
      </div>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .tables-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 960px) { .tables-section { grid-template-columns: 1fr; } }
    .tbl { display: flex; flex-direction: column; }
    .tbl-head, .tbl-row {
      display: grid;
      grid-template-columns: 1.2fr 1.8fr 1fr;
      gap: 8px;
      padding: 9px 16px;
      align-items: center;
    }
    .tbl-head {
      background: var(--nb-surface-raised);
      border-bottom: 1px solid var(--nb-border-soft);
      padding: 8px 16px;
      font-size: 11px;
      font-weight: 700;
      color: var(--nb-text-muted);
    }
    .tbl-row {
      border-bottom: 1px solid var(--nb-border-row);
      font-size: 13px;
      color: var(--nb-text);
    }
    .tbl-row:last-child { border-bottom: none; }
    .tbl-row:hover { background: var(--nb-surface-raised); }
    .strong { font-weight: 600; }
    .tbl-empty { padding: 28px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
  `]
})
export class InventoryDashboardComponent implements OnInit {
  inventoryService = inject(InventoryService);
  items: any[] = [];
  warehouses: any[] = [];
  itemColumns: string[] = ['sku', 'name', 'type'];
  whColumns: string[] = ['code', 'name', 'status'];

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.inventoryService.getDashboardStats().subscribe();
    this.inventoryService.getInventoryItems().subscribe(data => {
      this.items = data;
    });
    this.inventoryService.getWarehouses().subscribe(data => {
      this.warehouses = data;
    });
  }

  getTypeText(type: string): string {
    switch (type) {
      case 'stock': return 'مخزني';
      case 'non_stock': return 'خدمي';
      case 'consumable': return 'استهلاكي';
      case 'medical': return 'طبي';
      case 'library': return 'مكتبة';
      case 'laboratory': return 'مختبر';
      case 'fixed_asset': return 'أصل ثابت';
      default: return type;
    }
  }
}
