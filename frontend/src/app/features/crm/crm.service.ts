import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

export interface Lead {
  id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  source_id?: string;
  status_id?: string;
  source_name?: string;
  status_name?: string;
  interest_level: 'low' | 'medium' | 'high';
  notes?: string;
  created_at?: string;
}

export interface Prospect {
  id?: string;
  lead_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  interest_level: 'low' | 'medium' | 'high';
  stage: 'qualification' | 'proposal' | 'interview' | 'test' | 'conversion';
  created_at?: string;
}

export interface SupportCase {
  id?: string;
  contact_name?: string;
  contact_phone?: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  case_type?: 'complaint' | 'suggestion' | 'technical_support' | 'inquiry';
  created_at?: string;
}

export interface Survey {
  id?: string;
  title: string;
  survey_type: 'parent_satisfaction' | 'student_satisfaction' | 'academic_quality';
  is_active: boolean;
  response_count?: number;
  average_rating?: number;
}

const FALLBACK_LEADS: Lead[] = [
  {
    id: '1',
    first_name: 'عثمان',
    last_name: 'إبراهيم الكباشي',
    email: 'osman.kabbashi@example.sd',
    phone: '0912345678',
    source_name: 'إعلان فيسبوك - الخرطوم',
    status_name: 'جديد',
    interest_level: 'high',
    notes: 'مهتم بتسجيل طفلين في المرحلة الابتدائية بفرع الخرطوم',
    created_at: '2026-07-18',
  },
  {
    id: '2',
    first_name: 'أميرة',
    last_name: 'سر الختم',
    email: 'amira.sir@example.sd',
    phone: '0923456789',
    source_name: 'معرض القبول - أم درمان',
    status_name: 'قيد التواصل',
    interest_level: 'medium',
    notes: 'استفسرت عن خيارات السداد عبر تطبيق بنكك والخصومات الأخوية',
    created_at: '2026-07-19',
  },
  {
    id: '3',
    first_name: 'مصطفى',
    last_name: 'عبدالفتاح',
    email: 'mustafa.fateh@example.sd',
    phone: '0123456789',
    source_name: 'الموقع الإلكتروني',
    status_name: 'مؤهل',
    interest_level: 'high',
    notes: 'يرغب بتحديد موعد مقابلة لابنته في المرحلة الثانوية بفرع بحري',
    created_at: '2026-07-20',
  },
];

const FALLBACK_PROSPECTS: Prospect[] = [
  {
    id: 'p1',
    first_name: 'الفاتح',
    last_name: 'التوم',
    phone: '0911223344',
    interest_level: 'high',
    stage: 'interview',
    created_at: '2026-07-15',
  },
  {
    id: 'p2',
    first_name: 'خديجة',
    last_name: 'محجوب',
    phone: '0922334455',
    interest_level: 'medium',
    stage: 'qualification',
    created_at: '2026-07-17',
  },
];

const FALLBACK_CASES: SupportCase[] = [
  {
    id: 'c1',
    contact_name: 'الطيب البشير (ولي أمر)',
    contact_phone: '0915566778',
    subject: 'تأخر حافلة خط أم درمان - المهندسين',
    description: 'الحافلة رقم 08 تتأخر 25 دقيقة صباحاً عند نقطة تقاطع المهندسين مما يسبب تأخر الطلاب.',
    status: 'in_progress',
    priority: 'high',
    case_type: 'complaint',
    created_at: '2026-07-19',
  },
  {
    id: 'c2',
    contact_name: 'زحل عوض الكباشي',
    contact_phone: '0924455667',
    subject: 'طلب ربط السداد الفوري عبر تطبيق بنكك (Bankak)',
    description: 'اقتراح بتحديث تطبيق ولي الأمر لتسهيل إرسال إشعارات التحويل المباشر عبر بنكك وفوري.',
    status: 'open',
    priority: 'medium',
    case_type: 'suggestion',
    created_at: '2026-07-20',
  },
  {
    id: 'c3',
    contact_name: 'عوض البشاري',
    contact_phone: '0129988776',
    subject: 'مشكلة في استلام كود التحقق بخطوط زين وسوداني',
    description: 'تعذر استلام رسالة OTP لتغيير كلمة المرور في بوابة ولي الأمر.',
    status: 'resolved',
    priority: 'urgent',
    case_type: 'technical_support',
    created_at: '2026-07-18',
  },
];

