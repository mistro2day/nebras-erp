import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, 'إغلاق', { duration: 3500, panelClass: 'snackbar-success' });
  }

  info(message: string): void {
    this.snackBar.open(message, 'إغلاق', { duration: 3500, panelClass: 'snackbar-info' });
  }

  warning(message: string): void {
    this.snackBar.open(message, 'إغلاق', { duration: 4000, panelClass: 'snackbar-warning' });
  }

  error(message: string): void {
    this.snackBar.open(message, 'إغلاق', { duration: 5000, panelClass: 'snackbar-error' });
  }
}