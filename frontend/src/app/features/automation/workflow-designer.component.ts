import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AutomationService } from './automation.service';
import { STUDIO_STYLES } from './studio-theme';

@Component({
  selector: 'app-workflow-designer',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="studio" dir="rtl">
      <header class="studio-header">
        <div>
          <h1>مصمم مسارات العمل المرئي</h1>
          <p>كانفس تصميم العقد والوصلات — النشر يُترجم المخطط إلى محرك مسارات العمل دون تكرار التنفيذ.</p>
        </div>
        <button class="pill" (click)="reload()">تحديث</button>
      </header>

      <div class="stats-grid">
        <div class="stat-card"><mat-icon>account_tree</mat-icon>
          <div><h3>إجمالي المخططات</h3><p class="value">{{ diagrams().length }}</p></div></div>
        <div class="stat-card"><mat-icon>publish</mat-icon>
          <div><h3>منشورة</h3><p class="value">{{ publishedCount() }}</p></div></div>
        <div class="stat-card"><mat-icon>edit_note</mat-icon>
          <div><h3>مسودات</h3><p class="value">{{ draftCount() }}</p></div></div>
      </div>

      <div *ngIf="selected() as d" class="canvas-wrap">
        <h2 class="section-title">لوحة التصميم: {{ d.name }}</h2>
        <svg viewBox="0 0 640 220" class="canvas">
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#818cf8" />
            </marker>
          </defs>
          <line *ngFor="let e of edges()" [attr.x1]="nodePos(e.source_key).x + 55" [attr.y1]="nodePos(e.source_key).y + 20"
                [attr.x2]="nodePos(e.target_key).x + 5" [attr.y2]="nodePos(e.target_key).y + 20"
                stroke="#818cf8" stroke-width="2" marker-end="url(#arrow)" />
          <g *ngFor="let n of nodes()">
            <rect [attr.x]="nodePos(n.node_key).x" [attr.y]="nodePos(n.node_key).y" rx="10" width="60" height="40"
                  [attr.fill]="nodeColor(n.node_type)" stroke="rgba(255,255,255,.15)" />
            <text [attr.x]="nodePos(n.node_key).x + 30" [attr.y]="nodePos(n.node_key).y + 24"
                  text-anchor="middle" fill="#f8fafc" font-size="9">{{ n.label }}</text>
          </g>
        </svg>
      </div>

      <h2 class="section-title">المخططات</h2>
      <table class="data">
        <thead><tr><th>الرمز</th><th>الاسم</th><th>الإصدار</th><th>الحالة</th><th>التحكم</th></tr></thead>
        <tbody>
          <tr *ngFor="let d of diagrams()">
            <td><code>{{ d.code }}</code></td>
            <td>{{ d.name }}</td>
            <td>v{{ d.version }}</td>
            <td><span class="badge" [ngClass]="d.status">{{ d.status }}</span></td>
            <td>
              <button class="pill" (click)="open(d)">تصميم</button>
              <button class="pill" (click)="validate(d)">تحقق</button>
              <button class="pill" (click)="publish(d)">نشر</button>
            </td>
          </tr>
          <tr *ngIf="diagrams().length === 0"><td colspan="5" class="no-data">لا توجد مخططات بعد.</td></tr>
        </tbody>
      </table>
      <p *ngIf="message()" class="section-title">{{ message() }}</p>
    </div>
  `,
  styles: [STUDIO_STYLES + `
    .canvas-wrap { margin-bottom: 1rem; }
    svg.canvas { width: 100%; max-width: 720px; background: #1e293b; border: 1px solid rgba(255,255,255,.08);
      border-radius: 16px; padding: 8px; }
  `],
})
export class WorkflowDesignerComponent implements OnInit {
  private api = inject(AutomationService);
  diagrams = signal<any[]>([]);
  nodes = signal<any[]>([]);
  edges = signal<any[]>([]);
  selected = signal<any | null>(null);
  message = signal('');

  publishedCount = () => this.diagrams().filter((d) => d.status === 'published').length;
  draftCount = () => this.diagrams().filter((d) => d.status === 'draft').length;

  ngOnInit(): void { this.reload(); }

  reload(): void {
    this.api.list('workflow-diagrams').subscribe((d: any) => this.diagrams.set(d ?? []));
  }

  open(d: any): void {
    this.selected.set(d);
    this.api.list(`workflow-nodes`).subscribe((n: any) =>
      this.nodes.set((n ?? []).filter((x: any) => x.diagram === d.id)));
    this.api.list(`workflow-edges`).subscribe((e: any) =>
      this.edges.set((e ?? []).filter((x: any) => x.diagram === d.id)));
  }

  validate(d: any): void {
    this.api.action('workflow-diagrams', d.id, 'validate').subscribe((r: any) =>
      this.message.set(r?.is_valid ? '✅ المخطط صالح.' : `⚠️ ${r?.issues?.length ?? 0} مشكلة تحقق.`));
  }

  publish(d: any): void {
    this.api.action('workflow-diagrams', d.id, 'publish').subscribe((r: any) => {
      this.message.set(r?.published ? '🚀 تم النشر والربط بمحرك مسارات العمل.' : '❌ فشل النشر لوجود أخطاء.');
      this.reload();
    });
  }

  nodePos(key: string): { x: number; y: number } {
    const idx = this.nodes().findIndex((n) => n.node_key === key);
    return { x: 40 + idx * 130, y: 90 };
  }

  nodeColor(type: string): string {
    const map: Record<string, string> = {
      start: '#16a34a', end: '#dc2626', approval: '#7c3aed',
      condition: '#d97706', timer: '#0891b2', task: '#2563eb',
    };
    return map[type] ?? '#334155';
  }
}
