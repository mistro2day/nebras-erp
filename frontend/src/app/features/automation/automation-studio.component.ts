import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AutomationService } from './automation.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';

interface NavItem { route: string; iconSvg: string; title: string; desc: string; }

@Component({
  selector: 'app-automation-studio',
  standalone: true,
  imports: [CommonModule, RouterLink, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <!-- Nebras Page Header -->
      <nb-page-header
        title="منصة الأتمتة المؤسسية (Automation Studio)"
        subtitle="مصمم مسارات العمل · مصمم القواعد وجداول القرار · المنصة منخفضة الشيفرة · مركز العمليات · DevOps"
      ></nb-page-header>

      <!-- Stats Grid Row -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon purple">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </div>
          <div class="stat-info">
            <span class="stat-val">{{ diagrams() }}</span>
            <span class="stat-lbl">مخططات مسارات العمل</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <div class="stat-info">
            <span class="stat-val">{{ flows() }}</span>
            <span class="stat-lbl">تدفقات الأتمتة</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
          </div>
          <div class="stat-info">
            <span class="stat-val">{{ tables() }}</span>
            <span class="stat-lbl">جداول القرار</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon amber">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          </div>
          <div class="stat-info">
            <span class="stat-val">{{ plugins() }}</span>
            <span class="stat-lbl">الإضافات المثبتة</span>
          </div>
        </div>
      </div>

      <!-- Nebras Panel for Main Navigation Grid -->
      <nb-panel title="محركات وأدوات الأتمتة المتاحة" subtitle="اختر الأداة المطلوبة للبدء بالتصميم أو المراقبة">
        <div class="nav-grid">
          <a class="nav-card" *ngFor="let item of navItems" [routerLink]="item.route">
            <div class="nav-icon-wrapper" [innerHTML]="item.iconSvg"></div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.desc }}</p>
          </a>
        </div>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 16px; padding: 20px; width: 100%; box-sizing: border-box; }

    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .stat-card {
      background: var(--nb-surface, #ffffff); border: 1px solid var(--nb-border, #e5e7eb);
      border-radius: var(--nb-radius-card, 12px); padding: 16px; display: flex; align-items: center; gap: 14px;
    }
    .stat-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .stat-icon.purple { background: #eef2ff; color: #4f46e5; }
    .stat-icon.blue { background: #e0f2fe; color: #0284c7; }
    .stat-icon.green { background: #dcfce7; color: #16a34a; }
    .stat-icon.amber { background: #fef3c7; color: #d97706; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-val { font-size: 1.4rem; font-weight: 800; color: var(--nb-text, #111827); }
    .stat-lbl { font-size: 12px; color: var(--nb-text-muted, #6b7280); font-weight: 500; }

    .nav-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .nav-card {
      background: var(--nb-surface, #ffffff); border: 1px solid var(--nb-border, #e5e7eb);
      border-radius: 12px; padding: 20px; text-decoration: none; color: inherit; display: flex; flex-direction: column;
      transition: all 0.2s ease;
    }
    .nav-card:hover { transform: translateY(-2px); border-color: #c7d2fe; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .nav-icon-wrapper {
      width: 40px; height: 40px; border-radius: 10px; background: #eef2ff; color: #4f46e5;
      display: flex; align-items: center; justify-content: center; margin-bottom: 12px;
    }
    .nav-card h3 { font-size: 15px; font-weight: 700; color: var(--nb-text, #111827); margin: 0 0 6px 0; }
    .nav-card p { font-size: 13px; color: var(--nb-text-muted, #6b7280); line-height: 1.5; margin: 0; }
  `],
})
export class AutomationStudioComponent implements OnInit {
  private api = inject(AutomationService);

  diagrams = signal(0);
  flows = signal(0);
  tables = signal(0);
  plugins = signal(0);

  navItems: NavItem[] = [
    {
      route: 'workflow-designer',
      iconSvg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
      title: 'مصمم مسارات العمل المرئي',
      desc: 'كانفس لبناء العقد والوصلات والموافقات، مع تحقق ومحاكاة ونشر إلى محرك مسارات العمل.',
    },
    {
      route: 'rule-designer',
      iconSvg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>',
      title: 'مصمم القواعد وجداول القرار',
      desc: 'جداول وأشجار قرار ومجموعات قواعد فوق محرك القواعد الحالي مع محاكاة واختبار.',
    },
    {
      route: 'automation',
      iconSvg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
      title: 'محرك أتمتة الأحداث',
      desc: 'محفّزات الأحداث والجدولة والـ Webhooks وإجراءات تنفّذ عبر المحركات القائمة.',
    },
    {
      route: 'lowcode',
      iconSvg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
      title: 'الاستوديو منخفض الشيفرة',
      desc: 'باني الكيانات والنماذج والصفحات والـ APIs — يولّد شيفرة متوافقة مع DDD.',
    },
    {
      route: 'operations',
      iconSvg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
      title: 'مركز العمليات والمراقبة',
      desc: 'صحة النظام والطوابير والعمّال والكاش وقواعد البيانات والتنبيهات التشغيلية.',
    },
    {
      route: 'devops',
      iconSvg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>',
      title: 'مركز DevOps ورايات الميزات',
      desc: 'البيئات والأسرار ورايات الميزات وسجل النشر والتراجع ووضع الصيانة.',
    },
    {
      route: 'plugins',
      iconSvg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
      title: 'مدير الإضافات المخصصة',
      desc: 'سجل الإضافات والإصدارات والاعتماديات والفحص الأمني والتثبيت الآمن للمستأجرين.',
    },
  ];

  ngOnInit(): void {
    this.api.list('workflow-diagrams').subscribe((d: any) => this.diagrams.set(d?.length ?? 2));
    this.api.list('flows').subscribe((d: any) => this.flows.set(d?.length ?? 3));
    this.api.list('decision-tables').subscribe((d: any) => this.tables.set(d?.length ?? 2));
    this.api.list('plugin-installations').subscribe((d: any) => this.plugins.set(d?.length ?? 2));
  }
}
