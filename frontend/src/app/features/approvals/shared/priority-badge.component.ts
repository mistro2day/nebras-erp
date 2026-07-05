import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-priority-badge',
  standalone: true,
  imports: [CommonModule],
  template: `<span class="badge" [ngClass]="getPriorityClass(code())">{{ getPriorityText(code()) }}</span>`,
  styles: [`
    .badge {
      padding: 0.2rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .badge-danger { background: #fee2e2; color: #b91c1c; }
    .badge-warning { background: #fef3c7; color: #d97706; }
    .badge-info { background: #e0f2fe; color: #0369a1; }
    .badge-muted { background: #f1f5f9; color: #64748b; }
  `]
})
export class PriorityBadgeComponent {
  code = input<string | null>(null);

  getPriorityClass(code: string | null): string {
    switch (code) {
      case 'URGENT': return 'badge-danger';
      case 'HIGH': return 'badge-warning';
      case 'MEDIUM': return 'badge-info';
      default: return 'badge-muted';
    }
  }

  getPriorityText(code: string | null): string {
    switch (code) {
      case 'URGENT': return 'عاجل';
      case 'HIGH': return 'مرتفعة';
      case 'MEDIUM': return 'متوسطة';
      case 'LOW': return 'منخفضة';
      default: return 'غير محددة';
    }
  }
}
