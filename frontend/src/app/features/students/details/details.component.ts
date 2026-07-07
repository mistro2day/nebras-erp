import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { StudentsService } from '../students.service';

/**
 * تفاصيل الطالب — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-student-details',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatTabsModule],
  template: `
    @if (student(); as s) {
      <div class="page" dir="rtl">
        <div class="nb-card summary-card">
          <div class="summary-content">
            <div class="avatar-section">
              <div class="avatar-placeholder">{{ (s.profile?.arabic_name || '؟').charAt(0) }}</div>
              <div class="basic-info">
                <h2>{{ s.profile?.arabic_name }}</h2>
                <p class="eng-name">{{ s.profile?.english_name }}</p>
                <div class="badge-row">
                  <span [class]="statusBadge(s.status)">{{ statusText(s.status) }}</span>
                  <span class="num-badge">رقم الطالب: {{ s.student_number }}</span>
                </div>
              </div>
            </div>
            <div class="quick-stats">
              <div class="stat-item"><span class="label">الجنسية</span><span class="val">{{ s.profile?.nationality }}</span></div>
              <div class="stat-item"><span class="label">الجنس</span><span class="val">{{ s.profile?.gender === 'male' ? 'ذكر' : 'أنثى' }}</span></div>
              <div class="stat-item"><span class="label">تاريخ الميلاد</span><span class="val">{{ s.profile?.date_of_birth }}</span></div>
            </div>
          </div>
        </div>

        <div class="nb-card tabs-card">
          <mat-tab-group class="nb-tabs">
            <mat-tab label="الملف الشخصي">
              <div class="tab-content">
                <h3>البيانات الشخصية والوطنية</h3>
                <div class="info-grid">
                  <div class="info-item"><strong>الهوية الوطنية / الإقامة:</strong> {{ s.profile?.national_id || 'غير متوفر' }}</div>
                  <div class="info-item"><strong>رقم جواز السفر:</strong> {{ s.profile?.passport || 'غير متوفر' }}</div>
                  <div class="info-item"><strong>الديانة:</strong> {{ s.profile?.religion || 'غير متوفر' }}</div>
                  <div class="info-item"><strong>فصيلة الدم:</strong> {{ s.profile?.blood_group || 'غير متوفر' }}</div>
                  <div class="info-item"><strong>اللغات المفضلة:</strong> {{ s.profile?.languages?.join(', ') || 'العربية' }}</div>
                </div>
                <hr class="nb-divider" />
                <h3>الاحتياجات والبرامج الخاصة</h3>
                <div class="info-grid">
                  <div class="info-item"><strong>ذوي الاحتياجات الخاصة:</strong> {{ s.profile?.special_needs || 'لا يوجد' }}</div>
                  <div class="info-item"><strong>صعوبات التعلم:</strong> {{ s.profile?.learning_difficulty || 'لا يوجد' }}</div>
                  <div class="info-item"><strong>برامج الموهوبين:</strong> {{ s.profile?.talented_program || 'لا يوجد' }}</div>
                </div>
              </div>
            </mat-tab>

            <mat-tab label="الملف الطبي">
              <div class="tab-content">
                <h3>الوضع الصحي والاحتياطات الطبية</h3>
                @if (s.medical_profile; as m) {
                  <div class="info-grid">
                    <div class="info-item"><strong>الحساسية:</strong> {{ m.allergies?.join(', ') || 'لا يوجد' }}</div>
                    <div class="info-item"><strong>الأمراض المزمنة:</strong> {{ m.chronic_diseases?.join(', ') || 'لا يوجد' }}</div>
                    <div class="info-item"><strong>الأدوية الموصوفة:</strong> {{ m.medication?.join(', ') || 'لا يوجد' }}</div>
                    <div class="info-item"><strong>طبيب الأسرة المفضل:</strong> {{ m.doctor || 'غير متوفر' }}</div>
                  </div>
                  <hr class="nb-divider" />
                  <h3>الاتصال الطبي في الطوارئ</h3>
                  @if (m.emergency_medical_contact; as ec) {
                    <div class="info-item">
                      <p><strong>اسم جهة الاتصال:</strong> {{ ec.name || 'غير متوفر' }}</p>
                      <p><strong>رقم الهاتف:</strong> {{ ec.phone || 'غير متوفر' }}</p>
                    </div>
                  }
                }
              </div>
            </mat-tab>

            <mat-tab label="شؤون العائلة">
              <div class="tab-content">
                <h3>أولياء الأمور والمرافقين</h3>
                <div class="family-list">
                  @for (member of s.family_relations; track $index) {
                    <div class="info-item family-item">
                      <div class="member-header">
                        <h4>{{ member.full_name }}</h4>
                        <span class="nb-badge-ai">{{ member.relationship }}</span>
                      </div>
                      <p><strong>الهاتف:</strong> {{ member.phone }}</p>
                      <p><strong>البريد الإلكتروني:</strong> {{ member.email || 'غير متوفر' }}</p>
                      <p><strong>الهوية الوطنية:</strong> {{ member.national_id || 'غير متوفر' }}</p>
                    </div>
                  }
                  @if (s.family_relations?.length === 0) {
                    <div class="no-data">لم يتم تسجيل أفراد العائلة بعد.</div>
                  }
                </div>
              </div>
            </mat-tab>

            <mat-tab label="الخط الزمني للأنشطة">
              <div class="tab-content">
                <h3>سجل أنشطة دورة حياة الطالب</h3>
                <div class="timeline">
                  @for (event of timeline(); track $index) {
                    <div class="timeline-event">
                      <div class="event-dot"></div>
                      <div class="event-details">
                        <div class="event-header">
                          <h4>{{ event.title }}</h4>
                          <span class="event-date">{{ event.date | date:'medium' }}</span>
                        </div>
                        <p class="event-comment">{{ event.comments }}</p>
                      </div>
                    </div>
                  }
                  @if (timeline().length === 0) {
                    <div class="no-data">لا يوجد سجل أنشطة مسجل للطالب حالياً.</div>
                  }
                </div>
              </div>
            </mat-tab>
          </mat-tab-group>
        </div>
      </div>
    }
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .summary-card { padding: 20px; margin-bottom: 16px; }
    .summary-content { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 24px; }
    .avatar-section { display: flex; align-items: center; gap: 16px; }
    .avatar-placeholder {
      width: 64px; height: 64px; border-radius: 50%;
      background: var(--nb-primary-50); color: var(--nb-primary-600);
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; font-weight: 700;
    }
    .basic-info h2 { font-size: 20px; font-weight: 700; margin: 0; color: var(--nb-text); }
    .eng-name { color: var(--nb-text-muted); margin: 2px 0 10px; font-size: 13px; }
    .badge-row { display: flex; gap: 8px; align-items: center; }
    .num-badge {
      background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft);
      padding: 2px 8px; border-radius: var(--nb-radius-sm); font-size: 12px; color: var(--nb-text-secondary);
    }
    .quick-stats { display: flex; gap: 28px; }
    .stat-item { display: flex; flex-direction: column; align-items: flex-end; }
    .stat-item .label { font-size: 11px; color: var(--nb-text-muted); }
    .stat-item .val { font-size: 15px; font-weight: 600; color: var(--nb-text); margin-top: 2px; }
    .tabs-card { padding: 8px 12px 16px; }
    .tab-content { padding: 16px 4px; }
    .tab-content h3 { color: var(--nb-primary-600); font-size: 14px; margin: 0 0 14px; font-weight: 700; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .info-item {
      background: var(--nb-surface-raised);
      padding: 12px;
      border-radius: var(--nb-radius);
      border: 1px solid var(--nb-border-soft);
      font-size: 13px;
      color: var(--nb-text);
    }
    .info-item strong { color: var(--nb-text-muted); display: block; margin-bottom: 4px; font-weight: 600; }
    .info-item p { margin: 6px 0; }
    .info-item p strong { display: inline; margin: 0; }
    .nb-divider { border: 0; border-top: 1px solid var(--nb-border); margin: 20px 0; }
    .family-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px; }
    .member-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid var(--nb-border-soft); padding-bottom: 8px; }
    .member-header h4 { margin: 0; font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .timeline { display: flex; flex-direction: column; gap: 12px; position: relative; padding-right: 20px; }
    .timeline::before { content: ''; position: absolute; right: 5px; top: 4px; bottom: 4px; width: 2px; background: var(--nb-border); }
    .timeline-event { display: flex; gap: 16px; position: relative; }
    .event-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--nb-primary-600); position: absolute; right: -19px; top: 14px; border: 2px solid var(--nb-surface); }
    .event-details { flex: 1; background: var(--nb-surface-raised); padding: 12px 14px; border-radius: var(--nb-radius); border: 1px solid var(--nb-border-soft); }
    .event-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .event-header h4 { margin: 0; font-size: 13px; font-weight: 700; color: var(--nb-text); }
    .event-date { font-size: 11px; color: var(--nb-text-muted); }
    .event-comment { margin: 0; color: var(--nb-text-secondary); font-size: 12px; }
    .no-data { text-align: center; padding: 28px; color: var(--nb-text-muted); font-size: 13px; }
  `]
})
export class StudentDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private studentsService = inject(StudentsService);

  student = this.studentsService.selectedStudent;
  timeline = signal<any[]>([]);

  statusBadge(status: string): string {
    const map: Record<string, string> = {
      active: 'nb-badge-success',
      registered: 'nb-badge-info',
      suspended: 'nb-badge-danger',
      graduated: 'nb-badge-ai',
      withdrawn: 'nb-badge-neutral',
    };
    return map[status] || 'nb-badge-neutral';
  }

  statusText(status: string): string {
    const map: Record<string, string> = {
      active: 'نشط',
      registered: 'مسجل',
      suspended: 'موقوف',
      graduated: 'متخرج',
      withdrawn: 'منسحب',
    };
    return map[status] || status;
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.studentsService.getStudentById(id).subscribe();
        this.studentsService.getTimeline(id).subscribe(res => {
          if (res && res.success) {
            this.timeline.set(res.data);
          }
        });
      }
    });
  }
}