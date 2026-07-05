import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * خدمة موحّدة لاستهلاك واجهات منصة الأتمتة المؤسسية.
 * تعتمد صيغة الاستجابة القياسية (StandardResponse) في الباك إند.
 */
@Injectable({ providedIn: 'root' })
export class AutomationService {
  private http = inject(HttpClient);
  private base = '/api/v1/automation';

  private unwrap<T>(obs: Observable<any>): Observable<T> {
    return obs.pipe(map((res) => (res && res.success !== undefined ? res.data : res)));
  }

  list<T = any>(resource: string): Observable<T> {
    return this.unwrap<T>(this.http.get(`${this.base}/${resource}/`));
  }

  action<T = any>(resource: string, id: string, verb: string, body: any = {}): Observable<T> {
    return this.unwrap<T>(this.http.post(`${this.base}/${resource}/${id}/${verb}/`, body));
  }

  post<T = any>(path: string, body: any = {}): Observable<T> {
    return this.unwrap<T>(this.http.post(`${this.base}/${path}/`, body));
  }

  operationsOverview<T = any>(): Observable<T> {
    return this.unwrap<T>(this.http.get(`${this.base}/operations/overview/`));
  }

  collectHealth<T = any>(): Observable<T> {
    return this.unwrap<T>(this.http.post(`${this.base}/operations/overview/`, {}));
  }

  aiAssist<T = any>(kind: string, prompt: string, context: any = {}): Observable<T> {
    return this.unwrap<T>(this.http.post(`${this.base}/ai/assist/`, { kind, prompt, context }));
  }
}
