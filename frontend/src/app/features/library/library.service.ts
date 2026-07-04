import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface LibraryStats {
  total_books: number;
  total_copies: number;
  borrowed_copies: number;
  digital_resources: number;
  unpaid_fines: number;
  pending_reservations: number;
}

@Injectable({
  providedIn: 'root'
})
export class LibraryService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/library';

  stats = signal<LibraryStats | null>(null);
  loading = signal<boolean>(false);

  getDashboardStats(): Observable<LibraryStats> {
    this.loading.set(true);
    return this.http.get<LibraryStats>(`${this.apiUrl}/items/dashboard-stats/`).pipe(
      tap({
        next: (data) => this.stats.set(data),
        finalize: () => this.loading.set(false)
      })
    );
  }

  getBooks(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/items/`);
  }

  getCopies(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/copies/`);
  }

  borrowBook(copyId: string, payload: { borrower_user_id: string; loan_period_days: number }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/copies/${copyId}/borrow/`, payload);
  }

  returnBook(borrowId: string, payload: { actual_return_date: string; debit_gl_account_id?: string; credit_gl_account_id?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/borrow/${borrowId}/return/`, payload);
  }
}
