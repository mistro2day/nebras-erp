import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../../core/services/api-client.service';

export interface DashboardKpis {
  total_students: number;
  boys_count: number;
  girls_count: number;
  attendance_rate: number;
  pending_approvals: number;
  total_forms_submissions: number;
  pending_payments_count: number;
  pending_payments_amount: number;
  collection_rate: number;
  total_staff_count?: number;
}

export interface FormMatrixItem {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  color_theme: 'indigo' | 'emerald' | 'amber' | 'blue' | 'rose' | 'violet';
  total: number;
  submissions: number;
  pending: number;
  approved: number;
  progress: number;
  link: string;
  action_label: string;
}

export interface FunnelStage {
  label: string;
  value: string;
  width: number;
  color: string;
  success?: boolean;
}

export interface LiveActivityItem {
  id: string;
  type: string;
  title: string;
  author: string;
  time: string;
  status: string;
  status_class: string;
  icon: string;
  link: string;
}

export interface FinancialTrendPoint {
  month: string;
  revenue: number;
  expenses: number;
}

export interface DashboardOverviewResponse {
  kpis: DashboardKpis;
  forms_matrix: FormMatrixItem[];
  admissions_funnel: FunnelStage[];
  inbox: any[];
  recent_activities: LiveActivityItem[];
  financial_trend: FinancialTrendPoint[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly api = inject(ApiClientService);

  getOverview(branch: 'all' | 'boys' | 'girls' = 'all'): Observable<ApiResponse<DashboardOverviewResponse>> {
    return this.api.get<ApiResponse<DashboardOverviewResponse>>('dashboard/overview/', { branch });
  }
}
