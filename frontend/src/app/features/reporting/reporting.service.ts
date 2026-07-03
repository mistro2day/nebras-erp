import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReportingService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/reporting';

  // 1. الفئات (Categories)
  getCategories(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/categories/`);
  }

  // 2. مصادر البيانات (Data Sources)
  getDataSources(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/data-sources/`);
  }

  // 3. التقارير (Reports)
  getReports(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/reports/`);
  }

  executeReport(id: string, parameters: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/reports/${id}/execute/`, { parameters });
  }

  exportReportCsv(id: string, parameters: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/reports/${id}/export-csv/`, { parameters }, { responseType: 'blob' as 'json' });
  }

  // 4. لوحات القيادة (Dashboards)
  getDashboards(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/dashboards/`);
  }

  getDashboardWidgets(dashboardId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/widgets/?dashboard=${dashboardId}`);
  }

  // 5. مؤشرات الأداء (KPIs)
  getKPIs(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/kpis/`);
  }

  recordKPIValue(id: string, value: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/kpis/${id}/record-value/`, { value });
  }

  // 6. استعلام AI التفاعلي باللغة الطبيعية (NLQ Ask)
  askAI(question: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/analytics/nlq-ask/`, { question });
  }
}
