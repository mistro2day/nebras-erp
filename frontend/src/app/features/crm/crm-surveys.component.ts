import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrmService, Survey } from './crm.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';

export interface FeedbackItem {
  id: string;
  respondent: string;
  rating: number;
  comments: string;
  date: string;
}

@Component({
  selector: 'app-crm-surveys',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="استطلاعات الرأي ومؤشر الرضا (Surveys & NPS)"
        subtitle="قياس انطباعات ورضا أولياء الأمور والطلاب بالسودان، تحليل التغذية الراجعة، وتطوير الخدمات التعليمية."
      >
        <button class="nb-btn-primary" (click)="toggleCreateModal()">+ إنشاء استبيان جديد</button>
      </nb-page-header>

      <div class="nps-summary-grid">
        <div class="nps-card">
          <div class="nps-value">{{ overallAvgRating() }} <span class="max">/ 5</span></div>
          <div class="nps-label">مؤشر رضا أولياء الأمور (CSAT)</div>
          <div class="nps-stars">★★★★★</div>
        </div>
        <div class="nps-card">
          <div class="nps-value">+68 <span class="max">NPS</span></div>
          <div class="nps-label">مؤشر صافي الترويج (Net Promoter Score)</div>
          <div class="nps-badge success">ممتاز جداً</div>
        </div>
        <div class="nps-card">
          <div class="nps-value">{{ totalResponsesCount() }}</div>
          <div class="nps-label">إجمالي المشاركات والتغذية الراجعة</div>
          <div class="nps-sub">خلال هذا الفصل الدراسي بمدارس الخرطوم وأم درمان</div>
        </div>
      </div>

      <nb-panel>
        <h3 class="section-subtitle">الاستبيانات النشطة والسابقة</h3>
        <div class="surveys-grid">
          @for (s of safeSurveys(); track s.id) {
            <div class="survey-card">
              <div class="survey-header">
                <span class="survey-type">
                  {{ s.survey_type === 'parent_satisfaction' ? 'رضا أولياء الأمور' : s.survey_type === 'student_satisfaction' ? 'رضا الطلاب' : 'الجودة الأكاديمية' }}
                </span>
                <span class="status-indicator" [class.active]="s.is_active" (click)="toggleStatus(s)">
                  {{ s.is_active ? 'مفعل نشط (انقر للإغلاق)' : 'مغلق (انقر للتفعيل)' }}
                </span>
              </div>
              <h4>{{ s.title }}</h4>
              
              <div class="survey-stats">
                <div class="stat">
                  <span class="val">{{ s.response_count || 0 }}</span>
                  <span class="lbl">مشاركة</span>
                </div>
                <div class="stat">
                  <span class="val rating">★ {{ s.average_rating || 5.0 }}</span>
                  <span class="lbl">التقييم العام</span>
                </div>
              </div>

              <div class="survey-footer">
                <button class="btn-link" (click)="openDetailsModal(s)">استعراض التفاصيل والتحليلات ➔</button>
              </div>
            </div>
          } @empty {
            <div class="empty-state">لا توجد استطلاعات رأي حالياً. انقر على "إنشاء استبيان جديد" للبدء.</div>
          }
        </div>
      </nb-panel>

      <!-- Modal إنشاء استبيان جديد (Nebras OS Approved Modal) -->
      @if (showCreateModal()) {
        <div class="modal-backdrop" (click)="toggleCreateModal()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>إنشاء استبيان جديد</h3>
              <button class="close-btn" (click)="toggleCreateModal()">×</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>عنوان الاستبيان *</label>
                <input type="text" [(ngModel)]="newSurveyData.title" placeholder="مثال: قياس رضا أولياء الأمور عن خدمات النقل بفرع الخرطوم" />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>نوع الاستبيان</label>
                  <select [(ngModel)]="newSurveyData.survey_type">
                    <option value="parent_satisfaction">رضا أولياء الأمور (Parent CSAT)</option>
                    <option value="student_satisfaction">رضا الطلاب (Student NPS)</option>
                    <option value="academic_quality">الجودة والخدمات الأكاديمية</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>حالة الاستبيان</label>
                  <select [ngModel]="newSurveyData.is_active" (ngModelChange)="newSurveyData.is_active = $event === 'true'">
                    <option value="true">نشط ومتاح للمشاركة فوراً</option>
                    <option value="false">مسودة (غير مفعل)</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="nb-btn-secondary" (click)="toggleCreateModal()">إلغاء</button>
              <button class="nb-btn-primary" (click)="saveNewSurvey()">نشر الاستبيان</button>
            </div>
          </div>
        </div>
      }

      <!-- Modal تفاصيل وتحليلات الاستبيان (Nebras OS Approved Modal) -->
      @if (selectedSurvey()) {
        <div class="modal-backdrop" (click)="closeDetailsModal()">
          <div class="modal-card modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h3>{{ selectedSurvey()?.title }}</h3>
                <span class="sub-header-type">
                  النوع: {{ selectedSurvey()?.survey_type === 'parent_satisfaction' ? 'رضا أولياء الأمور' : 'الجودة والخدمات' }}
                </span>
              </div>
              <button class="close-btn" (click)="closeDetailsModal()">×</button>
            </div>

            <div class="modal-body">
              <div class="analytics-row">
                <div class="an-box">
                  <span class="an-num">★ {{ selectedSurvey()?.average_rating }}</span>
                  <span class="an-lbl">متوسط التقييم</span>
                </div>
                <div class="an-box">
                  <span class="an-num">{{ selectedSurvey()?.response_count }}</span>
                  <span class="an-lbl">عدد المشاركات</span>
                </div>
                <div class="an-box">
                  <span class="an-status" [class.active]="selectedSurvey()?.is_active">
                    {{ selectedSurvey()?.is_active ? 'نشط ومستمر' : 'مغلق' }}
                  </span>
                  <button class="btn-toggle-small" (click)="toggleStatus(selectedSurvey()!)">
                    {{ selectedSurvey()?.is_active ? 'إغلاق الاستبيان' : 'إعادة تفعيل' }}
                  </button>
                </div>
              </div>

              <!-- تفكيك التقييمات -->
              <h4 class="sub-title">توزيع التقييمات بالأقسام</h4>
              <div class="rating-bars">
                <div class="r-bar-item">
                  <span>5 نجوم (ممتاز)</span>
                  <div class="bar-track"><div class="bar-fill" style="width: 78%"></div></div>
                  <span>78%</span>
                </div>
                <div class="r-bar-item">
                  <span>4 نجوم (جيد جداً)</span>
                  <div class="bar-track"><div class="bar-fill" style="width: 16%"></div></div>
                  <span>16%</span>
                </div>
                <div class="r-bar-item">
                  <span>3 نجوم فأقل</span>
                  <div class="bar-track"><div class="bar-fill bad" style="width: 6%"></div></div>
                  <span>6%</span>
                </div>
              </div>

              <!-- التغذية الراجعة والملاحظات -->
              <div class="feedback-header">
                <h4 class="sub-title">أحدث الملاحظات والآراء الواردة</h4>
                <button class="btn-add-fb" (click)="openAddFeedbackModal()">+ تسجيل تقييم جديد يدوي</button>
              </div>

              <div class="feedback-list">
                @for (fb of sampleFeedbacks(); track fb.id) {
                  <div class="fb-card">
                    <div class="fb-top">
                      <strong>👤 {{ fb.respondent }}</strong>
                      <span class="fb-stars">★ {{ fb.rating }}.0</span>
                      <span class="fb-date">{{ fb.date }}</span>
                    </div>
                    <p class="fb-comment">"{{ fb.comments }}"</p>
                  </div>
                }
              </div>
            </div>

            <div class="modal-footer">
              <button class="nb-btn-secondary" (click)="closeDetailsModal()">إغلاق الشاشة</button>
            </div>
          </div>
        </div>
      }

      <!-- Modal إضافة تقييم وملاحظة جديدة بوب اب نبراس المعتمد (Nebras OS Custom Popup) -->
      @if (showFeedbackModal()) {
        <div class="modal-backdrop z-top" (click)="closeAddFeedbackModal()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>تسجيل تقييم وملاحظة جديدة بالاستبيان</h3>
              <button class="close-btn" (click)="closeAddFeedbackModal()">×</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>اسم ولي الأمر / المشارك *</label>
                <input type="text" [(ngModel)]="newFeedbackForm.respondent" placeholder="مثال: الطيب البشير (ولي أمر)" />
              </div>
              <div class="form-group">
                <label>الدرجة والتقييم</label>
                <select [(ngModel)]="newFeedbackForm.rating">
                  <option [ngValue]="5">★★★★★ (5 نجوم - ممتاز)</option>
                  <option [ngValue]="4">★★★★☆ (4 نجوم - جيد جداً)</option>
                  <option [ngValue]="3">★★★☆☆ (3 نجوم - متوسط)</option>
                </select>
              </div>
              <div class="form-group">
                <label>نص الملاحظة أو الرأي *</label>
                <textarea rows="3" [(ngModel)]="newFeedbackForm.comments" placeholder="أدخل الملاحظة أو الاقتراح حول الخدمات التعليمية..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="nb-btn-secondary" (click)="closeAddFeedbackModal()">إلغاء</button>
              <button class="nb-btn-primary" (click)="submitNewFeedback()">حفظ التقييم والملاحظة</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .nps-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-bottom: 16px; }
    .nps-card { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-lg, 10px); padding: 18px; text-align: center; }
    .nps-value { font-size: 28px; font-weight: 800; color: var(--nb-primary-600); }
    .nps-value .max { font-size: 14px; color: var(--nb-text-muted); font-weight: 500; }
    .nps-label { font-size: 12.5px; font-weight: 600; color: var(--nb-text); margin-top: 4px; }
    .nps-stars { color: #f59e0b; font-size: 16px; margin-top: 4px; }
    .nps-badge.success { background: #dcfce7; color: #166534; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; display: inline-block; margin-top: 6px; }
    .nps-sub { font-size: 11px; color: var(--nb-text-muted); margin-top: 4px; }

    .section-subtitle { font-size: 14px; font-weight: 700; color: var(--nb-text); margin: 0 0 14px; }
    .surveys-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px; }
    .survey-card { background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius); padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .survey-header { display: flex; justify-content: space-between; align-items: center; }
    .survey-type { font-size: 11.5px; font-weight: 600; color: var(--nb-primary-600); background: var(--nb-primary-50); padding: 2px 8px; border-radius: var(--nb-radius-sm); }
    .status-indicator { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: #f1f5f9; color: #475569; cursor: pointer; transition: opacity 0.2s; }
    .status-indicator:hover { opacity: 0.8; }
    .status-indicator.active { background: #dcfce7; color: #15803d; }
    .survey-card h4 { margin: 0; font-size: 14px; font-weight: 700; color: var(--nb-text); line-height: 1.4; }
    .survey-stats { display: flex; gap: 24px; border-top: 1px solid var(--nb-border-soft); border-bottom: 1px solid var(--nb-border-soft); padding: 10px 0; }
    .stat { display: flex; flex-direction: column; }
    .stat .val { font-size: 16px; font-weight: 700; color: var(--nb-text); }
    .stat .val.rating { color: #d97706; }
    .stat .lbl { font-size: 11px; color: var(--nb-text-muted); }
    .survey-footer { display: flex; justify-content: flex-end; }
    .btn-link { background: none; border: none; color: var(--nb-primary-600); font-size: 12px; font-weight: 600; cursor: pointer; padding: 0; }
    .btn-link:hover { text-decoration: underline; }
    .empty-state { grid-column: 1 / -1; text-align: center; padding: 32px; color: var(--nb-text-muted); }

    /* Modal */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-backdrop.z-top { z-index: 1100; }
    .modal-card { background: var(--nb-surface); width: 500px; max-width: 90vw; border-radius: var(--nb-radius-lg, 12px); box-shadow: 0 10px 25px rgba(0,0,0,0.15); overflow: hidden; }
    .modal-card.modal-lg { width: 680px; }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--nb-border-soft); }
    .modal-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--nb-text); }
    .sub-header-type { font-size: 11.5px; color: var(--nb-text-muted); }
    .close-btn { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--nb-text-muted); }
    .modal-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; max-height: 75vh; overflow-y: auto; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group label { font-size: 12px; font-weight: 600; color: var(--nb-text-secondary); }
    .form-group input, .form-group select, .form-group textarea { padding: 8px 12px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); font-size: 13px; outline: none; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--nb-border-soft); background: var(--nb-bg); }

    /* Modal Analytics */
    .analytics-row { display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 12px; background: var(--nb-bg); padding: 12px; border-radius: var(--nb-radius); }
    .an-box { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
    .an-num { font-size: 20px; font-weight: 800; color: var(--nb-primary-600); }
    .an-lbl { font-size: 11px; color: var(--nb-text-muted); }
    .an-status { font-size: 11px; font-weight: 700; color: #dc2626; margin-bottom: 4px; }
    .an-status.active { color: #166534; }
    .btn-toggle-small { font-size: 11px; padding: 4px 8px; border-radius: var(--nb-radius-sm); border: 1px solid var(--nb-border); background: var(--nb-surface); cursor: pointer; }

    .sub-title { font-size: 13px; font-weight: 700; color: var(--nb-text); margin: 4px 0 8px; }
    .rating-bars { display: flex; flex-direction: column; gap: 8px; }
    .r-bar-item { display: grid; grid-template-columns: 120px 1fr 40px; align-items: center; gap: 10px; font-size: 12px; color: var(--nb-text-secondary); }
    .bar-track { height: 8px; background: var(--nb-border-soft); border-radius: 999px; overflow: hidden; }
    .bar-fill { height: 100%; background: var(--nb-primary-600); }
    .bar-fill.bad { background: #f97316; }

    .feedback-header { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
    .btn-add-fb { font-size: 11.5px; font-weight: 600; color: var(--nb-primary-600); background: transparent; border: 1px solid var(--nb-primary-600); padding: 4px 10px; border-radius: var(--nb-radius); cursor: pointer; }
    .feedback-list { display: flex; flex-direction: column; gap: 10px; }
    .fb-card { background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); padding: 10px 12px; border-radius: var(--nb-radius); }
    .fb-top { display: flex; justify-content: space-between; font-size: 12px; color: var(--nb-text); margin-bottom: 4px; }
    .fb-stars { color: #d97706; font-weight: 700; }
    .fb-date { font-size: 11px; color: var(--nb-text-muted); }
    .fb-comment { margin: 0; font-size: 12px; color: var(--nb-text-secondary); font-style: italic; }

    .nb-btn-primary { background: var(--nb-primary-600); color: white; border: none; padding: 8px 16px; border-radius: var(--nb-radius); font-size: 13px; font-weight: 600; cursor: pointer; }
    .nb-btn-secondary { background: var(--nb-surface); border: 1px solid var(--nb-border); color: var(--nb-text); padding: 8px 16px; border-radius: var(--nb-radius); font-size: 13px; cursor: pointer; }
  `]
})
export class CrmSurveysComponent {
  private crmService = inject(CrmService);
  surveys = signal<Survey[]>([]);

  showCreateModal = signal(false);
  selectedSurvey = signal<Survey | null>(null);
  showFeedbackModal = signal(false);

  newSurveyData: Partial<Survey> = {
    title: '',
    survey_type: 'parent_satisfaction',
    is_active: true,
  };

  newFeedbackForm = {
    respondent: '',
    rating: 5,
    comments: '',
  };

  sampleFeedbacks = signal<FeedbackItem[]>([
    {
      id: '1',
      respondent: 'الطيب البشير (ولي أمر - فرع أم درمان)',
      rating: 5,
      comments: 'الخدمات المدرسية ممتازة وتفاعل الإدارة رائع خصوصاً في متابعة غياب الطلاب والحافلات.',
      date: '2026-07-20',
    },
    {
      id: '2',
      respondent: 'أميرة سر الختم (ولي أمر - فرع الخرطوم)',
      rating: 5,
      comments: 'سهولة الدفع والسداد عبر تطبيق بنكك وفرت علينا الجهد والوقت. شكراً لكم.',
      date: '2026-07-19',
    },
    {
      id: '3',
      respondent: 'عثمان إبراهيم (ولي أمر - فرع بحري)',
      rating: 4,
      comments: 'نتمنى زيادة الأنشطة الرياضية والرحلات الميدانية خلال الفصل القادم.',
      date: '2026-07-18',
    },
  ]);

  constructor() {
    this.crmService.getSurveys().subscribe((data) => {
      const arr = Array.isArray(data) ? data : (data as any)?.results || [];
      this.surveys.set(arr);
    });
  }

  safeSurveys = computed(() => {
    const raw = this.surveys();
    return Array.isArray(raw) ? raw : [];
  });

  overallAvgRating = computed(() => {
    const list = this.safeSurveys();
    if (!list.length) return '4.8';
    const sum = list.reduce((acc, curr) => acc + (curr.average_rating || 5.0), 0);
    return (sum / list.length).toFixed(1);
  });

  totalResponsesCount = computed(() => {
    const list = this.safeSurveys();
    return list.reduce((acc, curr) => acc + (curr.response_count || 0), 0);
  });

  toggleCreateModal(): void {
    this.showCreateModal.update((v) => !v);
  }

  saveNewSurvey(): void {
    if (!this.newSurveyData.title) return;
    this.crmService.createSurvey(this.newSurveyData).subscribe((newSurvey) => {
      this.surveys.update((list) => [newSurvey, ...(Array.isArray(list) ? list : [])]);
      this.toggleCreateModal();
      this.newSurveyData = { title: '', survey_type: 'parent_satisfaction', is_active: true };
    });
  }

  openDetailsModal(s: Survey): void {
    this.selectedSurvey.set(s);
  }

  closeDetailsModal(): void {
    this.selectedSurvey.set(null);
  }

  toggleStatus(s: Survey): void {
    const nextStatus = !s.is_active;
    this.crmService.toggleSurveyStatus(s.id!).subscribe(() => {
      this.surveys.update((list) =>
        (Array.isArray(list) ? list : []).map((item) =>
          item.id === s.id ? { ...item, is_active: nextStatus } : item
        )
      );
      if (this.selectedSurvey()?.id === s.id) {
        this.selectedSurvey.update((curr) => (curr ? { ...curr, is_active: nextStatus } : null));
      }
    });
  }

  openAddFeedbackModal(): void {
    this.newFeedbackForm = { respondent: '', rating: 5, comments: '' };
    this.showFeedbackModal.set(true);
  }

  closeAddFeedbackModal(): void {
    this.showFeedbackModal.set(false);
  }

  submitNewFeedback(): void {
    if (!this.newFeedbackForm.respondent || !this.newFeedbackForm.comments) return;

    const newItem: FeedbackItem = {
      id: String(Date.now()),
      respondent: this.newFeedbackForm.respondent,
      rating: this.newFeedbackForm.rating || 5,
      comments: this.newFeedbackForm.comments,
      date: new Date().toISOString().split('T')[0],
    };

    this.sampleFeedbacks.update((list) => [newItem, ...list]);

    if (this.selectedSurvey()) {
      const currentId = this.selectedSurvey()!.id;
      this.surveys.update((list) =>
        (Array.isArray(list) ? list : []).map((item) =>
          item.id === currentId
            ? {
                ...item,
                response_count: (item.response_count || 0) + 1,
              }
            : item
        )
      );
      this.selectedSurvey.update((curr) =>
        curr ? { ...curr, response_count: (curr.response_count || 0) + 1 } : null
      );
    }

    this.closeAddFeedbackModal();
  }
}
