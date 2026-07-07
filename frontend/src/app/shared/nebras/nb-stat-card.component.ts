import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * بطاقة مؤشر (KPI) — كما في صف المؤشرات بالشاشة 1a
 */
@Component({
  selector: 'nb-stat-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="nb-stat-label">{{ label }}</span>
    <span class="nb-stat-value" [class]="'nb-stat-value ' + (valueKind ?? '')">
      {{ value }}
      @if (suffix) {
        <span class="nb-stat-suffix">{{ suffix }}</span>
      }
    </span>
    @if (trend) {
      <span class="nb-stat-trend" [class]="'nb-stat-trend ' + (trendKind ?? 'up')">{{ trend }}</span>
    }
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: 4px;
        background: var(--nb-surface);
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius-card);
        padding: 12px 14px;
      }
      .nb-stat-label { font-size: 12px; color: var(--nb-text-muted); }
      .nb-stat-value {
        font-size: 20px;
        font-weight: 700;
        color: var(--nb-text);
      }
      .nb-stat-value.warning { color: var(--nb-warning); }
      .nb-stat-value.danger { color: var(--nb-danger); }
      .nb-stat-value.success { color: var(--nb-success); }
      .nb-stat-value.info { color: var(--nb-info); }
      .nb-stat-suffix { font-size: 12px; font-weight: 500; color: var(--nb-text-muted); }
      .nb-stat-trend { font-size: 11px; font-weight: 600; }
      .nb-stat-trend.up { color: var(--nb-success); }
      .nb-stat-trend.down { color: var(--nb-success); }
      .nb-stat-trend.info { color: var(--nb-info); }
      .nb-stat-trend.danger { color: var(--nb-danger); }
    `,
  ],
})
export class NbStatCardComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value: string | number = '';
  @Input() suffix?: string;
  @Input() valueKind?: 'warning' | 'danger' | 'success' | 'info' | 'default';
  @Input() trend?: string;
  @Input() trendKind?: 'up' | 'down' | 'info' | 'danger';
}
