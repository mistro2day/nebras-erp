import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { CrmService } from '../crm.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../../shared/nebras/nb-stat-card.component';

@Component({
  selector: 'app-crm-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatTabsModule, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="لوحة تحكم إدارة علاقات العملاء (CRM)"
        subtitle="متابعة طلبات الاستقطاب، حملات التسويق، رضا أولياء الأمور، وقضايا وشكاوى الدعم الفني."
      >
        <button class="nb-btn-secondary" (click)="loadKPIs()">تحديث لوحة التحليلات</button>
      </nb-page-header>

      <div class="stats-grid">
        <nb-stat-card label="العملاء المحتملين الجدد" [value]="kpis().total_leads" suffix="عميل" valueKind="info"></nb-stat-card>
        <nb-stat-card label="نسبة تحويل الطلاب" [value]="kpis().lead_conversion_rate" suffix="%" valueKind="success"></nb-stat-card>
        <nb-stat-card label="الحالات والشكاوى المفتوحة" [value]="kpis().open_cases" suffix="حالة" valueKind="warning"></nb-stat-card>
        <nb-stat-card label="مؤشر رضا أولياء الأمور" [value]="kpis().satisfaction_score + ' / 5'"></nb-stat-card>
      </div>

      <div class="quick-nav-cards">
        <a routerLink="/crm/leads" class="nav-card">
          <div class="nav-icon">👥</div>
          <div class="nav-meta">
            <strong>استقطاب والعملاء المحتملين</strong>
            <span>متابعة الـ Leads وتحويلهم إلى مرشحين للقبول</span>
          </div>
          <span class="arrow">➔</span>
        </a>
        <a routerLink="/crm/cases" class="nav-card">
          <div class="nav-icon">📩</div>
          <div class="nav-meta">
            <strong>تذاكر الدعم والشكاوى</strong>
            <span>متابعة الشكاوى والتصعيد الإداري</span>
          </div>
          <span class="arrow">➔</span>
        </a>
        <a routerLink="/crm/surveys" class="nav-card">
          <div class="nav-icon">📊</div>
          <div class="nav-meta">
            <strong>استطلاعات الرأي والرضا</strong>
            <span>نتائج قياس رضا أولياء الأمور والطلاب</span>
          </div>
          <span class="arrow">➔</span>
        </a>
      </div>

      <nb-panel [flush]="true">
        <mat-tab-group class="nb-tabs">
          <mat-tab label="متابعة قمع الاستقطاب (Lead Funnel)">
            <div class="list">
              <h3>أحدث العملاء المحتملين والتفاعل</h3>
              @for (lead of leads(); track lead.name) {
                <div class="row">
                  <div>
                    <strong>{{ lead.name }}</strong>
                    <span class="meta">درجة الاهتمام: {{ lead.interest === 'high' ? 'عالية جداً' : 'متوسطة' }} | القناة: {{ lead.source }}</span>
                  </div>
                  <span [class]="lead.interest === 'high' ? 'nb-badge-success' : 'nb-badge-warning'">
                    {{ lead.interest === 'high' ? 'عالية' : 'متوسطة' }}
                  </span>
                </div>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .quick-nav-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .nav-card { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-lg, 10px); padding: 14px 16px; display: flex; align-items: center; gap: 12px; text-decoration: none; color: inherit; transition: border-color 0.2s, box-shadow 0.2s; }
    .nav-card:hover { border-color: var(--nb-primary-600); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .nav-icon { font-size: 24px; }
    .nav-meta { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .nav-meta strong { font-size: 13.5px; color: var(--nb-text); }
    .nav-meta span { font-size: 11.5px; color: var(--nb-text-muted); }
    .arrow { font-size: 14px; color: var(--nb-primary-600); }
    .nb-tabs { padding: 4px 8px 8px; }
    .list { padding: 16px; }
    .list h3 { font-weight: 700; color: var(--nb-text); margin: 0 0 14px; font-size: 14px; }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--nb-border-soft); }
    .row:last-child { border-bottom: none; }
    .row strong { display: block; font-size: 13px; color: var(--nb-text); }
    .row .meta { font-size: 11px; color: var(--nb-text-muted); }
    .nb-btn-secondary { background: var(--nb-surface); border: 1px solid var(--nb-border); color: var(--nb-text); padding: 6px 14px; border-radius: var(--nb-radius); font-size: 13px; cursor: pointer; }
    .nb-badge-success { background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .nb-badge-warning { background: #fef9c3; color: #854d0e; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
  `]
})
export class CrmDashboardComponent {
  private crmService = inject(CrmService);

  kpis = signal({
    total_leads: 148,
    active_prospects: 62,
    open_cases: 12,
    satisfaction_score: 4.6,
    lead_conversion_rate: 65.4,
  });

  leads = signal([
    { name: 'سالم العلي', interest: 'high', source: 'إعلان فيسبوك' },
    { name: 'فهد المطيري', interest: 'medium', source: 'زيارة مباشرة لمعرض القبول' },
    { name: 'نورة الدوسري', interest: 'high', source: 'الموقع الإلكتروني الرسمي' }
  ]);

  constructor() {
    this.loadKPIs();
  }

  loadKPIs(): void {
    this.crmService.getDashboardKPIs().subscribe((data) => this.kpis.set(data));
  }
}
