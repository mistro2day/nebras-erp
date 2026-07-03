import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CommunicationsService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/communications';

  // 1. القنوات (Channels)
  getChannels(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/channels/`);
  }

  // 2. المزودون (Providers)
  getProviders(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/providers/`);
  }

  testProviderConnection(id: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/providers/${id}/test-connection/`, {});
  }

  // 3. القوالب (Templates)
  getTemplates(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/templates/`);
  }

  previewTemplate(id: string, variables: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/templates/${id}/preview/`, { variables });
  }

  createTemplateVersion(id: string, data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/templates/${id}/create-version/`, data);
  }

  publishTemplateVersion(id: string, versionId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/templates/${id}/publish-version/`, { version_id: versionId });
  }

  // 4. الرسائل (Messages)
  getMessages(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/messages/`);
  }

  sendMessage(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/messages/send/`, data);
  }

  sendBulkMessage(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/messages/bulk-send/`, data);
  }

  resendMessage(id: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/messages/${id}/resend/`, {});
  }

  // 5. مركز الإشعارات (Notifications)
  getNotifications(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/notifications/`);
  }

  getUnreadNotificationsCount(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/notifications/unread-count/`);
  }

  markNotificationAsRead(id: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/notifications/${id}/mark-read/`, {});
  }

  markAllNotificationsAsRead(category?: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/notifications/mark-all-read/`, { category });
  }

  // 6. الحملات (Campaigns)
  getCampaigns(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/campaigns/`);
  }

  launchCampaign(id: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/campaigns/${id}/launch/`, {});
  }

  pauseCampaign(id: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/campaigns/${id}/pause/`, {});
  }

  getCampaignStatistics(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/campaigns/${id}/statistics/`);
  }

  // 7. إحصائيات لوحة التحكم (Statistics)
  getDashboardSummary(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/statistics/dashboard/`);
  }
}
