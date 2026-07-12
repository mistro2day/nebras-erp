import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * لوح جانبي منزلق (Detail Drawer) — لعرض تفاصيل السجلات عند الضغط عليها.
 * لغة تصميم نبراس، عربي RTL، ينزلق من الحافة (اليسار في الاتجاه العربي).
 * الاستخدام:
 *   <nb-drawer [open]="!!selected()" [title]="…" subtitle="…" (closed)="selected.set(null)">
 *     … المحتوى … <div drawer-actions>… أزرار …</div>
 *   </nb-drawer>
 */
@Component({
  selector: 'nb-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (open) {
      <div class="nb-dr-overlay" (click)="closed.emit()"></div>
      <aside class="nb-dr-panel" dir="rtl" role="dialog" [style.width.px]="width">
        <header class="nb-dr-head">
          <div class="nb-dr-titles">
            <h2 class="nb-dr-title">{{ title }}</h2>
            @if (subtitle) { <p class="nb-dr-sub">{{ subtitle }}</p> }
          </div>
          <button class="nb-dr-close" (click)="closed.emit()" aria-label="إغلاق">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </header>
        <div class="nb-dr-body"><ng-content></ng-content></div>
        <footer class="nb-dr-foot"><ng-content select="[drawer-actions]"></ng-content></footer>
      </aside>
    }
  `,
  styles: [`
    .nb-dr-overlay { position: fixed; inset: 0; background: rgba(16,24,40,0.44); z-index: 1200; animation: nbFade .18s ease; }
    .nb-dr-panel { position: fixed; top: 0; bottom: 0; inset-inline-start: 0; max-width: 94vw; z-index: 1201;
      background: var(--nb-surface); border-inline-end: 1px solid var(--nb-border); box-shadow: 0 8px 40px rgba(16,24,40,0.24);
      display: flex; flex-direction: column; animation: nbSlide .24s cubic-bezier(0.2,0,0,1); }
    @keyframes nbFade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes nbSlide { from { transform: translateX(-24px); opacity: .6; } to { transform: none; opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .nb-dr-panel, .nb-dr-overlay { animation: none; } }

    .nb-dr-head { display: flex; align-items: flex-start; gap: 12px; padding: 18px 20px 14px;
      border-bottom: 1px solid var(--nb-border-soft); }
    .nb-dr-titles { flex: 1; }
    .nb-dr-title { margin: 0; font-size: 16px; font-weight: 800; color: var(--nb-text); letter-spacing: -0.2px; }
    .nb-dr-sub { margin: 4px 0 0; font-size: 12px; color: var(--nb-text-muted); }
    .nb-dr-close { flex: none; width: 32px; height: 32px; display: grid; place-items: center; cursor: pointer;
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius); background: var(--nb-surface-raised); color: var(--nb-text-secondary); }
    .nb-dr-close:hover { color: var(--nb-danger); border-color: var(--nb-danger); }
    .nb-dr-body { flex: 1; overflow-y: auto; padding: 18px 20px; }
    .nb-dr-foot { padding: 14px 20px; border-top: 1px solid var(--nb-border-soft); display: flex; gap: 10px; flex-wrap: wrap; }
    .nb-dr-foot:empty { display: none; }
  `],
})
export class NbDrawerComponent {
  @Input() open = false;
  @Input({ required: true }) title = '';
  @Input() subtitle?: string;
  @Input() width = 560;
  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEsc() { if (this.open) this.closed.emit(); }
}
