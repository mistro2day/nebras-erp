import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TeacherCardComponent, TeacherInfo } from '../../shared/components/teacher-card/teacher-card.component';
import { TenantService } from '../../core/services/tenant.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbStatCardComponent } from '../../shared/nebras/nb-stat-card.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { AcademicsService } from '../academics/academics.service';
import { NotificationService } from '../../core/services/notification.service';
import { forkJoin } from 'rxjs';

export function pickList<T = any>(res: any): T[] {
  return res && res.data ? (Array.isArray(res.data) ? res.data : [res.data]) : (Array.isArray(res) ? res : []);
}

interface DetailedFaculty extends TeacherInfo {
  email: string;
  mobile: string;
  nationality: string;
  date_of_birth: string;
  department: string;
  joining_date: string;
  salary?: number;
  allowance?: number;
  contractType?: string;
}

interface DBTeacherAssignment {
  id?: string;
  faculty_member: string;
  faculty_member_name?: string;
  subject_id: string;
  subject_name?: string;
  section_id: string;
  section_name?: string;
  weekly_hours: number;
}

@Component({
  selector: 'app-faculty-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, FormsModule, TeacherCardComponent, NbPageHeaderComponent, NbStatCardComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="إدارة شؤون المعلمين وأعضاء هيئة التدريس"
        [subtitle]="'بوابة إدارة وتعيين المعلمين وأعضاء الهيئة الأكاديمية لـ ' + (($any(tenantService).currentTenant())?.nameAr || 'نبراس ERP')"
      ></nb-page-header>

      <!-- التبويبات -->
      <div class="tabs-nav">
        <button class="tab-btn" [class.active]="activeTab() === 'dashboard'" (click)="activeTab.set('dashboard')">
          📊 نظرة عامة
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'staff'" (click)="activeTab.set('staff')">
          👥 الكادر الأكاديمي
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'assignments'" (click)="activeTab.set('assignments')">
          📝 التكليفات التدريسية
        </button>
      </div>

      <!-- تبويب: نظرة عامة -->
      @if (activeTab() === 'dashboard') {
        <div class="stats-grid animate-fade">
          <nb-stat-card label="إجمالي الكادر الأكاديمي" [value]="teachers().length"></nb-stat-card>
          <nb-stat-card label="التكليفات النشطة" [value]="assignments().length" valueKind="info"></nb-stat-card>
          <nb-stat-card label="طلبات قيد المراجعة" [value]="getPendingCount()" [valueKind]="getPendingCount() ? 'warning' : 'default'"></nb-stat-card>
        </div>

        <div class="dashboard-sections animate-fade">
          <nb-panel title="إجراءات التكليف السريع" [flush]="true">
            <div class="quick-actions">
              <div class="action-card" (click)="activeTab.set('assignments')">
                <span class="icon">📝</span>
                <span class="title">إسناد تكليف جديد</span>
                <span class="desc">تعيين معلم لمادة دراسية وشعبة</span>
              </div>
              <div class="action-card" (click)="activeTab.set('staff')">
                <span class="icon">👥</span>
                <span class="title">ملفات المعلمين</span>
                <span class="desc">عرض العقود وتفاصيل الموارد البشرية</span>
              </div>
            </div>
          </nb-panel>

          <nb-panel title="ساعات النصاب التدريسي الموزعة">
            <div class="dist-chart">
              <div class="chart-item">
                <span class="label">أحمد محمد علي</span>
                <div class="bar-container"><div class="fill" style="width: 80%"></div></div>
                <span class="val">16 ساعة / 20</span>
              </div>
              <div class="chart-item">
                <span class="label">فاطمة عمر عثمان</span>
                <div class="bar-container"><div class="fill" style="width: 90%"></div></div>
                <span class="val">18 ساعة / 20</span>
              </div>
              <div class="chart-item">
                <span class="label">ياسر عبد الله الطيب</span>
                <div class="bar-container"><div class="fill" style="width: 60%"></div></div>
                <span class="val">12 ساعة / 20</span>
              </div>
              <div class="chart-item">
                <span class="label">حسن البشير الهادي</span>
                <div class="bar-container"><div class="fill" style="width: 70%"></div></div>
                <span class="val">14 ساعة / 20</span>
              </div>
            </div>
          </nb-panel>
        </div>
      }

      <!-- تبويب: دليل الكادر الأكاديمي -->
      @if (activeTab() === 'staff') {
        <h2 class="section-title">أعضاء هيئة التدريس النشطين</h2>
        <div class="cards-grid animate-fade">
          @for (teacher of teachers(); track teacher.id) {
            <div class="teacher-card-wrapper">
              <app-teacher-card [teacher]="teacher"></app-teacher-card>
              <button class="nb-btn-primary sm detail-btn" (click)="viewHRDetails(teacher)">
                👤 عرض تفاصيل الموارد البشرية والتعاقد
              </button>
            </div>
          }
          @if (teachers().length === 0) {
            <div class="no-data">لا يوجد كادر أكاديمي مسجل حالياً.</div>
          }
        </div>
      }

      <!-- تبويب: التكليفات التدريسية -->
      @if (activeTab() === 'assignments') {
        <div class="assignments-container animate-fade">
          <!-- قائمة التكليفات الحالية -->
          <nb-panel title="كشف التكليفات التدريسية الحالية" [flush]="true">
            <div class="tbl">
              <div class="tbl-head" style="grid-template-columns: 1.5fr 1.2fr 1.2fr 1fr 0.8fr">
                <span>المعلم</span><span>المادة الدراسية</span><span>الصف والفصل</span><span>ساعات النصاب</span><span>إجراءات</span>
              </div>
              @if (loadingAssignments()) {
                <div class="tbl-empty">جارٍ تحميل التكليفات التدريسية…</div>
              } @else if (assignments().length === 0) {
                <div class="tbl-empty">لا توجد تكليفات مسجلة حالياً.</div>
              } @else {
                @for (asn of assignments(); track asn.id) {
                  <div class="tbl-row" style="grid-template-columns: 1.5fr 1.2fr 1.2fr 1fr 0.8fr">
                    <span class="bold-text">{{ asn.faculty_member_name || '—' }}</span>
                    <span>{{ asn.subject_name || '—' }}</span>
                    <span>{{ asn.section_name || '—' }}</span>
                    <span class="hours">{{ asn.weekly_hours }} ساعات/أسبوع</span>
                    <span>
                      <button class="btn-delete" (click)="deleteAssignment(asn.id!)">إلغاء</button>
                    </span>
                  </div>
                }
              }
            </div>
          </nb-panel>

          <!-- استمارة تكليف جديد -->
          <nb-panel title="إسناد تكليف تدريسي جديد">
            <div class="assignment-form">
              <div class="form-grid">
                <div class="fld req">
                  <label>المعلم</label>
                  <select [(ngModel)]="newAsn.faculty_member">
                    <option value="">اختر المعلم…</option>
                    @for (t of teachers(); track t.id) {
                      <option [value]="t.id">{{ t.full_name_ar }}</option>
                    }
                  </select>
                </div>
                <div class="fld req">
                  <label>الصف الدراسي</label>
                  <select [(ngModel)]="selectedGradeId" (change)="onGradeChange()">
                    <option value="">اختر الصف…</option>
                    @for (g of grades(); track g.id) {
                      <option [value]="g.id">{{ g.name }}</option>
                    }
                  </select>
                </div>
                <div class="fld req">
                  <label>الفصل الدراسي</label>
                  <select [(ngModel)]="newAsn.section_id">
                    <option value="">اختر الفصل…</option>
                    @for (sec of filteredSections(); track sec.id) {
                      <option [value]="sec.id">{{ sec.name }}</option>
                    }
                  </select>
                </div>
                <div class="fld req">
                  <label>المادة الدراسية</label>
                  <select [(ngModel)]="newAsn.subject_id">
                    <option value="">اختر المادة…</option>
                    @for (sub of filteredSubjects(); track sub.id) {
                      <option [value]="sub.id">{{ sub.arabic_name }} ({{ sub.code }})</option>
                    }
                  </select>
                </div>
                <div class="fld req">
                  <label>الساعات الأسبوعية</label>
                  <input type="number" min="1" [(ngModel)]="newAsn.weekly_hours" />
                </div>
              </div>
              <div class="form-actions" style="margin-top: 16px;">
                <button class="nb-btn-primary" (click)="saveAssignment()" [disabled]="savingAsn()">
                  {{ savingAsn() ? 'جارٍ الحفظ…' : 'حفظ التكليف التدريسي' }}
                </button>
              </div>
            </div>
          </nb-panel>
        </div>
      }
    </div>

    <!-- نافذة تفاصيل الموارد البشرية والتعاقد -->
    @if (selectedFaculty()) {
      <div class="overlay" (click)="selectedFaculty.set(null)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>بيانات التعاقد والموارد البشرية</h3>
            <p class="modal-sub">تفاصيل ملف الموظف والراتب المسترجع من الموارد البشرية (HR).</p>
          </div>
          <div class="modal-body">
            <div class="profile-summary">
              <span class="avatar">{{ initials(selectedFaculty()!.full_name_ar) }}</span>
              <div class="meta">
                <h4>{{ selectedFaculty()!.full_name_ar }}</h4>
                <span class="pos">{{ selectedFaculty()!.current_position }}</span>
              </div>
            </div>

            <div class="detail-section">
              <h5>📋 تفاصيل التوظيف والعقد</h5>
              <div class="detail-row">
                <span>تاريخ التعيين:</span>
                <strong>{{ selectedFaculty()!.joining_date || '2023-01-15' }}</strong>
              </div>
              <div class="detail-row">
                <span>نوع العقد:</span>
                <strong>{{ selectedFaculty()!.contractType || 'دوام كامل' }}</strong>
              </div>
              <div class="detail-row">
                <span>القسم الإداري:</span>
                <strong>{{ selectedFaculty()!.department }}</strong>
              </div>
            </div>

            <div class="detail-section">
              <h5>💰 كشف راتب المعلم</h5>
              <div class="detail-row">
                <span>الراتب الأساسي:</span>
                <strong class="salary">{{ selectedFaculty()!.salary | number }} ج.س</strong>
              </div>
              <div class="detail-row">
                <span>البدلات الإضافية:</span>
                <strong>{{ selectedFaculty()!.allowance | number }} ج.س</strong>
              </div>
              <div class="detail-row total">
                <span>إجمالي الراتب المستحق:</span>
                <strong class="salary">{{ (selectedFaculty()!.salary! + selectedFaculty()!.allowance!) | number }} ج.س</strong>
              </div>
            </div>
          </div>
          <div class="modal-actions">
            <button class="nb-btn-primary" (click)="selectedFaculty.set(null)">إغلاق</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; font-family: var(--nb-font-family); background: var(--nb-background); }
    .tabs-nav { display: flex; gap: 8px; border-bottom: 2px solid var(--nb-border-soft); margin-bottom: 24px; padding-bottom: 4px; }
    .tab-btn { background: none; border: none; padding: 10px 18px; font-family: var(--nb-font-family); font-size: 14px;
      font-weight: 600; color: var(--nb-text-secondary); cursor: pointer; border-radius: var(--nb-radius); transition: all 0.2s; }
    .tab-btn:hover { background: var(--nb-surface-raised); color: var(--nb-text); }
    .tab-btn.active { background: var(--nb-primary-50); color: var(--nb-primary-700); font-weight: 700; }

    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .section-title { font-size: 14px; font-weight: 700; color: var(--nb-text); margin: 0 0 12px; }

    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .teacher-card-wrapper { display: flex; flex-direction: column; gap: 8px; }
    .detail-btn { width: 100%; text-align: center; }

    .dashboard-sections { display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; margin-top: 24px; }
    @media (max-width: 900px) { .dashboard-sections { grid-template-columns: 1fr; } }

    /* الإجراءات السريعة */
    .quick-actions { display: grid; grid-template-columns: 1fr; gap: 12px; padding: 16px; }
    .action-card { display: flex; flex-direction: column; align-items: flex-start; text-align: right; background: var(--nb-surface);
      border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius-card); padding: 14px; cursor: pointer; transition: all 0.2s; }
    .action-card:hover { border-color: var(--nb-primary-400); box-shadow: 0 4px 12px var(--nb-primary-50); transform: translateY(-2px); }
    .action-card .icon { font-size: 20px; margin-bottom: 6px; }
    .action-card .title { font-weight: 700; font-size: 13.5px; color: var(--nb-text); }
    .action-card .desc { font-size: 11px; color: var(--nb-text-muted); }

    /* جدول التوزيع */
    .dist-chart { display: flex; flex-direction: column; gap: 12px; padding: 12px; }
    .chart-item { display: grid; grid-template-columns: 1.2fr 2fr 1fr; align-items: center; gap: 12px; font-size: 12px; }
    .chart-item .label { font-weight: 600; color: var(--nb-text); }
    .bar-container { height: 6px; background: var(--nb-surface-raised); border-radius: 3px; overflow: hidden; }
    .bar-container .fill { height: 100%; background: var(--nb-primary-500); border-radius: 3px; }
    .chart-item .val { color: var(--nb-text-secondary); text-align: left; }

    /* التكليفات التدريسية */
    .assignments-container { display: grid; grid-template-columns: 1.6fr 1fr; gap: 20px; }
    @media (max-width: 900px) { .assignments-container { grid-template-columns: 1fr; } }

    /* الجداول */
    .tbl { display: flex; flex-direction: column; width: 100%; }
    .tbl-head { display: grid; padding: 12px 18px; background: var(--nb-surface-raised); border-bottom: 1px solid var(--nb-border);
      font-size: 13px; font-weight: 700; color: var(--nb-text-secondary); }
    .tbl-row { display: grid; padding: 12px 18px; border-bottom: 1px solid var(--nb-border-soft); align-items: center; font-size: 13px; color: var(--nb-text); }
    .tbl-row:hover { background: var(--nb-surface-raised); }
    .tbl-empty { text-align: center; padding: 32px; font-size: 13px; color: var(--nb-text-muted); }
    .bold-text { font-weight: 700; color: var(--nb-text); }
    .hours { font-weight: 600; color: var(--nb-primary-600); }
    .btn-delete { border: none; background: var(--nb-danger-50, #ffebeb); color: var(--nb-danger, #ff3b30); padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .btn-delete:hover { background: #ffd2d2; }

    /* استمارة الإضافة */
    .assignment-form { padding: 16px; }
    .form-grid { display: flex; flex-direction: column; gap: 14px; }
    .fld { display: flex; flex-direction: column; gap: 5px; }
    .fld label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
    .fld select, .fld input { height: 36px; padding: 0 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); font-size: 13px; font-family: var(--nb-font-family); background: var(--nb-surface); color: var(--nb-text); outline: none; }
    .fld select:focus, .fld input:focus { border-color: var(--nb-primary-600); }

    .no-data { text-align: center; padding: 28px; color: var(--nb-text-muted); font-size: 13px; }
    .animate-fade { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

    /* النوافذ والمنبثقة للرواتب */
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fade .18s; }
    .modal { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 24px; width: 440px; max-width: 90vw; }
    .modal h3 { margin: 0 0 6px; font-size: 16px; color: var(--nb-text); }
    .modal-sub { margin: 0 0 16px; font-size: 12px; color: var(--nb-text-muted); }
    .profile-summary { display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--nb-border-soft); padding-bottom: 14px; margin-bottom: 16px; }
    .profile-summary .avatar { width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--nb-primary-100); color: var(--nb-primary-700); font-weight: bold; }
    .profile-summary h4 { margin: 0; font-size: 14.5px; color: var(--nb-text); }
    .profile-summary .pos { font-size: 12px; color: var(--nb-text-secondary); }

    .detail-section { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .detail-section h5 { margin: 0 0 4px; font-size: 13px; color: var(--nb-text); border-bottom: 1px solid var(--nb-border-soft); padding-bottom: 4px; }
    .detail-row { display: flex; justify-content: space-between; font-size: 12.5px; }
    .detail-row span { color: var(--nb-text-secondary); }
    .detail-row strong { color: var(--nb-text); }
    .detail-row strong.salary { color: var(--nb-primary-700); font-weight: 700; }
    .detail-row.total { border-top: 1px dashed var(--nb-border); padding-top: 8px; font-weight: 700; font-size: 13.5px; }
  `]
})
export class FacultyDashboardComponent implements OnInit {
  tenantService = inject(TenantService);
  http = inject(HttpClient);
  academicsSvc = inject(AcademicsService);
  notify = inject(NotificationService);

  readonly activeTab = signal<'dashboard' | 'staff' | 'assignments'>('dashboard');

  readonly teachers = signal<DetailedFaculty[]>([]);
  readonly assignments = signal<DBTeacherAssignment[]>([]);
  readonly loadingAssignments = signal(false);

  // مصادر البيانات للأكاديميات
  readonly years = signal<any[]>([]);
  readonly terms = signal<any[]>([]);
  readonly grades = signal<any[]>([]);
  readonly allSections = signal<any[]>([]);
  readonly allSubjects = signal<any[]>([]);

  // الفلاتر للتكليف الجديد
  selectedGradeId = '';
  readonly filteredSections = computed(() => this.allSections().filter(sec => sec.grade === this.selectedGradeId));
  readonly filteredSubjects = computed(() => {
    // إرجاع المواد التي تبدأ بترميز الصف المختار تسهيلاً للتسكين
    const grade = this.grades().find(g => g.id === this.selectedGradeId);
    if (!grade) return [];
    // ترميز الصف مثل "الصف الأول الابتدائي" يطابق "g1-" في كود المادة
    const codePrefix = this.getGradeCodePrefix(grade.name);
    return this.allSubjects().filter(sub => sub.code.toLowerCase().startsWith(codePrefix));
  });

  private getGradeCodePrefix(name: string): string {
    if (name.includes('الأول')) return 'g1-';
    if (name.includes('الثاني')) return 'g2-';
    if (name.includes('الثالث')) return 'g3-';
    if (name.includes('الرابع')) return 'g4-';
    if (name.includes('الخامس')) return 'g5-';
    if (name.includes('السادس')) return 'g6-';
    if (name.includes('المتوسط')) return 'g7-'; // متوسط أول
    if (name.includes('الثانوي')) return 'g8-'; // ثانوي أول
    return 'g1-';
  }

  // استمارة تكليف جديد
  newAsn = {
    faculty_member: '',
    subject_id: '',
    section_id: '',
    weekly_hours: 4
  };
  savingAsn = signal(false);

  // المعلم المختار لعرض تفاصيل التعاقد المربوطة
  readonly selectedFaculty = signal<DetailedFaculty | null>(null);

  // رواتب تجريبية يتم ربطها وربط المعلم بها
  private readonly mockHRData: Record<string, { salary: number; allowance: number; type: string }> = {
    'أحمد محمد علي': { salary: 380000, allowance: 76000, type: 'دوام كامل' },
    'فاطمة عمر عثمان': { salary: 350000, allowance: 70000, type: 'دوام كامل' },
    'ياسر عبد الله الطيب': { salary: 320000, allowance: 64000, type: 'دوام كامل' },
    'حسن البشير الهادي': { salary: 300000, allowance: 60000, type: 'دوام كامل' },
    'خديجة الطيب محمد': { salary: 360000, allowance: 72000, type: 'عقد مؤقت' }
  };

  ngOnInit() {
    this.loadTeachers();
    this.loadAssignments();
    this.loadAcademicsMeta();
  }

  loadTeachers() {
    this.http.get<any>('/api/v1/faculty/members/').subscribe({
      next: (res) => {
        if (res && res.success) {
          const list = pickList<any>(res).map(t => {
            // محاكاة سحب البيانات من الموارد البشرية بالاسم
            const hr = this.mockHRData[t.full_name_ar] || { salary: 280000, allowance: 56000, type: 'دوام كامل' };
            return {
              ...t,
              salary: hr.salary,
              allowance: hr.allowance,
              contractType: hr.type
            };
          });
          this.teachers.set(list);
        }
      }
    });
  }

  loadAssignments() {
    this.loadingAssignments.set(true);
    this.http.get<any>('/api/v1/faculty/assignments/').subscribe({
      next: (res) => {
        if (res && res.success) {
          const list = pickList<any>(res);
          this.assignments.set(list.map(asn => ({
            id: asn.id,
            faculty_member: asn.faculty_member,
            faculty_member_name: this.teachers().find(t => t.id === asn.faculty_member)?.full_name_ar || 'معلم تجريبي',
            subject_id: asn.subject_id,
            subject_name: this.allSubjects().find(s => s.id === asn.subject_id)?.arabic_name || 'مادة تخصص',
            section_id: asn.section_id,
            section_name: this.allSections().find(sec => sec.id === asn.section_id)?.name || 'فصل دراسي',
            weekly_hours: asn.weekly_hours
          })));
        }
        this.loadingAssignments.set(false);
      },
      error: () => this.loadingAssignments.set(false)
    });
  }

  loadAcademicsMeta() {
    forkJoin({
      years: this.academicsSvc.getAcademicYears(),
      terms: this.academicsSvc.getTerms(),
      grades: this.academicsSvc.getGrades(),
      sections: this.academicsSvc.getSections(),
      subjects: this.academicsSvc.getSubjects()
    }).subscribe({
      next: (res) => {
        this.years.set(pickList(res.years));
        this.terms.set(pickList(res.terms));
        this.grades.set(pickList(res.grades));
        this.allSections.set(pickList(res.sections));
        this.allSubjects.set(pickList(res.subjects));
        // تحديث أسماء التكليفات بعد تحميل البيانات المشتركة
        this.loadAssignments();
      }
    });
  }

  onGradeChange() {
    this.newAsn.section_id = '';
    this.newAsn.subject_id = '';
  }

  saveAssignment() {
    if (!this.newAsn.faculty_member || !this.newAsn.subject_id || !this.newAsn.section_id) {
      this.notify.error('يرجى اختيار المعلم والمادة والفصل الدراسي.');
      return;
    }
    this.savingAsn.set(true);

    const year = this.years().find(y => y.current_flag) ?? this.years()[0];
    const term = this.terms()[0];

    const body = {
      faculty_member: this.newAsn.faculty_member,
      academic_year_id: year?.id || '00000000-0000-0000-0000-000000000000',
      term_id: term?.id || '00000000-0000-0000-0000-000000000000',
      subject_id: this.newAsn.subject_id,
      section_id: this.newAsn.section_id,
      weekly_hours: this.newAsn.weekly_hours
    };

    this.http.post<any>('/api/v1/faculty/assignments/', body).subscribe({
      next: () => {
        this.savingAsn.set(false);
        this.notify.success('تم تسجيل وإسناد التكليف التدريسي للمعلم بنجاح.');
        this.newAsn = { faculty_member: '', subject_id: '', section_id: '', weekly_hours: 4 };
        this.selectedGradeId = '';
        this.loadAssignments();
      },
      error: (e) => {
        this.savingAsn.set(false);
        this.notify.error(e?.error?.message || 'تعذر حفظ التكليف التدريسي.');
      }
    });
  }

  deleteAssignment(id: string) {
    this.http.delete<any>(`/api/v1/faculty/assignments/${id}/`).subscribe({
      next: () => {
        this.notify.success('تم إلغاء التكليف التدريسي بنجاح.');
        this.loadAssignments();
      }
    });
  }

  viewHRDetails(t: DetailedFaculty) {
    this.selectedFaculty.set(t);
  }

  getPendingCount(): number {
    return this.teachers().filter(t => t.status === 'pending_review' || t.status === 'draft').length;
  }

  initials(name: string): string {
    const parts = name.replace('أ.', '').replace('م.', '').trim().split(' ');
    return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  }
}