import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { ExaminationsService } from './examinations.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../shared/nebras/nb-stat-card.component';

/**
 * إدارة الامتحانات والتقييم الأكاديمي — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-exam-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SlicePipe, FormsModule, MatTabsModule, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="إدارة الامتحانات والتقييم الأكاديمي"
        subtitle="الامتحانات المدرسية، بنك الأسئلة، كشوف رصد الدرجات، ومعالجة التظلمات"
      ></nb-page-header>

      <div class="stats-grid">
        <nb-stat-card label="الامتحانات المجدولة" [value]="exams().length"></nb-stat-card>
        <nb-stat-card label="الدورات النشطة" [value]="sessions().length" valueKind="info"></nb-stat-card>
        <nb-stat-card label="قاعات اللجان" [value]="rooms().length"></nb-stat-card>
        <nb-stat-card label="تظلمات معلقة" [value]="pendingAppealsCount()" [valueKind]="pendingAppealsCount() ? 'warning' : 'default'"></nb-stat-card>
      </div>

      <nb-panel [flush]="true">
        <mat-tab-group class="nb-tabs">
          <mat-tab label="جدول الامتحانات">
            <div class="tbl">
              <div class="tbl-head ex"><span>رمز الامتحان</span><span>الامتحان</span><span>العام / الفصل</span><span>الكبرى / النجاح</span><span>الحالة</span></div>
              @for (element of exams(); track element.id) {
                <div class="tbl-row ex">
                  <span>{{ element.code }}</span>
                  <span class="strong">{{ element.name }}</span>
                  <span>{{ element.academic_year }} - {{ element.term }}</span>
                  <span>{{ element.max_marks }} / {{ element.pass_marks }}</span>
                  <span><span [class]="statusBadge(element.status)">{{ getStatusLabel(element.status) }}</span></span>
                </div>
              }
              @if (exams().length === 0) { <div class="tbl-empty">لا توجد امتحانات مجدولة.</div> }
            </div>
          </mat-tab>

          <mat-tab label="كشف رصد الدرجات">
            <div class="tbl">
              <div class="tbl-head mk"><span>رقم الطالب / المقعد</span><span>اللجنة / القاعة</span><span>الدرجة المرصودة</span><span>إجراءات</span></div>
              @for (element of studentExams(); track element.id) {
                <div class="tbl-row mk">
                  <span>{{ element.student_id | slice:0:8 }}… / {{ element.seat_number }}</span>
                  <span>{{ element.room_id | slice:0:8 }}…</span>
                  <span><input type="number" [(ngModel)]="element.tempMark" class="mark-input" placeholder="رصد الدرجة" /></span>
                  <span><button class="nb-btn-primary sm" (click)="saveMark(element)">حفظ الدرجة</button></span>
                </div>
              }
              @if (studentExams().length === 0) { <div class="tbl-empty">لا يوجد طلاب للرصد.</div> }
            </div>
          </mat-tab>

          <mat-tab label="طلبات التظلم والاستئناف">
            <div class="tbl">
              <div class="tbl-head ap"><span>اللجنة / الطالب</span><span>سبب التظلم</span><span>الدرجة السابقة</span><span>حالة الطلب</span><span>إجراءات</span></div>
              @for (element of appeals(); track element.id) {
                <div class="tbl-row ap">
                  <span>{{ element.student_exam | slice:0:8 }}…</span>
                  <span>{{ element.reason }}</span>
                  <span>{{ element.old_marks }}</span>
                  <span><span [class]="statusBadge(element.status)">{{ getAppealStatusLabel(element.status) }}</span></span>
                  <span class="actions">
                    @if (element.status === 'submitted') {
                      <button class="nb-btn-secondary sm" (click)="resolveAppeal(element.id, 85.0)">تعديل لـ 85</button>
                      <button class="nb-btn-danger sm" (click)="resolveAppeal(element.id, null)">رفض</button>
                    }
                  </span>
                </div>
              }
              @if (appeals().length === 0) { <div class="tbl-empty">لا توجد تظلمات.</div> }
            </div>
          </mat-tab>
        </mat-tab-group>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .nb-tabs { padding: 4px 8px 8px; }
    .tbl { display: flex; flex-direction: column; padding-top: 8px; }
    .tbl-head, .tbl-row { display: grid; gap: 8px; padding: 9px 16px; align-items: center; }
    .tbl-head.ex, .tbl-row.ex { grid-template-columns: 1fr 1.6fr 1.4fr 1.2fr 1fr; }
    .tbl-head.mk, .tbl-row.mk { grid-template-columns: 1.6fr 1.4fr 1.2fr 1fr; }
    .tbl-head.ap, .tbl-row.ap { grid-template-columns: 1.2fr 1.6fr 1fr 1.2fr 1.4fr; }
    .tbl-head {
      background: var(--nb-surface-raised);
      border-bottom: 1px solid var(--nb-border-soft);
      padding: 8px 16px;
      font-size: 11px;
      font-weight: 700;
      color: var(--nb-text-muted);
    }
    .tbl-row { border-bottom: 1px solid var(--nb-border-row); font-size: 13px; color: var(--nb-text); }
    .tbl-row:last-child { border-bottom: none; }
    .tbl-row:hover { background: var(--nb-surface-raised); }
    .strong { font-weight: 600; }
    .actions { display: flex; gap: 6px; }
    .nb-btn-primary.sm, .nb-btn-secondary.sm, .nb-btn-danger.sm { height: 26px; padding: 0 12px; font-size: 12px; }
    .mark-input {
      height: 30px;
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius);
      color: var(--nb-text);
      padding: 0 10px;
      width: 120px;
      outline: none;
      font-family: var(--nb-font-family);
      font-size: 13px;
    }
    .tbl-empty { padding: 28px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
  `]
})
export class ExamDashboardComponent implements OnInit {
  examService = inject(ExaminationsService);

  exams = signal<any[]>([]);
  sessions = signal<any[]>([]);
  rooms = signal<any[]>([]);
  studentExams = signal<any[]>([]);
  appeals = signal<any[]>([]);
  pendingAppealsCount = signal(0);

  displayedColumns = ['code', 'name', 'year', 'marks', 'status'];
  markColumns = ['student', 'room', 'marks', 'actions'];
  appealColumns = ['student', 'reason', 'oldMark', 'status', 'actions'];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.examService.getExams().subscribe({
      next: (res) => { if (res && res.success) this.exams.set(res.data); }
    });

    this.examService.getSessions().subscribe({
      next: (res) => { if (res && res.success) this.sessions.set(res.data); }
    });

    this.examService.getRooms().subscribe({
      next: (res) => { if (res && res.success) this.rooms.set(res.data); }
    });

    this.examService.getStudentExams().subscribe({
      next: (res) => {
        if (res && res.success) {
          const list = res.data.map((se: any) => ({ ...se, tempMark: null }));
          this.studentExams.set(list);
        }
      }
    });

    this.examService.getAppeals().subscribe({
      next: (res) => {
        if (res && res.success) {
          this.appeals.set(res.data);
          const pending = res.data.filter((a: any) => a.status === 'submitted').length;
          this.pendingAppealsCount.set(pending);
        }
      }
    });
  }

  saveMark(element: any) {
    if (element.tempMark === null || element.tempMark === undefined) return;
    this.examService.enterStudentMark(element.id, element.tempMark, 'رصد درجة من لوحة التحكم الأكاديمية').subscribe({
      next: (res) => {
        if (res && res.success) {
          alert('تم حفظ ورصد درجة الطالب بنجاح بالمسار الأمني.');
        }
      }
    });
  }

  resolveAppeal(appealId: string, newMarks: number | null) {
    this.examService.resolveAppeal(appealId, newMarks).subscribe({
      next: (res) => {
        if (res && res.success) {
          alert('تم معالجة التظلم وتحديث حالة الطالب بنجاح.');
          this.loadData();
        }
      }
    });
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'published': return 'منشور';
      case 'draft': return 'مسودة';
      case 'approved': return 'معتمد';
      case 'locked': return 'مغلق ومحمي';
      default: return status;
    }
  }

  getAppealStatusLabel(status: string): string {
    switch (status) {
      case 'submitted': return 'مقدم حديثاً';
      case 'resolved_changed': return 'تم التعديل';
      case 'resolved_unchanged': return 'مرفوض/دون تغيير';
      default: return status;
    }
  }

  statusBadge(status: string): string {
    switch (status) {
      case 'published': case 'approved': case 'resolved_changed': return 'nb-badge-success';
      case 'draft': case 'submitted': return 'nb-badge-warning';
      case 'locked': case 'under_review': return 'nb-badge-info';
      case 'resolved_unchanged': return 'nb-badge-danger';
      default: return 'nb-badge-neutral';
    }
  }
}
