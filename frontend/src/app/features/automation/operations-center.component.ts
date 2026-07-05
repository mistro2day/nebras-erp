import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AutomationService } from './automation.service';
import { STUDIO_STYLES } from './studio-theme';

@Component({
  selector: 'app-operations-center',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="studio" dir="rtl">
      <header class="studio-header">
        <div><h1>مركز العمليات المؤسسية</h1><p>مراقبة صحة النظام والمكوّنات والتنبيهات التشغيلية.</p></div>
        <button class="pill" (click)="collect()">جمع لقطة صحة الآن</button>
      </header>

      <div class="stats-grid">
        <div class="stat-card" *ngFor="let c of components()">
          <mat-icon>{{ iconFor(c.key) }}</mat-icon>
          <div>
            <h3>{{ labelFor(c.key) }}</h3>
            <p class="value"><span class="badge" [ngClass]="c.status">{{ c.status }}</span></p>
            <small style="color:#64748b">{{ c.latency_ms }} ms</small>
          </div>
        </div>
        <div class="stat-card"><mat-icon>notifications_active</mat-icon>
          <div><h3>تنبيهات مفتوحة</h3><p class="value">{{ openAlerts() }}</p></div></div>
      </div>

      <h2 class="section-title">التنبيهات التشغيلية</h2>
      <table class="data">
        <thead><tr><th>المكوّن</th><th>الخطورة</th><th>العنوان</th><th>الحالة</th></tr></thead>
        <tbody>
          <tr *ngFor="let a of alerts()">
            <td><code>{{ a.component }}</code></td>
            <td><span class="badge" [ngClass]="a.severity === 'critical' ? 'failed' : 'pending'">{{ a.severity }}</span></td>
            <td>{{ a.title }}</td>
            <td><span class="badge" [ngClass]="a.is_resolved ? 'active' : 'pending'">{{ a.is_resolved ? 'مغلق' : 'مفتوح' }}</span></td>
          </tr>
          <tr *ngIf="alerts().length === 0"><td colspan="4" class="no-data">لا توجد تنبيهات — كل الأنظمة سليمة.</td></tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [STUDIO_STYLES],
})
export class OperationsCenterComponent implements OnInit {
  private api = inject(AutomationService);
  components = signal<{ key: string; status: string; latency_ms: number }[]>([]);
  openAlerts = signal(0);
  alerts = signal<any[]>([]);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.operationsOverview().subscribe((o: any) => {
      const comps = o?.components ?? {};
      this.components.set(Object.keys(comps).map((k) => ({ key: k, status: comps[k].status, latency_ms: comps[k].latency_ms })));
      this.openAlerts.set(o?.open_alerts ?? 0);
    });
    this.api.list('operations-alerts').subscribe((a: any) => this.alerts.set(Array.isArray(a) ? a : []));
  }

  collect(): void { this.api.collectHealth().subscribe(() => this.load()); }

  iconFor(k: string): string {
    return { database: 'database', cache: 'memory', celery: 'engineering', api: 'api', redis: 'bolt' }[k] ?? 'monitor_heart';
  }
  labelFor(k: string): string {
    return { database: 'قاعدة البيانات', cache: 'الكاش', celery: 'عمّال Celery', api: 'واجهات API', redis: 'Redis' }[k] ?? k;
  }
}
