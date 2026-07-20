import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AIConversation {
  id: string;
  tenant_id: string;
  user_id?: string;
  prompt: string;
  response: string;
  tokens_used: number;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class AIService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/ai';

  getConversations(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/conversations/`);
  }

  askAI(prompt: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/conversations/ask/`, { prompt });
  }

  clearHistory(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/conversations/clear-history/`, {});
  }
}
