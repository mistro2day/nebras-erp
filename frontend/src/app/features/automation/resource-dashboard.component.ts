import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AutomationService } from './automation.service';
import { STUDIO_STYLES } from './studio-theme';

export interface ColumnDef { key: string; label: string; badge?: boolean; }
export interface ActionDef { verb: string; label: string; }
export interface ResourceConfig {
  title: string; subtitle: string; icon: string; resource: string;
  columns: ColumnDef[]; actions?: ActionDef[]; statusKey?: string;
}

/**
 * لوحة موارد عامة قابلة للتهيئة عبر بيانات المسار (route data.config).
 * تُعيد استخدامها شاشات: الأتمتة، مصمم القواعد، منخفض الشيفرة، DevOps، الإضافات.
 */
@Component({
  selector: 'app-resource-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="studio" dir="rtl" *ngIf="config() as cfg">
      <header class="studio-header">
        <div><h1>{{ cfg.title }}</h1><p>{{ cfg.subtitle }}</p></div>
        <button class="pill" (click)="reload()">تحديث</button>
      </header>

      <div class="stats-grid">
        <div class="stat-card"><mat-icon>{{ cfg.icon }}</mat-icon>
          <div><h3>إجمالي السجلات</h3><p class="value">{{ rows().length }}</p></div></div>
        <div class="stat-card" *ngIf="cfg.statusKey"><mat-icon>toggle_on</mat-icon>
          <div><h3>مفعّلة</h3><p class="value">{{ activeCount(cfg.statusKey) }}</p></div></div>
      </div>

      <table class="data">
        <thead>
          <tr>
            <th *ngFor="let c of cfg.columns">{{ c.label }}</th>
            <th *ngIf="cfg.actions?.length">التحكم</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of rows()">
            <td *ngFor="let c of cfg.columns">
              <span *ngIf="c.badge" class="badge" [ngClass]="row[c.key]">{{ row[c.key] }}</span>
              <span *ngIf="!c.badge">{{ render(row[c.key]) }}</span>
            </td>
            <td *ngIf="cfg.actions?.length">
              <button class="pill" *ngFor="let a of cfg.actions" (click)="run(cfg.resource, row, a.verb)">{{ a.label }}</button>
            </td>
          </tr>
          <tr *ngIf="rows().length === 0"><td [attr.colspan]="cfg.columns.length + 1" class="no-data">لا توجد سجلات.</td></tr>
        </tbody>
      </table>
      <p *ngIf="message()" class="section-title">{{ message() }}</p>
    </div>
  `,
  styles: [STUDIO_STYLES],
})
export class ResourceDashboardComponent implements OnInit {
  private api = inject(AutomationService);
  private route = inject(ActivatedRoute);

  config = signal<ResourceConfig | null>(null);
  rows = signal<any[]>([]);
  message = signal('');

  ngOnInit(): void {
    const cfg = this.route.snapshot.data['config'] as ResourceConfig;
    this.config.set(cfg);
    this.reload();
  }

  reload(): void {
    const cfg = this.config();
    if (!cfg) return;
    this.api.list(cfg.resource).subscribe((d: any) => this.rows.set(Array.isArray(d) ? d : []));
  }

  run(resource: string, row: any, verb: string): void {
    this.api.action(resource, row.id, verb).subscribe({
      next: () => { this.message.set(`تم تنفيذ "${verb}" بنجاح.`); this.reload(); },
      error: () => this.message.set(`تعذّر تنفيذ "${verb}".`),
    });
  }

  activeCount(key: string): number {
    return this.rows().filter((r) => ['active', 'enabled', 'published', 'true', true].includes(r[key])).length;
  }

  render(v: any): string {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'boolean') return v ? 'نعم' : 'لا';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }
}
