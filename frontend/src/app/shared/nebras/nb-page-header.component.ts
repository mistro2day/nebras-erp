import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * ترويسة صفحة — عنوان + وصف + إجراءات (لغة تصميم Nebras OS، القسم 1d/1a)
 */
@Component({
  selector: 'nb-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="nb-ph">
      <div class="nb-ph-text">
        <h1 class="nb-ph-title">{{ title }}</h1>
        @if (subtitle) {
          <p class="nb-ph-sub">{{ subtitle }}</p>
        }
      </div>
      <div class="nb-ph-spacer"></div>
      <div class="nb-ph-actions">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [
    `
      .nb-ph {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }
      .nb-ph-text { display: flex; flex-direction: column; gap: 4px; }
      .nb-ph-title { margin: 0; font-size: 18px; font-weight: 700; color: var(--nb-text); }
      .nb-ph-sub { margin: 0; font-size: 12px; color: var(--nb-text-muted); }
      .nb-ph-spacer { flex: 1; }
      .nb-ph-actions { display: flex; align-items: center; gap: 8px; }
    `,
  ],
})
export class NbPageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle?: string;
}
