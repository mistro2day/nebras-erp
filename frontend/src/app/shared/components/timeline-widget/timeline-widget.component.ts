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
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 1rem;
      color: #f8fafc;
    }
    .widget-header h3 {
      font-size: 0.95rem;
      font-weight: 700;
      margin: 0 0 1.5rem;
      color: #6366f1;
    }
    .timeline-container {
      position: relative;
      padding-right: 24px;
      border-right: 2px solid rgba(255, 255, 255, 0.06);
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .timeline-item {
      position: relative;
    }
    .timeline-badge {
      position: absolute;
      right: -37px;
      top: 4px;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #475569;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid #1e293b;
    }
    .timeline-badge.create { background: #10b981; }
    .timeline-badge.update { background: #eab308; }
    .timeline-badge.delete { background: #ef4444; }
    .timeline-badge mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    .timeline-card {
      background: rgba(15, 23, 42, 0.4);
      border-radius: 8px;
      padding: 12px;
      border: 1px solid rgba(255, 255, 255, 0.04);
    }
    .card-meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 0.75rem;
    }
    .actor {
      font-weight: bold;
      color: #cbd5e1;
    }
    .date {
      color: #94a3b8;
    }
    .description {
      font-size: 0.85rem;
      margin: 0;
      color: #94a3b8;
    }
    .no-data {
      text-align: center;
      padding: 2rem;
      color: #94a3b8;
    }
  `]
})
export class TimelineWidgetComponent {
  events = input<TimelineEvent[]>([]);
}