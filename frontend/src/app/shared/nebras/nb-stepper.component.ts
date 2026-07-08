import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';

/**
 * مؤشر خطوات (Wizard Stepper) — لغة تصميم Nebras OS.
 * شريط تقدم علوي أنيق: دوائر مرقّمة موصولة بخط تقدّم، مع حالات (منجزة/حالية/قادمة)
 * وشريط نسبة مئوية. يحترم prefers-reduced-motion. للعرض فقط (منطق الخطوات في الأب).
 */
@Component({
  selector: 'nb-stepper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stepper" role="list" [attr.aria-label]="'الخطوة ' + current + ' من ' + steps.length">
      <div class="track"><div class="track-fill" [style.width.%]="progress()"></div></div>
      <div class="nodes">
        @for (label of steps; track $index) {
          <div class="node" role="listitem"
               [class.done]="$index + 1 < current"
               [class.active]="$index + 1 === current"
               [attr.aria-current]="$index + 1 === current ? 'step' : null">
            <span class="circle">
              @if ($index + 1 < current) {
                <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
                  <path d="M5 10.5l3.2 3.2L15 7" fill="none" stroke="currentColor" stroke-width="2.2"
                        stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              } @else {
                {{ $index + 1 }}
              }
            </span>
            <span class="label">{{ label }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .stepper { position: relative; padding: 4px 0 8px; }
    .track { position: absolute; top: 19px; inset-inline: 24px; height: 3px; background: var(--nb-border); border-radius: 999px; overflow: hidden; }
    .track-fill { height: 100%; background: var(--nb-primary-600); border-radius: 999px; transition: width 320ms cubic-bezier(0.4, 0, 0.2, 1); }
    .nodes { position: relative; display: flex; justify-content: space-between; gap: 8px; }
    .node { display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1; min-width: 0; }
    .circle {
      width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; flex-shrink: 0;
      background: var(--nb-surface); color: var(--nb-text-muted);
      border: 2px solid var(--nb-border);
      transition: background 200ms ease, color 200ms ease, border-color 200ms ease, transform 200ms ease;
    }
    .node.active .circle { border-color: var(--nb-primary-600); color: var(--nb-primary-600); background: var(--nb-primary-50); transform: scale(1.08); box-shadow: 0 0 0 4px var(--nb-primary-50); }
    .node.done .circle { background: var(--nb-primary-600); color: var(--nb-on-primary); border-color: var(--nb-primary-600); }
    .label { font-size: 12px; font-weight: 600; color: var(--nb-text-muted); text-align: center; line-height: 1.3; }
    .node.active .label { color: var(--nb-text); }
    .node.done .label { color: var(--nb-text-secondary); }
    @media (max-width: 560px) {
      .label { display: none; }
      .node.active .label { display: block; font-size: 11px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .track-fill, .circle { transition: none; }
      .node.active .circle { transform: none; }
    }
  `],
})
export class NbStepperComponent {
  @Input({ required: true }) steps: string[] = [];
  private readonly _current = signal(1);
  @Input({ required: true }) set current(v: number) { this._current.set(v); }
  get current(): number { return this._current(); }

  readonly progress = computed(() => {
    const n = this.steps.length;
    if (n <= 1) return 100;
    return ((this._current() - 1) / (n - 1)) * 100;
  });
}
