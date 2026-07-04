import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface AssetsStats {
  total_assets: number;
  capitalized_assets: number;
  disposed_assets: number;
  net_book_value: number;
  depr_mtd: number;
  pending_transfers: number;
  pending_disposals: number;
}

@Injectable({
  providedIn: 'root'
})
export class AssetsService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/assets';

  stats = signal<AssetsStats | null>(null);
  loading = signal<boolean>(false);

  getDashboardStats(): Observable<AssetsStats> {
    this.loading.set(true);
    return this.http.get<AssetsStats>(`${this.apiUrl}/items/dashboard-stats/`).pipe(
      tap({
        next: (data) => this.stats.set(data),
        finalize: () => this.loading.set(false)
      })
    );
  }

  getAssets(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/items/`);
  }

  getCategories(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/categories/`);
  }

  capitalizeAsset(id: string, payload: { capitalization_date: string; asset_gl_account_id: string; offset_gl_account_id: string; cost_center_id?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/items/${id}/capitalize/`, payload);
  }

  depreciateAsset(id: string, payload: { run_date: string; depr_expense_gl_account_id: string; accum_depr_gl_account_id: string; cost_center_id?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/items/${id}/depreciate/`, payload);
  }

  disposeAsset(payload: { asset_id: string; disposal_type: string; proceeds: number; run_date: string; disposal_expense_gl_account_id: string; asset_gl_account_id: string; accum_depr_gl_account_id: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/disposals/dispose/`, payload);
  }
}
