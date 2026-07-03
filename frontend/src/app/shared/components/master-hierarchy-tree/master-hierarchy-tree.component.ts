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
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 1.25rem;
      color: #f8fafc;
      font-family: 'Cairo', sans-serif;
    }
    .tree-header h3 {
      font-size: 0.95rem;
      font-weight: 700;
      margin: 0 0 1.25rem;
      color: #6366f1;
    }
    .node-list {
      list-style: none;
      padding-right: 16px;
      padding-left: 0;
      margin: 0;
    }
    .node-item {
      margin: 8px 0;
    }
    .node-row {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(15, 23, 42, 0.4);
      padding: 8px 12px;
      border-radius: 6px;
      border-right: 4px solid #6366f1;
      border-top: 1px solid rgba(255, 255, 255, 0.02);
    }
    .item-icon {
      color: #cbd5e1;
    }
    .node-content {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
    }
    .value-ar {
      font-size: 0.85rem;
      font-weight: 600;
    }
    .code-badge {
      font-size: 0.65rem;
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 6px;
      border-radius: 4px;
      color: #94a3b8;
    }
    .child-nodes {
      margin-top: 4px;
      border-right: 1px dashed rgba(255, 255, 255, 0.1);
      padding-right: 10px;
    }
    .row-actions {
      display: flex;
      gap: 4px;
    }
  `]
})
export class MasterHierarchyTreeComponent {
  items = input<MasterTreeItem[]>([]);
  onSelect = output<MasterTreeItem>();

  toggleNode(node: MasterTreeItem) {
    node.expanded = !node.expanded;
  }
}