import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sla-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="badge" [ngClass]="getSlaClass()" *ngIf="dueAt()">{{ getSlaText() }}</span>
  `,
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
    .badge-success { background: #dcfce7; color: #15803d; }
  `]
})
export class SlaBadgeComponent {
  dueAt = input<string | null>(null);
  isViolated = input<boolean>(false);

  getSlaClass(): string {
    if (this.isViolated()) return 'badge-danger';
    const due = this.dueAt();
    if (due && new Date(due).getTime() - Date.now() < 1000 * 60 * 60 * 4) return 'badge-warning';
    return 'badge-success';
  }

  getSlaText(): string {
    if (this.isViolated()) return 'متجاوز المهلة';
    const due = this.dueAt();
    if (!due) return '';
    const hours = Math.round((new Date(due).getTime() - Date.now()) / (1000 * 60 * 60));
    if (hours < 0) return 'متجاوز المهلة';
    return `متبقٍ ${hours} ساعة`;
  }
}
