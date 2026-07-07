import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { OrganizationService, Branch, Campus, Building, Room } from '../organization.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../../shared/nebras/nb-stat-card.component';

/**
 * الهيكل التنظيمي للمدرسة — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-organization-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="نظرة عامة على الهيكل التنظيمي للمدرسة"
        subtitle="استعراض الفروع والمجمعات والمباني والقاعات الدراسية المتوفرة ومستويات الإشغال."
      ></nb-page-header>

      <div class="stats-grid">
        <nb-stat-card label="إجمالي الفروع" [value]="branches().length"></nb-stat-card>
        <nb-stat-card label="إجمالي المجمعات (Campuses)" [value]="campuses().length" valueKind="info"></nb-stat-card>
        <nb-stat-card label="المباني الأكاديمية" [value]="buildings().length"></nb-stat-card>
        <nb-stat-card label="الغرف والصفوف الدراسية" [value]="rooms().length" valueKind="success"></nb-stat-card>
      </div>

      <nb-panel title="الهيكل الإداري والمنشآت">
        <div class="branches-list">
          @for (branch of branches(); track branch.id) {
            <div class="branch-item">
              <h3>📍 {{ branch.name_ar || branch.name }} ({{ branch.code }})</h3>
              <p class="address">العنوان: {{ branch.city }}، {{ branch.address || 'غير محدد' }}</p>
              <div class="campuses-list">
                @for (campus of getCampusesForBranch(branch.id); track campus.id) {
                  <div class="campus-item">
                    <h4>🏫 مجمع: {{ campus.name }}</h4>
                    <div class="buildings-list">
                      @for (building of getBuildingsForCampus(campus.id); track building.id) {
                        <h5>🏢 مبنى: {{ building.name }}</h5>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }
          @if (branches().length === 0) {
            <div class="no-data">لا توجد فروع مسجلة حالياً.</div>
          }
        </div>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .branches-list { display: flex; flex-direction: column; gap: 12px; }
    .branch-item {
      border: 1px solid var(--nb-border-soft);
      border-radius: var(--nb-radius);
      padding: 16px;
      background: var(--nb-surface-raised);
    }
    .branch-item h3 { font-size: 14px; font-weight: 700; color: var(--nb-primary-600); margin: 0 0 4px; }
    .address { font-size: 12px; color: var(--nb-text-muted); margin: 0 0 12px; }
    .campuses-list { margin-top: 10px; padding-right: 14px; border-right: 2px solid var(--nb-primary-200); }
    .campus-item { margin-bottom: 10px; }
    .campus-item h4 { font-size: 13px; color: var(--nb-success); margin: 0; }
    .buildings-list { margin-top: 6px; padding-right: 14px; }
    .building-item h5, .buildings-list h5 { font-size: 12px; color: var(--nb-text-secondary); margin: 4px 0; }
    .no-data { text-align: center; padding: 20px; color: var(--nb-text-muted); font-size: 13px; }
  `]
})
export class OrganizationOverviewComponent implements OnInit {
  private orgService = inject(OrganizationService);

  branches = signal<Branch[]>([]);
  campuses = signal<Campus[]>([]);
  buildings = signal<Building[]>([]);
  rooms = signal<Room[]>([]);

  ngOnInit() {
    this.loadOrganizationData();
  }

  loadOrganizationData() {
    this.orgService.getBranches().subscribe(res => this.branches.set(res.data || []));
    this.orgService.getCampuses().subscribe(res => this.campuses.set(res.data || []));
    this.orgService.getBuildings().subscribe(res => this.buildings.set(res.data || []));
    this.orgService.getRooms().subscribe(res => this.rooms.set(res.data || []));
  }

  getCampusesForBranch(branchId: string): Campus[] {
    return this.campuses().filter(c => c.branch === branchId);
  }

  getBuildingsForCampus(campusId: string): Building[] {
    return this.buildings().filter(b => b.campus === campusId);
  }
}