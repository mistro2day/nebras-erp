import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface InventoryStats {
  total_items: number;
  total_warehouses: number;
  total_value: number;
  out_of_stock: number;
  low_stock: number;
  pending_transfers: number;
  pending_adjustments: number;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private http = inject(HttpClient);
  /** رابط مطلق مثل بقية الخدمات العاملة — المسار النسبي يذهب لخادم Angular ويردّ بـ index.html. */
  private apiUrl = `${environment.apiUrl}inventory`;

  stats = signal<InventoryStats | null>(null);
  loading = signal<boolean>(false);

  getDashboardStats(): Observable<InventoryStats> {
    this.loading.set(true);
    return this.http.get<InventoryStats>(`${this.apiUrl}/items/dashboard-stats/`).pipe(
      tap({ next: (data) => this.stats.set(data), finalize: () => this.loading.set(false) }),
    );
  }

  // ---- المراجع الأساسية ----
  getWarehouses(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/warehouses/`, { params: params || { page_size: 200 } });
  }
  getCategories(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/categories/`, { params: { page_size: 200 } as any });
  }
  getUnits(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/units/`, { params: { page_size: 200 } as any });
  }
  getBins(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/bins/`, { params: { page_size: 300 } as any });
  }

  // ---- الأصناف والأرصدة ----
  getItems(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/items/`, { params: params || { page_size: 300 } });
  }
  getItem(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/items/${id}/`);
  }
  createItem(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/items/`, payload);
  }
  getBalances(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/balances/`, { params: params || { page_size: 300 } });
  }
  getReorderRules(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reorder-rules/`, { params: { page_size: 300 } as any });
  }

  // ---- الحركة والمستندات ----
  getMovements(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/movements/`, { params: params || { page_size: 200 } });
  }
  getTransactions(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/transactions/`, { params: params || { page_size: 200 } });
  }
  getReceipts(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/receipts/`, { params: params || { page_size: 200 } });
  }
  getIssues(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/issues/`, { params: params || { page_size: 200 } });
  }
  getTransfers(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/transfers/`, { params: params || { page_size: 200 } });
  }
  getAdjustments(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/adjustments/`, { params: params || { page_size: 200 } });
  }

  // ---- العمليات (تولّد قيوداً في المالية) ----
  /** استلام بضاعة مقابل أمر شراء معتمد — يربط المشتريات بالمخزون وينشئ قيد الاستحقاق. */
  receivePO(payload: { purchase_order_id: string; warehouse_id: string; items: any[] }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/receipts/receive-po/`, payload);
  }
  issueStock(payload: { warehouse_id: string; issue_type: string; items: any[] }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/issues/issue-stock/`, payload);
  }
  adjustStock(payload: { warehouse_id: string; items: any[]; reason: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/adjustments/adjust-stock/`, payload);
  }
}
