import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface LibraryStats {
  total_books: number;
  total_copies: number;
  borrowed_copies: number;
  digital_resources: number;
  unpaid_fines: number;
  pending_reservations: number;
}

/** شخص يحقّ له الاستعارة — طالب أو موظف، بشكل موحّد. */
export interface Person {
  id: string;
  type: 'student' | 'employee';
  type_label: string;
  name: string;
  reference: string;
}

@Injectable({ providedIn: 'root' })
export class LibraryService {
  private http = inject(HttpClient);
  /** رابط مطلق مثل بقية الخدمات العاملة — المسار النسبي يذهب لخادم Angular ويردّ بـ index.html. */
  private apiUrl = `${environment.apiUrl}library`;

  stats = signal<LibraryStats | null>(null);
  loading = signal<boolean>(false);

  getDashboardStats(): Observable<LibraryStats> {
    this.loading.set(true);
    return this.http.get<LibraryStats>(`${this.apiUrl}/items/dashboard-stats/`).pipe(
      tap({ next: (d) => this.stats.set(d), finalize: () => this.loading.set(false) }),
    );
  }

  /** الطلاب والموظفون بأسمائهم — يحلّ معرّفات المستعيرين. */
  getPeople(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/borrows/people/`);
  }

  // ---- الكتالوج ----
  getBooks(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/items/`, { params: params || { page_size: 300 } });
  }
  createBook(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/items/`, payload);
  }
  getCopies(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/copies/`, { params: params || { page_size: 300 } });
  }
  createCopy(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/copies/`, payload);
  }

  // ---- المرجعيات ----
  getCategories(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/categories/`, { params: { page_size: 200 } as any });
  }
  getAuthors(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/authors/`, { params: { page_size: 300 } as any });
  }
  getPublishers(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/publishers/`, { params: { page_size: 200 } as any });
  }
  getLanguages(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/languages/`, { params: { page_size: 100 } as any });
  }
  getShelves(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/shelves/`, { params: { page_size: 200 } as any });
  }
  getSettings(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/settings/`, { params: { page_size: 10 } as any });
  }

  // ---- الاستعارة والإرجاع ----
  getBorrows(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/borrows/`, { params: params || { page_size: 300 } });
  }
  /** الاستعارة تتم على نسخة بعينها لا على الكتاب — النسخة هي ما يُسلَّم فعلاً. */
  borrowCopy(copyId: string, payload: {
    borrower_user_id: string; borrower_type: string; loan_period_days?: number;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/copies/${copyId}/borrow/`, payload);
  }
  returnBorrow(borrowId: string, payload: {
    actual_return_date: string; debit_gl_account_id?: string; credit_gl_account_id?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/borrows/${borrowId}/return/`, payload);
  }

  // ---- الغرامات ----
  getFines(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/fines/`, { params: params || { page_size: 300 } });
  }
  updateFine(id: string, payload: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/fines/${id}/`, payload);
  }
}
