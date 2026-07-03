import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../core/services/api-client.service';
import { Observable } from 'rxjs';

export interface Applicant {
  id: string;
  arabic_full_name: string;
  english_full_name?: string;
  gender: string;
  date_of_birth: string;
  nationality: string;
  national_id: string;
  passport_number?: string;
  application_number: string;
  status: string;
}

export interface Guardian {
  id: string;
  applicant: string;
  relationship: string;
  full_name: string;
  phone: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdmissionsService {
  private apiClient = inject(ApiClientService);

  getApplicants(): Observable<any> {
    return this.apiClient.get<Applicant[]>('admissions/applicants/');
  }

  createApplicant(applicant: Partial<Applicant>): Observable<any> {
    return this.apiClient.post('admissions/applicants/', applicant);
  }

  getGuardians(): Observable<any> {
    return this.apiClient.get<Guardian[]>('admissions/guardians/');
  }
}