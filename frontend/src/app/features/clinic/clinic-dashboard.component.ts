import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClinicService } from './clinic.service';
import { StudentsService } from '../students/students.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../shared/nebras/nb-stat-card.component';
import { NbModalComponent } from '../../shared/nebras/nb-modal.component';
import { NbDrawerComponent } from '../../shared/nebras/nb-drawer.component';

@Component({
  selector: 'app-clinic-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    NbPageHeaderComponent,
    NbPanelComponent,
    NbStatCardComponent,
    NbModalComponent,
    NbDrawerComponent
  ],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="نظام العيادة المدرسية والسجلات الصحية (SHIS)"
        subtitle="مراقبة الزيارات الطبية اليومية، الحالات الطارئة، صرف الأدوية والمستلزمات، واعتماد التقارير والإجازات المرضية"
      >
        <div class="actions-group">
          <button class="nb-btn-primary" (click)="openNewVisitModal()">🩺 تسجيل زيارة جديدة</button>
          <button class="nb-btn-secondary" (click)="loadDashboard()">🔄 تحديث البيانات</button>
        </div>
      </nb-page-header>

      @if (clinicService.stats(); as stats) {
        <div class="stats-grid">
          <nb-stat-card label="زيارات اليوم" [value]="stats.today_visits" suffix="زيارة" valueKind="info"></nb-stat-card>
          <nb-stat-card label="الحالات الإسعافية" [value]="stats.emergency_cases" suffix="حالة" [valueKind]="stats.emergency_cases ? 'danger' : 'default'"></nb-stat-card>
          <nb-stat-card label="حالات العزل الوقائي" [value]="stats.active_isolations" suffix="نشطة" [valueKind]="stats.active_isolations ? 'warning' : 'default'"></nb-stat-card>
          <nb-stat-card label="تقارير وإجازات معلقة" [value]="stats.pending_leaves" suffix="إجازة" [valueKind]="stats.pending_leaves ? 'warning' : 'default'"></nb-stat-card>
        </div>
      }

      <div class="grid-layout">
        <!-- سجل الزيارات -->
        <nb-panel title="سجل مراجعات وزيارات العيادة الحديثة" [flush]="true">
          <div class="tbl">
            <div class="tbl-head">
              <span>المريض</span>
              <span>نوع الزيارة</span>
              <span>الحالة</span>
              <span>الإجراءات</span>
            </div>
            @for (row of visits(); track row.id) {
              <div class="tbl-row" (click)="selectVisit(row)">
                <span class="strong text-indigo">{{ getStudentName(row.patient_user_id) }}</span>
                <span>
                  <span [class]="getVisitTypeClass(row.visit_type)">{{ getVisitTypeText(row.visit_type) }}</span>
                </span>
                <span>
                  <span [class]="getStatusClass(row.status)">{{ getStatusText(row.status) }}</span>
                </span>
                <span class="row-actions" (click)="$event.stopPropagation()">
                  <button class="nb-btn-secondary nb-btn-compact" (click)="openDispenseModal(row)">💊 صرف دواء</button>
                </span>
              </div>
            }
            @if (visits().length === 0) { <div class="tbl-empty">لا توجد زيارات مسجلة اليوم.</div> }
          </div>
        </nb-panel>

        <!-- الإجازات المرضية -->
        <nb-panel title="الطلبات والتقارير الطبية المعلقة" [flush]="true">
          <div class="tbl">
            <div class="tbl-head">
              <span>المريض</span>
              <span>الفترة</span>
              <span>السبب</span>
              <span>الإجراء</span>
            </div>
            @for (row of leaves(); track row.id) {
              <div class="tbl-row">
                <span class="strong">{{ getStudentName(row.patient_user_id) }}</span>
                <span>من {{ row.start_date }} إلى {{ row.end_date }}</span>
                <span>{{ row.reason }}</span>
                <span>
                  @if (row.status === 'submitted') {
                    <button class="nb-btn-primary nb-btn-compact success" (click)="approveLeave(row.id)">✅ اعتماد</button>
                  } @else {
                    <span class="nb-badge-success">معتمد</span>
                  }
                </span>
              </div>
            }
            @if (leaves().length === 0) { <div class="tbl-empty">لا توجد طلبات إجازة معلقة.</div> }
          </div>
        </nb-panel>
      </div>
    </div>

    <!-- نافذة تسجيل زيارة جديدة -->
    <nb-modal [open]="isNewVisitModalOpen()" title="تسجيل زيارة طبية جديدة" subtitle="إدخال بيانات الكشف وتوثيق الزيارة" (closed)="isNewVisitModalOpen.set(false)">
      <div class="form-container">
        <div class="form-group" style="position: relative;">
          <label>البحث واختيار الطالب / المريض</label>
          <input type="text" [(ngModel)]="patientSearchQuery" (focus)="showPatientDropdown.set(true)" placeholder="اكتب اسم الطالب للبحث..." class="nb-input" />
          @if (showPatientDropdown()) {
            <div class="search-dropdown">
              @for (s of filteredStudents(patientSearchQuery); track s.id) {
                <div class="dropdown-item" (click)="selectPatient(s)">
                  {{ s.profile.arabic_name }} ({{ s.student_number }})
                </div>
              }
              @if (filteredStudents(patientSearchQuery).length === 0) {
                <div class="dropdown-empty">لا توجد نتائج مطابقة</div>
              }
            </div>
          }
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>نوع الزيارة</label>
            <select [(ngModel)]="newVisitData.visit_type" class="nb-input">
              <option value="walk_in">حالة طارئة/عابرة</option>
              <option value="scheduled">موعد كشف دوري</option>
              <option value="emergency">حالة طارئة جداً</option>
              <option value="follow_up">متابعة حالة</option>
            </select>
          </div>
          <div class="form-group">
            <label>العيادة</label>
            <select [(ngModel)]="newVisitData.clinic_id" class="nb-input">
              @for (c of clinics(); track c.id) {
                <option [value]="c.id">{{ c.name_ar }}</option>
              }
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>ملاحظات الكشف والأعراض</label>
          <textarea [(ngModel)]="newVisitData.notes" placeholder="اكتب شكوى المريض أو الأعراض الطارئة هنا..." class="nb-input" rows="3"></textarea>
        </div>
      </div>
      <div modal-actions>
        <button class="nb-btn-secondary" (click)="isNewVisitModalOpen.set(false)">إلغاء</button>
        <button class="nb-btn-primary" (click)="submitNewVisit()">حفظ الزيارة</button>
      </div>
    </nb-modal>

    <!-- نافذة صرف الدواء -->
    <nb-modal [open]="isDispenseModalOpen()" title="💊 صرف دواء ومستلزمات علاجية" subtitle="خصم فوري وتلقائي من مستودع العيادة" (closed)="isDispenseModalOpen.set(false)">
      <div class="form-container">
        <p class="summary-text">صرف دواء للمريض: <strong class="text-indigo">{{ getStudentName(selectedVisitForDispense()?.patient_user_id) }}</strong></p>
        <div class="form-group">
          <label>البند الطبي / الدواء</label>
          <select [(ngModel)]="dispenseData.medication_id" class="nb-input">
            <option value="">-- اختر الدواء --</option>
            @for (m of medications(); track m.id) {
              <option [value]="m.id">{{ m.trade_name }} ({{ m.generic_name }})</option>
            }
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>الكمية المصروفة</label>
            <input type="number" [(ngModel)]="dispenseData.quantity" min="1" class="nb-input" />
          </div>
          <div class="form-group">
            <label>المستودع</label>
            <input type="text" [(ngModel)]="dispenseData.warehouse_id" placeholder="اختياري (معرف المستودع)" class="nb-input" />
          </div>
        </div>
      </div>
      <div modal-actions>
        <button class="nb-btn-secondary" (click)="isDispenseModalOpen.set(false)">إلغاء</button>
        <button class="nb-btn-primary" (click)="submitDispenseMedication()">تأكيد الصرف</button>
      </div>
    </nb-modal>

    <!-- لوح تفاصيل الزيارة منزلق -->
    <nb-drawer [open]="!!selectedVisit()" [title]="'تفاصيل الزيارة الطبية'" [subtitle]="'سجل المريض وبياناته الحيوية'" (closed)="selectedVisit.set(null)">
      @if (selectedVisit(); as visit) {
        <div class="visit-detail-sheet">
          <div class="detail-card">
            <h3>الملف الأساسي</h3>
            <p><strong>المريض:</strong> {{ getStudentName(visit.patient_user_id) }}</p>
            <p><strong>نوع الزيارة:</strong> <span [class]="getVisitTypeClass(visit.visit_type)">{{ getVisitTypeText(visit.visit_type) }}</span></p>
            <p><strong>الحالة الحالية:</strong> <span [class]="getStatusClass(visit.status)">{{ getStatusText(visit.status) }}</span></p>
            <p><strong>وقت الدخول:</strong> {{ visit.check_in_time | date:'medium' }}</p>
          </div>

          @if (visit.notes) {
            <div class="detail-card">
              <h3>ملاحظات الكشف والأعراض</h3>
              <p class="notes-content">{{ visit.notes }}</p>
            </div>
          }
        </div>
      }
      <div drawer-actions>
        <button class="nb-btn-secondary" (click)="selectedVisit.set(null)">إغلاق</button>
      </div>
    </nb-drawer>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
    .actions-group { display: flex; gap: 8px; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
    }
    .grid-layout {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 16px;
    }
    @media (max-width: 992px) {
      .grid-layout { grid-template-columns: 1fr; }
    }
    .tbl { display: flex; flex-direction: column; }
    .tbl-head, .tbl-row {
      display: grid;
      grid-template-columns: 1.5fr 1.2fr 1.2fr 1fr;
      gap: 8px;
      padding: 10px 16px;
      align-items: center;
    }
    .tbl-head {
      background: var(--nb-surface-raised);
      border-bottom: 1px solid var(--nb-border-soft);
      font-size: 11px;
      font-weight: 700;
      color: var(--nb-text-muted);
    }
    .tbl-row {
      border-bottom: 1px solid var(--nb-border-row);
      font-size: 13px;
      color: var(--nb-text);
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .tbl-row:last-child { border-bottom: none; }
    .tbl-row:hover { background: var(--nb-surface-raised); }
    .strong { font-weight: 600; }
    .text-indigo { color: var(--nb-primary-600); }
    .tbl-empty { padding: 32px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
    
    .nb-input {
      width: 100%;
      height: var(--nb-input-height);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius);
      padding: 0 10px;
      font-size: 13px;
      outline: none;
      background: var(--nb-surface);
      color: var(--nb-text);
      font-family: var(--nb-font-family);
    }
    .nb-input:focus { border-color: var(--nb-primary-600); box-shadow: var(--nb-focus-ring); }
    textarea.nb-input { height: auto; padding: 10px; }
    
    .form-container { display: flex; flex-direction: column; gap: 14px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group label { font-size: 11.5px; font-weight: 600; color: var(--nb-text-secondary); }
    
    .summary-text { font-size: 13px; color: var(--nb-text-secondary); margin-bottom: 8px; }
    
    .visit-detail-sheet { display: flex; flex-direction: column; gap: 12px; }
    .detail-card {
      background: var(--nb-surface-raised);
      border: 1px solid var(--nb-border-soft);
      border-radius: var(--nb-radius-card);
      padding: 14px;
    }
    .detail-card h3 { font-size: 13.5px; font-weight: 700; margin: 0 0 10px 0; color: var(--nb-text); border-bottom: 1px solid var(--nb-border-soft); padding-bottom: 6px; }
    .detail-card p { margin: 6px 0; font-size: 13px; color: var(--nb-text-secondary); }
    .notes-content { background: var(--nb-surface); padding: 10px; border-radius: var(--nb-radius); border: 1px solid var(--nb-border); font-style: italic; }
    
    .nb-btn-compact.success {
      background: var(--nb-success-bg);
      color: var(--nb-success);
      border: 1px solid var(--nb-success);
    }
    .nb-btn-compact.success:hover {
      background: var(--nb-success);
      color: #fff;
    }
    
    .search-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius);
      box-shadow: var(--nb-shadow-dialog);
      z-index: 10;
      max-height: 180px;
      overflow-y: auto;
    }
    .dropdown-item {
      padding: 8px 12px;
      font-size: 13px;
      cursor: pointer;
      color: var(--nb-text);
      transition: background 0.15s ease;
    }
    .dropdown-item:hover {
      background: var(--nb-primary-50);
      color: var(--nb-primary-600);
    }
    .dropdown-empty {
      padding: 10px;
      font-size: 12px;
      color: var(--nb-text-muted);
      text-align: center;
    }
  `]
})
export class ClinicDashboardComponent implements OnInit {
  clinicService = inject(ClinicService);
  studentsService = inject(StudentsService);

  visits = signal<any[]>([]);
  leaves = signal<any[]>([]);
  clinics = signal<any[]>([]);
  medications = signal<any[]>([]);

  isNewVisitModalOpen = signal(false);
  isDispenseModalOpen = signal(false);
  
  selectedVisit = signal<any | null>(null);
  selectedVisitForDispense = signal<any | null>(null);

  newVisitData = {
    patient_user_id: '',
    visit_type: 'walk_in',
    clinic_id: '',
    notes: ''
  };

  patientSearchQuery = '';
  showPatientDropdown = signal(false);

  dispenseData = {
    medication_id: '',
    quantity: 1,
    warehouse_id: ''
  };

  ngOnInit() {
    this.loadDashboard();
    this.loadMetadata();
  }

  loadDashboard() {
    this.clinicService.getDashboardStats().subscribe();
    this.clinicService.getVisits().subscribe(data => this.visits.set(data));
    this.clinicService.getLeaves().subscribe(data => this.leaves.set(data));
    this.studentsService.getStudents({ page_size: 500 }).subscribe();
  }

  loadMetadata() {
    this.clinicService.getMedications().subscribe(data => this.medications.set(data));
    this.clinicService.getVisits().subscribe(() => {
      this.clinics.set([{ id: 'default', name_ar: 'العيادة الرئيسية المدرسية' }]);
    });
  }

  filteredStudents(query: string): any[] {
    const list = this.studentsService.students() || [];
    if (!query) return list;
    return list.filter(s => s.profile.arabic_name.includes(query) || s.student_number.includes(query));
  }

  selectPatient(student: any) {
    this.newVisitData.patient_user_id = student.id;
    this.patientSearchQuery = `${student.profile.arabic_name} (${student.student_number})`;
    this.showPatientDropdown.set(false);
  }

  getStudentName(userId: string): string {
    const s = (this.studentsService.students() || []).find(st => st.id === userId);
    return s ? s.profile.arabic_name : (userId ? `${userId.slice(0, 8)}...` : 'غير معروف');
  }

  selectVisit(visit: any) {
    this.selectedVisit.set(visit);
  }

  openNewVisitModal() {
    this.newVisitData = {
      patient_user_id: '',
      visit_type: 'walk_in',
      clinic_id: this.clinics()[0]?.id || '',
      notes: ''
    };
    this.patientSearchQuery = '';
    this.showPatientDropdown.set(false);
    this.isNewVisitModalOpen.set(true);
  }

  submitNewVisit() {
    if (!this.newVisitData.patient_user_id) return;
    this.clinicService.recordVisit({
      patient_user_id: this.newVisitData.patient_user_id,
      visit_type: this.newVisitData.visit_type,
      clinic: this.newVisitData.clinic_id,
      notes: this.newVisitData.notes
    }).subscribe(() => {
      this.isNewVisitModalOpen.set(false);
      this.loadDashboard();
    });
  }

  openDispenseModal(visit: any) {
    this.selectedVisitForDispense.set(visit);
    this.dispenseData = {
      medication_id: '',
      quantity: 1,
      warehouse_id: ''
    };
    this.isDispenseModalOpen.set(true);
  }

  submitDispenseMedication() {
    const visit = this.selectedVisitForDispense();
    if (!visit || !this.dispenseData.medication_id) return;
    this.clinicService.dispenseMedication(visit.id, {
      medication_id: this.dispenseData.medication_id,
      quantity: this.dispenseData.quantity,
      warehouse_id: this.dispenseData.warehouse_id || undefined
    }).subscribe(() => {
      this.isDispenseModalOpen.set(false);
      this.loadDashboard();
    });
  }

  approveLeave(leaveId: string) {
    this.clinicService.approveMedicalLeave(leaveId).subscribe(() => {
      this.loadDashboard();
    });
  }

  getVisitTypeText(type: string): string {
    switch (type) {
      case 'walk_in': return 'حالة عابرة';
      case 'scheduled': return 'موعد دوري';
      case 'emergency': return 'حالة طارئة';
      case 'follow_up': return 'متابعة';
      default: return type;
    }
  }

  getVisitTypeClass(type: string): string {
    switch (type) {
      case 'emergency': return 'nb-badge-danger';
      case 'walk_in': return 'nb-badge-info';
      default: return 'nb-badge-success';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'checked_in': return 'دخل العيادة';
      case 'diagnosed': return 'تم التشخيص';
      case 'discharged': return 'غادر العيادة';
      case 'referred': return 'تمت الإحالة';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'discharged': return 'nb-badge-success';
      case 'referred': return 'nb-badge-warning';
      default: return 'nb-badge-info';
    }
  }
}


