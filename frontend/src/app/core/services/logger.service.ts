import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LoggerService {
  info(message: string, context?: unknown): void {
    if (!environment.production) {
      console.info(message, context ?? '');
    }
  }

  warn(message: string, context?: unknown): void {
    console.warn(message, context ?? '');
  }

  error(message: string, context?: unknown): void {
    console.error(message, context ?? '');
  }
}