import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface KnowledgeArticle {
  id?: string;
  title: string;
  content: string;
  category: string;
  created_at?: string;
  updated_at?: string;
  views_count?: number;
  tags?: string;
}

@Injectable({
  providedIn: 'root',
})
export class KnowledgeService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/crm/knowledge-articles/';

  getArticles(category?: string, search?: string): Observable<KnowledgeArticle[]> {
    let params = new HttpParams();
    if (category && category !== 'all') {
      params = params.set('category', category);
    }
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<KnowledgeArticle[]>(this.baseUrl, { params });
  }

  getArticle(id: string): Observable<KnowledgeArticle> {
    return this.http.get<KnowledgeArticle>(`${this.baseUrl}${id}/`);
  }

  createArticle(article: Partial<KnowledgeArticle>): Observable<KnowledgeArticle> {
    return this.http.post<KnowledgeArticle>(this.baseUrl, article);
  }

  updateArticle(id: string, article: Partial<KnowledgeArticle>): Observable<KnowledgeArticle> {
    return this.http.patch<KnowledgeArticle>(`${this.baseUrl}${id}/`, article);
  }

  deleteArticle(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${id}/`);
  }
}
