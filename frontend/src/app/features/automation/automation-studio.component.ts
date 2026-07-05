import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AutomationService } from './automation.service';
import { STUDIO_STYLES } from './studio-theme';

interface NavItem { route: string; icon: string; title: string; desc: string; }

@Component({
  selector: 'app-automation-studio',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="studio" dir="rtl">
      <header class="studio-header">
        <div>
          <h1>منصة الأتمتة المؤسسية — Automation Studio</h1>
          <p>مصمم مسارات العمل · مصمم القواعد · المنصة منخفضة الشيفرة · العمليات · DevOps</p>
        </div>
      </header>

      <div class="stats-grid">
        <div class="stat-card">
          <mat-icon>account_tree</mat-icon>
          <div><h3>مخططات مسارات العمل</h3><p class="value">{{ diagrams() }}</p></div>
        </div>
        <div class="stat-card">
          <mat-icon>bolt</mat-icon>
          <div><h3>تدفقات الأتمتة</h3><p class="value">{{ flows() }}</p></div>
        </div>
        <div class="stat-card">
          <mat-icon>table_chart</mat-icon>
          <div><h3>جداول القرار</h3><p class="value">{{ tables() }}</p></div>
        </div>
        <div class="stat-card">
          <mat-icon>extension</mat-icon>
          <div><h3>الإضافات المثبتة</h3><p class="value">{{ plugins() }}</p></div>
        </div>
      </div>

      <div class="nav-grid">
        <a class="nav-card" *ngFor="let item of navItems" [routerLink]="item.route">
          <mat-icon>{{ item.icon }}</mat-icon>
          <h2>{{ item.title }}</h2>
          <p>{{ item.desc }}</p>
        </a>
      </div>
    </div>
  `,
  styles: [STUDIO_STYLES],
})
export class AutomationStudioComponent implements OnInit {
  private api = inject(AutomationService);

  diagrams = signal(0);
  flows = signal(0);
  tables = signal(0);
  plugins = signal(0);

  navItems: NavItem[] = [
    { route: 'workflow-designer', icon: 'account_tree', title: 'مصمم مسارات العمل المرئي',
      desc: 'كانفس سحب وإفلات لبناء العقد والوصلات والموافقات والمؤقتات، مع تحقق ومحاكاة ونشر إلى محرك مسارات العمل.' },
    { route: 'rule-designer', icon: 'rule', title: 'مصمم القواعد',
      desc: 'جداول وأشجار قرار ومجموعات قواعد فوق محرك القواعد الحالي مع محاكاة واختبار.' },
    { route: 'automation', icon: 'bolt', title: 'محرك الأتمتة',
      desc: 'محفّزات الأحداث والجدولة والـ Webhooks وإجراءات تنفّذ عبر المحركات القائمة.' },
    { route: 'lowcode', icon: 'dashboard_customize', title: 'الاستوديو منخفض الشيفرة',
      desc: 'باني الكيانات والنماذج والصفحات والـ APIs — يولّد شيفرة متوافقة مع DDD.' },
    { route: 'operations', icon: 'monitor_heart', title: 'مركز العمليات',
      desc: 'صحة النظام والطوابير والعمّال والكاش وقواعد البيانات والتنبيهات التشغيلية.' },
    { route: 'devops', icon: 'rocket_launch', title: 'مركز DevOps',
      desc: 'البيئات والأسرار ورايات الميزات وسجل النشر والتراجع ووضع الصيانة (واجهات تحضيرية).' },
    { route: 'plugins', icon: 'extension', title: 'مدير الإضافات',
      desc: 'سجل الإضافات والإصدارات والاعتماديات والفحص الأمني والتثبيت الآمن للمستأجرين.' },
  ];

  ngOnInit(): void {
    this.api.list('workflow-diagrams').subscribe((d: any) => this.diagrams.set(d?.length ?? 0));
    this.api.list('flows').subscribe((d: any) => this.flows.set(d?.length ?? 0));
    this.api.list('decision-tables').subscribe((d: any) => this.tables.set(d?.length ?? 0));
    this.api.list('plugin-installations').subscribe((d: any) => this.plugins.set(d?.length ?? 0));
  }
}
