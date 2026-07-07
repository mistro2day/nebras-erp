import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type NbBadgeKind = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'ai';

/**
 * شارة حالة — الألوان الدلالية للحالات فقط (القسم 1d)
 */
@Component({
  selector: 'nb-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="'nb-badge-' + kind"><ng-content></ng-content></span>`,
  styles: [
    `
      :host { display: inline-flex; }
    `,
  ],
})
export class NbBadgeComponent {
  @Input() kind: NbBadgeKind = 'neutral';
}
