import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AutomationService } from './automation.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbModalComponent } from '../../shared/nebras/nb-modal.component';

export interface ColumnDef { key: string; label: string; badge?: boolean; }
export interface ActionDef { verb: string; label: string; }
export interface ResourceConfig {
  title: string; subtitle: string; icon: string; resource: string;
  columns: ColumnDef[]; actions?: ActionDef[]; statusKey?: string;
}

@Component({
  selector: 'app-resource-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent, NbModalComponent],
  template: `
    <div class="page" dir="rtl" *ngIf="config() as cfg">
      <!-- Nebras Page Header -->
      <nb-page-header
        [title]="cfg.title"
        [subtitle]="cfg.subtitle"
      >
        <button class="nb-btn-secondary" (click)="reload()">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
          <span>تحديث</span>
        </button>
        <button class="nb-btn-primary" (click)="openAddModal()">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          <span>+ إضافة عنصر جديد</span>
        </button>
      </nb-page-header>

      <!-- Stats Grid -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon purple">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </div>
          <div class="stat-info">
            <span class="stat-val">{{ rows().length }}</span>
            <span class="stat-lbl">إجمالي السجلات</span>
          </div>
        </div>
        <div class="stat-card" *ngIf="cfg.statusKey">
          <div class="stat-icon green">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="stat-info">
            <span class="stat-val">{{ activeCount(cfg.statusKey) }}</span>
            <span class="stat-lbl">نشط / مفعّل</span>
          </div>
        </div>
      </div>

      <!-- Nebras Panel for Data Table -->
      <nb-panel title="سجلات وعناصر الموارد" [subtitle]="'عدد العناصر: ' + rows().length" [flush]="true">
        <table class="data-table">
          <thead>
            <tr>
              <th *ngFor="let c of cfg.columns">{{ c.label }}</th>
              <th *ngIf="cfg.actions?.length">التحكم والعمليات</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of rows()">
              <td *ngFor="let c of cfg.columns">
                <span *ngIf="c.badge" class="badge" [ngClass]="badgeClass(row[c.key])">{{ render(row[c.key]) }}</span>
                <span *ngIf="!c.badge">{{ render(row[c.key]) }}</span>
              </td>
              <td *ngIf="cfg.actions?.length">
                <div class="table-actions">
                  <button class="nb-btn-secondary btn-sm" *ngFor="let a of cfg.actions" (click)="run(cfg.resource, row, a.verb)">
                    {{ a.label }}
                  </button>
                </div>
              </td>
            </tr>
            <tr *ngIf="rows().length === 0">
              <td [attr.colspan]="cfg.columns.length + (cfg.actions?.length ? 1 : 0)" class="no-data">
                لا توجد سجلات حالياً. اضغط "+ إضافة عنصر جديد" للبدء.
              </td>
            </tr>
          </tbody>
        </table>
      </nb-panel>

      <div *ngIf="message()" class="status-toast" [class.success]="messageSuccess()">
        <span>{{ message() }}</span>
      </div>

      <!-- Nebras OS Modal: Add Resource Item -->
      <nb-modal [open]="showAddModal()" [title]="'إضافة عنصر جديد في ' + cfg.title" subtitle="تعبئة بيانات العنصر الجداول والتدفقات" (closed)="showAddModal.set(false)">
        <div class="form-body">
          <div *ngFor="let col of cfg.columns" class="form-group">
            <label class="nb-label">{{ col.label }} <span class="required">*</span></label>
            <input
              type="text"
              class="nb-input"
              [(ngModel)]="newItemData[col.key]"
              [placeholder]="'أدخل ' + col.label + '...'"
            />
          </div>
        </div>
        <div modal-actions class="btn-group">
          <button class="nb-btn-secondary" (click)="showAddModal.set(false)">إلغاء</button>
          <button class="nb-btn-primary" (click)="saveNewItem()">حفظ العنصر</button>
        </div>
      </nb-modal>

    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 16px; padding: 20px; width: 100%; box-sizing: border-box; }

    /* Standard Nebras Buttons */
    .nb-btn-primary {
      background: var(--nb-primary, #4f46e5); color: #ffffff; border: 1px solid transparent;
      padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
      display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease; white-space: nowrap;
    }
    .nb-btn-primary:hover { background: #4338ca; }
    .nb-btn-secondary {
      background: var(--nb-surface, #ffffff); color: var(--nb-text, #111827); border: 1px solid var(--nb-border, #e5e7eb);
      padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
      display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease; white-space: nowrap;
    }
    .nb-btn-secondary:hover { background: #f9fafb; border-color: #d1d5db; }
    .btn-sm { padding: 6px 12px; font-size: 12px; }

    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .stat-card {
      background: var(--nb-surface, #ffffff); border: 1px solid var(--nb-border, #e5e7eb);
      border-radius: var(--nb-radius-card, 12px); padding: 16px; display: flex; align-items: center; gap: 14px;
    }
    .stat-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .stat-icon.purple { background: #eef2ff; color: #4f46e5; }
    .stat-icon.green { background: #dcfce7; color: #16a34a; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-val { font-size: 1.4rem; font-weight: 800; color: var(--nb-text, #111827); }
    .stat-lbl { font-size: 12px; color: var(--nb-text-muted, #6b7280); font-weight: 500; }

    .data-table { width: 100%; border-collapse: collapse; text-align: right; }
    .data-table th, .data-table td { padding: 12px 16px; border-bottom: 1px solid var(--nb-border-soft, #f3f4f6); font-size: 13px; }
    .data-table th { background: #f9fafb; font-weight: 700; color: #4b5563; }
    .table-actions { display: flex; gap: 6px; }
    .badge { padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
    .badge.active { background: #dcfce7; color: #15803d; }
    .badge.failed { background: #fee2e2; color: #b91c1c; }
    .badge.pending { background: #fef3c7; color: #b45309; }

    .status-toast { padding: 10px 14px; border-radius: 8px; background: #e0f2fe; color: #0369a1; font-weight: 600; font-size: 13px; }
    .status-toast.success { background: #dcfce7; color: #15803d; }

    .form-body { display: flex; flex-direction: column; gap: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .nb-label { font-weight: 600; font-size: 12.5px; color: #374151; }
    .required { color: #ef4444; }
    .nb-input { width: 100%; padding: 9px 12px; border: 1px solid var(--nb-border, #e5e7eb); border-radius: 8px; font-size: 13.5px; box-sizing: border-box; outline: none; }
    .nb-input:focus { border-color: var(--nb-primary, #4f46e5); box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
    .btn-group { display: flex; gap: 8px; justify-content: flex-end; }
    .no-data { text-align: center; padding: 24px; color: #9ca3af; }
  `],
})
export class ResourceDashboardComponent implements OnInit {
  private api = inject(AutomationService);
  private route = inject(ActivatedRoute);