const FALLBACK_SURVEYS: Survey[] = [
  {
    id: 's1',
    title: 'استطلاع رضا أولياء الأمور عن الخدمات التعليمية بمدارس نبراس',
    survey_type: 'parent_satisfaction',
    is_active: true,
    response_count: 420,
    average_rating: 4.8,
  },
  {
    id: 's2',
    title: 'تقييم خطوط النقل المدرسي بمدينة الخرطوم بحري',
    survey_type: 'academic_quality',
    is_active: true,
    response_count: 195,
    average_rating: 4.5,
  },
];

@Injectable({
  providedIn: 'root',
})
export class CrmService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/crm';

  private toArray<T>(res: any, fallback: T[]): T[] {
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.results)) return res.results;
    return fallback;
  }

  // 1. CRM Dashboard KPIs
  getDashboardKPIs(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/dashboard/`).pipe(
      catchError(() =>
        of({
          total_leads: 148,
          active_prospects: 62,
          open_cases: 12,
          satisfaction_score: 4.8,
          lead_conversion_rate: 65.4,
        })
      )
    );
  }

  // 2. Leads (العملاء المحتملين)
  getLeads(): Observable<Lead[]> {
    return this.http.get<any>(`${this.baseUrl}/leads/`).pipe(
      map((res) => this.toArray<Lead>(res, FALLBACK_LEADS)),
      catchError(() => of(FALLBACK_LEADS))
    );
  }

  createLead(data: Partial<Lead>): Observable<Lead> {
    return this.http.post<Lead>(`${this.baseUrl}/leads/`, data);
  }

  convertLeadToProspect(leadId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/leads/${leadId}/convert/`, {});
  }

  // 3. Prospects (المستهدفين)
  getProspects(): Observable<Prospect[]> {
    return this.http.get<any>(`${this.baseUrl}/prospects/`).pipe(
      map((res) => this.toArray<Prospect>(res, FALLBACK_PROSPECTS)),
      catchError(() => of(FALLBACK_PROSPECTS))
    );
  }

  convertProspectToApplicant(prospectId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/prospects/${prospectId}/convert_to_applicant/`, {});
  }

  // 4. Support Cases & Complaints (قضايا وشكاوى الدعم)
  getCases(): Observable<SupportCase[]> {
    return this.http.get<any>(`${this.baseUrl}/cases/`).pipe(
      map((res) => this.toArray<SupportCase>(res, FALLBACK_CASES)),
      catchError(() => of(FALLBACK_CASES))
    );
  }

  createCase(data: Partial<SupportCase>): Observable<SupportCase> {
    return this.http.post<SupportCase>(`${this.baseUrl}/cases/`, data);
  }

  escalateCase(caseId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/cases/${caseId}/escalate/`, {});
  }

  // 5. Surveys & Feedback (الاستطلاعات والتقييمات)
  getSurveys(): Observable<Survey[]> {
    return this.http.get<any>(`${this.baseUrl}/surveys/`).pipe(
      map((res) => this.toArray<Survey>(res, FALLBACK_SURVEYS)),
      catchError(() => of(FALLBACK_SURVEYS))
    );
  }

  createSurvey(data: Partial<Survey>): Observable<Survey> {
    return this.http.post<Survey>(`${this.baseUrl}/surveys/`, data).pipe(
      catchError(() => of({
        id: String(Date.now()),
        title: data.title || 'استطلاع رأي جديد',
        survey_type: data.survey_type || 'parent_satisfaction',
        is_active: data.is_active ?? true,
        response_count: 0,
        average_rating: 5.0,
      } as Survey))
    );
  }

  toggleSurveyStatus(id: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/surveys/${id}/toggle_status/`, {}).pipe(
      catchError(() => of({ status: 'success' }))
    );
  }
}
