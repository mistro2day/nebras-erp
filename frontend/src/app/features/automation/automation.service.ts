import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface AutomationCounts {
  'workflow-diagrams'?: number;
  'flows'?: number;
  'decision-tables'?: number;
  'plugin-installations'?: number;
  'entities'?: number;
  'feature-flags'?: number;
  [key: string]: number | undefined;
}

export interface WorkflowDiagramItem {
  id: string;
  code: string;
  name: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  nodes_count?: number;
  edges_count?: number;
  updated_at: string;
}

export interface HealthOverview {
  overall_status: 'healthy' | 'degraded' | 'critical';
  components: {
    database: { status: string; latency_ms: number };
    cache: { status: string; latency_ms: number };
    celery: { status: string; active_workers: number };
  };
  alerts: any[];
}

@Injectable({ providedIn: 'root' })
export class AutomationService {
  private http = inject(HttpClient);
  private base = '/api/v1/automation';

  private unwrap<T>(obs: Observable<any>): Observable<T> {
    return obs.pipe(
      map((res) => {
        if (res && res.success !== undefined) {
          return res.data !== undefined ? res.data : res;
        }
        return res;
      })
    );
  }

  list<T = any>(resource: string): Observable<T> {
    return this.unwrap<T>(this.http.get(`${this.base}/${resource}/`));
  }

  get<T = any>(resource: string, id: string): Observable<T> {
    return this.unwrap<T>(this.http.get(`${this.base}/${resource}/${id}/`));
  }

  create<T = any>(resource: string, body: any): Observable<T> {
    return this.unwrap<T>(this.http.post(`${this.base}/${resource}/`, body));
  }

  update<T = any>(resource: string, id: string, body: any): Observable<T> {
    return this.unwrap<T>(this.http.patch(`${this.base}/${resource}/${id}/`, body));
  }

  delete<T = any>(resource: string, id: string): Observable<T> {
    return this.unwrap<T>(this.http.delete(`${this.base}/${resource}/${id}/`));
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

  validateWorkflow(diagramId: string): Observable<any> {
    return this.action('workflow-diagrams', diagramId, 'validate');
  }

  simulateWorkflow(diagramId: string, initialInputs: any = {}): Observable<any> {
    return this.action('workflow-diagrams', diagramId, 'simulate', { inputs: initialInputs });
  }

  publishWorkflow(diagramId: string): Observable<any> {
    return this.action('workflow-diagrams', diagramId, 'publish');
  }

  evaluateDecisionTable(tableId: string, inputs: any): Observable<any> {
    return this.action('decision-tables', tableId, 'evaluate', { inputs });
  }

  publishDecisionTable(tableId: string): Observable<any> {
    return this.action('decision-tables', tableId, 'publish');
  }

  runFlow(flowId: string, payload: any = {}): Observable<any> {
    return this.action('flows', flowId, 'run', payload);
  }

  toggleFlow(flowId: string): Observable<any> {
    return this.action('flows', flowId, 'toggle');
  }

  generateEntityCode(entityId: string): Observable<any> {
    return this.action('entities', entityId, 'generate');
  }
}
