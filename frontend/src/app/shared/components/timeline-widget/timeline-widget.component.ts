import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export interface TimelineEvent {
  id: string;
  activity_type: string;
  actor_name: string;
  description: string;
  created_at: string;
}

@Component({
  selector: 'app-timeline-widget',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="timeline-widget" dir="rtl">
      <div class="widget-header">
        <h3>الخط الزمني وسجل الحركات</h3>
      </div>
      
      <div class="timeline-container">
        <div class="timeline-item" *ngFor="let ev of events()">
          <div class="timeline-badge" [ngClass]="ev.activity_type">
            <mat-icon>history</mat-icon>
          </div>
          <div class="timeline-card">
            <div class="card-meta">
              <span class="actor">{{ ev.actor_name }}</span>
              <span class="date">{{ ev.created_at | date:'medium' }}</span>
            </div>
            <p class="description">{{ ev.description }}</p>
          </div>
        </div>
        
        <div class="no-data" *ngIf="events().length === 0">
          <mat-icon>history</mat-icon>
          <p>لا توجد حركات مسجلة حالياً لهذا الكيان.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .timeline-widget {
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
      padding: 16px;
      color: var(--nb-text);
    }
    .widget-header h3 {
      font-size: 13px;
      font-weight: 700;
      margin: 0 0 16px;
      color: var(--nb-primary-600);
    }
    .timeline-container {
      position: relative;
      padding-right: 24px;
      border-right: 2px solid var(--nb-border);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .timeline-item { position: relative; }
    .timeline-badge {
      position: absolute;
      right: -35px;
      top: 4px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: var(--nb-text-faint);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid var(--nb-surface);
    }
    .timeline-badge.create { background: var(--nb-success); }
    .timeline-badge.update { background: var(--nb-warning); }
    .timeline-badge.delete { background: var(--nb-danger); }
    .timeline-badge mat-icon { font-size: 12px; width: 12px; height: 12px; }
    .timeline-card {
      background: var(--nb-surface-raised);
      border-radius: var(--nb-radius);
      padding: 12px;
      border: 1px solid var(--nb-border-soft);
    }
    .card-meta { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px; }
    .actor { font-weight: 700; color: var(--nb-text-secondary); }
    .date { color: var(--nb-text-muted); }
    .description { font-size: 13px; margin: 0; color: var(--nb-text-secondary); }
    .no-data { text-align: center; padding: 20px; color: var(--nb-text-muted); font-size: 13px; }
  `]
})
export class TimelineWidgetComponent {
  events = input<TimelineEvent[]>([]);
}