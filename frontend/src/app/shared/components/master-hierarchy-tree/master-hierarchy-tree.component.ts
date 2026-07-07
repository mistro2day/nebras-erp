import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface MasterTreeItem {
  id: string;
  code: string;
  value_ar: string;
  value_en: string;
  color?: string;
  icon?: string;
  children?: MasterTreeItem[];
  expanded?: boolean;
}

@Component({
  selector: 'app-master-hierarchy-tree',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="hierarchy-tree-container" dir="rtl">
      <div class="tree-header">
        <h3>شجرة تسلسل البيانات المرجعية (MDM Tree)</h3>
      </div>
      
      <div class="tree-nodes">
        <ng-container *ngTemplateOutlet="nodeListTemplate; context: { $implicit: items() }"></ng-container>
      </div>

      <!-- Recursive Node Template -->
      <ng-template #nodeListTemplate let-nodes>
        <ul class="node-list">
          <li *ngFor="let node of nodes" class="node-item">
            <div class="node-row" [style.border-right-color]="node.color || '#6366f1'">
              <button mat-icon-button *ngIf="node.children && node.children.length > 0" (click)="toggleNode(node)">
                <mat-icon>{{ node.expanded ? 'expand_less' : 'expand_more' }}</mat-icon>
              </button>
              <mat-icon class="item-icon" *ngIf="node.icon">{{ node.icon }}</mat-icon>
              <div class="node-content">
                <span class="value-ar">{{ node.value_ar }}</span>
                <span class="code-badge">{{ node.code }}</span>
              </div>
              <div class="row-actions">
                <button mat-icon-button color="primary" (click)="onSelect.emit(node)" title="تعديل الكيان">
                  <mat-icon>edit</mat-icon>
                </button>
              </div>
            </div>
            
            <div class="child-nodes" *ngIf="node.children && node.children.length > 0 && node.expanded">
              <ng-container *ngTemplateOutlet="nodeListTemplate; context: { $implicit: node.children }"></ng-container>
            </div>
          </li>
        </ul>
      </ng-template>
    </div>
  `,
  styles: [`
    .hierarchy-tree-container {
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
      padding: 16px;
      color: var(--nb-text);
      font-family: var(--nb-font-family);
    }
    .tree-header h3 {
      font-size: 13px;
      font-weight: 700;
      margin: 0 0 14px;
      color: var(--nb-primary-600);
    }
    .node-list { list-style: none; padding-right: 16px; padding-left: 0; margin: 0; }
    .node-item { margin: 8px 0; }
    .node-row {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--nb-surface-raised);
      padding: 8px 12px;
      border-radius: var(--nb-radius-sm);
      border-right: 4px solid var(--nb-primary-600);
      border-top: 1px solid var(--nb-border-soft);
    }
    .item-icon { color: var(--nb-text-secondary); }
    .node-content { display: flex; align-items: center; gap: 8px; flex: 1; }
    .value-ar { font-size: 13px; font-weight: 600; color: var(--nb-text); }
    .code-badge {
      font-size: 11px;
      background: var(--nb-surface);
      border: 1px solid var(--nb-border-soft);
      padding: 2px 6px;
      border-radius: var(--nb-radius-sm);
      color: var(--nb-text-muted);
    }
    .child-nodes {
      margin-top: 4px;
      border-right: 1px dashed var(--nb-border);
      padding-right: 10px;
    }
    .row-actions { display: flex; gap: 4px; }
  `]
})
export class MasterHierarchyTreeComponent {
  items = input<MasterTreeItem[]>([]);
  onSelect = output<MasterTreeItem>();

  toggleNode(node: MasterTreeItem) {
    node.expanded = !node.expanded;
  }
}