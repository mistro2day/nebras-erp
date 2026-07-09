import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'nb-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="nb-loading-container" [class.full-screen]="fullScreen">
      <div class="spinner-wrapper">
        <div class="glow-ring"></div>
        <div class="double-bounce1"></div>
        <div class="double-bounce2"></div>
      </div>
      <p class="loading-text" *ngIf="message">{{ message }}</p>
    </div>
  `,
  styles: [`
    .nb-loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      gap: 16px;
      width: 100%;
      min-height: 180px;
    }
    .nb-loading-container.full-screen {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(8px);
      z-index: 9999;
      height: 100vh;
    }
    .spinner-wrapper {
      position: relative;
      width: 48px;
      height: 48px;
    }
    .glow-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 3px solid rgba(0, 122, 255, 0.08);
      border-top-color: var(--nb-primary-600, #007aff);
      animation: spin 1s linear infinite;
    }
    .double-bounce1, .double-bounce2 {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background-color: var(--nb-primary-500, #007aff);
      opacity: 0.35;
      position: absolute;
      top: 10px; left: 10px;
      animation: sk-bounce 2.0s infinite ease-in-out;
    }
    .double-bounce2 {
      animation-delay: -1.0s;
    }
    .loading-text {
      margin: 0;
      font-family: var(--nb-font-family);
      font-size: 13.5px;
      font-weight: 600;
      color: var(--nb-text-secondary, #4a5568);
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes sk-bounce {
      0%, 100% { transform: scale(0.0); }
      50% { transform: scale(1.0); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }
  `]
})
export class NbLoadingComponent {
  @Input() message: string = 'جاري تحميل البيانات...';
  @Input() fullScreen: boolean = false;
}
