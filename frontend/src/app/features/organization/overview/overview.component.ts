import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrganizationService, Branch, Campus, Building, Room } from '../organization.service';

@Component({
  selector: 'app-organization-overview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overview-container" dir="rtl">
      <div class="header">
        <h1>نظرة عامة على الهيكل التنظيمي للمدرسة</h1>
        <p>استعراض الفروع والمجمعات والمباني والقاعات الدراسية المتوفرة ومستويات الإشغال.</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="title">إجمالي الفروع</div>
          <div class="value">{{ branches().length }}</div>
        </div>
        <div class="stat-card">
          <div class="title">إجمالي المجمعات (Campuses)</div>
          <div class="value">{{ campuses().length }}</div>
        </div>
        <div class="stat-card">
          <div class="title">المباني الأكاديمية</div>
          <div class="value">{{ buildings().length }}</div>
        </div>
        <div class="stat-card">
          <div class="title">الغرف والصفوف الدراسية</div>
          <div class="value">{{ rooms().length }}</div>
        </div>
      </div>

      <div class="tree-section">
        <h2>الهيكل الإداري والمنشآت</h2>
        <div class="branches-list">
          <div *ngFor="let branch of branches()" class="branch-item">
            <h3>📍 {{ branch.name_ar || branch.name }} ({{ branch.code }})</h3>
            <p class="address">العنوان: {{ branch.city }}، {{ branch.address || 'غير محدد' }}</p>
            
            <div class="campuses-list">
              <div *ngFor="let campus of getCampusesForBranch(branch.id)" class="campus-item">
                <h4>🏫 مجمع: {{ campus.name }}</h4>
                
                <div class="buildings-list">
                  <div *ngFor="let building of getBuildingsForCampus(campus.id)" class="building-item">
                    <h5>🏢 مبنى: {{ building.name }}</h5>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .overview-container {
      padding: 24px;
    }
    .header {
      margin-bottom: 32px;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 700;
      color: #f3f4f6;
    }
    .header p {
      color: #9ca3af;
      font-size: 14px;
      margin-top: 4px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }
    .stat-card {
      background-color: var(--surface-color, #1f2937);
      border: 1px solid var(--border-color, #374151);
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .stat-card .title {
      font-size: 13px;
      color: #9ca3af;
      margin-bottom: 8px;
    }
    .stat-card .value {
      font-size: 28px;
      font-weight: 700;
      color: #f3f4f6;
    }
    .tree-section {
      background-color: var(--surface-color, #1f2937);
      border: 1px solid var(--border-color, #374151);
      border-radius: 12px;
      padding: 24px;
    }
    .tree-section h2 {
      font-size: 18px;
      color: #f3f4f6;
      margin-bottom: 24px;
    }
    .branch-item {
      border: 1px solid #374151;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      background-color: #111827;
    }
    .branch-item h3 {
      font-size: 16px;
      color: #3b82f6;
      margin-bottom: 4px;
    }
    .address {
      font-size: 13px;
      color: #9ca3af;
      margin-bottom: 12px;
    }
    .campuses-list {
      margin-top: 12px;
      padding-right: 16px;
      border-right: 2px solid #3b82f6;
    }
    .campus-item {
      margin-bottom: 12px;
    }
    .campus-item h4 {
      font-size: 14px;
      color: #10b981;
    }
    .buildings-list {
      margin-top: 8px;
      padding-right: 16px;
    }
    .building-item h5 {
      font-size: 13px;
      color: #d1d5db;
    }
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