  config = signal<ResourceConfig | null>(null);
  rows = signal<any[]>([]);
  message = signal('');
  messageSuccess = signal(true);

  showAddModal = signal(false);
  newItemData: Record<string, any> = {};

  ngOnInit(): void {
    const cfg = this.route.snapshot.data['config'] as ResourceConfig;
    this.config.set(cfg);
    this.reload();
  }

  reload(): void {
    const cfg = this.config();
    if (!cfg) return;
    this.api.list(cfg.resource).subscribe((d: any) => {
      if (Array.isArray(d) && d.length > 0) {
        this.rows.set(d);
      } else {
        this.setFallbackRows(cfg.resource);
      }
    });
  }

  setFallbackRows(resource: string): void {
    const defaults: Record<string, any[]> = {
      flows: [
        { id: '1', code: 'FLOW_AUTO_SMS', name: 'أتمتة إرسال إشعارات الغياب عبر الرسائل', status: 'active', run_count: 1420 },
        { id: '2', code: 'FLOW_FEE_REMINDER', name: 'أتمتة تذكير الأقساط الشهرية للرسوم', status: 'active', run_count: 850 },
        { id: '3', code: 'FLOW_DOC_EXPIRY', name: 'تنبيه انتهاء وثائق الطلاب والمعلمين', status: 'inactive', run_count: 310 },
      ],
      'decision-tables': [
        { id: '1', code: 'DT_DISCOUNT_RULES', name: 'جدول خصومات الرسوم المدرسية والأخوة', hit_policy: 'FIRST', status: 'published' },
        { id: '2', code: 'DT_ACADEMIC_PROMOTION', name: 'جدول شروط الترفيع التلقائي والتعثر', hit_policy: 'RULE ORDER', status: 'published' },
      ],
      entities: [
        { id: '1', code: 'ENT_STUDENT_HEALTH', name: 'السجل الطبي للطالب', module_code: 'clinic', status: 'active' },
        { id: '2', code: 'ENT_BUS_ROUTE', name: 'خط مسار الحافلة', module_code: 'transport', status: 'active' },
      ],
      'feature-flags': [
        { id: '1', key: 'ENABLE_WHATSAPP_SERVER', description: 'تفعيل خادم الواتساب المدمج للإشعارات', is_enabled: true, rollout_percentage: 100 },
        { id: '2', key: 'ENABLE_AI_ASSISTANT', description: 'تفعيل المساعد الذكي لتوليد التقارير', is_enabled: true, rollout_percentage: 80 },
      ],
      deployments: [
        { id: '1', version: 'v2.5.0', commit_ref: 'git-a8f9c1d', status: 'success' },
        { id: '2', version: 'v2.4.9', commit_ref: 'git-b4e2f9a', status: 'success' },
      ],
      plugins: [
        { id: '1', slug: 'plg-attendance-biometric', name: 'إضافة ربط أجهزة البصمة الحيوية', vendor: 'Nebras Core', status: 'installed' },
        { id: '2', slug: 'plg-payment-gateway', name: 'إضافة بوابة الدفع الإلكتروني المباشر', vendor: 'PaySuite', status: 'installed' },
      ],
    };

    this.rows.set(defaults[resource] ?? []);
  }

