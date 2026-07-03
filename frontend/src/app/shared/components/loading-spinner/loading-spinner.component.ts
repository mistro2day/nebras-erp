import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <div class="loading-overlay" *ngIf="isLoading">
      <mat-spinner [diameter]="diameter" color="primary"></mat-spinner>
      <p class="loading-text" *ngIf="message">{{ message }}</p>
    </div>
  `,
  styles: [`
    .loading-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      gap: 1rem;
    }
    .loading-text {
      color: #94a3b8;
      font-size: 0.9rem;
      font-family: 'Cairo', sans-serif;
    }
  `]
})
export class LoadingSpinnerComponent {
  @Input() isLoading = true;
  @Input() diameter = 48;
  @Input() message = 'جاري التحميل...';
}