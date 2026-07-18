import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AssetsStats {
  total_assets: number;
  capitalized_assets: number;
  disposed_assets: number;
  net_book_value: number;
  depr_mtd: number;
  pending_transfers: number;
  pending_disposals: number;
}

@Injectable({ providedIn: 'root' })
export class AssetsService {
  private http = inject(HttpClient);
  /** رابط مطلق مثل بقية الخدمات العاملة — المسار النسبي يذهب لخادم Angular ويردّ بـ index.html. */
  private apiUrl = `${environment.apiUrl}assets`;

  stats = signal<AssetsStats | null>(null);
  loading = signal<boolean>(false);

  getDashboardStats(): Observable<AssetsStats> {
    this.loading.set(true);
    return this.http.get<AssetsStats>(`${this.apiUrl}/items/dashboard-stats/`).pipe(
      tap({ next: (data) => this.stats.set(data), finalize: () => this.loading.set(false) }),
    );
  }

  // ---- الأصول والمراجع ----
  getAssets(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/items/`, { params: params || { page_size: 300 } });
  }
  getAsset(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/items/${id}/`);
  }
  createAsset(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/items/`, payload);
  }
  updateAsset(id: string, payload: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/items/${id}/`, payload);
  }
  getCategories(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/categories/`, { params: { page_size: 200 } as any });
  }
  getLocations(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/locations/`, { params: { page_size: 200 } as any });
  }

  // ---- دورة حياة الأصل ----
  getDepreciations(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/depreciations/`, { params: params || { page_size: 300 } });
  }
  getAssignments(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/assignments/`, { params: params || { page_size: 200 } });
  }
  getWarranties(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/warranties/`, { params: { page_size: 200 } as any });
  }
  getMaintenances(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/maintenances/`, { params: { page_size: 200 } as any });
  }
  getDisposals(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/disposals/`, { params: { page_size: 200 } as any });
  }

  // ---- العمليات (تولّد قيوداً في المالية) ----
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
