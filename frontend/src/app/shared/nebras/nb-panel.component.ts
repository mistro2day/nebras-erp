import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * لوح/بطاقة بحد ناعم — مع رأس اختياري (عنوان + وصف + إجراءات مسقطة)
 * لغة تصميم Nebras OS (القسم 1a/1c: الألواح بحدود #E3E5EC وحواف 8px)
 */
@Component({
  selector: 'nb-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (title) {
      <div class="nb-panel-head">
        <span class="nb-panel-title">{{ title }}</span>
        @if (subtitle) {
          <span class="nb-panel-sub">{{ subtitle }}</span>
        }
        <div class="nb-panel-spacer"></div>
        <ng-content select="[panel-actions]"></ng-content>
      </div>
    }
    <div class="nb-panel-body" [class.flush]="flush">
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        background: var(--nb-surface);
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius-card);
        overflow: hidden;
      }
      .nb-panel-head {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px 10px;
      }
      .nb-panel-title { font-size: 14px; font-weight: 700; color: var(--nb-text); }
      .nb-panel-sub { font-size: 12px; color: var(--nb-text-muted); }
      .nb-panel-spacer { flex: 1; }
      .nb-panel-body { padding: 16px; }
      .nb-panel-body.flush { padding: 0; }
    `,
  ],
})
export class NbPanelComponent {
  @Input() title?: string;
  @Input() subtitle?: string;
  /** إزالة الحشو الداخلي (للجداول والقوائم الممتدة حتى الحواف) */
  @Input() flush = false;
}
