import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../core/services/api-client.service';
import { Observable } from 'rxjs';

export interface Branch {
  id: string;
  name: string;
  name_ar?: string;
  name_en?: string;
  code: string;
  is_active: boolean;
  address?: string;
  city?: string;
  state?: string;
  country: string;
}

export interface Campus {
  id: string;
  branch: string;
  name: string;
  code: string;
  is_active: boolean;
}

export interface Building {
  id: string;
  campus: string;
  name: string;
  code: string;
  is_active: boolean;
}

export interface Room {
  id: string;
  floor: string;
  number: string;
  name?: string;
  capacity: number;
  is_active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OrganizationService {
  private apiClient = inject(ApiClientService);

  getBranches(): Observable<any> {
    return this.apiClient.get<Branch[]>('organization/branches/');
  }

  createBranch(branch: Partial<Branch>): Observable<any> {
    return this.apiClient.post('organization/branches/', branch);
  }

  getCampuses(): Observable<any> {
    return this.apiClient.get<Campus[]>('organization/campuses/');
  }

  getBuildings(): Observable<any> {
    return this.apiClient.get<Building[]>('organization/buildings/');
  }

  getRooms(): Observable<any> {
    return this.apiClient.get<Room[]>('organization/rooms/');
  }
}