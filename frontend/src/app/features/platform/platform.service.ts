import { Injectable, inject, signal } from '@angular/core';
import { ApiClientService } from '../../core/services/api-client.service';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PlatformService {
  private apiClient = inject(ApiClientService);

  healthStatus = signal<any>(null);
  auditLogs = signal<any[]>([]);
  notifications = signal<any[]>([]);
  featureFlags = signal<any[]>([]);
  configurations = signal<any[]>([]);
  jobs = signal<any[]>([]);

  getHealth(): Observable<any> {
    return this.apiClient.get<any>('platform/health/').pipe(
      tap(res => {
        if (res && res.success) {
          this.healthStatus.set(res.data);
        }
      })
    );
  }

  getAuditLogs(): Observable<any> {
    return this.apiClient.get<any>('platform/audit-logs/').pipe(
      tap(res => {
        if (res && res.success) {
          this.auditLogs.set(res.data);
        }
      })
    );
  }

  getNotifications(): Observable<any> {
    return this.apiClient.get<any>('platform/notifications/').pipe(
      tap(res => {
        if (res && res.success) {
          this.notifications.set(res.data);
        }
      })
    );
  }

  getFeatureFlags(): Observable<any> {
    return this.apiClient.get<any>('platform/feature-flags/').pipe(
      tap(res => {
        if (res && res.success) {
          this.featureFlags.set(res.data);
        }
      })
    );
  }

  getConfigurations(): Observable<any> {
    return this.apiClient.get<any>('platform/configurations/').pipe(
      tap(res => {
        if (res && res.success) {
          this.configurations.set(res.data);
        }
      })
    );
  }

  getJobs(): Observable<any> {
    return this.apiClient.get<any>('platform/background-jobs/').pipe(
      tap(res => {
        if (res && res.success) {
          this.jobs.set(res.data);
        }
      })
    );
  }

  erpDashboardData = signal<any>(null);

  getERPDashboard(): Observable<any> {
    return this.apiClient.get<any>('platform/erp-dashboard/').pipe(
      tap(res => {
        if (res && res.success) {
          this.erpDashboardData.set(res.data);
        }
      })
    );
  }

  setConfiguration(key: string, value: any): Observable<any> {
    return this.apiClient.post('platform/configurations/set-value/', { key, value });
  }

  uploadFile(file: File, category: string = 'general'): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    return this.apiClient.post('platform/storage/upload/', formData);
  }
}