import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * نافذة منبثقة بنمط نبراس الفاخر (Modal Popup).
 * عربي RTL، متميزة بجماليات غامرة متوافقة مع الـ glassmorphism والأطراف المستديرة والانتقالات السلسة.
 */
@Component({
  selector: 'nb-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (open) {
      <div class="nb-modal-overlay" (click)="closed.emit()">
        <div class="nb-modal-container" dir="rtl" role="dialog" (click)="$event.stopPropagation()">
          <header class="nb-modal-head">
            <div class="nb-modal-titles">
              <h2 class="nb-modal-title">{{ title }}</h2>
              @if (subtitle) { <p class="nb-modal-sub">{{ subtitle }}</p> }
            </div>
            <button class="nb-modal-close" (click)="closed.emit()" aria-label="إغلاق">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </header>
          <div class="nb-modal-body">
            <ng-content></ng-content>
          </div>
          <footer class="nb-modal-foot">
            <ng-content select="[modal-actions]"></ng-content>
          </footer>
        </div>
      </div>
    }
  `,
  styles: [`
    .nb-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(16, 24, 40, 0.6);
      backdrop-filter: blur(6px);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: modalFadeIn 0.2s ease-out;
    }

    .nb-modal-container {
      background: #FFFFFF;
      border: 1px solid var(--nb-border, #E5E7EB);
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      width: 100%;
      max-width: 500px;
      display: flex;
      flex-direction: column;
      animation: modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes modalSlideUp {
      from { transform: translateY(20px) scale(0.96); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }

    .nb-modal-head {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 20px;
      border-bottom: 1px solid var(--nb-border-soft, #F3F4F6);
    }

    .nb-modal-titles {
      flex: 1;
    }

    .nb-modal-title {
      margin: 0;
      font-size: 16px;
      font-weight: 800;
      color: var(--nb-text, #111827);
    }

    .nb-modal-sub {
      margin: 4px 0 0;
      font-size: 12px;
      color: var(--nb-text-muted, #6B7280);
    }

    .nb-modal-close {
      flex: none;
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      cursor: pointer;
      border: 1px solid var(--nb-border, #E5E7EB);
      border-radius: 8px;
      background: #F9FAFB;
      color: #4B5563;
    }

    .nb-modal-close:hover {
      color: #dc2626;
      border-color: #fca5a5;
      background: #fef2f2;
    }

    .nb-modal-body {
      padding: 20px;
      font-size: 13.5px;
      line-height: 1.5;
      color: var(--nb-text-secondary, #374151);
    }

    .nb-modal-foot {
      padding: 14px 20px;
      border-top: 1px solid var(--nb-border-soft, #F3F4F6);
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      background: #F9FAFB;
      border-bottom-left-radius: 16px;
      border-bottom-right-radius: 16px;
    }
  `]
})
export class NbModalComponent {
  @Input() open = false;
  @Input({ required: true }) title = '';
  @Input() subtitle?: string;
  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.open) this.closed.emit();
  }
}
