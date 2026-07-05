/**
 * Nebras Automation Platform — TypeScript SDK.
 *
 * Framework-agnostic client (works in browser or Node with fetch). Unwraps the
 * StandardResponse envelope and injects the tenant header. Intended to be
 * published as `@nebras/automation-sdk` and consumed by plugins/extensions.
 */
export interface NebrasClientOptions {
  host: string;
  token?: string;
  tenantId?: string;
  fetchImpl?: typeof fetch;
}

export class NebrasAutomationClient {
  private readonly base: string;
  private readonly f: typeof fetch;

  constructor(private opts: NebrasClientOptions) {
    this.base = `${opts.host.replace(/\/$/, '')}/api/v1/automation`;
    this.f = opts.fetchImpl ?? fetch;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.opts.token) h['Authorization'] = `Bearer ${this.opts.token}`;
    if (this.opts.tenantId) h['X-Tenant-ID'] = this.opts.tenantId;
    return h;
  }

  private async unwrap<T>(res: Response): Promise<T> {
    const body = await res.json();
    return (body && body.data !== undefined ? body.data : body) as T;
  }

  async get<T = unknown>(path: string): Promise<T> {
    return this.unwrap<T>(await this.f(`${this.base}/${path}`, { headers: this.headers() }));
  }

  async post<T = unknown>(path: string, payload: unknown = {}): Promise<T> {
    return this.unwrap<T>(
      await this.f(`${this.base}/${path}`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(payload),
      }),
    );
  }

  listFlows<T = unknown>() { return this.get<T>('flows/'); }
  runFlow<T = unknown>(id: string, payload: unknown = {}) { return this.post<T>(`flows/${id}/run/`, { payload }); }
  listDiagrams<T = unknown>() { return this.get<T>('workflow-diagrams/'); }
  publishDiagram<T = unknown>(id: string) { return this.post<T>(`workflow-diagrams/${id}/publish/`); }
  operationsOverview<T = unknown>() { return this.get<T>('operations/overview/'); }
  aiAssist<T = unknown>(kind: string, prompt: string, context: unknown = {}) {
    return this.post<T>('ai/assist/', { kind, prompt, context });
  }
}
