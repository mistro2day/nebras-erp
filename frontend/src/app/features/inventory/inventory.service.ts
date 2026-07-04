import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface InventoryStats {
  total_items: number;
  total_warehouses: number;
  total_value: number;
  out_of_stock: number;
  low_stock: number;
  pending_transfers: number;
  pending_adjustments: number;
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/inventory';

  // Signals for state management
  stats = signal<InventoryStats | null>(null);
  loading = signal<boolean>(false);

  getDashboardStats(): Observable<InventoryStats> {
    this.loading.set(true);
    return this.http.get<InventoryStats>(`${this.apiUrl}/items/dashboard-stats/`).pipe(
      tap({
        next: (data) => this.stats.set(data),
        finalize: () => this.loading.set(false)
      })
    );
  }

  getWarehouses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/warehouses/`);
  }

  getInventoryItems(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/items/`);
  }

  receivePO(payload: { purchase_order_id: string; warehouse_id: string; items: any[] }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/receipts/receive-po/`, payload);
  }

  issueStock(payload: { warehouse_id: string; issue_type: string; items: any[] }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/issues/issue-stock/`, payload);
  }

  adjustStock(payload: { warehouse_id: string; items: any[]; reason: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/adjustments/adjust-stock/`, payload);
  }

  getTransfers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/transfers/`);
  }
}
