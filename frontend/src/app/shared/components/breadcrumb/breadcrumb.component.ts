import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

export interface BreadcrumbItem {
  label: string;
  link?: string;
  icon?: string;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <nav class="breadcrumb" dir="rtl">
      <a *ngFor="let item of items; let last = last"
         [routerLink]="item.link || null"
         [class.active]="last"
         class="breadcrumb-item">
        <mat-icon *ngIf="item.icon" class="crumb-icon">{{ item.icon }}</mat-icon>
        {{ item.label }}
        <span class="separator" *ngIf="!last">/</span>
      </a>
    </nav>
  `,
  styles: [`
    .breadcrumb {
      display: flex; align-items: center; gap: 0.25rem;
      padding: 0.75rem 0; font-family: 'Cairo', sans-serif; font-size: 0.85rem;
    }
    .breadcrumb-item { color: #94a3b8; text-decoration: none; display: flex; align-items: center; gap: 4px; }
    .breadcrumb-item:hover:not(.active) { color: #6366f1; }
    .breadcrumb-item.active { color: #f8fafc; font-weight: 600; pointer-events: none; }
    .crumb-icon { font-size: 16px; width: 16px; height: 16px; }
    .separator { margin: 0 0.35rem; color: #475569; }
  `]
})
export class BreadcrumbComponent {
  @Input() items: BreadcrumbItem[] = [];
}