import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiClientService } from './api-client.service';

export interface BackendFolder {
  id: string;
  name: string;
  parent?: string;
  folder_type: string;
  department_id?: string;
  created_at: string;
  count: number;
}

export interface BackendDocument {
  id: string;
  title: string;
  folder?: string;
  folder_name?: string;
  category?: string;
  doc_type?: string;
  current_version_number: string;
  is_locked: boolean;
  owner_id?: string;
  file_size_bytes: number;
  file_size_formatted: string;
  created_at: string;
  versions?: any[];
  latest_version_path?: string;
  file_extension?: string;
}

export interface StorageStats {
  used_gb: number;
  quota_gb: number;
  total_docs: number;
  locked_count: number;
  folder_count: number;
}

export interface ActivityItem {
  action: string;
  actor: string;
  at: string;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private api = inject(ApiClientService);

  getFolders(): Observable<BackendFolder[]> {
    return this.api.get<any>('documents/folders/').pipe(
      map(res => Array.isArray(res) ? res : (res?.data || []))
    );
  }

  createFolder(name: string, folder_type = 'department'): Observable<BackendFolder> {
    return this.api.post<any>('documents/folders/', { name, folder_type }).pipe(
      map(res => res?.data || res)
    );
  }

  getDocuments(folderId?: string, search?: string): Observable<BackendDocument[]> {
    return this.api.get<any>('documents/files/', { folder: folderId, search }).pipe(
      map(res => Array.isArray(res) ? res : (res?.data || []))
    );
  }

  getStorageStats(): Observable<StorageStats> {
    return this.api.get<any>('documents/files/storage-stats/').pipe(
      map(res => res?.data || res)
    );
  }

  getActivityLog(): Observable<ActivityItem[]> {
    return this.api.get<any>('documents/files/activity-log/').pipe(
      map(res => Array.isArray(res) ? res : (res?.data || []))
    );
  }

  uploadDocument(formData: FormData): Observable<BackendDocument> {
    return this.api.post<any>('documents/files/upload/', formData).pipe(
      map(res => res?.data || res)
    );
  }

  addVersion(documentId: string, formData: FormData): Observable<any> {
    return this.api.post<any>(`documents/files/${documentId}/version/`, formData).pipe(
      map(res => res?.data || res)
    );
  }

  lockDocument(documentId: string): Observable<any> {
    return this.api.post<any>(`documents/files/${documentId}/lock/`, {}).pipe(
      map(res => res?.data || res)
    );
  }

  unlockDocument(documentId: string): Observable<any> {
    return this.api.post<any>(`documents/files/${documentId}/unlock/`, {}).pipe(
      map(res => res?.data || res)
    );
  }
}
