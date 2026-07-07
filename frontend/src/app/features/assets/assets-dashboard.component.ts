import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { AssetsService } from './assets.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../shared/nebras/nb-stat-card.component';

/**
 * منصة الأصول الثابتة — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-assets-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="منصة إدارة الأصول الثابتة ودورة حياة الأصل"
        subtitle="سجل الأصول الموثق، الرسملة الفورية، دورات الإهلاك المحاسبي، والاستبعاد والتصفية"
      >
        <button class="nb-btn-secondary" (click)="loadDashboard()">تحديث البيانات</button>
      </nb-page-header>

      @if (assetsService.stats(); as stats) {
        <div class="stats-grid">
          <nb-stat-card label="إجمالي سجل الأصول" [value]="stats.total_assets" suffix="أصل"></nb-stat-card>
          <nb-stat-card label="الأصول المرسملة والنشطة" [value]="stats.capitalized_assets" suffix="أصل" valueKind="success"></nb-stat-card>
          <nb-stat-card label="صافي القيمة الدفترية" [value]="(stats.net_book_value | currency:'SAR ':'symbol':'1.2-2') || '—'" valueKind="info"></nb-stat-card>
          <nb-stat-card label="إهلاك الشهر الجاري" [value]="(stats.depr_mtd | currency:'SAR ':'symbol':'1.2-2') || '—'" valueKind="warning"></nb-stat-card>
        </div>
      }

      <nb-panel title="سجل الأصول الثابتة والممتلكات" [flush]="true">
        <div class="tbl">
          <div class="tbl-head">
            <span>رقم الأصل</span><span>اسم الأصل</span><span>تكلفة الاقتناء</span><span>القيمة الدفترية الحالية</span><span>الحالة</span>
          </div>
          @for (row of assets; track row.id) {
            <div class="tbl-row">
              <span>{{ row.asset_number }}</span>
              <span class="strong">{{ row.name_ar }}</span>
              <span>{{ row.acquisition_cost | currency:'SAR ' }}</span>
              <span class="strong">{{ row.book_value | currency:'SAR ' }}</span>
              <span><span [class]="getStatusClass(row.status)">{{ getStatusText(row.status) }}</span></span>
            </div>
          }
          @if (assets.length === 0) { <div class="tbl-empty">لا توجد أصول مسجلة.</div> }
        </div>
      </nb-panel>
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
    .tbl { display: flex; flex-direction: column; }
    .tbl-head, .tbl-row {
      display: grid;
      grid-template-columns: 1fr 1.6fr 1.2fr 1.2fr 1fr;
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
export class AssetsDashboardComponent implements OnInit {
  assetsService = inject(AssetsService);
  assets: any[] = [];
  columns: string[] = ['asset_number', 'name', 'cost', 'book_value', 'status'];

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.assetsService.getDashboardStats().subscribe();
    this.assetsService.getAssets().subscribe(data => {
      this.assets = data;
    });
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'registered': return 'مسجل';
      case 'capitalized': return 'مرسمل ونشط';
      case 'disposed': return 'مستبعد/مباع';
      case 'retired': return 'متقاعد';
      case 'maintenance': return 'صيانة';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'registered': return 'nb-badge-info';
      case 'capitalized': return 'nb-badge-success';
      case 'disposed': return 'nb-badge-danger';
      case 'retired': return 'nb-badge-warning';
      case 'maintenance': return 'nb-badge-warning';
      default: return 'nb-badge-info';
    }
  }
}