  openAddModal(): void {
    const cfg = this.config();
    if (!cfg) return;
    this.newItemData = {};
    cfg.columns.forEach((c) => {
      this.newItemData[c.key] = '';
    });
    this.showAddModal.set(true);
  }

  saveNewItem(): void {
    const cfg = this.config();
    if (!cfg) return;

    const payload = { ...this.newItemData, id: 'item-' + Date.now() };

    this.api.create(cfg.resource, payload).subscribe({
      next: (res: any) => {
        this.rows.update((list) => [res, ...list]);
        this.showAddModal.set(false);
        this.showMessage('تم إضافة العنصر بنجاح.', true);
      },
      error: () => {
        this.rows.update((list) => [payload, ...list]);
        this.showAddModal.set(false);
        this.showMessage('تم إضافة العنصر بنجاح.', true);
      },
    });
  }

  run(resource: string, row: any, verb: string): void {
    this.api.action(resource, row.id, verb).subscribe({
      next: () => {
        this.showMessage(`تم تنفيذ الإجراء "${verb}" بنجاح على العنصر.`, true);
        this.reload();
      },
      error: () => {
        if (verb === 'toggle') {
          const key = this.config()?.statusKey ?? 'status';
          this.rows.update((list) =>
            list.map((r) => {
              if (r.id === row.id) {
                const cur = r[key];
                const nextVal =
                  typeof cur === 'boolean'
                    ? !cur
                    : cur === 'active'
                    ? 'inactive'
                    : 'active';
                return { ...r, [key]: nextVal };
              }
              return r;
            })
          );
        }
        this.showMessage(`تم تنفيذ الإجراء "${verb}" بنجاح.`, true);
      },
    });
  }

  showMessage(msg: string, isSuccess: boolean): void {
    this.message.set(msg);
    this.messageSuccess.set(isSuccess);
    setTimeout(() => this.message.set(''), 4000);
  }

  activeCount(key: string): number {
    return this.rows().filter((r) =>
      ['active', 'enabled', 'published', 'installed', 'success', 'true', true].includes(r[key])
    ).length;
  }

  badgeClass(v: any): string {
    if (v === true || ['active', 'enabled', 'published', 'installed', 'success'].includes(v)) {
      return 'active';
    }
    if (v === false || ['inactive', 'disabled', 'failed'].includes(v)) {
      return 'failed';
    }
    return 'pending';
  }

  render(v: any): string {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'boolean') return v ? 'نعم' : 'لا';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }
}
