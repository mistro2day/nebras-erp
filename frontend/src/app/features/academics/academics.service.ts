import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../core/services/api-client.service';
import { Observable } from 'rxjs';

export interface AcademicYear {
  id: string;
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  registration_start?: string;
  registration_end?: string;
  status: string;
  current_flag: boolean;
}

export interface Term {
  id: string;
  academic_year: string;
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  order: number;
  status: string;
}

export interface Stage {
  id: string;
  name: string;
  code: string;
  order: number;
  minimum_age: number;
  maximum_age: number;
}

export interface Grade {
  id: string;
  stage: string;
  name: string;
  code: string;
  order: number;
  passing_percentage: number;
  max_capacity: number;
}

@Injectable({
  providedIn: 'root'
})
export class AcademicsService {
  private apiClient = inject(ApiClientService);

  getAcademicYears(): Observable<any> {
    return this.apiClient.get<AcademicYear[]>('academics/academic-years/');
  }

  createAcademicYear(year: Partial<AcademicYear>): Observable<any> {
    return this.apiClient.post('academics/academic-years/', year);
  }

  getTerms(): Observable<any> {
    return this.apiClient.get<Term[]>('academics/terms/');
  }

  getStages(): Observable<any> {
    return this.apiClient.get<Stage[]>('academics/stages/');
  }

  getGrades(): Observable<any> {
    return this.apiClient.get<Grade[]>('academics/grades/');
  }
}